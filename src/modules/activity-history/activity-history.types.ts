export const ACTIVITY_CATEGORIES = [
  "AUTH",
  "PROFILE",
  "WALLET",
  "EMAIL",
  "SECURITY",
  "SYSTEM",
] as const;

export const ACTIVITY_STATUSES = [
  "SUCCESS",
  "FAILED",
  "PENDING",
  "INFO",
] as const;

export type ActivityCategory =
  (typeof ACTIVITY_CATEGORIES)[number];

export type ActivityStatus =
  (typeof ACTIVITY_STATUSES)[number];

export type ActivityHistoryRow = {
  id: string;
  event_type: string;
  category: ActivityCategory;
  status: ActivityStatus;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
};

export type ActivityCursor = {
  createdAt: Date;
  id: string;
};
