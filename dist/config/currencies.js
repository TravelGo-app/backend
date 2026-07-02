export const SUPPORTED_CURRENCIES = [
    "ARS",
    "USD",
    "EUR",
    "BRL",
    "CLP",
];
export const INITIAL_BALANCES = {
    ARS: 100000,
    USD: 0,
    EUR: 0,
    BRL: 0,
    CLP: 0,
};
export function isSupportedCurrency(currency) {
    return SUPPORTED_CURRENCIES.includes(currency);
}
