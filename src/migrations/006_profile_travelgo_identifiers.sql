CREATE SEQUENCE IF NOT EXISTS travelgo_cvu_sequence
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 20;

CREATE OR REPLACE FUNCTION travelgo_make_cvu(
  sequence_value BIGINT
)
RETURNS VARCHAR(22)
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  base_value TEXT;
  weighted_sum INTEGER := 0;
  position INTEGER;
  digit INTEGER;
  check_digit INTEGER;
BEGIN
  IF sequence_value <= 0
     OR sequence_value > 999999999999999 THEN
    RAISE EXCEPTION 'Secuencia de CVU TravelGo fuera de rango';
  END IF;

  base_value :=
    '990000' || LPAD(sequence_value::TEXT, 15, '0');

  FOR position IN 1..LENGTH(base_value) LOOP
    digit := SUBSTRING(base_value, position, 1)::INTEGER;
    weighted_sum := weighted_sum +
      digit * CASE WHEN position % 2 = 0 THEN 1 ELSE 3 END;
  END LOOP;

  check_digit := (10 - (weighted_sum % 10)) % 10;

  RETURN (base_value || check_digit::TEXT)::VARCHAR(22);
END;
$$;

CREATE OR REPLACE FUNCTION travelgo_default_alias(
  display_name TEXT,
  wallet_id UUID
)
RETURNS VARCHAR(40)
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  normalized_name TEXT;
  suffix TEXT;
BEGIN
  normalized_name := LOWER(
    REGEXP_REPLACE(
      COALESCE(display_name, ''),
      '[^a-zA-Z0-9]+',
      '.',
      'g'
    )
  );

  normalized_name := TRIM(BOTH '.' FROM normalized_name);

  IF LENGTH(normalized_name) < 2 THEN
    normalized_name := 'usuario';
  END IF;

  normalized_name := LEFT(normalized_name, 30);
  normalized_name := TRIM(BOTH '.' FROM normalized_name);
  suffix := SUBSTRING(REPLACE(wallet_id::TEXT, '-', ''), 1, 6);

  RETURN (normalized_name || '.' || suffix)::VARCHAR(40);
END;
$$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL;

UPDATE users
SET email_verified_at = COALESCE(email_verified_at, created_at)
WHERE google_id IS NOT NULL
  AND email_verified_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_phone_format_v1'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_phone_format_v1 CHECK (
        phone IS NULL
        OR phone ~ '^[+][1-9][0-9]{7,14}$'
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_birth_date_range_v1'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_birth_date_range_v1 CHECK (
        birth_date IS NULL
        OR birth_date >= DATE '1900-01-01'
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_preferred_currency_v1'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_preferred_currency_v1 CHECK (
        preferred_currency IN ('ARS', 'USD', 'EUR', 'BRL', 'CLP')
      );
  END IF;
END
$$;

ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS travelgo_cvu VARCHAR(22),
  ADD COLUMN IF NOT EXISTS travelgo_alias VARCHAR(40);

UPDATE wallets
SET travelgo_cvu = travelgo_make_cvu(
  NEXTVAL('travelgo_cvu_sequence')
)
WHERE travelgo_cvu IS NULL;

UPDATE wallets AS wallet
SET travelgo_alias = travelgo_default_alias(
  users.name,
  wallet.id
)
FROM users
WHERE users.id = wallet.user_id
  AND wallet.travelgo_alias IS NULL;

ALTER TABLE wallets
  ALTER COLUMN travelgo_cvu SET NOT NULL,
  ALTER COLUMN travelgo_alias SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wallets_travelgo_cvu_format_v1'
      AND conrelid = 'wallets'::regclass
  ) THEN
    ALTER TABLE wallets
      ADD CONSTRAINT wallets_travelgo_cvu_format_v1 CHECK (
        travelgo_cvu ~ '^[0-9]{22}$'
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wallets_travelgo_alias_format_v1'
      AND conrelid = 'wallets'::regclass
  ) THEN
    ALTER TABLE wallets
      ADD CONSTRAINT wallets_travelgo_alias_format_v1 CHECK (
        travelgo_alias = LOWER(travelgo_alias)
        AND travelgo_alias ~ '^[a-z0-9][a-z0-9.]{1,38}[a-z0-9]$'
        AND POSITION('..' IN travelgo_alias) = 0
      );
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_travelgo_cvu_unique
ON wallets(travelgo_cvu);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_travelgo_alias_unique
ON wallets(LOWER(travelgo_alias));

CREATE TABLE IF NOT EXISTS email_change_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_email VARCHAR(150) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_change_tokens_user_id
ON email_change_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_change_tokens_valid
ON email_change_tokens(token_hash, expires_at)
WHERE used_at IS NULL;
