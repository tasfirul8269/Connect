# Database Migration Guide

## Extended Profiles Migration

This migration adds support for extended profile fields including education, work, social links, interests, and skills.

### What's New

The migration creates an `extended_profiles` table with the following fields:

**Identity & Bio:**
- `handle` - Unique username (e.g., @username)
- `nickname` - Display name
- `bio` - About me text

**Photos:**
- `profile_photo` - Profile picture URL
- `cover_photo` - Cover photo URL

**Location:**
- `lives_in` - Current city
- `hometown` - Hometown/permanent city

**Education (JSONB):**
```json
{
  "school": "High School Name",
  "college": "College Name",
  "university": "University Name",
  "year_batch": "2024",
  "department": "Computer Science"
}
```

**Work (JSONB):**
```json
{
  "workplace": "Company Name",
  "role": "Position/Title",
  "previous": "Previous Companies"
}
```

**Social Links (JSONB):**
```json
{
  "facebook": "https://facebook.com/...",
  "instagram": "https://instagram.com/...",
  "linkedin": "https://linkedin.com/...",
  "github": "https://github.com/...",
  "website": "https://yoursite.com"
}
```

**Interests & Skills:**
- `interests` - Array of interests (JSONB)
- `skills` - Array of skills (JSONB)

**Optional:**
- `relationship_status` - Relationship status

### Running the Migration

#### Option 1: Run All Migrations
```bash
cd backend
npm run migrate
```

#### Option 2: Run Specific Migration
```bash
cd backend/migrations
psql $DATABASE_URL < 20241107_create_extended_profiles.sql
```

#### Option 3: Using Node
```bash
cd backend/migrations
node run-migrations.js
```

### API Endpoints

After migration, the following endpoints will be available:

**Get Extended Profile:**
```
GET /api/profiles/extended/:userId
```

**Update Extended Profile:**
```
PUT /api/profiles/extended
Authorization: Bearer <token>
Body: {
  handle: string,
  nickname: string,
  bio: string,
  ...other fields
}
```

**Get Profile by Handle:**
```
GET /api/profiles/handle/:handle
```

**Check Handle Availability:**
```
GET /api/profiles/handle-available/:handle
Response: { available: boolean }
```

### Data Migration from localStorage

The frontend automatically migrates data from localStorage to the backend on first load:

1. When a user visits their profile, the app checks for extended profile in the backend
2. If none exists, it reads from localStorage
3. If localStorage has data, it automatically syncs to the backend
4. Future updates go directly to the backend

### Rollback

If you need to rollback this migration:

```sql
DROP TABLE IF EXISTS extended_profiles CASCADE;
DROP FUNCTION IF EXISTS update_extended_profiles_updated_at() CASCADE;
```

### Testing

After migration, test the following:

1. ✅ Create/update extended profile through ProfileWizard
2. ✅ View profile with all extended fields
3. ✅ Access profile by handle (/profile/@username)
4. ✅ Check handle uniqueness validation
5. ✅ Verify JSONB fields (education, work, socials) are properly stored

### Troubleshooting

**Error: relation "extended_profiles" already exists**
- The table already exists, migration was successful

**Error: permission denied**
- Ensure your DATABASE_URL has proper permissions

**Handle not updating:**
- Check for unique constraint violations
- Verify handle format (alphanumeric, underscores, hyphens only)

### Notes

- Handles must be unique across all users
- JSONB fields allow flexible nested data
- Indexes are created on `handle` and `user_id` for fast lookups
- Auto-updating `updated_at` trigger is included
