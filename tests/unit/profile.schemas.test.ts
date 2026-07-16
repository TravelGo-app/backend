import { describe, expect, it } from "vitest";

import {
  aliasUpdateSchema,
  birthDateSchema,
  dashboardSummaryEmailSchema,
  emailChangeConfirmSchema,
  emailChangeRequestSchema,
  emailPreferencesUpdateSchema,
  profileUpdateSchema,
} from "../../src/modules/profile/profile.schemas.js";

function isoDateYearsAgo(years: number): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
}

describe("schema de fecha de nacimiento", () => {
  it("acepta una fecha ISO de una persona adulta", () => {
    expect(birthDateSchema.parse("2000-01-01")).toBe("2000-01-01");
  });

  it.each(["01-01-2000", "2000-02-30", "1899-12-31"])(
    "rechaza la fecha %s",
    (value) => {
      expect(birthDateSchema.safeParse(value).success).toBe(false);
    },
  );

  it("rechaza personas menores de 17 años", () => {
    expect(birthDateSchema.safeParse(isoDateYearsAgo(16)).success).toBe(false);
  });
});

describe("schema de perfil", () => {
  it("exige al menos un dato", () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("normaliza nombre y teléfono", () => {
    expect(
      profileUpdateSchema.parse({
        name: "  Nadia  ",
        phone: "+54 (9) 11 2345-6789",
        preferredCurrency: "USD",
      }),
    ).toEqual({
      name: "Nadia",
      phone: "+5491123456789",
      preferredCurrency: "USD",
    });
  });

  it("permite limpiar el teléfono con null", () => {
    expect(profileUpdateSchema.parse({ phone: null })).toEqual({ phone: null });
  });

  it.each([
    { unknown: true },
    { phone: "1234" },
    { preferredCurrency: "GBP" },
  ])("rechaza perfil inválido %#", (payload) => {
    expect(profileUpdateSchema.safeParse(payload).success).toBe(false);
  });
});

describe("alias y cambio de email", () => {
  it("normaliza un alias", () => {
    expect(aliasUpdateSchema.parse({ alias: " Mi.Alias " })).toEqual({
      alias: "mi.alias",
    });
  });

  it.each(["ab", ".alias", "alias.", "mi..alias", "alias_con_guion"])(
    "rechaza el alias %s",
    (alias) => {
      expect(aliasUpdateSchema.safeParse({ alias }).success).toBe(false);
    },
  );

  it("normaliza el nuevo email", () => {
    expect(
      emailChangeRequestSchema.parse({ newEmail: " USER@TRAVELGO.COM " }),
    ).toEqual({ newEmail: "user@travelgo.com" });
  });

  it("valida el token de confirmación", () => {
    const token = "b".repeat(64);
    expect(emailChangeConfirmSchema.parse({ token })).toEqual({ token });
    expect(emailChangeConfirmSchema.safeParse({ token: "abc" }).success).toBe(
      false,
    );
  });
});

describe("preferencias de email y resumen", () => {
  it("exige al menos una preferencia", () => {
    expect(emailPreferencesUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("acepta valores booleanos incluso false", () => {
    expect(
      emailPreferencesUpdateSchema.parse({
        notifyDeposits: false,
        notifyExchanges: true,
      }),
    ).toEqual({ notifyDeposits: false, notifyExchanges: true });
  });

  it("aplica 30 días por defecto y convierte strings", () => {
    expect(dashboardSummaryEmailSchema.parse({})).toEqual({ days: 30 });
    expect(dashboardSummaryEmailSchema.parse({ days: "7" })).toEqual({ days: 7 });
  });

  it.each([0, 366, 2.5])("rechaza days=%s", (days) => {
    expect(dashboardSummaryEmailSchema.safeParse({ days }).success).toBe(false);
  });
});
