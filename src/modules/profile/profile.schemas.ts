import { z } from "zod";

const MINIMUM_AGE = 17;

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isAtLeastMinimumAge(
  value: string
): boolean {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  const now = new Date();
  let age = now.getUTCFullYear() - year;

  const birthdayOccurred =
    now.getUTCMonth() + 1 > month ||
    (now.getUTCMonth() + 1 === month &&
      now.getUTCDate() >= day);

  if (!birthdayOccurred) {
    age -= 1;
  }

  return age >= MINIMUM_AGE;
}

export const birthDateSchema = z
  .string()
  .trim()
  .refine(
    isValidIsoDate,
    "La fecha de nacimiento debe tener formato AAAA-MM-DD"
  )
  .refine(
    (value) => value >= "1900-01-01",
    "La fecha de nacimiento no es válida"
  )
  .refine(
    isAtLeastMinimumAge,
    "Debés tener al menos 17 años"
  );

const profileNameSchema = z
  .string()
  .trim()
  .min(
    2,
    "El nombre debe tener al menos 2 caracteres"
  )
  .max(
    100,
    "El nombre no puede superar los 100 caracteres"
  );

const phoneValueSchema = z
  .string()
  .trim()
  .transform((value) =>
    value.replace(/[\s()-]/g, "")
  )
  .refine(
    (value) => /^\+[1-9]\d{7,14}$/.test(value),
    "El teléfono debe incluir código de país, por ejemplo +5491123456789"
  );

export const profileUpdateSchema = z
  .object({
    name: profileNameSchema.optional(),
    phone: z
      .union([phoneValueSchema, z.null()])
      .optional(),
    birthDate: birthDateSchema.optional(),
    preferredCurrency: z
      .enum(["ARS", "USD", "EUR", "BRL", "CLP"])
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.phone !== undefined ||
      value.birthDate !== undefined ||
      value.preferredCurrency !== undefined,
    "Debés enviar al menos un dato para actualizar"
  );

export const aliasUpdateSchema = z
  .object({
    alias: z
      .string()
      .trim()
      .toLowerCase()
      .min(
        3,
        "El alias debe tener al menos 3 caracteres"
      )
      .max(
        40,
        "El alias no puede superar los 40 caracteres"
      )
      .regex(
        /^(?!.*\.\.)[a-z0-9](?:[a-z0-9.]{1,38}[a-z0-9])$/,
        "El alias solo puede contener letras minúsculas, números y puntos"
      ),
  })
  .strict();

export const emailChangeRequestSchema = z
  .object({
    newEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("Email inválido")
      .max(
        150,
        "El email no puede superar los 150 caracteres"
      ),
  })
  .strict();

export const emailChangeConfirmSchema = z
  .object({
    token: z
      .string()
      .trim()
      .regex(
        /^[a-fA-F0-9]{64}$/,
        "Token inválido"
      ),
  })
  .strict();

export type ProfileUpdateInput =
  z.infer<typeof profileUpdateSchema>;

export type AliasUpdateInput =
  z.infer<typeof aliasUpdateSchema>;

export type EmailChangeRequestInput =
  z.infer<typeof emailChangeRequestSchema>;

export type EmailChangeConfirmInput =
  z.infer<typeof emailChangeConfirmSchema>;
