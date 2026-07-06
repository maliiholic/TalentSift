"use client";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from 'react-hot-toast';
import bgImage from "../../Photos/file.png";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { show_search, search_bar_action, Role_Action } from "@/Redux/Action";
import { API_BASE_URL } from "@/utils/api";

const OtpInput = ({ otp, setOtp }) => {

    const inputRefs = useRef([]);

    const handleChange = (e, index) => {
        const value = e.target.value;
        if (value.length > 0) {
            setOtp((prev) => {
                const newOtp = prev.split("");
                newOtp[index] = value;
                return newOtp.join("");
            });
            if (index < 5) inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace") {
            if (index > 0 && !otp[index]) inputRefs.current[index - 1].focus();
            if (index < 6) {
                setOtp((prev) => {
                    const newOtp = prev.split("");
                    newOtp[index] = "";
                    return newOtp.join("");
                });
            }
        }
    };

    return (
        <div className="flex justify-center space-x-2 mb-4">
            {Array(6).fill().map((_, index) => (
                <input
                    key={index}
                    type="text"
                    maxLength="1"
                    value={otp[index] || ""}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    ref={(el) => (inputRefs.current[index] = el)}
                    className="w-12 h-12 text-center border border-gray-200 rounded-xl focus:outline-none focus:border-[#0073b1]/50 focus:ring-4 focus:ring-[#0073b1]/10 bg-white/60 backdrop-blur-sm transition-all duration-200 shadow-sm font-semibold text-lg"
                />
            ))}
        </div>
    );
};

const Signup = () => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState("");
    const [profilePicture, setProfilePicture] = useState(null);
    const [previewSrc, setPreviewSrc] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(60);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState("");
    const fileInputRef = useRef(null);
    const router = useRouter();
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(show_search(false));
        dispatch(search_bar_action(""));
    }, [dispatch]);

    useEffect(() => {
        const clearExistingSession = async () => {
            try {
                await axios.post(`${API_BASE_URL}/logout/`, {}, { withCredentials: true });
            } catch (error) {
                // Ignore logout errors
            } finally {
                if (typeof window !== "undefined") {
                    localStorage.removeItem("access");
                }
                dispatch(Role_Action("Guest"));
            }
        };

        clearExistingSession();
    }, [dispatch]);

    useEffect(() => {
        let countdown;
        if (isOtpSent && timer > 0) {
            countdown = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdown);
                        setErrors((current) => ({ ...current, otp: "OTP expired. Please request a new one." }));
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(countdown);
    }, [isOtpSent, timer]);

    const validateForm = () => {
        const nameRegex = /^[A-Za-z]+$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
        const newErrors = {};

        if (!nameRegex.test(firstName)) {
            newErrors.firstName = "First name should contain only letters.";
        }
        if (!nameRegex.test(lastName)) {
            newErrors.lastName = "Last name should contain only letters.";
        }
        if (!emailRegex.test(email)) {
            newErrors.email = "Please enter a valid email.";
        }
        if (!passwordRegex.test(password)) {
            newErrors.password = "Password must be at least 8 characters, with an uppercase letter, a digit, and a special character.";
        }
        if (!profilePicture) {
            newErrors.profilePicture = "Please upload a profile picture.";
        } else {
            const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validImageTypes.includes(profilePicture.type)) {
                newErrors.profilePicture = "Profile picture must be a JPG, PNG, or GIF.";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/send_otp/`, { email });
            if (response.data?.debug_otp) {
                setOtp(response.data.debug_otp);
            }
            setIsOtpSent(true);
            setTimer(60); // Reset timer for resend OTP
        } catch (error) {
            const apiMessage = error.response?.data?.details || error.response?.data?.message || "Error sending OTP.";
            setErrors((prevErrors) => ({ ...prevErrors, email: apiMessage }));
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/send_otp/`, { email });
            if (response.data?.debug_otp) {
                setOtp(response.data.debug_otp);
            }
            setTimer(60);  // Reset timer for resend OTP
            setErrors({});
            toast.success("OTP has been resent.");
        } catch (error) {
            toast.error(error.response?.data?.details || error.response?.data?.message || "Error resending OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp || otp.length < 6) {
            setErrors({ otp: "Please enter the complete OTP." });
            return;
        }
        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/verify_otp/`, { email, otp });
            await handleSignup(); // Call signup function after successful OTP verification
            setErrors("")
            setSuccessMessage("Signup successful!");
            
            setTimeout(() => router.push("/Users/SignIn"),0);
        } catch (error) {
            setErrors({ otp: error.response?.data?.message || "Invalid OTP." });
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async () => {
        const formData = new FormData();
        formData.append("first_name", firstName);
        formData.append("last_name", lastName);
        formData.append("email", email);
        formData.append("password", password);
        formData.append("profile_picture", profilePicture);

        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/signup/`, formData, {
            });
        } catch (error) {
            setErrors({ general: "Signup failed! Please try again." });
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePicture(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreviewSrc(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const triggerFileSelect = () => fileInputRef.current.click();

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#F4F2EE] px-4 sm:px-6 lg:px-8 py-10 overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#0073b1]/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="relative bg-white/80 backdrop-blur-md rounded-2xl mt-12 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.05)] p-8 sm:p-10 max-w-lg w-full">
                <div className="text-center mb-8">
                    <Image src={bgImage} alt="Brand Logo" className="w-20 h-20 rounded-full mx-auto mb-4" priority />
                    <h1 className="text-2xl font-bold text-gray-800 mb-2 tracking-tight">
                        {isOtpSent ? "Verify Your OTP" : "Create Your TalentSift Account"}
                    </h1>
                    <p className="text-gray-500 text-sm font-light">
                        {isOtpSent ? "Enter the OTP sent to your email to complete your registration." : "Sign up to access all features and start your hiring journey with TalentSift!"}
                    </p>
                </div>

                {successMessage && (
                    <p className="text-green-500 text-center text-sm mb-4 font-semibold">{successMessage}</p>
                )}

                {!isOtpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div>
                            <label htmlFor="signup-firstname" className="sr-only">First Name</label>
                            <input
                                id="signup-firstname"
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="First Name"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0073b1]/50 focus:ring-4 focus:ring-[#0073b1]/10 bg-white/60 backdrop-blur-sm transition-all duration-200 shadow-sm"
                            />
                            {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                        </div>
                        <div>
                            <label htmlFor="signup-lastname" className="sr-only">Last Name</label>
                            <input
                                id="signup-lastname"
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Last Name"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0073b1]/50 focus:ring-4 focus:ring-[#0073b1]/10 bg-white/60 backdrop-blur-sm transition-all duration-200 shadow-sm"
                            />
                            {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                        </div>
                        <div>
                            <label htmlFor="signup-email" className="sr-only">Email Address</label>
                            <input
                                id="signup-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0073b1]/50 focus:ring-4 focus:ring-[#0073b1]/10 bg-white/60 backdrop-blur-sm transition-all duration-200 shadow-sm"
                            />
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                        </div>
                        <div className="relative">
                            <label htmlFor="signup-password" className="sr-only">Password</label>
                            <input
                                id="signup-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0073b1]/50 focus:ring-4 focus:ring-[#0073b1]/10 bg-white/60 backdrop-blur-sm transition-all duration-200 shadow-sm"
                            />
                            <FontAwesomeIcon
                                icon={showPassword ? faEyeSlash : faEye}
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-3.5 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors duration-200"
                            />
                            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={triggerFileSelect}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl border border-gray-200 transition duration-200 focus:outline-none shadow-sm cursor-pointer"
                            >
                                Upload Profile Picture
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} hidden />
                            {errors.profilePicture && <p className="text-red-500 text-sm mt-1">{errors.profilePicture}</p>}
                        </div>
                        {previewSrc && (
                            <div className="mb-4">
                                <Image src={previewSrc} alt="Profile Preview" width={96} height={96} className="w-24 h-24 rounded-full mx-auto mt-4 object-cover shadow-md border-2 border-white" />
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-semibold py-3 rounded-xl hover:shadow-[0_4px_20px_rgba(0,115,177,0.35)] transition-all duration-300 focus:outline-none hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                            disabled={loading}
                        >
                            {loading ? "Processing..." : "Sign Up"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <OtpInput otp={otp} setOtp={setOtp} />
                        {errors.otp && <p className="text-red-500 text-sm text-center font-medium mt-1">{errors.otp}</p>}
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-semibold py-3 rounded-xl hover:shadow-[0_4px_20px_rgba(0,115,177,0.35)] transition-all duration-300 focus:outline-none hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                            disabled={loading}
                        >
                            {loading ? "Verifying..." : `Verify OTP (${timer}s)`}
                        </button>
                        {timer === 0 && (
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                className="w-full bg-gray-100/80 text-gray-700 hover:bg-gray-100 hover:text-black py-3 mt-2 rounded-xl transition duration-200 font-semibold focus:outline-none cursor-pointer"
                            >
                                Resend OTP
                            </button>
                        )}
                    </form>
                )}
                <p className="mt-6 text-center text-gray-600 text-sm">
                    Already have an account?{" "}
                    <Link href="/Users/SignIn" prefetch={false} className="text-[#0073b1] font-semibold hover:underline">
                        Sign In
                    </Link>
                </p>
            </div>
            <Toaster position="top-center" />
        </div>
    );
};

export default Signup;
