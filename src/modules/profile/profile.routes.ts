import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  confirmEmailChangeController,
  getProfileController,
  requestEmailChangeController,
  updateAliasController,
  updateProfileController,
} from "./profile.controller.js";

export const profileRoutes = Router();

profileRoutes.post(
  "/email-change/confirm",
  asyncHandler(confirmEmailChangeController)
);

profileRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(getProfileController)
);

profileRoutes.patch(
  "/",
  authMiddleware,
  asyncHandler(updateProfileController)
);

profileRoutes.patch(
  "/alias",
  authMiddleware,
  asyncHandler(updateAliasController)
);

profileRoutes.post(
  "/email-change/request",
  authMiddleware,
  asyncHandler(requestEmailChangeController)
);
