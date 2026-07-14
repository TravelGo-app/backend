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


export type RecentTransactionDirection =
  | "in"
  | "out"
  | "exchange";

export type RecentTransactionRow = {
  id: string;
  wallet_id: string;
  destination_wallet_id: string | null;
  owner_email: string | null;
  destination_email: string | null;
  type: TransactionOperationType;
  direction: RecentTransactionDirection;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  from_amount: string;
  to_amount: string;
  exchange_rate: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
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

export async function listRecentTransactionsForUser(
  client: PoolClient,
  userId: string,
  limit: number
): Promise<RecentTransactionRow[]> {
  const result =
    await client.query<RecentTransactionRow>(
      `
      WITH current_wallet AS (
        SELECT id
        FROM wallets
        WHERE user_id = $1
        LIMIT 1
      )
      SELECT
        t.id,
        t.wallet_id,
        t.destination_wallet_id,
        owner_user.email AS owner_email,
        destination_user.email AS destination_email,
        t.type,
        CASE
          WHEN t.type = 'TRANSFER'
            AND t.destination_wallet_id = current_wallet.id
            THEN 'in'
          WHEN t.type = 'TRANSFER'
            AND t.wallet_id = current_wallet.id
            THEN 'out'
          WHEN t.type = 'EXCHANGE'
            THEN 'exchange'
          ELSE 'in'
        END AS direction,
        t.from_currency,
        t.to_currency,
        t.from_amount,
        t.to_amount,
        t.exchange_rate,
        t.status,
        t.created_at
      FROM transactions t
      INNER JOIN current_wallet
        ON current_wallet.id = t.wallet_id
        OR current_wallet.id = t.destination_wallet_id
      LEFT JOIN wallets owner_wallet
        ON owner_wallet.id = t.wallet_id
      LEFT JOIN users owner_user
        ON owner_user.id = owner_wallet.user_id
      LEFT JOIN wallets destination_wallet
        ON destination_wallet.id = t.destination_wallet_id
      LEFT JOIN users destination_user
        ON destination_user.id = destination_wallet.user_id
      WHERE t.status = 'SUCCESS'
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT $2
      `,
      [userId, limit]
    );

  return result.rows;
}


export type TransactionAnalyticsRow = {
  date: string;
  currency_code: CurrencyCode;
  deposits_in: string;
  transfers_in: string;
  transfers_out: string;
  exchanges_in: string;
  exchanges_out: string;
  net_flow: string;
  closing_balance: string;
  operation_count: number;
};

export type TransactionAnalyticsCountsRow = {
  total: number;
  deposits: number;
  transfers_sent: number;
  transfers_received: number;
  exchanges: number;
};

export async function listTransactionAnalyticsForUser(
  client: PoolClient,
  userId: string,
  days: number,
  currencyCodes: readonly CurrencyCode[]
): Promise<TransactionAnalyticsRow[]> {
  const result =
    await client.query<TransactionAnalyticsRow>(
      `
      WITH current_wallet AS (
        SELECT id
        FROM wallets
        WHERE user_id = $1
        LIMIT 1
      ),
      date_range AS (
        SELECT GENERATE_SERIES(
          CURRENT_DATE - (($2::integer - 1) * INTERVAL '1 day'),
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day
      ),
      currencies AS (
        SELECT currency_code
        FROM UNNEST($3::varchar[])
          AS currency_rows(currency_code)
      ),
      current_balances AS (
        SELECT
          b.currency_code,
          b.amount::numeric AS amount
        FROM balances b
        INNER JOIN current_wallet
          ON current_wallet.id = b.wallet_id
      ),
      events AS (
        SELECT
          t.created_at::date AS day,
          t.from_currency AS currency_code,
          t.from_amount::numeric AS deposits_in,
          0::numeric AS transfers_in,
          0::numeric AS transfers_out,
          0::numeric AS exchanges_in,
          0::numeric AS exchanges_out,
          t.from_amount::numeric AS net_flow,
          1::integer AS operation_count
        FROM transactions t
        INNER JOIN current_wallet
          ON current_wallet.id = t.wallet_id
        WHERE t.status = 'SUCCESS'
          AND t.type = 'DEPOSIT'
          AND t.created_at >= CURRENT_DATE - (($2::integer - 1) * INTERVAL '1 day')

        UNION ALL

        SELECT
          t.created_at::date,
          t.to_currency,
          0::numeric,
          t.to_amount::numeric,
          0::numeric,
          0::numeric,
          0::numeric,
          t.to_amount::numeric,
          1::integer
        FROM transactions t
        INNER JOIN current_wallet
          ON current_wallet.id = t.destination_wallet_id
        WHERE t.status = 'SUCCESS'
          AND t.type = 'TRANSFER'
          AND t.created_at >= CURRENT_DATE - (($2::integer - 1) * INTERVAL '1 day')

        UNION ALL

        SELECT
          t.created_at::date,
          t.from_currency,
          0::numeric,
          0::numeric,
          t.from_amount::numeric,
          0::numeric,
          0::numeric,
          -t.from_amount::numeric,
          1::integer
        FROM transactions t
        INNER JOIN current_wallet
          ON current_wallet.id = t.wallet_id
        WHERE t.status = 'SUCCESS'
          AND t.type = 'TRANSFER'
          AND t.created_at >= CURRENT_DATE - (($2::integer - 1) * INTERVAL '1 day')

        UNION ALL

        SELECT
          t.created_at::date,
          t.to_currency,
          0::numeric,
          0::numeric,
          0::numeric,
          t.to_amount::numeric,
          0::numeric,
          t.to_amount::numeric,
          1::integer
        FROM transactions t
        INNER JOIN current_wallet
          ON current_wallet.id = t.wallet_id
        WHERE t.status = 'SUCCESS'
          AND t.type = 'EXCHANGE'
          AND t.created_at >= CURRENT_DATE - (($2::integer - 1) * INTERVAL '1 day')

        UNION ALL

        SELECT
          t.created_at::date,
          t.from_currency,
          0::numeric,
          0::numeric,
          0::numeric,
          0::numeric,
          t.from_amount::numeric,
          -t.from_amount::numeric,
          1::integer
        FROM transactions t
        INNER JOIN current_wallet
          ON current_wallet.id = t.wallet_id
        WHERE t.status = 'SUCCESS'
          AND t.type = 'EXCHANGE'
          AND t.created_at >= CURRENT_DATE - (($2::integer - 1) * INTERVAL '1 day')
      ),
      daily AS (
        SELECT
          day,
          currency_code,
          SUM(deposits_in) AS deposits_in,
          SUM(transfers_in) AS transfers_in,
          SUM(transfers_out) AS transfers_out,
          SUM(exchanges_in) AS exchanges_in,
          SUM(exchanges_out) AS exchanges_out,
          SUM(net_flow) AS net_flow,
          SUM(operation_count)::integer AS operation_count
        FROM events
        GROUP BY day, currency_code
      ),
      series AS (
        SELECT
          date_range.day,
          currencies.currency_code,
          COALESCE(daily.deposits_in, 0::numeric) AS deposits_in,
          COALESCE(daily.transfers_in, 0::numeric) AS transfers_in,
          COALESCE(daily.transfers_out, 0::numeric) AS transfers_out,
          COALESCE(daily.exchanges_in, 0::numeric) AS exchanges_in,
          COALESCE(daily.exchanges_out, 0::numeric) AS exchanges_out,
          COALESCE(daily.net_flow, 0::numeric) AS net_flow,
          COALESCE(daily.operation_count, 0)::integer AS operation_count,
          COALESCE(current_balances.amount, 0::numeric) AS current_balance
        FROM date_range
        CROSS JOIN currencies
        LEFT JOIN daily
          ON daily.day = date_range.day
          AND daily.currency_code = currencies.currency_code
        LEFT JOIN current_balances
          ON current_balances.currency_code = currencies.currency_code
      )
      SELECT
        day::text AS date,
        currency_code,
        deposits_in::text,
        transfers_in::text,
        transfers_out::text,
        exchanges_in::text,
        exchanges_out::text,
        net_flow::text,
        (
          current_balance - COALESCE(
            SUM(net_flow) OVER (
              PARTITION BY currency_code
              ORDER BY day DESC
              ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
            ),
            0::numeric
          )
        )::text AS closing_balance,
        operation_count
      FROM series
      ORDER BY day ASC,
        ARRAY_POSITION($3::varchar[], currency_code) ASC
      `,
      [userId, days, [...currencyCodes]]
    );

  return result.rows;
}

export async function getTransactionAnalyticsCountsForUser(
  client: PoolClient,
  userId: string,
  days: number
): Promise<TransactionAnalyticsCountsRow> {
  const result =
    await client.query<TransactionAnalyticsCountsRow>(
      `
      WITH current_wallet AS (
        SELECT id
        FROM wallets
        WHERE user_id = $1
        LIMIT 1
      )
      SELECT
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (
          WHERE t.type = 'DEPOSIT'
            AND t.wallet_id = current_wallet.id
        )::integer AS deposits,
        COUNT(*) FILTER (
          WHERE t.type = 'TRANSFER'
            AND t.wallet_id = current_wallet.id
        )::integer AS transfers_sent,
        COUNT(*) FILTER (
          WHERE t.type = 'TRANSFER'
            AND t.destination_wallet_id = current_wallet.id
        )::integer AS transfers_received,
        COUNT(*) FILTER (
          WHERE t.type = 'EXCHANGE'
            AND t.wallet_id = current_wallet.id
        )::integer AS exchanges
      FROM transactions t
      INNER JOIN current_wallet
        ON current_wallet.id = t.wallet_id
        OR current_wallet.id = t.destination_wallet_id
      WHERE t.status = 'SUCCESS'
        AND t.created_at >= CURRENT_DATE - (($2::integer - 1) * INTERVAL '1 day')
      `,
      [userId, days]
    );

  return result.rows[0] ?? {
    total: 0,
    deposits: 0,
    transfers_sent: 0,
    transfers_received: 0,
    exchanges: 0,
  };
}
