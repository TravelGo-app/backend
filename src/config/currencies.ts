export const SUPPORTED_CURRENCIES = [
  "ARS",
  "USD",
  "EUR",
  "BRL",
  "CLP",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];


export function isSupportedCurrency(
  currency: string
): currency is CurrencyCode {
  return SUPPORTED_CURRENCIES.includes(
    currency as CurrencyCode
  );
}