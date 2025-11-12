-- Migration: Add missing bio and website columns to personal_profiles table
-- Date: November 9, 2024

BEGIN;

-- Add bio column if it doesn't exist
ALTER TABLE personal_profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Update existing rows to have empty strings for the new columns
UPDATE personal_profiles 
SET 
  bio = COALESCE(bio, ''),
  website = COALESCE(website, '');

-- Make the columns NOT NULL after setting default values
ALTER TABLE personal_profiles 
  ALTER COLUMN bio SET NOT NULL,
  ALTER COLUMN website SET NOT NULL,
  ALTER COLUMN bio SET DEFAULT '',
  ALTER COLUMN website SET DEFAULT '';

-- Add an index on the website column for better query performance
CREATE INDEX IF NOT EXISTS idx_personal_profiles_website ON personal_profiles(website);

COMMIT;

-- Verify the changes
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'personal_profiles' 
-- AND column_name IN ('bio', 'website');
