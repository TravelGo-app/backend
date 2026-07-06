import { z } from "zod";

import {
  SUPPORTED_CURRENCIES,
} from "../config/currencies.js";
import {
  TRANSACTION_TYPES,
} from "../config/transactions.js";
import {
  sendTransactionEmail,
} from "../services/email.service.js";

const emailInputSchema = z.object({
  toEmail: z
    .string()
    .trim()
    .email("Email destinatario inválido"),

  userName: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio"),

  type: z.enum(TRANSACTION_TYPES),

  fromCurrency: z.enum(
    SUPPORTED_CURRENCIES
  ),

  toCurrency: z.enum(
    SUPPORTED_CURRENCIES
  ),

  fromAmount: z
    .number()
    .positive(
      "fromAmount debe ser mayor que cero"
    ),

  toAmount: z
    .number()
    .positive(
      "toAmount debe ser mayor que cero"
    ),

  timestamp: z
    .string()
    .datetime({
      message:
        "timestamp debe ser ISO 8601",
    }),

  transactionId: z
    .string()
    .trim()
    .min(
      1,
      "transactionId es obligatorio"
    ),
});

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    return "";
  }

  process.stdin.setEncoding("utf8");

  let input = "";

  for await (const chunk of process.stdin) {
    input += chunk;
  }

  return input.trim();
}

const argumentInput =
  process.argv[2]?.trim() ?? "";

const stdinInput =
  argumentInput
    ? ""
    : await readStdin();

const rawInput =
  argumentInput || stdinInput;

if (!rawInput) {
  throw new Error(
    [
      "Falta el JSON de entrada.",
      "Podés enviarlo como argumento o mediante stdin.",
    ].join("\n")
  );
}

let jsonInput: unknown;

try {
  jsonInput = JSON.parse(rawInput);
} catch {
  throw new Error(
    "El contenido recibido no es un JSON válido"
  );
}

const parsedInput =
  emailInputSchema.safeParse(jsonInput);

if (!parsedInput.success) {
  console.error(
    JSON.stringify(
      parsedInput.error.flatten(),
      null,
      2
    )
  );

  process.exit(1);
}

try {
  const result =
    await sendTransactionEmail(
      parsedInput.data
    );

  console.log(
    JSON.stringify(result, null, 2)
  );
} catch (error) {
  console.error(
    "Error enviando email con AWS SES:",
    error
  );

  process.exitCode = 1;
}