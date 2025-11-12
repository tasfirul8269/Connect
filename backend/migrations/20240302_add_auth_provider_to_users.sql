-- Add auth_provider column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'facebook'));

-- Update existing users to have 'email' as their auth_provider
UPDATE users SET auth_provider = 'email' WHERE auth_provider IS NULL;

-- Make auth_provider NOT NULL after setting default values
ALTER TABLE users ALTER COLUMN auth_provider SET NOT NULL;
