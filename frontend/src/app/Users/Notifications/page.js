"use client"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { show_search,search_bar_action } from "@/Redux/Action";
import { useDispatch, useSelector } from 'react-redux';
import { API_BASE_URL } from '@/utils/api';

const Notification = () => {
    const role = useSelector((state) => state.Role_Reducer);
    const dispatch = useDispatch();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        dispatch(show_search(false));
        dispatch(search_bar_action(""));
    }, [dispatch]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/notifications/`, {
                    withCredentials: true,
                });
                setNotifications(response.data?.notifications || []);
            } catch (err) {
                setError(err.response?.data?.error || "Failed to load notifications.");
            } finally {
                setLoading(false);
            }
        };

        if (role !== "Guest") {
            fetchNotifications();
        } else {
            setLoading(false);
        }
    }, [role]);

    const markRead = async (notificationId) => {
        try {
            await axios.patch(`${API_BASE_URL}/notifications/${notificationId}/read/`, {}, { withCredentials: true });
            setNotifications((prev) => prev.map((item) => item.id === notificationId ? { ...item, is_read: true } : item));
        } catch (err) {
            console.error("Failed to mark notification read:", err);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading notifications...</div>;
    }

    if (error) {
        return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
    }

    return (
        <div className="min-h-screen bg-[#F4F2EE] py-16 px-4">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h1 className="text-3xl font-bold text-[#0073b1] mb-6">Notifications</h1>
                {notifications.length === 0 ? (
                    <p className="text-gray-600">No notifications yet.</p>
                ) : (
                    <div className="space-y-4">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`rounded-lg border p-4 transition ${notification.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="font-semibold text-gray-800">{notification.title}</h2>
                                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
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
                                            <a
                                                href={notification.resume_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-block mt-2 text-sm text-blue-600 underline"
                                            >
                                                View Resume
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${notification.is_read ? 'bg-gray-200 text-gray-600' : 'bg-blue-600 text-white'}`}>
                                            {notification.is_read ? 'Read' : 'Unread'}
                                        </span>
                                        {!notification.is_read && (
                                            <button
                                                onClick={() => markRead(notification.id)}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                Mark as read
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