import type { PoolClient } from "pg";

export const EMAIL_EVENT_TYPES = [
  "user_registered",
  "deposit_completed",
  "transfer_sent",
  "transfer_received",
  "exchange_completed",
  "dashboard_summary",
  "login_dashboard_reminder",
] as const;

export type EmailEventType =
  (typeof EMAIL_EVENT_TYPES)[number];

export type EmailOutboxStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed";

export type EmailOutboxPayload =
  Record<string, unknown>;

export type EmailOutboxRow = {
  id: string;
  event_type: EmailEventType;
  user_id: string | null;
  recipient_email: string;
  payload: EmailOutboxPayload;
  deduplication_key: string;
  status: EmailOutboxStatus;
  attempt_count: number;
  max_attempts: number;
  available_at: Date;
  locked_at: Date | null;
  sent_at: Date | null;
  provider_message_id: string | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

export type EmailPreferencesRow = {
  user_id: string;
  notify_deposits: boolean;
  notify_transfers_sent: boolean;
  notify_transfers_received: boolean;
  notify_exchanges: boolean;
  notify_login_dashboard_reminder: boolean;
  created_at: Date;
  updated_at: Date;
};

export type EmailAccountRow = {
  user_id: string;
  name: string;
  email: string;
  wallet_id: string;
  travelgo_cvu: string;
  travelgo_alias: string;
};

const OUTBOX_COLUMNS = `
  id,
  event_type,
  user_id,
  recipient_email,
  payload,
  deduplication_key,
  status,
  attempt_count,
  max_attempts,
  available_at,
  locked_at,
  sent_at,
  provider_message_id,
  last_error,
  created_at,
  updated_at
`;

export async function enqueueEmail(
  client: PoolClient,
  input: {
    eventType: EmailEventType;
    userId: string | null;
    recipientEmail: string;
    payload: EmailOutboxPayload;
    deduplicationKey: string;
    availableAt?: Date;
    maxAttempts?: number;
  }
): Promise<EmailOutboxRow | null> {
  const result = await client.query<EmailOutboxRow>(
    `
    INSERT INTO email_outbox (
      event_type,
      user_id,
      recipient_email,
      payload,
      deduplication_key,
      available_at,
      max_attempts
    )
    VALUES (
      $1,
      $2,
      LOWER(BTRIM($3)),
      $4::jsonb,
      $5,
      COALESCE($6, NOW()),
      COALESCE($7, 5)
    )
    ON CONFLICT (deduplication_key)
    DO NOTHING
    RETURNING ${OUTBOX_COLUMNS}
    `,
    [
      input.eventType,
      input.userId,
      input.recipientEmail,
      JSON.stringify(input.payload),
      input.deduplicationKey,
      input.availableAt ?? null,
      input.maxAttempts ?? null,
    ]
  );

  return result.rows[0] ?? null;
}

export async function findEmailAccountByUserId(
  client: PoolClient,
  userId: string
): Promise<EmailAccountRow | null> {
  const result = await client.query<EmailAccountRow>(
    `
    SELECT
      u.id AS user_id,
      u.name,
      u.email,
      w.id AS wallet_id,
      w.travelgo_cvu,
      w.travelgo_alias
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

export async function ensureEmailPreferences(
  client: PoolClient,
  userId: string
): Promise<EmailPreferencesRow> {
  await client.query(
    `
    INSERT INTO user_email_preferences (user_id)
    VALUES ($1)
    ON CONFLICT (user_id) DO NOTHING
    `,
    [userId]
  );

  const result = await client.query<EmailPreferencesRow>(
    `
    SELECT
      user_id,
      notify_deposits,
      notify_transfers_sent,
      notify_transfers_received,
      notify_exchanges,
      notify_login_dashboard_reminder,
      created_at,
      updated_at
    FROM user_email_preferences
    WHERE user_id = $1
    `,
    [userId]
  );

  const preferences = result.rows[0];

  if (!preferences) {
    throw new Error(
      "No se pudieron obtener las preferencias de email"
    );
  }

  return preferences;
}

export async function updateEmailPreferences(
  client: PoolClient,
  userId: string,
  input: {
    notifyDeposits?: boolean;
    notifyTransfersSent?: boolean;
    notifyTransfersReceived?: boolean;
    notifyExchanges?: boolean;
    notifyLoginDashboardReminder?: boolean;
  }
): Promise<EmailPreferencesRow> {
  await ensureEmailPreferences(client, userId);

  const result = await client.query<EmailPreferencesRow>(
    `
    UPDATE user_email_preferences
    SET
      notify_deposits = COALESCE($2, notify_deposits),
      notify_transfers_sent = COALESCE($3, notify_transfers_sent),
      notify_transfers_received = COALESCE($4, notify_transfers_received),
      notify_exchanges = COALESCE($5, notify_exchanges),
      notify_login_dashboard_reminder = COALESCE(
        $6,
        notify_login_dashboard_reminder
      ),
      updated_at = NOW()
    WHERE user_id = $1
    RETURNING
      user_id,
      notify_deposits,
      notify_transfers_sent,
      notify_transfers_received,
      notify_exchanges,
      notify_login_dashboard_reminder,
      created_at,
      updated_at
    `,
    [
      userId,
      input.notifyDeposits ?? null,
      input.notifyTransfersSent ?? null,
      input.notifyTransfersReceived ?? null,
      input.notifyExchanges ?? null,
      input.notifyLoginDashboardReminder ?? null,
    ]
  );

  const preferences = result.rows[0];

  if (!preferences) {
    throw new Error(
      "No se pudieron actualizar las preferencias de email"
    );
  }

  return preferences;
}

export async function hasRecentEmailEvent(
  client: PoolClient,
  input: {
    userId: string;
    eventType: EmailEventType;
    intervalMinutes: number;
  }
): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM email_outbox
      WHERE user_id = $1
        AND event_type = $2
        AND created_at >= NOW() - ($3::integer * INTERVAL '1 minute')
    ) AS exists
    `,
    [
      input.userId,
      input.eventType,
      input.intervalMinutes,
    ]
  );

  return result.rows[0]?.exists === true;
}

export async function recoverStaleProcessingEmails(
  client: PoolClient,
  staleMinutes = 10
): Promise<number> {
  const result = await client.query(
    `
    UPDATE email_outbox
    SET
      status = 'pending',
      locked_at = NULL,
      available_at = NOW(),
      last_error = COALESCE(
        last_error,
        'Recuperado después de bloqueo vencido'
      ),
      updated_at = NOW()
    WHERE status = 'processing'
      AND locked_at < NOW() - ($1::integer * INTERVAL '1 minute')
    `,
    [staleMinutes]
  );

  return result.rowCount ?? 0;
}

export async function claimNextEmail(
  client: PoolClient
): Promise<EmailOutboxRow | null> {
  const result = await client.query<EmailOutboxRow>(
    `
    WITH candidate AS (
      SELECT id
      FROM email_outbox
      WHERE status IN ('pending', 'failed')
        AND available_at <= NOW()
        AND attempt_count < max_attempts
      ORDER BY available_at ASC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE email_outbox AS outbox
    SET
      status = 'processing',
      attempt_count = outbox.attempt_count + 1,
      locked_at = NOW(),
      updated_at = NOW()
    FROM candidate
    WHERE outbox.id = candidate.id
    RETURNING ${OUTBOX_COLUMNS}
    `
  );

  return result.rows[0] ?? null;
}

export async function markEmailSent(
  client: PoolClient,
  emailId: string,
  providerMessageId: string | null
): Promise<void> {
  await client.query(
    `
    UPDATE email_outbox
    SET
      status = 'sent',
      sent_at = NOW(),
      locked_at = NULL,
      provider_message_id = $2,
      last_error = NULL,
      updated_at = NOW()
    WHERE id = $1
    `,
    [emailId, providerMessageId]
  );
}

export async function markEmailFailed(
  client: PoolClient,
  input: {
    emailId: string;
    errorMessage: string;
    retryAt: Date | null;
  }
): Promise<void> {
  await client.query(
    `
    UPDATE email_outbox
    SET
      status = 'failed',
      locked_at = NULL,
      available_at = COALESCE($3, available_at),
      last_error = LEFT($2, 4000),
      updated_at = NOW()
    WHERE id = $1
    `,
    [input.emailId, input.errorMessage, input.retryAt]
  );
}
