"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import bgImage from "../../Photos/file.png";

export default function Footer() {
  const pathname = usePathname();

  if (pathname === "/Users/SignIn" || pathname === "/Users/SignUp") {
    return null;
  }

  return (
    <footer className="bg-gray-950 text-gray-400 py-10 border-t border-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          {/* Logo & Copyright */}
          <div className="flex flex-col items-center md:items-start space-y-2">
            <div className="flex items-center space-x-2.5">
              <Image src={bgImage} alt="Logo" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
              <span className="text-white font-extrabold text-base tracking-wider">TalentSift</span>
            </div>
            <p className="text-[11px] text-gray-650">
              © {new Date().getFullYear()} TalentSift. All rights reserved.
            </p>
          </div>
          {/* Horizontal Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
            <Link href="/Users/About" className="hover:text-[#0073b1] transition duration-200">About Us</Link>
            <Link href="/Users/Contact" className="hover:text-[#0073b1] transition duration-200">Contact Us</Link>
            <Link href="/Users/Privacy" className="hover:text-[#0073b1] transition duration-200">Privacy Policy</Link>
            <Link href="/Users/Terms" className="hover:text-[#0073b1] transition duration-200">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
