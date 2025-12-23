import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ValidationIcon = ({ status, text }) => {
    if (status === 'loading') return <span className="validation-icon" style={{ color: '#999' }}>...</span>;
    if (status === 'success') return <span className="validation-icon success">✓</span>;
    if (status === 'error') return (
        <span className="validation-icon error">
            ✗
            <span className="tooltip">{text}</span>
        </span>
    );
    return null;
};

const hasSequential = (str) => {
    const s = str.toLowerCase();
    for (let i = 0; i < s.length - 2; i++) {
        const c1 = s.charCodeAt(i);
        const c2 = s.charCodeAt(i + 1);
        const c3 = s.charCodeAt(i + 2);
        if (c1 + 1 === c2 && c2 + 1 === c3) return true;
    }
    return false;
}

const getPasswordError = (p) => {
    if (p.length < 12) return "Password must be at least 12 characters";
    if (p.length > 128) return "Password is too long";
    if (/(.)\1\1/.test(p)) return "Don't repeat characters 3+ times (e.g. 'aaa')";
    if (hasSequential(p)) return "Don't use sequences (e.g. 123, abc)";

    let complx = 0;
    if (/[a-z]/.test(p)) complx++;
    if (/[A-Z]/.test(p)) complx++;
    if (/\d/.test(p)) complx++;
    if (/[^a-zA-Z0-9]/.test(p)) complx++;
    if (complx < 3) return "Mix upper, lower, numbers, symbols (3+ types)";

    return null; // Valid
};

const getStrengthClass = (p) => {
    if (!p) return "";
    const err = getPasswordError(p);
    if (!err) return "strength-strong"; // Valid
    if (p.length >= 8) return "strength-medium"; // Decent length but fails details
    return "strength-weak";
};

const getStrengthLabel = (p) => {
    if (!p) return "";
    const err = getPasswordError(p);
    if (!err) return "Strong";
    if (p.length >= 8) return "Medium";
    return "Weak";
};

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState(""); // "excess", "error", "loading", "success"
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const pwdErr = getPasswordError(password);
        if (pwdErr) {
            setMessage(pwdErr);
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
                    <div className="password-wrapper" style={{ position: "relative" }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="New Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="input-field"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="reveal-btn"
                            style={{ right: '10px' }}
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>

                    {password.length > 0 && (
                        <div>
                            <div className={`strength-meter ${getStrengthClass(password)}`}>
                                <div className="strength-bar bar-1"></div>
                                <div className="strength-bar bar-2"></div>
                                <div className="strength-bar bar-3"></div>
                            </div>
                            <div className="strength-label">
                                {getStrengthLabel(password)}
                            </div>
                        </div>
                    )}

                    <div className="password-wrapper" style={{ position: "relative" }}>
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="input-field"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="reveal-btn"
                            style={{ right: '10px' }}
                        >
                            {showConfirmPassword ? "Hide" : "Show"}
                        </button>
                    </div>

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
