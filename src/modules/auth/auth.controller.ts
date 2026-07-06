import type {
  Request,
  Response,
} from "express";

import { AppError } from "../../utils/AppError.js";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  setPasswordForUser,
} from "./auth.service.js";
import { loginWithGoogle } from "./google-auth.service.js";
import {
  googleLoginSchema,
  loginSchema,
  registerSchema,
  setPasswordSchema,
} from "./auth.schemas.js";

export async function registerController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedBody =
    registerSchema.safeParse(req.body);

  if (!parsedBody.success) {
    const message =
      parsedBody.error.issues[0]?.message ??
      "Datos inválidos";

    throw new AppError(message, 400);
  }

  const result =
    await registerUser(parsedBody.data);

  res.status(201).json({
    message:
      "Usuario registrado correctamente",
    ...result,
  });
}

export async function loginController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedBody =
    loginSchema.safeParse(req.body);

  if (!parsedBody.success) {
    const message =
      parsedBody.error.issues[0]?.message ??
      "Datos inválidos";

    throw new AppError(message, 400);
  }

  const result =
    await loginUser(parsedBody.data);

  res.status(200).json({
    message:
      "Inicio de sesión correcto",
    ...result,
  });
}

export async function googleLoginController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedBody =
    googleLoginSchema.safeParse(req.body);

  if (!parsedBody.success) {
    const message =
      parsedBody.error.issues[0]?.message ??
      "Datos inválidos";

    throw new AppError(message, 400);
  }

  const result =
    await loginWithGoogle(
      parsedBody.data
    );

  res.status(200).json({
    message:
      "Inicio de sesión con Google correcto",
    ...result,
  });
}

export async function setPasswordController(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      "Usuario no autenticado",
      401
    );
  }

  const parsedBody =
    setPasswordSchema.safeParse(req.body);

  if (!parsedBody.success) {
    const message =
      parsedBody.error.issues[0]?.message ??
      "Datos inválidos";

    throw new AppError(message, 400);
  }

  const result = await setPasswordForUser(
    req.user.userId,
    parsedBody.data
  );

  res.status(200).json({
    message: "Contraseña configurada correctamente",
    ...result,
  });
}

export async function meController(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      "Usuario no autenticado",
      401
    );
  }

  const user =
    await getCurrentUser(
      req.user.userId
    );

  res.status(200).json({
    user,
  });
}