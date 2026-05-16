"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Loader from "@/app/others/loader";
import toast from "react-hot-toast";
import { API_BASE_URL } from "@/utils/api";

export default function ApplicationsPage() {
    const params = useParams();
    const jobId = params?.id; // single dynamic param [id]

    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState([]);

    const fetchApplications = async () => {
        if (!jobId) return;
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/job/${jobId}/applications/`, { withCredentials: true });
            setApplications(res.data.applications || []);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to load applications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [jobId]);

    const updateStatus = async (applicationId, status) => {
        try {
            const res = await axios.patch(`${API_BASE_URL}/application/${applicationId}/status/`, { status }, { withCredentials: true });
            toast.success(res.data.message || "Status updated");
            fetchApplications();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to update status");
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F4F2EE', paddingTop: '4rem' }}>
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold text-[#0073b1]">Applications</h2>
                        <div className="text-sm text-gray-500">Job ID: {jobId}</div>
                    </div>

                    <div className="mt-6 space-y-4">
                        {applications.length === 0 && (
                            <div className="p-6 bg-gray-50 rounded text-gray-600">No applications yet for this job.</div>
                        )}

                        {applications.map((app) => (
                            <div key={app.application_id} className="p-4 md:p-6 border rounded-lg bg-white flex flex-col md:flex-row md:items-start md:justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl text-gray-600">{(app.candidate_name || '?').charAt(0)}</div>
                                        <div>
                                            <div className="text-lg font-semibold text-gray-800">{app.candidate_name}</div>
                                            <div className="text-sm text-gray-500">{app.candidate_email}</div>
                                        </div>
                                    </div>

                                    {app.cover_letter ? <p className="mt-3 text-sm text-gray-700">{app.cover_letter}</p> : null}

                                    {app.resume_url ? (
                                        <a className="mt-3 inline-block text-[#0073b1] font-medium" href={app.resume_url} target="_blank" rel="noreferrer">View resume</a>
                                    ) : null}
                                </div>

                                <div className="mt-4 md:mt-0 md:ml-6 flex flex-col items-start md:items-end gap-3">
                                    <div className="text-sm text-gray-500">{new Date(app.created_at).toLocaleString()}</div>
                                    <div className="inline-flex items-center gap-2">
                                        <span className={`px-2 py-1 text-sm rounded ${app.status === 'shortlisted' ? 'bg-green-100 text-green-800' : app.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {app.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button onClick={() => updateStatus(app.application_id, 'shortlisted')} className="px-4 py-2 bg-[#0073b1] text-white rounded hover:opacity-90">Shortlist</button>
                                        <button onClick={() => updateStatus(app.application_id, 'reviewed')} className="px-4 py-2 bg-yellow-600 text-white rounded hover:opacity-90">Mark Reviewed</button>
                                        <button onClick={() => updateStatus(app.application_id, 'rejected')} className="px-4 py-2 bg-red-600 text-white rounded hover:opacity-90">Reject</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
