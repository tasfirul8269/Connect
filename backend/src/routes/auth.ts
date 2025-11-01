import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from '../config/database';
import { OAuth2Client } from 'google-auth-library';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, account_type, personalData, organizationData } = req.body;

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await sql`
      INSERT INTO users (email, password, account_type)
      VALUES (${email}, ${hashedPassword}, ${account_type})
      RETURNING id, email, account_type, created_at
    `;

    const userId = newUser[0].id;

    // Create profile based on account type
    if (account_type === 'personal' && personalData) {
      await sql`
        INSERT INTO personal_profiles (
          user_id, first_name, last_name, phone_number, gender,
          bio, date_of_birth, location, website
        ) VALUES (
          ${userId},
          ${personalData.first_name},
          ${personalData.last_name},
          ${personalData.phone_number || null},
          ${personalData.gender || null},
          ${personalData.bio || null},
          ${personalData.date_of_birth || null},
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
      userId = users[0].id as string;
    } else {
      isNew = true;
      // Create user with random password (since social login)
      const randomPasswordHash = await bcrypt.hash(`${Date.now()}-${Math.random()}`, 10);
      const newUser = await sql`
        INSERT INTO users (email, password, account_type)
        VALUES (${email}, ${randomPasswordHash}, 'personal')
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
      userId = users[0].id as string;
    } else {
      isNew = true;
      const randomPasswordHash = await bcrypt.hash(`${Date.now()}-${Math.random()}`, 10);
      const newUser = await sql`
        INSERT INTO users (email, password, account_type)
        VALUES (${email}, ${randomPasswordHash}, 'personal')
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

export default router;
