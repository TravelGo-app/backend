import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { activityHistoryController } from "./activity-history.controller.js";

export const activityHistoryRoutes = Router();

activityHistoryRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(activityHistoryController)
);
