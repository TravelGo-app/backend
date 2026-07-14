import type { PoolClient } from "pg";

export type EmailChangeTokenRow = {
  id: string;
  user_id: string;
  new_email: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
};

export async function invalidateEmailChangeTokens(
  client: PoolClient,
  userId: string
): Promise<void> {
  await client.query(
    `
    UPDATE email_change_tokens
    SET used_at = COALESCE(used_at, NOW())
    WHERE user_id = $1
      AND used_at IS NULL
    `,
    [userId]
  );
}

export async function createEmailChangeToken(
  client: PoolClient,
  data: {
    userId: string;
    newEmail: string;
    tokenHash: string;
    expiresAt: Date;
  }
): Promise<void> {
  await client.query(
    `
    INSERT INTO email_change_tokens (
      user_id,
      new_email,
      token_hash,
      expires_at
    )
    VALUES ($1, $2, $3, $4)
    `,
    [
      data.userId,
      data.newEmail,
      data.tokenHash,
      data.expiresAt,
    ]
  );
}

export async function findValidEmailChangeTokenForUpdate(
  client: PoolClient,
  tokenHash: string
): Promise<EmailChangeTokenRow | null> {
  const result =
    await client.query<EmailChangeTokenRow>(
      `
      SELECT
        id,
        user_id,
        new_email,
        token_hash,
        expires_at,
        used_at,
        created_at
      FROM email_change_tokens
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
      FOR UPDATE
      `,
      [tokenHash]
    );

  return result.rows[0] ?? null;
}

export async function markEmailChangeTokenUsed(
  client: PoolClient,
  tokenId: string
): Promise<void> {
  await client.query(
    `
    UPDATE email_change_tokens
    SET used_at = NOW()
    WHERE id = $1
      AND used_at IS NULL
    `,
    [tokenId]
  );
}
