import { pool } from "../../db/pool.js";
import { AppError } from "../../utils/AppError.js";
import { findBalancesByWalletId } from "../balances/balances.repository.js";
import { findWalletByUserId } from "./wallet.repository.js";

export async function getWalletBalances(userId: string) {
  const client = await pool.connect();

  try {
    const wallet = await findWalletByUserId(client, userId);

    if (!wallet) {
      throw new AppError("Wallet no encontrada", 404);
    }

    const balances = await findBalancesByWalletId(client, wallet.id);

    return {
      wallet: {
        id: wallet.id,
        userId: wallet.user_id,
        createdAt: wallet.created_at,
      },
      balances: balances.map((balance) => ({
        currencyCode: balance.currency_code,
        amount: balance.amount,
        updatedAt: balance.updated_at,
      })),
    };
  } finally {
    client.release();
  }
}