import { z } from "zod";

import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_STATUSES,
} from "./activity-history.types.js";

export const activityHistoryQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25),
  cursor: z.string().trim().min(1).optional(),
  category: z.enum(ACTIVITY_CATEGORIES).optional(),
  status: z.enum(ACTIVITY_STATUSES).optional(),
  eventType: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
});

export type ActivityHistoryQuery = z.infer<
  typeof activityHistoryQuerySchema
>;
