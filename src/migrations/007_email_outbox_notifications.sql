CREATE TABLE IF NOT EXISTS user_email_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notify_deposits BOOLEAN NOT NULL DEFAULT TRUE,
  notify_transfers_sent BOOLEAN NOT NULL DEFAULT TRUE,
  notify_transfers_received BOOLEAN NOT NULL DEFAULT TRUE,
  notify_exchanges BOOLEAN NOT NULL DEFAULT TRUE,
  notify_login_dashboard_reminder BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO user_email_preferences (user_id)
SELECT id
FROM users
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION travelgo_create_email_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_travelgo_create_email_preferences ON users;

CREATE TRIGGER trg_travelgo_create_email_preferences
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION travelgo_create_email_preferences();

CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(80) NOT NULL,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  recipient_email VARCHAR(150) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  deduplication_key VARCHAR(220) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ NULL,
  sent_at TIMESTAMPTZ NULL,
  provider_message_id VARCHAR(255) NULL,
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_outbox_status_valid_v1'
      AND conrelid = 'email_outbox'::regclass
  ) THEN
    ALTER TABLE email_outbox
      ADD CONSTRAINT email_outbox_status_valid_v1 CHECK (
        status IN ('pending', 'processing', 'sent', 'failed')
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_outbox_attempts_valid_v1'
      AND conrelid = 'email_outbox'::regclass
  ) THEN
    ALTER TABLE email_outbox
      ADD CONSTRAINT email_outbox_attempts_valid_v1 CHECK (
        attempt_count >= 0
        AND max_attempts BETWEEN 1 AND 20
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_outbox_recipient_not_blank_v1'
      AND conrelid = 'email_outbox'::regclass
  ) THEN
    ALTER TABLE email_outbox
      ADD CONSTRAINT email_outbox_recipient_not_blank_v1 CHECK (
        LENGTH(BTRIM(recipient_email)) > 0
      );
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_outbox_deduplication_key
ON email_outbox(deduplication_key);

CREATE INDEX IF NOT EXISTS idx_email_outbox_pending
ON email_outbox(status, available_at, created_at)
WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_email_outbox_user_event
ON email_outbox(user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_outbox_processing_stale
ON email_outbox(locked_at)
WHERE status = 'processing';
