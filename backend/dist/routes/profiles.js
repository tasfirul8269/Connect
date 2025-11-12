"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference path="../types/express.d.ts" />
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get user profile
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        // Get user basic info
        const users = await (0, database_1.default) `
      SELECT id, email, account_type, created_at FROM users WHERE id = ${userId}
    `;
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = users[0];
        // Get profile based on account type
        let profile = null;
        if (user.account_type === 'personal') {
            const personalProfiles = await (0, database_1.default) `
        SELECT * FROM personal_profiles WHERE user_id = ${userId}
      `;
            profile = personalProfiles[0] || null;
        }
        else {
            const organizationProfiles = await (0, database_1.default) `
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
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update personal profile
router.put('/personal/:userId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { first_name, last_name, date_of_birth, phone_number, gender } = req.body;
        // Verify user owns this profile
        if (req.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const updatedProfile = await (0, database_1.default) `
      UPDATE personal_profiles 
      SET 
        first_name = ${first_name},
        last_name = ${last_name},
        date_of_birth = ${date_of_birth || null},
        phone_number = ${phone_number || null},
        gender = ${gender || null},
        updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING *
    `;
        if (updatedProfile.length === 0) {
            // Create a new personal profile if none exists
            const inserted = await (0, database_1.default) `
        INSERT INTO personal_profiles (
          user_id, first_name, last_name, date_of_birth, phone_number, gender
        ) VALUES (
          ${userId}, ${first_name}, ${last_name}, ${date_of_birth || null}, ${phone_number || null}, ${gender || null}
        )
        RETURNING *
      `;
            return res.json(inserted[0]);
        }
        res.json(updatedProfile[0]);
    }
    catch (error) {
        console.error('Error updating personal profile:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
});
// Update organization profile
router.put('/organization/:userId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { organization_name, description, industry, founded_year, location, website } = req.body;
        // Verify user owns this profile
        if (req.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const updatedProfile = await (0, database_1.default) `
      UPDATE organization_profiles 
      SET 
        organization_name = ${organization_name},
        description = ${description || null},
        industry = ${industry || null},
        founded_year = ${founded_year || null},
        location = ${location || null},
        website = ${website || null},
        updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING *
    `;
        if (updatedProfile.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.json(updatedProfile[0]);
    }
    catch (error) {
        console.error('Error updating organization profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get current user's profile
router.get('/me/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        // Get user basic info
        const users = await (0, database_1.default) `
      SELECT id, email, account_type, created_at FROM users WHERE id = ${userId}
    `;
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = users[0];
        // Get profile based on account type
        let profile = null;
        if (user.account_type === 'personal') {
            const personalProfiles = await (0, database_1.default) `
        SELECT * FROM personal_profiles WHERE user_id = ${userId}
      `;
            profile = personalProfiles[0] || null;
        }
        else {
            const organizationProfiles = await (0, database_1.default) `
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
    }
    catch (error) {
        console.error('Error fetching current user profile:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
});
exports.default = router;
//# sourceMappingURL=profiles.js.map