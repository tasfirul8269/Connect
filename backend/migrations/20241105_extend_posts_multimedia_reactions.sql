-- Extend posts table for multimedia support
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) CHECK (media_type IN ('text', 'image', 'video', 'audio', 'mixed'));

-- Create reactions table (Facebook-style reactions)
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'angry', 'sad', 'wow')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Create shares table
CREATE TABLE IF NOT EXISTS post_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_content TEXT, -- Optional comment when sharing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create saved posts table (watch later)
CREATE TABLE IF NOT EXISTS saved_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Create comment reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'angry', 'sad', 'wow')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Drop old likes table since we're using reactions now
DROP TABLE IF EXISTS likes;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_user_id ON post_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON saved_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_media_type ON posts(media_type);