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
                setApplications((res.data.screened_applications || []).map((x) => ({
                    ...x,
                    created_at: x.applied_at,
                })));
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

        const matchesViewMode =
            viewMode === "all" ||
            (viewMode === "screened" && app.screening_status === "passed");

        const matchesSchedule =
            scheduleFilter === "all" ||
            (scheduleFilter === "scheduled" && !!app.interview_id) ||
            (scheduleFilter === "unscheduled" && !app.interview_id);

        return matchesSearch && matchesStage && matchesSchedule && matchesViewMode;
    });

    const totalPassed = applications.filter((app) => app.screening_status === "passed").length;
    const totalScheduled = applications.filter((app) => !!app.interview_id).length;
    const totalFailed = applications.filter((app) => app.screening_status === "failed").length;

    const formatInterviewTime = (start, end) => {
        if (!start) return "";
        const startText = new Date(start).toLocaleString();
        if (!end) return startText;
        return `${startText} - ${new Date(end).toLocaleString()}`;
    };

    const getInterviewTypeLabel = (type) => {
        if (!type) return "";
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const getTimelineSteps = (app) => {
        const steps = [{ label: "Applied", active: true }];

        if (app.screening_status === "passed") {
            steps.push({ label: "Screened", active: true });
        } else if (app.screening_status === "failed") {
            steps.push({ label: "Screened", active: false });
        } else {
            steps.push({ label: "Screened", active: false });
        }

        steps.push({
            label: app.interview_id ? "Scheduled" : app.status === "rejected" ? "Closed" : "Interview",
            active: !!app.interview_id || app.status === "shortlisted" || app.status === "reviewed",
        });

        return steps;
    };

    if (loading) return <Loader />;

    return (
        <>
            <div className="min-h-screen" style={{ backgroundColor: "#F4F2EE", paddingTop: "4rem" }}>
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h2 className="text-3xl font-extrabold text-[#0073b1] tracking-tight">
                                    {viewMode === "screened" ? "Screened Candidates" : "Applications"}
                                </h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    {viewMode === "screened"
                                        ? "These candidates cleared the AI screen and can be moved to HR scheduling."
                                        : "Review every applicant, then switch to Screened for quick filtering."}
                                </p>
                                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-sm text-gray-700">
                                    <span className="font-medium text-gray-500">Role</span>
                                    <span className="font-semibold text-gray-900">{jobName || "Job application"}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={() => setViewMode("all")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${viewMode === "all" ? "bg-[#0073b1] text-white" : "bg-gray-100 text-gray-700"}`}>All</button>
                                <button onClick={() => setViewMode("screened")} className={`px-3 py-1.5 rounded-full text-sm font-medium ${viewMode === "screened" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"}`}>Screened</button>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-4">
                            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
                                <div className="text-xs uppercase tracking-wide text-blue-700">Total</div>
                                <div className="mt-1 text-xl font-bold text-blue-900">{applications.length}</div>
                            </div>
                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                                <div className="text-xs uppercase tracking-wide text-emerald-700">Screened</div>
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
                                    All screened
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

                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                            {getTimelineSteps(app).map((step, index) => (
                                                <React.Fragment key={`${app.application_id}-${step.label}`}>
                                                    <span className={`px-2.5 py-1 rounded-full border font-medium ${step.active ? "bg-[#0073b1] text-white border-[#0073b1]" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                                                        {step.label}
                                                    </span>
                                                    {index < getTimelineSteps(app).length - 1 ? <span className="text-gray-300">→</span> : null}
                                                </React.Fragment>
                                            ))}
                                        </div>

                                        {app.cover_letter ? <p className="mt-1 text-sm text-gray-700 line-clamp-2">{app.cover_letter}</p> : null}

                                        {app.resume_url ? (
                                            <a className="mt-3 inline-block text-[#0073b1] font-medium" href={app.resume_url} target="_blank" rel="noreferrer">View resume</a>
                                        ) : null}
                                    </div>

                                    <div className="mt-3 md:mt-0 md:ml-6 flex flex-col items-start md:items-end gap-2">
                                        <div className="text-sm text-gray-500">{new Date(app.created_at).toLocaleString()}</div>
                                        <div className="inline-flex items-center gap-2 flex-wrap text-sm">
                                            {app.screening_status && app.screening_status !== "not_started" && (
                                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${app.screening_status === "passed" ? "bg-emerald-100 text-emerald-800" : app.screening_status === "failed" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-800"}`}>
                                                    {app.screening_status === "passed" && typeof app.screening_score === "number"
                                                        ? `AI passed · ${(app.screening_score * 10).toFixed(1)}%`
                                                        : app.screening_status === "failed" && typeof app.screening_score === "number"
                                                            ? `AI failed · ${(app.screening_score * 10).toFixed(1)}%`
                                                            : app.screening_status === "passed"
                                                                ? "AI passed"
                                                                : app.screening_status === "failed"
                                                                    ? "AI failed"
                                                                    : "AI in progress"}
                                                </span>
                                            )}
                                            {app.status && app.status !== "pending" && (
                                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${app.status === "shortlisted" ? "bg-green-100 text-green-800" : app.status === "rejected" ? "bg-red-100 text-red-800" : app.status === "reviewed" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
                                                    {app.status === "rejected" ? "Rejected" : app.status === "reviewed" ? "Reviewed" : app.status === "shortlisted" ? "Shortlisted" : app.status}
                                                </span>
                                            )}
                                            {app.interview_id ? (
                                                <span className="px-2 py-1 text-xs rounded-full font-medium bg-amber-100 text-amber-800">
                                                    Interview scheduled
                                                </span>
                                            ) : app.screening_status === "passed" ? (
                                                <span className="px-2 py-1 text-xs rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                    Ready for scheduling
                                                </span>
                                            ) : null}
                                        </div>

                                        {app.interview_id ? (
                                            <div className="mt-2 text-sm text-gray-600 grid gap-1">
                                                <div><span className="font-medium text-gray-700">Interview time:</span> {formatInterviewTime(app.interview_start, app.interview_end)}</div>
                                                {app.interview_type ? <div><span className="font-medium text-gray-700">Interview type:</span> {getInterviewTypeLabel(app.interview_type)}</div> : null}
                                                {app.scheduled_by_name ? <div><span className="font-medium text-gray-700">Scheduled by:</span> {app.scheduled_by_name}</div> : null}
                                                {app.interview_location ? <div className="text-xs text-gray-500">Location / link: {app.interview_location}</div> : null}
                                            </div>
                                        ) : null}

                                        {viewMode === "all" && (
                                            <div className="flex items-center gap-2 flex-wrap pt-1 w-full md:w-auto md:justify-end text-sm">
                                                {app.screening_status === "passed" ? (
                                                    <>
                                                        <button onClick={() => updateStatus(app.application_id, "shortlisted")} className="px-3 py-1.5 bg-[#0073b1] text-white rounded-md hover:opacity-90 text-sm">Shortlist</button>
                                                        <button onClick={() => updateStatus(app.application_id, "reviewed")} className="px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:opacity-90 text-sm">Mark Reviewed</button>
                                                        <button onClick={() => updateStatus(app.application_id, "rejected")} className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:opacity-90 text-sm">Reject</button>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600">
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
                                                            {formatInterviewTime(app.interview_start, app.interview_end)}
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
