"use client";
import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faRightLeft, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Image from "next/image";
import { Role_Action } from "@/Redux/Action";
import { API_BASE_URL } from "@/utils/api";

const storedToken = typeof window !== "undefined" ? localStorage.getItem("access") : null;
if (storedToken) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
}

const DEFAULT_IMAGE = "https://media.istockphoto.com/id/1300845620/vector/user-icon-flat-isolated-on-white-background-user-symbol-vector-illustration.jpg?s=612x612&w=0&k=20&c=yBeyba0hUkh14_jgv1OKqIH0CCSWU_4ckRkAoy2p73o=";

const ProfileLink = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const router = useRouter();
  const userRole = useSelector((state) => state.Role_Reducer);

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/get_picture/`, { withCredentials: true });
      setUserData(response.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
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
    try {
      setDropdownOpen(false);
      await axios.post(`${API_BASE_URL}/logout/`, {}, { withCredentials: true });
      localStorage.removeItem("access");
      delete axios.defaults.headers.common["Authorization"];
      await dispatch(Role_Action("Guest"));
      router.replace("/Users/Home");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const profileImageSrc = userData?.user_data?.profile_picture
    ? (() => {
      const rawSrc = userData.user_data.profile_picture.startsWith("http")
        ? userData.user_data.profile_picture
        : `${API_BASE_URL}${userData.user_data.profile_picture.startsWith("/") ? "" : "/"}${userData.user_data.profile_picture}`;

      return `${rawSrc}${rawSrc.includes("?") ? "&" : "?"}v=${profileRefreshKey}`;
    })()
    : DEFAULT_IMAGE;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-center rounded-full p-1.5 text-gray-600 transition duration-300 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0073b1]"
        aria-label="Profile Menu"
        aria-expanded={dropdownOpen}
      >
        <div className="relative h-10 w-10 md:h-11 md:w-11 lg:h-11 lg:w-11">
          <Image
            src={profileImageSrc}
            alt="Profile"
            fill
            className="rounded-full border-2 border-gray-200 object-cover"
          />
        </div>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5">
          <div className="border-b border-gray-200 px-4 py-3 bg-white">
            <span className="block truncate font-medium text-gray-800" title={userData?.user_data?.email || ""}>
              Hello, {userData?.user_data?.first_name || "User"}
            </span>
            <p className="truncate text-sm text-gray-500" title={userData?.user_data?.email || ""}>
              {userData?.user_data?.email}
            </p>
          </div>

          <button
            className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-gray-700 transition duration-200 hover:bg-gray-100 hover:text-gray-900"
            onClick={() => {
              setDropdownOpen(false);
              router.push("/Users/Profile");
            }}
          >
            <FontAwesomeIcon icon={faUser} />
            <span>View Profile</span>
          </button>

          {userRole === "Candidate" ? (
            <button
              className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-gray-700 transition duration-200 hover:bg-gray-100 hover:text-gray-900"
              onClick={switchToRecruiter}
            >
              <FontAwesomeIcon icon={faRightLeft} />
              <span>Switch to Recruiter</span>
            </button>
          ) : (
            <button
              className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-gray-700 transition duration-200 hover:bg-gray-100 hover:text-gray-900"
              onClick={switchToCandidate}
            >
              <FontAwesomeIcon icon={faRightLeft} />
              <span>Switch to Candidate</span>
            </button>
          )}

          <hr className="my-1 border-gray-200" />

          <button
            className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-gray-700 transition duration-200 hover:bg-red-50 hover:text-red-700"
            onClick={handleLogout}
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export { ProfileLink };
