"use client"; // For client-side rendering

import { useState } from "react";

const Home = () => {
  const [message] = useState("Welcome to TalentSift");

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <h1 style={{ fontSize: "48px", fontWeight: "bold" }}>
        {message}
      </h1>
    </div>
  );
};

export default Home;
