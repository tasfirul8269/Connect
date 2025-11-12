-- Rename extended_profiles to profile_details for better naming
ALTER TABLE extended_profiles RENAME TO profile_details;

-- Rename indexes
ALTER INDEX idx_extended_profiles_handle RENAME TO idx_profile_details_handle;
ALTER INDEX idx_extended_profiles_user_id RENAME TO idx_profile_details_user_id;

-- Rename trigger
DROP TRIGGER IF EXISTS trigger_update_extended_profiles_updated_at ON profile_details;
CREATE TRIGGER trigger_update_profile_details_updated_at
    BEFORE UPDATE ON profile_details
    FOR EACH ROW
    EXECUTE FUNCTION update_extended_profiles_updated_at();

-- Optionally rename the function too (for consistency)
ALTER FUNCTION update_extended_profiles_updated_at() RENAME TO update_profile_details_updated_at();
