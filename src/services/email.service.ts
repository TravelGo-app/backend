import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

import { env } from "../config/env.js";
import { TransactionType } from "../config/transactions.js";
import type { CurrencyCode } from "../config/currencies.js";

export type TransactionEmailInput = {
  toEmail: string;
  userName: string;
  type: TransactionType;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  fromAmount: number;
  toAmount: number;
  timestamp: string;
  transactionId: string;
};

export type PasswordResetEmailInput = {
  toEmail: string;
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
};

export type EmailChangeConfirmationInput = {
  toEmail: string;
  userName: string;
  confirmationUrl: string;
  expiresInMinutes: number;
};

export type EmailSendResult = {
  sent: boolean;
  messageId: string | null;
  reason?: string;
};

let sesClient: SESClient | null = null;

function getSesClient(): SESClient {
  if (!env.awsRegion) {
    throw new Error(
      "AWS_REGION no está configurada"
    );
  }

  if (!sesClient) {
    sesClient = new SESClient({
      region: env.awsRegion,
    });
  }

  return sesClient;
}

function assertEmailConfiguration(): void {
  if (!env.awsSesFromEmail) {
    throw new Error(
      "AWS_SES_FROM_EMAIL no está configurada"
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(
      "El monto del email no es válido"
    );
  }

  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 6,
  }).format(amount);
}

export async function sendTransactionEmail(
  input: TransactionEmailInput
): Promise<EmailSendResult> {
  if (!env.emailEnabled) {
    return {
      sent: false,
      messageId: null,
      reason: "El envío de emails está deshabilitado",
    };
  }

  assertEmailConfiguration();

  const toEmail = input.toEmail
    .trim()
    .toLowerCase();

  if (!toEmail) {
    throw new Error(
      "El destinatario del email es obligatorio"
    );
  }

  const safeUserName = escapeHtml(
    input.userName.trim() || "Usuario"
  );

  const safeType = escapeHtml(input.type);
  const safeFromCurrency = escapeHtml(
    input.fromCurrency
  );
  const safeToCurrency = escapeHtml(
    input.toCurrency
  );
  const safeTimestamp = escapeHtml(
    input.timestamp
  );
  const safeTransactionId = input.transactionId
    ? escapeHtml(input.transactionId)
    : "No disponible";

  const fromAmount = formatAmount(
    input.fromAmount
  );
  const toAmount = formatAmount(
    input.toAmount
  );

  const subject =
    `TravelGo - Confirmación de ${input.type}`;

  const htmlBody = `
    <h2>Hola ${safeUserName},</h2>
    <p>Tu operación fue procesada exitosamente.</p>
    <ul>
      <li><strong>Tipo:</strong> ${safeType}</li>
      <li><strong>Desde:</strong> ${fromAmount} ${safeFromCurrency}</li>
      <li><strong>Hacia:</strong> ${toAmount} ${safeToCurrency}</li>
      <li><strong>Fecha:</strong> ${safeTimestamp}</li>
      <li><strong>Operación:</strong> ${safeTransactionId}</li>
    </ul>
    <p>Gracias por usar TravelGo.</p>
  `;

  const textBody = [
    `Hola ${input.userName.trim() || "Usuario"},`,
    "",
    "Tu operación fue procesada exitosamente.",
    `Tipo: ${input.type}`,
    `Desde: ${fromAmount} ${input.fromCurrency}`,
    `Hacia: ${toAmount} ${input.toCurrency}`,
    `Fecha: ${input.timestamp}`,
    `Operación: ${input.transactionId ?? "No disponible"}`,
    "",
    "Saludos, ",
    "El equipo de TravelGo.",
  ].join("\n");

  const command = new SendEmailCommand({
    Source: env.awsSesFromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: htmlBody,
        },
        Text: {
          Charset: "UTF-8",
          Data: textBody,
        },
      },
    },
  });

  const response = await getSesClient().send(
    command
  );

  return {
    sent: true,
    messageId: response.MessageId ?? null,
  };
}

export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput
): Promise<EmailSendResult> {
  if (!env.emailEnabled) {
    return {
      sent: false,
      messageId: null,
      reason: "El envío de emails está deshabilitado",
    };
  }

  assertEmailConfiguration();

  const toEmail = input.toEmail
    .trim()
    .toLowerCase();

  if (!toEmail) {
    throw new Error(
      "El destinatario del email es obligatorio"
    );
  }

  const safeUserName = escapeHtml(
    input.userName.trim() || "Usuario"
  );
  const safeResetUrl = escapeHtml(
    input.resetUrl
  );
  const expiresInMinutes =
    Number.isFinite(input.expiresInMinutes) &&
    input.expiresInMinutes > 0
      ? Math.floor(input.expiresInMinutes)
      : 60;

  const subject =
    "TravelGo - Recuperación de contraseña";

  const htmlBody = `
    <h2>Hola ${safeUserName},</h2>
    <p>Recibimos una solicitud para restablecer tu contraseña de TravelGo.</p>
    <p>Para crear una nueva contraseña, abrí este enlace:</p>
    <p><a href="${safeResetUrl}">Restablecer contraseña</a></p>
    <p>Este enlace vence en ${expiresInMinutes} minutos.</p>
    <p>Si no pediste este cambio, podés ignorar este email.</p>
    <p>Gracias por usar TravelGo.</p>
  `;

  const textBody = [
    `Hola ${input.userName.trim() || "Usuario"},`,
    "",
    "Recibimos una solicitud para restablecer tu contraseña de TravelGo.",
    "",
    "Abrí este enlace para crear una nueva contraseña:",
    input.resetUrl,
    "",
    `Este enlace vence en ${expiresInMinutes} minutos.`,
    "",
    "Si no pediste este cambio, podés ignorar este email.",
    "",
    "Gracias por usar TravelGo.",
  ].join("\n");

  const command = new SendEmailCommand({
    Source: env.awsSesFromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: htmlBody,
        },
        Text: {
          Charset: "UTF-8",
          Data: textBody,
        },
      },
    },
  });

  const response = await getSesClient().send(
    command
  );

  return {
    sent: true,
    messageId: response.MessageId ?? null,
  };
}


export async function sendEmailChangeConfirmationEmail(
  input: EmailChangeConfirmationInput
): Promise<EmailSendResult> {
  if (!env.emailEnabled) {
    return {
      sent: false,
      messageId: null,
      reason: "El envío de emails está deshabilitado",
    };
  }

  assertEmailConfiguration();

  const toEmail = input.toEmail
    .trim()
    .toLowerCase();

  if (!toEmail) {
    throw new Error(
      "El destinatario del email es obligatorio"
    );
  }

  const safeUserName = escapeHtml(
    input.userName.trim() || "Usuario"
  );
  const safeConfirmationUrl = escapeHtml(
    input.confirmationUrl
  );
  const expiresInMinutes =
    Number.isFinite(input.expiresInMinutes) &&
    input.expiresInMinutes > 0
      ? Math.floor(input.expiresInMinutes)
      : 60;

  const subject =
    "TravelGo - Confirmá tu nuevo email";

  const htmlBody = `
    <h2>Hola ${safeUserName},</h2>
    <p>Recibimos una solicitud para cambiar el email de tu cuenta TravelGo.</p>
    <p>Para confirmar el nuevo email, abrí este enlace:</p>
    <p><a href="${safeConfirmationUrl}">Confirmar nuevo email</a></p>
    <p>Este enlace vence en ${expiresInMinutes} minutos.</p>
    <p>Si no pediste este cambio, podés ignorar este email.</p>
    <p>TravelGo es una plataforma de simulación y no opera con dinero real.</p>
  `;

  const textBody = [
    `Hola ${input.userName.trim() || "Usuario"},`,
    "",
    "Recibimos una solicitud para cambiar el email de tu cuenta TravelGo.",
    "",
    "Abrí este enlace para confirmar el nuevo email:",
    input.confirmationUrl,
    "",
    `Este enlace vence en ${expiresInMinutes} minutos.`,
    "",
    "Si no pediste este cambio, podés ignorar este email.",
    "",
    "TravelGo es una plataforma de simulación y no opera con dinero real.",
  ].join("\n");

  const command = new SendEmailCommand({
    Source: env.awsSesFromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: htmlBody,
        },
        Text: {
          Charset: "UTF-8",
          Data: textBody,
        },
      },
    },
  });

  const response = await getSesClient().send(
    command
  );

  return {
    sent: true,
    messageId: response.MessageId ?? null,
  };
}
