
import { Router } from "express";

import { asyncHandler } from "../../utils/asyncHandler.js";
import { chatController } from "./chat.controller.js";

export const chatRoutes = Router();

chatRoutes.post("/", asyncHandler(chatController));
