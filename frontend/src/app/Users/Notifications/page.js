"use client"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { show_search,search_bar_action } from "@/Redux/Action";
import { useDispatch, useSelector } from 'react-redux';
import { API_BASE_URL } from '@/utils/api';
import toast from 'react-hot-toast';
import { FaBell, FaBriefcase, FaFileAlt, FaCheckCircle, FaTrashAlt, FaRobot } from "react-icons/fa";

const openResumePreview = async (resumeUrl) => {
    if (!resumeUrl) return;

    if (resumeUrl.startsWith("blob:") || resumeUrl.startsWith("data:")) {
        window.open(resumeUrl, "_blank", "noopener,noreferrer");
        return;
    }

    window.open(resumeUrl, "_blank", "noopener,noreferrer");
};

const Notification = () => {
    const router = useRouter();
    const role = useSelector((state) => state.Role_Reducer);
    const dispatch = useDispatch();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [blockedInterviewId, setBlockedInterviewId] = useState(null);

    useEffect(() => {
        dispatch(show_search(false));
        dispatch(search_bar_action(""));
    }, [dispatch]);

    const dispatchUnreadUpdate = (items) => {
        const unread = items.filter((i) => !i.is_read).length;
        try {
            window.dispatchEvent(new CustomEvent('notificationsUpdated', { detail: { unread_count: unread } }));
        } catch (e) {
            // ignore in non-browser contexts
        }
    };

    useEffect(() => {
        let cancelled = false;

        const fetchNotifications = async () => {
            try {
                const mode = role === 'Recruiter' ? 'recruiter' : 'candidate';
                const response = await axios.get(`${API_BASE_URL}/notifications/`, {
                    params: { mode },
                    withCredentials: true,
                });
                if (cancelled) return;

                const items = response.data?.notifications || [];
                items.sort((a, b) => (a.is_read === b.is_read ? 0 : a.is_read ? 1 : -1));
                setNotifications(items);
                dispatchUnreadUpdate(items);
            } catch (err) {
                if (!cancelled) {
                    setError(err.response?.data?.error || "Failed to load notifications.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        if (role !== "Guest") {
            void fetchNotifications();
        } else {
            const guestLoadingTimer = setTimeout(() => {
                setLoading(false);
            }, 0);

            return () => {
                clearTimeout(guestLoadingTimer);
            };
        }

        return () => {
            cancelled = true;
        };
    }, [role]);

    const handleMarkRead = async (notificationId) => {
        try {
            await axios.patch(`${API_BASE_URL}/notifications/${notificationId}/read/`, {}, { withCredentials: true });
            setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item)));
            dispatchUnreadUpdate(
                notifications.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item))
            );
        } catch (err) {
            console.error("Failed to mark notification read:", err);
        }
    };

    const markAllRead = async () => {
        try {
            const res = await axios.post(`${API_BASE_URL}/notifications/mark-all-read/`, {}, { withCredentials: true });
            const updated = notifications.map((item) => ({ ...item, is_read: true }));
            setNotifications(updated);
            dispatchUnreadUpdate(updated);
            toast.success(res.data?.message || 'Marked all as read');
        } catch (err) {
            console.error('Failed to mark all read', err);
            toast.error('Failed to mark all read');
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            await axios.delete(`${API_BASE_URL}/notifications/${notificationId}/`, { withCredentials: true });
            const updated = notifications.filter((i) => i.id !== notificationId);
            setNotifications(updated);
            dispatchUnreadUpdate(updated);
            toast.success('Notification deleted');
        } catch (err) {
            console.error('Failed to delete notification', err);
            toast.error('Failed to delete notification');
        }
    };

    const handleTakeInterview = async (applicationId) => {
        try {
            const statusResponse = await axios.get(`${API_BASE_URL}/application/${applicationId}/interview-status/`, {
                withCredentials: true,
            });

            if (statusResponse.data?.status === 'passed' || statusResponse.data?.status === 'failed') {
                setBlockedInterviewId(applicationId);
                toast.info(
                    statusResponse.data?.status === 'passed'
                        ? `Interview already completed. Score: ${((statusResponse.data.screening_score || 0) * 10).toFixed(1)}%`
                        : `Interview already completed. Better luck next time. Score: ${((statusResponse.data.screening_score || 0) * 10).toFixed(1)}%`
                );
                return;
            }

            router.push(`/Users/Applications/${applicationId}/interview`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Unable to check interview status right now.');
        }
    };

    const handleOpenApplications = (jobId) => {
        if (!jobId) return;
        router.push(`/Users/Posts/applications/${jobId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ backgroundColor: "#F4F2EE" }}>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0073b1]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ backgroundColor: "#F4F2EE" }}>
                <div className="bg-red-50 text-red-700 p-4 rounded-xl shadow-sm max-w-md text-center font-semibold">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F4F2EE] pt-24 pb-16 px-4" style={{ backgroundColor: "#F4F2EE" }}>
            {/* Header Layout Outside Container */}
            <div className="max-w-4xl mx-auto mb-10 text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
                    <span className="bg-gradient-to-r from-[#0073b1] to-[#005582] text-transparent bg-clip-text">
                        Your Notifications
                    </span>
                </h1>
                {notifications.some(n => !n.is_read) && (
                    <div className="mt-4 flex justify-center">
                        <button 
                            onClick={markAllRead} 
                            className="px-4 py-2 border border-gray-200 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all text-sm font-semibold flex items-center gap-1.5 shadow-sm bg-white"
                        >
                            <FaCheckCircle className="w-4 h-4 text-emerald-500" />
                            Mark all as read
                        </button>
                    </div>
                )}
            </div>

            <div className="max-w-4xl mx-auto bg-white shadow-[0_4px_25px_rgba(0,0,0,0.03)] rounded-2xl p-4 sm:p-6 border border-gray-200/60">
                {/* Notifications List */}
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center max-w-sm mx-auto py-8">
                        <div className="bg-gray-100 text-gray-400 w-16 h-16 flex items-center justify-center rounded-full mb-5 shadow-inner">
                            <FaBell className="w-6 h-6 text-gray-300" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">All Clear!</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            You don&apos;t have any notifications right now. Check back later for updates on your applications.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`group relative rounded-xl border p-4 transition-all duration-300 ${
                                    notification.is_read 
                                        ? 'bg-white border-gray-150 shadow-[0_2px_15px_rgba(0,0,0,0.01)]' 
                                        : 'bg-[#0073b1]/[0.02] border-blue-200/80 shadow-[0_4px_20px_rgba(0,115,177,0.02)]'
                                }`}
                            >
                                {/* Top-right corner actions: Mark read + Delete */}
                                <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                                    {!notification.is_read && (
                                        <button
                                            onClick={() => handleMarkRead(notification.id)}
                                            className="text-xs font-bold text-[#0073b1] hover:underline px-1.5 py-1 rounded-lg hover:bg-blue-50 transition-all duration-200"
                                        >
                                            Mark read
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(notification.id)}
                                        className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all duration-200"
                                        title="Delete notification"
                                    >
                                        <FaTrashAlt className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="flex items-start gap-3.5 pr-20">
                                    {/* Icon Left */}
                                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                                        notification.is_read ? 'bg-gray-100 text-gray-500' : 'bg-[#0073b1]/10 text-[#0073b1]'
                                    }`}>
                                        {notification.title.includes("Interview") || notification.title.includes("screening") ? (
                                            <FaRobot className="w-4 h-4" />
                                        ) : notification.title.includes("Apply") || notification.title.includes("Application") ? (
                                            <FaFileAlt className="w-4 h-4" />
                                        ) : (
                                            <FaBriefcase className="w-4 h-4" />
                                        )}
                                    </div>

                                    {/* Text Body Content */}
                                    <div className="flex-1 min-w-0">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h2 className={`font-bold text-sm leading-tight ${notification.is_read ? 'text-gray-700' : 'text-gray-950'}`}>
                                                    {notification.title}
                                                </h2>
                                                {!notification.is_read && (
                                                    <span className="relative flex h-2 w-2 flex-shrink-0">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0073b1] opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0073b1]"></span>
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{notification.message}</p>
                                        </div>

                                        {/* Extra metadata blocks */}
                                        {(notification.job_name || notification.candidate_name || notification.cover_letter) && (
                                            <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs space-y-1 text-gray-600">
                                                {notification.job_name && (
                                                    <p><span className="font-semibold text-gray-900">Job:</span> {notification.job_name}</p>
                                                )}
                                                {notification.candidate_name && (
                                                    <p><span className="font-semibold text-gray-900">Candidate:</span> {notification.candidate_name} ({notification.candidate_email})</p>
                                                )}
                                                {notification.cover_letter && (
                                                    <p className="whitespace-pre-wrap mt-1 leading-relaxed"><span className="font-semibold text-gray-900">Cover Letter:</span> {notification.cover_letter}</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Compact inline row: Resume link + screening status + Open Applications */}
                                        {(notification.resume_url || notification.application_screening_status === 'passed' || blockedInterviewId === notification.application_id || (notification.application_screening_status === 'failed' && blockedInterviewId !== notification.application_id) || (role === 'Recruiter' && notification.job_id)) && (
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                {notification.resume_url && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => openResumePreview(notification.resume_url)} 
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-[#0073b1] hover:underline"
                                                    >
                                                        <FaFileAlt className="w-3 h-3 text-[#0073b1]/70" />
                                                        View Resume
                                                    </button>
                                                )}
                                                {(notification.application_screening_status === 'passed' || blockedInterviewId === notification.application_id) && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-100">
                                                        <FaCheckCircle className="w-3 h-3" />
                                                        Passed ({notification.application_screening_score ? `${(notification.application_screening_score * 10).toFixed(1)}%` : 'N/A'})
                                                    </span>
                                                )}
                                                {notification.application_screening_status === 'failed' && blockedInterviewId !== notification.application_id && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 text-xs font-semibold rounded-md border border-rose-100">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Not Passed ({notification.application_screening_score ? `${(notification.application_screening_score * 10).toFixed(1)}%` : 'N/A'})
                                                    </span>
                                                )}
                                                {role === 'Recruiter' && notification.job_id && (
                                                    <button
                                                        onClick={() => handleOpenApplications(notification.job_id)}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 border border-[#0073b1] text-[#0073b1] rounded-md text-xs font-bold hover:bg-[#0073b1] hover:text-white transition duration-200"
                                                    >
                                                        Open Applications
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Candidate Interview CTA */}
                                        {role === 'Candidate' && notification.application_id &&
                                            /Application submitted|AI screening|interview/i.test(notification.title + ' ' + notification.message) &&
                                            notification.application_screening_status !== 'passed' &&
                                            notification.application_screening_status !== 'failed' && blockedInterviewId !== notification.application_id && (
                                            <div className="mt-2">
                                                <button
                                                    onClick={() => handleTakeInterview(notification.application_id)}
                                                    className="px-4 py-2 bg-gradient-to-r from-[#0073b1] to-[#005582] text-white rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition duration-200 active:scale-[0.98]"
                                                >
                                                    Take AI Interview Now
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notification;