"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Loader from "@/app/others/loader";
import { FaRobot, FaUserTie, FaExclamationCircle, FaBuilding, FaMapMarkerAlt, FaClipboardList, FaClock, FaArrowLeft, FaCheckCircle, FaFlag } from "react-icons/fa";
import { MdOutlineWork } from "react-icons/md";
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useRouter } from "next/navigation";
import { show_search } from "@/Redux/Action";
import { API_BASE_URL } from "@/utils/api";

const openResumePreview = (resumeUrl) => {
    if (!resumeUrl) return;
    window.open(resumeUrl, "_blank", "noopener,noreferrer");
};

const Job = () => {
    const router = useRouter();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [jobToReport, setJobToReport] = useState(null);
    const [feedback, setFeedback] = useState(""); // Feedback input
    const [feedbackError, setFeedbackError] = useState(null); // Feedback validation error
    const [report, setreport] = useState("No");
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [coverLetter, setCoverLetter] = useState("");
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeFileName, setResumeFileName] = useState("");
    const [profileResume, setProfileResume] = useState("");
    const [profileResumeName, setProfileResumeName] = useState("");
    const [applicationResumeUrl, setApplicationResumeUrl] = useState("");
    const [applicationResumeName, setApplicationResumeName] = useState("");
    const [hasApplied, setHasApplied] = useState(false);
    const [applying, setApplying] = useState(false);
    const [applyMessage, setApplyMessage] = useState("");
    const [applyError, setApplyError] = useState(false);
    const [showInterviewPrompt, setShowInterviewPrompt] = useState(false);
    const [latestApplicationId, setLatestApplicationId] = useState(null);
    const role = useSelector((state) => state.Role_Reducer);

    const dispatch = useDispatch();
    const routeParams = useParams();
    const jobId = useMemo(() => {
        const rawId = routeParams?.id;

        if (Array.isArray(rawId)) {
            return rawId[rawId.length - 1] || "";
        }

        return rawId || "";
    }, [routeParams]);

    useEffect(() => {
        dispatch(show_search(false));
    }, [dispatch]);

    useEffect(() => {
        if (!jobId) {
            return;
        }

        const fetchJobDetails = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/get_jobs/${jobId}`, { withCredentials: true });
                setJob(response.data);
                try {
                    const response1 = await axios.get(`${API_BASE_URL}/check_report_status/${jobId}`, { withCredentials: true });
                    setreport(response1.data.message);
                } catch (reportErr) {
                    setreport("No");
                    console.warn("Report status check failed:", reportErr);
                }

            } catch (err) {
                setError(err.response?.data?.error || "Failed to fetch job details.");
            } finally {
                setLoading(false);
            }
        };

        fetchJobDetails();
    }, [jobId]);

    useEffect(() => {
        const fetchCandidateData = async () => {
            if (role !== "Candidate") {
                return;
            }

            try {
                const profileResponse = await axios.get(`${API_BASE_URL}/profile/`, { withCredentials: true });
                const candidateResume = profileResponse.data?.candidate?.resume || "";
                setProfileResume(candidateResume);
                if (candidateResume) {
                    setProfileResumeName(candidateResume.split("/").pop() || "Resume");
                }
            } catch (error) {
                console.warn("Failed to load candidate profile:", error);
            }

            try {
                const statusResponse = await axios.get(`${API_BASE_URL}/check_application_status/${jobId}/`, {
                    withCredentials: true,
                });
                setHasApplied(statusResponse.data?.message === "Yes");
            } catch (error) {
                console.warn("Failed to check application status:", error);
            }
        };

        fetchCandidateData();
    }, [jobId, role]);

    const reportJob = async (jobId) => {
        if (!feedback.trim()) {
            setFeedbackError("Feedback is required.");
            return;
        }

        try {
            await axios.post(
                `${API_BASE_URL}/report/`,
                { job_id: jobId, feedback },
                { withCredentials: true }
            );
            setShowModal(false); // Close modal after reporting
            setFeedback(""); // Clear feedback input
            setreport("Yes")
        } catch (err) {
            console.error("Error reporting job:", err);
        }
    };

    const handleApplyClick = () => {
        setApplyMessage("");
        setApplyError(false);
        setResumeFile(null);
        setResumeFileName("");
        setApplicationResumeUrl("");
        setApplicationResumeName("");
        setCoverLetter("");
        setShowApplyModal(true);
    };

    const handleApplySubmit = async () => {
        if (!profileResume && !resumeFile) {
            setApplyMessage("Please upload your resume in your profile first.");
            setApplyError(true);
            return;
        }

        setApplying(true);
        setApplyMessage("");

        try {
            const formData = new FormData();
            if (coverLetter.trim()) {
                formData.append("cover_letter", coverLetter.trim());
            }
            if (resumeFile) {
                formData.append("resume", resumeFile);
            }

            const response = await axios.post(`${API_BASE_URL}/apply-job/${jobId}/`, formData, {
                withCredentials: true,
            });

            setHasApplied(true);
            setShowApplyModal(false);
            setApplyMessage("Application submitted successfully.");
            setApplyError(false);
            setLatestApplicationId(response.data?.application_id || null);
            setApplicationResumeUrl(response.data?.resume || (resumeFile ? URL.createObjectURL(resumeFile) : profileResume) || "");
            setApplicationResumeName(resumeFile?.name || response.data?.resume?.split("/").pop() || profileResumeName || "Resume");
            setShowInterviewPrompt(true);
        } catch (error) {
            const message = error.response?.data?.error || error.response?.data?.message || "Failed to submit application.";
            setApplyMessage(message);
            setApplyError(true);
        } finally {
            setApplying(false);
        }
    };

    const handleReportClick = (jobId) => {
        setJobToReport(jobId);
        setShowModal(true);
        setFeedback("");
        setFeedbackError(null);
    };

    const handleCancel = () => {
        setShowModal(false);
        setFeedback("");
        setFeedbackError(null);
    };

    if (loading) {
        return <Loader />;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl text-red-600">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-16 mt-14 bg-gray-50" style={{ backgroundColor: "#F4F2EE" }}>
            <div className="max-w-4xl mx-auto bg-white shadow-[0_4px_25px_rgba(0,0,0,0.03)] rounded-2xl p-8 sm:p-10 border border-gray-200/60">
                {/* Header Back Link */}
                <button
                    onClick={() => router.push('/Users/Jobs')}
                    className="group mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#0073b1] transition-colors duration-200"
                >
                    <FaArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" /> 
                    Back to Jobs
                </button>

                <h1 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight mb-6">{job.job_name}</h1>

                {/* Job Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 bg-gray-50/60 border border-gray-200/50 rounded-2xl p-6">
                    <div className="flex items-center space-x-3.5 text-gray-700">
                        <div className="p-2.5 bg-[#0073b1]/5 text-[#0073b1] rounded-xl">
                            <FaBuilding className="h-5 w-5" />
                        </div>
                        <p className="font-medium text-sm text-gray-500">
                            Company: <span className="text-gray-900 font-semibold block">{job.company_name}</span>
                        </p>
                    </div>
                    <div className="flex items-center space-x-3.5 text-gray-700">
                        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                            <FaMapMarkerAlt className="h-5 w-5" />
                        </div>
                        <p className="font-medium text-sm text-gray-500">
                            Location: <span className="text-gray-900 font-semibold block">{job.job_location}</span>
                        </p>
                    </div>
                    <div className="flex items-center space-x-3.5 text-gray-700">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                            <MdOutlineWork className="h-5 w-5" />
                        </div>
                        <p className="font-medium text-sm text-gray-500">
                            Workplace: <span className="text-gray-900 font-semibold block">{job.workplace_type}</span>
                        </p>
                    </div>
                    <div className="flex items-center space-x-3.5 text-gray-700">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                            <FaClipboardList className="h-5 w-5" />
                        </div>
                        <p className="font-medium text-sm text-gray-500">
                            Employment: <span className="text-gray-900 font-semibold block">{job.employment_type}</span>
                        </p>
                    </div>
                    <div className="flex items-center space-x-3.5 text-gray-700">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <FaClock className="h-5 w-5" />
                        </div>
                        <p className="font-medium text-sm text-gray-500">
                            Posted On: <span className="text-gray-900 font-semibold block">{new Date(job.created_at).toLocaleDateString()}</span>
                        </p>
                    </div>
                    <div className="flex items-center space-x-3.5 text-gray-700">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                            {job.interview_type.toLowerCase() === "ai" ? (
                                <FaRobot className="h-5 w-5" />
                            ) : (
                                <FaUserTie className="h-5 w-5" />
                            )}
                        </div>
                        <p className="font-medium text-sm text-gray-500">
                            Interview Style: <span className="text-gray-900 font-semibold block capitalize">{job.interview_type} Interview</span>
                        </p>
                    </div>
                </div>

                {/* Job Description */}
                <div className="border-t border-gray-100 pt-8 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
                    <p className="text-gray-650 leading-relaxed text-base break-words whitespace-pre-line">{job.description}</p>
                </div>

                {/* Required Skills */}
                <div className="border-t border-gray-100 pt-8 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Required Skills</h2>
                    <div className="flex flex-wrap gap-2.5">
                        {job.skills.split(",").map((skill, index) => (
                            <span key={index} className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-[#0073b1]/5 text-[#0073b1]">
                                {skill.trim()}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-10 flex flex-col sm:flex-row justify-end items-center gap-4 border-t border-gray-150 pt-8">
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        {role === "Candidate" && (
                            <button
                                onClick={handleApplyClick}
                                disabled={hasApplied}
                                className={`w-full sm:w-auto px-7 py-3 font-semibold rounded-xl transition-all duration-300 transform active:scale-[0.99] flex items-center justify-center gap-2 ${
                                    hasApplied 
                                        ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed" 
                                        : "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md"
                                }`}
                            >
                                {hasApplied ? "Applied" : "Apply Now"} <FaCheckCircle className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => handleReportClick(job.id)}
                            disabled={report === "Yes"}
                            className={`w-full sm:w-auto px-7 py-3 font-semibold rounded-xl transition-all duration-300 transform active:scale-[0.99] flex items-center justify-center gap-2
                                ${report === "Yes"
                                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                    : "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-md"}
                            `}
                            title={report === "Yes" ? "You have already reported this job" : "Report this job"}
                        >
                            Report Flag <FaFlag className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-950/40 backdrop-blur-sm px-4">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-gray-950 mb-3">Report Job</h2>
                        <textarea
                            className={`w-full border ${feedbackError ? "border-red-500" : "border-gray-200"} focus:border-[#0073b1]/50 focus:ring-4 focus:ring-[#0073b1]/10 rounded-xl p-3 mb-4 outline-none transition duration-200 bg-gray-50/50 resize-none min-h-[80px]`}
                            placeholder="Provide details about the issue..."
                            value={feedback}
                            onChange={(e) => {
                                setFeedback(e.target.value);
                                setFeedbackError(null);
                            }}
                        />
                        {feedbackError && <p className="text-red-500 text-xs mb-3 font-semibold">{feedbackError}</p>}
                        <div className="flex gap-3">
                            <button
                                onClick={handleCancel}
                                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition duration-200 active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => reportJob(jobToReport)}
                                className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition duration-200 active:scale-[0.98]"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Apply Modal */}
            {showApplyModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-950/40 backdrop-blur-sm px-4">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-950 mb-4">Apply for {job.job_name}</h2>
 
                        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-700">
                            <p className="font-semibold text-gray-900 mb-1.5">Resume from Profile</p>
                            {profileResume ? (
                                <button
                                    type="button"
                                    onClick={() => openResumePreview(profileResume)}
                                    className="text-left text-[#0073b1] font-semibold hover:underline break-all inline-flex items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    {profileResumeName || "View resume"}
                                </button>
                            ) : (
                                <p className="text-red-500 font-medium">No resume found in profile. Please upload one in your profile first.</p>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Optional: upload a different CV for this job</label>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setResumeFile(file);
                                    setResumeFileName(file?.name || "");
                                }}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#0073b1]/10 file:text-[#0073b1] hover:file:bg-[#0073b1]/20 file:cursor-pointer cursor-pointer"
                            />
                            {resumeFileName && (
                                <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                                    Selected file: <span className="font-semibold text-gray-900">{resumeFileName}</span>
                                </p>
                            )}
                        </div>

                        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-750">
                            <p className="font-semibold text-gray-900 mb-1.5">Resume that will be used for this application</p>
                            {resumeFileName ? (
                                <p className="text-gray-600 font-medium inline-flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    Uploading your selected resume: <span className="font-bold text-gray-900">{resumeFileName}</span>
                                </p>
                            ) : profileResume ? (
                                <button type="button" onClick={() => openResumePreview(profileResume)} className="text-left text-[#0073b1] font-semibold hover:underline break-all inline-flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    {profileResumeName || "View profile resume"}
                                </button>
                            ) : (
                                <p className="text-red-500 font-medium">No resume found. Please upload a resume first.</p>
                            )}
                        </div>

                        <textarea
                            className="w-full border border-gray-200 focus:border-[#0073b1]/50 focus:ring-4 focus:ring-[#0073b1]/10 rounded-xl p-3 mb-4 outline-none transition duration-200 bg-gray-50/50 resize-none min-h-[120px]"
                            placeholder="Introduce yourself with an optional cover letter..."
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                        />

                        {applyMessage && (
                            <div className={`text-sm mb-4 p-3 rounded-lg font-semibold ${applyError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                                {applyMessage}
                            </div>
                        )}

                        {applicationResumeUrl && (
                            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
                                <p className="font-semibold mb-1">Attached application resume</p>
                                <button type="button" onClick={() => openResumePreview(applicationResumeUrl)} className="text-left text-emerald-700 font-bold underline break-all">
                                    {applicationResumeName || "View uploaded resume"}
                                </button>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowApplyModal(false)}
                                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition duration-200 active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApplySubmit}
                                disabled={applying}
                                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-850 transition duration-200 active:scale-[0.98] disabled:opacity-60"
                            >
                                {applying ? "Submitting..." : "Submit Application"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Post-apply AI interview prompt */}
            {showInterviewPrompt && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-950/40 backdrop-blur-sm px-4">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold mb-2 text-[#0073b1] tracking-tight">Application Submitted!</h2>
                        <p className="text-gray-650 text-sm leading-relaxed mb-5">
                            Your application was successfully sent. Would you like to take the AI screening interview now? You can also complete it later via notifications.
                        </p>
                        {applicationResumeUrl && (
                            <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-750">
                                <p className="font-semibold text-gray-900 mb-1.5">Attached resume</p>
                                <button type="button" onClick={() => openResumePreview(applicationResumeUrl)} className="text-left text-[#0073b1] font-semibold hover:underline break-all inline-flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    {applicationResumeName || "View application resume"}
                                </button>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowInterviewPrompt(false)}
                                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition duration-200 active:scale-[0.98]"
                            >
                                Take Interview Later
                            </button>
                            <button
                                onClick={() => {
                                    const id = latestApplicationId;
                                    setShowInterviewPrompt(false);
                                    if (id) {
                                        router.push(`/Users/Applications/${id}/interview`);
                                    }
                                }}
                                className="flex-1 py-2.5 bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-semibold rounded-xl hover:from-[#005582] hover:to-[#00446a] transition duration-200 active:scale-[0.98]"
                            >
                                Take AI Interview Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Job;
