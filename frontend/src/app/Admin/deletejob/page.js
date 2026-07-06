"use client";

import { API_BASE_URL } from "@/utils/api";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { admin_search_bar_action } from "@/Redux/Action";
import { SearchBar } from "../../others/search";

const readAdminJobsCache = (cacheKey) => {
  if (typeof window === "undefined") {
    return { jobs: [], totalPages: 1, totalCount: 0, hasCache: false };
  }

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed.jobs)) {
        return {
          jobs: parsed.jobs,
          totalPages: parsed.totalPages || 1,
          totalCount: parsed.totalCount || 0,
          hasCache: true,
        };
      }
    }
  } catch (cacheError) {
    // Ignore cache parsing errors and fall back to a network fetch.
  }

  return { jobs: [], totalPages: 1, totalCount: 0, hasCache: false };
};

const Deljobs = () => {
  const [page, setPage] = useState(1);
  const searchQuery = useSelector((state) => state.admin_search_bar_reducer);
  const cacheKey = `admin-deletejob:${page}:${searchQuery || ''}`;
  const cachedJobs = readAdminJobsCache(cacheKey);

  const [jobs, setjobs] = useState(cachedJobs.jobs);
  const [loading, setLoading] = useState(!cachedJobs.hasCache);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(cachedJobs.totalPages);
  const [totalCount, setTotalCount] = useState(cachedJobs.totalCount);
  const [showModal, setShowModal] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;

    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `${API_BASE_URL}/all_jobs/?page=${page}&search=${encodeURIComponent(searchQuery || "")}`,
          { withCredentials: true }
        );

        if (cancelled) return;

        const total_pages = Math.ceil((response.data.count || 0) / 10);
        setjobs(response.data.results || []);
        setTotalPages(total_pages);
        setTotalCount(response.data.count || 0);

        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              jobs: response.data.results || [],
              totalPages: total_pages,
              totalCount: response.data.count || 0,
            })
          );
        } catch (cacheError) {
          // Ignore cache write errors.
        }
      } catch (err) {
        if (cancelled) return;
        setError("Failed to fetch jobs: " + (err?.message || err));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchJobs();

    return () => {
      cancelled = true;
    };
  }, [page, searchQuery, cacheKey]);

  const deleteUser = async () => {
    try {
      const token = localStorage.getItem('access');
      await axios.delete(`${API_BASE_URL}/job/${subscriptionToDelete.job_id}/`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setShowModal(false);
      setPage(1);
    } catch (err) {
      setError("Error deleting user: " + err.message);
    }
  };

  const openModal = (user) => {
    setSubscriptionToDelete(user);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSubscriptionToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-[#0073b1] tracking-tight">Manage Jobs</h1>
        <p className="text-sm text-gray-500">Monitor active job posts, search listings, and delete outdated posts.</p>
      </div>

      {/* Search Bar */}
      <SearchBar />

      {/* Jobs Table */}
      <div className="overflow-hidden shadow-sm rounded-2xl border border-gray-150 bg-white">
        <table className="w-full table-auto border-collapse">
          <thead className="bg-slate-50 border-b border-gray-150 text-gray-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">ID</th>
              <th className="px-6 py-4 text-left font-semibold">Title</th>
              <th className="px-6 py-4 text-left font-semibold">Skills</th>
              <th className="px-6 py-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 font-medium">Loading jobs...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-rose-600 font-semibold">{error}</td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 font-medium">No jobs found</td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.job_id} className="border-b border-gray-100 hover:bg-slate-50/50 transition duration-150">
                  <td className="px-6 py-4 font-semibold text-gray-800">{job.job_id}</td>
                  <td className="px-6 py-4 text-gray-750 font-medium">{job.job_name}</td>
                  <td className="px-6 py-4 text-gray-650 font-medium">{job.skills}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openModal(job)}
                      className="px-4 py-2 text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl font-bold transition duration-150 active:scale-[0.98]"
                    >
                      Delete
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

      {/* Modal for Confirm Deletion */}
      {showModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-40 z-50 transition-opacity duration-200">
          <div className="bg-white p-8 rounded-2xl border border-gray-150 shadow-2xl w-96 max-w-sm text-center space-y-4">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Confirm Deletion</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Are you sure you want to delete this job listing? This will remove the listing and all its applications.</p>
            <div className="flex justify-end mt-6 space-x-4">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 text-xs text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteUser}
                className="px-4 py-2.5 text-xs text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-bold transition shadow-sm hover:shadow active:scale-[0.99]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deljobs;
