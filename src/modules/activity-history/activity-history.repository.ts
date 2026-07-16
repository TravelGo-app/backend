import { pool } from "../../db/pool.js";
import type {
  ActivityCategory,
  ActivityCursor,
  ActivityHistoryRow,
  ActivityStatus,
} from "./activity-history.types.js";

export async function listUnifiedActivityHistory(input: {
  userId: string;
  limit: number;
  cursor: ActivityCursor | null;
  category?: ActivityCategory;
  status?: ActivityStatus;
  eventType?: string;
}): Promise<ActivityHistoryRow[]> {
  const values: unknown[] = [input.userId];
  const filters: string[] = [];

  if (input.cursor) {
    values.push(input.cursor.createdAt, input.cursor.id);
    filters.push(
      `(combined.created_at, combined.id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`
    );
  }

  if (input.category) {
    values.push(input.category);
    filters.push(`combined.category = $${values.length}`);
  }

  if (input.status) {
    values.push(input.status);
    filters.push(`combined.status = $${values.length}`);
  }

  if (input.eventType) {
    values.push(input.eventType);
    filters.push(`combined.event_type = $${values.length}`);
  }

  values.push(input.limit + 1);

  const whereClause =
    filters.length > 0
      ? `WHERE ${filters.join(" AND ")}`
      : "";

  const result = await pool.query<ActivityHistoryRow>(
    `
    WITH current_wallet AS (
      SELECT id
      FROM wallets
      WHERE user_id = $1
      LIMIT 1
    ),
    financial_history AS (
      SELECT
        t.id,
        CASE
          WHEN t.type = 'DEPOSIT'
            THEN 'wallet.deposit_completed'
          WHEN t.type = 'TRANSFER'
            AND t.destination_wallet_id = current_wallet.id
            THEN 'wallet.transfer_received'
          WHEN t.type = 'TRANSFER'
            THEN 'wallet.transfer_sent'
          ELSE 'wallet.exchange_completed'
        END AS event_type,
        'WALLET'::varchar AS category,
        CASE t.status
          WHEN 'SUCCESS' THEN 'SUCCESS'
          WHEN 'FAILED' THEN 'FAILED'
          ELSE 'PENDING'
        END::varchar AS status,
        CASE
          WHEN t.type = 'DEPOSIT'
            THEN 'Depósito realizado'
          WHEN t.type = 'TRANSFER'
            AND t.destination_wallet_id = current_wallet.id
            THEN 'Transferencia recibida'
          WHEN t.type = 'TRANSFER'
            THEN 'Transferencia enviada'
          ELSE 'Intercambio realizado'
        END AS title,
        CASE
          WHEN t.type = 'DEPOSIT'
            THEN CONCAT(t.to_amount, ' ', t.to_currency)
          WHEN t.type = 'TRANSFER'
            THEN CONCAT(t.to_amount, ' ', t.to_currency)
          ELSE CONCAT(
            t.from_amount,
            ' ',
            t.from_currency,
            ' → ',
            t.to_amount,
            ' ',
            t.to_currency
          )
        END AS description,
        'transaction'::varchar AS entity_type,
        t.id AS entity_id,
        jsonb_strip_nulls(
          jsonb_build_object(
            'transactionType', LOWER(t.type),
            'direction', CASE
              WHEN t.type = 'TRANSFER'
                AND t.destination_wallet_id = current_wallet.id
                THEN 'in'
              WHEN t.type = 'TRANSFER'
                THEN 'out'
              WHEN t.type = 'EXCHANGE'
                THEN 'exchange'
              ELSE 'in'
            END,
            'fromCurrency', t.from_currency,
            'toCurrency', t.to_currency,
            'fromAmount', t.from_amount,
            'toAmount', t.to_amount,
            'exchangeRate', t.exchange_rate,
            'counterpartyAlias', CASE
              WHEN t.type = 'TRANSFER'
                AND t.destination_wallet_id = current_wallet.id
                THEN owner_wallet.travelgo_alias
              WHEN t.type = 'TRANSFER'
                THEN destination_wallet.travelgo_alias
              ELSE NULL
            END
          )
        ) AS metadata,
        t.created_at
      FROM transactions t
      INNER JOIN current_wallet
        ON current_wallet.id = t.wallet_id
        OR current_wallet.id = t.destination_wallet_id
      LEFT JOIN wallets owner_wallet
        ON owner_wallet.id = t.wallet_id
      LEFT JOIN wallets destination_wallet
        ON destination_wallet.id = t.destination_wallet_id
    ),
    combined AS (
      SELECT
        history.id,
        history.event_type,
        history.category,
        history.status,
        history.title,
        history.description,
        history.entity_type,
        history.entity_id,
        history.metadata,
        history.created_at
      FROM activity_history history
      WHERE history.user_id = $1

      UNION ALL

      SELECT
        financial.id,
        financial.event_type,
        financial.category,
        financial.status,
        financial.title,
        financial.description,
        financial.entity_type,
        financial.entity_id,
        financial.metadata,
        financial.created_at
      FROM financial_history financial
    )
    SELECT
      combined.id,
      combined.event_type,
      combined.category,
      combined.status,
      combined.title,
      combined.description,
      combined.entity_type,
      combined.entity_id,
      combined.metadata,
      combined.created_at
    FROM combined
    ${whereClause}
    ORDER BY combined.created_at DESC, combined.id DESC
    LIMIT $${values.length}
    `,
    values
  );

  return result.rows;
}
