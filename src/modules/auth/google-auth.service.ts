import { OAuth2Client } from "google-auth-library";

import { SUPPORTED_CURRENCIES } from "../../config/currencies.js";
import { env } from "../../config/env.js";
import { pool } from "../../db/pool.js";
import { AppError } from "../../utils/AppError.js";
import { generateToken } from "../../utils/jwt.js";
import { createInitialBalances } from "../balances/balances.repository.js";
import {
  queueLoginDashboardReminder,
  queueWelcomeEmail,
} from "../email-outbox/email-notifications.service.js";
import { createWallet } from "../wallet/wallet.repository.js";
import {
  createGoogleUser,
  findUserByEmail,
  findUserByGoogleId,
  linkGoogleAccount,
  markUserLogin,
  updateGoogleAvatar,
} from "./auth.repository.js";
import type { GoogleLoginInput } from "./auth.schemas.js";

const googleClient = new OAuth2Client();

type GoogleIdentity = {
  googleId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  canAutoLinkByEmail: boolean;
};

async function verifyGoogleCredential(
  credential: string
): Promise<GoogleIdentity> {
  if (!env.googleAuthEnabled) {
    throw new AppError(
      "Google Login está deshabilitado",
      503
    );
  }

  if (!env.googleClientId) {
    throw new AppError(
      "Google Login no está configurado",
      503
    );
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });

    const payload = ticket.getPayload();

    if (
      !payload?.sub ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      throw new AppError(
        "La cuenta de Google no pudo verificarse",
        401
      );
    }

    const email = payload.email
      .trim()
      .toLowerCase();

    const fallbackName =
      email.split("@")[0] ||
      "Usuario TravelGo";

    const hostedDomain =
      payload.hd?.trim().toLowerCase() ?? "";

    const canAutoLinkByEmail =
      email.endsWith("@gmail.com") ||
      hostedDomain.length > 0;

    return {
      googleId: payload.sub,
      email,
      name:
        payload.name?.trim() ||
        fallbackName,
      avatarUrl:
        payload.picture?.trim() ||
        null,
      canAutoLinkByEmail,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Credencial de Google inválida o vencida",
      401
    );
  }
}

export async function loginWithGoogle(
  data: GoogleLoginInput
) {
  const identity =
    await verifyGoogleCredential(
      data.credential
    );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let user = await findUserByGoogleId(
      client,
      identity.googleId
    );

    let isNewUser = false;
    let accountLinked = false;

    if (!user) {
      const existingUser =
        await findUserByEmail(
          client,
          identity.email
        );

      if (existingUser) {
        if (
          existingUser.google_id &&
          existingUser.google_id !==
            identity.googleId
        ) {
          throw new AppError(
            "Este email ya está vinculado con otra cuenta de Google",
            409
          );
        }

        if (!identity.canAutoLinkByEmail) {
          throw new AppError(
            "Iniciá sesión con tu contraseña para vincular esta cuenta de Google",
            409
          );
        }

        user = await linkGoogleAccount(
          client,
          existingUser.id,
          {
            googleId: identity.googleId,
            avatarUrl: identity.avatarUrl,
          }
        );

        accountLinked = true;
      } else {
        user = await createGoogleUser(
          client,
          {
            googleId: identity.googleId,
            name: identity.name,
            email: identity.email,
            avatarUrl: identity.avatarUrl,
          }
        );

        const wallet = await createWallet(
          client,
          user.id
        );

        await createInitialBalances(
          client,
          wallet.id,
          SUPPORTED_CURRENCIES
        );

        await queueWelcomeEmail(client, {
          user_id: user.id,
          name: user.name,
          email: user.email,
          wallet_id: wallet.id,
          travelgo_cvu: wallet.travelgo_cvu,
          travelgo_alias: wallet.travelgo_alias,
        });

        isNewUser = true;
      }
    }

    user = await updateGoogleAvatar(
      client,
      user.id,
      identity.avatarUrl
    );

    user = await markUserLogin(
      client,
      user.id
    );

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    await client.query("COMMIT");

    await queueLoginDashboardReminder(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url,
        hasPassword: user.password_hash !== null,
        hasGoogle: user.google_id !== null,
        createdAt: user.created_at,
      },
      token,
      isNewUser,
      accountLinked,
      requiresPasswordSetup:
        user.password_hash === null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}