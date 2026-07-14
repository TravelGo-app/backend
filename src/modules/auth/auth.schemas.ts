import { z } from "zod";

import { birthDateSchema } from "../profile/profile.schemas.js";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      2,
      "El nombre debe tener al menos 2 caracteres"
    )
    .max(
      100,
      "El nombre no puede superar los 100 caracteres"
    ),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido")
    .max(
      150,
      "El email no puede superar los 150 caracteres"
    ),

  password: z
    .string()
    .min(
      6,
      "La contraseña debe tener al menos 6 caracteres"
    ),

  birthDate: birthDateSchema.optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido")
    .max(
      150,
      "El email no puede superar los 150 caracteres"
    ),

  password: z
    .string()
    .min(
      6,
      "La contraseña debe tener al menos 6 caracteres"
    ),
});

export const googleLoginSchema = z.object({
  credential: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value
        : "",
    z
      .string()
      .trim()
      .min(
        1,
        "La credencial de Google es obligatoria"
      )
  ),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email inválido")
    .max(
      150,
      "El email no puede superar los 150 caracteres"
    ),
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(
      /^[a-fA-F0-9]{64}$/,
      "Token inválido"
    ),

  password: z
    .string()
    .min(
      6,
      "La contraseña debe tener al menos 6 caracteres"
    )
    .max(
      72,
      "La contraseña no puede superar los 72 caracteres"
    ),
});

export const setPasswordSchema = z.object({
  password: z
    .string()
    .min(
      6,
      "La contraseña debe tener al menos 6 caracteres"
    )
    .max(
      72,
      "La contraseña no puede superar los 72 caracteres"
    ),
});

export type RegisterInput =
  z.infer<typeof registerSchema>;

export type LoginInput =
  z.infer<typeof loginSchema>;

export type GoogleLoginInput =
  z.infer<typeof googleLoginSchema>;

export type ForgotPasswordInput =
  z.infer<typeof forgotPasswordSchema>;

export type ResetPasswordInput =
  z.infer<typeof resetPasswordSchema>;

export type SetPasswordInput =
  z.infer<typeof setPasswordSchema>;
