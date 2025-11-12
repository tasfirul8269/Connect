-- Create profile_picture_history table
CREATE TABLE IF NOT EXISTS profile_picture_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, image_url)  -- Prevent duplicate entries for the same image
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profile_picture_history_user_id ON profile_picture_history(user_id);
