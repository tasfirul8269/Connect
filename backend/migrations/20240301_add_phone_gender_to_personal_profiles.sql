-- Add phone_number and gender columns to personal_profiles table
ALTER TABLE personal_profiles
ADD COLUMN phone_number VARCHAR(20),
ADD COLUMN gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other'));
