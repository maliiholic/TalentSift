"use client";
import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faRightLeft, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Image from "next/image";
import { Role_Action } from "@/Redux/Action";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const storedToken = typeof window !== "undefined" ? localStorage.getItem("access") : null;
if (storedToken) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
}

const DEFAULT_IMAGE = "https://media.istockphoto.com/id/1300845620/vector/user-icon-flat-isolated-on-white-background-user-symbol-vector-illustration.jpg?s=612x612&w=0&k=20&c=yBeyba0hUkh14_jgv1OKqIH0CCSWU_4ckRkAoy2p73o=";

const ProfileLink = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const router = useRouter();
  const userRole = useSelector((state) => state.Role_Reducer);

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${API_BASE}/get_picture/`, { withCredentials: true });
        setUserData(response.data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
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
      await axios.post(`${API_BASE}/logout/`, {}, { withCredentials: true });
      localStorage.removeItem("access");
      delete axios.defaults.headers.common["Authorization"];
      await dispatch(Role_Action("Guest"));
      router.replace("/Users/Home");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const profileImageSrc = userData?.user_data?.profile_picture
    ? userData.user_data.profile_picture.startsWith("http")
      ? userData.user_data.profile_picture
      : `${API_BASE}${userData.user_data.profile_picture.startsWith("/") ? "" : "/"}${userData.user_data.profile_picture}`
    : DEFAULT_IMAGE;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 rounded-lg p-2 text-gray-300 transition duration-300 hover:bg-gray-200 hover:text-white"
        aria-label="Profile Menu"
        aria-expanded={dropdownOpen}
      >
        <div className="relative h-10 w-10 md:h-12 md:w-12 lg:h-12 lg:w-12">
          <Image
            src={profileImageSrc}
            alt="Profile"
            fill
            className="rounded-full border-2 border-gray-300 object-cover"
          />
        </div>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl bg-gray-800 shadow-xl ring-1 ring-black/10">
          <div className="border-b border-gray-700 px-4 py-3">
            <span className="block truncate font-medium text-white" title={userData?.user_data?.email || ""}>
              Hello, {userData?.user_data?.first_name || "User"}
            </span>
            <p className="truncate text-sm text-gray-400" title={userData?.user_data?.email || ""}>
              {userData?.user_data?.email}
            </p>
          </div>

          <button
            className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-gray-300 transition duration-200 hover:bg-gray-700 hover:text-white"
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
              className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-gray-300 transition duration-200 hover:bg-gray-700 hover:text-white"
              onClick={switchToRecruiter}
            >
              <FontAwesomeIcon icon={faRightLeft} />
              <span>Switch to Recruiter</span>
            </button>
          ) : (
            <button
              className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-gray-300 transition duration-200 hover:bg-gray-700 hover:text-white"
              onClick={switchToCandidate}
            >
              <FontAwesomeIcon icon={faRightLeft} />
              <span>Switch to Candidate</span>
            </button>
          )}

          <hr className="my-1 border-gray-700" />

          <button
            className="flex w-full items-center space-x-2 px-4 py-2.5 text-left text-gray-300 transition duration-200 hover:bg-red-600 hover:text-white"
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
