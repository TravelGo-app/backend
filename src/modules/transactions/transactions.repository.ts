import type { PoolClient } from "pg";
import type { CurrencyCode } from "../../config/currencies.js";

export type TransactionOperationType =
  | "DEPOSIT"
  | "TRANSFER"
  | "EXCHANGE";

export type TransactionRow = {
  id: string;
  wallet_id: string;
  destination_wallet_id: string | null;
  destination_email: string | null;
  type: TransactionOperationType;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  from_amount: string;
  to_amount: string;
  exchange_rate: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  idempotency_key: string | null;
  request_hash: string | null;
  created_at: Date;
};

export type BalanceRow = {
  id: string;
  wallet_id: string;
  currency_code: CurrencyCode;
  amount: string;
  updated_at: Date;
};

export type RecipientWalletRow = {
  user_id: string;
  email: string;
  wallet_id: string;
};

const TRANSACTION_COLUMNS = `
  t.id,
  t.wallet_id,
  t.destination_wallet_id,
  destination_user.email AS destination_email,
  t.type,
  t.from_currency,
  t.to_currency,
  t.from_amount,
  t.to_amount,
  t.exchange_rate,
  t.status,
  t.idempotency_key,
  t.request_hash,
  t.created_at
`;

export async function acquireIdempotencyLock(
  client: PoolClient,
  walletId: string,
  idempotencyKey: string
): Promise<void> {
  await client.query(
    `
    SELECT pg_advisory_xact_lock(
      hashtextextended($1, 0)
    )
    `,
    [`travelgo:${walletId}:${idempotencyKey}`]
  );
}

export async function findTransactionByIdempotencyKey(
  client: PoolClient,
  walletId: string,
  idempotencyKey: string
): Promise<TransactionRow | null> {
  const result = await client.query<TransactionRow>(
    `
    SELECT ${TRANSACTION_COLUMNS}
    FROM transactions t
    LEFT JOIN wallets destination_wallet
      ON destination_wallet.id = t.destination_wallet_id
    LEFT JOIN users destination_user
      ON destination_user.id = destination_wallet.user_id
    WHERE t.wallet_id = $1
      AND t.idempotency_key = $2
    LIMIT 1
    `,
    [walletId, idempotencyKey]
  );

  return result.rows[0] ?? null;
}

export async function findRecipientWalletByEmail(
  client: PoolClient,
  email: string
): Promise<RecipientWalletRow | null> {
  const result = await client.query<RecipientWalletRow>(
    `
    SELECT
      u.id AS user_id,
      u.email,
      w.id AS wallet_id
    FROM users u
    INNER JOIN wallets w
      ON w.user_id = u.id
    WHERE LOWER(u.email) = LOWER($1)
    LIMIT 1
    `,
    [email.trim()]
  );

  return result.rows[0] ?? null;
}

export async function lockWallets(
  client: PoolClient,
  walletIds: string[]
): Promise<void> {
  await client.query(
    `
    SELECT id
    FROM wallets
    WHERE id = ANY($1::uuid[])
    ORDER BY id
    FOR UPDATE
    `,
    [walletIds]
  );
}

export async function lockBalances(
  client: PoolClient,
  requests: Array<{
    walletId: string;
    currencyCode: CurrencyCode;
  }>
): Promise<BalanceRow[]> {
  const walletIds = requests.map(
    (request) => request.walletId
  );
  const currencyCodes = requests.map(
    (request) => request.currencyCode
  );

  const result = await client.query<BalanceRow>(
    `
    WITH requested(wallet_id, currency_code) AS (
      SELECT *
      FROM UNNEST(
        $1::uuid[],
        $2::varchar[]
      )
    )
    SELECT
      b.id,
      b.wallet_id,
      b.currency_code,
      b.amount,
      b.updated_at
    FROM balances b
    INNER JOIN requested r
      ON r.wallet_id = b.wallet_id
      AND r.currency_code = b.currency_code
    ORDER BY b.wallet_id, b.currency_code
    FOR UPDATE OF b
    `,
    [walletIds, currencyCodes]
  );

  return result.rows;
}

export async function creditBalance(
  client: PoolClient,
  walletId: string,
  currencyCode: CurrencyCode,
  amount: string
): Promise<BalanceRow | null> {
  const result = await client.query<BalanceRow>(
    `
    UPDATE balances
    SET
      amount = amount + $3::numeric,
      updated_at = NOW()
    WHERE wallet_id = $1
      AND currency_code = $2
      AND amount + $3::numeric < 1000000000000::numeric
    RETURNING
      id,
      wallet_id,
      currency_code,
      amount,
      updated_at
    `,
    [walletId, currencyCode, amount]
  );

  return result.rows[0] ?? null;
}

export async function debitBalance(
  client: PoolClient,
  walletId: string,
  currencyCode: CurrencyCode,
  amount: string
): Promise<BalanceRow | null> {
  const result = await client.query<BalanceRow>(
    `
    UPDATE balances
    SET
      amount = amount - $3::numeric,
      updated_at = NOW()
    WHERE wallet_id = $1
      AND currency_code = $2
      AND amount >= $3::numeric
    RETURNING
      id,
      wallet_id,
      currency_code,
      amount,
      updated_at
    `,
    [walletId, currencyCode, amount]
  );

  return result.rows[0] ?? null;
}

export async function calculateExchangeAmounts(
  client: PoolClient,
  fromAmount: string,
  exchangeRate: string
): Promise<{
  exchange_rate: string;
  to_amount: string;
}> {
  const result = await client.query<{
    exchange_rate: string;
    to_amount: string;
  }>(
    `
    SELECT
      ROUND($2::numeric, 8)::text AS exchange_rate,
      ROUND(
        $1::numeric * ROUND($2::numeric, 8),
        6
      )::text AS to_amount
    `,
    [fromAmount, exchangeRate]
  );

  return result.rows[0];
}

export async function createTransaction(
  client: PoolClient,
  input: {
    walletId: string;
    destinationWalletId: string | null;
    type: TransactionOperationType;
    fromCurrency: CurrencyCode;
    toCurrency: CurrencyCode;
    fromAmount: string;
    toAmount: string;
    exchangeRate: string;
    idempotencyKey: string;
    requestHash: string;
  }
): Promise<TransactionRow> {
  const result = await client.query<TransactionRow>(
    `
    WITH inserted AS (
      INSERT INTO transactions (
        wallet_id,
        destination_wallet_id,
        type,
        from_currency,
        to_currency,
        from_amount,
        to_amount,
        exchange_rate,
        status,
        idempotency_key,
        request_hash
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        'SUCCESS',
        $9,
        $10
      )
      RETURNING *
    )
    SELECT
      inserted.id,
      inserted.wallet_id,
      inserted.destination_wallet_id,
      destination_user.email AS destination_email,
      inserted.type,
      inserted.from_currency,
      inserted.to_currency,
      inserted.from_amount,
      inserted.to_amount,
      inserted.exchange_rate,
      inserted.status,
      inserted.idempotency_key,
      inserted.request_hash,
      inserted.created_at
    FROM inserted
    LEFT JOIN wallets destination_wallet
      ON destination_wallet.id = inserted.destination_wallet_id
    LEFT JOIN users destination_user
      ON destination_user.id = destination_wallet.user_id
    `,
    [
      input.walletId,
      input.destinationWalletId,
      input.type,
      input.fromCurrency,
      input.toCurrency,
      input.fromAmount,
      input.toAmount,
      input.exchangeRate,
      input.idempotencyKey,
      input.requestHash,
    ]
  );

  return result.rows[0];
}
