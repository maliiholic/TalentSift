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
        router.push(`Jobs/${jobId}`);
    };

    const handleApply = (jobId) => {
        console.log(`Applied to job ID: ${jobId}`);
    };

    return (
        <div className="min-h-screen py-12 mt-12" style={{ backgroundColor: "#F4F2EE" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {jobs.length > 0 && (
                    <header className="text-center mb-10">
                        <h1 className="text-5xl font-extrabold tracking-wide text-gray-900 leading-tight">
                            <span className="bg-gradient-to-r from-[#0073b1] to-[#0073b1] text-transparent bg-clip-text">
                                Discover Your Dream Job
                            </span>
                        </h1>
                        <p className="mt-6 text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
                            Unlock top opportunities tailored to your skills and aspirations. Apply with confidence and take the next step in your career journey.
                        </p>
                    </header>
                )}

                {loading ? (
                    <></>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] bg-[#F9FAFB] rounded-lg p-8 shadow-md">
                        <div className="bg-[#0073b1] text-white w-16 h-16 flex items-center justify-center rounded-full mb-6">
                            <FaBriefcase className="text-white w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-bold text-[#0073b1] mb-4">No Jobs Found</h2>
                        <p className="text-lg text-gray-600 text-center max-w-md">
                            We couldn&apos;t find any jobs matching your search. Refine your search criteria or check back later for new opportunities.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {jobs.map((job) => (
                                <div
                                    key={job.job_id}
                                    className="bg-white rounded-lg shadow-sm p-4 transition-all duration-200 hover:bg-gray-50 hover:shadow-md cursor-pointer"
                                    onClick={() => handleJobClick(job.job_id)}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-[#0073b1] rounded-full">
                                            <FaBuilding className="text-white w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-base font-medium text-gray-900 truncate" title={job.job_name}>
                                                {truncateText(job.job_name, 15)}
                                            </h3>
                                            <p className="text-sm text-gray-500 truncate" title={job.company_name}>
                                                {truncateText(job.company_name, 15)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-gray-600 text-sm space-y-2">
                                        <p className="flex items-center">
                                            <FaMapMarkerAlt className="mr-2 text-gray-400" />
                                            {truncateText(job.job_location, 15)}
                                        </p>
                                        <p className="flex items-center">
                                            <FaSuitcase className="mr-2 text-gray-400" />
                                            {truncateText(job.employment_type, 15)}
                                        </p>
                                    </div>
                                    <div className="mt-3 text-sm text-gray-700 line-clamp-3" title={job.description}>
                                        {truncateText(job.description, 20)}
                                    </div>
                                    <div className="mt-4 flex justify-between items-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleApply(job.job_id);
                                            }}
                                            className="px-3 py-2 bg-[#0073b1] text-white text-sm font-medium rounded-md hover:bg-[#005f8d] transition-all duration-200"
                                        >
                                            Apply
                                        </button>

                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 flex justify-center">
                            <nav className="inline-flex rounded-md shadow-sm">
                                {Array.from({ length: totalPages }).map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handlePageChange(index + 1)}
                                        className={`px-4 py-2 text-sm font-medium rounded-md mx-1 ${currentPage === index + 1
                                            ? "bg-[#0073b1] text-white"
                                            : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                                            }`}
                                    >
                                        {index + 1}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CandidateJobs;
