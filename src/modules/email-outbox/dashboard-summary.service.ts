import { randomUUID } from "node:crypto";

import { pool } from "../../db/pool.js";
import { AppError } from "../../utils/AppError.js";
import { getProfile } from "../profile/profile.service.js";
import { getRates } from "../rates/rates.service.js";
import {
  getRecentTransactions,
  getTransactionAnalytics,
} from "../transactions/transactions.service.js";
import { getWalletBalances } from "../wallet/wallet.service.js";
import {
  enqueueEmail,
  findEmailAccountByUserId,
  hasRecentEmailEvent,
} from "./email-outbox.repository.js";

const SUMMARY_RATE_LIMIT_MINUTES = 5;

export async function queueDashboardSummaryEmail(
  userId: string,
  days: number
) {
  const [profileResult, walletResult, recentResult, analyticsResult] =
    await Promise.all([
      getProfile(userId),
      getWalletBalances(userId),
      getRecentTransactions(userId, {
        limit: 5,
      }),
      getTransactionAnalytics(userId, {
        days,
      }),
    ]);

  let ratesResult: Awaited<
    ReturnType<typeof getRates>
  > | null = null;

  try {
    ratesResult = await getRates("ARS");
  } catch (error) {
    console.error(
      "No se pudieron incluir tasas en el resumen del dashboard:",
      error instanceof Error
        ? error.message
        : "Error desconocido"
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      SELECT pg_advisory_xact_lock(
        hashtextextended($1, 0)
      )
      `,
      [`travelgo:dashboard-summary:${userId}`]
    );

    const recentlyRequested =
      await hasRecentEmailEvent(client, {
        userId,
        eventType: "dashboard_summary",
        intervalMinutes:
          SUMMARY_RATE_LIMIT_MINUTES,
      });

    if (recentlyRequested) {
      throw new AppError(
        "Esperá unos minutos antes de solicitar otro resumen",
        429
      );
    }

    const account =
      await findEmailAccountByUserId(
        client,
        userId
      );

    if (!account) {
      throw new AppError(
        "No se encontró la cuenta para enviar el resumen",
        404
      );
    }

    await enqueueEmail(client, {
      eventType: "dashboard_summary",
      userId,
      recipientEmail: account.email,
      deduplicationKey:
        `dashboard_summary:${userId}:${randomUUID()}`,
      payload: {
        userName: account.name,
        travelgoAlias:
          profileResult.profile.wallet.travelgoAlias,
        travelgoCvu:
          profileResult.profile.wallet.travelgoCvu,
        days,
        balances: walletResult.balances,
        recentTransactions:
          recentResult.transactions,
        operationCounts:
          analyticsResult.operationCounts,
        rates: ratesResult?.rates ?? null,
        ratesUpdatedAt:
          ratesResult?.updatedAt ?? null,
      },
    });

    await client.query("COMMIT");

    return {
      queued: true,
      days,
      rateLimitMinutes:
        SUMMARY_RATE_LIMIT_MINUTES,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
