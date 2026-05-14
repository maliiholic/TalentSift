'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { show_search, search_bar_action } from '@/Redux/Action';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '@/utils/api';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from "next/navigation";
import Loader from "../../others/loader";

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
                const response = await axios.get(`${API_BASE_URL}/has-prac-subscription`, getAuthConfig());
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
                } else {
                    const stripe = await loadStripe('pk_test_51P0cjlP8GjJIjxDGEgyDXqRqhQThEMQl5KySJ1F7bhigoblE6MDvutJnx3n7LlTQx3HiA3zL9xYhnGwHTba03QpR00JWEq159G');
                    if (!stripe) {
                        toast.error("Stripe could not be initialized. Please try again.");
                        return;
                    }

                    const { error } = await stripe.redirectToCheckout({
                        sessionId: response.data.sessionId,
                    });

                    if (error) {
                        toast.error(error.message || "Failed to open checkout. Please try again.");
                    }
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

        setPhase("results");
        setStatus("Calculating your score...");
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/practice/complete/${session.session_id}/`,
                {},
                getAuthConfig()
            );
            setSession((current) => ({ ...current, ...response.data, status: "completed" }));
            setStatus(`Practice complete. Your score is ${response.data.final_score}.`);
        } catch (error) {
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

    const panel = {
        background: "rgba(255,255,255,0.86)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: "28px",
        boxShadow: "0 24px 70px rgba(15, 23, 42, 0.10)",
    };

    return (
        <main style={{ minHeight: "100vh", padding: "32px", background: "linear-gradient(180deg, #f4f2ee 0%, #eef2ff 100%)" }}>
            {!showPracticeModule ? (
                // Payment Paywall
                <div className="min-h-screen text-gray-900 font-sans py-12 mt-12">
                    <h1 className="text-center text-4xl md:text-5xl font-extrabold text-gradient bg-[#F4F2EE] text-[#0073b1] bg-clip-text mb-12">
                        Choose Your Plan
                    </h1>

                    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 px-6">
                        <div className={`relative bg-white bg-opacity-80 rounded-xl shadow-xl p-8 text-center border transition-transform transform hover:scale-105 hover:shadow-2xl ${hasSubscription ? 'opacity-50' : ''}`}>
                            <div className="absolute top-0 right-0 bg-[#0073b1] text-white text-sm font-bold py-1 px-4 rounded-bl-lg">
                                Selected Plan
                            </div>
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#0073b1] to-[#00548f] mb-6">
                                Basic
                            </h2>
                            <p className="text-4xl font-extrabold text-gray-900 mb-2">$0.00</p>
                            <p className="text-sm text-gray-500 mb-6">Billed monthly</p>
                            <ul className="text-left text-gray-700 space-y-4 text-sm">
                                <li className="flex items-center gap-4">
                                    <span className="text-red-500 font-bold">✘</span> Practice Interview for AI Module
                                </li>
                                <li className="flex items-center gap-4">
                                    <span className="text-red-500 font-bold">✘</span> Market Dashboard (Trending Jobs)
                                </li>
                            </ul>
                            <button
                                className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-semibold text-sm rounded-md shadow-lg cursor-not-allowed"
                                disabled
                            >
                                Already Selected
                            </button>
                        </div>

                        <div className="relative bg-white bg-opacity-80 rounded-xl shadow-xl p-8 text-center border border-gray-300 transition-transform transform hover:scale-105 hover:shadow-2xl">
                            <div className="absolute top-0 left-0 bg-[#0073b1] text-white text-sm font-bold py-1 px-4 rounded-br-lg">
                                Most Popular
                            </div>
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0073b1] to-[#00548f]" />
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#0073b1] to-[#00548f] mb-6">
                                Subscription
                            </h2>
                            <p className="text-4xl font-extrabold text-gray-900 mb-2">$50.00</p>
                            <p className="text-sm text-gray-500 mb-6">Billed monthly</p>
                            <ul className="text-left text-gray-700 space-y-4 text-sm">
                                <li className="flex items-center gap-3">
                                    <span className="text-green-500 font-bold">✔</span> Practice Interview for AI Module
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="text-green-500 font-bold">✔</span> Market Dashboard (Trending Jobs)
                                </li>
                            </ul>
                            <button
                                className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-[#0073b1] to-[#00548f] text-white font-semibold text-sm rounded-md shadow-lg transition-transform hover:scale-105 hover:shadow-xl disabled:opacity-50"
                                onClick={handlePayment}
                                disabled={isLoading}
                            >
                                {isLoading ? "Processing..." : "Select Plan"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // Practice Module
                <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gap: "20px" }}>
                    {phase === "setup" && (
                        <>
                    <section style={{ ...panel, padding: "32px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                            <div style={{ maxWidth: "820px" }}>
                                <p style={{ textTransform: "uppercase", letterSpacing: "0.18em", fontSize: "12px", color: "#0073b1", fontWeight: 700, marginBottom: "10px" }}>Practice Lab</p>
                                <h1 style={{ margin: 0, fontSize: "clamp(30px, 4vw, 54px)", color: "#0073b1", lineHeight: 1.05, fontWeight: 800 }}>
                                    Practice interviews that feel like the real thing.
                                </h1>
                                <p style={{ margin: "14px 0 0", color: "#4b5563", fontSize: "17px", lineHeight: 1.7 }}>
                                    Pick what you want to practice, answer questions one by one, and get instant feedback with scoring and improvement tips.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
                        <div style={{ ...panel, padding: "24px" }}>
                            <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Choose your practice</h2>
                            <p style={{ marginTop: 0, color: "#6b7280" }}>Pick a topic, difficulty, and question style.</p>

                            <label style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
                                <span style={{ fontWeight: 600, color: "#111827" }}>Topic</span>
                                <select
                                    value={config.topic}
                                    onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                                    style={{ width: "100%", padding: "14px 16px", borderRadius: "14px", border: "1px solid #d1d5db", background: "white" }}
                                >
                                    {topicOptions.map((topic) => (
                                        <option key={topic} value={topic}>{topic}</option>
                                    ))}
                                </select>
                            </label>

                            <label style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
                                <span style={{ fontWeight: 600, color: "#111827" }}>Difficulty</span>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
                                    {difficultyOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setConfig({ ...config, difficulty: option.value })}
                                            style={{
                                                padding: "12px 10px",
                                                borderRadius: "12px",
                                                border: config.difficulty === option.value ? "1px solid #0073b1" : "1px solid #d1d5db",
                                                background: config.difficulty === option.value ? "#0073b1" : "white",
                                                color: config.difficulty === option.value ? "white" : "#111827",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </label>

                            <label style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
                                <span style={{ fontWeight: 600, color: "#111827" }}>Question style</span>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
                                    {questionTypeOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setConfig({ ...config, question_type: option.value })}
                                            style={{
                                                padding: "12px 10px",
                                                borderRadius: "12px",
                                                border: config.question_type === option.value ? "1px solid #0073b1" : "1px solid #d1d5db",
                                                background: config.question_type === option.value ? "#0073b1" : "white",
                                                color: config.question_type === option.value ? "white" : "#111827",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </label>

                            <label style={{ display: "grid", gap: "8px" }}>
                                <span style={{ fontWeight: 600, color: "#111827" }}>Number of questions</span>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
                                    {[5, 10, 15].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setConfig({ ...config, total_questions: num })}
                                            style={{
                                                padding: "12px 10px",
                                                borderRadius: "12px",
                                                border: config.total_questions === num ? "1px solid #0073b1" : "1px solid #d1d5db",
                                                background: config.total_questions === num ? "#0073b1" : "white",
                                                color: config.total_questions === num ? "white" : "#111827",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </label>

                            <button
                                onClick={startSession}
                                disabled={loadingSession}
                                style={{ marginTop: "18px", width: "100%", padding: "14px 18px", borderRadius: "999px", border: 0, background: loadingSession ? "#94a3b8" : "linear-gradient(135deg, #0073b1, #005582)", color: "white", fontWeight: 700, cursor: loadingSession ? "not-allowed" : "pointer" }}
                            >
                                {loadingSession ? "Starting..." : "Start practice"}
                            </button>
                        </div>

                        <div style={{ ...panel, padding: "24px" }}>
                            <h2 style={{ marginTop: 0, marginBottom: "12px" }}>How it works</h2>
                            <div style={{ display: "grid", gap: "14px" }}>
                                {[
                                    { step: "1", title: "Choose a topic", text: "Pick the area you want to improve, like frontend or backend." },
                                    { step: "2", title: "Answer questions", text: "Work through a mix of multiple-choice and written answers." },
                                    { step: "3", title: "Review feedback", text: "Get scores, strengths, and improvement suggestions right away." },
                                ].map((item) => (
                                    <div key={item.step} style={{ display: "flex", gap: "14px", alignItems: "flex-start", padding: "14px", borderRadius: "18px", background: "#eef6fb", border: "1px solid #bfdbfe" }}>
                                        <div style={{ width: "36px", height: "36px", borderRadius: "999px", background: "#0073b1", color: "white", display: "grid", placeItems: "center", fontWeight: 700, flexShrink: 0 }}>
                                            {item.step}
                                        </div>
                                        <div>
                                            <h3 style={{ margin: "0 0 6px", fontSize: "18px", color: "#111827" }}>{item.title}</h3>
                                            <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6 }}>{item.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                        </>
                    )}

                    {phase === "active" && session && (
                        <section style={{ ...panel, padding: "32px", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
                            {(() => {
                                const currentQuestion = sessionQuestions[currentQuestionIndex];

                                if (!currentQuestion) {
                                    return (
                                        <div style={{ textAlign: "center", padding: "20px" }}>
                                            <h3 style={{ margin: 0, color: "#dc2626", fontSize: "20px" }}>Failed to load question</h3>
                                            <p style={{ color: "#6b7280", marginTop: "8px" }}>The question data is missing or could not be generated.</p>
                                            <button 
                                                onClick={() => setPhase("setup")} 
                                                style={{ marginTop: "16px", padding: "10px 20px", borderRadius: "999px", border: 0, background: "#0073b1", color: "white", fontWeight: 700, cursor: "pointer" }}
                                            >
                                                Go Back
                                            </button>
                                        </div>
                                    );
                                }

                                const attempt = currentQuestion?.attempt;
                                const answer = answers[currentQuestion?.id] || "";
                                const isSubmitting = submitting[currentQuestion?.id];
                                return (
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                            <h2 style={{ margin: 0, color: "#0073b1" }}>Question {currentQuestionIndex + 1} of {sessionQuestions.length}</h2>
                                            <span style={{ padding: "8px 12px", borderRadius: "999px", background: currentQuestion.question_type === "mcq" ? "#ecfeff" : "#fef3c7", color: "#0f172a", fontWeight: 700, fontSize: "14px" }}>
                                                {currentQuestion.question_type === "mcq" ? "Multiple choice" : "Written answer"}
                                            </span>
                                        </div>

                                        <div style={{ width: "100%", height: "8px", background: "#e5e7eb", borderRadius: "4px", marginBottom: "24px" }}>
                                            <div style={{ width: `${((currentQuestionIndex + 1) / sessionQuestions.length) * 100}%`, height: "100%", background: "#0073b1", borderRadius: "4px", transition: "width 0.3s ease" }} />
                                        </div>

                                        <h3 style={{ fontSize: "24px", color: "#111827", marginBottom: "24px" }}>{currentQuestion.question_text}</h3>

                                        {!attempt ? (
                                            currentQuestion.question_type === "mcq" ? (
                                                <div style={{ display: "grid", gap: "12px" }}>
                                                    {currentQuestion.options.map((option) => (
                                                        <button
                                                            key={option}
                                                            onClick={() => submitAnswer(currentQuestion, option)}
                                                            disabled={isSubmitting}
                                                            style={{
                                                                padding: "16px", borderRadius: "12px", border: "1px solid #d1d5db", background: "white", textAlign: "left", fontSize: "16px", cursor: isSubmitting ? "not-allowed" : "pointer", transition: "all 0.2s"
                                                            }}
                                                        >
                                                            {option}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div>
                                                    <textarea
                                                        value={answer}
                                                        onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                                                        rows={6}
                                                        placeholder="Type your answer here..."
                                                        style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "1px solid #d1d5db", fontSize: "16px", resize: "vertical", marginBottom: "16px" }}
                                                    />
                                                    <button
                                                        onClick={() => submitAnswer(currentQuestion)}
                                                        disabled={isSubmitting}
                                                        style={{ padding: "14px 24px", borderRadius: "999px", border: 0, background: isSubmitting ? "#94a3b8" : "#0073b1", color: "white", fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer" }}
                                                    >
                                                        {isSubmitting ? "Evaluating..." : "Submit Answer"}
                                                    </button>
                                                </div>
                                            )
                                        ) : (
                                            <div style={{ padding: "20px", borderRadius: "12px", background: attempt.is_correct === true || attempt.ai_score >= 7 ? "#ecfdf5" : attempt.is_correct === false || attempt.ai_score < 5 ? "#fef2f2" : "#fefce8", border: "1px solid", borderColor: attempt.is_correct === true || attempt.ai_score >= 7 ? "#a7f3d0" : attempt.is_correct === false || attempt.ai_score < 5 ? "#fecaca" : "#fef08a", marginBottom: "24px" }}>
                                                {currentQuestion.question_type === "mcq" ? (
                                                    <>
                                                        <h4 style={{ margin: "0 0 12px", color: attempt.is_correct ? "#059669" : "#dc2626", fontSize: "18px" }}>
                                                            {attempt.is_correct ? "Correct!" : "Incorrect"}
                                                        </h4>
                                                        <p style={{ margin: 0, color: "#374151" }}>You selected: <strong>{attempt.user_answer}</strong></p>
                                                        {!attempt.is_correct && <p style={{ margin: "8px 0 0", color: "#374151" }}>Correct answer: <strong>{attempt.correct_option}</strong></p>}
                                                    </>
                                                ) : (
                                                    <>
                                                        <h4 style={{ margin: "0 0 12px", color: attempt.ai_score >= 7 ? "#059669" : attempt.ai_score < 5 ? "#dc2626" : "#d97706", fontSize: "18px" }}>
                                                            AI Score: {attempt.ai_score} / 10
                                                        </h4>
                                                        <div style={{ display: "grid", gap: "8px", color: "#374151" }}>
                                                            {attempt.ai_feedback_good && <p style={{ margin: 0 }}><strong>Strengths:</strong> {attempt.ai_feedback_good}</p>}
                                                            {attempt.ai_feedback_missing && <p style={{ margin: 0 }}><strong>Areas to Improve:</strong> {attempt.ai_feedback_missing}</p>}
                                                            {attempt.ai_model_answer && (
                                                                <div style={{ marginTop: "12px", padding: "12px", background: "rgba(255,255,255,0.6)", borderRadius: "8px" }}>
                                                                    <strong>Model Answer:</strong><br />{attempt.ai_model_answer}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {attempt && (
                                            <button
                                                onClick={nextQuestion}
                                                style={{ width: "100%", padding: "14px 24px", borderRadius: "999px", border: 0, background: "#0073b1", color: "white", fontWeight: 700, cursor: "pointer", marginTop: "16px" }}
                                            >
                                                {currentQuestionIndex < sessionQuestions.length - 1 ? "Next Question" : "Finish & View Results"}
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}
                        </section>
                    )}

                    {phase === "results" && session && (
                        <section style={{ ...panel, padding: "32px", maxWidth: "800px", margin: "0 auto", width: "100%", textAlign: "center" }}>
                            <h2 style={{ fontSize: "32px", color: "#0073b1", marginBottom: "16px" }}>Session Complete</h2>
                            {(() => {
                                const finalScore = session.score || session.final_score || 0;
                                let performance = "Needs Improvement";
                                if (finalScore >= 8) performance = "Excellent Job! 🚀";
                                else if (finalScore >= 6) performance = "Good Effort! 👍";
                                return (
                                    <>
                                        <div style={{ fontSize: "56px", fontWeight: "900", color: "#111827", marginBottom: "8px" }}>
                                            {finalScore.toFixed(1)} <span style={{ fontSize: "28px", color: "#6b7280" }}>/ 10</span>
                                        </div>
                                        <div style={{ fontSize: "22px", fontWeight: "600", color: finalScore >= 8 ? "#059669" : finalScore >= 6 ? "#d97706" : "#dc2626", marginBottom: "32px" }}>
                                            {performance}
                                        </div>
                                    </>
                                );
                            })()}
                            <button
                                onClick={() => setPhase("setup")}
                                style={{ padding: "14px 24px", borderRadius: "999px", border: 0, background: "#0073b1", color: "white", fontWeight: 700, cursor: "pointer" }}
                            >
                                Start New Session
                            </button>
                        </section>
                    )}

                    {status && phase === "setup" && (
                        <section style={{ ...panel, padding: "18px 24px" }}>
                            <p style={{ margin: 0, color: "#6b7280" }}>{status}</p>
                        </section>
                    )}
                </div>
            )}
        </main>
    );
};

export default Practice;
