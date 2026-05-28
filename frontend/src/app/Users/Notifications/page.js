"use client"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { show_search,search_bar_action } from "@/Redux/Action";
import { useDispatch, useSelector } from 'react-redux';
import { API_BASE_URL } from '@/utils/api';
import toast from 'react-hot-toast';

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
                const response = await axios.get(`${API_BASE_URL}/notifications/`, {
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
        return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading notifications...</div>;
    }

    if (error) {
        return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
    }

    return (
        <div className="min-h-screen bg-[#F4F2EE] py-16 px-4">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-[#0073b1] mb-6">Notifications</h1>
                    <div className="flex items-center gap-2">
                        {notifications.some(n => !n.is_read) && (
                            <button onClick={markAllRead} className="px-3 py-1.5 bg-[#0073b1] text-white rounded text-sm">Mark all read</button>
                        )}
                    </div>
                </div>
                        {notifications.length === 0 ? (
                    <p className="text-gray-600">No notifications yet.</p>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`rounded-lg border p-3 transition ${notification.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="font-semibold text-base text-gray-800">{notification.title}</h2>
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                                        {notification.job_name && (
                                            <p className="text-xs text-gray-500 mt-2">Job: {notification.job_name}</p>
                                        )}
                                        {notification.candidate_name && (
                                            <p className="text-xs text-gray-500">Candidate: {notification.candidate_name} ({notification.candidate_email})</p>
                                        )}
                                        {notification.cover_letter && (
                                            <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">Cover Letter: {notification.cover_letter}</p>
                                        )}
                                        {notification.resume_url && (
                                            <a href={notification.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-2 text-sm text-[#0073b1] hover:underline">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                <span className="hidden sm:inline">View Resume</span>
                                            </a>
                                        )}

                                        {role === 'Recruiter' && notification.job_id && (
                                            <div className="mt-3">
                                                <button
                                                    onClick={() => handleOpenApplications(notification.job_id)}
                                                    className="px-3 py-2 border border-[#0073b1] text-[#0073b1] rounded text-sm hover:bg-[#0073b1] hover:text-white transition"
                                                >
                                                    Open applications
                                                </button>
                                            </div>
                                        )}

                                        {/* Candidate CTA: take interview now/later */}
                                        {role === 'Candidate' && notification.application_id &&
                                            /Application submitted|AI screening|interview/i.test(notification.title + ' ' + notification.message) &&
                                            notification.application_screening_status !== 'passed' &&
                                            notification.application_screening_status !== 'failed' && blockedInterviewId !== notification.application_id && (
                                            <div className="mt-3">
                                                <button
                                                    onClick={() => handleTakeInterview(notification.application_id)}
                                                    className="px-3 py-2 bg-[#0073b1] text-white rounded text-sm"
                                                >
                                                    Take AI Interview
                                                </button>
                                            </div>
                                        )}

                                        {(notification.application_screening_status === 'passed' || blockedInterviewId === notification.application_id) && (
                                            <p className="mt-3 text-sm text-green-600 font-medium">
                                                Interview completed: passed. Score: {notification.application_screening_score ? `${(notification.application_screening_score * 10).toFixed(1)}%` : 'N/A'}
                                            </p>
                                        )}
                                        {notification.application_screening_status === 'failed' && blockedInterviewId !== notification.application_id && (
                                            <p className="mt-3 text-sm text-red-600 font-medium">
                                                Interview completed: not passed. Better luck next time. Score: {notification.application_screening_score ? `${(notification.application_screening_score * 10).toFixed(1)}%` : 'N/A'}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${notification.is_read ? 'bg-gray-200 text-gray-600' : 'bg-blue-600 text-white'}`}>
                                            {notification.is_read ? 'Read' : 'Unread'}
                                        </span>
                                        {!notification.is_read && (
                                            <button
                                                onClick={() => handleMarkRead(notification.id)}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                Mark
                                            </button>
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