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
  balances: Record<CurrencyCode, number>
): Promise<BalanceRow[]> {
  const entries = Object.entries(balances) as [CurrencyCode, number][];
  const createdBalances: BalanceRow[] = [];

  for (const [currencyCode, amount] of entries) {
    const result = await client.query<BalanceRow>(
      `
      INSERT INTO balances (wallet_id, currency_code, amount)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        wallet_id,
        currency_code,
        amount,
        created_at,
        updated_at
      `,
      [walletId, currencyCode, amount]
    );

    createdBalances.push(result.rows[0]);
  }

  return createdBalances;
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