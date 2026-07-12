"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { SiGooglegemini } from "react-icons/si";
import { FaBuilding, FaMapMarkerAlt, FaCheckCircle, FaChevronRight, FaChevronLeft, FaArrowRight } from "react-icons/fa";
import toast from "react-hot-toast";
import Loader from "@/app/others/loader";
import { useDispatch } from "react-redux";
import { show_search } from "@/Redux/Action";
import { API_BASE_URL } from "@/utils/api";

const defaultFormData = {
    job_name: "",
    job_location: "",
    workplace_type: "",
    employment_type: "",
    description: "",
    skills: [],
    interview_type: "manual",
    new_company_name: "",
};

const STEPS = ["Basic Info", "Details & Skills"];

const CreateJob = () => {
    const dispatch = useDispatch();
    const [recruiterData, setRecruiterData] = useState(null);
    const [formData, setFormData] = useState(defaultFormData);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [validationErrors, setValidationErrors] = useState({});
    const [aiLoading, setAiLoading] = useState(false);
    const [aiDescLoading, setAiDescLoading] = useState(false);
    const [customSkill, setCustomSkill] = useState("");
    const router = useRouter();

    useEffect(() => {
        dispatch(show_search(false));
        if (typeof window !== "undefined") sessionStorage.removeItem("formData");
        const fetchRecruiterData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/get_recruiter_company/`, { withCredentials: true });
                setRecruiterData(response.data);
            } catch {
                toast.error("Failed to load recruiter data.");
            } finally {
                setLoading(false);
            }
        };
        fetchRecruiterData();
    }, [dispatch]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (validationErrors[e.target.name]) {
            setValidationErrors((prev) => ({ ...prev, [e.target.name]: "" }));
        }
    };

    const selectSingleOption = (field, option) => {
        setFormData((prev) => ({ ...prev, [field]: prev[field] === option ? "" : option }));
        if (validationErrors[field]) setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const toggleMultiOption = (field, option) => {
        setFormData((prev) => ({
            ...prev,
            [field]: prev[field].includes(option)
                ? prev[field].filter((x) => x !== option)
                : [...prev[field], option],
        }));
        if (validationErrors[field]) setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const validatePage = () => {
        const errors = {};
        if (page === 1) {
            if (!formData.job_name.trim()) errors.job_name = "Job title is required.";
            else if (formData.job_name.length < 3) errors.job_name = "Job title must be at least 3 characters.";
            if (!formData.job_location.trim()) errors.job_location = "Location is required.";
            else if (formData.job_location.length < 3) errors.job_location = "Location must be at least 3 characters.";
            if (!formData.workplace_type) errors.workplace_type = "Please select a workplace type.";
            if (!recruiterData?.company_name) {
                if (!formData.new_company_name.trim()) errors.new_company_name = "Company name is required.";
                else if (!/^[A-Za-z\s]+$/.test(formData.new_company_name.trim())) errors.new_company_name = "Use only letters and spaces.";
                else if (formData.new_company_name.trim().length < 2) errors.new_company_name = "Must be at least 2 characters.";
            }
        }
        if (page === 2) {
            if (!formData.description.trim()) errors.description = "Description is required.";
            else if (formData.description.length < 10) errors.description = "Description must be at least 10 characters.";
            if (!formData.skills || formData.skills.length === 0) {
                errors.skills = "Select at least one skill.";
            }
            if (!formData.employment_type) errors.employment_type = "Please select an employment type.";
        }
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleGenerateTitle = async () => {
        if (!formData.job_name.trim()) {
            setValidationErrors((prev) => ({ ...prev, job_name: "Enter a job title before using AI." }));
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
                    .replace(/\*+/g, "")                                        // strip ** bold markers
                    .split(/\n|\r/)[0]                                           // take FIRST LINE ONLY — kills "Why this works:" etc.
                    .replace(/^[\w\s]+(title|role|position|name)\s*:\s*/i, "")  // strip "Revised Job Title:" prefix
                    .replace(/\s*[–—-].*$/i, "")                                // strip " – React Native" type suffixes if too long
                    .trim();
                setFormData((prev) => ({ ...prev, job_name: clean }));
                setValidationErrors((prev) => ({ ...prev, job_name: "" }));
                toast.success("AI title generated!");
            }
        } catch {
            toast.error("AI title generation failed.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleGenerateDescription = async () => {
        if (!formData.job_name.trim()) {
            setValidationErrors((prev) => ({ ...prev, description: "Enter a job title on the first page before generating a description." }));
            toast.error("Please provide a job title first.");
            return;
        }
        setAiDescLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('access') : null;
            const response = await axios.post(
                `${API_BASE_URL}/generate-job-description/`,
                {
                    job_name: formData.job_name,
                    workplace_type: formData.workplace_type || "Remote",
                    skills: Array.isArray(formData.skills) ? formData.skills.join(", ") : formData.skills,
                },
                { withCredentials: true, headers: token ? { Authorization: `Bearer ${token}` } : {} }
            );
            if (response.data?.description) {
                setFormData((prev) => ({ ...prev, description: response.data.description }));
                setValidationErrors((prev) => ({ ...prev, description: "" }));
                toast.success("AI job description generated!");
            }
        } catch {
            toast.error("AI description generation failed.");
        } finally {
            setAiDescLoading(false);
        }
    };

    const handleAddCustomSkill = (e) => {
        if (e) e.preventDefault();
        const skill = customSkill.trim();
        if (!skill) return;
        if (!formData.skills.includes(skill)) {
            setFormData((prev) => ({
                ...prev,
                skills: [...prev.skills, skill],
            }));
            if (validationErrors.skills) {
                setValidationErrors((prev) => ({ ...prev, skills: "" }));
            }
        }
        setCustomSkill("");
    };

    const handleNextPage = () => { if (validatePage()) setPage(2); };
    const handlePrevPage = () => setPage(1);

    const handleSubmit = async () => {
        if (!validatePage()) return;
        setSubmitting(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('access') : null;
            const finalFormData = {
                ...formData,
                company_name: formData.new_company_name,
                skills: Array.isArray(formData.skills) ? formData.skills.join(",") : formData.skills,
            };
            await axios.post(`${API_BASE_URL}/createjob/`, finalFormData, {
                withCredentials: true,
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            toast.success("Job posted successfully!");
            router.push("/Users/Posts");
        } catch (err) {
            toast.error(err?.response?.data?.error || "Failed to submit. Please try again.");
            setSubmitting(false);
        }
    };

    if (loading) return <Loader />;

    const employmentTypes = ["Full-time", "Part-time", "Contract", "Temporary", "Internship"];
    const skillOptions = ["Front-end", "Back-end", "Full Stack", "App Development", "DB Administrator"];
    const workplaceTypes = ["Remote", "On site", "Hybrid"];

    const FieldError = ({ field }) =>
        validationErrors[field] ? (
            <p className="mt-1.5 text-xs text-rose-600 font-medium">{validationErrors[field]}</p>
        ) : null;

    const PillButton = ({ label, selected, onClick }) => (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                selected
                    ? "bg-[#0073b1] text-white border-[#0073b1] shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#0073b1]/50 hover:text-[#0073b1]"
            }`}
        >
            {selected && <FaCheckCircle className="w-3 h-3" />}
            {label}
        </button>
    );

    return (
        <div className="min-h-screen pt-24 pb-16 px-4" style={{ backgroundColor: "#F4F2EE" }}>
            <div className="w-full max-w-2xl mx-auto">

                {/* Page heading — very top */}
                <div className="text-center mb-6">
                    <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#0073b1] to-[#005582] text-transparent bg-clip-text pb-2">
                        Post a Job
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">Fill in the details below to attract the right candidates</p>
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
                                        className={`w-full px-4 py-3 text-sm border rounded-xl bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 ${
                                            recruiterData?.company_name ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200"
                                        } ${validationErrors.new_company_name ? "border-rose-400" : ""}`}
                                        value={recruiterData?.company_name || formData.new_company_name}
                                        onChange={(e) => {
                                            setFormData({ ...formData, new_company_name: e.target.value });
                                            if (validationErrors.new_company_name) setValidationErrors((p) => ({ ...p, new_company_name: "" }));
                                        }}
                                        disabled={!!recruiterData?.company_name}
                                        placeholder={recruiterData?.company_name ? "Company already set" : "Enter your company name"}
                                    />
                                    <FieldError field="new_company_name" />
                                </div>

                                {/* Job title + AI */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1.5">Job Title</label>
                                    <div className="relative flex items-center">
                                        <input
                                            type="text"
                                            name="job_name"
                                            value={formData.job_name}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Senior React Developer"
                                            className={`w-full px-4 py-3 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 pr-14 ${validationErrors.job_name ? "border-rose-400" : "border-gray-200"}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleGenerateTitle}
                                            disabled={aiLoading}
                                            title="Improve title with AI"
                                            className="absolute right-2 p-2 rounded-lg bg-gradient-to-br from-[#0073b1] to-indigo-700 text-white hover:opacity-90 active:scale-95 disabled:opacity-60 transition-all duration-200 shadow-sm"
                                        >
                                            <SiGooglegemini className={`w-4 h-4 ${aiLoading ? "animate-spin" : ""}`} />
                                        </button>
                                    </div>
                                    <FieldError field="job_name" />
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                                        <span className="flex items-center gap-1.5"><FaMapMarkerAlt className="w-3.5 h-3.5 text-[#0073b1]" /> Location</span>
                                    </label>
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
                                    <label className="block text-sm font-semibold text-gray-800 mb-1.5 flex items-center justify-between">
                                        <span>Job Description</span>
                                        <button
                                            type="button"
                                            onClick={handleGenerateDescription}
                                            disabled={aiDescLoading}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-br from-[#0073b1] to-indigo-700 rounded-lg hover:opacity-90 active:scale-95 disabled:opacity-60 transition duration-200 shadow-sm"
                                        >
                                            <SiGooglegemini className={`w-3.5 h-3.5 ${aiDescLoading ? "animate-spin" : ""}`} />
                                            {aiDescLoading ? "Generating..." : "Generate Description"}
                                        </button>
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={10}
                                        placeholder="Describe the role, responsibilities, and expectations..."
                                        className={`w-full px-4 py-3 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 resize-y min-h-[160px] ${validationErrors.description ? "border-rose-400" : "border-gray-200"}`}
                                    />
                                    <FieldError field="description" />
                                </div>

                                {/* Skills — Custom tags + pills */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">Skills Required</label>

                                    {/* Selected skills tags */}
                                    {formData.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                            {formData.skills.map((skill) => (
                                                <span
                                                    key={skill}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0073b1]/10 text-[#0073b1] border border-[#0073b1]/20 rounded-lg text-xs font-bold"
                                                >
                                                    {skill}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleMultiOption("skills", skill)}
                                                        className="text-[#0073b1] hover:text-rose-600 transition-colors font-bold text-xs"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Predefined skill presets */}
                                    <p className="text-xs text-gray-400 mb-2 font-medium">Quick suggestions:</p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {skillOptions.map((skill) => {
                                            const isSelected = formData.skills.includes(skill);
                                            return (
                                                <button
                                                    key={skill}
                                                    type="button"
                                                    onClick={() => toggleMultiOption("skills", skill)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                                                        isSelected
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-250 shadow-sm font-bold"
                                                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                                                    }`}
                                                >
                                                    {isSelected ? "✓ " : ""}{skill}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Add custom skill input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customSkill}
                                            onChange={(e) => setCustomSkill(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleAddCustomSkill(e);
                                                }
                                            }}
                                            placeholder="Type custom skill (e.g. Python, Docker) & press Enter"
                                            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCustomSkill}
                                            className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200 hover:bg-gray-200 active:scale-95 transition-all text-sm shadow-sm"
                                        >
                                            Add
                                        </button>
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

                        {/* Navigation buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <button
                                type="button"
                                onClick={handlePrevPage}
                                disabled={page === 1}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                <FaChevronLeft className="w-3 h-3" /> Back
                            </button>

                            {page === 1 ? (
                                <button
                                    type="button"
                                    onClick={handleNextPage}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#0073b1] to-[#005582] text-white shadow-sm hover:shadow-md hover:opacity-95 active:scale-[0.98] transition-all duration-200"
                                >
                                    Next <FaChevronRight className="w-3 h-3" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#0073b1] to-[#005582] text-white shadow-sm hover:shadow-md hover:opacity-95 active:scale-[0.98] disabled:opacity-60 transition-all duration-200"
                                >
                                    {submitting ? "Posting..." : <><FaArrowRight className="w-3.5 h-3.5" /> Post Job</>}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateJob;
