import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState(""); // "excess", "error", "loading"
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password.length < 6) {
            setMessage("Password must be at least 6 characters long");
            setStatus("error");
            return;
        }

        if (password !== confirmPassword) {
            setMessage("Passwords do not match");
            setStatus("error");
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
            setMessage("Invalid or missing reset token");
            setStatus("error");
            return;
        }

        setMessage("Resetting password...");
        setStatus("loading");

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            });
            const data = await response.json();

            if (data.success) {
                setMessage("Password reset successfully! Redirecting to login...");
                setStatus("success");
                setTimeout(() => navigate('/'), 3000);
            } else {
                setMessage(data.error || "Failed to reset password");
                setStatus("error");
            }
        } catch (error) {
            console.error("Reset error:", error);
            setMessage("An error occurred. Please try again.");
            setStatus("error");
        }
    };

    return (
        <div className="container">
            <h1>Reset Password</h1>
            <div className={`status-message ${status}`} style={{
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px',
                backgroundColor: status === 'error' ? '#ffeeee' : status === 'success' ? '#eeffee' : 'transparent',
                color: status === 'error' ? 'red' : status === 'success' ? 'green' : 'inherit',
                display: message ? 'block' : 'none'
            }}>
                {message}
            </div>

            {status !== 'success' && (
                <form onSubmit={handleSubmit} className="auth-form">
                    <input
                        type="password"
                        placeholder="New Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="input-field"
                    />
                    <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="input-field"
                    />
                    <button type="submit" className="btn primary-btn" disabled={status === 'loading'}>
                        {status === 'loading' ? 'Processing...' : 'Reset Password'}
                    </button>
                </form>
            )}

            <p className="toggle-text">
                <span onClick={() => navigate('/')} className="toggle-link">Back to Login</span>
            </p>
        </div>
    );
}
