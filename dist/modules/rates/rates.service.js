import { isSupportedCurrency, SUPPORTED_CURRENCIES, } from "../../config/currencies.js";
import { pool } from "../../db/pool.js";
import { AppError } from "../../utils/AppError.js";
import { fetchRatesFromProvider } from "./rates.provider.js";
import { findValidCachedRates, upsertRates, } from "./rates.repository.js";
function normalizeCurrency(value) {
    const currency = value.trim().toUpperCase();
    if (!isSupportedCurrency(currency)) {
        throw new AppError(`Moneda no soportada: ${currency}`, 400);
    }
    return currency;
}
function mapCachedRows(rows) {
    const rates = {};
    for (const row of rows) {
        rates[row.target_currency] = Number(row.rate);
    }
    return rates;
}
export async function getRates(baseInput = "ARS") {
    const baseCurrency = normalizeCurrency(baseInput);
    const targetCurrencies = SUPPORTED_CURRENCIES.filter((currency) => currency !== baseCurrency);
    const client = await pool.connect();
    try {
        const cachedRates = await findValidCachedRates(client, baseCurrency, [...targetCurrencies]);
        if (cachedRates.length ===
            targetCurrencies.length) {
            return {
                base: baseCurrency,
                rates: mapCachedRows(cachedRates),
                updatedAt: cachedRates[0].fetched_at.toISOString(),
                expiresAt: cachedRates[0].expires_at.toISOString(),
                provider: cachedRates[0].provider,
                cached: true,
                attribution: {
                    text: "Rates By Exchange Rate API",
                    url: "https://www.exchangerate-api.com",
                },
            };
        }
    }
    finally {
        client.release();
    }
    const providerResult = await fetchRatesFromProvider(baseCurrency, [...targetCurrencies]);
    const writeClient = await pool.connect();
    try {
        await writeClient.query("BEGIN");
        await upsertRates(writeClient, baseCurrency, providerResult.rates, providerResult.provider, providerResult.fetchedAt, providerResult.expiresAt);
        await writeClient.query("COMMIT");
    }
    catch (error) {
        await writeClient.query("ROLLBACK");
        throw error;
    }
    finally {
        writeClient.release();
    }
    return {
        base: baseCurrency,
        rates: providerResult.rates,
        updatedAt: providerResult.fetchedAt.toISOString(),
        expiresAt: providerResult.expiresAt.toISOString(),
        provider: providerResult.provider,
        cached: false,
        attribution: {
            text: "Rates By Exchange Rate API",
            url: "https://www.exchangerate-api.com",
        },
    };
}
export async function getRatePair(baseInput, targetInput) {
    const baseCurrency = normalizeCurrency(baseInput);
    const targetCurrency = normalizeCurrency(targetInput);
    if (baseCurrency === targetCurrency) {
        throw new AppError("La moneda origen y destino deben ser diferentes", 400);
    }
    const ratesResult = await getRates(baseCurrency);
    const rate = ratesResult.rates[targetCurrency];
    if (typeof rate !== "number" ||
        !Number.isFinite(rate)) {
        throw new AppError(`No se encontró la tasa ${baseCurrency}/${targetCurrency}`, 404);
    }
    return {
        base: baseCurrency,
        target: targetCurrency,
        rate,
        updatedAt: ratesResult.updatedAt,
        expiresAt: ratesResult.expiresAt,
        provider: ratesResult.provider,
        cached: ratesResult.cached,
        attribution: ratesResult.attribution,
    };
}
