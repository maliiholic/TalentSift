"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/app/others/loader";
import toast from "react-hot-toast";
import { API_BASE_URL } from "@/utils/api";

export default function CandidateInterviews() {
    const [loading, setLoading] = useState(true);
    const [interviews, setInterviews] = useState([]);

    useEffect(() => {
        let cancelled = false;

        const loadInterviews = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/candidate/interviews/`, { withCredentials: true });
                if (!cancelled) {
                    setInterviews(res.data.interviews || []);
                }
            } catch (err) {
                console.error(err);
                toast.error(err.response?.data?.error || "Failed to load interviews");
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadInterviews();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) return <Loader />;

    return (
        <div className="min-h-screen bg-[#F4F2EE] pt-24 pb-16 px-4">
                <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-4">
                <h1 className="text-2xl font-semibold text-[#0073b1] mb-4">Your Scheduled Interviews</h1>
                {interviews.length === 0 && <div className="text-gray-600">No scheduled interviews.</div>}
                <div className="space-y-3">
                    {interviews.map((it) => (
                        <div key={it.interview_id} className="p-2 border rounded-lg shadow-sm">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-medium text-gray-800">{it.job_name}</div>
                                    <div className="text-sm text-gray-600">{new Date(it.start).toLocaleString()} — {new Date(it.end).toLocaleString()}</div>
                                    <div className="text-sm text-gray-500">{it.type} • {it.location}</div>
                                </div>
                                <div className="text-sm">
                                    <span className={`px-2 py-1 rounded ${it.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'} text-xs`}>{it.status}</span>
                                </div>
                            </div>
                            {it.notes && <div className="mt-2 text-sm text-gray-700">Notes: {it.notes}</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
