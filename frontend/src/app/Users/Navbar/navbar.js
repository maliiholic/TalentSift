"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faBriefcase,
  faBell,
  faUserGraduate,
  faSearch,
  faUser,
  faRightLeft,
  faSignOutAlt,
  faSignInAlt,
} from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
// globals.css imported in root layout
import { Role_Action } from "@/Redux/Action";
import { API_BASE_URL } from "@/utils/api";

import { ProfileLink } from "./profile";
import { SearchBar } from "./search";
import bgImage from "../../Photos/file.png";
import Image from "next/image";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const router = useRouter();
  const dispatch = useDispatch();
  const userRole = useSelector((state) => state.Role_Reducer);

  const toggleMenu = () => setIsOpen((prev) => !prev);

  const handleSignInRedirect = () => {
    router.push("/Users/SignIn");
  };

  const switchToRecruiter = async () => {
    await dispatch(Role_Action("Recruiter"));
    router.push("/Users/Home");
  };

  const switchToCandidate = async () => {
    await dispatch(Role_Action("Candidate"));
    router.push("/Users/Home");
  };

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (userRole === "Guest") {
        setNotificationCount(0);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/notifications/`, { withCredentials: true });
        setNotificationCount(response.data?.unread_count || 0);
      } catch (error) {
        setNotificationCount(0);
      }
    };

    fetchUnreadCount();
    // listen for updates from notifications page
    const handler = (e) => {
      try {
        const c = e?.detail?.unread_count ?? 0;
        setNotificationCount(c);
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('notificationsUpdated', handler);
    return () => window.removeEventListener('notificationsUpdated', handler);
  }, [userRole]);

  return (
    <nav className="bg-[#FFFFFF] shadow-md fixed top-0 w-full z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center space-x-3">
            <Image src={bgImage} alt="Logo" width={48} height={48} className="h-12 w-12 rounded-full object-cover" priority />
            <SearchBar />
          </div>

          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-black focus:outline-none transition duration-300"
              aria-label="Toggle Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            {userRole === "Guest" ? (
              <>
                <NavbarLink
                  icon={faHome}
                  label="Home"
                  path="/Users/Home"
                  router={router}
                />
                <NavbarLink
                  icon={faBriefcase}
                  label="Jobs"
                  path="/Users/SignIn"
                  router={router}
                />
                <NavbarLink
                  icon={faBell}
                  label="Notifications"
                  path="/Users/SignIn"
                  router={router}
                />
                <NavbarLink
                  icon={faUserGraduate}
                  label="Practice"
                  path="/Users/SignIn"
                  router={router}
                />
                <NavbarLink
                  icon={faSignInAlt}
                  label="Sign In"
                  path="/Users/SignIn"
                  router={router}
                />
              </>
            ) : userRole === "Candidate" || userRole === "Recruiter" ? (
              <>
                <NavbarLink
                  icon={faHome}
                  label="Home"
                  path="/Users/Home"
                  router={router}
                />
                <NavbarLink
                  icon={faBriefcase}
                  label={userRole === "Candidate" ? "Jobs" : "Posts"}
                  path={userRole === "Candidate" ? "/Users/Jobs" : "/Users/Posts"}
                  router={router}
                />
                <NavbarLink
                  icon={faBell}
                  label="Notifications"
                  path="/Users/Notifications"
                  router={router}
                  badgeCount={notificationCount}
                />
                {userRole === "Candidate" && (
                  <NavbarLink
                    icon={faUserGraduate}
                    label="Practice"
                    path="/Users/Practice"
                    router={router}
                  />
                )}
                <ProfileLink router={router} />
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`md:hidden ${isOpen ? "block" : "hidden"} bg-[#F4F2EE] shadow-md`}>
        <div className="flex flex-col items-start space-y-2 px-4 py-3">
          {userRole === "Guest" ? (
            <>
              <NavbarLinkMobile
                icon={faHome}
                label="Home"
                path="/Users/Home"
                router={router}
              />
              <NavbarLinkMobile
                icon={faBriefcase}
                label="Jobs"
                path="/Users/SignIn"
                router={router}
              />
              <NavbarLinkMobile
                icon={faBell}
                label="Notifications"
                path="/Users/SignIn"
                router={router}
              />
              <NavbarLinkMobile
                icon={faUserGraduate}
                label="Practice"
                path="/Users/SignIn"
                router={router}
              />
              <NavbarLinkMobile
                icon={faSignInAlt}
                label="Sign In"
                path="/Users/SignIn"
                router={router}
              />
            </>
          ) : userRole === "Candidate" || userRole === "Recruiter" ? (
            <>
              <NavbarLinkMobile
                icon={faHome}
                label="Home"
                path="/Users/Home"
                router={router}
              />
              <NavbarLinkMobile
                icon={faBriefcase}
                label={userRole === "Candidate" ? "Jobs" : "Posts"}
                path={userRole === "Candidate" ? "/Users/Jobs" : "/Users/Posts"}
                router={router}
              />
              <NavbarLinkMobile
                icon={faBell}
                label="Notifications"
                path="/Users/Notifications"
                router={router}
                  badgeCount={notificationCount}
              />
                {userRole === "Candidate" && (
                  <NavbarLinkMobile
                    icon={faUserGraduate}
                    label="Practice"
                    path="/Users/Practice"
                    router={router}
                  />
                )}

              <div className="flex flex-col space-y-2 mt-4">
                <button
                  className="flex items-center space-x-2 w-full text-gray-700 hover:text-black px-3 py-2 transition duration-200 rounded-lg hover:bg-gray-200"
                  onClick={() => router.push("/Users/Profile")}
                >
                  <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
                  <span>View Profile</span>
                </button>

                {userRole === "Candidate" ? (
                  <button
                    className="flex items-center space-x-2 w-full text-gray-700 hover:text-black px-3 py-2 transition duration-200 rounded-lg hover:bg-gray-200"
                    onClick={switchToRecruiter}
                  >
                    <FontAwesomeIcon icon={faRightLeft} className="h-4 w-4" />
                    <span>Switch to Recruiter</span>
                  </button>
                ) : (
                  <button
                    className="flex items-center space-x-2 w-full text-gray-700 hover:text-black px-3 py-2 transition duration-200 rounded-lg hover:bg-gray-200"
                    onClick={switchToCandidate}
                  >
                    <FontAwesomeIcon icon={faRightLeft} className="h-4 w-4" />
                    <span>Switch to Candidate</span>
                  </button>
                )}
                <hr className="my-1 border-gray-300" />
                <button
                  className="flex items-center space-x-2 w-full text-gray-700 hover:bg-red-500 hover:text-white px-3 py-2 transition duration-200 rounded-lg"
                  onClick={() => router.push("/logout")}
                >
                  <FontAwesomeIcon icon={faSignOutAlt} className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
};

const NavbarLink = ({ icon, label, path, router, badgeCount = 0 }) => (
  <button
    className="flex flex-col items-center text-gray-700 hover:text-black transition duration-300 p-1 rounded-lg hover:bg-gray-200"
    onClick={() => router.push(path)}
  >
    <span className="relative inline-flex items-center justify-center">
      <FontAwesomeIcon icon={icon} className="h-5 w-5" />
      {badgeCount > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </span>
    <span className="text-xs font-medium">{label}</span>
  </button>
);

const NavbarLinkMobile = ({ icon, label, path, router, badgeCount = 0 }) => (
  <button
    className="flex items-center space-x-2 w-full text-left text-gray-700 hover:text-black px-3 py-2 transition duration-200 rounded-lg hover:bg-gray-200"
    onClick={() => router.push(path)}
  >
    <span className="relative inline-flex items-center justify-center">
      <FontAwesomeIcon icon={icon} className="h-4 w-4" />
      {badgeCount > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </span>
    <span>{label}</span>
  </button>
);

export default Navbar;
