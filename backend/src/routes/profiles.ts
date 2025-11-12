/// <reference path="../types/express.d.ts" />
import express from 'express';
import sql from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user basic info
    const users = await sql`
      SELECT id, email, account_type, created_at FROM users WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Get profile based on account type
    let profile = null;
    if (user.account_type === 'personal') {
      const personalProfiles = await sql`
        SELECT * FROM personal_profiles WHERE user_id = ${userId}
      `;
      profile = personalProfiles[0] || null;
    } else {
      const organizationProfiles = await sql`
        SELECT * FROM organization_profiles WHERE user_id = ${userId}
      `;
      profile = organizationProfiles[0] || null;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        account_type: user.account_type,
        created_at: user.created_at
      },
      profile
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update personal profile (now includes all profile fields)
router.put('/personal/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      first_name, last_name, date_of_birth, phone_number, gender,
      bio, profile_picture, location, website,
      handle, nickname, cover_photo, lives_in, hometown,
      education, work, socials, interests, skills, relationship_status
    } = req.body;

    // Verify user owns this profile
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if handle is unique (if provided and different from current)
    if (handle) {
      const existingHandles = await sql`
        SELECT user_id FROM personal_profiles 
        WHERE handle = ${handle} AND user_id != ${userId}
      `;
      if (existingHandles.length > 0) {
        return res.status(400).json({ error: 'Handle already taken' });
      }
    }

    const updates = {
      first_name, last_name, date_of_birth, phone_number, gender,
      bio, profile_picture, location, website,
      handle, nickname, cover_photo, lives_in, hometown,
      education, work, socials, interests, skills, relationship_status
    };

    // Save to profile picture history if updating profile picture
    if (updates.profile_picture) {
      await saveProfilePictureToHistory(userId, updates.profile_picture);
    }

    // Filter out undefined values and create SQL update object
    const updateFields = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Generate SQL update statement
    const setClause = sql(Object.entries(updateFields)
      .map(([key]) => `${key} = ${updateFields[key]}`)
      .join(', '));

    const updatedProfile = await sql`
      UPDATE personal_profiles 
      SET ${setClause}
      WHERE user_id = ${userId}
      RETURNING *
    `;

    if (updatedProfile.length === 0) {
      // Create a new personal profile if none exists
      const inserted = await sql`
        INSERT INTO personal_profiles (
          user_id, first_name, last_name, date_of_birth, phone_number, gender,
          bio, profile_picture, location, website,
          handle, nickname, cover_photo, lives_in, hometown,
          education, work, socials, interests, skills, relationship_status
        ) VALUES (
          ${userId}, ${first_name}, ${last_name}, ${date_of_birth || null}, ${phone_number || null}, ${gender || null},
          ${bio || null}, ${profile_picture || null}, ${location || null}, ${website || null},
          ${handle || null}, ${nickname || null}, ${cover_photo || null}, 
          ${lives_in || null}, ${hometown || null},
          ${education ? JSON.stringify(education) : '{}'},
          ${work ? JSON.stringify(work) : '{}'},
          ${socials ? JSON.stringify(socials) : '{}'},
          ${interests ? JSON.stringify(interests) : '[]'},
          ${skills ? JSON.stringify(skills) : '[]'},
          ${relationship_status || null}
        )
        RETURNING *
      `;
      return res.json(inserted[0]);
    }

    res.json(updatedProfile[0]);
  } catch (error) {
    console.error('Error updating personal profile:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as any)?.message : undefined
    });
  }
});

// Update organization profile
router.put('/organization/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { organization_name, description, industry, founded_year, location, website, logo } = req.body;

    // Verify user owns this profile
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updates = {
      organization_name, description, industry, founded_year, location, website, logo
    };

    // Save to profile picture history if updating logo
    if (updates.logo) {
      await saveProfilePictureToHistory(userId, updates.logo);
    }

    // Filter out undefined values and create SQL update object
    const updateFields = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Generate SQL update statement
    const setClause = sql(Object.entries(updateFields)
      .map(([key]) => `${key} = ${updateFields[key]}`)
      .join(', '));

    const updatedProfile = await sql`
      UPDATE organization_profiles 
      SET ${setClause}
      WHERE user_id = ${userId}
      RETURNING *
    `;

    if (updatedProfile.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(updatedProfile[0]);
  } catch (error) {
    console.error('Error updating organization profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user's profile
router.get('/me/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user basic info
    const users = await sql`
      SELECT id, email, account_type, created_at FROM users WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Get profile based on account type
    let profile = null;
    if (user.account_type === 'personal') {
      const personalProfiles = await sql`
        SELECT * FROM personal_profiles WHERE user_id = ${userId}
      `;
      profile = personalProfiles[0] || null;
    } else {
      const organizationProfiles = await sql`
        SELECT * FROM organization_profiles WHERE user_id = ${userId}
      `;
      profile = organizationProfiles[0] || null;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        account_type: user.account_type,
        created_at: user.created_at
      },
      profile
    });
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as any)?.message : undefined
    });
  }
});

// Get profile details (now all in personal_profiles)
router.get('/details/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const profileDetails = await sql`
      SELECT * FROM personal_profiles WHERE user_id = ${userId}
    `;

    if (profileDetails.length === 0) {
      return res.json(null);
    }

    res.json(profileDetails[0]);
  } catch (error) {
    console.error('Error fetching profile details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy endpoint (backward compatibility)
router.get('/extended/:userId', async (req, res) => {
  return req.res?.redirect(301, `/api/profiles/details/${req.params.userId}`);
});

// Get profile by handle/username
router.get('/handle/:handle', async (req, res) => {
  try {
    const { handle } = req.params;

    // Get personal profile by handle
    const personalProfiles = await sql`
      SELECT * FROM personal_profiles WHERE handle = ${handle}
    `;

    if (personalProfiles.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = personalProfiles[0];
    const userId = profile.user_id;

    // Get user basic info
    const users = await sql`
      SELECT id, email, account_type, created_at FROM users WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        account_type: user.account_type,
        created_at: user.created_at
      },
      profile
    });
  } catch (error) {
    console.error('Error fetching profile by handle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update or create profile details (now uses personal_profiles)
router.put('/details', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const updateData = {
      bio: req.body.bio || '',
      profile_picture: req.body.profile_picture || '',
      website: req.body.website || '',
      handle: req.body.handle || null,
      nickname: req.body.nickname || null,
      cover_photo: req.body.cover_photo || null,
      lives_in: req.body.lives_in || null,
      hometown: req.body.hometown || null,
      education: req.body.education || {},
      work: req.body.work || {},
      socials: req.body.socials || {},
      interests: req.body.interests || [],
      skills: req.body.skills || [],
      relationship_status: req.body.relationship_status || null,
      updated_at: new Date()
    };

    // Check if handle is unique (if provided and different from current)
    if (updateData.handle) {
      const existingHandles = await sql`
        SELECT user_id FROM personal_profiles 
        WHERE handle = ${updateData.handle} AND user_id != ${userId}
      `;
      if (existingHandles.length > 0) {
        return res.status(400).json({ error: 'Handle already taken' });
      }
    }

    // Check if personal profile exists
    const existing = await sql`
      SELECT * FROM personal_profiles WHERE user_id = ${userId}
    `;

    let result;
    if (existing.length === 0) {
      // Create new personal profile
      result = await sql`
        INSERT INTO personal_profiles (
          user_id, bio, profile_picture, website,
          handle, nickname, cover_photo, lives_in, hometown,
          education, work, socials, interests, skills, relationship_status
        ) VALUES (
          ${userId},
          ${updateData.bio},
          ${updateData.profile_picture},
          ${updateData.website},
          ${updateData.handle},
          ${updateData.nickname},
          ${updateData.cover_photo},
          ${updateData.lives_in},
          ${updateData.hometown},
          ${JSON.stringify(updateData.education)},
          ${JSON.stringify(updateData.work)},
          ${JSON.stringify(updateData.socials)},
          ${JSON.stringify(updateData.interests)},
          ${JSON.stringify(updateData.skills)},
          ${updateData.relationship_status}
        )
        RETURNING *
      `;
    } else {
      // Update existing personal profile
      result = await sql`
        UPDATE personal_profiles SET
          bio = ${updateData.bio},
          profile_picture = ${updateData.profile_picture},
          website = ${updateData.website},
          handle = ${updateData.handle},
          nickname = ${updateData.nickname},
          cover_photo = ${updateData.cover_photo},
          lives_in = ${updateData.lives_in},
          hometown = ${updateData.hometown},
          education = ${JSON.stringify(updateData.education)},
          work = ${JSON.stringify(updateData.work)},
          socials = ${JSON.stringify(updateData.socials)},
          interests = ${JSON.stringify(updateData.interests)},
          skills = ${JSON.stringify(updateData.skills)},
          relationship_status = ${updateData.relationship_status},
          updated_at = NOW()
        WHERE user_id = ${userId}
        RETURNING *
      `;
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating profile details:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as any)?.message : undefined
    });
  }
});

// Legacy endpoint - kept for backward compatibility (now uses personal_profiles)
router.put('/extended', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const data = req.body;
    
    // Check if handle is unique
    if (data.handle) {
      const existingHandles = await sql`
        SELECT user_id FROM personal_profiles 
        WHERE handle = ${data.handle} AND user_id != ${userId}
      `;
      if (existingHandles.length > 0) {
        return res.status(400).json({ error: 'Handle already taken' });
      }
    }

    const existing = await sql`
      SELECT * FROM personal_profiles WHERE user_id = ${userId}
    `;

    let result;
    if (existing.length === 0) {
      result = await sql`
        INSERT INTO personal_profiles (
          user_id, handle, nickname, bio, profile_picture, cover_photo,
          lives_in, hometown, education, work, socials, interests, skills,
          relationship_status
        ) VALUES (
          ${userId},
          ${data.handle || null},
          ${data.nickname || null},
          ${data.bio || null},
          ${data.profile_picture || null},
          ${data.cover_photo || null},
          ${data.lives_in || null},
          ${data.hometown || null},
          ${data.education ? JSON.stringify(data.education) : '{}'},
          ${data.work ? JSON.stringify(data.work) : '{}'},
          ${data.socials ? JSON.stringify(data.socials) : '{}'},
          ${data.interests ? JSON.stringify(data.interests) : '[]'},
          ${data.skills ? JSON.stringify(data.skills) : '[]'},
          ${data.relationship_status || null}
        )
        RETURNING *
      `;
    } else {
      result = await sql`
        UPDATE personal_profiles SET
          handle = COALESCE(${data.handle}, handle),
          nickname = COALESCE(${data.nickname}, nickname),
          bio = COALESCE(${data.bio}, bio),
          profile_picture = COALESCE(${data.profile_picture}, profile_picture),
          cover_photo = COALESCE(${data.cover_photo}, cover_photo),
          lives_in = COALESCE(${data.lives_in}, lives_in),
          hometown = COALESCE(${data.hometown}, hometown),
          education = COALESCE(${data.education ? JSON.stringify(data.education) : null}, education),
          work = COALESCE(${data.work ? JSON.stringify(data.work) : null}, work),
          socials = COALESCE(${data.socials ? JSON.stringify(data.socials) : null}, socials),
          interests = COALESCE(${data.interests ? JSON.stringify(data.interests) : null}, interests),
          skills = COALESCE(${data.skills ? JSON.stringify(data.skills) : null}, skills),
          relationship_status = COALESCE(${data.relationship_status}, relationship_status)
        WHERE user_id = ${userId}
        RETURNING *
      `;
    }
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if handle is available
router.get('/handle-available/:handle', async (req, res) => {
  try {
    const { handle } = req.params;

    const existing = await sql`
      SELECT user_id FROM personal_profiles WHERE handle = ${handle}
    `;

    res.json({ available: existing.length === 0 });
  } catch (error) {
    console.error('Error checking handle availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile picture history
router.get('/:userId/profile-pictures', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the requesting user has permission
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const history = await sql`
      SELECT id, image_url, created_at 
      FROM profile_picture_history 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    res.json(history);
  } catch (error) {
    console.error('Error fetching profile picture history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save profile picture to history
router.post('/:userId/profile-pictures', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { imageUrl } = req.body;
    
    // Verify the requesting user has permission
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    await saveProfilePictureToHistory(userId, imageUrl);
    
    res.status(201).json({ message: 'Profile picture saved to history' });
  } catch (error) {
    console.error('Error saving profile picture to history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save profile picture to history
const saveProfilePictureToHistory = async (userId: string, imageUrl: string) => {
  try {
    await sql`
      INSERT INTO profile_picture_history (user_id, image_url)
      VALUES (${userId}, ${imageUrl})
      ON CONFLICT (user_id, image_url) DO NOTHING
    `;
  } catch (error) {
    console.error('Error saving profile picture to history:', error);
  }
};

export { saveProfilePictureToHistory };

export default router;
