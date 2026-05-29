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
    const [profileResume, setProfileResume] = useState("");
    const [profileResumeName, setProfileResumeName] = useState("");
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
        <div className="min-h-screen py-8 mt-12 bg-gray-50" style={{ backgroundColor: "#F4F2EE" }}>
            <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl p-6 sm:p-8 border border-gray-200">
                <h1 className="text-4xl font-extrabold text-[#0073b1] mb-6 ">{job.job_name}</h1>

                {/* Job Details Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div className="flex items-center space-x-4 text-gray-700">
                        <FaBuilding className="text-[#0073b1] h-6 w-6" />
                        <p className="font-medium break-words max-w-full">
                            Company: <span className="text-gray-800">{job.company_name}</span>
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 text-gray-700">
                        <FaMapMarkerAlt className="text-red-500 h-6 w-6" />
                        <p className="font-medium break-words max-w-full">
                            Location: <span className="text-gray-800">{job.job_location}</span>
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 text-gray-700">
                        <MdOutlineWork className="text-green-600 h-6 w-6" />
                        <p className="font-medium break-words max-w-full">
                            Workplace Type: <span className="text-gray-800">{job.workplace_type}</span>
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 text-gray-700">
                        <FaClipboardList className="text-yellow-600 h-6 w-6" />
                        <p className="font-medium break-words max-w-full">
                            Employment Type: <span className="text-gray-800">{job.employment_type}</span>
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 text-gray-700">
                        <FaClock className="text-[#0073b1] h-6 w-6" />
                        <p className="font-medium break-words max-w-full">
                            Posted On: <span className="text-gray-800">{new Date(job.created_at).toLocaleDateString()}</span>
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 text-gray-700">
                        <FaClock className="text-gray-500 h-6 w-6" />
                        <p className="font-medium break-words max-w-full">
                            Last Updated: <span className="text-gray-800">{new Date(job.updated_at).toLocaleDateString()}</span>
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 text-gray-700">
                        {job.interview_type.toLowerCase() === "ai" ? (
                            <>
                                <FaRobot className="text-[#0073b1] h-6 w-6" />
                                <p className="font-medium break-words max-w-full">
                                    <span className="text-gray-800">AI Interview</span>
                                </p>
                            </>
                        ) : job.interview_type.toLowerCase() === "manual" ? (
                            <>
                                <FaUserTie className="text-[#0073b1] h-6 w-6" />
                                <p className="font-medium break-words max-w-full">
                                    <span className="text-gray-800">Manual Interview</span>
                                </p>
                            </>
                        ) : (
                            <>
                                <FaExclamationCircle className="text-[#0073b1] h-6 w-6" />
                                <p className="font-medium break-words max-w-full">
                                    <span className="text-gray-800">Unknown Interview Type</span>
                                </p>
                            </>
                        )}
                    </div>
                </div>



                {/* Job Description */}
                <div className="border-t border-gray-200 pt-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-700 mb-4">Job Description</h2>
                    <p className="text-gray-700 leading-relaxed break-words">{job.description}</p>
                </div>



                {/* Required Skills */}
                <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-2xl font-bold text-gray-700 mb-4">Required Skills</h2>
                    <ul className="list-disc pl-5 text-gray-700">
                        {job.skills.split(",").map((skill, index) => (
                            <li key={index} className="py-1 font-medium">
                                {skill.trim()}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button
                        onClick={() => router.push('/Users/Jobs')}
                        className="w-full sm:w-auto px-6 py-3 bg-[#0073b1] text-white font-semibold rounded-lg shadow-md transition-colors duration-300 hover:bg-[#005f8c]"
                    >
                        <FaArrowLeft className="mr-2 inline-block" /> Back to Jobs
                    </button>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center sm:justify-start">
                        {role === "Candidate" && (
                            <button
                                onClick={handleApplyClick}
                                disabled={hasApplied}
                                className={`w-full sm:w-auto px-6 py-3 text-white font-semibold rounded-lg shadow-md transition-colors duration-300 ${
                                    hasApplied ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
                                }`}
                            >
                                {hasApplied ? "Applied" : "Apply"} <FaCheckCircle className="ml-2 inline-block" />
                            </button>
                        )}
                        <button
                            onClick={() => handleReportClick(job.id)}
                            disabled={report === "Yes"} // Disable the button if report status is "Yes"
                            className={`w-full sm:w-auto px-6 py-3 text-white font-semibold rounded-lg shadow-md transition-colors duration-300 
                ${report === "Yes"
                                    ? "bg-gray-400 cursor-not-allowed" // Disabled state
                                    : "bg-red-500 hover:bg-red-600"} // Enabled state
            `}
                            title={report === "Yes" ? "You have already reported this job" : "Report this job"}
                        >
                            Report <FaFlag className="ml-2 inline-block" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Modal */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50 px-4">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
                        <h2 className="text-xl font-bold mb-4">Report Job</h2>
                        <textarea
                            className={`w-full border ${feedbackError ? "border-red-500" : "border-gray-300"} rounded-lg p-2 mb-4`}
                            placeholder="Write one line feedback..."
                            value={feedback}
                            onChange={(e) => {
                                setFeedback(e.target.value);
                                setFeedbackError(null);
                            }}
                        />
                        {feedbackError && <p className="text-red-500 text-sm mb-2">{feedbackError}</p>}
                        <div className="flex justify-between">
                            <button
                                onClick={handleCancel}
                                className="px-6 py-2 bg-gray-400 text-white font-semibold rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => reportJob(jobToReport)}
                                className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Apply Modal */}
            {showApplyModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50 px-4">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
                        <h2 className="text-xl font-bold mb-4">Apply for {job.job_name}</h2>

                        <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                            <p className="font-medium">Resume from Profile</p>
                            {profileResume ? (
                                <button
                                    type="button"
                                    onClick={() => openResumePreview(profileResume)}
                                    className="text-left text-blue-600 underline break-all"
                                >
                                    {profileResumeName || "View resume"}
                                </button>
                            ) : (
                                <p className="text-red-500">No resume found in profile. Please upload one in your profile first.</p>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Optional: upload a different CV for this job</label>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                className="w-full text-sm"
                            />
                        </div>

                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-2 mb-4 min-h-[120px]"
                            placeholder="Optional cover letter..."
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                        />

                        {applyMessage && (
                            <p className={`text-sm mb-3 ${applyError ? "text-red-500" : "text-green-600"}`}>
                                {applyMessage}
                            </p>
                        )}

                        <div className="flex justify-between gap-3">
                            <button
                                onClick={() => setShowApplyModal(false)}
                                className="px-6 py-2 bg-gray-400 text-white font-semibold rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApplySubmit}
                                disabled={applying}
                                className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg disabled:opacity-60"
                            >
                                {applying ? "Submitting..." : "Submit Application"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Post-apply AI interview prompt */}
            {showInterviewPrompt && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50 px-4">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
                        <h2 className="text-xl font-bold mb-2 text-[#0073b1]">Application Submitted</h2>
                        <p className="text-gray-700 mb-4">
                            You can take the AI screening interview now, or do it later from Notifications.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowInterviewPrompt(false)}
                                className="px-6 py-2 bg-gray-400 text-white font-semibold rounded-lg"
                            >
                                Later
                            </button>
                            <button
                                onClick={() => {
                                    const id = latestApplicationId;
                                    setShowInterviewPrompt(false);
                                    if (id) {
                                        router.push(`/Users/Applications/${id}/interview`);
                                    }
                                }}
                                className="px-6 py-2 bg-[#0073b1] text-white font-semibold rounded-lg"
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
