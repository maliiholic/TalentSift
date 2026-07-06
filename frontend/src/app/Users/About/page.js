"use client";

import React from "react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F4F2EE] text-gray-800 font-sans pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.05)] p-8 sm:p-12">
        <h1 className="text-3xl font-extrabold text-[#0073b1] tracking-tight mb-6">About TalentSift</h1>
        
        <p className="text-lg leading-relaxed text-gray-600 mb-6 font-light">
          TalentSift is a modern, AI-powered hiring platform designed to bridge the gap between candidate capability and recruiter intent. We focus on streamlining the initial hiring stages, eliminating noise, and providing opportunities for candidates to show their true potential.
        </p>

        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Our Vision</h2>
        <p className="text-sm leading-relaxed text-gray-600 mb-6">
          We believe in a recruitment process that is fair, fast, and transparent. By combining intelligent automated screening with robust candidate practice toolsets, we help candidates prepare for real-world interviews while empowering recruiters to focus on qualified individuals sooner.
        </p>

        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Core Offerings</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 mb-8 pl-2">
          <li><strong>AI Interview Practice:</strong> Unlimited, interactive mock interviews for candidates with actionable scoring.</li>
          <li><strong>Intelligent Screening:</strong> Automatic candidate evaluation and shortlisting based on role fit.</li>
          <li><strong>Organized Workflows:</strong> Centralized job postings, candidate submissions, and status tracking.</li>
        </ul>

        <div className="border-t border-gray-100 pt-8 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            Have questions? Contact us at{" "}
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
