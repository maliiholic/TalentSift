"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { SiGooglegemini } from "react-icons/si";
import { FaBuilding, FaMapMarkerAlt, FaCheckCircle, FaChevronRight, FaChevronLeft, FaTrashAlt, FaBriefcase, FaSuitcase, FaArrowRight } from "react-icons/fa";
import Loader from "@/app/others/loader";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux"
import { show_search } from "@/Redux/Action";
import { API_BASE_URL } from "@/utils/api";

const defaultFormData = {
    job_id: "",
    job_name: "",
    job_location: "",
    workplace_type: "",
    employment_type: "",
    description: "",
    skills: "",
    interview_type: "manual",
    new_company_name: "",
};

const STEPS = ["Basic Info", "Details & Skills"];

const PillButton = ({ label, selected, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
            selected
                ? "bg-[#0073b1] text-white border-[#0073b1] shadow-sm scale-[0.98]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.97]"
        }`}
    >
        {selected && <FaCheckCircle className="w-3 h-3" />}
        {label}
    </button>
);

const UpdateJob = () => {
    const dispatch = useDispatch();
    const routeParams = useParams();
    const jobId = useMemo(() => {
        const rawId = routeParams?.id;

        if (Array.isArray(rawId)) {
            return rawId[rawId.length - 1] || "";
        }

        return rawId || "";
    }, [routeParams]);
    const [recruiterData, setRecruiterData] = useState(null);
    const [formData, setFormData] = useState(() => {
        if (typeof window === "undefined") {
            return defaultFormData;
        }

        const savedFormData = sessionStorage.getItem("formData");
        return savedFormData ? JSON.parse(savedFormData) : defaultFormData;
    });
    const [loading, setLoading] = useState(Boolean(jobId));
    const [page, setPage] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const router = useRouter();
    const [subscription, setsubscription] = useState(false);
    const [error, setError] = useState(null); // State for error message



    useEffect(() => {
        if (!jobId) {
            return;
        }

        dispatch(show_search(false));

        const fetchJobData = async () => {
            try {
                // Fetch recruiter and subscription data
                const [response2, response1] = await Promise.all([
                    axios.get(`${API_BASE_URL}/get_recruiter_company/`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/has-ai-subscription/`, { withCredentials: true }),
                ]);
                setRecruiterData(response2.data);
                setsubscription(response1.data.ai_subscription);

                // Fetch job details without relying on recruiter ownership checks.
                const response = await axios.get(`${API_BASE_URL}/get_jobs/${jobId}`, { withCredentials: true });

                // Check if job data exists
                if (response.data && response.data.job_name) {
                    setFormData({
                        job_name: response.data.job_name || "",
                        job_id: response.data.id || "",
                        job_location: response.data.job_location || "",
                        workplace_type: response.data.workplace_type || "",
                        employment_type: response.data.employment_type || "",
                        description: response.data.description || "",
                        skills: typeof response.data.skills === "string" ? response.data.skills : (Array.isArray(response.data.skills) ? response.data.skills.join(", ") : ""),
                        interview_type: response.data.interview_type || "manual",
                        new_company_name: response.data.new_company_name || "",
                    });
                    setError(null); // Clear any previous error
                } else {
                    setError("No Post Available"); // Set error message if job doesn't exist
                }
            } catch (error) {
                setError("No Post Available"); // Set error message in case of an error
            } finally {
                setLoading(false); // Stop loading in all cases
            }
        };

        fetchJobData();
    }, [dispatch, jobId]);

    const handlePayment = async (event) => {
        event.preventDefault(); // Prevent the page from refreshing
        sessionStorage.setItem('formData', JSON.stringify(formData));

        try {
            const response = await axios.post(
                `${API_BASE_URL}/create_checkout_session/`,
                { interview_type: 'ai', job_id: jobId.toString() },
                {
                    withCredentials: true,
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            if (response.status === 200) {
                const stripePromise = await loadStripe('pk_test_51P0cjlP8GjJIjxDGEgyDXqRqhQThEMQl5KySJ1F7bhigoblE6MDvutJnx3n7LlTQx3HiA3zL9xYhnGwHTba03QpR00JWEq159G');
                const stripe = await stripePromise;

                const { error } = await stripe.redirectToCheckout({
                    sessionId: response.data.sessionId,
                });

                if (error) {
                    console.error('Error redirecting to checkout:', error);

                }
            } else {
                console.error('Checkout session creation failed');

            }
        } catch (error) {
            console.error('Error initiating payment:', error);

        }
    };


    useEffect(() => {
        const sessionId = new URLSearchParams(window.location.search).get('session_id');
        if (!sessionId) {
            return;
        }

        axios.post(`${API_BASE_URL}/verify_payment/`, { session_id: sessionId }, { withCredentials: true })
            .then(response => {
                if (response.status === 200) {
                    sessionStorage.removeItem('formData');
                    setsubscription(true);
                    setFormData(defaultFormData);
                    setPage(1);
                } else {
                    console.error("Payment verification failed: ", response.data.error);
                }
            })
            .catch(error => {
                console.error("Payment verification failed:", error);
            });
    }, []);




    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const selectSingleOption = (field, option) => {
        setFormData((prevData) => ({
            ...prevData,
            [field]: prevData[field] === option ? "" : option,
        }));
    };

    const [validationErrors, setValidationErrors] = useState({});

    // Validation function for current page fields
    const validatePage = () => {
        const errors = {};

        // Page 1: Basic job details
        if (page === 1) {
            // Job title
            if (!formData.job_name.trim()) {
                errors.job_name = "Job title is required.";
            } else if (formData.job_name.length < 3) {
                errors.job_name = "Job title must be at least 3 characters long.";
            }

            // Job location
            if (!formData.job_location.trim()) {
                errors.job_location = "Job location is required.";
            } else if (formData.job_location.length < 3) {
                errors.job_location = "Job location must be at least 3 characters long.";
            }

            // Workplace type
            if (!formData.workplace_type.trim()) {
                errors.workplace_type = "Please select a workplace type.";
            }

            // Company name (new company name validation)
            if (formData.new_company_name && !recruiterData?.company_name) {
                const companyName = formData.new_company_name.trim();
                if (!/^[A-Za-z\s]+$/.test(companyName)) {
                    errors.new_company_name = "Company name is invalid. Please use only alphabets and spaces.";
                } else if (/\d/.test(companyName)) {
                    errors.new_company_name = "Company name should not contain numbers.";
                } else if (companyName.length < 2) {
                    errors.new_company_name = "Company name must be at least 2 characters long.";
                }
            } else if (!formData.new_company_name && !recruiterData?.company_name) {
                errors.new_company_name = "Company name is required.";
            }

        }

        // Page 2: Description, skills, and employment type
        if (page === 2) {
            // Description
            if (!formData.description.trim()) {
                errors.description = "Description is required.";
            } else if (formData.description.length < 10) {
                errors.description = "Description must be at least 10 characters long.";
            }

            // Skills selection
            if (!formData.skills) {
                errors.skills = "Please select at least one skill.";
            }

            // Employment type
            if (!formData.employment_type.trim()) {
                errors.employment_type = "Please select an employment type.";
            }
        }

        setValidationErrors(errors);

        // Return true if there are no errors, otherwise return false
        return Object.keys(errors).length === 0;
    };


    const handleGenerateTitle = async () => {
        if (!formData.job_name.trim()) {
            setValidationErrors((prevErrors) => ({
                ...prevErrors,
                job_name: "Job title cannot be empty before generating from AI.",
            }));
            return;
        }

        setAiLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('access') : null;
            const response = await axios.post(
                `${API_BASE_URL}/generate-job-title/`,
                { prompt: formData.job_name },
                { withCredentials: true, headers: token ? { Authorization: `Bearer ${token}` } : {} }
            );
            if (response.data?.professional_job_title) {
                const raw = response.data.professional_job_title;
                const clean = raw
                    .replace(/\*+/g, "")
                    .split(/\n|\r/)[0]
                    .replace(/^[\w\s]+(title|role|position|name)\s*:\s*/i, "")
                    .replace(/\s*[–—-].*$/i, "")
                    .trim();
                setFormData((prev) => ({ ...prev, job_name: clean }));
                setValidationErrors((prevErrors) => ({ ...prevErrors, job_name: "" }));
                toast.success("AI title generated!");
            }
        } catch (error) {
            console.error("Error generating job title:", error);
            toast.error("AI title generation failed.");
        } finally {
            setAiLoading(false);
        }
    };


    // Update setPage function to include validation
    const handleNextPage = () => {
        if (validatePage()) {
            setPage(page + 1); // Proceed only if validation passes
        }
    };

    const handlePrevPage = () => {
        setPage(page - 1); // No validation needed for going back
    };


    const handleDelete = async () => {
        try {
            const targetJobId = jobId || formData.job_id;

            if (!targetJobId) {
                toast.error("Job ID is missing.");
                return;
            }

            await axios.delete(`${API_BASE_URL}/deletejob/${targetJobId}/`, { withCredentials: true });
            toast.success("Job deleted successfully!");
            router.push("/Users/Posts");
        } catch (error) {
            console.error("Error deleting job post:", error);
            toast.error(error.response?.data?.error || "Failed to delete job post.");
        }
    };

    // Event to update the job post
    const handleUpdate = async (e) => {
        if (e) e.preventDefault();
        if (!validatePage()) return;
        setSubmitting(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('access') : null;
            await axios.put(
                `${API_BASE_URL}/updatejob/${formData.job_id}/`,
                {
                    job_name: formData.job_name,
                    workplace_type: formData.workplace_type,
                    job_location: formData.job_location,
                    employment_type: formData.employment_type,
                    description: formData.description,
                    skills: formData.skills,
                    interview_type: formData.interview_type,
                },
                {
                    withCredentials: true,
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                }
            );
            toast.success("Job updated successfully!");
            router.push("/Users/Posts");
        } catch (error) {
            console.error("Error updating job post:", error);
            toast.error(error.response?.data?.error || "Failed to update job post. Please try again.");
            setSubmitting(false);
        }
    };




    if (loading) return <Loader />;

    const employmentTypes = ["Full-time", "Part-time", "Contract", "Temporary", "Internship"];
    const skillOptions = ["Front-end", "Back-end", "Full Stack", "App Development", "DB Administrator"];
    const workplaceTypes = ["Remote", "On site", "Hybrid"];

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F4F2EE]">
                <div className="text-center bg-white border border-rose-100 p-8 rounded-2xl shadow-sm max-w-md w-full mx-4">
                    <p className="text-xl font-bold text-rose-600 mb-2">No Post Available</p>
                    <p className="text-sm text-gray-500 mb-6">It looks like the job you're looking for does not exist or could not be fetched.</p>
                    <button
                        onClick={() => router.push("/Users/Posts")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#0073b1] text-white hover:opacity-95 transition-all shadow-sm"
                    >
                        Back to Posts
                    </button>
                </div>
            </div>
        );
    }

    const FieldError = ({ field }) => {
        if (!validationErrors[field]) return null;
        return <p className="text-rose-500 text-xs font-semibold mt-1.5">{validationErrors[field]}</p>;
    };

    return (
        <div className="min-h-screen pt-24 pb-16 px-4" style={{ backgroundColor: "#F4F2EE" }}>
            <div className="w-full max-w-2xl mx-auto animate-fade-in">

                {/* Page heading — very top */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#0073b1] to-[#005582] text-transparent bg-clip-text pb-2">
                            Update Post
                        </h1>
                        <p className="mt-2 text-sm text-gray-500">Edit the details of your job posting below</p>
                    </div>
                    {jobId && (
                        <button
                            type="button"
                            onClick={() => router.push(`/Users/Posts/applications/${jobId}`)}
                            className="sm:self-start inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#0073b1] bg-[#0073b1]/10 hover:bg-[#0073b1]/15 transition-all duration-200"
                        >
                            View Applications
                        </button>
                    )}
                </div>

                {/* Steps and Back button Row */}
                <div className="relative flex items-center justify-center min-h-[40px] mb-8">
                    {/* Back button — absolute positioned on the left */}
                    <div className="absolute left-0">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-white border border-gray-200 hover:border-[#0073b1]/50 hover:text-[#0073b1] shadow-sm transition-all duration-200"
                        >
                            <FaChevronLeft className="w-3 h-3" /> Back
                        </button>
                    </div>

                    {/* Step indicator — centered */}
                    <div className="flex items-center gap-3">
                        {STEPS.map((step, i) => {
                            const stepNum = i + 1;
                            const isActive = page === stepNum;
                            const isDone = page > stepNum;
                            return (
                                <React.Fragment key={step}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                            isDone ? "bg-emerald-500 text-white" : isActive ? "bg-[#0073b1] text-white shadow-md" : "bg-gray-200 text-gray-500"
                                        }`}>
                                            {isDone ? <FaCheckCircle className="w-3.5 h-3.5" /> : stepNum}
                                        </div>
                                        <span className={`text-sm font-semibold transition-colors ${isActive ? "text-[#0073b1]" : isDone ? "text-emerald-600" : "text-gray-400"}`}>
                                            {step}
                                        </span>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className={`h-px w-12 transition-colors ${page > stepNum ? "bg-emerald-400" : "bg-gray-200"}`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Form card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">

                        {/* ── Page 1 ── */}
                        {page === 1 && (
                            <>
                                {/* Company name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                                        <span className="flex items-center gap-1.5"><FaBuilding className="w-3.5 h-3.5 text-[#0073b1]" /> Company Name</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`w-full px-4 py-3 text-sm border rounded-xl outline-none transition duration-200 ${
                                            recruiterData?.company_name 
                                                ? "cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400" 
                                                : (validationErrors.new_company_name ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20" : "border-gray-200 focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1]")
                                        }`}
                                        value={recruiterData?.company_name || formData?.new_company_name}
                                        onChange={(e) => setFormData({ ...formData, new_company_name: e.target.value })}
                                        disabled={!!recruiterData?.company_name}
                                        placeholder={recruiterData?.company_name ? "Company name is set" : "Enter your company name"}
                                    />
                                    <FieldError field="new_company_name" />
                                </div>

                                {/* Job Title */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1.5">Job Title</label>
                                    <div className="relative flex items-center">
                                        <input
                                            type="text"
                                            name="job_name"
                                            value={formData.job_name}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Principal Research Scientist"
                                            className={`w-full pl-4 pr-14 py-3 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 ${validationErrors.job_name ? "border-rose-400" : "border-gray-200"}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleGenerateTitle}
                                            disabled={aiLoading}
                                            className={`absolute right-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0073b1] to-[#005582] text-white hover:opacity-95 transition-all shadow-sm ${aiLoading ? "animate-pulse" : ""}`}
                                            title="Improve Title with AI"
                                        >
                                            <SiGooglegemini className={`w-4 h-4 ${aiLoading ? "animate-spin" : ""}`} />
                                        </button>
                                    </div>
                                    <FieldError field="job_name" />
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1.5">Location</label>
                                    <input
                                        type="text"
                                        name="job_location"
                                        value={formData.job_location}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Karachi, Pakistan or Remote"
                                        className={`w-full px-4 py-3 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 ${validationErrors.job_location ? "border-rose-400" : "border-gray-200"}`}
                                    />
                                    <FieldError field="job_location" />
                                </div>

                                {/* Workplace type */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">Workplace Type</label>
                                    <div className="flex flex-wrap gap-2">
                                        {workplaceTypes.map((type) => (
                                            <PillButton
                                                key={type}
                                                label={type}
                                                selected={formData.workplace_type === type}
                                                onClick={() => selectSingleOption("workplace_type", type)}
                                            />
                                        ))}
                                    </div>
                                    <FieldError field="workplace_type" />
                                </div>
                            </>
                        )}

                        {/* ── Page 2 ── */}
                        {page === 2 && (
                            <>
                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1.5">Job Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={5}
                                        placeholder="Describe the role, responsibilities, and expectations..."
                                        className={`w-full px-4 py-3 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 resize-none ${validationErrors.description ? "border-rose-400" : "border-gray-200"}`}
                                    />
                                    <FieldError field="description" />
                                </div>

                                {/* Skills */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">Skills Required</label>
                                    <div className="flex flex-wrap gap-2">
                                        {skillOptions.map((skill) => (
                                            <PillButton
                                                key={skill}
                                                label={skill}
                                                selected={formData.skills === skill}
                                                onClick={() => selectSingleOption("skills", skill)}
                                            />
                                        ))}
                                    </div>
                                    <FieldError field="skills" />
                                </div>

                                {/* Employment type */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">Employment Type</label>
                                    <div className="flex flex-wrap gap-2">
                                        {employmentTypes.map((type) => (
                                            <PillButton
                                                key={type}
                                                label={type}
                                                selected={formData.employment_type === type}
                                                onClick={() => selectSingleOption("employment_type", type)}
                                            />
                                        ))}
                                    </div>
                                    <FieldError field="employment_type" />
                                </div>
                            </>
                        )}

                        {/* Bottom Actions Row */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            {page === 1 ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50/50 hover:border-rose-300 transition-all duration-200"
                                    >
                                        <FaTrashAlt className="w-3.5 h-3.5" /> Delete Job
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNextPage}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#0073b1] to-[#005582] text-white shadow-sm hover:shadow-md hover:opacity-95 active:scale-[0.98] transition-all duration-200"
                                    >
                                        Next <FaChevronRight className="w-3 h-3" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handlePrevPage}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all duration-200"
                                    >
                                        <FaChevronLeft className="w-3 h-3" /> Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleUpdate}
                                        disabled={submitting}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#0073b1] to-[#005582] text-white shadow-sm hover:shadow-md hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all duration-200"
                                    >
                                        {submitting ? "Saving..." : <><FaArrowRight className="w-3.5 h-3.5" /> Update Post</>}
                                    </button>
                                </>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UpdateJob;
