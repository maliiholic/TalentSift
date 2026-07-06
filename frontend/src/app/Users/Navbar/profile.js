"use client";
import React, { useEffect, useRef, useState } from "react";
import { FaUser, FaExchangeAlt, FaSignOutAlt, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Image from "next/image";
import { Role_Action } from "@/Redux/Action";
import { performLogout } from "@/utils/logout";
import toast from "react-hot-toast";

import { API_BASE_URL as API_BASE } from "@/utils/api";

const DEFAULT_IMAGE = "https://media.istockphoto.com/id/1300845620/vector/user-icon-flat-isolated-on-white-background-user-symbol-vector-illustration.jpg?s=612x612&w=0&k=20&c=yBeyba0hUkh14_jgv1OKqIH0CCSWU_4ckRkAoy2p73o=";

const ProfileLink = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const router = useRouter();
  const userRole = useSelector((state) => state.Role_Reducer);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[a-zA-Z]).{8,}$/;

    if (!newPassword) {
      setPasswordError("Please enter a new password.");
      return;
    }

    if (!passwordRegex.test(newPassword)) {
      setPasswordError(
        "Password must contain at least one uppercase letter, one special character, and be at least 8 characters long."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      await axios.post(`${API_BASE}/reset_password/`, {
        email: userData?.user_data?.email,
        newPassword,
      });
      toast.success("Password changed successfully!");
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(error.response?.data?.error || "Error resetting password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadUserData = async () => {
      try {
        const response = await axios.get(`${API_BASE}/get_picture/`, { withCredentials: true });
        if (!cancelled) {
          setUserData(response.data);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    void loadUserData();

    return () => {
      cancelled = true;
    };
  }, [profileRefreshKey]);

  useEffect(() => {
    const handleProfileUpdated = () => {
      setProfileRefreshKey((prev) => prev + 1);
    };

    window.addEventListener("profileUpdated", handleProfileUpdated);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdated);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const switchToRecruiter = async () => {
    setDropdownOpen(false);
    await dispatch(Role_Action("Recruiter"));
    router.push("/Users/Home");
  };

  const switchToCandidate = async () => {
    setDropdownOpen(false);
    await dispatch(Role_Action("Candidate"));
    router.push("/Users/Home");
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await performLogout(dispatch, router.replace);
  };

  const profileImageSrc = userData?.user_data?.profile_picture
    ? (() => {
      const rawSrc = userData.user_data.profile_picture.startsWith("http")
        ? userData.user_data.profile_picture
        : `${API_BASE}${userData.user_data.profile_picture.startsWith("/") ? "" : "/"}${userData.user_data.profile_picture}`;

      return `${rawSrc}${rawSrc.includes("?") ? "&" : "?"}v=${profileRefreshKey}`;
    })()
    : DEFAULT_IMAGE;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-center rounded-full p-0.5 border border-transparent hover:border-gray-200 transition duration-300 focus:outline-none"
        aria-label="Profile Menu"
        aria-expanded={dropdownOpen}
      >
        <div className="relative h-9 w-9 md:h-10 md:w-10">
          <Image
            src={profileImageSrc}
            alt="Profile"
            fill
            className="rounded-full border-2 border-white shadow-sm object-cover"
            unoptimized
          />
        </div>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5 animate-fade-in z-50">
          {/* User Profile Header details */}
          <div className="border-b border-gray-50 px-4 py-4 bg-gray-50/40 flex items-center gap-3">
            <div className="relative h-12 w-12 flex-shrink-0">
              <Image
                src={profileImageSrc}
                alt="Profile"
                fill
                className="rounded-full border-2 border-white shadow-sm object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-bold text-gray-800 text-sm">
                {userData?.user_data?.first_name || "User"}
              </span>
              <p className="truncate text-xs text-gray-400 mb-1" title={userData?.user_data?.email || ""}>
                {userData?.user_data?.email}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#0073b1]/10 text-[#0073b1]">
                {userRole}
              </span>
            </div>
          </div>

          <div className="p-1.5 space-y-0.5">
            <button
              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm font-semibold text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.99]"
              onClick={() => {
                setDropdownOpen(false);
                router.push("/Users/Profile");
              }}
            >
              <FaUser className="w-3.5 h-3.5 text-gray-400" />
              <span>View Profile</span>
            </button>

            {userRole === "Candidate" ? (
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm font-semibold text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.99]"
                onClick={switchToRecruiter}
              >
                <FaExchangeAlt className="w-3.5 h-3.5 text-gray-400" />
                <span>Switch to Recruiter</span>
              </button>
            ) : (
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm font-semibold text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.99]"
                onClick={switchToCandidate}
              >
                <FaExchangeAlt className="w-3.5 h-3.5 text-gray-400" />
                <span>Switch to Candidate</span>
              </button>
            )}

            <button
              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm font-semibold text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-gray-900 active:scale-[0.99]"
              onClick={() => {
                setDropdownOpen(false);
                setShowPasswordModal(true);
              }}
            >
              <FaLock className="w-3.5 h-3.5 text-gray-400" />
              <span>Change Password</span>
            </button>

            <div className="h-px bg-gray-100 my-1 mx-1" />

            <button
              className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm font-semibold text-rose-600 transition-all duration-150 hover:bg-rose-50 hover:text-rose-700 active:scale-[0.99]"
              onClick={handleLogout}
            >
              <FaSignOutAlt className="w-3.5 h-3.5 text-rose-400" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-2xl mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaLock className="text-[#0073b1] w-4 h-4" /> Change Password
            </h3>
            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showNewPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <p className="text-xs text-rose-500 font-semibold bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                  {passwordError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0073b1] to-[#005582] rounded-xl shadow-sm hover:opacity-95 active:scale-[0.98] transition duration-200 flex items-center justify-center gap-1.5 min-w-[80px]"
                >
                  {passwordLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export { ProfileLink };
