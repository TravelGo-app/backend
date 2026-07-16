import type { PoolClient } from "pg";

import { env } from "../../config/env.js";
import { pool } from "../../db/pool.js";
import { AppError } from "../../utils/AppError.js";
import {
  enqueueEmail,
  ensureEmailPreferences,
  findEmailAccountByUserId,
  hasRecentEmailEvent,
  updateEmailPreferences,
  type EmailAccountRow,
  type EmailPreferencesRow,
} from "./email-outbox.repository.js";

function mapPreferences(
  preferences: EmailPreferencesRow
) {
  return {
    notifyDeposits:
      preferences.notify_deposits,
    notifyTransfersSent:
      preferences.notify_transfers_sent,
    notifyTransfersReceived:
      preferences.notify_transfers_received,
    notifyExchanges:
      preferences.notify_exchanges,
    notifyLoginDashboardReminder:
      preferences.notify_login_dashboard_reminder,
    updatedAt: preferences.updated_at,
  };
}

function maskAlias(alias: string): string {
  const normalized = alias.trim();

  if (normalized.length <= 4) {
    return `${normalized.slice(0, 1)}***`;
  }

  return `${normalized.slice(0, 4)}***`;
}

export async function queueWelcomeEmail(
  client: PoolClient,
  account: EmailAccountRow
): Promise<void> {
  await enqueueEmail(client, {
    eventType: "user_registered",
    userId: account.user_id,
    recipientEmail: account.email,
    deduplicationKey:
      `user_registered:${account.user_id}`,
    payload: {
      userName: account.name,
      travelgoAlias: account.travelgo_alias,
      travelgoCvu: account.travelgo_cvu,
      dashboardUrl:
        `${env.frontendUrl.replace(/\/+$/, "")}/dashboard`,
    },
  });
}

export async function queueDepositEmail(
  client: PoolClient,
  input: {
    account: EmailAccountRow;
    amount: string;
    currencyCode: string;
    balanceAfter: string;
    transactionId: string;
    createdAt: Date;
  }
): Promise<void> {
  const preferences =
    await ensureEmailPreferences(
      client,
      input.account.user_id
    );

  if (!preferences.notify_deposits) {
    return;
  }

  await enqueueEmail(client, {
    eventType: "deposit_completed",
    userId: input.account.user_id,
    recipientEmail: input.account.email,
    deduplicationKey:
      `deposit_completed:${input.transactionId}`,
    payload: {
      userName: input.account.name,
      amount: input.amount,
      currencyCode: input.currencyCode,
      balanceAfter: input.balanceAfter,
      transactionId: input.transactionId,
      createdAt: input.createdAt.toISOString(),
    },
  });
}

export async function queueTransferEmails(
  client: PoolClient,
  input: {
    sender: EmailAccountRow;
    recipient: EmailAccountRow;
    amount: string;
    currencyCode: string;
    senderBalanceAfter: string;
    transactionId: string;
    createdAt: Date;
  }
): Promise<void> {
  const senderPreferences =
    await ensureEmailPreferences(
      client,
      input.sender.user_id
    );
  const recipientPreferences =
    await ensureEmailPreferences(
      client,
      input.recipient.user_id
    );

  if (senderPreferences.notify_transfers_sent) {
    await enqueueEmail(client, {
      eventType: "transfer_sent",
      userId: input.sender.user_id,
      recipientEmail: input.sender.email,
      deduplicationKey:
        `transfer_sent:${input.transactionId}`,
      payload: {
        userName: input.sender.name,
        amount: input.amount,
        currencyCode: input.currencyCode,
        counterparty:
          maskAlias(input.recipient.travelgo_alias),
        balanceAfter: input.senderBalanceAfter,
        transactionId: input.transactionId,
        createdAt: input.createdAt.toISOString(),
      },
    });
  }

  if (
    recipientPreferences.notify_transfers_received
  ) {
    await enqueueEmail(client, {
      eventType: "transfer_received",
      userId: input.recipient.user_id,
      recipientEmail: input.recipient.email,
      deduplicationKey:
        `transfer_received:${input.transactionId}`,
      payload: {
        userName: input.recipient.name,
        amount: input.amount,
        currencyCode: input.currencyCode,
        counterparty:
          maskAlias(input.sender.travelgo_alias),
        transactionId: input.transactionId,
        createdAt: input.createdAt.toISOString(),
      },
    });
  }
}

export async function queueExchangeEmail(
  client: PoolClient,
  input: {
    account: EmailAccountRow;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: string;
    toAmount: string;
    exchangeRate: string;
    transactionId: string;
    createdAt: Date;
  }
): Promise<void> {
  const preferences =
    await ensureEmailPreferences(
      client,
      input.account.user_id
    );

  if (!preferences.notify_exchanges) {
    return;
  }

  await enqueueEmail(client, {
    eventType: "exchange_completed",
    userId: input.account.user_id,
    recipientEmail: input.account.email,
    deduplicationKey:
      `exchange_completed:${input.transactionId}`,
    payload: {
      userName: input.account.name,
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      fromAmount: input.fromAmount,
      toAmount: input.toAmount,
      exchangeRate: input.exchangeRate,
      transactionId: input.transactionId,
      createdAt: input.createdAt.toISOString(),
    },
  });
}

export async function queueLoginDashboardReminder(
  userId: string
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      SELECT pg_advisory_xact_lock(
        hashtextextended($1, 0)
      )
      `,
      [`travelgo:login-reminder:${userId}`]
    );

    const preferences =
      await ensureEmailPreferences(client, userId);

    if (
      !preferences.notify_login_dashboard_reminder
    ) {
      await client.query("COMMIT");
      return;
    }

    const alreadyQueued =
      await hasRecentEmailEvent(client, {
        userId,
        eventType: "login_dashboard_reminder",
        intervalMinutes: 24 * 60,
      });

    if (alreadyQueued) {
      await client.query("COMMIT");
      return;
    }

    const account =
      await findEmailAccountByUserId(
        client,
        userId
      );

    if (!account) {
      await client.query("COMMIT");
      return;
    }

    await enqueueEmail(client, {
      eventType: "login_dashboard_reminder",
      userId,
      recipientEmail: account.email,
      deduplicationKey:
        `login_dashboard_reminder:${userId}:${Date.now()}`,
      availableAt: new Date(
        Date.now() + 5 * 60 * 1000
      ),
      payload: {
        userName: account.name,
        dashboardUrl:
          `${env.frontendUrl.replace(/\/+$/, "")}/dashboard`,
      },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "No se pudo programar el recordatorio post-login:",
      error instanceof Error
        ? error.message
        : "Error desconocido"
    );
  } finally {
    client.release();
  }
}

export async function getUserEmailPreferences(
  userId: string
) {
  const client = await pool.connect();

  try {
    const preferences =
      await ensureEmailPreferences(
        client,
        userId
      );

    return {
      preferences: mapPreferences(preferences),
    };
  } finally {
    client.release();
  }
}

export async function setUserEmailPreferences(
  userId: string,
  input: {
    notifyDeposits?: boolean;
    notifyTransfersSent?: boolean;
    notifyTransfersReceived?: boolean;
    notifyExchanges?: boolean;
    notifyLoginDashboardReminder?: boolean;
  }
) {
  const client = await pool.connect();

  try {
    const preferences =
      await updateEmailPreferences(
        client,
        userId,
        input
      );

    return {
      preferences: mapPreferences(preferences),
    };
  } finally {
    client.release();
  }
}

export async function requireEmailAccount(
  client: PoolClient,
  userId: string
): Promise<EmailAccountRow> {
  const account = await findEmailAccountByUserId(
    client,
    userId
  );

  if (!account) {
    throw new AppError(
      "No se encontró la cuenta para notificaciones",
      404
    );
  }

  return account;
}
