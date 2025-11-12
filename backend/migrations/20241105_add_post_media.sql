-- Post media for multiple attachments
CREATE TABLE IF NOT EXISTS post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image','video','audio')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);