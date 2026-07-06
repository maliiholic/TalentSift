"use client";

import { API_BASE_URL } from "@/utils/api";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { SearchBar } from "../../others/search";
import { useDispatch, useSelector } from "react-redux";
import { admin_search_bar_action } from "@/Redux/Action";
import { FaBuilding, FaMapMarkerAlt, FaClipboardList, FaClock, FaArrowLeft, FaCheckCircle, FaFlag } from "react-icons/fa";
import { MdOutlineWork } from "react-icons/md";

const readAdminReportsCache = (cacheKey) => {
    if (typeof window === "undefined") {
        return { reportedJobs: [], totalPages: 1, totalCount: 0, hasCache: false };
    }

    try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.reportedJobs)) {
                return {
                    reportedJobs: parsed.reportedJobs,
                    totalPages: parsed.totalPages || 1,
                    totalCount: parsed.totalCount || 0,
                    hasCache: true,
                };
            }
        }
    } catch (cacheError) {
        // Ignore cache parsing errors and fall back to a network fetch.
    }

    return { reportedJobs: [], totalPages: 1, totalCount: 0, hasCache: false };
};

const ReportedJobs = () => {
    const [page, setPage] = useState(1);
    const searchQuery = useSelector((state) => state.admin_search_bar_reducer);
    const cacheKey = `admin-report:${page}:${searchQuery || ''}`;
    const cachedReports = readAdminReportsCache(cacheKey);

    const [reportedJobs, setReportedJobs] = useState(cachedReports.reportedJobs);
    const [loading, setLoading] = useState(!cachedReports.hasCache);
    const [error, setError] = useState(null);
    const [totalPages, setTotalPages] = useState(cachedReports.totalPages);
    const [totalCount, setTotalCount] = useState(cachedReports.totalCount);
    const [showModal, setShowModal] = useState(false);
    const dispatch = useDispatch();
    const [jobToDelete, setJobToDelete] = useState(null);
    const [reportId, setReportId] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const fetchReportedJobs = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await axios.get(
                    `${API_BASE_URL}/load_reports/?page=${page}&title=${encodeURIComponent(searchQuery || "")}`,
                    { withCredentials: true }
                );

                if (cancelled) return;

                const reported_jobs = Array.isArray(response.data?.results?.reported_jobs)
                    ? response.data.results.reported_jobs
                    : Array.isArray(response.data?.reported_jobs)
                    ? response.data.reported_jobs
                    : [];

                const total_count = response.data?.count || 0;
                const total_pages = Math.ceil(total_count / 10);

                setReportedJobs(reported_jobs);
                setTotalPages(total_pages);
                setTotalCount(total_count);

                try {
                    sessionStorage.setItem(
                        cacheKey,
                        JSON.stringify({
                            reportedJobs: reported_jobs,
                            totalPages: total_pages,
                            totalCount: total_count,
                        })
                    );
                } catch (cacheError) {
                    // Ignore cache write errors.
                }
            } catch (err) {
                if (cancelled) return;
                setError("Failed to fetch reported jobs: " + (err?.message || err));
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchReportedJobs();

        return () => {
            cancelled = true;
        };
    }, [page, searchQuery, cacheKey]);



    const deleteJob = async () => {
        try {
            const token = localStorage.getItem('access');
            await axios.delete(`${API_BASE_URL}/delete_job_report/${jobToDelete.job_id}/`, {
              withCredentials: true,
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            setShowModal(false);
            setPage(1);
        } catch (err) {
            setError("Error deleting reported job: " + err.message);
        }
    };

    const ignoreReport = async () => {
        try {
            const token = localStorage.getItem('access');
            closeModal();
            await axios.delete(`${API_BASE_URL}/delete_report/${reportId}/`, {
              withCredentials: true,
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            setShowModal(false);
                        setPage(1);
        } catch (err) {
            setError("Error ignoring report: " + err.message);
        }
    };

    const openModal = (job, reportId) => {
        setJobToDelete(job);
        setReportId(reportId);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setJobToDelete(null);
        setReportId(null);
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-extrabold text-[#0073b1] tracking-tight">Reported Jobs</h1>
                <p className="text-sm text-gray-500">Review listings flagged by candidates and take administrative action.</p>
            </div>

            <SearchBar />

            {/* Reported Jobs Table */}
            <div className="overflow-hidden shadow-sm rounded-2xl border border-gray-150 bg-white">
                <table className="w-full table-auto border-collapse">
                    <thead className="bg-slate-50 border-b border-gray-150 text-gray-500 text-xs font-bold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-left font-semibold">ID</th>
                            <th className="px-6 py-4 text-left font-semibold">Job Name</th>
                            <th className="px-6 py-4 text-left font-semibold">Job Location</th>
                            <th className="px-6 py-4 text-left font-semibold">Skills</th>
                            <th className="px-6 py-4 text-center font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">Loading reports...</td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-rose-600 font-semibold">{error}</td>
                            </tr>
                        ) : reportedJobs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">No reported jobs found</td>
                            </tr>
                        ) : (
                            reportedJobs.map((job) => (
                                <tr key={job.id} className="border-b border-gray-100 hover:bg-slate-50/50 transition duration-150">
                                    <td className="px-6 py-4 font-semibold text-gray-800">{job.id}</td>
                                    <td className="px-6 py-4 text-gray-750 font-medium max-w-[40ch] truncate">{job.job_name}</td>
                                    <td className="px-6 py-4 text-gray-650 font-medium max-w-[20ch] truncate">{job.job_location}</td>
                                    <td className="px-6 py-4 text-gray-650 font-medium max-w-[30ch] truncate">{job.skills}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => openModal(job, job.id)}
                                            className="px-4 py-2 text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl font-bold transition duration-150 active:scale-[0.98]"
                                        >
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center space-x-6 mt-8">
                <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs border tracking-wide transition duration-150 ${
                        page <= 1 
                            ? "bg-white text-gray-300 border-gray-200 cursor-not-allowed" 
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 active:scale-[0.98]"
                    }`}
                >
                    Previous
                </button>
                <span className="text-xs font-bold text-gray-500">Page {page} of {totalPages || 1}</span>
                <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs border tracking-wide transition duration-150 ${
                        page >= totalPages 
                            ? "bg-white text-gray-300 border-gray-200 cursor-not-allowed" 
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 active:scale-[0.98]"
                    }`}
                >
                    Next
                </button>
            </div>

            {/* Detailed Report Modal */}
            {showModal && (
                <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-40 z-50 transition-opacity duration-200 p-4">
                    <div className="w-full max-w-4xl bg-white shadow-2xl rounded-2xl p-6 sm:p-8 border border-gray-150 max-h-[90vh] flex flex-col space-y-6">
                        <div>
                            <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-1">
                                <FaFlag className="w-3.5 h-3.5" />
                                <span>Flagged Job Review</span>
                            </div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{jobToDelete.job_name}</h1>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                <div className="flex items-center space-x-3 text-gray-700">
                                    <FaBuilding className="text-[#0073b1] h-5 w-5 flex-shrink-0" />
                                    <span className="font-semibold">{jobToDelete.company_name}</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-700">
                                    <FaMapMarkerAlt className="text-rose-500 h-5 w-5 flex-shrink-0" />
                                    <span className="font-semibold">{jobToDelete.job_location}</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-700">
                                    <MdOutlineWork className="text-emerald-600 h-5 w-5 flex-shrink-0" />
                                    <span className="font-semibold capitalize">{jobToDelete.workplace_type}</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-700">
                                    <FaClipboardList className="text-[#0073b1] h-5 w-5 flex-shrink-0" />
                                    <span className="font-semibold capitalize">{jobToDelete.employment_type}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-base font-bold text-gray-950">Job Description</h2>
                                <p className="text-gray-650 leading-relaxed whitespace-pre-line">{jobToDelete.description}</p>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-base font-bold text-gray-950">Required Skills</h2>
                                <div className="flex flex-wrap gap-1.5">
                                    {jobToDelete.skills.split(",").map((skill, index) => (
                                        <span key={index} className="px-2.5 py-1 bg-slate-100 text-gray-700 text-xs font-semibold rounded-lg capitalize">
                                            {skill.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* User Feedback Section */}
                            <div className="space-y-3">
                                <h2 className="text-base font-bold text-gray-950">Reporting User Comments</h2>
                                <div className="space-y-3">
                                    {jobToDelete.feedback && jobToDelete.feedback.length > 0 ? (
                                        jobToDelete.feedback.map((feedback, index) => (
                                            <div key={index} className="text-gray-750 p-4 bg-rose-50/30 border border-rose-100 rounded-xl">
                                                <p className="leading-relaxed font-medium">{feedback}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 italic">No custom description feedback was submitted for this report.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-100">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2.5 text-xs text-gray-700 border border-gray-250 rounded-xl hover:bg-gray-50 font-bold transition"
                            >
                                Close
                            </button>
                            <button
                                onClick={ignoreReport}
                                className="px-4 py-2.5 text-xs text-gray-750 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 font-bold transition active:scale-[0.98]"
                            >
                                Dismiss Report
                            </button>
                            <button
                                onClick={deleteJob}
                                className="px-4 py-2.5 text-xs text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-bold transition shadow-sm hover:shadow active:scale-[0.98]"
                            >
                                Remove Listing
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportedJobs;
