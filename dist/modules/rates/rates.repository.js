export async function findValidCachedRates(client, baseCurrency, targetCurrencies) {
    const result = await client.query(`
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
    `, [baseCurrency, targetCurrencies]);
    return result.rows;
}
export async function upsertRates(client, baseCurrency, rates, provider, fetchedAt, expiresAt) {
    for (const [targetCurrency, rate] of Object.entries(rates)) {
        await client.query(`
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
      `, [
            baseCurrency,
            targetCurrency,
            rate,
            provider,
            fetchedAt,
            expiresAt,
        ]);
    }
}
