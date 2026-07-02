import type { CurrencyCode } from "../../config/currencies.js";
import { AppError } from "../../utils/AppError.js";

type ExchangeRateApiResponse = {
  result: "success" | "error";
  provider?: string;
  time_last_update_unix?: number;
  time_next_update_unix?: number;
  base_code?: string;
  rates?: Record<string, number>;
  "error-type"?: string;
};

export type ProviderRatesResult = {
  rates: Record<string, number>;
  provider: string;
  fetchedAt: Date;
  expiresAt: Date;
};

const API_BASE_URL = "https://open.er-api.com/v6/latest";

export async function fetchRatesFromProvider(
  baseCurrency: CurrencyCode,
  targetCurrencies: CurrencyCode[]
): Promise<ProviderRatesResult> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(
      `${API_BASE_URL}/${baseCurrency}`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new AppError(
        `El proveedor de tasas respondió con estado ${response.status}`,
        502
      );
    }

    const data =
      (await response.json()) as ExchangeRateApiResponse;

    if (
      data.result !== "success" ||
      !data.rates
    ) {
      throw new AppError(
        data["error-type"] ??
          "El proveedor no devolvió tasas válidas",
        502
      );
    }

    const selectedRates: Record<string, number> = {};

    for (const targetCurrency of targetCurrencies) {
      const rate = data.rates[targetCurrency];

      if (
        typeof rate !== "number" ||
        !Number.isFinite(rate) ||
        rate <= 0
      ) {
        throw new AppError(
          `No se recibió una tasa válida para ${baseCurrency}/${targetCurrency}`,
          502
        );
      }

      selectedRates[targetCurrency] = rate;
    }

    const now = new Date();

    const fetchedAt =
      typeof data.time_last_update_unix === "number"
        ? new Date(data.time_last_update_unix * 1000)
        : now;

    let expiresAt =
      typeof data.time_next_update_unix === "number"
        ? new Date(data.time_next_update_unix * 1000)
        : new Date(now.getTime() + 60 * 60 * 1000);

    if (
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt <= now
    ) {
      expiresAt = new Date(
        now.getTime() + 60 * 60 * 1000
      );
    }

    return {
      rates: selectedRates,
      provider: "ExchangeRate-API",
      fetchedAt,
      expiresAt,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error(
      "Error consultando proveedor de tasas:",
      error
    );

    throw new AppError(
      "No se pudo consultar el proveedor de tasas",
      502
    );
  } finally {
    clearTimeout(timeout);
  }
}