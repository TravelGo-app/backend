export const TRANSACTION_TYPES = [
  "BUY",
  "SELL",
  "EXCHANGE",
] as const;

export type TransactionType =
  (typeof TRANSACTION_TYPES)[number];

export function isTransactionType(
  value: string
): value is TransactionType {
  return TRANSACTION_TYPES.includes(
    value as TransactionType
  );
}