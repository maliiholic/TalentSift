"use client";

import React from "react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F4F2EE] text-gray-800 font-sans pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.05)] p-8 sm:p-12">
        <h1 className="text-3xl font-extrabold text-[#0073b1] tracking-tight mb-6">Terms of Service</h1>
        <p className="text-xs text-gray-500 mb-6">Last Updated: July 2026</p>

        <p className="text-sm leading-relaxed text-gray-600 mb-6">
          Welcome to TalentSift. By accessing or using our platform, you agree to comply with and be bound by the following Terms of Service. If you do not agree to these terms, please do not use our services.
        </p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">1. Account Creation & Security</h2>
        <p className="text-sm leading-relaxed text-gray-600 mb-4">
          Users must register an account (either as a Candidate or a Recruiter) to access platform services. You are responsible for keeping your account login details secure.
        </p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">2. User Conduct & Content</h2>
        <p className="text-sm leading-relaxed text-gray-600 mb-4">
          Candidates must submit accurate application details and complete mock interviews in good faith. Recruiters must post valid job listings and comply with all applicable employment and non-discrimination laws.
        </p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">3. AI-Powered Evaluation Disclaimer</h2>
        <p className="text-sm leading-relaxed text-gray-600 mb-4">
          TalentSift utilizes AI algorithms to generate mock interview scores and candidate summaries. These insights are intended to assist the hiring process and do not constitute final employment decisions.
        </p>

        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">4. Limitation of Liability</h2>
        <p className="text-sm leading-relaxed text-gray-600 mb-6">
          TalentSift is provided on an "as-is" basis. We are not liable for any direct or indirect damages resulting from your use of the platform, job placements, or hiring evaluations.
        </p>

        <div className="border-t border-gray-100 pt-8 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            For questions regarding these terms, contact{" "}
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
