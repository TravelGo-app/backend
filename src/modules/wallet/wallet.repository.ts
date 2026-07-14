import type { PoolClient } from "pg";

export type WalletRow = {
  id: string;
  user_id: string;
  travelgo_cvu: string;
  travelgo_alias: string;
  created_at: Date;
  updated_at: Date;
};

const WALLET_COLUMNS = `
  id,
  user_id,
  travelgo_cvu,
  travelgo_alias,
  created_at,
  updated_at
`;

export async function createWallet(
  client: PoolClient,
  userId: string
): Promise<WalletRow> {
  const result = await client.query<WalletRow>(
    `
    WITH generated_wallet AS (
      SELECT gen_random_uuid() AS id
    )
    INSERT INTO wallets (
      id,
      user_id,
      travelgo_cvu,
      travelgo_alias
    )
    SELECT
      generated_wallet.id,
      users.id,
      travelgo_make_cvu(
        NEXTVAL('travelgo_cvu_sequence')
      ),
      travelgo_default_alias(
        users.name,
        generated_wallet.id
      )
    FROM users
    CROSS JOIN generated_wallet
    WHERE users.id = $1
    RETURNING ${WALLET_COLUMNS}
    `,
    [userId]
  );

  const wallet = result.rows[0];

  if (!wallet) {
    throw new Error(
      "No se pudo crear la wallet del usuario"
    );
  }

  return wallet;
}

export async function findWalletByUserId(
  client: PoolClient,
  userId: string
): Promise<WalletRow | null> {
  const result = await client.query<WalletRow>(
    `
    SELECT ${WALLET_COLUMNS}
    FROM wallets
    WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}
