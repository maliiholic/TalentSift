"use client"; // For client-side rendering

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import Link from "next/link";
import axios from "axios";
import { Role_Action } from "@/Redux/Action";
import { persistor } from "@/Store";

const Home = () => {
  const dispatch = useDispatch();

  // Force-clear any lingering auth state when user lands on the Getting Started page
  useEffect(() => {
    try {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (e) {
      // localStorage not available
    }
    delete axios.defaults.headers.common["Authorization"];
    dispatch(Role_Action("Guest"));
    try {
      persistor.purge();
    } catch (e) {
      // ignore purge errors
    }
  }, [dispatch]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "40px", background: "radial-gradient(circle at top, #fef3c7 0%, #f4f2ee 45%, #e7edf8 100%)" }}>
      <div style={{ maxWidth: "760px", width: "100%", background: "rgba(255,255,255,0.72)", backdropFilter: "blur(18px)", border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: "28px", padding: "40px", boxShadow: "0 30px 80px rgba(15, 23, 42, 0.12)" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.2em", fontSize: "12px", color: "#7c2d12", marginBottom: "12px", fontWeight: 700 }}>TalentSift Practice Lab</p>
        <h1 style={{ fontSize: "clamp(40px, 7vw, 72px)", lineHeight: 1, margin: "0 0 16px", color: "#111827" }}>
          Practice interviews with AI feedback.
        </h1>
        <p style={{ fontSize: "18px", lineHeight: 1.7, color: "#374151", maxWidth: "58ch", marginBottom: "28px" }}>
          Generate role-specific questions, answer them, and get structured evaluation with scoring and rubric-based feedback.
        </p>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <Link href="/Users/Practice" style={{ padding: "14px 22px", borderRadius: "999px", background: "#111827", color: "white", textDecoration: "none", fontWeight: 700 }}>
            Open Practice Lab
          </Link>
          <span style={{ alignSelf: "center", color: "#6b7280" }}>Use your login token to start a session.</span>
        </div>
      </div>
    </div>
  );
};

export default Home;

