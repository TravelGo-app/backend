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

export const transferSchema = z
  .object({
    recipientEmail: z
      .string()
      .trim()
      .email("Email del destinatario inválido")
      .max(150, "El email no puede superar los 150 caracteres")
      .transform((value) => value.toLowerCase()),
    currencyCode: currencySchema,
    amount: amountSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

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
