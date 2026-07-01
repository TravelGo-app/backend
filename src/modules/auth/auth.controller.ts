import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { registerUser } from "./auth.service.js";
import { registerSchema } from "./auth.schemas.js";

export async function registerController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedBody = registerSchema.safeParse(req.body);

  if (!parsedBody.success) {
    const message = parsedBody.error.issues[0]?.message ?? "Datos inválidos";
    throw new AppError(message, 400);
  }

  const result = await registerUser(parsedBody.data);

  res.status(201).json({
    message: "Usuario registrado correctamente",
    ...result,
  });
}