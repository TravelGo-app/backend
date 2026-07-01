CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  currency_code VARCHAR(10) NOT NULL,
  amount NUMERIC(18, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT balances_amount_non_negative CHECK (amount >= 0),
  CONSTRAINT balances_currency_valid CHECK (
    currency_code IN ('ARS', 'USD', 'EUR', 'BRL', 'CLP')
  ),
  CONSTRAINT balances_wallet_currency_unique UNIQUE (wallet_id, currency_code)
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,

  type VARCHAR(20) NOT NULL,
  from_currency VARCHAR(10) NOT NULL,
  to_currency VARCHAR(10) NOT NULL,

  from_amount NUMERIC(18, 6) NOT NULL,
  to_amount NUMERIC(18, 6) NOT NULL,
  exchange_rate NUMERIC(18, 8) NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT transactions_type_valid CHECK (
    type IN ('BUY', 'SELL', 'EXCHANGE')
  ),
  CONSTRAINT transactions_status_valid CHECK (
    status IN ('SUCCESS', 'FAILED', 'PENDING')
  ),
  CONSTRAINT transactions_from_currency_valid CHECK (
    from_currency IN ('ARS', 'USD', 'EUR', 'BRL', 'CLP')
  ),
  CONSTRAINT transactions_to_currency_valid CHECK (
    to_currency IN ('ARS', 'USD', 'EUR', 'BRL', 'CLP')
  ),
  CONSTRAINT transactions_different_currencies CHECK (
    from_currency <> to_currency
  ),
  CONSTRAINT transactions_from_amount_positive CHECK (
    from_amount > 0
  ),
  CONSTRAINT transactions_to_amount_positive CHECK (
    to_amount > 0
  ),
  CONSTRAINT transactions_exchange_rate_positive CHECK (
    exchange_rate > 0
  )
);

CREATE TABLE IF NOT EXISTS exchange_rates_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  base_currency VARCHAR(10) NOT NULL,
  target_currency VARCHAR(10) NOT NULL,
  rate NUMERIC(18, 8) NOT NULL,

  provider VARCHAR(50) NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,

  CONSTRAINT exchange_rates_base_currency_valid CHECK (
    base_currency IN ('ARS', 'USD', 'EUR', 'BRL', 'CLP')
  ),
  CONSTRAINT exchange_rates_target_currency_valid CHECK (
    target_currency IN ('ARS', 'USD', 'EUR', 'BRL', 'CLP')
  ),
  CONSTRAINT exchange_rates_different_currencies CHECK (
    base_currency <> target_currency
  ),
  CONSTRAINT exchange_rates_rate_positive CHECK (
    rate > 0
  ),
  CONSTRAINT exchange_rates_pair_unique UNIQUE (
    base_currency,
    target_currency
  )
);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id
ON wallets(user_id);

CREATE INDEX IF NOT EXISTS idx_balances_wallet_id
ON balances(wallet_id);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id
ON transactions(wallet_id);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
ON transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair
ON exchange_rates_cache(base_currency, target_currency);