"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Loader from "@/app/others/loader";
import toast from "react-hot-toast";
import { API_BASE_URL } from "@/utils/api";

export default function ApplicationsPage() {
    const params = useParams();
    const jobId = params?.id;

    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState([]);
    const [jobName, setJobName] = useState("");
    const [viewMode, setViewMode] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [stageFilter, setStageFilter] = useState("all");
    const [scheduleFilter, setScheduleFilter] = useState("all");

    const [showSchedule, setShowSchedule] = useState(false);
    const [schedAppId, setSchedAppId] = useState(null);
    const [startDt, setStartDt] = useState("");
    const [interviewType, setInterviewType] = useState("virtual");
    const [location, setLocation] = useState("");
    const [notes, setNotes] = useState("");

    const fetchApplications = async () => {
        if (!jobId) return;
        setLoading(true);
        try {
            if (viewMode === "screened") {
                const res = await axios.get(`${API_BASE_URL}/job/${jobId}/screened/`, { withCredentials: true });
                setJobName(res.data.job_name || "");
                const transformed = (res.data.screened_applications || []).map((x) => ({
                    ...x,
                    status: x.screening_status,
                    created_at: x.applied_at,
                }));
                setApplications(transformed);
            } else {
                const res = await axios.get(`${API_BASE_URL}/job/${jobId}/applications/`, { withCredentials: true });
                setJobName(res.data.job_name || "");
                setApplications(res.data.applications || []);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to load applications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [jobId, viewMode]);

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

    const openSchedule = (applicationId) => {
        setSchedAppId(applicationId);
        setShowSchedule(true);
    };

    const closeSchedule = () => {
        setShowSchedule(false);
        setSchedAppId(null);
        setStartDt("");
        setInterviewType("virtual");
        setLocation("");
        setNotes("");
    };

    const submitSchedule = async () => {
        if (!schedAppId || !startDt) {
            toast.error("Please provide a start date/time");
            return;
        }

        try {
            const res = await axios.post(
                `${API_BASE_URL}/application/${schedAppId}/schedule-interview/`,
                {
                    start: new Date(startDt).toISOString(),
                    interview_type: interviewType,
                    location,
                    notes,
                },
                { withCredentials: true }
            );
            toast.success(res.data.message || "Interview scheduled");
            closeSchedule();
            fetchApplications();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to schedule interview");
        }
    };

    const visibleApplications = applications.filter((app) => {
        const term = searchTerm.trim().toLowerCase();
        const candidateText = `${app.candidate_name || ""} ${app.candidate_email || ""}`.toLowerCase();
        const matchesSearch = !term || candidateText.includes(term);

        const matchesStage =
            stageFilter === "all" ||
            (stageFilter === "passed" && app.screening_status === "passed") ||
            (stageFilter === "failed" && app.screening_status === "failed") ||
            (stageFilter === "pending" && app.screening_status === "not_started") ||
            (stageFilter === "reviewed" && app.status === "reviewed") ||
            (stageFilter === "shortlisted" && app.status === "shortlisted") ||
            (stageFilter === "rejected" && app.status === "rejected");

        const matchesSchedule =
            scheduleFilter === "all" ||
            (scheduleFilter === "scheduled" && !!app.interview_id) ||
            (scheduleFilter === "unscheduled" && !app.interview_id);

        return matchesSearch && matchesStage && matchesSchedule;
    });

    const totalPassed = applications.filter((app) => app.screening_status === "passed").length;
    const totalScheduled = applications.filter((app) => !!app.interview_id).length;
    const totalFailed = applications.filter((app) => app.screening_status === "failed").length;

    if (loading) return <Loader />;

    return (
        <>
            <div className="min-h-screen" style={{ backgroundColor: "#F4F2EE", paddingTop: "4rem" }}>
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h2 className="text-3xl font-extrabold text-[#0073b1] tracking-tight">
                                    {viewMode === "screened" ? "Passed AI Candidates" : "Applications"}
                                </h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    {viewMode === "screened"
                                        ? "These candidates cleared the AI screen and can be moved to HR scheduling."
                                        : "Review every applicant, then switch to Passed AI to schedule interviews."}
                                </p>
                                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-sm text-gray-700">
                                    <span className="font-medium text-gray-500">Role</span>
                                    <span className="font-semibold text-gray-900">{jobName || "Job application"}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={() => setViewMode("all")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${viewMode === "all" ? "bg-[#0073b1] text-white" : "bg-gray-100 text-gray-700"}`}>All</button>
                                <button onClick={() => setViewMode("screened")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${viewMode === "screened" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"}`}>Passed AI</button>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-4">
                            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
                                <div className="text-xs uppercase tracking-wide text-blue-700">Total</div>
                                <div className="mt-1 text-xl font-bold text-blue-900">{applications.length}</div>
                            </div>
                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                                <div className="text-xs uppercase tracking-wide text-emerald-700">Passed AI</div>
                                <div className="mt-1 text-xl font-bold text-emerald-900">{totalPassed}</div>
                            </div>
                            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                                <div className="text-xs uppercase tracking-wide text-amber-700">Scheduled</div>
                                <div className="mt-1 text-xl font-bold text-amber-900">{totalScheduled}</div>
                            </div>
                            <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                                <div className="text-xs uppercase tracking-wide text-red-700">Failed AI</div>
                                <div className="mt-1 text-xl font-bold text-red-900">{totalFailed}</div>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Search</label>
                                <input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Candidate name or email"
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#0073b1]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">AI stage</label>
                                <select
                                    value={stageFilter}
                                    onChange={(e) => setStageFilter(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#0073b1]"
                                >
                                    <option value="all">All stages</option>
                                    <option value="passed">Passed AI</option>
                                    <option value="failed">Failed AI</option>
                                    <option value="pending">Not started</option>
                                    <option value="reviewed">Reviewed</option>
                                    <option value="shortlisted">Shortlisted</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Interview</label>
                                <select
                                    value={scheduleFilter}
                                    onChange={(e) => setScheduleFilter(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#0073b1]"
                                >
                                    <option value="all">All</option>
                                    <option value="unscheduled">Not scheduled</option>
                                    <option value="scheduled">Scheduled</option>
                                </select>
                            </div>
                        </div>

                        {viewMode === "screened" && (
                            <div className="mt-5 flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => setScheduleFilter("all")}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${scheduleFilter === "all" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"}`}
                                >
                                    All passed
                                </button>
                                <button
                                    onClick={() => setScheduleFilter("unscheduled")}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${scheduleFilter === "unscheduled" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700"}`}
                                >
                                    Not scheduled
                                </button>
                                <button
                                    onClick={() => setScheduleFilter("scheduled")}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${scheduleFilter === "scheduled" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
                                >
                                    Scheduled
                                </button>
                            </div>
                        )}

                        <div className="mt-6 space-y-3">
                            {visibleApplications.length === 0 && (
                                <div className="p-6 bg-gray-50 rounded-lg text-gray-600">
                                    {searchTerm || stageFilter !== "all" || scheduleFilter !== "all"
                                        ? "No candidates match the current filters."
                                        : viewMode === "screened"
                                            ? "No one has passed AI screening yet."
                                            : "No applications yet for this job."}
                                </div>
                            )}

                            {visibleApplications.map((app) => (
                                <div key={app.application_id} className={`p-2 md:p-3 border rounded-2xl flex flex-col gap-2 md:flex-row md:items-start md:justify-between shadow-sm transition hover:shadow-md ${app.screening_status === "passed" ? "bg-emerald-50 border-emerald-200" : app.screening_status === "failed" ? "bg-white border-gray-100" : "bg-white border-gray-200"}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4">
                                            <div className={`flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base ${app.screening_status === "passed" ? "bg-emerald-100 text-emerald-700" : app.screening_status === "failed" ? "bg-gray-100 text-gray-600" : "bg-gray-100 text-gray-600"}`}>{(app.candidate_name || "?").charAt(0)}</div>
                                            <div>
                                                <div className="text-base font-medium text-gray-800">{app.candidate_name}</div>
                                                <div className="text-sm text-gray-500">{app.candidate_email}</div>
                                            </div>
                                        </div>

                                        {app.cover_letter ? <p className="mt-1 text-sm text-gray-700 line-clamp-2">{app.cover_letter}</p> : null}

                                        {app.resume_url ? (
                                            <a className="mt-3 inline-block text-[#0073b1] font-medium" href={app.resume_url} target="_blank" rel="noreferrer">View resume</a>
                                        ) : null}
                                    </div>

                                    <div className="mt-3 md:mt-0 md:ml-6 flex flex-col items-start md:items-end gap-2">
                                        <div className="text-sm text-gray-500">{new Date(app.created_at).toLocaleString()}</div>
                                        <div className="inline-flex items-center gap-2 flex-wrap text-sm">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${app.status === "shortlisted" ? "bg-green-100 text-green-800" : app.status === "rejected" ? "bg-red-100 text-red-800" : app.status === "reviewed" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
                                                {app.status}
                                            </span>
                                            {app.screening_status && app.screening_status !== "not_started" && (
                                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${app.screening_status === "passed" ? "bg-emerald-100 text-emerald-800" : app.screening_status === "failed" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-800"}`}>
                                                    {app.screening_status === "passed" ? "Passed AI" : app.screening_status === "failed" ? "Failed AI" : "AI In Progress"}
                                                </span>
                                            )}
                                            {app.interview_id ? (
                                                <span className="px-2 py-1 text-xs rounded-full font-medium bg-amber-100 text-amber-800">
                                                    Interview {app.interview_status || "scheduled"}
                                                </span>
                                            ) : app.screening_status === "passed" ? (
                                                <span className="px-2 py-1 text-xs rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                    Ready for scheduling
                                                </span>
                                            ) : null}
                                            {typeof app.screening_score === "number" && (
                                                <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-gray-50 text-gray-600">AI: {(app.screening_score * 10).toFixed(1)}%</span>
                                            )}
                                        </div>

                                        {viewMode === "all" && (
                                            <div className="flex items-center gap-2 flex-wrap pt-1 w-full md:w-auto md:justify-end text-sm">
                                                {app.screening_status === "passed" ? (
                                                    <>
                                                        <button onClick={() => updateStatus(app.application_id, "shortlisted")} className="px-3 py-1.5 bg-[#0073b1] text-white rounded-md hover:opacity-90 text-sm">Shortlist</button>
                                                        <button onClick={() => updateStatus(app.application_id, "reviewed")} className="px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:opacity-90 text-sm">Mark Reviewed</button>
                                                        <button onClick={() => updateStatus(app.application_id, "rejected")} className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:opacity-90 text-sm">Reject</button>
                                                        <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-full font-medium">
                                                            Passed AI — move to Passed AI tab
                                                        </span>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600">
                                                        <span className="text-xs text-gray-500">Failed AI screening</span>
                                                        {app.interview_id ? (
                                                            <span className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-full">Interview scheduled</span>
                                                        ) : null}
                                                        {app.status !== "pending" ? (
                                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${app.status === "rejected" ? "bg-red-100 text-red-700" : app.status === "reviewed" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                                                                {app.status === "rejected" ? "Manually rejected" : app.status === "reviewed" ? "Reviewed" : `Status: ${app.status}`}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {viewMode === "screened" && (
                                            <div className="flex items-center gap-2 flex-wrap pt-1 w-full md:w-auto md:justify-end">
                                                {app.interview_id ? (
                                                    <>
                                                        <button disabled className="px-3 py-1.5 bg-gray-200 text-gray-500 rounded-md cursor-not-allowed text-sm">
                                                            Scheduled
                                                        </button>
                                                        <div className="text-sm text-amber-700 bg-amber-100 px-3 py-1 rounded-full text-xs">
                                                            HR interview planned
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => openSchedule(app.application_id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:opacity-90 shadow-sm text-sm">
                                                            Schedule HR Interview
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showSchedule && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-emerald-100">
                        <h3 className="text-xl font-semibold mb-2 text-emerald-700">Schedule HR Interview</h3>
                        <p className="text-sm text-gray-600 mb-4">Only AI-passed candidates appear here. The interview duration is set automatically to 60 minutes.</p>
                        <div className="space-y-3">
                            <label className="block text-sm">Start</label>
                            <input type="datetime-local" value={startDt} onChange={(e) => setStartDt(e.target.value)} className="w-full border p-2 rounded" />
                            <label className="block text-sm">Type</label>
                            <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)} className="w-full border p-2 rounded">
                                <option value="virtual">Virtual</option>
                                <option value="onsite">Onsite</option>
                                <option value="phone">Phone</option>
                            </select>
                            <label className="block text-sm">Location / Link</label>
                            <p className="text-xs text-gray-500">Use this only for an onsite address or meeting link. Leave it blank for virtual interviews.</p>
                            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border p-2 rounded" />
                            <label className="block text-sm">Notes</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border p-2 rounded" />
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={closeSchedule} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                            <button onClick={submitSchedule} className="px-4 py-2 bg-emerald-600 text-white rounded">Schedule</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
