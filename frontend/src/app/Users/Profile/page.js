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
import { FaBuilding, FaMapMarkerAlt, FaCheckCircle, FaChevronRight, FaChevronLeft, FaTrashAlt, FaBriefcase, FaSuitcase, FaArrowRight, FaCamera, FaFilePdf, FaLinkedin, FaGithub, FaEnvelope, FaPhone, FaGlobe, FaUser } from "react-icons/fa";

const openResumePreview = async (resumeUrl) => {
  if (!resumeUrl) return;

  if (resumeUrl.startsWith("blob:") || resumeUrl.startsWith("data:")) {
    window.open(resumeUrl, "_blank", "noopener,noreferrer");
    return;
  }

  window.open(resumeUrl, "_blank", "noopener,noreferrer");
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
const defaultFormData = {
    job_id: "",
    job_name: "",
    job_location: "",
    workplace_type: "",
    employment_type: "",
    description: "",
    skills: [],
    interview_type: "manual",
    new_company_name: "",
};

const STEPS = ["Basic Info", "Details & Skills"];

const PillButton = ({ label, selected, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
            selected
                ? "bg-[#0073b1] text-white border-[#0073b1] shadow-sm scale-[0.98]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.97]"
        }`}
    >
        {selected && <FaCheckCircle className="w-3 h-3" />}
        {label}
    </button>
);

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
    skills: [],
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
  const [skillInput, setSkillInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);

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
          skills: data.candidate ? (data.candidate.skills ? data.candidate.skills.split(",").map(s => s.trim()).filter(Boolean) : []) : [],
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
      case "skills":
        if (!value || (Array.isArray(value) && value.length === 0)) fieldErrors[name] = "Please add at least one skill.";
        break;
      case "education":
        if (!value) fieldErrors[name] = "Education details are required.";
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "application/pdf" || file.name.endsWith(".doc") || file.name.endsWith(".docx"))) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5MB limit.");
        return;
      }
      setFormData({
        ...formData,
        resume: file,
      });
      setResumeFileName(file.name);
      setResumePreview(URL.createObjectURL(file));
      toast.success("Resume dropped successfully!");
    } else {
      toast.error("Invalid file format. Please upload PDF, DOC, or DOCX.");
    }
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = skillInput.trim().replace(/,/g, "");
      if (val && !formData.skills.includes(val)) {
        setFormData({
          ...formData,
          skills: [...formData.skills, val],
        });
        setSkillInput("");
      }
    }
  };

  const removeSkill = (skill) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill),
    });
  };

  const calculateCompleteness = () => {
    const fields = [
      formData.firstName,
      formData.lastName,
      formData.contactNo,
      formData.location,
      formData.country,
      formData.linkedIn,
      profilePicturePreview,
      formData.bio
    ];
    if (role === "Candidate") {
      fields.push(formData.skills && formData.skills.length > 0);
      fields.push(formData.education);
      fields.push(resumePreview);
      fields.push(formData.github);
    } else {
      fields.push(formData.companyName);
      fields.push(formData.website);
    }
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
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
      formDataToSubmit.append("skills", Array.isArray(formData.skills) ? formData.skills.join(", ") : formData.skills);
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
    <div className="min-h-screen pt-24 pb-16 px-4" style={{ backgroundColor: "#F4F2EE" }}>
      <div className="w-full max-w-3xl mx-auto animate-fade-in">
        
        {/* Page Heading */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#0073b1] to-[#005582] text-transparent bg-clip-text pb-2">
            My Profile
          </h1>
          <p className="mt-2 text-sm text-gray-500">Keep your details fresh and updated for matching opportunities</p>
        </div>

        {/* Sleek Profile Completeness (hidden when 100%) */}
        {calculateCompleteness() < 100 && (
          <div className="w-full max-w-md mx-auto mb-8 animate-fade-in">
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-gray-500 mb-1.5 px-1">
                <span>Profile Strength</span>
                <span className="font-bold text-[#0073b1]">{calculateCompleteness()}%</span>
              </div>
              <div className="w-full bg-gray-200/60 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#0073b1] to-[#005582] h-full rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${calculateCompleteness()}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 sm:p-8">
          
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Profile Avatar / Photo Upload Area */}
            <div className="flex flex-col items-center justify-center pb-6 border-b border-gray-100">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-md relative bg-gray-100 flex items-center justify-center">
                  {profilePicturePreview ? (
                    <Image
                      src={profilePicturePreview}
                      alt="Profile"
                      width={112}
                      height={112}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <span className="text-4xl font-bold text-gray-300">
                      {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : <FaUser className="w-10 h-10" />}
                    </span>
                  )}
                </div>
                
                {/* Upload Trigger Camera Badge */}
                <label 
                  htmlFor="profilePictureUpload" 
                  className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#0073b1] text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-[#005582] transition-colors duration-200"
                >
                  <FaCamera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    id="profilePictureUpload"
                    name="profilePicture"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-400 mt-3">Click the camera badge to upload a profile photo</p>
            </div>

            {/* Section: Personal Info */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#0073b1] rounded-full"></span>
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName ?? ""}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 ${errors.firstName ? "border-rose-400" : "border-gray-200"}`}
                  />
                  {errors.firstName && <p className="text-rose-500 text-xs mt-1">{errors.firstName}</p>}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName ?? ""}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 ${errors.lastName ? "border-rose-400" : "border-gray-200"}`}
                  />
                  {errors.lastName && <p className="text-rose-500 text-xs mt-1">{errors.lastName}</p>}
                </div>

                {/* Email (Read Only) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                    Email <span className="text-[10px] bg-gray-100 text-gray-500 font-normal px-1.5 py-0.5 rounded">Locked</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email ?? ""}
                    readOnly
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed outline-none"
                  />
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Number</label>
                  <input
                    type="tel"
                    name="contactNo"
                    value={formData.contactNo ?? ""}
                    onChange={handleChange}
                    placeholder="e.g. 03001234567"
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 ${errors.contactNo ? "border-rose-400" : "border-gray-200"}`}
                  />
                  {errors.contactNo && <p className="text-rose-500 text-xs mt-1">{errors.contactNo}</p>}
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">City / Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location ?? ""}
                    onChange={handleChange}
                    placeholder="e.g. Karachi"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Country</label>
                  <select
                    name="country"
                    value={formData.country ?? ""}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] bg-white cursor-pointer transition duration-200 ${errors.country ? "border-rose-400" : "border-gray-200"}`}
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {errors.country && <p className="text-rose-500 text-xs mt-1">{errors.country}</p>}
                </div>
              </div>
            </div>

            {/* Section: Professional Links */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#0073b1] rounded-full"></span>
                Social Profiles & Links
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LinkedIn */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                    <FaLinkedin className="text-[#0073b1]" /> LinkedIn Link
                  </label>
                  <input
                    type="url"
                    name="linkedIn"
                    value={formData.linkedIn ?? ""}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/..."
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 ${errors.linkedIn ? "border-rose-400" : "border-gray-200"}`}
                  />
                  {errors.linkedIn && <p className="text-rose-500 text-xs mt-1">{errors.linkedIn}</p>}
                </div>

                {/* GitHub (Candidate only) */}
                {role === "Candidate" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                      <FaGithub className="text-gray-900" /> GitHub Link
                    </label>
                    <input
                      type="url"
                      name="github"
                      value={formData.github ?? ""}
                      onChange={handleChange}
                      placeholder="https://github.com/..."
                      className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 ${errors.github ? "border-rose-400" : "border-gray-200"}`}
                    />
                    {errors.github && <p className="text-rose-500 text-xs mt-1">{errors.github}</p>}
                  </div>
                )}

                {/* Company Website (Recruiter only) */}
                {role === "Recruiter" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                      <FaGlobe className="text-[#0073b1]" /> Company Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website ?? ""}
                      onChange={handleChange}
                      placeholder="https://company.com"
                      className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 ${errors.website ? "border-rose-400" : "border-gray-200"}`}
                    />
                    {errors.website && <p className="text-rose-500 text-xs mt-1">{errors.website}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Section: Candidate / Recruiter Specific Info */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#0073b1] rounded-full"></span>
                {role === "Candidate" ? "Skills & Education" : "Company details"}
              </h3>

              <div className="space-y-4">
                {/* Recruiter: Company name */}
                {role === "Recruiter" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Company Name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName ?? ""}
                      onChange={handleChange}
                      placeholder="Enter company name"
                      className={`w-full px-4 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 ${errors.companyName ? "border-rose-400" : "border-gray-200"}`}
                    />
                    {errors.companyName && <p className="text-rose-500 text-xs mt-1">{errors.companyName}</p>}
                  </div>
                )}

                {/* Candidate: Skills */}
                {role === "Candidate" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Skills (type & press Enter or comma)</label>
                    <div className={`w-full p-2 border rounded-xl outline-none focus-within:ring-2 focus-within:ring-[#0073b1]/30 focus-within:border-[#0073b1] transition duration-200 bg-white ${errors.skills ? "border-rose-400" : "border-gray-200"}`}>
                      {/* Skill tags */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {Array.isArray(formData.skills) && formData.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-[#0073b1] border border-sky-100/50 animate-fade-in"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-[#0073b1]/10 text-[#0073b1] transition-colors"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={handleSkillKeyDown}
                        placeholder={formData.skills.length === 0 ? "e.g. React, Node.js, Next.js" : "Add more skills..."}
                        className="w-full px-2 py-1 text-sm outline-none border-none focus:ring-0 bg-transparent"
                      />
                    </div>
                    {errors.skills && <p className="text-rose-500 text-xs mt-1">{errors.skills}</p>}
                  </div>
                )}

                {/* Candidate: Education */}
                {role === "Candidate" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Education</label>
                    <textarea
                      name="education"
                      value={formData.education ?? ""}
                      onChange={handleChange}
                      rows="3"
                      placeholder="B.S. Computer Science - University Name"
                      className={`w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 resize-none ${errors.education ? "border-rose-400" : "border-gray-200"}`}
                    />
                    {errors.education && <p className="text-rose-500 text-xs mt-1">{errors.education}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Section: Bio / Resume */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#0073b1] rounded-full"></span>
                Bio & Career Details
              </h3>

              <div className="space-y-4">
                {/* Bio */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Bio / Experience</label>
                  <textarea
                    name="bio"
                    value={formData.bio ?? ""}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Tell recruiters about yourself and your background..."
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0073b1]/30 focus:border-[#0073b1] transition duration-200 resize-none"
                  />
                </div>

                {/* Candidate: Resume Uploader */}
                {role === "Candidate" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Resume / CV Document</label>
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`flex flex-col sm:flex-row items-center gap-4 rounded-xl border p-4 transition-all duration-200 ${
                        isDragging 
                          ? "border-[#0073b1] bg-sky-50/30 shadow-inner" 
                          : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      {/* Document icon & details */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0 text-rose-500">
                          <FaFilePdf className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {resumePreview ? (
                            <button
                              type="button"
                              onClick={() => openResumePreview(resumePreview)}
                              className="text-sm font-semibold text-[#0073b1] hover:underline truncate block animate-fade-in"
                            >
                              {resumeFileName || "View uploaded resume"}
                            </button>
                          ) : (
                            <p className="text-sm font-semibold text-gray-400">
                              {isDragging ? "Drop your resume here!" : "No Resume Uploaded"}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">Drag & drop or browse PDF, DOC, DOCX up to 5MB</p>
                        </div>
                      </div>

                      {/* Upload Button */}
                      <label htmlFor="resumeUpload" className="w-full sm:w-auto">
                        <input
                          id="resumeUpload"
                          type="file"
                          name="resume"
                          accept=".pdf,.doc,.docx"
                          onChange={handleResumeChange}
                          className="hidden"
                        />
                        <div className="px-4 py-2 text-center text-xs font-bold text-[#0073b1] bg-white border border-gray-200 hover:border-[#0073b1]/50 rounded-xl shadow-sm cursor-pointer transition duration-200">
                          {resumePreview ? "Change Resume" : "Upload Document"}
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            {(successMessage || error) && (
              <div className="space-y-3">
                {successMessage && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold text-center">
                    {successMessage}
                  </div>
                )}
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold text-center">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Form Footer Action */}
            <div className="pt-4 border-t border-gray-50 flex items-center justify-center">
              <button
                type="submit"
                className="px-8 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#0073b1] to-[#005582] text-white shadow-sm hover:shadow-md hover:opacity-95 active:scale-[0.98] transition-all duration-200"
              >
                Update Profile
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};

export default Profile;
