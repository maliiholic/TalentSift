"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F4F2EE] text-gray-800 font-sans pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.05)] p-8 sm:p-12">
        <h1 className="text-3xl font-extrabold text-[#0073b1] tracking-tight mb-6">Privacy Policy</h1>
        <p className="text-xs text-gray-500 mb-6">Last Updated: July 2026</p>

        <p className="text-sm leading-relaxed text-gray-600 mb-6">
          At TalentSift, we value and respect your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our platform for hiring or mock interview practice.
        </p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">1. Information We Collect</h2>
        <p className="text-sm leading-relaxed text-gray-600 mb-4">
          We collect account details (name, email, profile picture) during sign-up. For candidates, we store application history and mock interview answers. For recruiters, we store job postings and workflow preferences.
        </p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">2. Cookies & Local Storage</h2>
        <p className="text-sm leading-relaxed text-gray-600 mb-4">
          We utilize essential session tokens and cookies (for CSRF protection and authentication) to secure your logins and transactions. We do not track you across third-party websites.
        </p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">3. How We Use Data</h2>
        <p className="text-sm leading-relaxed text-gray-600 mb-4">
          Your data is used solely to facilitate the platform's core functionalities—running mock interviews, presenting candidate summaries to recruiters, and sending system notifications.
        </p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">4. Information Security</h2>
        <p className="text-sm leading-relaxed text-gray-600 mb-6">
          All data is protected using standard encryption protocols. We do not sell or trade your personal information to external marketers.
        </p>

        <div className="border-t border-gray-100 pt-8 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            For privacy inquiries, contact{" "}
            <a href="mailto:arslanahmednaseem@gmail.com" className="text-[#0073b1] hover:underline font-semibold">
              arslanahmednaseem@gmail.com
            </a>
          </p>
          <Link href="/Users/Home" className="px-6 py-2 bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-[0_4px_12px_rgba(0,115,177,0.25)] transition duration-200">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
