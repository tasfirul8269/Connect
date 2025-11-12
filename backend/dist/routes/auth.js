"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const google_auth_library_1 = require("google-auth-library");
const auth_1 = require("../middleware/auth");
const email_1 = require("../services/email");
const router = express_1.default.Router();
// Ensure OTP table exists (idempotent)
const ensurePasswordResetOTPsTable = async () => {
    try {
        // Enable required extension for UUID generation (no-op if already enabled)
        await (0, database_1.default) `CREATE EXTENSION IF NOT EXISTS pgcrypto`;
        await (0, database_1.default) `
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        used BOOLEAN DEFAULT FALSE
      )
    `;
        await (0, database_1.default) `CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email)`;
        await (0, database_1.default) `CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON password_reset_otps(expires_at)`;
    }
    catch (e) {
        console.error('Failed to ensure password_reset_otps table:', e);
        // Let caller handle any subsequent DB errors
    }
};
// Ensure users has email_verified column
const ensureUsersHasEmailVerifiedColumn = async () => {
    try {
        await (0, database_1.default) `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`;
        await (0, database_1.default) `ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL`;
    }
    catch (e) {
        console.error('Failed to ensure users.email_verified column:', e);
    }
};
// Ensure email verification OTPs table exists
const ensureEmailVerificationOTPsTable = async () => {
    try {
        await (0, database_1.default) `CREATE EXTENSION IF NOT EXISTS pgcrypto`;
        await (0, database_1.default) `
      CREATE TABLE IF NOT EXISTS email_verification_otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        used BOOLEAN DEFAULT FALSE
      )
    `;
        await (0, database_1.default) `CREATE INDEX IF NOT EXISTS idx_email_verif_otps_email ON email_verification_otps(email)`;
        await (0, database_1.default) `CREATE INDEX IF NOT EXISTS idx_email_verif_otps_expires_at ON email_verification_otps(expires_at)`;
    }
    catch (e) {
        console.error('Failed to ensure email_verification_otps table:', e);
    }
};
// Register (legacy all-in-one)
router.post('/register', async (req, res) => {
    try {
        const { email, password, account_type, personalData, organizationData } = req.body;
        // Check if user already exists
        const existingUser = await (0, database_1.default) `
      SELECT id, auth_provider FROM users WHERE email = ${email}
    `;
        if (existingUser.length > 0) {
            const provider = existingUser[0].auth_provider;
            if (provider === 'google') {
                return res.status(400).json({ error: 'An account with this email already exists. Please sign in with Google.' });
            }
            else if (provider === 'facebook') {
                return res.status(400).json({ error: 'An account with this email already exists. Please sign in with Facebook.' });
            }
            else {
                return res.status(400).json({ error: 'User already exists' });
            }
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create user with auth_provider
        const newUser = await (0, database_1.default) `
      INSERT INTO users (email, password, account_type, auth_provider)
      VALUES (${email}, ${hashedPassword}, ${account_type}, 'email')
      RETURNING id, email, account_type, created_at
    `;
        const userId = newUser[0].id;
        // Create profile based on account type
        if (account_type === 'personal' && personalData) {
            await (0, database_1.default) `
        INSERT INTO personal_profiles (
          user_id, first_name, last_name, phone_number, gender, date_of_birth
        ) VALUES (
          ${userId},
          ${personalData.first_name},
          ${personalData.last_name},
          ${personalData.phone_number || null},
          ${personalData.gender || null},
          ${personalData.date_of_birth || null}
        )
      `;
        }
        else if (account_type === 'organization' && organizationData) {
            await (0, database_1.default) `
        INSERT INTO organization_profiles (user_id, organization_name, description, industry, founded_year, location, website)
        VALUES (${userId}, ${organizationData.organization_name}, 
                ${organizationData.description || null}, ${organizationData.industry || null}, 
                ${organizationData.founded_year || null}, ${organizationData.location || null}, 
                ${organizationData.website || null})
      `;
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: userId,
                email: newUser[0].email,
                account_type: newUser[0].account_type
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user
        const users = await (0, database_1.default) `
      SELECT * FROM users WHERE email = ${email}
    `;
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = users[0];
        // Check password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Enforce email verification for email/password accounts
        await ensureUsersHasEmailVerifiedColumn();
        if (user.auth_provider === 'email' && !user.email_verified) {
            await ensureEmailVerificationOTPsTable();
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
            await (0, database_1.default) `DELETE FROM email_verification_otps WHERE email = ${email}`;
            await (0, database_1.default) `
        INSERT INTO email_verification_otps (email, otp, expires_at)
        VALUES (${email}, ${otp}, ${expiresAt})
      `;
            await (0, email_1.sendVerificationEmail)(email, otp);
            return res.status(403).json({ error: 'Email not verified. Verification code sent to your email.', requires_verification: true });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                account_type: user.account_type
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Verify token
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Get user details
        const users = await (0, database_1.default) `
      SELECT id, email, account_type FROM users WHERE id = ${decoded.userId}
    `;
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user: users[0] });
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});
// Logout
router.post('/logout', auth_1.authenticateToken, async (req, res) => {
    try {
        const token = req.token;
        const decoded = jsonwebtoken_1.default.decode(token);
        if (!token || !decoded?.exp) {
            return res.status(400).json({ error: 'Invalid token' });
        }
        // Add token to blacklist with expiration
        await (0, database_1.default) `
      INSERT INTO token_blacklist (token, expires_at)
      VALUES (${token}, to_timestamp(${decoded.exp}))
      ON CONFLICT (token) DO NOTHING
    `;
        res.json({ message: 'Successfully logged out' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error during logout' });
    }
});
// Google OAuth (personal accounts only)
router.post('/google', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Authorization code is required' });
        }
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return res.status(500).json({ error: 'Google OAuth is not configured' });
        }
        // Exchange auth code for tokens via Google SDK
        const oauthClientForToken = new google_auth_library_1.OAuth2Client(clientId, clientSecret, 'postmessage');
        const { tokens } = await oauthClientForToken.getToken(code);
        const idToken = tokens.id_token;
        if (!idToken) {
            return res.status(401).json({ error: 'No id_token returned by Google' });
        }
        // Verify ID token
        const oauthClient = new google_auth_library_1.OAuth2Client(clientId);
        const ticket = await oauthClient.verifyIdToken({ idToken, audience: clientId });
        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }
        const email = payload.email;
        const givenName = (payload.given_name || '');
        const familyName = (payload.family_name || '');
        const picture = (payload.picture || null);
        if (!email) {
            return res.status(400).json({ error: 'Google account has no email' });
        }
        // Find or create user (personal accounts only)
        const users = await (0, database_1.default) `SELECT * FROM users WHERE email = ${email}`;
        let userId;
        let isNew = false;
        if (users.length > 0) {
            const existingProvider = users[0].auth_provider;
            if (existingProvider === 'email') {
                return res.status(400).json({ error: 'An account with this email already exists. Please sign in with email and password.' });
            }
            else if (existingProvider === 'facebook') {
                return res.status(400).json({ error: 'An account with this email already exists. Please sign in with Facebook.' });
            }
            userId = users[0].id;
        }
        else {
            isNew = true;
            // Create user with random password (since social login)
            const randomPasswordHash = await bcryptjs_1.default.hash(`${Date.now()}-${Math.random()}`, 10);
            const newUser = await (0, database_1.default) `
        INSERT INTO users (email, password, account_type, auth_provider)
        VALUES (${email}, ${randomPasswordHash}, 'personal', 'google')
        RETURNING id
      `;
            userId = newUser[0].id;
            // Create minimal personal profile (only allowed fields)
            await (0, database_1.default) `
        INSERT INTO personal_profiles (user_id, first_name, last_name)
        VALUES (${userId}, ${givenName || 'User'}, ${familyName || ''})
      `;
        }
        const jwtToken = jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            message: 'Google login successful',
            token: jwtToken,
            user: { id: userId, email, account_type: 'personal' },
            needs_completion: isNew,
            prefill: isNew ? { first_name: givenName, last_name: familyName, email, picture } : undefined,
        });
    }
    catch (error) {
        console.error('Google auth error:', error);
        return res.status(500).json({ error: 'Internal server error during Google login' });
    }
});
// Facebook OAuth (personal accounts only)
router.post('/facebook', async (req, res) => {
    try {
        const { access_token } = req.body;
        if (!access_token) {
            return res.status(400).json({ error: 'Facebook access_token is required' });
        }
        // Get user info from Facebook Graph API
        const userInfoResp = await fetch(`https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token=${access_token}`);
        if (!userInfoResp.ok) {
            const fbErr = await userInfoResp.text();
            return res.status(401).json({ error: 'Could not verify Facebook token', details: fbErr });
        }
        const fb = await userInfoResp.json();
        const email = fb.email;
        const givenName = fb.first_name || '';
        const familyName = fb.last_name || '';
        if (!email) {
            return res.status(400).json({ error: 'Facebook account has no email' });
        }
        // Find or create user (personal accounts only)
        const users = await (0, database_1.default) `SELECT * FROM users WHERE email = ${email}`;
        let userId;
        let isNew = false;
        if (users.length > 0) {
            const existingProvider = users[0].auth_provider;
            if (existingProvider === 'email') {
                return res.status(400).json({ error: 'An account with this email already exists. Please sign in with email and password.' });
            }
            else if (existingProvider === 'google') {
                return res.status(400).json({ error: 'An account with this email already exists. Please sign in with Google.' });
            }
            userId = users[0].id;
        }
        else {
            isNew = true;
            const randomPasswordHash = await bcryptjs_1.default.hash(`${Date.now()}-${Math.random()}`, 10);
            const newUser = await (0, database_1.default) `
        INSERT INTO users (email, password, account_type, auth_provider)
        VALUES (${email}, ${randomPasswordHash}, 'personal', 'facebook')
        RETURNING id
      `;
            userId = newUser[0].id;
            await (0, database_1.default) `
        INSERT INTO personal_profiles (user_id, first_name, last_name)
        VALUES (${userId}, ${givenName || 'User'}, ${familyName || ''})
      `;
        }
        const jwtToken = jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            message: 'Facebook login successful',
            token: jwtToken,
            user: { id: userId, email, account_type: 'personal' },
            needs_completion: isNew,
            prefill: isNew ? { first_name: givenName, last_name: familyName, email } : undefined,
        });
    }
    catch (error) {
        console.error('Facebook auth error:', error);
        return res.status(500).json({ error: 'Internal server error during Facebook login' });
    }
});
// Register init: create account and send verification OTP
router.post('/register-init', async (req, res) => {
    try {
        const { email, password, account_type } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        await ensureUsersHasEmailVerifiedColumn();
        await ensureEmailVerificationOTPsTable();
        // Check if user already exists
        const existing = await (0, database_1.default) `SELECT id, auth_provider, email_verified, account_type FROM users WHERE email = ${email}`;
        if (existing.length > 0) {
            const provider = existing[0].auth_provider;
            if (provider !== 'email') {
                return res.status(400).json({ error: `An account with this email already exists. Please sign in with ${provider}.` });
            }
            if (!existing[0].email_verified) {
                // Resend OTP
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
                await (0, database_1.default) `DELETE FROM email_verification_otps WHERE email = ${email}`;
                await (0, database_1.default) `INSERT INTO email_verification_otps (email, otp, expires_at) VALUES (${email}, ${otp}, ${expiresAt})`;
                await (0, email_1.sendVerificationEmail)(email, otp);
                return res.status(200).json({ message: 'Verification code resent to your email', pending_verification: true });
            }
            return res.status(400).json({ error: 'User already exists' });
        }
        // Create user
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const type = account_type || 'personal';
        const created = await (0, database_1.default) `
      INSERT INTO users (email, password, account_type, auth_provider, email_verified)
      VALUES (${email}, ${hashed}, ${type}, 'email', FALSE)
      RETURNING id, email, account_type
    `;
        // Send verification OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await (0, database_1.default) `DELETE FROM email_verification_otps WHERE email = ${email}`;
        await (0, database_1.default) `INSERT INTO email_verification_otps (email, otp, expires_at) VALUES (${email}, ${otp}, ${expiresAt})`;
        await (0, email_1.sendVerificationEmail)(email, otp);
        return res.status(201).json({ message: 'Account created. Verification code sent to your email.', pending_verification: true });
    }
    catch (error) {
        console.error('Register-init error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Resend verification OTP
router.post('/verify-email/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ error: 'Email is required' });
        await ensureEmailVerificationOTPsTable();
        const users = await (0, database_1.default) `SELECT id, auth_provider FROM users WHERE email = ${email}`;
        if (users.length === 0)
            return res.status(404).json({ error: 'No account found with this email' });
        if (users[0].auth_provider !== 'email')
            return res.status(400).json({ error: `This account uses ${users[0].auth_provider} sign-in.` });
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await (0, database_1.default) `DELETE FROM email_verification_otps WHERE email = ${email}`;
        await (0, database_1.default) `INSERT INTO email_verification_otps (email, otp, expires_at) VALUES (${email}, ${otp}, ${expiresAt})`;
        await (0, email_1.sendVerificationEmail)(email, otp);
        return res.json({ message: 'Verification code sent' });
    }
    catch (error) {
        console.error('Resend verification OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Verify email OTP
router.post('/verify-email/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp)
            return res.status(400).json({ error: 'Email and OTP are required' });
        await ensureEmailVerificationOTPsTable();
        const records = await (0, database_1.default) `
      SELECT * FROM email_verification_otps
      WHERE email = ${email} AND otp = ${otp} AND expires_at > NOW() AND used = FALSE
      ORDER BY created_at DESC LIMIT 1
    `;
        if (records.length === 0)
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        await (0, database_1.default) `UPDATE email_verification_otps SET used = TRUE WHERE id = ${records[0].id}`;
        const updated = await (0, database_1.default) `UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE email = ${email} RETURNING id, email, account_type`;
        if (updated.length === 0)
            return res.status(404).json({ error: 'User not found' });
        const token = jsonwebtoken_1.default.sign({ userId: updated[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.json({ message: 'Email verified successfully', token, user: updated[0] });
    }
    catch (error) {
        console.error('Verify email OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Check email availability
router.post('/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const existingUser = await (0, database_1.default) `
      SELECT auth_provider FROM users WHERE email = ${email}
    `;
        if (existingUser.length > 0) {
            const provider = existingUser[0].auth_provider;
            let message = '';
            if (provider === 'google') {
                message = 'An account with this email already exists. Please sign in with Google.';
            }
            else if (provider === 'facebook') {
                message = 'An account with this email already exists. Please sign in with Facebook.';
            }
            else {
                message = 'This email is already registered.';
            }
            return res.json({
                available: false,
                provider,
                message
            });
        }
        res.json({ available: true });
    }
    catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get current user
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const users = await (0, database_1.default) `
      SELECT id, email, account_type, created_at 
      FROM users 
      WHERE id = ${req.userId}
    `;
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user: users[0] });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Password Reset: Send OTP
router.post('/forgot-password/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        // Ensure supporting table exists
        await ensurePasswordResetOTPsTable();
        // Check if user exists
        const users = await (0, database_1.default) `SELECT id, auth_provider FROM users WHERE email = ${email}`;
        if (users.length === 0) {
            return res.status(404).json({ error: 'No account found with this email' });
        }
        // Check if user used social auth
        if (users[0].auth_provider !== 'email') {
            return res.status(400).json({
                error: `This account uses ${users[0].auth_provider} sign-in. Please use ${users[0].auth_provider} to log in.`
            });
        }
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Set expiry to 5 minutes from now
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        // Delete any existing OTPs for this email
        await (0, database_1.default) `DELETE FROM password_reset_otps WHERE email = ${email}`;
        // Store OTP in database
        await (0, database_1.default) `
      INSERT INTO password_reset_otps (email, otp, expires_at)
      VALUES (${email}, ${otp}, ${expiresAt})
    `;
        // Send OTP via email
        await (0, email_1.sendOTPEmail)(email, otp);
        res.json({ message: 'OTP sent successfully to your email' });
    }
    catch (error) {
        console.error('Send OTP error:', error);
        const message = process.env.NODE_ENV === 'development' && error?.message
            ? `Failed to send OTP: ${error.message}`
            : 'Failed to send OTP. Please try again.';
        res.status(500).json({ error: message });
    }
});
// Password Reset: Verify OTP
router.post('/forgot-password/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }
        // Find valid OTP
        const otpRecords = await (0, database_1.default) `
      SELECT * FROM password_reset_otps 
      WHERE email = ${email} 
      AND otp = ${otp} 
      AND expires_at > NOW() 
      AND used = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `;
        if (otpRecords.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }
        // Mark OTP as used
        await (0, database_1.default) `
      UPDATE password_reset_otps 
      SET used = TRUE 
      WHERE id = ${otpRecords[0].id}
    `;
        // Generate a temporary reset token (valid for 10 minutes)
        const resetToken = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET, { expiresIn: '10m' });
        res.json({ message: 'OTP verified successfully', resetToken });
    }
    catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});
// Password Reset: Reset Password
router.post('/forgot-password/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) {
            return res.status(400).json({ error: 'Reset token and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        // Verify reset token
        let email;
        try {
            const decoded = jsonwebtoken_1.default.verify(resetToken, process.env.JWT_SECRET);
            email = decoded.email;
        }
        catch (err) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }
        // Hash new password
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        // Update user password
        await (0, database_1.default) `
      UPDATE users 
      SET password = ${hashedPassword}, updated_at = NOW() 
      WHERE email = ${email}
    `;
        // Delete all OTPs for this email
        await (0, database_1.default) `DELETE FROM password_reset_otps WHERE email = ${email}`;
        res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map