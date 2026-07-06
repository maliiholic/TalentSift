"use client";

import { API_BASE_URL } from "@/utils/api";
import CountUp from "react-countup";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";
import { FaRobot, FaUsers, FaAdjust } from "react-icons/fa";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
} from "chart.js";
import { AiOutlineDollarCircle } from "react-icons/ai";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase } from "@fortawesome/free-solid-svg-icons";
import { BsRobot } from "react-icons/bs";
import React, { useState, useEffect } from "react";
import axios from "axios";

// Registering Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend
);

const Dashboard = () => {
    const [dashboardStats, setDashboardStats] = useState(null); // To store fetched data

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/dashboard/`, { withCredentials: true });
                const data = await response.data;
                setDashboardStats(data); // Store fetched data in state
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, []); // Empty dependency array ensures the data is fetched only once when the component mounts

    const lineChartData = {
        labels: dashboardStats?.Jobs_post?.map((item) => item.day) || [], // Defaults to an empty array
        datasets: [
            {
                label: "Job Posts Per Day",
                data: dashboardStats?.Jobs_post?.map((item) => item.count) || [], // Default to an empty array if no data
                borderColor: "#0099FF",
                backgroundColor: "rgba(0, 153, 255, 0.2)",
                tension: 0.4,
            },
        ],
    };

    const barChartData = {
        labels: dashboardStats?.jobs_by_category.map((item) => item.skills) || [],
        datasets: [
            {
                label: "Job Posts by Category",
                data: dashboardStats?.jobs_by_category.map((item) => item.count) || [],
                backgroundColor: "rgba(54, 162, 235, 0.7)",
            },
        ],
    };

    const pieChartData = {
        labels: dashboardStats?.jobs_by_workplace?.map((item) => item.workplace_type) || [],
        datasets: [
            {
                data: dashboardStats?.jobs_by_workplace?.map((item) => {
                    const total = dashboardStats?.jobs_by_workplace.reduce((acc, curr) => acc + curr.count, 0);
                    return parseFloat(((item.count / total) * 100).toFixed(2)); // Round off to 2 decimal places
                }) || [],
                backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
            },
        ],
    };

    const doughnutChartData = {
        labels: dashboardStats?.jobs_by_preference.map((item) => item.employment_type) || [],
        datasets: [
            {
                data: dashboardStats?.jobs_by_preference.map((item) => {
                    const total = dashboardStats?.jobs_by_preference.reduce((acc, curr) => acc + curr.count, 0);
                    return parseFloat(((item.count / total) * 100).toFixed(2)); // Round off to 2 decimal places
                }) || [],
                backgroundColor: ["#FF5733", "#33FF57", "#3357FF"],
            },
        ],
    };

    const subscriptionData = [
        { type: "Users", count: dashboardStats?.user_count || 0, bgColor: "purple", Icon: FaUsers },
        { type: "Profit", count: dashboardStats?.total_net_profit || 0, bgColor: "green", Icon: AiOutlineDollarCircle },
        { type: "Jobs", count: dashboardStats?.total_jobs || 0, bgColor: "blue", Icon: FaAdjust },
        { type: "Subscription", count: dashboardStats?.total_subscriptions || 0, bgColor: "green", Icon: BsRobot },
    ];

    return (
        <div className="space-y-6 text-slate-800">
            {/* Header Section */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-extrabold text-[#0073b1] tracking-tight">Platform Analytics</h1>
                <p className="text-sm text-gray-500">Real-time platform activity, job listings, and billing distribution.</p>
            </div>

            {/* Combined Analytics Dashboard Container */}
            <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
                {/* Section 1: Stats Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-gray-100">
                    {subscriptionData.map((sub, index) => (
                        <div key={index} className="p-6 flex flex-col justify-center space-y-1">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                                {sub.type === "Profit" ? "Net Profit" : sub.type === "Subscription" ? "Premium Subs" : sub.type}
                            </span>
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                                {sub.type === "Profit" && "$"}
                                <CountUp
                                    start={0}
                                    end={sub.count}
                                    duration={1.5}
                                    separator=","
                                />
                            </h3>
                        </div>
                    ))}
                </div>

                {/* Section 2: Primary Timelines */}
                <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-base font-bold text-gray-950">Job Posts Timeline</h3>
                            <p className="text-xs text-gray-400">Total job listings created per day.</p>
                        </div>
                        <div className="pt-2">
                            <Line data={lineChartData} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-base font-bold text-gray-950">Category Distribution</h3>
                            <p className="text-xs text-gray-400">Job listings grouped by required primary skills.</p>
                        </div>
                        <div className="pt-2">
                            <Bar data={barChartData} />
                        </div>
                    </div>
                </div>

                {/* Section 3: Ratio Distributions */}
                <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-base font-bold text-gray-950">Workplace Types</h3>
                            <p className="text-xs text-gray-400">Ratio of remote, hybrid, and on-site listings.</p>
                        </div>
                        <div className="w-full h-64 relative pt-2">
                            <Pie
                                data={pieChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        tooltip: {
                                            callbacks: {
                                                label: (tooltipItem) =>
                                                    ` ${tooltipItem.label}: ${tooltipItem.raw}%`,
                                            },
                                        },
                                        legend: {
                                            position: "right",
                                            labels: {
                                                boxWidth: 12,
                                                padding: 15,
                                                font: {
                                                    size: 11,
                                                    weight: 'bold'
                                                },
                                            },
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-base font-bold text-gray-950">Employment Preferences</h3>
                            <p className="text-xs text-gray-400">Ratio of full-time, contract, and internship posts.</p>
                        </div>
                        <div className="w-full h-64 relative pt-2">
                            <Doughnut
                                data={doughnutChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        tooltip: {
                                            callbacks: {
                                                label: (tooltipItem) =>
                                                    ` ${tooltipItem.label}: ${tooltipItem.raw}%`,
                                            },
                                        },
                                        legend: {
                                            position: "right",
                                            labels: {
                                                boxWidth: 12,
                                                padding: 15,
                                                font: {
                                                    size: 11,
                                                    weight: 'bold'
                                                },
                                            },
                                        },
                                    },
                                }}
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
};

export default Dashboard;
