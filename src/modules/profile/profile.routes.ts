import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  confirmEmailChangeController,
  dashboardSummaryEmailController,
  getEmailPreferencesController,
  getProfileController,
  requestEmailChangeController,
  updateAliasController,
  updateEmailPreferencesController,
  updateProfileController,
} from "./profile.controller.js";

export const profileRoutes = Router();

profileRoutes.post(
  "/email-change/confirm",
  asyncHandler(confirmEmailChangeController)
);


profileRoutes.get(
  "/email-preferences",
  authMiddleware,
  asyncHandler(getEmailPreferencesController)
);

profileRoutes.patch(
  "/email-preferences",
  authMiddleware,
  asyncHandler(updateEmailPreferencesController)
);

profileRoutes.post(
  "/dashboard-summary-email",
  authMiddleware,
  asyncHandler(dashboardSummaryEmailController)
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
