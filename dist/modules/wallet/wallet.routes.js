import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getBalancesController } from "./wallet.controller.js";
export const walletRoutes = Router();
walletRoutes.get("/balances", authMiddleware, asyncHandler(getBalancesController));
