export const SUPPORTED_CURRENCIES = [
  "ARS",
  "USD",
  "EUR",
  "BRL",
  "CLP",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const INITIAL_BALANCES: Record<CurrencyCode, number> = {
  ARS: 100000,
  USD: 0,
  EUR: 0,
  BRL: 0,
  CLP: 0,
};

export function isSupportedCurrency(
  currency: string
): currency is CurrencyCode {
  return SUPPORTED_CURRENCIES.includes(
    currency as CurrencyCode
  );
}