import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import {
  depositFunds,
  exchangeFunds,
  transferFunds,
} from "./transactions.service.js";
import {
  depositSchema,
  exchangeSchema,
  transferSchema,
} from "./transactions.schemas.js";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AppError(
      "Usuario no autenticado",
      401
    );
  }

  return req.user.userId;
}

function validationErrorMessage(
  issues: Array<{ message: string }>
): string {
  return issues[0]?.message ?? "Datos inválidos";
}

export async function depositController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedBody = depositSchema.safeParse(
    req.body
  );

  if (!parsedBody.success) {
    throw new AppError(
      validationErrorMessage(
        parsedBody.error.issues
      ),
      400
    );
  }

  const result = await depositFunds(
    requireUserId(req),
    parsedBody.data
  );

  res
    .status(result.idempotentReplay ? 200 : 201)
    .json({
      message: result.idempotentReplay
        ? "Depósito ya procesado"
        : "Depósito procesado correctamente",
      ...result,
    });
}

export async function transferController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedBody = transferSchema.safeParse(
    req.body
  );

  if (!parsedBody.success) {
    throw new AppError(
      validationErrorMessage(
        parsedBody.error.issues
      ),
      400
    );
  }

  const result = await transferFunds(
    requireUserId(req),
    parsedBody.data
  );

  res
    .status(result.idempotentReplay ? 200 : 201)
    .json({
      message: result.idempotentReplay
        ? "Transferencia ya procesada"
        : "Transferencia procesada correctamente",
      ...result,
    });
}

export async function exchangeController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedBody = exchangeSchema.safeParse(
    req.body
  );

  if (!parsedBody.success) {
    throw new AppError(
      validationErrorMessage(
        parsedBody.error.issues
      ),
      400
    );
  }

  const result = await exchangeFunds(
    requireUserId(req),
    parsedBody.data
  );

  res
    .status(result.idempotentReplay ? 200 : 201)
    .json({
      message: result.idempotentReplay
        ? "Intercambio ya procesado"
        : "Intercambio procesado correctamente",
      ...result,
    });
}
