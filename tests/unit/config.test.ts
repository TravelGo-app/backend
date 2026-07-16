import { describe, expect, it } from "vitest";

import {
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
} from "../../src/config/currencies.js";
import {
  TRANSACTION_TYPES,
  isTransactionType,
} from "../../src/config/transactions.js";

describe("configuración de monedas", () => {
  it("expone exactamente las cinco monedas soportadas", () => {
    expect(SUPPORTED_CURRENCIES).toEqual([
      "ARS",
      "USD",
      "EUR",
      "BRL",
      "CLP",
    ]);
  });

  it.each(SUPPORTED_CURRENCIES)("acepta %s", (currency) => {
    expect(isSupportedCurrency(currency)).toBe(true);
  });

  it.each(["ars", "GBP", "", "USD "])("rechaza %s", (currency) => {
    expect(isSupportedCurrency(currency)).toBe(false);
  });
});

describe("configuración de tipos de transacción", () => {
  it("expone los tipos canónicos", () => {
    expect(TRANSACTION_TYPES).toEqual(["BUY", "SELL", "EXCHANGE"]);
  });

  it.each(TRANSACTION_TYPES)("acepta %s", (type) => {
    expect(isTransactionType(type)).toBe(true);
  });

  it.each(["buy", "TRANSFER", "", "SELL "])("rechaza %s", (type) => {
    expect(isTransactionType(type)).toBe(false);
  });
});
