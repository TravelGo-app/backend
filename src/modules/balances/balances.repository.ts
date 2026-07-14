import type { PoolClient } from "pg";
import type { CurrencyCode } from "../../config/currencies.js";

export type BalanceRow = {
  id: string;
  wallet_id: string;
  currency_code: CurrencyCode;
  amount: string;
  created_at: Date;
  updated_at: Date;
};

export async function createInitialBalances(
  client: PoolClient,
  walletId: string,
  currencies: readonly CurrencyCode[]
): Promise<BalanceRow[]> {
  const result = await client.query<BalanceRow>(
    `
    WITH inserted AS (
      INSERT INTO balances (
        wallet_id,
        currency_code,
        amount
      )
      SELECT
        $1::uuid,
        currency_code,
        0::numeric
      FROM UNNEST($2::varchar[])
        AS currency_rows(currency_code)
      RETURNING
        id,
        wallet_id,
        currency_code,
        amount,
        created_at,
        updated_at
    )
    SELECT
      id,
      wallet_id,
      currency_code,
      amount,
      created_at,
      updated_at
    FROM inserted
    ORDER BY ARRAY_POSITION(
      $2::varchar[],
      currency_code
    )
    `,
    [walletId, [...currencies]]
  );

  return result.rows;
}

export async function findBalancesByWalletId(
  client: PoolClient,
  walletId: string
): Promise<BalanceRow[]> {
  const result = await client.query<BalanceRow>(
    `
    SELECT
      id,
      wallet_id,
      currency_code,
      amount,
      created_at,
      updated_at
    FROM balances
    WHERE wallet_id = $1
    ORDER BY CASE currency_code
      WHEN 'ARS' THEN 1
      WHEN 'USD' THEN 2
      WHEN 'EUR' THEN 3
      WHEN 'BRL' THEN 4
      WHEN 'CLP' THEN 5
      ELSE 6
    END
    `,
    [walletId]
  );

  return result.rows;
}