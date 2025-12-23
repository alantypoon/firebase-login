const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email Configuration
const smtpPort = parseInt(process.env.SMTP_OUTGOING_PORT || '587');
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_OUTGOING_SERVER,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    logger: true, // log to console
    debug: true, // include SMTP traffic in the logs
    connectionTimeout: 60000, // 60 seconds
    socketTimeout: 60000, // 60 seconds
    auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false // Accept self-signed certificates
    }
});

console.log(`[EMAIL] Configured Transporter: Host=${process.env.SMTP_OUTGOING_SERVER}, Port=${smtpPort}, Secure=${smtpPort === 465}, User=${process.env.SMTP_USERNAME}`);

if (!process.env.SMTP_PASSWORD) {
    console.warn('[EMAIL] WARNING: SMTP_PASSWORD is not defined or empty. Email sending will likely fail.');
}

async function sendVerificationEmail(toEmail, verificationToken) {
    console.log(`[EMAIL] Preparing to send verification email to: ${toEmail}`);

    const verificationLink = `${process.env.WEBSITE_URL || 'http://localhost:6000'}/verify?token=${verificationToken}`;

    const mailOptions = {
        from: `"SuperTA" <${process.env.SMTP_EMAIL || process.env.SMTP_USERNAME}>`,
        to: toEmail,
        subject: "Verify Your Email Address",
        text: `Please verify your email address by clicking this link: ${verificationLink}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4a90e2;">Verify Your Email Address</h2>
                <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
                <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #4a90e2; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Verify Email</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="color: #666; word-break: break-all;">${verificationLink}</p>
                <p style="color: #999; font-size: 12px; margin-top: 32px;">If you didn't create an account, you can safely ignore this email.</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Verification email sent to ${toEmail}. Message ID: ${info.messageId}`);
        
        if (db) {
            try {
                await db.collection('sending_emails').insertOne({
                    to: toEmail,
                    subject: mailOptions.subject,
                    content: mailOptions.html || mailOptions.text,
                    type: 'verification',
                    messageId: info.messageId,
                    timestamp: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Hong_Kong", hour12: false }).replace(" ", "T") + "+08:00"
                });
            } catch (logErr) {
                console.error("[EMAIL] Error logging email:", logErr);
            }
        }
        return info;
    } catch (error) {
        console.error("[EMAIL] Error sending verification email:", error);
        throw error;
    }
}

async function sendConfirmationEmail(toEmail) {
    console.log(`[EMAIL] Preparing to send email to: ${toEmail}`);
    const mailOptions = {
        from: `"${process.env.SMTP_USERNAME}" <${process.env.SMTP_EMAIL || process.env.SMTP_USERNAME}>`, // sender address
        to: toEmail, // list of receivers
        subject: "Welcome to Our Service!", // Subject line
        text: "Thank you for signing up! We are excited to have you on board.", // plain text body
        html: "<b>Thank you for signing up!</b><br>We are excited to have you on board.", // html body
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Confirmation email sent to ${toEmail}. Message ID: ${info.messageId}`);

        if (db) {
            try {
                await db.collection('sending_emails').insertOne({
                    to: toEmail,
                    subject: mailOptions.subject,
                    content: mailOptions.html || mailOptions.text,
                    type: 'confirmation',
                    messageId: info.messageId,
                    timestamp: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Hong_Kong", hour12: false }).replace(" ", "T") + "+08:00"
                });
            } catch (logErr) {
                console.error("[EMAIL] Error logging email:", logErr);
            }
        }
        return info;
    } catch (error) {
        console.error("[EMAIL] Error sending email:", error);
        throw error;
    }
}

async function sendPasswordResetEmailSMTP(toEmail, resetLink) {
    console.log(`[EMAIL] Preparing to send password reset email to: ${toEmail}`);
    const mailOptions = {
        from: `"SuperTA Support" <${process.env.SMTP_EMAIL || process.env.SMTP_USERNAME}>`,
        to: toEmail,
        subject: "Reset Your Password",
        text: `You requested a password reset. Click here to reset your password: ${resetLink}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4a90e2;">Reset Your Password</h2>
                <p>You have requested to reset your password. Click the button below to proceed:</p>
                <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #d9534f; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
                <p>Or copy and paste this link:</p>
                <p style="color: #666; word-break: break-all;">${resetLink}</p>
                <p style="color: #999; font-size: 12px;">Link expires in 1 hour.</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Password reset email sent to ${toEmail}. Message ID: ${info.messageId}`);

        if (db) {
            try {
                await db.collection('sending_emails').insertOne({
                    to: toEmail,
                    subject: mailOptions.subject,
                    content: mailOptions.html || mailOptions.text,
                    type: 'reset_password',
                    messageId: info.messageId,
                    timestamp: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Hong_Kong", hour12: false }).replace(" ", "T") + "+08:00"
                });
            } catch (logErr) {
                console.error("[EMAIL] Error logging email:", logErr);
            }
        }
        return info;
    } catch (error) {
        console.error("[EMAIL] Error sending password reset email:", error);
        throw error;
    }
}

const app = express();
const port = process.env.LISTEN_PORT || 6000;

app.get('/', (req, res) => {
    res.send('API Server is running');
});

// Middleware
app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[API] ${req.method} request to ${req.url}`);
    if (req.method !== 'GET') {
        console.log(`[API] Body:`, JSON.stringify(req.body, null, 2));
    }
    console.log(`[API] Query Params:`, JSON.stringify(req.query, null, 2));
    console.log(`[API] Headers:`, JSON.stringify(req.headers, null, 2));
    next();
});

// MongoDB Connection
const uri = process.env.MONGODB_URL || process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'firebase';
let db;
let client; // Expose client locally

async function connectToMongo() {
    try {
        if (!uri) {
            throw new Error("MONGODB_URL or MONGODB_URI is not defined in environment variables");
        }

        client = new MongoClient(uri); // Assign to global
        await client.connect();

        console.log(`[DB] Connected successfully to MongoDB at ${uri.split('@')[1] || 'localhost'}`);
        db = client.db(dbName);
    } catch (error) {
        console.error("[DB] MongoDB connection error:", error);
        // Don't exit process in dev if DB fails, valid for testing UI
        // process.exit(1); 
    }
}

connectToMongo();

// Firebase Admin Initialization (Conditional)
let admin;
try {
    const serviceAccount = require('./service-account.json');
    const firebaseAdmin = require('firebase-admin');

    // Check if app already initialized
    if (firebaseAdmin.apps.length === 0) {
        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccount)
        });
    }
    admin = firebaseAdmin;
    console.log('[FIREBASE ADMIN] Initialized successfully.');
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        if (error.message.includes('firebase-admin')) {
            console.warn('[FIREBASE ADMIN] "firebase-admin" module not found. Password reset verification will fail. Run "npm install firebase-admin".');
        } else if (error.message.includes('service-account.json')) {
            console.warn('[FIREBASE ADMIN] "service-account.json" not found. Password reset verification will fail. Please add it to root.');
        }
    } else {
        console.error('[FIREBASE ADMIN] Initialization failed:', error);
    }
}

// Reset Password Confirm Endpoint
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        console.log(`[API] Processing password reset with token: ${token}`);

        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ resetToken: token });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        if (new Date() > user.resetExpires) {
            return res.status(400).json({ error: 'Reset token has expired' });
        }

        if (!admin) {
            console.error('[API] Cannot reset password: Firebase Admin not initialized');
            return res.status(500).json({ error: 'Server configuration error: Cannot update password (Admin SDK missing)' });
        }

        // Update password in Firebase Auth
        await admin.auth().updateUser(user.uid, {
            password: newPassword
        });

        // Clear reset token
        await usersCollection.updateOne(
            { _id: user._id },
            { $unset: { resetToken: "", resetExpires: "" } }
        );

        console.log(`[API] Password updated for user: ${user.email}`);

        // Log reset password event
        // Use 'logins' database as requested
        const loginsCollection = db.collection('logins');
        // We often don't have the IP in the request body for reset-password form, but we can extract it from connection
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip; 
        // Note: getClientIp helper is defined lower in the file, we can duplicate logic or move helper up. 
        // For simplicity and avoiding massive refactor, I'll use the request directly or move helper if needed.
        // Actually getClientIp is defined at line 430. I cannot use it easily here without moving it.
        // I will just use `req.ip` or standard header check here for now, or assume the user wants me to use the helper which would require moving it.
        // Let's look at getClientIp at 430. I'll simply duplicate the small logic to be safe and self-contained or better, move getClientIp to top?
        // Moving getClientIp is cleaner but touches more lines. I'll just replicate the simple extraction:
        const clientIp = req.query.client_ip || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;

        // Use getHKTimestamp if available (it is defined at line 435, so NOT available here at line 200~).
        // I need to use `new Date()` or check where getHKTimestamp is defined.
        // getHKTimestamp is defined at line 435. So I cannot use it here.
        // I will just use `new Date()` for now, or define a local ISO string.
        const timestamp = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Hong_Kong", hour12: false }).replace(" ", "T") + "+08:00";

        await loginsCollection.insertOne({
            uid: user.uid,
            email: user.email,
            ip: clientIp,
            action: 'change_password',
            timestamp: timestamp
        });

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error('[API] Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password: ' + error.message });
    }
});

// Forgot Password Endpoint
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        console.log(`[API] received forgot-password request for: ${email}`);

        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ email });

        if (!user) {
            console.log(`[API] Password reset requested for non-existent email: ${email}`);
            // Return success to avoid enumeration
            return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
        }

        // Generate token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

        // Save token to user document
        await usersCollection.updateOne(
            { email },
            { $set: { resetToken, resetExpires } }
        );

        // Send email
        const resetLink = `${process.env.WEBSITE_URL || 'http://localhost:6000'}/reset-password?token=${resetToken}`;
        await sendPasswordResetEmailSMTP(email, resetLink);

        console.log(`[API] Password reset link sent to ${email}`);

        // Log reset password request event
        const loginsCollection = db.collection('logins');
        const clientIp = req.query.client_ip || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
        const timestamp = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Hong_Kong", hour12: false }).replace(" ", "T") + "+08:00";

        // Note: We use user.uid since 'user' was found above
        await loginsCollection.insertOne({
            uid: user.uid,
            email: user.email,
            ip: clientIp,
            action: 'reset_password', // This logs the "email sent" event as requested
            timestamp: timestamp
        });

        res.json({ success: true, message: 'Password reset link sent' });

    } catch (error) {
        console.error('[API] Error sending password reset:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send verification email endpoint
app.post('/api/send-verification', async (req, res) => {
    try {
        const { email, uid } = req.body;

        if (!email || !uid) {
            return res.status(400).json({ error: 'Email and UID are required' });
        }

        console.log(`[API] Sending verification email to: ${email}`);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store token in database
        const tokensCollection = db.collection('verification_tokens');
        await tokensCollection.updateOne(
            { uid },
            {
                $set: {
                    email,
                    token: verificationToken,
                    expiresAt: tokenExpiry,
                    verified: false,
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );

        // Send verification email
        await sendVerificationEmail(email, verificationToken);

        res.json({ success: true, message: 'Verification email sent' });
    } catch (error) {
        console.error('[API] Error sending verification email:', error);
        res.status(500).json({ error: 'Failed to send verification email' });
    }
});

// Verify email token endpoint
app.get('/api/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        console.log(`[API] Verifying token: ${token}`);

        const tokensCollection = db.collection('verification_tokens');
        const tokenDoc = await tokensCollection.findOne({ token });

        if (!tokenDoc) {
            return res.status(404).json({ error: 'Invalid verification token' });
        }

        if (tokenDoc.verified) {
            return res.status(400).json({ error: 'Email has already verified' });
        }

        if (new Date() > tokenDoc.expiresAt) {
            return res.status(400).json({ error: 'Verification token has expired' });
        }

        // Mark as verified
        await tokensCollection.updateOne(
            { token },
            { $set: { verified: true, verifiedAt: new Date() } }
        );

        console.log(`[DB] Email verified for uid: ${tokenDoc.uid}`);
        res.json({ success: true, message: 'Email verified successfully', email: tokenDoc.email });
    } catch (error) {
        console.error('[API] Error verifying email:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

// Check verification status endpoint
app.get('/api/verification-status/:uid', async (req, res) => {
    try {
        const { uid } = req.params;

        const tokensCollection = db.collection('verification_tokens');
        const tokenDoc = await tokensCollection.findOne({ uid });

        if (!tokenDoc) {
            return res.json({ verified: false });
        }

        res.json({ verified: tokenDoc.verified || false, email: tokenDoc.email });
    } catch (error) {
        console.error('[API] Error checking verification status:', error);
        res.status(500).json({ error: 'Failed to check verification status' });
    }
});

// Routes

// Check email availability (Server-side check)
app.post('/api/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        let exists = false;

        // 1. Check MongoDB
        const usersCollection = db.collection('users');
        const userInMongo = await usersCollection.findOne({ email });
        if (userInMongo) exists = true;

        // 2. Check Firebase Admin (if available and not already found)
        if (!exists && admin) {
            try {
                await admin.auth().getUserByEmail(email);
                exists = true; // No error means found
            } catch (error) {
                if (error.code !== 'auth/user-not-found') {
                    console.error("[API] Firebase Admin check error:", error);
                }
            }
        }

        res.json({ available: !exists });
    } catch (error) {
        console.error("[API] Check email error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.delete('/api/users/:email', async (req, res) => {
    try {
        const { email } = req.params;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        console.log(`[API] Deleting user with email: ${email}`);

        const usersCollection = db.collection('users');
        const result = await usersCollection.deleteOne({ email: email });

        if (result.deletedCount > 0) {
            console.log(`[DB] Successfully deleted user ${email} from MongoDB`);
        } else {
            console.log(`[DB] User ${email} not found in MongoDB`);
        }

        res.json({ success: true, message: 'User deleted if existed', result });
    } catch (error) {
        console.error("[API] Error deleting user:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
const getClientIp = (req) => {
    // Check query param first (from Nginx), then headers
    return req.query.client_ip || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
};

const getHKTimestamp = () => {
    // Return formatted string: YYYY-MM-DD HH:mm:ss (HKT)
    // Using sv-SE locale provides ISO-like YYYY-MM-DD
    const str = new Date().toLocaleString("sv-SE", {
        timeZone: "Asia/Hong_Kong",
        hour12: false
    });
    return str.replace(" ", "T") + "+08:00";
};

app.post('/api/users', async (req, res) => {
    try {
        const { uid, email, country, institution } = req.body;

        if (!uid || !email) {
            console.log(`[API] Error: Missing required fields (uid: ${uid}, email: ${email})`);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`[API] Saving user: ${email} (${uid})`);

        const usersCollection = db.collection('users');
        const ip = getClientIp(req);
        const now = getHKTimestamp();

        const updateData = {
            email,
            country: country || "",
            institution: institution || "",
            updatedAt: now,
            lastIp: ip
        };

        // If it's a new user (first time save), add createdAt
        // We use upsert, so we can't easily distinguish insert vs update for createdAt efficiently in one go without $setOnInsert
        // But sending createdAt from client or just setting it if missing is fine.

        // Cleanup: Remove any other user records with this email but different UID
        // This prevents duplicate emails in DB if a Firebase user is deleted and re-created
        await usersCollection.deleteMany({ 
            email: email, 
            uid: { $ne: uid } 
        });

        const result = await usersCollection.updateOne(
            { uid: uid },
            {
                $set: updateData,
                $setOnInsert: {
                    createdAt: now,
                    signupIp: ip
                }
            },
            { upsert: true }
        );

        console.log(`[DB] User save result: matched=${result.matchedCount}, modified=${result.modifiedCount}, upserted=${result.upsertedCount}`);

        // Send confirmation email if a new user was created
        if (result.upsertedCount > 0) {
            // console.log(`[EMAIL] New user detected. Sending confirmation email to ${email}...`);
            // sendConfirmationEmail(email).catch(err => console.error("[EMAIL] Error sending confirmation email:", err));
        }

        res.json({ success: true, message: 'User saved/updated', result });
    } catch (error) {
        console.error("[API] Error saving user:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Log Login Endpoint
app.post('/api/logins', async (req, res) => {
    try {
        const { uid, email } = req.body;
        if (!uid || !email) return res.status(400).json({ error: 'Missing uid or email' });

        const ip = getClientIp(req);
        console.log(`[API] Logging login for ${email} from ${ip}`);

        const loginsCollection = db.collection('logins');
        await loginsCollection.insertOne({
            uid,
            email,
            ip,
            action: 'login',
            timestamp: getHKTimestamp()
        });

        res.json({ success: true });
    } catch (error) {
        console.error("[API] Error logging login:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Log Logout Endpoint
app.post('/api/logout', async (req, res) => {
    try {
        const { uid, email } = req.body;
        if (!uid || !email) return res.status(400).json({ error: 'Missing uid or email' });

        const ip = getClientIp(req);
        console.log(`[API] Logging logout for ${email} from ${ip}`);

        const loginsCollection = db.collection('logins');
        await loginsCollection.insertOne({
            uid,
            email,
            ip,
            action: 'logout',
            timestamp: getHKTimestamp()
        });

        res.json({ success: true });
    } catch (error) {
        console.error("[API] Error logging logout:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// List all users (Debug/Admin endpoint)
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await db.collection('users').find({}).toArray();
        res.json({ count: users.length, users });
    } catch (error) {
        console.error("[API] Error listing users:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile by UID
app.get('/api/users/:uid', async (req, res) => {
    try {
        const { uid } = req.params;

        if (!uid) {
            return res.status(400).json({ error: 'UID is required' });
        }

        console.log(`[API] Fetching user profile for uid: ${uid}`);

        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ uid: uid });

        if (!user) {
            console.log(`[DB] User ${uid} not found in MongoDB`);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log(`[DB] Found user: ${user.email}`);
        res.json({ success: true, user });
    } catch (error) {
        console.error("[API] Error fetching user:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Debug Endpoint: Force Delete User by Email (Firebase + MongoDB)
app.post('/api/debug/delete-user', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        console.log(`[DEBUG] Request to force delete user: ${email}`);

        // 1. Delete from Firebase
        if (admin) {
            try {
                const userRecord = await admin.auth().getUserByEmail(email);
                await admin.auth().deleteUser(userRecord.uid);
                console.log(`[DEBUG] Deleted user from Firebase: ${userRecord.uid}`);
            } catch (authError) {
                if (authError.code === 'auth/user-not-found') {
                    console.log(`[DEBUG] User not found in Firebase: ${email}`);
                } else {
                    console.error("[DEBUG] Error deleting from Firebase:", authError);
                }
            }
        }

        // 2. Delete from MongoDB
        const usersCollection = db.collection('users');
        const deleteResult = await usersCollection.deleteOne({ email });
        console.log(`[DEBUG] MongoDB delete count: ${deleteResult.deletedCount}`);

        res.json({ success: true, message: 'User deleted (if existed)' });
    } catch (error) {
        console.error("[DEBUG] Error force deleting user:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`API Server running at http://localhost:${port}`);
});
