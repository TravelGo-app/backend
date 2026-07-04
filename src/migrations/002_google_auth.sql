ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
ON users(google_id)
WHERE google_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_auth_method_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_auth_method_check
      CHECK (
        password_hash IS NOT NULL
        OR google_id IS NOT NULL
      );
  END IF;
END
$$;