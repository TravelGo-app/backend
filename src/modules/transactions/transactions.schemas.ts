import { z } from "zod";

const currencySchema = z.enum([
  "ARS",
  "USD",
  "EUR",
  "BRL",
  "CLP",
]);

const amountSchema = z
  .string()
  .trim()
  .regex(
    /^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/,
    "El monto debe ser un decimal positivo con hasta 12 enteros y 6 decimales"
  )
  .refine(
    (value) => Number(value) > 0,
    "El monto debe ser mayor que cero"
  )
  .transform((value) => {
    const [integerPart, decimalPart = ""] =
      value.split(".");
    const normalizedDecimal = decimalPart
      .replace(/0+$/, "");

    return normalizedDecimal
      ? `${integerPart}.${normalizedDecimal}`
      : integerPart;
  });

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, "La clave de idempotencia debe tener al menos 8 caracteres")
  .max(100, "La clave de idempotencia no puede superar los 100 caracteres")
  .regex(
    /^[A-Za-z0-9._:-]+$/,
    "La clave de idempotencia contiene caracteres inválidos"
  );

export const depositSchema = z
  .object({
    currencyCode: currencySchema,
    amount: amountSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

const recipientEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email del destinatario inválido")
  .max(
    150,
    "El email no puede superar los 150 caracteres"
  );

const recipientIdentifierSchema = z.union([
  recipientEmailSchema,
  z
    .string()
    .trim()
    .regex(
      /^\d{22}$/,
      "El CVU TravelGo debe tener 22 dígitos"
    ),
  z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^(?!.*\.\.)[a-z0-9](?:[a-z0-9.]{1,38}[a-z0-9])$/,
      "El alias TravelGo no es válido"
    ),
]);

export const transferSchema = z
  .object({
    recipientIdentifier:
      recipientIdentifierSchema.optional(),
    recipientEmail:
      recipientEmailSchema.optional(),
    currencyCode: currencySchema,
    amount: amountSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine(
    (value) =>
      Boolean(
        value.recipientIdentifier ||
        value.recipientEmail
      ),
    {
      message:
        "Debés indicar el email, alias o CVU TravelGo del destinatario",
      path: ["recipientIdentifier"],
    }
  )
  .refine(
    (value) =>
      !(
        value.recipientIdentifier &&
        value.recipientEmail
      ),
    {
      message:
        "Enviá recipientIdentifier o recipientEmail, no ambos",
      path: ["recipientIdentifier"],
    }
  )
  .transform(
    ({
      recipientIdentifier,
      recipientEmail,
      ...operation
    }) => ({
      ...operation,
      recipientIdentifier:
        recipientIdentifier ??
        recipientEmail!,
    })
  );

export const exchangeSchema = z
  .object({
    fromCurrency: currencySchema,
    toCurrency: currencySchema,
    amount: amountSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine(
    (value) => value.fromCurrency !== value.toCurrency,
    {
      message: "La moneda origen y destino deben ser diferentes",
      path: ["toCurrency"],
    }
  );

export type DepositInput = z.infer<typeof depositSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type ExchangeInput = z.infer<typeof exchangeSchema>;

export const recentTransactionsQuerySchema =
  z.object({
    limit: z.coerce
      .number()
      .int("El límite debe ser un entero")
      .min(1, "El límite mínimo es 1")
      .max(50, "El límite máximo es 50")
      .default(10),
  });

export type RecentTransactionsQuery =
  z.infer<typeof recentTransactionsQuerySchema>;


export const transactionAnalyticsQuerySchema =
  z.object({
    days: z.coerce
      .number()
      .int("La cantidad de días debe ser un entero")
      .min(1, "El período mínimo es 1 día")
      .max(365, "El período máximo es 365 días")
      .default(30),
  });

export type TransactionAnalyticsQuery =
  z.infer<typeof transactionAnalyticsQuerySchema>;
