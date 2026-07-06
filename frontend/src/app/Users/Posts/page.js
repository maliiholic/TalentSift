"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaBuilding, FaMapMarkerAlt, FaSuitcase, FaBriefcase, FaPlus, FaCalendarAlt, FaUsers } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { show_search } from "@/Redux/Action";
import { API_BASE_URL } from "@/utils/api";

const employmentColors = {
    "Full-time":   { bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-100" },
    "Part-time":   { bg: "bg-violet-50",   text: "text-violet-700",   border: "border-violet-100"  },
    "Contract":    { bg: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-100"   },
    "Internship":  { bg: "bg-sky-50",      text: "text-sky-700",      border: "border-sky-100"     },
    "Temporary":   { bg: "bg-rose-50",     text: "text-rose-700",     border: "border-rose-100"    },
};

const getTypeBadge = (type) => employmentColors[type] || { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };

const Posts = () => {
    const dispatch = useDispatch();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalJobs, setTotalJobs] = useState(0);
    const searchTerm = useSelector((state) => state.search_bar_reducer);
    const router = useRouter();

    useEffect(() => {
        dispatch(show_search(true));
    }, [dispatch]);

    useEffect(() => {
        let isActive = true;
        const fetchJobs = async () => {
            setLoading(true);
            try {
                const token = typeof window !== "undefined"
                    ? (localStorage.getItem("access") || sessionStorage.getItem("access"))
                    : null;
                const opts = { withCredentials: true };
                if (token) opts.headers = { Authorization: `Bearer ${token}` };
                const response = await axios.get(
                    `${API_BASE_URL}/get-jobs/?page=${currentPage}&search=${searchTerm}`,
                    opts
                );
                if (!isActive) return;
                const data = response.data;
                setJobs(data.results || []);
                setTotalPages(data.total_pages || 1);
                setTotalJobs(data.count || 0);
                const nextPage = data.current_page || currentPage;
                if (nextPage !== currentPage) setCurrentPage(nextPage);
            } catch (error) {
                if (isActive) console.error("Error fetching jobs:", error);
            } finally {
                if (isActive) setLoading(false);
            }
        };
        fetchJobs();
        return () => { isActive = false; };
    }, [currentPage, searchTerm]);

    const handlePageChange = (page) => {
        if (page !== currentPage) setCurrentPage(page);
    };

    const handleJobClick = (jobId) => router.push(`/Users/Posts/${jobId}`);

    return (
        <div className="min-h-screen pt-24 pb-16 px-4" style={{ backgroundColor: "#F4F2EE" }}>
            <div className="w-full max-w-6xl mx-auto">

                {/* Page heading — outside card, centered, matches other pages */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#0073b1] to-[#005582] text-transparent bg-clip-text pb-2">
                        Your Job Posts
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">{totalJobs} active job listing{totalJobs !== 1 ? "s" : ""}</p>
                </div>

                {/* Controls bar */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FaUsers className="text-[#0073b1]/60 w-4 h-4" />
                        <span>Manage and track all your posted roles</span>
                    </div>
                    <button
                        onClick={() => {
                            sessionStorage.removeItem("formData");
                            router.push("/Users/Posts/CreateJob");
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0073b1] to-[#005582] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.98] transition-all duration-200"
                    >
                        <FaPlus className="w-3.5 h-3.5" />
                        Post a Job
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
                                <div className="h-24 bg-gray-100" />
                                <div className="p-4 space-y-3">
                                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[45vh] bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="p-5 bg-[#0073b1]/10 rounded-2xl mb-4">
                            <FaBriefcase className="w-10 h-10 text-[#0073b1]" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-1">No Job Posts Yet</h2>
                        <p className="text-sm text-gray-500 text-center max-w-xs mb-6">
                            Post your first job and start receiving applications from talented candidates.
                        </p>
                        <button
                            onClick={() => router.push("/Users/Posts/CreateJob")}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#0073b1] to-[#005582] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            <FaPlus className="w-3.5 h-3.5" /> Post a Job
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {jobs.map((job) => {
                                const badge = getTypeBadge(job.employment_type);
                                return (
                                    <div
                                        key={job.job_id}
                                        onClick={() => handleJobClick(job.job_id)}
                                        className="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-[#0073b1]/30 cursor-pointer transition-all duration-300 overflow-hidden"
                                    >
                                        {/* Card top accent bar */}
                                        <div className="h-1.5 bg-gradient-to-r from-[#0073b1] to-[#005582]" />

                                        <div className="p-5 flex flex-col flex-1">
                                            {/* Header row */}
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#0073b1]/10 flex items-center justify-center group-hover:bg-[#0073b1]/15 transition-colors duration-300">
                                                    <FaBuilding className="w-5 h-5 text-[#0073b1]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h2 className="text-sm font-bold text-gray-900 truncate leading-snug" title={job.job_name}>
                                                        {job.job_name}
                                                    </h2>
                                                    <p className="text-xs text-gray-500 truncate mt-0.5" title={job.company_name}>
                                                        {job.company_name}
                                                    </p>
                                                </div>
                                                {/* Employment type pill */}
                                                <span className={`flex-shrink-0 inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}>
                                                    {job.employment_type}
                                                </span>
                                            </div>

                                            {/* Meta row */}
                                            <div className="space-y-1.5 mb-4">
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <FaMapMarkerAlt className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{job.job_location}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <FaSuitcase className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                    <span>{job.workplace_type || "—"}</span>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <p className="text-xs text-gray-600 line-clamp-2 flex-1 leading-relaxed">
                                                {job.description}
                                            </p>

                                            {/* Footer */}
                                            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                                                <div className="flex flex-wrap gap-1">
                                                    {(job.skills || "").split(",").slice(0, 2).map((s) => s.trim()).filter(Boolean).map((s) => (
                                                        <span key={s} className="text-[10px] font-medium px-2 py-0.5 bg-gray-50 text-gray-600 rounded-md border border-gray-100">
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                                    <FaCalendarAlt className="w-3 h-3" />
                                                    {new Date(job.updated_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-8">
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handlePageChange(i + 1)}
                                        className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                            currentPage === i + 1
                                                ? "bg-gradient-to-r from-[#0073b1] to-[#005582] text-white shadow-sm"
                                                : "bg-white text-gray-600 border border-gray-200 hover:border-[#0073b1]/40 hover:text-[#0073b1]"
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Posts;
