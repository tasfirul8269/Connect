import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from '../config/database';
import { OAuth2Client } from 'google-auth-library';
import { authenticateToken } from '../middleware/auth';
import { sendOTPEmail, sendVerificationEmail } from '../services/email';

const router = express.Router();

// Ensure OTP table exists (idempotent)
const ensurePasswordResetOTPsTable = async () => {
  try {
    // Enable required extension for UUID generation (no-op if already enabled)
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        used BOOLEAN DEFAULT FALSE
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON password_reset_otps(expires_at)`;
  } catch (e) {
    console.error('Failed to ensure password_reset_otps table:', e);
    // Let caller handle any subsequent DB errors
  }
};

// Ensure users has email_verified column
const ensureUsersHasEmailVerifiedColumn = async () => {
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL`;
  } catch (e) {
    console.error('Failed to ensure users.email_verified column:', e);
  }
};

// Ensure email verification OTPs table exists
const ensureEmailVerificationOTPsTable = async () => {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    await sql`
      CREATE TABLE IF NOT EXISTS email_verification_otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        used BOOLEAN DEFAULT FALSE
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_email_verif_otps_email ON email_verification_otps(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_email_verif_otps_expires_at ON email_verification_otps(expires_at)`;
  } catch (e) {
    console.error('Failed to ensure email_verification_otps table:', e);
  }
};

// Register (legacy all-in-one)
router.post('/register', async (req, res) => {
  try {
    const { email, password, account_type, personalData, organizationData } = req.body;

    // Check if user already exists
    const existingUser = await sql`
      SELECT id, auth_provider FROM users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      const provider = existingUser[0].auth_provider;
      if (provider === 'google') {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in with Google.' });
      } else if (provider === 'facebook') {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in with Facebook.' });
      } else {
        return res.status(400).json({ error: 'User already exists' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with auth_provider
    const newUser = await sql`
      INSERT INTO users (email, password, account_type, auth_provider)
      VALUES (${email}, ${hashedPassword}, ${account_type}, 'email')
      RETURNING id, email, account_type, created_at
    `;

    const userId = newUser[0].id;

    // Create profile based on account type
    if (account_type === 'personal' && personalData) {
      await sql`
        INSERT INTO personal_profiles (
          user_id, first_name, last_name, phone_number, gender, date_of_birth,
          bio, profile_picture, location, website
        ) VALUES (
          ${userId},
          ${personalData.first_name},
          ${personalData.last_name},
          ${personalData.phone_number || null},
          ${personalData.gender || null},
          ${personalData.date_of_birth || null},
          ${personalData.bio || null},
          ${personalData.profile_picture || null},
          ${personalData.location || null},
          ${personalData.website || null}
        )
      `;
    } else if (account_type === 'organization' && organizationData) {
      await sql`
        INSERT INTO organization_profiles (user_id, organization_name, description, industry, founded_year, location, website)
        VALUES (${userId}, ${organizationData.organization_name}, 
                ${organizationData.description || null}, ${organizationData.industry || null}, 
                ${organizationData.founded_year || null}, ${organizationData.location || null}, 
                ${organizationData.website || null})
      `;
    }

    // Generate JWT token
    const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: userId,
        email: newUser[0].email,
        account_type: newUser[0].account_type
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const users = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Enforce email verification for email/password accounts
    await ensureUsersHasEmailVerifiedColumn();
    if (user.auth_provider === 'email' && !user.email_verified) {
      await ensureEmailVerificationOTPsTable();
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await sql`DELETE FROM email_verification_otps WHERE email = ${email}`;
      await sql`
        INSERT INTO email_verification_otps (email, otp, expires_at)
        VALUES (${email}, ${otp}, ${expiresAt})
      `;
      await sendVerificationEmail(email, otp);
      return res.status(403).json({ error: 'Email not verified. Verification code sent to your email.', requires_verification: true });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        account_type: user.account_type
      }
    });
  } catch (error) {
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    // Get user details
    const users = await sql`
      SELECT id, email, account_type FROM users WHERE id = ${decoded.userId}
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.token;
    const decoded = jwt.decode(token!) as { exp: number };
    
    if (!token || !decoded?.exp) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Add token to blacklist with expiration
    await sql`
      INSERT INTO token_blacklist (token, expires_at)
      VALUES (${token}, to_timestamp(${decoded.exp}))
      ON CONFLICT (token) DO NOTHING
    `;

    res.json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error during logout' });
  }
});

// Google OAuth (personal accounts only)
router.post('/google', async (req, res) => {
  try {
    const { code } = req.body as { code?: string };

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Google OAuth is not configured' });
    }

    // Exchange auth code for tokens via Google SDK
    const oauthClientForToken = new OAuth2Client(clientId, clientSecret, 'postmessage');
    const { tokens } = await oauthClientForToken.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      return res.status(401).json({ error: 'No id_token returned by Google' });
    }

    // Verify ID token
    const oauthClient = new OAuth2Client(clientId);
    const ticket = await oauthClient.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const email = payload.email as string | undefined;
    const givenName = (payload.given_name || '') as string;
    const familyName = (payload.family_name || '') as string;
    const picture = (payload.picture || null) as string | null;

    if (!email) {
      return res.status(400).json({ error: 'Google account has no email' });
    }

    // Find or create user (personal accounts only)
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    let userId: string;

    let isNew = false;
    if (users.length > 0) {
      const existingProvider = users[0].auth_provider as string;
      if (existingProvider === 'email') {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in with email and password.' });
      } else if (existingProvider === 'facebook') {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in with Facebook.' });
      }
      userId = users[0].id as string;
    } else {
      isNew = true;
      // Create user with random password (since social login)
      const randomPasswordHash = await bcrypt.hash(`${Date.now()}-${Math.random()}`, 10);
      const newUser = await sql`
        INSERT INTO users (email, password, account_type, auth_provider)
        VALUES (${email}, ${randomPasswordHash}, 'personal', 'google')
        RETURNING id
      `;
      userId = newUser[0].id as string;
      // Create minimal personal profile (only allowed fields)
      await sql`
        INSERT INTO personal_profiles (user_id, first_name, last_name)
        VALUES (${userId}, ${givenName || 'User'}, ${familyName || ''})
      `;
    }

    const jwtToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    return res.json({
      message: 'Google login successful',
      token: jwtToken,
      user: { id: userId, email, account_type: 'personal' },
      needs_completion: isNew,
      prefill: isNew ? { first_name: givenName, last_name: familyName, email, picture } : undefined,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ error: 'Internal server error during Google login' });
  }
});

// Facebook OAuth (personal accounts only)
router.post('/facebook', async (req, res) => {
  try {
    const { access_token } = req.body as { access_token?: string };
    if (!access_token) {
      return res.status(400).json({ error: 'Facebook access_token is required' });
    }

    // Get user info from Facebook Graph API
    const userInfoResp = await fetch(
      `https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token=${access_token}`
    );
    if (!userInfoResp.ok) {
      const fbErr = await userInfoResp.text();
      return res.status(401).json({ error: 'Could not verify Facebook token', details: fbErr });
    }
    const fb = await userInfoResp.json() as { email?: string; first_name?: string; last_name?: string } & Record<string, any>;
    const email = fb.email;
    const givenName = fb.first_name || '';
    const familyName = fb.last_name || '';

    if (!email) {
      return res.status(400).json({ error: 'Facebook account has no email' });
    }

    // Find or create user (personal accounts only)
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    let userId: string;
    let isNew = false;
    if (users.length > 0) {
      const existingProvider = users[0].auth_provider as string;
      if (existingProvider === 'email') {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in with email and password.' });
      } else if (existingProvider === 'google') {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in with Google.' });
      }
      userId = users[0].id as string;
    } else {
      isNew = true;
      const randomPasswordHash = await bcrypt.hash(`${Date.now()}-${Math.random()}`, 10);
      const newUser = await sql`
        INSERT INTO users (email, password, account_type, auth_provider)
        VALUES (${email}, ${randomPasswordHash}, 'personal', 'facebook')
        RETURNING id
      `;
      userId = newUser[0].id as string;
      await sql`
        INSERT INTO personal_profiles (user_id, first_name, last_name)
        VALUES (${userId}, ${givenName || 'User'}, ${familyName || ''})
      `;
    }

    const jwtToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    return res.json({
      message: 'Facebook login successful',
      token: jwtToken,
      user: { id: userId, email, account_type: 'personal' },
      needs_completion: isNew,
      prefill: isNew ? { first_name: givenName, last_name: familyName, email } : undefined,
    });
  } catch (error) {
    console.error('Facebook auth error:', error);
    return res.status(500).json({ error: 'Internal server error during Facebook login' });
  }
});

// Register init: create account and send verification OTP
router.post('/register-init', async (req, res) => {
  try {
    const { email, password, account_type } = req.body as { email?: string; password?: string; account_type?: 'personal' | 'organization' };

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    await ensureUsersHasEmailVerifiedColumn();
    await ensureEmailVerificationOTPsTable();

    // Check if user already exists
    const existing = await sql`SELECT id, auth_provider, email_verified, account_type FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      const provider = existing[0].auth_provider as string;
      if (provider !== 'email') {
        return res.status(400).json({ error: `An account with this email already exists. Please sign in with ${provider}.` });
      }
      if (!existing[0].email_verified) {
        // Resend OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await sql`DELETE FROM email_verification_otps WHERE email = ${email}`;
        await sql`INSERT INTO email_verification_otps (email, otp, expires_at) VALUES (${email}, ${otp}, ${expiresAt})`;
        await sendVerificationEmail(email, otp);
        return res.status(200).json({ message: 'Verification code resent to your email', pending_verification: true });
      }
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const hashed = await bcrypt.hash(password, 10);
    const type = account_type || 'personal';
    const created = await sql`
      INSERT INTO users (email, password, account_type, auth_provider, email_verified)
      VALUES (${email}, ${hashed}, ${type}, 'email', FALSE)
      RETURNING id, email, account_type
    `;

    // Send verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await sql`DELETE FROM email_verification_otps WHERE email = ${email}`;
    await sql`INSERT INTO email_verification_otps (email, otp, expires_at) VALUES (${email}, ${otp}, ${expiresAt})`;
    await sendVerificationEmail(email, otp);

    return res.status(201).json({ message: 'Account created. Verification code sent to your email.', pending_verification: true });
  } catch (error) {
    console.error('Register-init error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification OTP
router.post('/verify-email/send-otp', async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ error: 'Email is required' });
    await ensureEmailVerificationOTPsTable();
    const users = await sql`SELECT id, auth_provider FROM users WHERE email = ${email}`;
    if (users.length === 0) return res.status(404).json({ error: 'No account found with this email' });
    if (users[0].auth_provider !== 'email') return res.status(400).json({ error: `This account uses ${users[0].auth_provider} sign-in.` });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await sql`DELETE FROM email_verification_otps WHERE email = ${email}`;
    await sql`INSERT INTO email_verification_otps (email, otp, expires_at) VALUES (${email}, ${otp}, ${expiresAt})`;
    await sendVerificationEmail(email, otp);
    return res.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('Resend verification OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email OTP
router.post('/verify-email/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });
    await ensureEmailVerificationOTPsTable();

    const records = await sql`
      SELECT * FROM email_verification_otps
      WHERE email = ${email} AND otp = ${otp} AND expires_at > NOW() AND used = FALSE
      ORDER BY created_at DESC LIMIT 1
    `;
    if (records.length === 0) return res.status(400).json({ error: 'Invalid or expired OTP' });

    await sql`UPDATE email_verification_otps SET used = TRUE WHERE id = ${records[0].id}`;
    const updated = await sql`UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE email = ${email} RETURNING id, email, account_type`;
    if (updated.length === 0) return res.status(404).json({ error: 'User not found' });

    const token = jwt.sign({ userId: updated[0].id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    return res.json({ message: 'Email verified successfully', token, user: updated[0] });
  } catch (error) {
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

    const existingUser = await sql`
      SELECT auth_provider FROM users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      const provider = existingUser[0].auth_provider;
      let message = '';
      
      if (provider === 'google') {
        message = 'An account with this email already exists. Please sign in with Google.';
      } else if (provider === 'facebook') {
        message = 'An account with this email already exists. Please sign in with Facebook.';
      } else {
        message = 'This email is already registered.';
      }

      return res.json({ 
        available: false, 
        provider,
        message 
      });
    }

    res.json({ available: true });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const users = await sql`
      SELECT id, email, account_type, created_at 
      FROM users 
      WHERE id = ${req.userId}
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
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
    const users = await sql`SELECT id, auth_provider FROM users WHERE email = ${email}`;
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
    await sql`DELETE FROM password_reset_otps WHERE email = ${email}`;

    // Store OTP in database
    await sql`
      INSERT INTO password_reset_otps (email, otp, expires_at)
      VALUES (${email}, ${otp}, ${expiresAt})
    `;

    // Send OTP via email
    await sendOTPEmail(email, otp);

    res.json({ message: 'OTP sent successfully to your email' });
  } catch (error: any) {
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
    const otpRecords = await sql`
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
    await sql`
      UPDATE password_reset_otps 
      SET used = TRUE 
      WHERE id = ${otpRecords[0].id}
    `;

    // Generate a temporary reset token (valid for 10 minutes)
    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: '10m' });

    res.json({ message: 'OTP verified successfully', resetToken });
  } catch (error) {
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
    let email: string;
    try {
      const decoded = jwt.verify(resetToken, process.env.JWT_SECRET!) as { email: string };
      email = decoded.email;
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await sql`
      UPDATE users 
      SET password = ${hashedPassword}, updated_at = NOW() 
      WHERE email = ${email}
    `;

    // Delete all OTPs for this email
    await sql`DELETE FROM password_reset_otps WHERE email = ${email}`;

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
