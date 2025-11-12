-- Add bio column to personal_profiles table
-- Date: November 9, 2024

BEGIN;

-- Add bio column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'personal_profiles' AND column_name = 'bio'
    ) THEN
        ALTER TABLE personal_profiles ADD COLUMN bio TEXT;
    END IF;
END $$;

-- Update existing rows to have a default empty string for bio
UPDATE personal_profiles SET bio = '' WHERE bio IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE personal_profiles ALTER COLUMN bio SET NOT NULL;

COMMIT;
