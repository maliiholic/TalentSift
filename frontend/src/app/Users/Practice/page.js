'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { show_search, search_bar_action } from '@/Redux/Action';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '@/utils/api';
import { useRouter } from "next/navigation";
import Loader from "../../others/loader";
import { FaCheck, FaTimes, FaPlay, FaClipboardList, FaAward, FaTrophy, FaChevronRight, FaRobot, FaInfoCircle, FaChevronDown } from 'react-icons/fa';

const defaultConfig = {
  topic: "Frontend Development",
  difficulty: "intermediate",
  question_type: "mixed",
  total_questions: 5,
};

const difficultyOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const questionTypeOptions = [
  { value: "mixed", label: "Mixed" },
  { value: "mcq", label: "Multiple choice" },
  { value: "text", label: "Written answer" },
];

const topicOptions = [
  "Frontend Development",
  "Backend Development",
  "Full Stack Development",
  "Data Science",
  "DevOps",
];

const Practice = () => {
    const dispatch = useDispatch();
    const [hasSubscription, setHasSubscription] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
    const router = useRouter();

    // Practice module state
    const [phase, setPhase] = useState("setup"); // 'setup', 'active', 'results'
    const [config, setConfig] = useState(defaultConfig);
    const [status, setStatus] = useState("Choose a few preferences and start practicing.");
    const [loadingSession, setLoadingSession] = useState(false);
    const [submitting, setSubmitting] = useState({});
    const [session, setSession] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const sessionQuestions = useMemo(() => session?.questions || [], [session]);

    const getAuthConfig = () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access') : null;

        return {
            withCredentials: true,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        };
    };

    useEffect(() => {
        dispatch(show_search(false));
        dispatch(search_bar_action(''));
    }, [dispatch]);

    useEffect(() => {
        const checkSubscription = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/has-prac-subscription/`, getAuthConfig());
                setHasSubscription(response.data.practice_subscription);
                if (response.data.practice_subscription) {
                    setPaymentSuccess(true);
                }
            } catch (error) {
                if (error.response?.status === 401) {
                    toast.error("Please log in first to access practice subscription.");
                    router.push("/Users/SignIn");
                } else {
                    toast.error("Error checking subscription status. Please try again.");
                }
            } finally {
                setIsCheckingSubscription(false);
            }
        };

        checkSubscription();
    }, [router, dispatch]);

    const handlePayment = async (event) => {
        event.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/create_checkout_session_prac/`,
                { practice_type: 'practice' },
                {
                    ...getAuthConfig(),
                    headers: {
                        ...getAuthConfig().headers,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.status === 200) {
                if (response.data.checkoutUrl) {
                    window.location.href = response.data.checkoutUrl;
                } else if (response.data.sessionId) {
                    toast.error("Checkout URL was not returned. Please try again.");
                }
            } else {
                toast.error("Checkout failed. Please try again later.");
            }
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error("Please log in first to make a payment.");
                router.push("/Users/SignIn");
            } else {
                toast.error("An error occurred while initiating payment. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const sessionId = new URLSearchParams(window.location.search).get('session_id');
        if (sessionId) {
            axios.post(`${API_BASE_URL}/verify_payment_prac/`, { session_id: sessionId }, getAuthConfig())
                .then(response => {
                    if (response.status === 200) {
                        setPaymentSuccess(true);
                        toast.success("Payment successful! You now have access to the practice module.");
                        const currentUrl = window.location.href;
                        const newUrl = currentUrl.split('?')[0];
                        router.replace(newUrl);
                    } else {
                        toast.error("Payment verification failed. Please try again.");
                    }
                })
                .catch(error => {
                    if (error.response?.status === 401) {
                        toast.error("Please log in first to verify payment.");
                        router.push("/Users/SignIn");
                    } else {
                        toast.error("An error occurred while verifying payment. Please try again.");
                    }
                });
        }
    }, [router]);

    // Practice module functions
    const startSession = async () => {
        setLoadingSession(true);
        setStatus("Preparing your practice session...");
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/practice/start/`,
                config,
                getAuthConfig()
            );
            setSession(response.data);
            setAnswers({});
            setCurrentQuestionIndex(0);
            setPhase("active");
            setStatus("");
            if (response.data?.warning) {
                toast.warn(response.data.warning);
            }
        } catch (error) {
            setStatus(error?.response?.data?.message || error?.response?.data?.detail || "Failed to start session.");
        } finally {
            setLoadingSession(false);
        }
    };

    const submitAnswer = async (question, selectedOption = null) => {
        let value = selectedOption !== null ? selectedOption : (answers[question.id] || "").trim();
        if (question.question_type === "mcq" && selectedOption !== null) {
             setAnswers({ ...answers, [question.id]: value });
        } else if (!value) {
            setStatus("Write an answer before submitting.");
            return;
        }

        setSubmitting((current) => ({ ...current, [question.id]: true }));
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/practice/submit-answer/`,
                {
                    question_id: question.id,
                    user_answer: value,
                },
                getAuthConfig()
            );

            const updatedQuestions = sessionQuestions.map((item) =>
                item.id === question.id ? { ...item, attempt: response.data } : item
            );

            setSession({ ...session, questions: updatedQuestions });
            setStatus("");
            if (response.data?.status === "success" && question.question_type === "mcq") {
                toast.success(response.data.is_correct ? "Correct answer!" : "Answer saved.");
            }
        } catch (error) {
            setStatus(error?.response?.data?.message || "Failed to submit your answer.");
        } finally {
            setSubmitting((current) => ({ ...current, [question.id]: false }));
        }
    };

    const nextQuestion = async () => {
        if (currentQuestionIndex < sessionQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            await completeSession();
        }
    };

    const completeSession = async () => {
        if (!session?.session_id) return;

        setStatus("Calculating your score...");
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/practice/complete/${session.session_id}/`,
                {},
                getAuthConfig()
            );
            setSession((current) => ({ ...current, ...response.data, status: "completed" }));
            setPhase("results");
            setStatus(`Practice complete. Your score is ${response.data.final_score}.`);
        } catch (error) {
            setPhase("active");
            setStatus(error?.response?.data?.message || "Failed to complete the session.");
        }
    };

    if (isCheckingSubscription) {
        return (
            <>
                <Loader/>
            </>
        );
    }

    const showPracticeModule = paymentSuccess || hasSubscription;

    return (
        <main className="min-h-screen pt-24 pb-16 px-4 md:px-8 bg-[#F4F2EE]">
            {!showPracticeModule ? (
                // Payment Paywall
                <div className="max-w-5xl mx-auto py-12 animate-fade-in">
                    <header className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
                            <span className="bg-gradient-to-r from-[#0073b1] to-[#005582] text-transparent bg-clip-text pb-2">
                                Choose Your Plan
                            </span>
                        </h1>
                        <p className="mt-2 text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
                            Upgrade your plan to unlock interactive AI mock interview modules and real-time dashboard analytics.
                        </p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Basic Plan */}
                        <div className={`relative bg-white rounded-2xl border border-gray-150 p-8 shadow-sm text-center transition-all duration-300 hover:shadow-md ${hasSubscription ? 'opacity-50' : ''}`}>
                            <div className="absolute top-0 right-8 bg-gray-400 text-white text-xs font-bold py-1 px-4 rounded-b-xl shadow-sm">
                                Selected Plan
                            </div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-600 to-gray-800 text-transparent bg-clip-text mb-4 mt-2 pb-1">
                                Basic
                            </h2>
                            <div className="mb-4">
                                <span className="text-5xl font-black text-gray-950">$0.00</span>
                                <span className="text-sm text-gray-400 font-semibold block mt-1">Free Forever</span>
                            </div>
                            <ul className="text-left text-gray-600 space-y-3.5 text-sm my-8 border-t border-b border-gray-100 py-6 max-w-xs mx-auto">
                                <li className="flex items-center gap-3">
                                    <span className="text-rose-500 font-bold">✕</span>
                                    <span className="text-gray-650">Practice Interview for AI Module</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="text-rose-500 font-bold">✕</span>
                                    <span className="text-gray-655 font-normal">Market Dashboard (Trending Jobs)</span>
                                </li>
                            </ul>
                            <button
                                className="w-full py-3 bg-gray-100 text-gray-400 font-bold text-xs rounded-xl shadow-inner cursor-not-allowed transition duration-205"
                                disabled
                            >
                                Default Plan Active
                            </button>
                        </div>

                        {/* Subscription Plan */}
                        <div className="relative bg-white rounded-2xl border border-[#0073b1]/20 p-8 shadow-[0_8px_32px_rgba(0,115,177,0.04)] text-center transition-all duration-300 hover:shadow-[0_16px_48px_rgba(0,115,177,0.08)] hover:scale-[1.01]">
                            <div className="absolute top-0 right-8 bg-[#0073b1] text-white text-xs font-bold py-1 px-4 rounded-b-xl shadow-sm">
                                Most Popular
                            </div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#0073b1] to-[#005582] text-transparent bg-clip-text mb-4 mt-2 pb-1">
                                Practice Lab Pro
                            </h2>
                            <div className="mb-4">
                                <span className="text-5xl font-black text-gray-950">$50.00</span>
                                <span className="text-sm text-gray-400 font-semibold block mt-1">Billed monthly</span>
                            </div>
                            <ul className="text-left text-gray-655 space-y-3.5 text-sm my-8 border-t border-b border-gray-100 py-6 max-w-xs mx-auto">
                                <li className="flex items-center gap-3">
                                    <FaCheck className="text-emerald-500 w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="text-gray-650 font-medium">Practice Interview for AI Module</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <FaCheck className="text-emerald-500 w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="text-gray-650 font-medium">Market Dashboard (Trending Jobs)</span>
                                </li>
                            </ul>
                            <button
                                className="w-full py-3.5 bg-gradient-to-r from-[#0073b1] to-[#005582] hover:from-[#005582] hover:to-[#00446a] text-white font-bold text-sm rounded-xl shadow-md transition-all duration-300 hover:shadow-lg active:scale-[0.99] disabled:opacity-50"
                                onClick={handlePayment}
                                disabled={isLoading}
                            >
                                {isLoading ? "Processing..." : "Select Plan"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // Practice Module Content
                <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
                    {phase === "setup" && (
                        <>
                            {/* Centered Page Header */}
                            <header className="text-center mb-12">
                                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
                                    <span className="bg-gradient-to-r from-[#0073b1] to-[#005582] text-transparent bg-clip-text pb-2">
                                        Practice Lab
                                    </span>
                                </h1>
                                <p className="mt-2 text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
                                    Launch an interactive interview prep lab powered by AI. Choose your domain, complete targeted questions, and review custom engineering feedback.
                                </p>
                            </header>

                            {/* Preferences Grid */}
                            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white rounded-2xl border border-gray-150 p-6 sm:p-8 shadow-sm space-y-6">
                                    <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                                        <FaClipboardList className="text-[#0073b1] w-4.5 h-4.5" /> Customize Your Session
                                    </h2>

                                    {/* Topic Select */}
                                    <label className="block space-y-2">
                                        <span className="font-semibold text-gray-755 text-xs uppercase tracking-wider">Select Topic Domain</span>
                                        <div className="relative">
                                            <select
                                                value={config.topic}
                                                onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                                                className="w-full appearance-none p-3.5 bg-white border border-gray-200 focus:border-[#0073b1] focus:ring-2 focus:ring-[#0073b1]/20 rounded-xl outline-none transition duration-200 font-semibold text-sm text-gray-700 cursor-pointer pr-10"
                                            >
                                                {topicOptions.map((topic) => (
                                                    <option key={topic} value={topic}>{topic}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-450">
                                                <FaChevronDown className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </label>

                                    {/* Difficulty Option Row */}
                                    <div className="space-y-2">
                                        <span className="font-semibold text-gray-755 text-xs uppercase tracking-wider block">Difficulty Level</span>
                                        <div className="grid grid-cols-3 gap-2">
                                            {difficultyOptions.map((option) => {
                                                const isActive = config.difficulty === option.value;
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => setConfig({ ...config, difficulty: option.value })}
                                                        className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-150 active:scale-[0.98] ${
                                                            isActive
                                                                ? "bg-gradient-to-r from-[#0073b1] to-[#005582] text-white shadow-sm"
                                                                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Question Style Row */}
                                    <div className="space-y-2">
                                        <span className="font-semibold text-gray-755 text-xs uppercase tracking-wider block">Question Style</span>
                                        <div className="grid grid-cols-3 gap-2">
                                            {questionTypeOptions.map((option) => {
                                                const isActive = config.question_type === option.value;
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => setConfig({ ...config, question_type: option.value })}
                                                        className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-150 active:scale-[0.98] ${
                                                            isActive
                                                                ? "bg-gradient-to-r from-[#0073b1] to-[#005582] text-white shadow-sm"
                                                                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Question Count Selection */}
                                    <div className="space-y-2">
                                        <span className="font-semibold text-gray-755 text-xs uppercase tracking-wider block">Number of Questions</span>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[5, 10, 15].map((num) => {
                                                const isActive = config.total_questions === num;
                                                return (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        onClick={() => setConfig({ ...config, total_questions: num })}
                                                        className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-150 active:scale-[0.98] ${
                                                            isActive
                                                                ? "bg-gradient-to-r from-[#0073b1] to-[#005582] text-white shadow-sm"
                                                                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                                                        }`}
                                                    >
                                                        {num} Questions
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <button
                                        onClick={startSession}
                                        disabled={loadingSession}
                                        className="w-full py-3.5 bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-bold text-sm rounded-xl shadow-sm hover:opacity-95 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 mt-4"
                                    >
                                        <FaPlay className="w-3 h-3 text-white/90" />
                                        {loadingSession ? "Configuring Lab..." : "Launch Practice Lab"}
                                    </button>
                                </div>

                                {/* Rules Guide */}
                                <div className="bg-white rounded-2xl border border-gray-150 p-6 sm:p-8 shadow-sm space-y-6">
                                    <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                                        <FaInfoCircle className="text-[#0073b1] w-4.5 h-4.5" /> How It Works
                                    </h2>
                                    <div className="space-y-4">
                                        {[
                                            { step: "1", title: "Select a Topic", text: "Select the specific field you want to practice, from Frontend layouts to Backend APIs." },
                                            { step: "2", title: "Complete Questions", text: "Work through a personalized set of multiple-choice and open-ended technical questions." },
                                            { step: "3", title: "Read AI Analysis", text: "Get an instant grade, list of key technical strengths, missing key items, and optimal answers." },
                                        ].map((item) => (
                                            <div key={item.step} className="flex gap-4 items-start p-4 rounded-xl bg-gradient-to-br from-[#0073b1]/5 to-[#005582]/5 border border-[#0073b1]/10">
                                                <div className="w-8 h-8 rounded-full bg-[#0073b1] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                                                    {item.step}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h3>
                                                    <p className="text-xs text-gray-555 leading-relaxed">{item.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </>
                    )}

                    {/* Active Session Screen */}
                    {phase === "active" && session && (
                        <section className="bg-white rounded-2xl border border-gray-150 p-6 sm:p-8 shadow-sm max-w-3xl mx-auto animate-fade-in">
                            {(() => {
                                const currentQuestion = sessionQuestions[currentQuestionIndex];

                                if (!currentQuestion) {
                                    return (
                                        <div className="text-center py-8">
                                            <h3 className="text-lg font-bold text-rose-600 mb-2">Error Loading Question</h3>
                                            <p className="text-gray-500 text-sm mb-6">We encountered an issue preparing this question block.</p>
                                            <button 
                                                onClick={() => setPhase("setup")} 
                                                className="px-6 py-2.5 bg-[#0073b1] hover:bg-[#005582] text-white font-bold rounded-xl transition duration-205"
                                            >
                                                Return to Setup
                                            </button>
                                        </div>
                                    );
                                }

                                const attempt = currentQuestion?.attempt;
                                const answer = answers[currentQuestion?.id] || "";
                                const isSubmitting = submitting[currentQuestion?.id];
                                return (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center gap-4 flex-wrap">
                                            <h2 className="text-base sm:text-lg font-bold text-[#0073b1]">Question {currentQuestionIndex + 1} of {sessionQuestions.length}</h2>
                                            <span className={`px-3 py-1 rounded-full font-bold text-xs capitalize ${
                                                currentQuestion.question_type === "mcq" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                                            }`}>
                                                {currentQuestion.question_type === "mcq" ? "Multiple Choice" : "Written Response"}
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#0073b1] rounded-full transition-all duration-300"
                                                style={{ width: `${((currentQuestionIndex + 1) / sessionQuestions.length) * 100}%` }}
                                            />
                                        </div>

                                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-relaxed mb-4">{currentQuestion.question_text}</h3>

                                        {!attempt ? (
                                            currentQuestion.question_type === "mcq" ? (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {currentQuestion.options.map((option) => (
                                                        <button
                                                            key={option}
                                                            onClick={() => submitAnswer(currentQuestion, option)}
                                                            disabled={isSubmitting}
                                                            className="w-full text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-[#0073b1] hover:bg-slate-50 font-semibold text-sm transition-all duration-150 active:scale-[0.99] cursor-pointer disabled:opacity-60"
                                                        >
                                                            {option}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <textarea
                                                        value={answer}
                                                        onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                                                        rows={6}
                                                        placeholder="Draft your detailed answer here. Focus on key technical concepts and exact terms..."
                                                        className="w-full border border-gray-200 focus:border-[#0073b1] focus:ring-2 focus:ring-[#0073b1]/20 rounded-xl p-4 outline-none transition duration-200 bg-gray-50/50 resize-y min-h-[120px] font-medium text-sm text-gray-800"
                                                    />
                                                    <button
                                                        onClick={() => submitAnswer(currentQuestion)}
                                                        disabled={isSubmitting}
                                                        className="px-6 py-3 bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-bold rounded-xl shadow-sm transition duration-200 active:scale-[0.98] disabled:opacity-60 text-sm flex items-center justify-center gap-1.5"
                                                    >
                                                        {isSubmitting ? "Evaluating response..." : "Submit Response"}
                                                    </button>
                                                </div>
                                            )
                                        ) : (
                                            /* Review AI Evaluation block */
                                            <div className={`p-6 rounded-2xl border text-sm space-y-4 shadow-sm ${
                                                attempt.is_correct === true || attempt.ai_score >= 7 
                                                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-955" 
                                                    : attempt.is_correct === false || attempt.ai_score < 5 
                                                        ? "bg-rose-50/60 border-rose-200 text-rose-955" 
                                                        : "bg-amber-50/60 border-amber-200 text-amber-955"
                                            }`}>
                                                {currentQuestion.question_type === "mcq" ? (
                                                    <div className="space-y-2">
                                                        <h4 className={`text-base font-bold flex items-center gap-1.5 ${attempt.is_correct ? "text-emerald-700" : "text-rose-600"}`}>
                                                            {attempt.is_correct ? "Correct!" : "Incorrect"}
                                                        </h4>
                                                        <p>You selected: <span className="font-bold">{attempt.user_answer || answer}</span></p>
                                                        {!attempt.is_correct && <p>Correct answer: <span className="font-bold text-emerald-800">{attempt.correct_option}</span></p>}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between border-b border-gray-200/40 pb-3">
                                                            <h4 className={`text-base font-bold flex items-center gap-1.5 ${attempt.ai_score >= 7 ? "text-emerald-700" : attempt.ai_score < 5 ? "text-rose-600" : "text-amber-700"}`}>
                                                                <FaRobot className="w-4 h-4" /> AI Grading Score: {attempt.ai_score} / 10
                                                            </h4>
                                                        </div>
                                                        <div className="space-y-3 text-xs sm:text-sm">
                                                            {attempt.ai_feedback_good && <p><strong>Key Strengths:</strong> {attempt.ai_feedback_good}</p>}
                                                            {attempt.ai_feedback_missing && <p><strong>Suggested Improvements:</strong> {attempt.ai_feedback_missing}</p>}
                                                            {attempt.ai_model_answer && (
                                                                <div className="mt-4 p-4 bg-white/80 rounded-xl border border-gray-200 text-gray-800 leading-relaxed text-xs sm:text-sm shadow-sm">
                                                                    <strong className="block mb-1 text-gray-900">Reference Model Answer:</strong>{attempt.ai_model_answer}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {attempt && (
                                            <button
                                                onClick={nextQuestion}
                                                className="w-full py-3.5 bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-bold rounded-xl shadow-sm transition duration-200 hover:shadow-md active:scale-[0.99] mt-6 flex items-center justify-center gap-1.5 text-sm"
                                            >
                                                <span>{currentQuestionIndex < sessionQuestions.length - 1 ? "Next Question" : "Finish & View Results"}</span>
                                                <FaChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}
                        </section>
                    )}

                    {/* Results / Feedback Screen */}
                    {phase === "results" && session && (
                        <section className="bg-white rounded-2xl border border-gray-150 p-8 shadow-sm max-w-2xl mx-auto text-center space-y-6 animate-fade-in">
                            <div className="w-16 h-16 bg-[#0073b1]/10 rounded-full flex items-center justify-center mx-auto mb-2 text-[#0073b1]">
                                <FaTrophy className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-[#0073b1] tracking-tight">Session Completed</h2>
                            {(() => {
                                const finalScore = session.score || session.final_score || 0;
                                let performance = "Needs Improvement";
                                if (finalScore >= 8) performance = "Excellent Job!";
                                else if (finalScore >= 6) performance = "Good Effort!";
                                return (
                                    <div className="space-y-4">
                                        <div className="text-6xl font-black text-gray-900 tracking-tight">
                                            {finalScore.toFixed(1)} <span className="text-2xl text-gray-400 font-semibold">/ 10</span>
                                        </div>
                                        <div className={`text-xl font-bold flex items-center justify-center gap-1.5 ${
                                            finalScore >= 8 ? "text-emerald-600" : finalScore >= 6 ? "text-amber-600" : "text-rose-600"
                                        }`}>
                                            <FaAward className="w-5 h-5" />
                                            <span>{performance}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                            <button
                                onClick={() => setPhase("setup")}
                                className="px-8 py-3.5 bg-gradient-to-r from-[#0073b1] to-[#005582] hover:from-[#005582] hover:to-[#00446a] text-white font-bold rounded-xl shadow-md transition duration-200 active:scale-[0.98] mt-6 text-sm"
                            >
                                Start New Session
                            </button>
                        </section>
                    )}

                    {status && phase === "setup" && (
                        <section className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm text-center text-sm text-gray-500 font-medium">
                            <p>{status}</p>
                        </section>
                    )}
                </div>
            )}
        </main>
    );
};

export default Practice;
