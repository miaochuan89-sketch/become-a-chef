ALTER TABLE posts ADD COLUMN notification_email TEXT;
ALTER TABLE posts ADD COLUMN notification_token TEXT;
ALTER TABLE posts ADD COLUMN notification_verified INTEGER NOT NULL DEFAULT 0;
PRAGMA optimize;
