import { INITIAL_BALANCES } from "../../config/currencies.js";
import { pool } from "../../db/pool.js";
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
  setUserPassword,
} from "./auth.repository.js";
import type {
  LoginInput,
  RegisterInput,
  SetPasswordInput,
} from "./auth.schemas.js";

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
    });

    const wallet = await createWallet(
      client,
      user.id
    );

    const balances = await createInitialBalances(
      client,
      wallet.id,
      INITIAL_BALANCES
    );

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    await client.query("COMMIT");

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
      wallet: {
        id: wallet.id,
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

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

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

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      hasPassword: user.password_hash !== null,
      hasGoogle: user.google_id !== null,
      createdAt: user.created_at,
    };
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
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatar_url,
        hasPassword: true,
        hasGoogle: updatedUser.google_id !== null,
        createdAt: updatedUser.created_at,
      },
    };
  } finally {
    client.release();
  }
}
