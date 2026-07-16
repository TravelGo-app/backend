import { describe, expect, it } from "vitest";

import {
  depositSchema,
  exchangeSchema,
  recentTransactionsQuerySchema,
  transactionAnalyticsQuerySchema,
  transferSchema,
} from "../../src/modules/transactions/transactions.schemas.js";

const validKey = "operation-12345";

describe("depósitos", () => {
  it("normaliza el monto", () => {
    expect(
      depositSchema.parse({
        currencyCode: "USD",
        amount: "10.500000",
        idempotencyKey: validKey,
      }),
    ).toEqual({
      currencyCode: "USD",
      amount: "10.5",
      idempotencyKey: validKey,
    });
  });

  it.each([
    { currencyCode: "GBP", amount: "10", idempotencyKey: validKey },
    { currencyCode: "USD", amount: "0", idempotencyKey: validKey },
    { currencyCode: "USD", amount: "01", idempotencyKey: validKey },
    { currencyCode: "USD", amount: "1.1234567", idempotencyKey: validKey },
    { currencyCode: "USD", amount: "1234567890123", idempotencyKey: validKey },
    { currencyCode: "USD", amount: "10", idempotencyKey: "short" },
    { currencyCode: "USD", amount: "10", idempotencyKey: "invalid key" },
    {
      currencyCode: "USD",
      amount: "10",
      idempotencyKey: validKey,
      extra: true,
    },
  ])("rechaza depósito inválido %#", (payload) => {
    expect(depositSchema.safeParse(payload).success).toBe(false);
  });
});

describe("transferencias", () => {
  it("acepta y normaliza un email", () => {
    expect(
      transferSchema.parse({
        recipientIdentifier: " USER@TRAVELGO.COM ",
        currencyCode: "ARS",
        amount: "1000.00",
        idempotencyKey: validKey,
      }),
    ).toEqual({
      recipientIdentifier: "user@travelgo.com",
      currencyCode: "ARS",
      amount: "1000",
      idempotencyKey: validKey,
    });
  });

  it("mantiene compatibilidad con recipientEmail", () => {
    expect(
      transferSchema.parse({
        recipientEmail: "user@travelgo.com",
        currencyCode: "USD",
        amount: "5",
        idempotencyKey: validKey,
      }).recipientIdentifier,
    ).toBe("user@travelgo.com");
  });

  it.each(["mi.alias", "1234567890123456789012"])(
    "acepta el identificador %s",
    (recipientIdentifier) => {
      expect(
        transferSchema.safeParse({
          recipientIdentifier,
          currencyCode: "USD",
          amount: "5",
          idempotencyKey: validKey,
        }).success,
      ).toBe(true);
    },
  );

  it("rechaza la ausencia de destinatario", () => {
    expect(
      transferSchema.safeParse({
        currencyCode: "USD",
        amount: "5",
        idempotencyKey: validKey,
      }).success,
    ).toBe(false);
  });

  it("rechaza enviar recipientIdentifier y recipientEmail juntos", () => {
    expect(
      transferSchema.safeParse({
        recipientIdentifier: "mi.alias",
        recipientEmail: "user@travelgo.com",
        currencyCode: "USD",
        amount: "5",
        idempotencyKey: validKey,
      }).success,
    ).toBe(false);
  });
});

describe("intercambios", () => {
  it("acepta monedas diferentes", () => {
    expect(
      exchangeSchema.parse({
        fromCurrency: "ARS",
        toCurrency: "USD",
        amount: "2500.500000",
        idempotencyKey: validKey,
      }),
    ).toEqual({
      fromCurrency: "ARS",
      toCurrency: "USD",
      amount: "2500.5",
      idempotencyKey: validKey,
    });
  });

  it("rechaza intercambiar una moneda consigo misma", () => {
    expect(
      exchangeSchema.safeParse({
        fromCurrency: "USD",
        toCurrency: "USD",
        amount: "10",
        idempotencyKey: validKey,
      }).success,
    ).toBe(false);
  });
});

describe("queries de transacciones", () => {
  it("aplica valores por defecto", () => {
    expect(recentTransactionsQuerySchema.parse({})).toEqual({ limit: 10 });
    expect(transactionAnalyticsQuerySchema.parse({})).toEqual({ days: 30 });
  });

  it("convierte valores de query string", () => {
    expect(recentTransactionsQuerySchema.parse({ limit: "25" })).toEqual({
      limit: 25,
    });
    expect(transactionAnalyticsQuerySchema.parse({ days: "90" })).toEqual({
      days: 90,
    });
  });

  it.each([0, 51, 2.5])("rechaza limit=%s", (limit) => {
    expect(recentTransactionsQuerySchema.safeParse({ limit }).success).toBe(
      false,
    );
  });

  it.each([0, 366, 2.5])("rechaza days=%s", (days) => {
    expect(transactionAnalyticsQuerySchema.safeParse({ days }).success).toBe(
      false,
    );
  });
});
