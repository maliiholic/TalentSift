"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Loader from "@/app/others/loader";
import { API_BASE_URL } from "@/utils/api";

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

	useEffect(() => {
		if (!applicationId) return;

		let cancelled = false;

		const loadInterview = async () => {
			setStarting(true);
			setStartError("");
			try {
				const statusRes = await axios.get(`${API_BASE_URL}/application/${applicationId}/interview-status/`, { withCredentials: true });
				if (cancelled) return;
				if (statusRes.data?.status === 'passed' || statusRes.data?.status === 'failed') {
					setCompleted(true);
					setResult({
						final_score: statusRes.data.final_score ?? statusRes.data.screening_score,
						passed: statusRes.data.status === 'passed',
					});
					setStartStatus(statusRes.data.status === 'passed' ? "Interview already completed and passed." : "Interview already completed and not passed. Better luck next time.");
					toast.info(statusRes.data.status === 'passed' ? "Interview already completed and passed." : "Interview already completed and not passed. Better luck next time.");
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
				if (cancelled) return;
				if (res.data?.message === "Interview already completed") {
					setCompleted(true);
					setResult({ final_score: res.data.final_score ?? res.data.screening_score, passed: Boolean(res.data.passed) });
					setStartStatus(res.data.passed ? "Interview already completed and passed." : "Interview already completed and was not passed.");
					toast.info(res.data.passed ? "Interview already completed and passed." : "Interview already completed and was not passed.");
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
				if (cancelled) return;
				const message = err.response?.data?.error || "Failed to start interview";
				setStartError(message);
				toast.error(message);
			} finally {
				if (!cancelled) {
					setStarting(false);
					setLoading(false);
				}
			}
		};

		void loadInterview();

		return () => {
			cancelled = true;
		};
	}, [applicationId]);

	const submitAnswer = async () => {
		if (!sessionId || !currentQuestion) return;
		if (!answer.trim()) {
			toast.error("Please write/select an answer first.");
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
			<div className="min-h-screen bg-[#F4F2EE] py-16 px-4">
				<div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
					<h2 className="text-2xl font-bold text-[#0073b1] mb-2">Finishing interview</h2>
					<p className="text-gray-700">Please wait while we submit your final interview result.</p>
				</div>
			</div>
		);
	}

	if (completed) {
		return (
			<div className="min-h-screen bg-[#F4F2EE] py-16 px-4">
				<div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
					<h1 className="text-3xl font-bold text-[#0073b1] mb-4">Interview Result</h1>
					<div className="text-5xl font-extrabold text-gray-800">{((result?.final_score || 0) * 10).toFixed(1)}%</div>
					<p className={`mt-4 text-lg font-semibold ${result?.passed ? 'text-green-600' : 'text-red-600'}`}>
						{result?.passed ? "Passed (Eligible for recruiter shortlist)" : "Not passed (Below 80%)"}
					</p>
					{startStatus && <p className="mt-3 text-sm text-gray-600">{startStatus}</p>}
					<button className="mt-8 px-6 py-3 rounded bg-[#0073b1] text-white" onClick={() => router.push('/Users/Notifications')}>
						Back to Notifications
					</button>
				</div>
			</div>
		);
	}

	if (startError) {
		return (
			<div className="min-h-screen bg-[#F4F2EE] py-16 px-4">
				<div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
					<h2 className="text-2xl font-bold text-red-600 mb-2">Could not start interview</h2>
					<p className="text-gray-700 mb-6">{startError}</p>
					<button className="px-6 py-3 rounded bg-[#0073b1] text-white" onClick={startInterview}>Retry</button>
				</div>
			</div>
		);
	}

	if (!currentQuestion) {
		return (
			<div className="min-h-screen bg-[#F4F2EE] py-16 px-4">
				<div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center text-gray-600">
					{startStatus || "No interview questions available."}
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F4F2EE] py-8 px-4">
			<div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
				<div className="flex items-center justify-between mb-4">
					<h1 className="text-2xl font-bold text-[#0073b1]">AI Screening Interview</h1>
					<div className="text-sm text-gray-600">
						{timeLeft !== null ? `Time Left: ${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}` : ""}
					</div>
				</div>

				<div className="text-sm text-gray-500 mb-3">Question {currentIndex + 1} of {questions.length}</div>
				<h2
					ref={questionRef}
					className="text-xl font-semibold text-gray-800 mb-4 select-none"
					onCopy={(e) => e.preventDefault()}
					onCut={(e) => e.preventDefault()}
					onContextMenu={(e) => e.preventDefault()}
					onDragStart={(e) => e.preventDefault()}
					title="Question content is protected"
				>
					{currentQuestion.text || currentQuestion.question}
				</h2>

				{currentQuestion.type === "mcq" ? (
					<div className="space-y-3">
						{(currentQuestion.options || []).map((opt, idx) => (
							<button
								key={idx}
								type="button"
								className={`w-full text-left px-4 py-3 border rounded-lg ${answer === opt ? 'border-[#0073b1] bg-blue-50' : 'border-gray-300 bg-white'}`}
								onClick={() => setAnswer(opt)}
							>
								{opt}
							</button>
						))}
					</div>
				) : (
					<textarea
						className="w-full border border-gray-300 rounded-lg p-4 min-h-[160px]"
						placeholder="Type your answer here..."
						value={answer}
						onChange={(e) => setAnswer(e.target.value)}
					/>
				)}

				{attemptFeedback && (
					<div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
						<p className="font-semibold text-gray-800">Score: {attemptFeedback.score}/10</p>
						<p className="text-sm text-gray-600 mt-1">{attemptFeedback.feedback}</p>
					</div>
				)}

				<div className="mt-6 flex items-center gap-3">
					{!attemptFeedback ? (
						<button onClick={submitAnswer} disabled={submitting} className="px-6 py-2 rounded bg-[#0073b1] text-white">
							{submitting ? "Submitting..." : "Submit Answer"}
						</button>
					) : (
						<button onClick={nextQuestion} className="px-6 py-2 rounded bg-[#0073b1] text-white">
							{currentIndex < questions.length - 1 ? "Next Question" : "Finish Interview"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
