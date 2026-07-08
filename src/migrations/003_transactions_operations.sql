ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS destination_wallet_id UUID;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64);

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_type_valid;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_different_currencies;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_destination_wallet_fk'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_destination_wallet_fk
      FOREIGN KEY (destination_wallet_id)
      REFERENCES wallets(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_type_valid_v2'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_type_valid_v2 CHECK (
        type IN (
          'BUY',
          'SELL',
          'EXCHANGE',
          'DEPOSIT',
          'TRANSFER'
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_currency_relation_valid_v2'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_currency_relation_valid_v2 CHECK (
        (
          type IN ('DEPOSIT', 'TRANSFER')
          AND from_currency = to_currency
        )
        OR
        (
          type IN ('BUY', 'SELL', 'EXCHANGE')
          AND from_currency <> to_currency
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_destination_required_v2'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_destination_required_v2 CHECK (
        type <> 'TRANSFER'
        OR destination_wallet_id IS NOT NULL
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_idempotency_key_not_blank_v2'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_idempotency_key_not_blank_v2 CHECK (
        idempotency_key IS NULL
        OR LENGTH(BTRIM(idempotency_key)) > 0
      );
  END IF;
END
$$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_request_hash_valid_v2'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_request_hash_valid_v2 CHECK (
        (idempotency_key IS NULL AND request_hash IS NULL)
        OR
        (
          idempotency_key IS NOT NULL
          AND request_hash ~ '^[0-9a-f]{64}$'
        )
      );
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_wallet_idempotency
ON transactions(wallet_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_destination_wallet
ON transactions(destination_wallet_id)
WHERE destination_wallet_id IS NOT NULL;
