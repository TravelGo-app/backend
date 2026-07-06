import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  googleLoginController,
  loginController,
  meController,
  registerController,
} from "./auth.controller.js";

export const authRoutes = Router();

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

authRoutes.get(
  "/me",
  authMiddleware,
  asyncHandler(meController)
);