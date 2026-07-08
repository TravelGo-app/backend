import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  depositController,
  exchangeController,
  transferController,
} from "./transactions.controller.js";

export const transactionsRoutes = Router();

transactionsRoutes.post(
  "/deposit",
  authMiddleware,
  asyncHandler(depositController)
);

transactionsRoutes.post(
  "/transfer",
  authMiddleware,
  asyncHandler(transferController)
);

transactionsRoutes.post(
  "/exchange",
  authMiddleware,
  asyncHandler(exchangeController)
);
