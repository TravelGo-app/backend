import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { emailAvailabilityRateLimit } from "../../middlewares/email-availability-rate-limit.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  emailAvailabilityController,
  forgotPasswordController,
  googleLoginController,
  loginController,
  meController,
  registerController,
  resetPasswordController,
  setPasswordController,
} from "./auth.controller.js";

export const authRoutes = Router();

authRoutes.post(
  "/email-availability",
  emailAvailabilityRateLimit,
  asyncHandler(emailAvailabilityController)
);

authRoutes.post(
  "/register",
  asyncHandler(registerController)
);

authRoutes.post(
  "/login",
  asyncHandler(loginController)
);

authRoutes.post(
  "/google",
  asyncHandler(googleLoginController)
);

authRoutes.post(
  "/forgot-password",
  asyncHandler(forgotPasswordController)
);

authRoutes.post(
  "/reset-password",
  asyncHandler(resetPasswordController)
);

authRoutes.post(
  "/set-password",
  authMiddleware,
  asyncHandler(setPasswordController)
);

authRoutes.get(
  "/me",
  authMiddleware,
  asyncHandler(meController)
);
