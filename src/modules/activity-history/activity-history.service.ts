import { pool } from "../../db/pool.js";
import { AppError } from "../../utils/AppError.js";
import { listUnifiedActivityHistory } from "./activity-history.repository.js";
import type { ActivityHistoryQuery } from "./activity-history.schemas.js";
import type {
  ActivityCategory,
  ActivityCursor,
  ActivityStatus,
} from "./activity-history.types.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) {
    return "***";
  }

  return `${localPart.slice(0, Math.min(3, localPart.length))}***@${domain}`;
}

function encodeCursor(cursor: ActivityCursor): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
    })
  ).toString("base64url");
}

function decodeCursor(value?: string): ActivityCursor | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as {
      createdAt?: unknown;
      id?: unknown;
    };

    if (
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string" ||
      !UUID_PATTERN.test(parsed.id)
    ) {
      throw new Error("Cursor inválido");
    }

    const createdAt = new Date(parsed.createdAt);

    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Fecha inválida");
    }

    return {
      createdAt,
      id: parsed.id,
    };
  } catch {
    throw new AppError(
      "El cursor del historial es inválido",
      400
    );
  }
}

function mapHistoryItem(row: {
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
}) {
  return {
    id: row.id,
    eventType: row.event_type,
    category: row.category,
    status: row.status,
    title: row.title,
    description: row.description,
    entity:
      row.entity_type && row.entity_id
        ? {
            type: row.entity_type,
            id: row.entity_id,
          }
        : null,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export async function getActivityHistory(
  userId: string,
  query: ActivityHistoryQuery
) {
  const rows = await listUnifiedActivityHistory({
    userId,
    limit: query.limit,
    cursor: decodeCursor(query.cursor),
    category: query.category,
    status: query.status,
    eventType: query.eventType,
  });

  const hasMore = rows.length > query.limit;
  const visibleRows = hasMore
    ? rows.slice(0, query.limit)
    : rows;
  const lastRow = visibleRows.at(-1);

  return {
    items: visibleRows.map(mapHistoryItem),
    pagination: {
      limit: query.limit,
      hasMore,
      nextCursor:
        hasMore && lastRow
          ? encodeCursor({
              createdAt: lastRow.created_at,
              id: lastRow.id,
            })
          : null,
    },
  };
}

export async function recordActivitySafely(
  userId: string,
  input: {
    eventType: string;
    category: ActivityCategory;
    status: ActivityStatus;
    title: string;
    description?: string;
    entityType?: string;
    entityId?: string;
    deduplicationKey?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await pool.query(
      `
      INSERT INTO activity_history (
        user_id,
        event_type,
        category,
        status,
        title,
        description,
        entity_type,
        entity_id,
        deduplication_key,
        metadata
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10::jsonb
      )
      ON CONFLICT DO NOTHING
      `,
      [
        userId,
        input.eventType,
        input.category,
        input.status,
        input.title,
        input.description ?? null,
        input.entityType ?? null,
        input.entityId ?? null,
        input.deduplicationKey ?? null,
        JSON.stringify(input.metadata ?? {}),
      ]
    );
  } catch (error) {
    console.error("[activity-history.record.failed]", {
      userId,
      eventType: input.eventType,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido",
    });
  }
}
