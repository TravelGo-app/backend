import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  getRatePairController,
  getRatesController,
} from "./rates.controller.js";

export const ratesRoutes = Router();

ratesRoutes.get(
  "/",
  asyncHandler(getRatesController)
);

ratesRoutes.get(
  "/:base/:target",
  asyncHandler(getRatePairController)
);