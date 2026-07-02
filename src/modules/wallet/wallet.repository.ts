import type { PoolClient } from "pg";

export type WalletRow = {
  id: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
};

export async function createWallet(
  client: PoolClient,
  userId: string
): Promise<WalletRow> {
  const result = await client.query<WalletRow>(
    `
    INSERT INTO wallets (user_id)
    VALUES ($1)
    RETURNING id, user_id, created_at, updated_at
    `,
    [userId]
  );

  return result.rows[0];
}

export async function findWalletByUserId(
  client: PoolClient,
  userId: string
): Promise<WalletRow | null> {
  const result = await client.query<WalletRow>(
    `
    SELECT id, user_id, created_at, updated_at
    FROM wallets
    WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}