import {
  createHash,
  randomBytes,
} from "node:crypto";
import type { DatabaseError } from "pg";

import { env } from "../../config/env.js";
import { pool } from "../../db/pool.js";
import { sendEmailChangeConfirmationEmail } from "../../services/email.service.js";
import { AppError } from "../../utils/AppError.js";
import { generateToken } from "../../utils/jwt.js";
import { findUserByEmail } from "../auth/auth.repository.js";
import {
  createEmailChangeToken,
  findValidEmailChangeTokenForUpdate,
  invalidateEmailChangeTokens,
  markEmailChangeTokenUsed,
} from "./email-change.repository.js";
import {
  findProfileByUserId,
  updateProfileByUserId,
  updateTravelgoAlias,
  updateUserEmail,
  type ProfileRow,
} from "./profile.repository.js";
import type {
  AliasUpdateInput,
  EmailChangeConfirmInput,
  EmailChangeRequestInput,
  ProfileUpdateInput,
} from "./profile.schemas.js";

const EMAIL_CHANGE_TOKEN_BYTES = 32;
const EMAIL_CHANGE_EXPIRATION_MINUTES = 60;
const MINIMUM_AGE = 17;

const RESERVED_ALIASES = new Set([
  "admin",
  "administrador",
  "api",
  "ayuda",
  "root",
  "security",
  "seguridad",
  "sistema",
  "soporte",
  "support",
  "system",
  "travelgo",
]);

function mapProfile(profile: ProfileRow) {
  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "TG";

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    birthDate: profile.birth_date,
    preferredCurrency:
      profile.preferred_currency,
    avatar: {
      url: profile.avatar_url,
      source: profile.avatar_url
        ? "google"
        : "initials",
      initials,
    },
    account: {
      emailVerified:
        profile.email_verified_at !== null ||
        profile.google_id !== null,
      phoneVerified: false,
      hasPassword:
        profile.password_hash !== null,
      hasGoogle: profile.google_id !== null,
      lastLoginAt: profile.last_login_at,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    },
    wallet: {
      id: profile.wallet_id,
      travelgoCvu: profile.travelgo_cvu,
      travelgoAlias:
        profile.travelgo_alias,
      simulation: true,
    },
    requirements: {
      minimumAge: MINIMUM_AGE,
      profileComplete:
        profile.birth_date !== null,
    },
  };
}

function hashEmailChangeToken(
  token: string
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function buildEmailChangeUrl(
  token: string
): string {
  const frontendUrl =
    env.frontendUrl.replace(/\/+$/, "");

  return `${frontendUrl}/confirm-email-change?token=${encodeURIComponent(token)}`;
}

function isUniqueViolation(
  error: unknown
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as DatabaseError).code === "23505"
  );
}

export async function getProfile(
  userId: string
) {
  const client = await pool.connect();

  try {
    const profile = await findProfileByUserId(
      client,
      userId
    );

    if (!profile) {
      throw new AppError(
        "Perfil no encontrado",
        404
      );
    }

    return {
      profile: mapProfile(profile),
      simulation: true,
    };
  } finally {
    client.release();
  }
}

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput
) {
  const client = await pool.connect();

  try {
    const has = (key: keyof ProfileUpdateInput) =>
      Object.prototype.hasOwnProperty.call(
        input,
        key
      );

    const profile = await updateProfileByUserId(
      client,
      userId,
      {
        hasName: has("name"),
        name: input.name,
        hasPhone: has("phone"),
        phone: input.phone,
        hasBirthDate: has("birthDate"),
        birthDate: input.birthDate,
        hasPreferredCurrency:
          has("preferredCurrency"),
        preferredCurrency:
          input.preferredCurrency,
      }
    );

    if (!profile) {
      throw new AppError(
        "Perfil no encontrado",
        404
      );
    }

    return {
      profile: mapProfile(profile),
    };
  } finally {
    client.release();
  }
}

export async function updateAlias(
  userId: string,
  input: AliasUpdateInput
) {
  if (RESERVED_ALIASES.has(input.alias)) {
    throw new AppError(
      "Ese alias está reservado",
      409
    );
  }

  const client = await pool.connect();

  try {
    const currentProfile =
      await findProfileByUserId(
        client,
        userId
      );

    if (!currentProfile) {
      throw new AppError(
        "Perfil no encontrado",
        404
      );
    }

    if (
      currentProfile.travelgo_alias ===
      input.alias
    ) {
      return {
        profile: mapProfile(currentProfile),
      };
    }

    try {
      const profile =
        await updateTravelgoAlias(
          client,
          userId,
          input.alias
        );

      if (!profile) {
        throw new AppError(
          "Perfil no encontrado",
          404
        );
      }

      return {
        profile: mapProfile(profile),
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(
          "El alias ya está en uso",
          409
        );
      }

      throw error;
    }
  } finally {
    client.release();
  }
}

export async function requestEmailChange(
  userId: string,
  input: EmailChangeRequestInput
) {
  if (!env.emailEnabled) {
    throw new AppError(
      "El cambio de email requiere que el envío de correos esté habilitado",
      503
    );
  }

  const client = await pool.connect();
  let rawToken = "";
  let userName = "";

  try {
    await client.query("BEGIN");

    const profile = await findProfileByUserId(
      client,
      userId
    );

    if (!profile) {
      throw new AppError(
        "Perfil no encontrado",
        404
      );
    }

    if (
      profile.email.toLowerCase() ===
      input.newEmail
    ) {
      throw new AppError(
        "El nuevo email debe ser diferente del actual",
        400
      );
    }

    const existingUser = await findUserByEmail(
      client,
      input.newEmail
    );

    if (existingUser) {
      throw new AppError(
        "El email ya está registrado",
        409
      );
    }

    rawToken = randomBytes(
      EMAIL_CHANGE_TOKEN_BYTES
    ).toString("hex");

    const expiresAt = new Date(
      Date.now() +
        EMAIL_CHANGE_EXPIRATION_MINUTES *
          60 *
          1000
    );

    await invalidateEmailChangeTokens(
      client,
      userId
    );

    await createEmailChangeToken(client, {
      userId,
      newEmail: input.newEmail,
      tokenHash:
        hashEmailChangeToken(rawToken),
      expiresAt,
    });

    userName = profile.name;

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  try {
    await sendEmailChangeConfirmationEmail({
      toEmail: input.newEmail,
      userName,
      confirmationUrl:
        buildEmailChangeUrl(rawToken),
      expiresInMinutes:
        EMAIL_CHANGE_EXPIRATION_MINUTES,
    });
  } catch (error) {
    console.error(
      "No se pudo enviar el email de cambio de dirección:",
      error instanceof Error
        ? error.message
        : "Error desconocido"
    );

    throw new AppError(
      "No se pudo enviar el correo de verificación. Intentá nuevamente.",
      503
    );
  }

  return {
    requested: true,
    expiresInMinutes:
      EMAIL_CHANGE_EXPIRATION_MINUTES,
  };
}

export async function confirmEmailChange(
  input: EmailChangeConfirmInput
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenHash =
      hashEmailChangeToken(input.token);

    const changeToken =
      await findValidEmailChangeTokenForUpdate(
        client,
        tokenHash
      );

    if (!changeToken) {
      throw new AppError(
        "El enlace de cambio de email es inválido o venció",
        400
      );
    }

    const existingUser = await findUserByEmail(
      client,
      changeToken.new_email
    );

    if (
      existingUser &&
      existingUser.id !== changeToken.user_id
    ) {
      throw new AppError(
        "El email ya está registrado",
        409
      );
    }

    try {
      await updateUserEmail(
        client,
        changeToken.user_id,
        changeToken.new_email
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(
          "El email ya está registrado",
          409
        );
      }

      throw error;
    }

    await markEmailChangeTokenUsed(
      client,
      changeToken.id
    );

    await invalidateEmailChangeTokens(
      client,
      changeToken.user_id
    );

    const profile = await findProfileByUserId(
      client,
      changeToken.user_id
    );

    if (!profile) {
      throw new AppError(
        "Perfil no encontrado",
        404
      );
    }

    const token = generateToken({
      userId: profile.id,
      email: profile.email,
    });

    await client.query("COMMIT");

    return {
      profile: mapProfile(profile),
      token,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
