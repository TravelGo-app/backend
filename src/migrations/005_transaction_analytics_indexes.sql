CREATE INDEX IF NOT EXISTS idx_transactions_wallet_created_success
ON transactions(wallet_id, created_at DESC)
WHERE status = 'SUCCESS';

CREATE INDEX IF NOT EXISTS idx_transactions_destination_created_success
ON transactions(destination_wallet_id, created_at DESC)
WHERE status = 'SUCCESS'
  AND destination_wallet_id IS NOT NULL;
