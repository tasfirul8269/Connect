-- Create table for password reset OTPs
CREATE TABLE IF NOT EXISTS password_reset_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used BOOLEAN DEFAULT FALSE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON password_reset_otps(expires_at);

-- Cleanup function to delete expired OTPs (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_otps() RETURNS void AS $$
BEGIN
    DELETE FROM password_reset_otps WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
