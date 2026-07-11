
import { z } from "zod";

export const chatMessageSchema = z.object({
  sessionId: z
    .string()
    .trim()
    .min(8, "sessionId debe tener al menos 8 caracteres")
    .max(120, "sessionId no puede superar los 120 caracteres")
    .regex(/^[a-zA-Z0-9._:-]+$/, "sessionId contiene caracteres inválidos"),

  message: z
    .string()
    .trim()
    .min(1, "El mensaje es obligatorio")
    .max(1500, "El mensaje no puede superar los 1500 caracteres"),
});

export type ChatMessageInput =
  z.infer<typeof chatMessageSchema>;
