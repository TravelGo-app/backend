import { z } from "zod";
export const registerSchema = z.object({
    name: z
        .string()
        .min(2, "El nombre debe tener al menos 2 caracteres")
        .max(100, "El nombre no puede superar los 100 caracteres"),
    email: z
        .string()
        .email("Email inválido")
        .max(150, "El email no puede superar los 150 caracteres"),
    password: z
        .string()
        .min(6, "La contraseña debe tener al menos 6 caracteres"),
});
export const loginSchema = z.object({
    email: z
        .string()
        .email("Email inválido")
        .max(150, "El email no puede superar los 150 caracteres"),
    password: z
        .string()
        .min(6, "La contraseña debe tener al menos 6 caracteres"),
});
