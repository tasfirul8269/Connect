-- Create extended_profiles table for additional profile information
CREATE TABLE IF NOT EXISTS extended_profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Identity & Bio
    handle VARCHAR(50) UNIQUE,
    nickname VARCHAR(100),
    bio TEXT,
    
    -- Photos
    profile_photo TEXT,
    cover_photo TEXT,
    
    -- Location
    lives_in VARCHAR(255),
    hometown VARCHAR(255),
    
    -- Education (stored as JSONB for flexibility)
    education JSONB DEFAULT '{}',
    -- Example: {"school": "...", "college": "...", "university": "...", "year_batch": "...", "department": "..."}
    
    -- Work (stored as JSONB)
    work JSONB DEFAULT '{}',
    -- Example: {"workplace": "...", "role": "...", "previous": "..."}
    
    -- Social Links (stored as JSONB)
    socials JSONB DEFAULT '{}',
    -- Example: {"facebook": "...", "instagram": "...", "linkedin": "...", "github": "...", "website": "..."}
    
    -- Interests & Skills (stored as JSONB arrays)
    interests JSONB DEFAULT '[]',
    -- Example: ["Technology", "Sports", "Music"]
    
    skills JSONB DEFAULT '[]',
    -- Example: ["JavaScript", "Python", "Design"]
    
    -- Relationship status (optional)
    relationship_status VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on handle for fast lookup
CREATE INDEX IF NOT EXISTS idx_extended_profiles_handle ON extended_profiles(handle);

-- Create index on user_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_extended_profiles_user_id ON extended_profiles(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_extended_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_extended_profiles_updated_at
    BEFORE UPDATE ON extended_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_extended_profiles_updated_at();
