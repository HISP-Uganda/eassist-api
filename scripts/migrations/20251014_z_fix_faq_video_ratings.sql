-- Add missing FAQ and Video ratings tables (faq_ratings, video_ratings)
-- This migration compensates for previously empty ratings migration.
-- Structure mirrors kb_ratings semantics: one rating per (resource,user), 1..5 scale.

CREATE TABLE IF NOT EXISTS faq_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id uuid NOT NULL REFERENCES faqs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (faq_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_faq_ratings_faq ON faq_ratings(faq_id);
CREATE INDEX IF NOT EXISTS idx_faq_ratings_user ON faq_ratings(user_id);

CREATE TABLE IF NOT EXISTS video_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_video_ratings_video ON video_ratings(video_id);
CREATE INDEX IF NOT EXISTS idx_video_ratings_user ON video_ratings(user_id);

