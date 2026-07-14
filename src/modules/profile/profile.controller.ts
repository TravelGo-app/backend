import type {
  Request,
  Response,
} from "express";

import { AppError } from "../../utils/AppError.js";
import {
  confirmEmailChange,
  getProfile,
  requestEmailChange,
  updateAlias,
  updateProfile,
} from "./profile.service.js";
import {
  aliasUpdateSchema,
  emailChangeConfirmSchema,
  emailChangeRequestSchema,
  profileUpdateSchema,
} from "./profile.schemas.js";

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

export async function getProfileController(
  req: Request,
  res: Response
): Promise<void> {
  const result = await getProfile(
    requireUserId(req)
  );

  res.status(200).json(result);
}

export async function updateProfileController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedBody =
    profileUpdateSchema.safeParse(req.body);

  if (!parsedBody.success) {
    throw new AppError(
      validationErrorMessage(
        parsedBody.error.issues
      ),
      400
    );
  }

  const result = await updateProfile(
    requireUserId(req),
    parsedBody.data
  );

  res.status(200).json({
    message: "Perfil actualizado correctamente",
    ...result,
  });
}

export async function updateAliasController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedBody =
    aliasUpdateSchema.safeParse(req.body);

  if (!parsedBody.success) {
    throw new AppError(
      validationErrorMessage(
        parsedBody.error.issues
      ),
      400
    );
  }

  const result = await updateAlias(
    requireUserId(req),
    parsedBody.data
  );

  res.status(200).json({
    message: "Alias actualizado correctamente",
    ...result,
  });
}

export async function requestEmailChangeController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedBody =
    emailChangeRequestSchema.safeParse(
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

  const result = await requestEmailChange(
    requireUserId(req),
    parsedBody.data
  );

  res.status(202).json({
    message:
      "Te enviamos un enlace al nuevo email para confirmar el cambio",
    ...result,
  });
}

export async function confirmEmailChangeController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedBody =
    emailChangeConfirmSchema.safeParse(
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

  const result = await confirmEmailChange(
    parsedBody.data
  );

  res.status(200).json({
    message: "Email actualizado correctamente",
    ...result,
  });
}
