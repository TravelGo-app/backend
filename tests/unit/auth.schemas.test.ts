import { describe, expect, it } from "vitest";

import {
  emailAvailabilitySchema,
  forgotPasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  setPasswordSchema,
} from "../../src/modules/auth/auth.schemas.js";

describe("schemas de autenticación", () => {
  it("normaliza el email consultado", () => {
    expect(
      emailAvailabilitySchema.parse({ email: "  USER@TravelGo.COM " }),
    ).toEqual({ email: "user@travelgo.com" });
  });

  it("rechaza emails inválidos", () => {
    expect(
      emailAvailabilitySchema.safeParse({ email: "correo-invalido" }).success,
    ).toBe(false);
  });

  it("normaliza un registro válido", () => {
    expect(
      registerSchema.parse({
        name: "  Nadia  ",
        email: " NADIA@TRAVELGO.COM ",
        password: "password123",
        birthDate: "2000-01-01",
      }),
    ).toEqual({
      name: "Nadia",
      email: "nadia@travelgo.com",
      password: "password123",
      birthDate: "2000-01-01",
    });
  });

  it.each([
    { name: "N", email: "nadia@travelgo.com", password: "password123" },
    { name: "Nadia", email: "invalido", password: "password123" },
    { name: "Nadia", email: "nadia@travelgo.com", password: "12345" },
    {
      name: "Nadia",
      email: "nadia@travelgo.com",
      password: "password123",
      birthDate: "2020-99-99",
    },
  ])("rechaza un registro inválido %#", (payload) => {
    expect(registerSchema.safeParse(payload).success).toBe(false);
  });

  it("normaliza las credenciales de login", () => {
    expect(
      loginSchema.parse({
        email: " NADIA@TRAVELGO.COM ",
        password: "password123",
      }),
    ).toEqual({
      email: "nadia@travelgo.com",
      password: "password123",
    });
  });

  it("valida la credencial de Google", () => {
    expect(googleLoginSchema.parse({ credential: " token-google " })).toEqual({
      credential: "token-google",
    });
    expect(googleLoginSchema.safeParse({ credential: 123 }).success).toBe(false);
  });

  it("normaliza forgot password", () => {
    expect(
      forgotPasswordSchema.parse({ email: " USER@TRAVELGO.COM " }),
    ).toEqual({ email: "user@travelgo.com" });
  });

  it("acepta un reset token hexadecimal de 64 caracteres", () => {
    const token = "a".repeat(64);
    expect(
      resetPasswordSchema.parse({ token, password: "password123" }),
    ).toEqual({ token, password: "password123" });
  });

  it.each([
    { token: "abc", password: "password123" },
    { token: "g".repeat(64), password: "password123" },
    { token: "a".repeat(64), password: "12345" },
    { token: "a".repeat(64), password: "x".repeat(73) },
  ])("rechaza reset password inválido %#", (payload) => {
    expect(resetPasswordSchema.safeParse(payload).success).toBe(false);
  });

  it("valida set password dentro de sus límites", () => {
    expect(setPasswordSchema.safeParse({ password: "123456" }).success).toBe(
      true,
    );
    expect(setPasswordSchema.safeParse({ password: "12345" }).success).toBe(
      false,
    );
    expect(
      setPasswordSchema.safeParse({ password: "x".repeat(73) }).success,
    ).toBe(false);
  });
});
