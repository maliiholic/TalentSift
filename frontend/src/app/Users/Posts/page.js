"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaBuilding, FaMapMarkerAlt, FaSuitcase, FaBriefcase } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { show_search } from "@/Redux/Action";
import { API_BASE_URL } from "@/utils/api";

const Posts = () => {
    const dispatch = useDispatch();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
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
                // Prefer cookie-based auth, but fall back to Authorization header
                const token = typeof window !== 'undefined'
                    ? (localStorage.getItem('access') || sessionStorage.getItem('access'))
                    : null;
                const axiosOpts = {
                    withCredentials: true,
                };
                if (token) {
                    axiosOpts.headers = { Authorization: `Bearer ${token}` };
                }

                const response = await axios.get(
                    `${API_BASE_URL}/get-jobs/?page=${currentPage}&search=${searchTerm}`,
                    axiosOpts
                );

                if (!isActive) {
                    return;
                }

                const data = response.data;
                setJobs(data.results || []);
                setTotalPages(data.total_pages || 1);
                setTotalJobs(data.count || 0);

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
        router.push(`/Users/Posts/${jobId}`);
    };

    if (loading) {
        return <></>;
    }

    return (
        <div className="min-h-screen py-16 mt-8" style={{ backgroundColor: "#F4F2EE" }}>
            <div className="w-full max-w-6xl mx-auto px-6">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-5xl font-extrabold text-gray-800 tracking-tight leading-tight">
                            <span className="text-[#0073b1]">Available</span> Jobs
                        </h1>
                        <p className="mt-2 text-gray-600">{totalJobs} total job posts</p>
                    </div>
                    <button
                        className="bg-[#0073b1] text-white flex items-center py-2 px-6 rounded-full font-semibold shadow-sm hover:scale-102 hover:shadow-md transition-all"
                        onClick={() => {
                            sessionStorage.removeItem("formData");
                            router.push("/Users/Posts/CreateJob");
                        }}
                    >
                        <FaBriefcase className="mr-2 text-lg" />
                        Post a Job
                    </button>
                </div>

                {jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh]">
                        <h2 className="text-3xl font-semibold text-[#0073b1] mb-3">No Jobs Available</h2>
                        <p className="text-gray-500 text-center">
                            Be the first to post a job and connect with talented candidates.
                        </p>
                    </div>
                ) : (
                    <div>
                                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                                    {jobs.map((job, index) => (
                                        <div
                                            key={index}
                                            className="flex flex-col bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200 transition-all hover:shadow-md hover:border-[#0073b1] cursor-pointer"
                                            onClick={() => handleJobClick(job.job_id)}
                                        >
                                            <div className="bg-[#0073b1] p-3 flex items-center space-x-3">
                                                <div className="bg-white p-2 rounded-full">
                                                    <FaBuilding className="text-[#0073b1] text-2xl" />
                                                </div>
                                                <div className="ml-4 w-full">
                                                        <h2 className="text-base font-semibold text-white truncate" title={job.job_name}>
                                                        {job.job_name.length > 15 ? `${job.job_name.slice(0, 15)}...` : job.job_name}
                                                    </h2>
                                                        <p className="text-xs text-gray-200 truncate" title={job.company_name}>
                                                        {job.company_name.length > 15 ? `${job.company_name.slice(0, 15)}...` : job.company_name}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="p-3">
                                                <div className="text-sm text-gray-500 flex items-center mb-2">
                                                    <FaMapMarkerAlt className="mr-2 text-gray-400" />
                                                    <span>{job.job_location.length > 15 ? `${job.job_location.slice(0, 15)}...` : job.job_location}</span>
                                                </div>
                                                <div className="text-sm text-gray-500 flex items-center mb-3">
                                                    <FaSuitcase className="mr-2 text-gray-400" />
                                                    <span>{job.employment_type}</span>
                                                </div>
                                                <p className="text-gray-700 text-sm line-clamp-2" title={job.description}>
                                                    {job.description.length > 20 ? `${job.description.slice(0, 20)}...` : job.description}
                                                </p>
                                            </div>

                                            <div className="p-2 bg-gray-100 border-t">
                                                <p className="text-xs text-gray-500">
                                                    <span className="font-medium">Skills:</span> {job.skills.length > 20 ? `${job.skills.slice(0, 20)}...` : job.skills}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    <span className="font-medium">Interview Type:</span> {job.interview_type}
                                                </p>
                                                <div className="mt-2 text-xs text-gray-400">
                                                    Last updated: {new Date(job.updated_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                        </div>

                        <div className="flex justify-center mt-8">
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i}
                                    className={`px-5 py-2 mx-2 rounded-full transition-colors duration-300 ${currentPage === i + 1
                                            ? "bg-[#0073b1] text-white"
                                            : "bg-gray-200 text-gray-600 hover:bg-[#0073b1] hover:text-white"
                                        }`}
                                    onClick={() => handlePageChange(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Posts;
