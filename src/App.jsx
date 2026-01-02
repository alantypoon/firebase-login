// src/App.jsx
import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, fetchSignInMethodsForEmail, onAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:6000';
const EMAIL_SERVICE = import.meta.env.VITE_EMAIL_SERVICE || 'SMTP'; // 'FIREBASE' or 'SMTP';

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

export default function App() {
    // TEST Values for Debugging
    let DEBUG_TESTING = false; // Toggle this to false in production
    // DEBUG_TESTING = true; // Toggle this to false in production

    const [email, setEmail] = useState(DEBUG_TESTING ? "alantypoon@gmail.com" : "");
    const [password, setPassword] = useState(DEBUG_TESTING ? "Uncertain829!" : "");
    const [isLogin, setIsLogin] = useState(true);
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [error, setError] = useState("");
    const [verificationSent, setVerificationSent] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [dialogMessage, setDialogMessage] = useState("");
    const [dialogType, setDialogType] = useState("error"); // "error", "success", or "processing"
    const [isProcessing, setIsProcessing] = useState(false);

    const [country, setCountry] = useState(DEBUG_TESTING ? "Hong Kong" : "");
    const [institution, setInstitution] = useState(DEBUG_TESTING ? "HKU" : "");
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState(DEBUG_TESTING ? "Uncertain829!" : "");
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Email Check Logic
    const [emailAvailable, setEmailAvailable] = useState(null);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [touched, setTouched] = useState({ email: false, password: false, confirm: false, country: false, institution: false });

    // Check email on blur
    const checkEmailAvailability = async (emailVal) => {
        if (!emailVal || isLogin) return;

        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            setCheckingEmail(true);
            try {
                // Check availability via Server API (MongoDB + Firebase)
                const response = await fetch('/api/check-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailVal })
                });
                const data = await response.json();
                setEmailAvailable(data.available);
            } catch (error) {
                console.error("Email check failed:", error);
                setEmailAvailable(null);
            } finally {
                setCheckingEmail(false);
            }
        }
    };

    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        if (field === 'email') {
            checkEmailAvailability(email);
        }
    };

    // Listen for Firebase auth state changes
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                // Check verification status based on email service
                let isVerified = false;
                if (EMAIL_SERVICE === 'FIREBASE') {
                    isVerified = currentUser.emailVerified;
                } else {
                    // For SMTP, check verification status from backend
                    try {
                        const verifyResponse = await fetch(`/api/verification-status/${currentUser.uid}`);
                        const verifyData = await verifyResponse.json();
                        isVerified = verifyData.verified;
                    } catch (err) {
                        console.error("Error checking verification status:", err);
                        isVerified = false;
                    }
                }

                if (isVerified) {
                    setUser(currentUser);
                } else {
                    // User exists but not verified
                    setUser(null);
                }
            } else {
                // No user logged in - this fires on logout
                setUser(null);
                setUserProfile(null);
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const handleForgotPassword = async () => {
        if (!email) {
            setDialogMessage("Please enter your email address to reset password.");
            setDialogType("error");
            setShowDialog(true);
            return;
        }

        try {
            setDialogMessage("Sending password reset email...");
            setDialogType("processing");
            setShowDialog(true);

            // Use custom backend endpoint for SMTP email
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();

            if (data.success) {
                setDialogMessage(`Password reset email sent to ${email}. Please check your inbox.`);
                setDialogType("success");
                setShowDialog(true);
            } else {
                throw new Error(data.message || data.error || "Failed to send reset email");
            }
        } catch (error) {
            console.error("Password reset error:", error);
            setDialogMessage(error.message);
            setDialogType("error");
            setShowDialog(true);
        }
    };

    const saveUserToMongo = async (userData) => {
        try {
            console.log("Saving user to MongoDB:", userData);
            // const backendPort = process.env.LISTEN_PORT || 6000;
            const url = `/api/users`;
            console.log(`[Frontend] Calling Backend API: POST ${url}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
            console.log(`[Frontend] API Response Status: ${response.status}`);
            const data = await response.json();
            if (!data.success) {
                console.error("Failed to save to MongoDB:", data.error);
            } else {
                console.log("Successfully saved to MongoDB:", data);
            }
        } catch (err) {
            console.error("Error calling MongoDB API:", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Strict Password Validation for Signup
        if (!isLogin) {
            const pwdErr = getPasswordError(password);
            if (pwdErr) {
                setDialogMessage(pwdErr);
                setDialogType("error");
                setShowDialog(true);
                return;
            }
            if (password !== confirmPassword) {
                setDialogMessage("Passwords do not match.");
                setDialogType("error");
                setShowDialog(true);
                return;
            }
            if (emailAvailable === false && !DEBUG_TESTING) {
                setDialogMessage("This email address is already in use.");
                setDialogType("error");
                setShowDialog(true);
                return;
            }
        } else {
            if (password.length < 1) return;
        }

        // Show processing dialog
        setDialogMessage(isLogin ? "Logging in..." : "Creating account...");
        setDialogType("processing");
        setShowDialog(true);
        setIsProcessing(true);

        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            if (isLogin) {
                // --- LOGIN FLOW ---
                const userCredential = await signInWithEmailAndPassword(auth, email, password);

                let isVerified = false;
                if (EMAIL_SERVICE === 'FIREBASE') {
                    isVerified = userCredential.user.emailVerified;
                } else {
                    const verifyResponse = await fetch(`/api/verification-status/${userCredential.user.uid}`);
                    const verifyData = await verifyResponse.json();
                    isVerified = verifyData.verified;
                }

                if (!isVerified) {
                    setDialogMessage("Please verify your email address before logging in.");
                    setDialogType("error");
                    setShowDialog(true);
                    await auth.signOut();
                    return;
                }

                setUser(userCredential.user);

                // Log login
                try {
                    fetch('/api/logins', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            uid: userCredential.user.uid,
                            email: userCredential.user.email
                        })
                    }).catch(err => console.error("Error logging login:", err));
                } catch (e) { console.error("Error logging login:", e); }

                // Load profile
                try {
                    const response = await fetch(`/api/users/${userCredential.user.uid}`);
                    if (response.ok) {
                        const data = await response.json();
                        setUserProfile(data.user);
                    } else {
                        setUserProfile({ country: "Not set", institution: "Not set" });
                    }
                } catch (err) {
                    setUserProfile({ country: "Not set", institution: "Not set" });
                }

                setShowDialog(false);

            } else {
                // --- SIGNUP FLOW ---
                try {
                    // 1. Debug: Check if user exists (Optional pre-check logic can go here, but we rely on catch for now)
                    if (DEBUG_TESTING) {
                        // NOTE: If we wanted to "delete" the user first as per earlier logic, we could.
                        // But the request is "allow email already registered to proceed".
                        // So we will rely on catching the error or checking first.
                        // Let's stick to the requested behavior: Try create, if fail with email-in-use, try login.
                    }

                    // 2. Create User
                    console.log("[Frontend] Creating Firebase user...");
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                    // 3. Success (New User)
                    await saveUserToMongo({
                        uid: userCredential.user.uid,
                        email: userCredential.user.email,
                        country,
                        institution
                    });

                    // 4. Send Verification
                    if (EMAIL_SERVICE === 'FIREBASE') {
                        await sendEmailVerification(userCredential.user);
                    } else {
                        const verifyResponse = await fetch('/api/send-verification', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: userCredential.user.email, uid: userCredential.user.uid })
                        });
                        if (!verifyResponse.ok) throw new Error('Failed to send verification email');
                    }

                    await auth.signOut();
                    setShowDialog(false);
                    setVerificationSent(true);

                } catch (signupError) {
                    // --- HANDLE SIGNUP ERRORS ---
                    if (DEBUG_TESTING && signupError.code === 'auth/email-already-in-use') {
                        console.warn("Email exists. Debug mode: Attempting to recover via login...");
                        try {
                            const recovered = await signInWithEmailAndPassword(auth, email, password);
                            // Update mongo
                            await saveUserToMongo({
                                uid: recovered.user.uid,
                                email: recovered.user.email,
                                country,
                                institution
                            });
                            // Resend verification
                            if (EMAIL_SERVICE === 'FIREBASE') {
                                await sendEmailVerification(recovered.user);
                            } else {
                                await fetch('/api/send-verification', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email: recovered.user.email, uid: recovered.user.uid })
                                });
                            }

                            await auth.signOut();
                            setShowDialog(false);
                            setVerificationSent(true);
                            return;
                        } catch (recErr) {
                            try {
                                console.warn("Recovery login failed (wrong password?). Debug mode: Force deleting user and retrying...");

                                // Call debug delete endpoint
                                await fetch('/api/debug/delete-user', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email })
                                });

                                // Retry Create User
                                console.log("[Frontend] Retrying creation after force delete...");
                                const newUserCredential = await createUserWithEmailAndPassword(auth, email, password);

                                await saveUserToMongo({
                                    uid: newUserCredential.user.uid,
                                    email: newUserCredential.user.email,
                                    country,
                                    institution
                                });

                                if (EMAIL_SERVICE === 'FIREBASE') {
                                    await sendEmailVerification(newUserCredential.user);
                                } else {
                                    await fetch('/api/send-verification', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ email: newUserCredential.user.email, uid: newUserCredential.user.uid })
                                    });
                                }

                                await auth.signOut();
                                setShowDialog(false);
                                setVerificationSent(true);
                                return;

                            } catch (retryErr) {
                                console.error("Force delete and retry failed:", retryErr);
                                setDialogMessage("Error during debug cleanup: " + retryErr.message);
                                setDialogType("error");
                                setShowDialog(true);
                            }
                            return;
                        }
                    }
                    throw signupError;
                }
            }
        } catch (err) {
            console.error("Auth process error:", err);
            let msg = "Something went wrong. Please try again.";
            const m = err.message || "";

            if (m.includes("auth/invalid-credential")) msg = "Incorrect email or password.";
            else if (m.includes("auth/user-not-found")) msg = "Account not found.";
            else if (m.includes("auth/wrong-password")) msg = "Incorrect password.";
            else if (m.includes("auth/email-already-in-use")) msg = "This email is already registered.";
            else if (m.includes("auth/too-many-requests")) msg = "Too many attempts. Please try again later.";
            else if (m.includes("auth/invalid-email")) msg = "Please enter a valid email address.";

            setDialogMessage(msg);
            setDialogType("error");
            setShowDialog(true);
        } finally {
            setIsProcessing(false);
        }
    };

    const logout = async () => {
        if (user) {
            try {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        uid: user.uid,
                        email: user.email
                    })
                });
            } catch (err) {
                console.error("Error logging logout:", err);
            }
        }
        await auth.signOut();
        setUserProfile(null);
        setUser(null);

        // reload instead of showing blank screen
        showLoginScreen();
    };
    const showLoginScreen = () => {
        setIsLogin(true);
        setShowDialog(false);
        window.location.reload();
    };

    const renderDialog = () => (
        showDialog && (
            <div className="dialog-overlay" onClick={() => dialogType !== "loading" && dialogType !== "processing" && setShowDialog(false)}>
                <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
                    {(dialogType === "loading" || dialogType === "processing") ? (
                        <>
                            <div className="spinner"></div>
                            <h2 className="dialog-title">Please Wait</h2>
                            <p className="dialog-message">{dialogMessage}</p>
                        </>
                    ) : (
                        <>
                            <div className={`dialog-icon ${dialogType}`}>
                                {dialogType === "error" ? "⚠️" : "✓"}
                            </div>
                            <h2 className="dialog-title">{dialogType === "error" ? "Error" : "Success"}</h2>
                            <p className="dialog-message">{dialogMessage}</p>
                            <button onClick={() => setShowDialog(false)} className="btn primary-btn dialog-btn">
                                OK
                            </button>
                        </>
                    )}
                </div>
            </div>
        )
    );

    if (verificationSent) {
        return (
            <div className="container">
                <h1>Verify Your Email</h1>
                <p className="success-msg">
                    A verification email has been sent to <strong>{email}</strong>.
                    Please check your inbox and click the verification link to complete your registration.
                </p>
                <p>After verifying your email, you can log in.</p>
                <button onClick={() => { setVerificationSent(false); setIsLogin(true); }} className="btn primary-btn">
                    Go to Login
                </button>
            </div>
        );
    }

    if (user) {
        return (
            <>
                {renderDialog()}
                <div className="container">
                    <h1>Welcome, {user.email}</h1>
                    {userProfile ? (
                        <div className="profile-info">
                            <p><strong>Country:</strong> {userProfile.country}</p>
                            <p><strong>Institution:</strong> {userProfile.institution}</p>
                        </div>
                    ) : (
                        <div className="profile-info">
                            <p style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>Loading profile...</p>
                        </div>
                    )}
                    <button onClick={logout} className="btn logout-btn">Logout</button>
                </div>
            </>
        );
    }

    return (
        <>
            {renderDialog()}
            <div className="container">
                <h1>{isLogin ? "Sign in" : "Create Account"}</h1>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div style={{ position: "relative" }}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (!isLogin) setEmailAvailable(null);
                            }}
                            onBlur={() => handleBlur('email')}
                            required
                            className="input-field"
                            style={!isLogin && touched.email && emailAvailable === false ? { borderColor: '#ff5252' } : {}}
                        />
                        {!isLogin && touched.email && email.length > 0 && (() => {
                            if (checkingEmail) return <ValidationIcon status="loading" />;
                            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return <ValidationIcon status="error" text="Invalid email format" />;
                            if (emailAvailable === false) return <ValidationIcon status="error" text="Account already exists" />;
                            if (emailAvailable === true) return <ValidationIcon status="success" />;
                            return null;
                        })()}
                    </div>
                    <div className="password-wrapper" style={{ position: "relative" }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => handleBlur('password')}
                            required
                            className="input-field"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="reveal-btn"
                            style={{ right: !isLogin && touched.password && password.length > 0 ? '40px' : '10px' }}
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                        {!isLogin && touched.password && password.length > 0 && (() => {
                            const err = getPasswordError(password);
                            return err
                                ? <ValidationIcon status="error" text={err} />
                                : <ValidationIcon status="success" />;
                        })()}
                    </div>
                    {!isLogin && password.length > 0 && (
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
                    {isLogin && (
                        <div style={{ textAlign: "right", marginTop: "8px", marginBottom: "8px" }}>
                            <span
                                onClick={handleForgotPassword}
                                className="toggle-link"
                                style={{ fontSize: "0.9rem" }}
                            >
                                Forgot Password?
                            </span>
                        </div>
                    )}
                    {!isLogin && (
                        <>
                            <div className="password-wrapper" style={{ position: "relative" }}>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onBlur={() => handleBlur('confirm')}
                                    required
                                    className="input-field"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="reveal-btn"
                                    style={{ right: !isLogin && touched.confirm && confirmPassword.length > 0 ? '40px' : '10px' }}
                                >
                                    {showConfirmPassword ? "Hide" : "Show"}
                                </button>
                                {touched.confirm && confirmPassword.length > 0 && (
                                    confirmPassword !== password
                                        ? <ValidationIcon status="error" text="Passwords do not match" />
                                        : (confirmPassword.length >= 6 ? <ValidationIcon status="success" /> : null)
                                )}
                            </div>
                            <div style={{ position: "relative" }}>
                                <input
                                    type="text"
                                    placeholder="Country"
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    onBlur={() => handleBlur('country')}
                                    required
                                    className="input-field"
                                />
                                {touched.country && country.length > 0 && (
                                    <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "green", fontSize: "1.2em" }}>✓</span>
                                )}
                            </div>
                            <div style={{ position: "relative" }}>
                                <input
                                    type="text"
                                    placeholder="Institution"
                                    value={institution}
                                    onChange={(e) => setInstitution(e.target.value)}
                                    onBlur={() => handleBlur('institution')}
                                    required
                                    className="input-field"
                                />
                                {touched.institution && institution.length > 0 && (
                                    <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "green", fontSize: "1.2em" }}>✓</span>
                                )}
                            </div>
                        </>
                    )}
                    <button type="submit" className="btn primary-btn" style={{ fontWeight: 'bold' }}>
                        {isLogin ? "Sign in" : "Create Account"}
                    </button>
                </form>
                <p className="toggle-text">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <span onClick={() => setIsLogin(!isLogin)} className="toggle-link">
                        {isLogin ? " Sign Up" : " Sign in"}
                    </span>
                </p>
            </div>
        </>
    );
}
