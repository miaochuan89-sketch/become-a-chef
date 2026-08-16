CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  caption TEXT NOT NULL,
  recipe_name TEXT,
  image_key TEXT NOT NULL UNIQUE,
  image_type TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at);
PRAGMA optimize;
