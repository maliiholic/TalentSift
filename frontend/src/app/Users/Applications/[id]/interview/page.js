"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Loader from "@/app/others/loader";
import { API_BASE_URL } from "@/utils/api";
import { FaClock, FaCheckCircle, FaTimesCircle, FaTrophy, FaChevronRight, FaRobot, FaLock, FaHourglassHalf } from 'react-icons/fa';

export default function InterviewPage() {
	const params = useParams();
	const router = useRouter();
	const applicationId = useMemo(() => params?.id, [params]);

	const [loading, setLoading] = useState(true);
	const [starting, setStarting] = useState(false);
	const [sessionId, setSessionId] = useState(null);
	const [questions, setQuestions] = useState([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [answer, setAnswer] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [attemptFeedback, setAttemptFeedback] = useState(null);
	const [completed, setCompleted] = useState(false);
	const [result, setResult] = useState(null);
	const [timeLeft, setTimeLeft] = useState(null);
	const [startError, setStartError] = useState("");
	const [startStatus, setStartStatus] = useState("");
	const [finishing, setFinishing] = useState(false);

	const questionRef = useRef(null);

	const normalizeQuestions = (items) =>
		(items || []).map((question, index) => ({
			...question,
			order: question?.order ?? index + 1,
		}));

	const currentQuestion = questions[currentIndex];

	const handleCompleteInterview = useCallback(async () => {
		if (!sessionId) return;
		if (finishing || completed) return;

		setFinishing(true);
		setTimeLeft(null);
		try {
			const res = await axios.post(`${API_BASE_URL}/interview/complete/${sessionId}/`, {}, { withCredentials: true });
			setCompleted(true);
			setResult(res.data);
			toast.success(res.data?.passed ? "Passed screening!" : "Interview completed.");
		} catch (err) {
			setFinishing(false);
			toast.error(err.response?.data?.error || "Failed to complete interview");
		}
	}, [sessionId, finishing, completed]);

	// Timer tick
	useEffect(() => {
		if (timeLeft === null || completed || finishing) return;
		if (timeLeft <= 0) {
			const completionTimer = setTimeout(() => {
				void handleCompleteInterview();
			}, 0);
			return () => clearTimeout(completionTimer);
		}
		const t = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
		return () => clearInterval(t);
	}, [timeLeft, completed, finishing, handleCompleteInterview]);

	// prevent copy on question and intercept document copy
	useEffect(() => {
		const onCopy = (e) => {
			try {
				const sel = window.getSelection();
				if (sel && !sel.isCollapsed && questionRef.current) {
					const anchor = sel.anchorNode;
					if (anchor && questionRef.current.contains(anchor)) {
						e.preventDefault();
						// notify server of copy attempt
						if (sessionId) {
							axios.post(`${API_BASE_URL}/interview/log-event/`, { session_id: sessionId, event: 'copy_attempt' }, { withCredentials: true }).catch(() => {});
						}
					}
				}
			} catch (err) {
				// ignore
			}
		};

		const onVisibility = () => {
			if (!sessionId) return;
			const state = document.visibilityState;
			axios.post(`${API_BASE_URL}/interview/log-event/`, { session_id: sessionId, event: 'visibilitychange', details: { state } }, { withCredentials: true }).catch(() => {});
		};

		document.addEventListener('copy', onCopy);
		document.addEventListener('visibilitychange', onVisibility);

		return () => {
			document.removeEventListener('copy', onCopy);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, [sessionId]);

	const loadInterview = useCallback(async () => {
		if (!applicationId) return;
		setStarting(true);
		setStartError("");
		try {
			const statusRes = await axios.get(`${API_BASE_URL}/application/${applicationId}/interview-status/`, { withCredentials: true });
			
			if (statusRes.data?.status === 'passed' || statusRes.data?.status === 'failed') {
				setCompleted(true);
				setResult({
					final_score: statusRes.data.final_score ?? statusRes.data.screening_score,
					passed: statusRes.data.status === 'passed',
				});
				setStartStatus(statusRes.data.status === 'passed' ? "Interview already completed and passed." : "Interview already completed and not passed.");
				toast.info(statusRes.data.status === 'passed' ? "Interview completed and passed." : "Interview completed and not passed.");
				return;
			}

			if (statusRes.data?.status === 'in_progress' && statusRes.data?.session_id) {
				setSessionId(statusRes.data.session_id);
				setQuestions(normalizeQuestions(statusRes.data.questions));
				setTimeLeft(statusRes.data.time_limit_seconds || null);
				setCurrentIndex(0);
				setAttemptFeedback(null);
				setAnswer("");
				setStartStatus("Resuming your in-progress interview.");
				return;
			}

			const res = await axios.post(`${API_BASE_URL}/application/${applicationId}/start-interview/`, {}, { withCredentials: true });
			if (res.data?.message === "Interview already completed") {
				setCompleted(true);
				setResult({ final_score: res.data.final_score ?? res.data.screening_score, passed: Boolean(res.data.passed) });
				setStartStatus(res.data.passed ? "Interview already completed and passed." : "Interview already completed and was not passed.");
				toast.info(res.data.passed ? "Interview completed and passed." : "Interview completed and was not passed.");
				return;
			}

			if (res.data?.message === "Interview already in progress") {
				setSessionId(res.data.session_id);
				setQuestions(normalizeQuestions(res.data.questions));
				setTimeLeft(res.data.time_limit_seconds || null);
				setCurrentIndex(0);
				setAttemptFeedback(null);
				setAnswer("");
				setStartStatus("Resuming your in-progress interview.");
				return;
			}
			setSessionId(res.data.session_id);
			setQuestions(normalizeQuestions(res.data.questions));
			setTimeLeft(res.data.time_limit_seconds || null);
			setCurrentIndex(0);
			setAttemptFeedback(null);
			setAnswer("");
		} catch (err) {
			const message = err.response?.data?.error || "Failed to start interview";
			setStartError(message);
			toast.error(message);
		} finally {
			setStarting(false);
			setLoading(false);
		}
	}, [applicationId]);

	useEffect(() => {
		void loadInterview();
	}, [loadInterview]);

	const submitAnswer = async () => {
		if (!sessionId || !currentQuestion) return;
		if (!answer.trim()) {
			toast.error("Please write or select an answer first.");
			return;
		}

		setSubmitting(true);
		try {
			const res = await axios.post(
				`${API_BASE_URL}/interview/submit-answer/`,
				{
					session_id: sessionId,
					order: currentQuestion.order,
					user_answer: answer,
				},
				{ withCredentials: true }
			);
			const data = res.data || {};
			setAttemptFeedback(data);

			if (data.finished) {
				setCompleted(true);
				setResult({ final_score: data.final_score, passed: data.passed });
				setTimeLeft(null);
				toast.success(data.passed ? "Passed screening!" : "Interview completed.");
				return;
			}

			if (data.next_order) {
				const nextIdx = Math.max(0, data.next_order - 1);
				setCurrentIndex(nextIdx);
				setAttemptFeedback(null);
				setAnswer("");
			}
		} catch (err) {
			toast.error(err.response?.data?.error || "Failed to submit answer");
		} finally {
			setSubmitting(false);
		}
	};

	const nextQuestion = () => {
		setAttemptFeedback(null);
		setAnswer("");
		if (currentIndex < questions.length - 1) {
			setCurrentIndex((p) => p + 1);
		} else {
			handleCompleteInterview();
		}
	};

	if (loading || starting) return <Loader />;

	if (finishing && !completed) {
		return (
			<div className="min-h-screen bg-[#F4F2EE] pt-24 pb-16 px-4 flex items-center justify-center">
				<div className="max-w-md w-full bg-white rounded-2xl border border-gray-150 p-8 text-center space-y-4 shadow-sm animate-fade-in">
					<div className="w-12 h-12 rounded-full bg-[#0073b1]/10 text-[#0073b1] flex items-center justify-center mx-auto">
						<FaHourglassHalf className="w-5 h-5 animate-spin" />
					</div>
					<h2 className="text-xl font-bold text-gray-900">Submitting Evaluation</h2>
					<p className="text-sm text-gray-500 leading-relaxed">Please remain on this page while our AI grades your final responses and compiles the screening report.</p>
				</div>
			</div>
		);
	}

	if (completed) {
		const finalScorePercentage = ((result?.final_score || 0) * 10).toFixed(1);
		return (
			<div className="min-h-screen bg-[#F4F2EE] pt-24 pb-16 px-4 flex items-center justify-center">
				<div className="max-w-xl w-full bg-white rounded-2xl border border-gray-150 p-8 text-center space-y-6 shadow-sm animate-fade-in">
					{result?.passed ? (
						<div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
							<FaTrophy className="w-7 h-7" />
						</div>
					) : (
						<div className="w-16 h-16 rounded-full bg-rose-50 text-rose-650 flex items-center justify-center mx-auto shadow-sm">
							<FaTimesCircle className="w-7 h-7" />
						</div>
					)}
					<div className="space-y-2">
						<h1 className="text-2xl font-black text-gray-900 tracking-tight">AI Screening Finished</h1>
						<p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Official Assessment Results</p>
					</div>

					<div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 max-w-sm mx-auto space-y-4">
						<div className="space-y-1">
							<span className="text-5xl font-black text-gray-950 tracking-tight">{finalScorePercentage}%</span>
							<span className="text-xs text-gray-400 font-bold block">Final Aggregate Score</span>
						</div>
						<div className={`py-2 px-4 rounded-xl font-bold text-sm inline-flex items-center gap-1.5 ${
							result?.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50/70 text-rose-650'
						}`}>
							{result?.passed ? (
								<>
									<FaCheckCircle className="w-4 h-4" />
									<span>Screening Cleared (Eligible)</span>
								</>
							) : (
								<>
									<FaTimesCircle className="w-4 h-4" />
									<span>Requirement Unmet (Below 80%)</span>
								</>
							)}
						</div>
					</div>

					<div className="space-y-3 max-w-md mx-auto">
						<p className="text-sm text-gray-650 leading-relaxed">
							{result?.passed 
								? "Excellent work! Your screening performance satisfies the criteria. Recruiters have been notified and will review your profile shortly."
								: "Unfortunately, your score did not meet the 80% passing threshold required for this role."
							}
						</p>
						{result?.passed && startStatus && <p className="text-xs text-gray-400 italic">Status details: {startStatus}</p>}
					</div>

					<button 
						className="px-8 py-3.5 bg-gradient-to-r from-[#0073b1] to-[#005582] hover:from-[#005582] hover:to-[#00446a] text-white font-bold text-sm rounded-xl shadow-md transition duration-200 active:scale-[0.98]"
						onClick={() => router.push('/Users/Home')}
					>
						Return to Home
					</button>
				</div>
			</div>
		);
	}

	if (startError) {
		return (
			<div className="min-h-screen bg-[#F4F2EE] pt-24 pb-16 px-4 flex items-center justify-center">
				<div className="max-w-md w-full bg-white rounded-2xl border border-gray-150 p-8 text-center space-y-6 shadow-sm animate-fade-in">
					<div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
						<FaTimesCircle className="w-6 h-6" />
					</div>
					<div className="space-y-2">
						<h2 className="text-xl font-bold text-gray-900">Assessment Unavailable</h2>
						<p className="text-sm text-gray-500 leading-relaxed">{startError}</p>
					</div>
					<button 
						className="px-6 py-3 bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-bold text-sm rounded-xl shadow-sm transition duration-200 active:scale-[0.98]"
						onClick={loadInterview}
					>
						Retry Connection
					</button>
				</div>
			</div>
		);
	}

	if (!currentQuestion) {
		return (
			<div className="min-h-screen bg-[#F4F2EE] pt-24 pb-16 px-4 flex items-center justify-center">
				<div className="max-w-md w-full bg-white rounded-2xl border border-gray-150 p-8 text-center space-y-4 shadow-sm animate-fade-in text-gray-500 text-sm">
					{startStatus || "Preparing mock technical questionnaire..."}
				</div>
			</div>
		);
	}

	return (
		<main className="min-h-screen pt-24 pb-16 px-4 md:px-8 bg-[#F4F2EE]">
			<div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-150 p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
				{/* Top Header Row */}
				<div className="flex items-center justify-between gap-4 flex-wrap border-b border-gray-100 pb-4">
					<div className="space-y-1">
						<h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
							<FaLock className="text-[#0073b1] w-4 h-4 flex-shrink-0" title="Secure Screened Session" />
							AI Screening Assessment
						</h1>
						<p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
							Question {currentIndex + 1} of {questions.length}
						</p>
					</div>
					
					{timeLeft !== null && (
						<div className="bg-amber-50 text-amber-700 border border-amber-200/50 rounded-full px-3 py-1 flex items-center gap-1.5 font-bold text-xs shadow-sm">
							<FaClock className="w-3.5 h-3.5 animate-pulse" />
							<span>
								{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')} remaining
							</span>
						</div>
					)}
				</div>

				{/* Progress Indicator Bar */}
				<div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
					<div 
						className="h-full bg-[#0073b1] rounded-full transition-all duration-300"
						style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
					/>
				</div>

				{/* Protected Question Text Box */}
				<div className="space-y-4">
					<h2
						ref={questionRef}
						className="text-lg sm:text-xl font-bold text-gray-900 leading-relaxed select-none"
						onCopy={(e) => e.preventDefault()}
						onCut={(e) => e.preventDefault()}
						onContextMenu={(e) => e.preventDefault()}
						onDragStart={(e) => e.preventDefault()}
						title="Assessment question is protected copy-prevention active"
					>
						{currentQuestion.text || currentQuestion.question}
					</h2>

					{/* Answer Selection Input Options */}
					{currentQuestion.type === "mcq" ? (
						<div className="grid grid-cols-1 gap-3">
							{(currentQuestion.options || []).map((opt, idx) => {
								const isSelected = answer === opt;
								return (
									<button
										key={idx}
										type="button"
										className={`w-full text-left p-4 rounded-xl border font-semibold text-sm transition-all duration-150 active:scale-[0.99] cursor-pointer ${
											isSelected 
												? 'border-[#0073b1] bg-blue-50/70 text-[#0073b1]' 
												: 'border-gray-200 bg-white text-gray-700 hover:bg-slate-50'
										}`}
										onClick={() => setAnswer(opt)}
									>
										{opt}
									</button>
								);
							})}
						</div>
					) : (
						<textarea
							className="w-full border border-gray-200 focus:border-[#0073b1] focus:ring-2 focus:ring-[#0073b1]/20 rounded-xl p-4 outline-none transition duration-200 bg-gray-50/50 resize-y min-h-[160px] font-medium text-sm text-gray-800"
							placeholder="Type your response here. Support your answers with specific technical terminology..."
							value={answer}
							onChange={(e) => setAnswer(e.target.value)}
						/>
					)}
				</div>

				{/* Evaluation feedback details */}
				{attemptFeedback && (
					<div className="p-6 rounded-2xl border border-gray-200 bg-gray-50/50 text-sm space-y-3 shadow-sm animate-fade-in">
						<h4 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
							<FaRobot className="w-4 h-4 text-[#0073b1]" />
							Evaluation Grading: {attemptFeedback.score} / 10
						</h4>
						<p className="text-xs text-gray-650 leading-relaxed">{attemptFeedback.feedback}</p>
					</div>
				)}

				{/* Submit Control Action Button */}
				<div className="pt-4 border-t border-gray-100 flex justify-end">
					{!attemptFeedback ? (
						<button 
							onClick={submitAnswer} 
							disabled={submitting} 
							className="px-6 py-3 bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-bold text-sm rounded-xl shadow-sm transition duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center gap-1.5"
						>
							{submitting ? "Submitting response..." : "Submit Answer"}
						</button>
					) : (
						<button 
							onClick={nextQuestion} 
							className="px-6 py-3 bg-gradient-to-r from-[#0073b1] to-[#005582] text-white font-bold text-sm rounded-xl shadow-sm transition duration-200 active:scale-[0.98] flex items-center gap-1.5"
						>
							<span>{currentIndex < questions.length - 1 ? "Next Question" : "Finish Interview"}</span>
							<FaChevronRight className="w-3.5 h-3.5" />
						</button>
					)}
				</div>
			</div>
		</main>
	);
}
