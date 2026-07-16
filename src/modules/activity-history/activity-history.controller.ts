import type { Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { activityHistoryQuerySchema } from "./activity-history.schemas.js";
import { getActivityHistory } from "./activity-history.service.js";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AppError(
      "Usuario no autenticado",
      401
    );
  }

  return req.user.userId;
}

export async function activityHistoryController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedQuery =
    activityHistoryQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    throw new AppError(
      parsedQuery.error.issues[0]?.message ??
        "Filtros del historial inválidos",
      400
    );
  }

  const result = await getActivityHistory(
    requireUserId(req),
    parsedQuery.data
  );

  res.status(200).json(result);
}
