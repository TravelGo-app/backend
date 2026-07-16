import { env } from "../../config/env.js";
import { pool } from "../../db/pool.js";
import { sendRawEmail } from "../../services/email.service.js";
import {
  claimNextEmail,
  markEmailFailed,
  markEmailSent,
  recoverStaleProcessingEmails,
  type EmailOutboxRow,
} from "./email-outbox.repository.js";
import { renderEmail } from "./email-templates.js";

const POLL_INTERVAL_MS = 10_000;
const MAX_BATCH_SIZE = 10;

let workerTimer: NodeJS.Timeout | null = null;
let workerRunning = false;

function retryDelayMs(
  attemptCount: number
): number {
  const baseDelay = 30_000;
  const exponential =
    baseDelay * 2 ** Math.max(0, attemptCount - 1);

  return Math.min(exponential, 60 * 60 * 1000);
}

async function processEmail(
  email: EmailOutboxRow
): Promise<void> {
  const rendered = renderEmail(
    email.event_type,
    email.payload
  );

  const result = await sendRawEmail({
    toEmail: email.recipient_email,
    subject: rendered.subject,
    htmlBody: rendered.htmlBody,
    textBody: rendered.textBody,
  });

  if (!result.sent) {
    throw new Error(
      result.reason ??
        "El proveedor no confirmó el envío"
    );
  }

  const client = await pool.connect();

  try {
    await markEmailSent(
      client,
      email.id,
      result.messageId
    );
  } finally {
    client.release();
  }

  console.log(
    "[email.outbox.sent]",
    JSON.stringify({
      emailId: email.id,
      eventType: email.event_type,
      attempt: email.attempt_count,
      messageId: result.messageId,
    })
  );
}

async function handleFailure(
  email: EmailOutboxRow,
  error: unknown
): Promise<void> {
  const errorMessage =
    error instanceof Error
      ? error.message
      : "Error desconocido";

  const retryAt =
    email.attempt_count < email.max_attempts
      ? new Date(
          Date.now() +
            retryDelayMs(email.attempt_count)
        )
      : null;

  const client = await pool.connect();

  try {
    await markEmailFailed(client, {
      emailId: email.id,
      errorMessage,
      retryAt,
    });
  } finally {
    client.release();
  }

  console.error(
    "[email.outbox.failed]",
    JSON.stringify({
      emailId: email.id,
      eventType: email.event_type,
      attempt: email.attempt_count,
      maxAttempts: email.max_attempts,
      retryAt: retryAt?.toISOString() ?? null,
      error: errorMessage,
    })
  );
}

async function claimEmail(): Promise<EmailOutboxRow | null> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const email = await claimNextEmail(client);
    await client.query("COMMIT");
    return email;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function runWorkerCycle(): Promise<void> {
  if (workerRunning || !env.emailEnabled) {
    return;
  }

  workerRunning = true;

  try {
    for (
      let processed = 0;
      processed < MAX_BATCH_SIZE;
      processed += 1
    ) {
      const email = await claimEmail();

      if (!email) {
        break;
      }

      try {
        await processEmail(email);
      } catch (error) {
        await handleFailure(email, error);
      }
    }
  } catch (error) {
    console.error(
      "[email.outbox.worker_error]",
      error instanceof Error
        ? error.message
        : "Error desconocido"
    );
  } finally {
    workerRunning = false;
  }
}

export async function startEmailOutboxWorker(): Promise<void> {
  if (!env.emailEnabled) {
    console.log(
      "[email.outbox.disabled] EMAIL_ENABLED=false"
    );
    return;
  }

  const client = await pool.connect();

  try {
    const recovered =
      await recoverStaleProcessingEmails(client);

    if (recovered > 0) {
      console.log(
        "[email.outbox.recovered]",
        JSON.stringify({ recovered })
      );
    }
  } finally {
    client.release();
  }

  await runWorkerCycle();

  if (!workerTimer) {
    workerTimer = setInterval(() => {
      void runWorkerCycle();
    }, POLL_INTERVAL_MS);

    workerTimer.unref();
  }

  console.log(
    "[email.outbox.started]",
    JSON.stringify({
      pollIntervalMs: POLL_INTERVAL_MS,
      batchSize: MAX_BATCH_SIZE,
    })
  );
}

export function stopEmailOutboxWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
}
