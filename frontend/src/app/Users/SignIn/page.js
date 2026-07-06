"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Image from "next/image";
import bgImage from "../../Photos/file.png";
import { GoogleLogin } from "@react-oauth/google";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { Role_Action } from "@/Redux/Action";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { show_search,search_bar_action } from "@/Redux/Action";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { setAuthToken } from "../../others/auth";
import { API_BASE_URL as API_BASE } from "@/utils/api";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

const SignIn = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [otp, setOtp] = useState(Array(6).fill(""));
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [otpError, setOtpError] = useState("");
    const [newPasswordError, setNewPasswordError] = useState("");
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(0);
    const [captchaError, setCaptchaError] = useState(""); // State for CAPTCHA error
    const dispatch = useDispatch();
    const { executeRecaptcha } = useGoogleReCaptcha();

    const userRole = useSelector((state) => state.Role_Reducer);
    const router = useRouter();

    useEffect(() => {
        dispatch(show_search(false));
        dispatch(search_bar_action(""));
    }, [dispatch]);

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const getCaptchaToken = async (action) => {
        if (!executeRecaptcha) {
            throw new Error("reCAPTCHA is still loading.");
        }

        const token = await executeRecaptcha(action);
        if (!token) {
            throw new Error("Unable to generate CAPTCHA token.");
        }

        setCaptchaError("");
        return token;
    };

    const handleGoogleLogin = async (credentialResponse) => {
        try {
            const { credential } = credentialResponse;
            const captchaToken = await getCaptchaToken("google_login");
            const response = await axios.post(
                `${API_BASE}/decode-jwt/`,
                { token: credential, captcha: captchaToken },
                { withCredentials: true }
            );
            const googleData = response.data?.data || {};
            const accessToken = googleData.access;
            const refreshToken = googleData.refresh;

            if (accessToken) {
                localStorage.setItem("access", accessToken);
                setAuthToken(accessToken);
            }

            if (refreshToken) {
                localStorage.setItem("refresh", refreshToken);
            }

            await dispatch(Role_Action(googleData.role === "admin" ? "admin" : "Candidate"));
            setEmailError("");
            setPasswordError("");
            router.push("/Users/Home");
        } catch (error) {
            setEmailError(error.response?.data?.error || "Google Login failed.");
        }
    };

    const handleSignupRedirect = () => {
        router.push("/Users/SignUp");
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        let captchaToken;
        try {
            captchaToken = await getCaptchaToken("login");
        } catch (error) {
            setCaptchaError(error.message || "Please complete the CAPTCHA.");
            setLoading(false);
            return;
        }


        if (!validateEmail(email)) {
            setEmailError("Invalid email format.");
            setLoading(false);
            return;
        } else {
            setEmailError("");
        }

        if (!email || !password) {
            setPasswordError("Please enter both email and password.");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(
                `${API_BASE}/login/`,
                { email, password, captcha: captchaToken },
                { withCredentials: true }
            );
            // store access token and set axios default header so subsequent requests use Authorization
            const token = response.data?.access || response.data?.data?.access;
            if (token) {
                localStorage.setItem('access', token);
                setAuthToken(token);
            }
            const userRole = response.data.user.role; // Get the user's role
            if (userRole === "user") {
                await dispatch(Role_Action("Candidate"));
                router.push("/Users/Home");
            } else if (userRole === "admin") {
                await dispatch(Role_Action("admin"));
                router.push("/Admin/dashboard");
            } else {
                console.error("Unknown role:", userRole);
            }
            resetForm();
        } catch (error) {
            setPasswordError("Invalid email or password.");
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();

        if (!validateEmail(email)) {
            setEmailError("Invalid email format.");
            return;
        } else {
            setEmailError("");
        }
        setLoading(true);
        try {
            const captchaToken = await getCaptchaToken("send_otp");
            const response = await axios.post(`${API_BASE}/send-otp_signin/`, { email, captcha: captchaToken });
            if (response.data?.debug_otp) {
                setOtp(response.data.debug_otp.split(""));
            }
            setIsOtpSent(true);
            setTimer(60); // Start countdown
        } catch (error) {
            setEmailError(error.response?.data?.details || error.response?.data?.error || "Error sending OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            const captchaToken = await getCaptchaToken("send_otp");
            const response = await axios.post(`${API_BASE}/send-otp_signin/`, { email, captcha: captchaToken });
            if (response.data?.debug_otp) {
                setOtp(response.data.debug_otp.split(""));
            }
            setTimer(60); // Restart countdown
        } catch (error) {
            setEmailError(error.response?.data?.details || error.response?.data?.error || "Error resending OTP.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (timer > 0) {
            const countdown = setInterval(() => setTimer((prev) => prev - 1), 1000);
            return () => clearInterval(countdown);
        }
    }, [timer]);

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.includes("")) {
            setOtpError("Please enter the complete OTP.");
            return;
        }

        try {
            await axios.post(`${API_BASE}/verify_otp_signin/`, {
                email,
                otp: otp.join(""),
            });
            setOtpVerified(true);
            setOtpError("");
        } catch (error) {
            setOtpError(error.response?.data?.error || "Invalid OTP.");
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.*[a-zA-Z]).{8,}$/;

        if (!newPassword) {
            setNewPasswordError("Please enter a new password.");
            return;
        }

        if (!passwordRegex.test(newPassword)) {
            setNewPasswordError(
                "Password must contain at least one uppercase letter, one special character, and be at least 8 characters long."
            );
            return;
        }

        try {
            await axios.post(`${API_BASE}/reset_password/`, {
                email,
                newPassword,
            });
            router.push("/Users/SignIn");
            resetForm();
        } catch (error) {
            setNewPasswordError(
                error.response?.data?.error || "Error resetting password."
            );
        }
    };

    const resetForm = () => {
        setShowForgotPassword(false);
        setPassword("");
        setNewPassword("");
        setOtp(Array(6).fill(""));
        setIsOtpSent(false);
        setOtpVerified(false);
        setEmailError("");
        setPasswordError("");
        setOtpError("");
        setNewPasswordError("");
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#F4F2EE] px-4 sm:px-6 lg:px-8 py-20 overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#0073b1]/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="relative bg-white/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.05)] p-8 sm:p-10 max-w-md w-full">
                <div className="text-center mb-6">
                    <Image
                        src={bgImage}
                        alt="Brand Logo"
                        width={80}
                        height={80}
                        className="w-16 sm:w-20 mx-auto mb-4"
                        priority
                    />
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 tracking-tight">
                        {showForgotPassword
                            ? isOtpSent
                                ? otpVerified
                                    ? "Reset Password"
                                    : "Enter OTP"
                                : "Reset Password"
                            : "Welcome Back!"}
                    </h1>
                    <p className="mt-2 text-gray-600 text-sm sm:text-base">
                        {showForgotPassword
                            ? isOtpSent
                                ? otpVerified
                                    ? "Enter your new password."
                                    : "Enter the OTP sent to your email."
                                : "Please enter your email to receive an OTP."
                            : "Please sign in to your account."}
                    </p>
                </div>

                {!showForgotPassword ? (
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label htmlFor="login-email" className="sr-only">Email Address</label>
                            <input
                                id="login-email"
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                aria-label="Email"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0073b1]/50 focus:ring-4 focus:ring-[#0073b1]/10 bg-white/60 backdrop-blur-sm transition-all duration-200 shadow-sm"
                            />
                            {emailError && (
                                <p className="text-red-500 text-sm mt-1">{emailError}</p>
                            )}
                        </div>
                        <div className="mb-4 relative">
                            <label htmlFor="login-password" className="sr-only">Password</label>
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                aria-label="Password"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0073b1]/50 focus:ring-4 focus:ring-[#0073b1]/10 bg-white/60 backdrop-blur-sm transition-all duration-200 shadow-sm"
                            />
                            <FontAwesomeIcon
                                icon={showPassword ? faEyeSlash : faEye}
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-3.5 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors duration-200"
                            />
                            {passwordError && (
                                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
                            )}
                        </div>

                        {captchaError && (
                            <p className="text-red-500 text-sm mt-1 text-center">{captchaError}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-gradient-to-r from-[#0073b1] to-[#005582] text-white py-3 px-4 rounded-xl hover:shadow-[0_4px_20px_rgba(0,115,177,0.35)] transition-all duration-300 font-semibold focus:outline-none hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${loading ? "opacity-85 cursor-wait" : ""}`}
                        >
                            {loading ? "Logging in..." : "Login"}
                        </button>
                        <div className="flex items-center justify-center mt-6">
                                    {GOOGLE_CLIENT_ID ? (
                                        <GoogleLogin
                                            onSuccess={handleGoogleLogin}
                                            onError={() => setEmailError("Google Login Failed")}
                                            shape="pill"
                                            buttonText="Sign In with Google"
                                        />
                                    ) : (
                                        <p className="text-sm text-red-600 text-center">
                                            Google login is not configured for this deployment.
                                        </p>
                                    )}
                        </div>
                        <p className="mt-4 text-center text-gray-600 text-sm">
                            <a
                                onClick={() => setShowForgotPassword(true)}
                                className="text-[#0073b1] hover:underline cursor-pointer font-medium"
                            >
                                Forgot Password?
                            </a>
                        </p>
                        <div className="px-4 py-2 text-sm text-center">
                            <span className="text-gray-600">Do not have an account?</span>
                            <button
                                className="text-[#0073b1] font-bold hover:underline ml-1 cursor-pointer"
                                onClick={handleSignupRedirect}
                            >
                                Sign Up
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        {!otpVerified ? (
                            isOtpSent ? (
                                <form onSubmit={handleVerifyOtp}>
                                    <OtpInput otp={otp} setOtp={setOtp} />
                                    {otpError && (
                                        <p className="text-red-500 text-sm mt-1 text-center font-medium">
                                            {otpError}
                                        </p>
                                    )}
                                    <button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-semibold py-3 rounded-xl hover:shadow-[0_4px_20px_rgba(0,115,177,0.35)] transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none cursor-pointer"
                                    >
                                        Verify OTP
                                    </button>
                                    {timer === 0 ? (
                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            className="w-full bg-gray-100/80 text-gray-700 hover:bg-gray-100 hover:text-black py-3 mt-2 rounded-xl transition duration-200 font-semibold focus:outline-none cursor-pointer"
                                        >
                                            Resend OTP
                                        </button>
                                    ) : (
                                        <p className="mt-4 text-center text-gray-600 text-sm">
                                            Resend OTP in {timer}s
                                        </p>
                                    )}
                                </form>
                            ) : (
                                <form onSubmit={handleForgotPassword}>
                                    <div className="mb-4">
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            aria-label="Email"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0073b1]/50 focus:ring-4 focus:ring-[#0073b1]/10 bg-white/60 backdrop-blur-sm transition-all duration-200 shadow-sm"
                                        />
                                        {emailError && (
                                            <p className="text-red-500 text-sm mt-1">{emailError}</p>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-semibold py-3 rounded-xl hover:shadow-[0_4px_20px_rgba(0,115,177,0.35)] transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none cursor-pointer"
                                    >
                                        {loading ? "Processing..." : "Send OTP"}
                                    </button>
                                </form>
                            )
                        ) : (
                            <form onSubmit={handleResetPassword}>
                                <div className="mb-4">
                                    <input
                                        type="password"
                                        placeholder="New Password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        aria-label="New Password"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0073b1]/50 focus:ring-4 focus:ring-[#0073b1]/10 bg-white/60 backdrop-blur-sm transition-all duration-200 shadow-sm"
                                    />
                                    {newPasswordError && (
                                        <p className="text-red-500 text-sm mt-1">
                                            {newPasswordError}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-semibold py-3 rounded-xl hover:shadow-[0_4px_20px_rgba(0,115,177,0.35)] transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none cursor-pointer"
                                >
                                    Reset Password
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// OtpInput Component
const OtpInput = ({ otp, setOtp }) => {
    const inputRefs = useRef([]);

    const handleChange = (index, value) => {
        if (isNaN(value)) return; // Allow only numbers
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Focus next input
        if (value && index < otp.length - 1) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleBackspace = (index) => {
        if (index === 0) return; // Don't go back for the first input
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1].focus();
    };

    return (
        <div className="flex justify-center space-x-2 mb-4">
            {otp.map((value, index) => (
                <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    value={value}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Backspace") {
                            handleBackspace(index);
                        }
                    }}
                    maxLength="1"
                    className="w-12 h-12 mx-1 text-center border border-gray-200 rounded-xl focus:outline-none focus:border-[#0073b1]/50 focus:ring-4 focus:ring-[#0073b1]/10 bg-white/60 backdrop-blur-sm transition-all duration-200 shadow-sm font-semibold text-lg"
                />
            ))}
        </div>
    );
};

export default SignIn;
