"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaBuilding, FaMapMarkerAlt, FaSuitcase, FaBriefcase } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { show_search } from "@/Redux/Action";
import { API_BASE_URL } from "@/utils/api";

const truncateText = (text, maxLength) => {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const CandidateJobs = () => {
    const dispatch = useDispatch();
    const router = useRouter();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const searchTerm = useSelector((state) => state.search_bar_reducer);

    useEffect(() => {
        dispatch(show_search(true));
    }, [dispatch]);

    useEffect(() => {
        let isActive = true;

        const fetchJobs = async () => {
            setLoading(true);
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/get_all_job?page=${currentPage}&search=${searchTerm}`,
                    { withCredentials: true }
                );

                if (!isActive) {
                    return;
                }

                const data = response.data;
                setJobs(data.results || []);
                setTotalPages(data.total_pages || 1);

                const nextPage = data.current_page || currentPage;
                if (nextPage !== currentPage) {
                    setCurrentPage(nextPage);
                }
            } catch (error) {
                if (isActive) {
                    console.error("Error fetching jobs:", error);
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        fetchJobs();

        return () => {
            isActive = false;
        };
    }, [currentPage, searchTerm]);

    const handlePageChange = (page) => {
        if (page !== currentPage) {
            setCurrentPage(page);
        }
    };

    const handleJobClick = (jobId) => {
        router.push(`/Users/Jobs/${jobId}`);
    };

    return (
        <div className="min-h-screen pt-24 pb-16 px-4" style={{ backgroundColor: "#F4F2EE" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Stable Page Header */}
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
                        <span className="bg-gradient-to-r from-[#0073b1] to-[#005582] text-transparent bg-clip-text">
                            Discover Your Dream Job
                        </span>
                    </h1>
                    <p className="mt-4 text-base md:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
                        Explore top opportunities matching your skills and aspirations. Apply and take the next step.
                    </p>
                </header>

                {loading ? (
                    <div className="flex justify-center items-center min-h-[40vh]">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0073b1]"></div>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] bg-white rounded-2xl p-10 shadow-sm border border-gray-200/60 max-w-xl mx-auto">
                        <div className="bg-[#0073b1]/10 text-[#0073b1] w-14 h-14 flex items-center justify-center rounded-full mb-5">
                            <FaBriefcase className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Jobs Found</h2>
                        <p className="text-sm text-gray-500 text-center max-w-sm">
                            We couldn&apos;t find any jobs matching your search criteria. Try adjusting your filters or search keywords.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {jobs.map((job) => (
                                <div
                                    key={job.job_id}
                                    className="group relative flex flex-col justify-between bg-white rounded-2xl border border-gray-200/60 p-6 shadow-[0_2px_15px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:border-gray-300 hover:scale-[1.01] cursor-pointer"
                                    onClick={() => handleJobClick(job.job_id)}
                                >
                                    <div>
                                        {/* Company and Icon */}
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="p-3 bg-[#0073b1]/5 text-[#0073b1] rounded-xl group-hover:bg-[#0073b1] group-hover:text-white transition-all duration-300">
                                                <FaBuilding className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold text-gray-950 truncate transition-colors duration-200 group-hover:text-[#0073b1]" title={job.job_name}>
                                                    {job.job_name}
                                                </h3>
                                                <p className="text-sm font-medium text-gray-500 truncate" title={job.company_name}>
                                                    {job.company_name}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Dynamic Badges */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {job.job_location && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-600">
                                                    <FaMapMarkerAlt className="w-3 h-3 text-gray-400" />
                                                    {job.job_location}
                                                </span>
                                            )}
                                            {job.employment_type && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#0073b1]/5 text-[#0073b1]">
                                                    <FaBriefcase className="w-3 h-3 text-[#0073b1]/70" />
                                                    {job.employment_type}
                                                </span>
                                            )}
                                        </div>

                                        {/* Job Description Line-Clamped */}
                                        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed mb-6" title={job.description}>
                                            {job.description}
                                        </p>
                                    </div>

                                    {/* Action link */}
                                    <div className="flex items-center justify-end border-t border-gray-100 pt-4 mt-auto">
                                        <div className="text-[#0073b1] font-semibold text-sm inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform duration-200">
                                            View Details
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modernized Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-12 flex justify-center">
                                <nav className="inline-flex items-center gap-1">
                                    {Array.from({ length: totalPages }).map((_, index) => {
                                        const pageNum = index + 1;
                                        const isActive = currentPage === pageNum;
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`h-9 w-9 rounded-full text-sm font-semibold transition-all duration-200 ${
                                                    isActive
                                                        ? "bg-gradient-to-r from-[#0073b1] to-[#005582] text-white shadow-sm"
                                                        : "bg-white text-gray-600 border border-gray-200 hover:border-[#0073b1]/30 hover:bg-[#0073b1]/5"
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CandidateJobs;
