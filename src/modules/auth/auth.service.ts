import { pool } from "../../db/pool.js";
import { INITIAL_BALANCES } from "../../config/currencies.js";
import { AppError } from "../../utils/AppError.js";
import { comparePassword, hashPassword } from "../../utils/password.js";
import { generateToken } from "../../utils/jwt.js";
import { createInitialBalances } from "../balances/balances.repository.js";
import { createWallet } from "../wallet/wallet.repository.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
} from "./auth.repository.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

export async function registerUser(data: RegisterInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await findUserByEmail(client, data.email);

    if (existingUser) {
      throw new AppError("El email ya está registrado", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const user = await createUser(client, {
      name: data.name,
      email: data.email,
      passwordHash,
    });

    const wallet = await createWallet(client, user.id);

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

export async function loginUser(data: LoginInput) {
  const client = await pool.connect();

  try {
    const user = await findUserByEmail(client, data.email);

    if (!user) {
      throw new AppError("Credenciales inválidas", 401);
    }

    const passwordIsValid = await comparePassword(
      data.password,
      user.password_hash
    );

    if (!passwordIsValid) {
      throw new AppError("Credenciales inválidas", 401);
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
        createdAt: user.created_at,
      },
      token,
    };
  } finally {
    client.release();
  }
}

export async function getCurrentUser(userId: string) {
  const client = await pool.connect();

  try {
    const user = await findUserById(client, userId);

    if (!user) {
      throw new AppError("Usuario no encontrado", 404);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    };
  } finally {
    client.release();
  }
}