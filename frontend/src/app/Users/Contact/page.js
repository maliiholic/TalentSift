"use client";

import React from "react";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#F4F2EE] text-gray-800 font-sans pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.05)] p-8 sm:p-12">
        <h1 className="text-3xl font-extrabold text-[#0073b1] tracking-tight mb-6">Contact Us</h1>
        
        <p className="text-lg leading-relaxed text-gray-600 mb-8 font-light">
          Have any questions, concerns, or feedback about TalentSift? We are here to support candidates and recruiters. Please reach out to us directly via email.
        </p>

        <div className="bg-[#F4F2EE]/50 border border-gray-100 rounded-xl p-6 mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Direct Contact Email</h2>
          <a href="mailto:arslanahmednaseem@gmail.com" className="text-xl font-bold text-[#0073b1] hover:underline break-all">
            arslanahmednaseem@gmail.com
          </a>
          <p className="text-xs text-gray-500 mt-2">Our support team usually responds within 24 hours.</p>
        </div>

        <div className="border-t border-gray-100 pt-8 flex justify-end">
          <Link href="/Users/Home" className="px-6 py-2 bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-[0_4px_12px_rgba(0,115,177,0.25)] transition duration-200">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
