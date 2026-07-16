import type { PoolClient } from "pg";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
};

const USER_COLUMNS = `
  id,
  name,
  email,
  password_hash,
  google_id,
  avatar_url,
  created_at,
  updated_at
`;

export async function userEmailExists(
  client: PoolClient,
  email: string
): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM users
      WHERE LOWER(email) = LOWER($1)
    ) AS exists
    `,
    [email.trim()]
  );

  return result.rows[0]?.exists ?? false;
}

export async function findUserByEmail(
  client: PoolClient,
  email: string
): Promise<UserRow | null> {
  const result = await client.query<UserRow>(
    `
    SELECT ${USER_COLUMNS}
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
    `,
    [email.trim()]
  );

  return result.rows[0] ?? null;
}

export async function findUserById(
  client: PoolClient,
  userId: string
): Promise<UserRow | null> {
  const result = await client.query<UserRow>(
    `
    SELECT ${USER_COLUMNS}
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function findUserByGoogleId(
  client: PoolClient,
  googleId: string
): Promise<UserRow | null> {
  const result = await client.query<UserRow>(
    `
    SELECT ${USER_COLUMNS}
    FROM users
    WHERE google_id = $1
    LIMIT 1
    `,
    [googleId]
  );

  return result.rows[0] ?? null;
}

export async function createUser(
  client: PoolClient,
  data: {
    name: string;
    email: string;
    passwordHash: string;
    birthDate?: string;
  }
): Promise<UserRow> {
  const result = await client.query<UserRow>(
    `
    INSERT INTO users (
      name,
      email,
      password_hash,
      birth_date
    )
    VALUES ($1, $2, $3, $4)
    RETURNING ${USER_COLUMNS}
    `,
    [
      data.name.trim(),
      data.email.trim().toLowerCase(),
      data.passwordHash,
      data.birthDate ?? null,
    ]
  );

  return result.rows[0];
}

export async function createGoogleUser(
  client: PoolClient,
  data: {
    name: string;
    email: string;
    googleId: string;
    avatarUrl: string | null;
  }
): Promise<UserRow> {
  const result = await client.query<UserRow>(
    `
    INSERT INTO users (
      name,
      email,
      password_hash,
      google_id,
      avatar_url,
      email_verified_at
    )
    VALUES ($1, $2, NULL, $3, $4, NOW())
    RETURNING ${USER_COLUMNS}
    `,
    [
      data.name.trim(),
      data.email.trim().toLowerCase(),
      data.googleId,
      data.avatarUrl,
    ]
  );

  return result.rows[0];
}

export async function linkGoogleAccount(
  client: PoolClient,
  userId: string,
  data: {
    googleId: string;
    avatarUrl: string | null;
  }
): Promise<UserRow> {
  const result = await client.query<UserRow>(
    `
    UPDATE users
    SET
      google_id = $2,
      avatar_url = COALESCE($3, avatar_url),
      email_verified_at = COALESCE(
        email_verified_at,
        NOW()
      ),
      updated_at = NOW()
    WHERE id = $1
    RETURNING ${USER_COLUMNS}
    `,
    [
      userId,
      data.googleId,
      data.avatarUrl,
    ]
  );

  return result.rows[0];
}


export async function updateGoogleAvatar(
  client: PoolClient,
  userId: string,
  avatarUrl: string | null
): Promise<UserRow> {
  const result = await client.query<UserRow>(
    `
    UPDATE users
    SET
      avatar_url = COALESCE($2, avatar_url),
      email_verified_at = COALESCE(
        email_verified_at,
        NOW()
      ),
      updated_at = NOW()
    WHERE id = $1
    RETURNING ${USER_COLUMNS}
    `,
    [userId, avatarUrl]
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error(
      "No se pudo actualizar el avatar de Google"
    );
  }

  return user;
}

export async function setUserPassword(
  client: PoolClient,
  userId: string,
  passwordHash: string
): Promise<UserRow | null> {
  const result = await client.query<UserRow>(
    `
    UPDATE users
    SET
      password_hash = $2,
      updated_at = NOW()
    WHERE id = $1
      AND password_hash IS NULL
    RETURNING ${USER_COLUMNS}
    `,
    [userId, passwordHash]
  );

  return result.rows[0] ?? null;
}

export async function updateUserPassword(
  client: PoolClient,
  userId: string,
  passwordHash: string
): Promise<UserRow | null> {
  const result = await client.query<UserRow>(
    `
    UPDATE users
    SET
      password_hash = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING ${USER_COLUMNS}
    `,
    [userId, passwordHash]
  );

  return result.rows[0] ?? null;
}


export async function markUserLogin(
  client: PoolClient,
  userId: string
): Promise<UserRow> {
  const result = await client.query<UserRow>(
    `
    UPDATE users
    SET
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING ${USER_COLUMNS}
    `,
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error(
      "No se pudo actualizar el último acceso"
    );
  }

  return user;
}
