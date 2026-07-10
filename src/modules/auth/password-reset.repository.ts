import type { PoolClient } from "pg";

export type PasswordResetTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
};

const PASSWORD_RESET_TOKEN_COLUMNS = `
  id,
  user_id,
  token_hash,
  expires_at,
  used_at,
  created_at
`;

export async function invalidateUserPasswordResetTokens(
  client: PoolClient,
  userId: string
): Promise<void> {
  await client.query(
    `
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE user_id = $1
      AND used_at IS NULL
    `,
    [userId]
  );
}

export async function createPasswordResetToken(
  client: PoolClient,
  data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }
): Promise<PasswordResetTokenRow> {
  const result =
    await client.query<PasswordResetTokenRow>(
      `
      INSERT INTO password_reset_tokens (
        user_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3)
      RETURNING ${PASSWORD_RESET_TOKEN_COLUMNS}
      `,
      [
        data.userId,
        data.tokenHash,
        data.expiresAt,
      ]
    );

  return result.rows[0];
}

export async function findValidPasswordResetToken(
  client: PoolClient,
  tokenHash: string
): Promise<PasswordResetTokenRow | null> {
  const result =
    await client.query<PasswordResetTokenRow>(
      `
      SELECT ${PASSWORD_RESET_TOKEN_COLUMNS}
      FROM password_reset_tokens
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
      `,
      [tokenHash]
    );

  return result.rows[0] ?? null;
}

export async function markPasswordResetTokenUsed(
  client: PoolClient,
  tokenId: string
): Promise<void> {
  await client.query(
    `
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE id = $1
    `,
    [tokenId]
  );
}
