import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { registerController } from "./auth.controller.js";

export const authRoutes = Router();

authRoutes.post("/register", asyncHandler(registerController));