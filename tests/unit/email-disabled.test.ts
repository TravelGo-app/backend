import { describe, expect, it } from "vitest";

import {
  sendEmailChangeConfirmationEmail,
  sendPasswordResetEmail,
  sendTransactionEmail,
} from "../../src/services/email.service.js";

const disabledResult = {
  sent: false,
  messageId: null,
  reason: "El envío de emails está deshabilitado",
};

describe("servicio de email con EMAIL_ENABLED=false", () => {
  it("no intenta enviar confirmaciones de transacción", async () => {
    await expect(
      sendTransactionEmail({
        toEmail: "user@travelgo.com",
        userName: "Nadia",
        type: "EXCHANGE",
        fromCurrency: "ARS",
        toCurrency: "USD",
        fromAmount: 1000,
        toAmount: 1,
        timestamp: new Date(0).toISOString(),
        transactionId: "tx-1",
      }),
    ).resolves.toEqual(disabledResult);
  });

  it("no intenta enviar recuperación de contraseña", async () => {
    await expect(
      sendPasswordResetEmail({
        toEmail: "user@travelgo.com",
        userName: "Nadia",
        resetUrl: "https://travelgo.test/reset",
        expiresInMinutes: 60,
      }),
    ).resolves.toEqual(disabledResult);
  });

  it("no intenta enviar confirmación de cambio de email", async () => {
    await expect(
      sendEmailChangeConfirmationEmail({
        toEmail: "user@travelgo.com",
        userName: "Nadia",
        confirmationUrl: "https://travelgo.test/confirm",
        expiresInMinutes: 60,
      }),
    ).resolves.toEqual(disabledResult);
  });
});
