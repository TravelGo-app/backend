import { pool } from "../../db/pool.js";
import { INITIAL_BALANCES } from "../../config/currencies.js";
import { AppError } from "../../utils/AppError.js";
import { hashPassword } from "../../utils/password.js";
import { generateToken } from "../../utils/jwt.js";
import { createInitialBalances } from "../balances/balances.repository.js";
import { createWallet } from "../wallet/wallet.repository.js";
import { createUser, findUserByEmail } from "./auth.repository.js";
import type { RegisterInput } from "./auth.schemas.js";

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