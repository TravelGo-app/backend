import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  depositController,
  exchangeController,
  recentTransactionsController,
  transactionAnalyticsController,
  transferController,
} from "./transactions.controller.js";

export const transactionsRoutes = Router();

transactionsRoutes.get(
  "/analytics",
  authMiddleware,
  asyncHandler(transactionAnalyticsController)
);

transactionsRoutes.get(
  "/recent",
  authMiddleware,
  asyncHandler(recentTransactionsController)
);

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
