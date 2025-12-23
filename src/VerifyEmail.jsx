// src/VerifyEmail.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function VerifyEmail() {
    const [status, setStatus] = useState("verifying"); // "verifying", "success", "error"
    const [message, setMessage] = useState("Verifying your email...");
    const navigate = useNavigate();

    const verificationAttempted = React.useRef(false);

    useEffect(() => {
        const verifyEmail = async () => {
            if (verificationAttempted.current) return;
            verificationAttempted.current = true;

            const params = new URLSearchParams(window.location.search);
            const token = params.get("token");

            if (!token) {
                setStatus("error");
                setMessage("Invalid verification link");
                return;
            }

            try {
                const response = await fetch(`/api/verify-email?token=${token}`);
                const data = await response.json();

                if (response.ok) {
                    setStatus("success");
                    setMessage("Email is verified");
                    // Redirect to login after 3 seconds
                    setTimeout(() => {
                        navigate("/");
                    }, 3000);
                } else {
                    setStatus("error");
                    setMessage(data.error || "Verification failed");
                }
            } catch (error) {
                setStatus("error");
                setMessage("An error occurred during verification");
            }
        };

        verifyEmail();
    }, [navigate]);

    return (
        <div className="container">
            <div className={`dialog-icon ${status}`}>
                {status === "verifying" && <div className="spinner"></div>}
                {status === "success" && "✓"}
                {status === "error" && "⚠️"}
            </div>
            <h1>{status === "verifying" ? "Verifying..." : status === "success" ? "Success!" : "Error"}</h1>
            <p className="dialog-message">{message}</p>
            {status === "success" && (
                <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.9rem" }}>
                    Redirecting to login...
                </p>
            )}
            {status === "error" && (
                <button onClick={() => navigate("/")} className="btn primary-btn">
                    Go to Login
                </button>
            )}
        </div>
    );
}
