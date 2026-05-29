"use client";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import Image from "next/image";
import { useDispatch } from "react-redux";
import { show_search,search_bar_action } from "@/Redux/Action";
import Loader from "@/app/others/loader";
import { API_BASE_URL } from "@/utils/api";
import toast from "react-hot-toast";

const getResumeViewerUrl = (resumeUrl) => {
  if (!resumeUrl) return "";
  if (resumeUrl.startsWith("blob:") || resumeUrl.startsWith("data:")) return resumeUrl;
  return `https://docs.google.com/gview?url=${encodeURIComponent(resumeUrl)}&embedded=1`;
};

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

const Profile = () => {
  const dispatch = useDispatch();
  const role = useSelector((state) => state.Role_Reducer);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNo: "",
    location: "",
    country: "",
    skills: "",
    education: "",
    linkedIn: "",
    github: "",
    bio: "",
    companyName: "",
    website: "",
    profilePicture: null,
    resume: null,
    role: role,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [profilePicturePreview, setProfilePicturePreview] = useState("");
  const [resumePreview, setResumePreview] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(show_search(false));
    dispatch(search_bar_action(""));
  }, [dispatch]);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/profile/`, { withCredentials: true });
        const data = response.data;

        setFormData({
          firstName: data.profile.first_name || "",
          lastName: data.profile.last_name || "",
          email: data.email || "",
          contactNo: data.profile.phone_number || "",
          location: data.profile.city || "",
          country: data.profile.country || "",
          skills: data.candidate ? data.candidate.skills : "",
          education: data.candidate ? data.candidate.education : "",
          linkedIn: data.profile.linkedin_link || "",
          github: data.candidate ? data.candidate.github_link : "",
          bio: data.candidate ? data.candidate.experience : "",
          companyName: data.recruiter ? data.recruiter.company_name : "",
          website: data.recruiter ? data.recruiter.company_website : "",
          profilePicture: data.profile.profile_picture || null,
          resume: data.candidate ? data.candidate.resume || null : null,
        });

        if (data.profile.profile_picture) {
          setProfilePicturePreview(data.profile.profile_picture);
        }

        if (data.candidate?.resume) {
          setResumePreview(data.candidate.resume);
          setResumeFileName(data.candidate.resume.split("/").pop() || "Resume");
        }

        setLoading(false);
      } catch (error) {
        setError(error.response?.data?.error || "Error loading profile data.");
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const validateField = (name, value) => {
    const fieldErrors = {};
    switch (name) {
      case "firstName":
      case "lastName":
        if (!value) fieldErrors[name] = "This field is required.";
        else if (!/^[A-Za-z]+$/.test(value)) fieldErrors[name] = "Only alphabetic characters allowed.";
        break;
      case "contactNo":
        if (value && !/^\d{10,}$/.test(value)) fieldErrors[name] = "Phone number must be at least 10 digits.";
        break;
      case "linkedIn":
      case "github":
      case "website":
        if (value && !/^https?:\/\/[^\s$.?#].[^\s]*$/.test(value)) fieldErrors[name] = "Invalid URL format.";
        break;
      case "companyName":
        if (value && !/^[A-Za-z\s]+$/.test(value)) fieldErrors[name] = "Only alphabetic characters allowed.";
        break;
      case "country":
        if (!value) fieldErrors[name] = "Please select a country.";
        break;
      default:
        break;
    }
    return fieldErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setErrors({
      ...errors,
      ...validateField(name, value),
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData({
      ...formData,
      profilePicture: file,
    });
    setProfilePicturePreview(URL.createObjectURL(file));
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData({
      ...formData,
      resume: file,
    });
    setResumeFileName(file.name);
    setResumePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    ["firstName", "lastName", "contactNo", "country", "linkedIn", ...(role === "Candidate" ? ["skills", "education"] : []), ...(role === "Recruiter" ? ["companyName", "website"] : [])]
    .forEach((field) => {
      const fieldErrors = validateField(field, formData[field]);
      if (Object.keys(fieldErrors).length > 0) {
        newErrors[field] = fieldErrors[field];
      }
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const formDataToSubmit = new FormData();
    formDataToSubmit.append("role", role);
    formDataToSubmit.append("first_name", formData.firstName);
    formDataToSubmit.append("last_name", formData.lastName);
    formDataToSubmit.append("phone_number", formData.contactNo);
    formDataToSubmit.append("city", formData.location);
    formDataToSubmit.append("country", formData.country);
    formDataToSubmit.append("linkedin_link", formData.linkedIn);
    if (formData.github) formDataToSubmit.append("github_link", formData.github);
    if (formData.bio) formDataToSubmit.append("bio", formData.bio);
    if (formData.profilePicture) formDataToSubmit.append("profile_picture", formData.profilePicture);
    if (formData.resume) formDataToSubmit.append("resume", formData.resume);

    if (role === "Candidate") {
      formDataToSubmit.append("skills", formData.skills);
      formDataToSubmit.append("education", formData.education);
    } else if (role === "Recruiter") {
      formDataToSubmit.append("company_name", formData.companyName);
      formDataToSubmit.append("company_website", formData.website);
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/update_profile/`, formDataToSubmit, {
        withCredentials: true,
      });
      const updatedProfilePicture = response.data?.profile?.profile_picture || null;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("profileUpdated", {
            detail: { profile_picture: updatedProfilePicture },
          })
        );
      }
      setSuccessMessage("Profile updated successfully!");
      toast.success("Profile updated successfully!");
    } catch (error) {
      const errorMsg = error.response?.data?.details || error.response?.data?.error || "Error updating profile.";
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  if (loading) return <Loader />;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen flex justify-center items-center mt-12 px-4" style={{ backgroundColor: "#F4F2EE" }}>
      <div className="bg-white p-6 rounded-xl shadow-sm max-w-3xl w-full border border-gray-100">
        <div className="text-center mb-6">
          {profilePicturePreview && (
            <label htmlFor="profilePictureUpload" className="block">
              <Image
                src={profilePicturePreview}
                alt="Profile"
                width={96}
                height={96}
                className="rounded-full object-cover mx-auto cursor-pointer hover:opacity-90 transition"
                unoptimized
              />
              <input
                type="file"
                id="profilePictureUpload"
                name="profilePicture"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
          <h2 className="mt-3 text-2xl font-bold text-[#0073b1]">Manage Your Profile</h2>
          <p className="text-gray-600 text-sm mt-1">Keep your profile up-to-date for better opportunities!</p>
        </div>

        {successMessage && <p className="text-green-600 text-center mb-4 text-sm">{successMessage}</p>}
        {error && <p className="text-red-600 text-center mb-4 text-sm">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "firstName", label: "First Name", placeholder: "", type: "text" },
              { name: "lastName", label: "Last Name", placeholder: "", type: "text" },
              { name: "email", label: "Email", placeholder: "", type: "email", readOnly: true },
              { name: "contactNo", label: "Contact No", placeholder: "03001234567", type: "tel" },
              { name: "location", label: "Location (City)", placeholder: "Enter your city", type: "text" },
              { name: "country", label: "Country", type: "select", options: COUNTRIES },
              { name: "linkedIn", label: "LinkedIn Profile", placeholder: "https://linkedin.com/in/yourprofile", type: "url" },
              { name: "github", label: "GitHub Profile", placeholder: "https://github.com/yourprofile", type: "url", show: role === "Candidate" },
              { name: "skills", label: "Skills (comma-separated)", placeholder: "React, Node.js, Python", type: "text", show: role === "Candidate" },
              { name: "education", label: "Education", placeholder: "B.S. Computer Science - University Name", type: "textarea", show: role === "Candidate" },
              { name: "companyName", label: "Company Name", placeholder: "Enter company name", type: "text", show: role === "Recruiter" },
              { name: "website", label: "Company Website", placeholder: "https://company.com", type: "url", show: role === "Recruiter" },
            ].map(({ name, label, placeholder, type, readOnly, show = true, options = [] }) => (
              show && (
                <div key={name}>
                  <label className="block text-gray-700 text-sm font-medium mb-1">{label}</label>
                  {type === "select" ? (
                    <select
                      name={name}
                      value={formData[name] ?? ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0073b1] transition bg-white cursor-pointer"
                    >
                      <option value="">Select {label}</option>
                      {options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : type !== "textarea" ? (
                    <input
                      type={type}
                      name={name}
                      value={formData[name] ?? ""}
                      onChange={handleChange}
                      placeholder={placeholder}
                      readOnly={readOnly}
                      className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0073b1] transition ${readOnly ? "bg-gray-50 cursor-not-allowed" : ""}`}
                    />
                  ) : (
                    <textarea
                      name={name}
                      value={formData[name] ?? ""}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0073b1] transition"
                      placeholder={placeholder}
                    />
                  )}
                  {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
                </div>
              )
            ))}

            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-medium mb-1">Bio / Experience</label>
              <textarea
                name="bio"
                value={formData.bio ?? ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0073b1] transition"
                rows="4"
                placeholder="Tell us something about yourself"
              />
            </div>

            {role === "Candidate" && (
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-medium mb-1">Resume / CV</label>
                <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 bg-white hover:border-[#0073b1] transition">
                  <div className="flex items-center justify-between">
                    {resumePreview ? (
                      <a
                        href={getResumeViewerUrl(resumePreview)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-[#0073b1] font-medium hover:underline break-all"
                      >
                        {resumeFileName || "View resume"}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-500">No resume uploaded yet</p>
                    )}
                  </div>
                  <label htmlFor="resumeUpload" className="w-full">
                    <input
                      id="resumeUpload"
                      type="file"
                      name="resume"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeChange}
                      className="hidden"
                    />
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-center cursor-pointer hover:bg-blue-50 transition bg-white text-sm font-medium text-[#0073b1]">
                      {resumePreview ? "Change Resume" : "Upload Resume"}
                    </div>
                  </label>
                  <p className="text-xs text-gray-500">
                    PDF, DOC, or DOCX format (max 5MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-6">
            <button
              type="submit"
              className="bg-[#0073b1] text-white py-2 px-6 rounded-lg hover:opacity-90 transition-all duration-300 shadow-sm text-sm font-medium"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
