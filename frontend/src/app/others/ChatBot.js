"use client";

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
	toggleChat,
	addUserMessage,
	sendChatMessage,
	clearHistory,
	closeChat,
	openChat
} from "../../Redux/chatSlice";

export default function ChatBot() {
	const dispatch = useDispatch();
	const role = useSelector((state) => state.Role_Reducer) || "Guest";
	const { messages, isOpen, isLoading } = useSelector((state) => state.chat_reducer) || {
		messages: [],
		isOpen: false,
		isLoading: false
	};

	const [input, setInput] = useState("");
	const [isMinimized, setIsMinimized] = useState(false);
	const messagesEndRef = useRef(null);
	const inputRef = useRef(null);

	// Auto scroll to bottom
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		if (isOpen && !isMinimized) {
			scrollToBottom();
			inputRef.current?.focus();
		}
	}, [isOpen, isMinimized, messages, isLoading]);

	// Send message handler
	const handleSend = (e) => {
		e.preventDefault();
		const trimmed = input.trim();
		if (!trimmed || isLoading) return;

		// Dispatch user message to local state
		dispatch(addUserMessage(trimmed));
		setInput("");

		// Request AI reply
		dispatch(
			sendChatMessage({
				message: trimmed,
				conversationHistory: messages
			})
		);
	};

	const handleClear = () => {
		if (window.confirm("Are you sure you want to clear your chat history?")) {
			dispatch(clearHistory());
		}
	};

	// Determine intro/welcome message based on role
	const getWelcomeMessage = () => {
		switch (role) {
			case "Recruiter":
				return "Welcome back! I'm your TalentSift Hiring Assistant. I can help you draft optimized job descriptions, understand candidate screening scores, or suggest pipeline strategies. What are we working on today?";
			case "Candidate":
				return "Hi there! Ready to take your career to the next level? I can help you track your applications, explain AI interview scoring, or give you personalized practice tips. Ask me anything!";
			default:
				return "Hello! Welcome to TalentSift. I can help you understand how our AI pre-screening works, guide you through standard features, or explain subscription plans. How can I help you get started?";
		}
	};

	// Elegant lightweight Markdown parser that safely converts markdown lists, bold, italics, code inline elements to React nodes
	const renderMarkdown = (text) => {
		if (!text) return null;

		const renderInline = (str) => {
			if (!str) return "";
			const tokens = [];
			let remaining = str;

			while (remaining) {
				const boldMatch = remaining.match(/(\*\*|__)(.*?)\1/);
				const codeMatch = remaining.match(/(`)(.*?)\1/);
				const italicMatch = remaining.match(/(\*|_)(.*?)\1/);

				let firstMatch = null;
				let type = null;

				if (boldMatch && (!firstMatch || boldMatch.index < firstMatch.index)) {
					firstMatch = boldMatch;
					type = "bold";
				}
				if (codeMatch && (!firstMatch || codeMatch.index < firstMatch.index)) {
					firstMatch = codeMatch;
					type = "code";
				}
				if (italicMatch && (!firstMatch || italicMatch.index < firstMatch.index)) {
					firstMatch = italicMatch;
					type = "italic";
				}

				if (!firstMatch) {
					tokens.push(remaining);
					break;
				}

				if (firstMatch.index > 0) {
					tokens.push(remaining.substring(0, firstMatch.index));
				}

				const content = firstMatch[2];
				if (type === "bold") {
					tokens.push(
						<strong key={tokens.length} className="font-extrabold text-[#0073b1] dark:text-[#38bdf8]">
							{content}
						</strong>
					);
				} else if (type === "code") {
					tokens.push(
						<code key={tokens.length} className="bg-gray-150 dark:bg-neutral-900 text-red-500 dark:text-red-400 font-mono text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-neutral-800">
							{content}
						</code>
					);
				} else if (type === "italic") {
					tokens.push(
						<em key={tokens.length} className="italic text-gray-900 dark:text-gray-100">
							{content}
						</em>
					);
				}

				remaining = remaining.substring(firstMatch.index + firstMatch[0].length);
			}

			return tokens.length > 0 ? tokens : str;
		};

		const lines = text.split("\n");
		return lines.map((line, index) => {
			const trimmed = line.trim();
			if (!trimmed) {
				return <div key={index} className="h-2"></div>;
			}

			// Handle bullet points
			if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
				const cleaned = trimmed.replace(/^[-*•]\s+/, "");
				return (
					<li key={index} className="list-disc ml-5 mb-1.5 text-gray-800 dark:text-gray-200">
						{renderInline(cleaned)}
					</li>
				);
			}

			// Handle numbered lists
			if (/^\d+\.\s+/.test(trimmed)) {
				const cleaned = trimmed.replace(/^\d+\.\s+/, "");
				return (
					<li key={index} className="list-decimal ml-5 mb-1.5 text-gray-800 dark:text-gray-200">
						{renderInline(cleaned)}
					</li>
				);
			}

			// Handle headings (e.g. ### Header or ## Header)
			if (trimmed.startsWith("#")) {
				const depth = (trimmed.match(/^#+/) || [""])[0].length;
				const cleaned = trimmed.replace(/^#+\s+/, "");
				const textClasses =
					depth === 1
						? "text-xl font-bold mt-3 mb-2 text-[#0073b1] dark:text-[#38bdf8]"
						: depth === 2
						? "text-lg font-semibold mt-2.5 mb-1.5 text-[#0073b1] dark:text-[#38bdf8]"
						: "text-base font-semibold mt-2 mb-1 text-gray-900 dark:text-gray-100";

				return (
					<div key={index} className={textClasses}>
						{renderInline(cleaned)}
					</div>
				);
			}

			// Standard paragraph
			return (
				<p key={index} className="mb-2 text-gray-800 dark:text-gray-200 leading-relaxed">
					{renderInline(line)}
				</p>
			);
		});
	};

	const handleClose = () => {
		dispatch(closeChat());
		setIsMinimized(false);
	};

	const handleMinimize = () => {
		setIsMinimized(true);
	};

	const handleMaximize = () => {
		setIsMinimized(false);
		dispatch(openChat());
	};

	return (
		<div className="fixed bottom-6 right-6 z-50 font-sans">
			{/* Floating Round Chat Bubble (Shown only when chat is fully closed) */}
			{!isOpen && (
				<button
					onClick={() => dispatch(toggleChat())}
					className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0073b1] text-white shadow-xl hover:bg-[#005582] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
					title="Chat with TalentSift AI"
				>
					<span className="absolute -inset-1 rounded-full bg-[#0073b1]/40 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></span>
					<svg
						className="h-8 w-8 transition-transform duration-300 group-hover:rotate-12"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
						/>
					</svg>
					{messages.length === 0 && (
						<span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 animate-pulse"></span>
					)}
				</button>
			)}

			{/* Minimized Header Tab (Shown only when minimized is active) */}
			{isOpen && isMinimized && (
				<div className="w-[320px] sm:w-[360px] bg-[#0073b1] text-white rounded-xl shadow-2xl border border-[#005582] flex items-center justify-between px-4 py-3 animate-bounce">
					<div className="flex items-center gap-2.5">
						<svg
							className="h-5 w-5 animate-pulse"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
							/>
						</svg>
						<span className="font-bold text-sm tracking-wide">
							TalentSift AI (Minimized)
						</span>
					</div>
					<div className="flex items-center gap-2">
						{/* Maximize */}
						<button
							onClick={handleMaximize}
							className="p-1.5 rounded-lg hover:bg-white/20 transition cursor-pointer"
							title="Maximize Chat Window"
						>
							<svg
								className="h-4.5 w-4.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
								/>
							</svg>
						</button>
						{/* Completely Cancel / Close */}
						<button
							onClick={handleClose}
							className="p-1.5 rounded-lg hover:bg-white/20 transition cursor-pointer"
							title="Close Chat completely"
						>
							<svg
								className="h-4.5 w-4.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>
			)}

			{/* Full Chat Drawer Container */}
			{isOpen && !isMinimized && (
				<div className="fixed sm:absolute bottom-0 right-0 sm:bottom-0 sm:right-0 w-full h-[100dvh] sm:h-[560px] sm:w-[400px] bg-white dark:bg-[#1a1a1a] rounded-t-3xl sm:rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-2xl flex flex-col transition-all duration-300 overflow-hidden transform origin-bottom-right animate-fade-in-up">
					{/* Header */}
					<div className="px-5 py-4 border-b border-gray-100 dark:border-neutral-800 bg-[#0073b1] text-white flex items-center justify-between shadow-md">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20">
								<svg
									className="h-6 w-6 animate-pulse"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<div>
								<h3 className="font-bold text-base tracking-wide flex items-center gap-2">
									TalentSift AI
								</h3>
								<span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white border border-white/10 shadow-sm">
									{role} Mode
								</span>
							</div>
						</div>

						<div className="flex items-center gap-1.5">
							{/* Clear History */}
							{messages.length > 0 && (
								<button
									onClick={handleClear}
									className="p-1.5 rounded-lg hover:bg-white/15 transition duration-200 cursor-pointer"
									title="Clear history"
								>
									<svg
										className="h-4.5 w-4.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							)}

							{/* Minimize */}
							<button
								onClick={handleMinimize}
								className="p-1.5 rounded-lg hover:bg-white/15 transition duration-200 cursor-pointer"
								title="Minimize chat drawer"
							>
								<svg
									className="h-4.5 w-4.5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M20 12H4"
									/>
								</svg>
							</button>

							{/* Cancel / Close */}
							<button
								onClick={handleClose}
								className="p-1.5 rounded-lg hover:bg-white/15 transition duration-200 cursor-pointer"
								title="Close chatbot"
							>
								<svg
									className="h-4.5 w-4.5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					</div>

					{/* Message Stream */}
					<div className="flex-1 overflow-y-auto p-5 bg-[#F4F2EE] dark:bg-[#121212] space-y-4">
						{/* Greeting Intro Message */}
						<div className="flex gap-3 max-w-[85%]">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0073b1] text-white shadow">
								<svg
									className="h-5 w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
									/>
								</svg>
							</div>
							<div className="rounded-2xl rounded-tl-sm bg-white dark:bg-neutral-800 p-4.5 text-sm border border-gray-100 dark:border-neutral-850 shadow-sm">
								<div>{renderMarkdown(getWelcomeMessage())}</div>
							</div>
						</div>

						{/* Conversations */}
						{messages.map((msg, index) => {
							const isBot = msg.role === "assistant";
							return (
								<div
									key={index}
									className={`flex gap-3 max-w-[85%] ${
										isBot ? "mr-auto" : "ml-auto flex-row-reverse"
									}`}
								>
									{isBot && (
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0073b1] text-white shadow">
											<svg
												className="h-5 w-5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
												/>
											</svg>
										</div>
									)}

									<div
										className={`rounded-2xl p-4.5 text-sm shadow-sm ${
											isBot
												? "rounded-tl-sm bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-850"
												: "rounded-tr-sm bg-[#0073b1] text-white"
										}`}
									>
										<div>{renderMarkdown(msg.content)}</div>
										<span
											className={`block text-[10px] mt-1.5 opacity-60 text-right ${
												isBot
													? "text-gray-400 dark:text-gray-500"
													: "text-blue-100"
											}`}
										>
											{msg.timestamp
												? new Date(msg.timestamp).toLocaleTimeString([], {
														hour: "2-digit",
														minute: "2-digit"
												  })
												: ""}
										</span>
									</div>
								</div>
							);
						})}

						{/* Typing loading indicator */}
						{isLoading && (
							<div className="flex gap-3 max-w-[85%] mr-auto items-center">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0073b1] text-white shadow">
									<svg
										className="h-5 w-5 animate-spin"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11h3v3"
										/>
									</svg>
								</div>
								<div className="rounded-2xl rounded-tl-sm bg-white dark:bg-neutral-850 p-4.5 text-sm border border-gray-150 dark:border-neutral-800 shadow-sm flex items-center gap-1.5 text-gray-400">
									<span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce delay-75"></span>
									<span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce delay-150"></span>
									<span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce delay-225"></span>
								</div>
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>

					{/* Input box */}
					<form
						onSubmit={handleSend}
						className="p-4 border-t border-gray-100 dark:border-neutral-800 bg-white dark:bg-[#1a1a1a] flex gap-2.5 items-center shadow-lg"
					>
						<input
							ref={inputRef}
							type="text"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							disabled={isLoading}
							placeholder="Type a message..."
							className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white focus:outline-none focus:border-[#0073b1] text-sm transition"
						/>
						<button
							type="submit"
							disabled={!input.trim() || isLoading}
							className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0073b1] text-white shadow-md hover:bg-[#005582] disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 cursor-pointer"
						>
							<svg
								className="h-5 w-5 transform rotate-90"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
								/>
							</svg>
						</button>
					</form>
				</div>
			)}
		</div>
	);
}

