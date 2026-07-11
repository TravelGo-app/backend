
import type { Request, Response } from "express";

import { AppError } from "../../utils/AppError.js";
import { sendChatMessage } from "./chat.service.js";
import { chatMessageSchema } from "./chat.schemas.js";

export async function chatController(
  req: Request,
  res: Response
): Promise<void> {
  const parsedBody = chatMessageSchema.safeParse(req.body);

  if (!parsedBody.success) {
    const message =
      parsedBody.error.issues[0]?.message ??
      "Datos inválidos";

    throw new AppError(message, 400);
  }

  const result = await sendChatMessage(parsedBody.data);
  res.status(200).json(result);
}
