-- Migration: Add extended profile fields to existing personal_profiles table
-- Date: November 8, 2024

BEGIN;

-- Step 1: Add new columns to existing personal_profiles table
ALTER TABLE personal_profiles 
ADD COLUMN IF NOT EXISTS handle VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS nickname VARCHAR(100),
ADD COLUMN IF NOT EXISTS profile_photo TEXT,
ADD COLUMN IF NOT EXISTS cover_photo TEXT,
ADD COLUMN IF NOT EXISTS lives_in VARCHAR(255),
ADD COLUMN IF NOT EXISTS hometown VARCHAR(255),
ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS work JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS socials JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS relationship_status VARCHAR(50);

-- Step 2: Update phone_number column to have proper length
ALTER TABLE personal_profiles ALTER COLUMN phone_number TYPE VARCHAR(20);

-- Step 3: Add gender constraint if not exists
DO $$ 
BEGIN
    ALTER TABLE personal_profiles ADD CONSTRAINT check_gender CHECK (gender IN ('male', 'female', 'other'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 4: Migrate data from extended_profiles table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extended_profiles') THEN
        -- Update existing personal_profiles with extended_profiles data
        UPDATE personal_profiles 
        SET 
            handle = ep.handle,
            nickname = ep.nickname,
            profile_photo = ep.profile_photo,
            cover_photo = ep.cover_photo,
            lives_in = ep.lives_in,
            hometown = ep.hometown,
            education = ep.education,
            work = ep.work,
            socials = ep.socials,
            interests = ep.interests,
            skills = ep.skills,
            relationship_status = ep.relationship_status,
            updated_at = GREATEST(personal_profiles.updated_at, ep.updated_at)
        FROM extended_profiles ep
        WHERE personal_profiles.user_id = ep.user_id;

        -- Insert users who only have extended_profiles (no personal_profiles)
        INSERT INTO personal_profiles (
            user_id, handle, nickname, profile_photo, cover_photo, lives_in, hometown,
            education, work, socials, interests, skills, relationship_status, created_at, updated_at
        )
        SELECT 
            user_id, handle, nickname, profile_photo, cover_photo, lives_in, hometown,
            education, work, socials, interests, skills, relationship_status, created_at, updated_at
        FROM extended_profiles ep
        WHERE NOT EXISTS (
            SELECT 1 FROM personal_profiles pp WHERE pp.user_id = ep.user_id
        );

        -- Drop extended_profiles table after migration
        DROP TABLE extended_profiles CASCADE;
    END IF;
END $$;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_personal_profiles_user_id ON personal_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_profiles_handle ON personal_profiles(handle);
CREATE INDEX IF NOT EXISTS idx_personal_profiles_first_name ON personal_profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_personal_profiles_last_name ON personal_profiles(last_name);

-- Step 6: Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_personal_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_personal_profiles_updated_at ON personal_profiles;
CREATE TRIGGER trigger_update_personal_profiles_updated_at
    BEFORE UPDATE ON personal_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_personal_profiles_updated_at();

COMMIT;

-- Verification queries (run these after migration)
-- SELECT COUNT(*) FROM personal_profiles;
-- SELECT user_id, first_name, last_name, handle, nickname FROM personal_profiles LIMIT 5;
