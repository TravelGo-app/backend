import type { PoolClient } from "pg";
import type { CurrencyCode } from "../../config/currencies.js";

export type CachedRateRow = {
  id: string;
  base_currency: CurrencyCode;
  target_currency: CurrencyCode;
  rate: string;
  provider: string;
  fetched_at: Date;
  expires_at: Date;
};

export async function findValidCachedRates(
  client: PoolClient,
  baseCurrency: CurrencyCode,
  targetCurrencies: CurrencyCode[]
): Promise<CachedRateRow[]> {
  const result = await client.query<CachedRateRow>(
    `
    SELECT
      id,
      base_currency,
      target_currency,
      rate,
      provider,
      fetched_at,
      expires_at
    FROM exchange_rates_cache
    WHERE base_currency = $1
      AND target_currency = ANY($2::varchar[])
      AND expires_at > NOW()
    `,
    [baseCurrency, targetCurrencies]
  );

  return result.rows;
}

export async function upsertRates(
  client: PoolClient,
  baseCurrency: CurrencyCode,
  rates: Record<string, number>,
  provider: string,
  fetchedAt: Date,
  expiresAt: Date
): Promise<void> {
  for (const [targetCurrency, rate] of Object.entries(
    rates
  )) {
    await client.query(
      `
      INSERT INTO exchange_rates_cache (
        base_currency,
        target_currency,
        rate,
        provider,
        fetched_at,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (
        base_currency,
        target_currency
      )
      DO UPDATE SET
        rate = EXCLUDED.rate,
        provider = EXCLUDED.provider,
        fetched_at = EXCLUDED.fetched_at,
        expires_at = EXCLUDED.expires_at
      `,
      [
        baseCurrency,
        targetCurrency,
        rate,
        provider,
        fetchedAt,
        expiresAt,
      ]
    );
  }
}