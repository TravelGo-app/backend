import { createHash, randomBytes } from "node:crypto";

import { SUPPORTED_CURRENCIES } from "../../config/currencies.js";
import { env } from "../../config/env.js";
import { pool } from "../../db/pool.js";
import { sendPasswordResetEmail } from "../../services/email.service.js";
import { AppError } from "../../utils/AppError.js";
import { generateToken } from "../../utils/jwt.js";
import {
  comparePassword,
  hashPassword,
} from "../../utils/password.js";
import { createInitialBalances } from "../balances/balances.repository.js";
import { createWallet } from "../wallet/wallet.repository.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  markUserLogin,
  setUserPassword,
  updateUserPassword,
} from "./auth.repository.js";
import {
  createPasswordResetToken,
  findValidPasswordResetToken,
  invalidateUserPasswordResetTokens,
  markPasswordResetTokenUsed,
} from "./password-reset.repository.js";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SetPasswordInput,
} from "./auth.schemas.js";

const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_EXPIRATION_MINUTES = 60;

function mapUser(user: {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  password_hash: string | null;
  google_id: string | null;
  created_at: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url,
    hasPassword: user.password_hash !== null,
    hasGoogle: user.google_id !== null,
    createdAt: user.created_at,
  };
}

function hashPasswordResetToken(
  token: string
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function buildPasswordResetUrl(
  token: string
): string {
  const frontendUrl =
    env.frontendUrl.replace(/\/+$/, "");

  return `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function registerUser(
  data: RegisterInput
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await findUserByEmail(
      client,
      data.email
    );

    if (existingUser) {
      throw new AppError(
        "El email ya está registrado",
        409
      );
    }

    const passwordHash = await hashPassword(
      data.password
    );

    const user = await createUser(client, {
      name: data.name,
      email: data.email,
      passwordHash,
      birthDate: data.birthDate,
    });

    const wallet = await createWallet(
      client,
      user.id
    );

    const balances = await createInitialBalances(
      client,
      wallet.id,
      SUPPORTED_CURRENCIES
    );

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    await client.query("COMMIT");

    return {
      user: mapUser(user),
      wallet: {
        id: wallet.id,
        travelgoCvu: wallet.travelgo_cvu,
        travelgoAlias: wallet.travelgo_alias,
        simulation: true,
      },
      balances: balances.map((balance) => ({
        currencyCode: balance.currency_code,
        amount: balance.amount,
      })),
      token,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function loginUser(
  data: LoginInput
) {
  const client = await pool.connect();

  try {
    const user = await findUserByEmail(
      client,
      data.email
    );

    if (!user) {
      throw new AppError(
        "Credenciales inválidas",
        401
      );
    }

    const passwordHash = user.password_hash;

    if (!passwordHash) {
      throw new AppError(
        "Esta cuenta fue creada con Google. Iniciá sesión con Google y configurá una contraseña para usar el acceso tradicional.",
        409
      );
    }

    const passwordIsValid = await comparePassword(
      data.password,
      passwordHash
    );

    if (!passwordIsValid) {
      throw new AppError(
        "Credenciales inválidas",
        401
      );
    }

    const loggedInUser = await markUserLogin(
      client,
      user.id
    );

    const token = generateToken({
      userId: loggedInUser.id,
      email: loggedInUser.email,
    });

    return {
      user: mapUser(loggedInUser),
      token,
    };
  } finally {
    client.release();
  }
}

export async function getCurrentUser(
  userId: string
) {
  const client = await pool.connect();

  try {
    const user = await findUserById(
      client,
      userId
    );

    if (!user) {
      throw new AppError(
        "Usuario no encontrado",
        404
      );
    }

    return mapUser(user);
  } finally {
    client.release();
  }
}

export async function setPasswordForUser(
  userId: string,
  data: SetPasswordInput
) {
  const client = await pool.connect();

  try {
    const user = await findUserById(
      client,
      userId
    );

    if (!user) {
      throw new AppError(
        "Usuario no encontrado",
        404
      );
    }

    if (user.password_hash) {
      throw new AppError(
        "La cuenta ya tiene una contraseña configurada",
        409
      );
    }

    const passwordHash = await hashPassword(
      data.password
    );

    const updatedUser = await setUserPassword(
      client,
      user.id,
      passwordHash
    );

    if (!updatedUser) {
      throw new AppError(
        "La cuenta ya tiene una contraseña configurada",
        409
      );
    }

    return {
      user: mapUser(updatedUser),
    };
  } finally {
    client.release();
  }
}

export async function requestPasswordReset(
  data: ForgotPasswordInput
) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const user = await findUserByEmail(
      client,
      data.email
    );

    if (!user) {
      return {
        requested: true,
      };
    }

    const rawToken = randomBytes(
      PASSWORD_RESET_TOKEN_BYTES
    ).toString("hex");

    const tokenHash =
      hashPasswordResetToken(rawToken);

    const expiresAt = new Date(
      Date.now() +
        PASSWORD_RESET_EXPIRATION_MINUTES *
          60 *
          1000
    );

    await client.query("BEGIN");
    transactionStarted = true;

    await invalidateUserPasswordResetTokens(
      client,
      user.id
    );

    await createPasswordResetToken(client, {
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await client.query("COMMIT");
    transactionStarted = false;

    await sendPasswordResetEmail({
      toEmail: user.email,
      userName: user.name,
      resetUrl: buildPasswordResetUrl(rawToken),
      expiresInMinutes:
        PASSWORD_RESET_EXPIRATION_MINUTES,
    });

    return {
      requested: true,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function resetPasswordWithToken(
  data: ResetPasswordInput
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenHash =
      hashPasswordResetToken(data.token);

    const resetToken =
      await findValidPasswordResetToken(
        client,
        tokenHash
      );

    if (!resetToken) {
      throw new AppError(
        "El token es inválido o está vencido",
        400
      );
    }

    const passwordHash = await hashPassword(
      data.password
    );

    const updatedUser =
      await updateUserPassword(
        client,
        resetToken.user_id,
        passwordHash
      );

    if (!updatedUser) {
      throw new AppError(
        "Usuario no encontrado",
        404
      );
    }

    await markPasswordResetTokenUsed(
      client,
      resetToken.id
    );

    await invalidateUserPasswordResetTokens(
      client,
      resetToken.user_id
    );

    await client.query("COMMIT");

    return {
      user: mapUser(updatedUser),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
