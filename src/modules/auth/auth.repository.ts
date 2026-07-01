import type { PoolClient } from "pg";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
};

export async function findUserByEmail(
  client: PoolClient,
  email: string
): Promise<UserRow | null> {
  const result = await client.query<UserRow>(
    `
    SELECT id, name, email, password_hash, created_at, updated_at
    FROM users
    WHERE email = $1
    `,
    [email]
  );

  return result.rows[0] ?? null;
}

export async function createUser(
  client: PoolClient,
  data: {
    name: string;
    email: string;
    passwordHash: string;
  }
): Promise<UserRow> {
  const result = await client.query<UserRow>(
    `
    INSERT INTO users (name, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, password_hash, created_at, updated_at
    `,
    [data.name, data.email, data.passwordHash]
  );

  return result.rows[0];
}