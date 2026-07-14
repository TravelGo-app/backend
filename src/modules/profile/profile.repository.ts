import type { PoolClient } from "pg";
import type { CurrencyCode } from "../../config/currencies.js";

export type ProfileRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  birth_date: string | null;
  preferred_currency: CurrencyCode;
  email_verified_at: Date | null;
  last_login_at: Date | null;
  google_id: string | null;
  avatar_url: string | null;
  password_hash: string | null;
  created_at: Date;
  updated_at: Date;
  wallet_id: string;
  travelgo_cvu: string;
  travelgo_alias: string;
};

const PROFILE_COLUMNS = `
  u.id,
  u.name,
  u.email,
  u.phone,
  u.birth_date::text AS birth_date,
  u.preferred_currency,
  u.email_verified_at,
  u.last_login_at,
  u.google_id,
  u.avatar_url,
  u.password_hash,
  u.created_at,
  u.updated_at,
  w.id AS wallet_id,
  w.travelgo_cvu,
  w.travelgo_alias
`;

export async function findProfileByUserId(
  client: PoolClient,
  userId: string
): Promise<ProfileRow | null> {
  const result = await client.query<ProfileRow>(
    `
    SELECT ${PROFILE_COLUMNS}
    FROM users u
    INNER JOIN wallets w
      ON w.user_id = u.id
    WHERE u.id = $1
    LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function updateProfileByUserId(
  client: PoolClient,
  userId: string,
  data: {
    hasName: boolean;
    name?: string;
    hasPhone: boolean;
    phone?: string | null;
    hasBirthDate: boolean;
    birthDate?: string;
    hasPreferredCurrency: boolean;
    preferredCurrency?: CurrencyCode;
  }
): Promise<ProfileRow | null> {
  const result = await client.query<ProfileRow>(
    `
    UPDATE users
    SET
      name = CASE
        WHEN $2::boolean THEN $3::varchar
        ELSE name
      END,
      phone = CASE
        WHEN $4::boolean THEN $5::varchar
        ELSE phone
      END,
      birth_date = CASE
        WHEN $6::boolean THEN $7::date
        ELSE birth_date
      END,
      preferred_currency = CASE
        WHEN $8::boolean THEN $9::varchar
        ELSE preferred_currency
      END,
      updated_at = NOW()
    WHERE id = $1
    `,
    [
      userId,
      data.hasName,
      data.name ?? null,
      data.hasPhone,
      data.phone ?? null,
      data.hasBirthDate,
      data.birthDate ?? null,
      data.hasPreferredCurrency,
      data.preferredCurrency ?? null,
    ]
  );

  if (result.rowCount !== 1) {
    return null;
  }

  return findProfileByUserId(client, userId);
}

export async function updateTravelgoAlias(
  client: PoolClient,
  userId: string,
  alias: string
): Promise<ProfileRow | null> {
  const result = await client.query(
    `
    UPDATE wallets
    SET
      travelgo_alias = $2,
      updated_at = NOW()
    WHERE user_id = $1
    `,
    [userId, alias]
  );

  if (result.rowCount !== 1) {
    return null;
  }

  return findProfileByUserId(client, userId);
}

export async function updateUserEmail(
  client: PoolClient,
  userId: string,
  newEmail: string
): Promise<void> {
  const result = await client.query(
    `
    UPDATE users
    SET
      email = $2,
      email_verified_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    `,
    [userId, newEmail]
  );

  if (result.rowCount !== 1) {
    throw new Error(
      "No se pudo actualizar el email del usuario"
    );
  }
}
