-- Create token_blacklist table
CREATE TABLE IF NOT EXISTS token_blacklist (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_token UNIQUE (token)
);

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_token_blacklist_token ON token_blacklist(token);

-- Create index on expires_at for cleanup operations
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at ON token_blacklist(expires_at);
