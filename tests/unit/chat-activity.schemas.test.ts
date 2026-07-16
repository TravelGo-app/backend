import { describe, expect, it } from "vitest";

import { chatMessageSchema } from "../../src/modules/chat/chat.schemas.js";
import { activityHistoryQuerySchema } from "../../src/modules/activity-history/activity-history.schemas.js";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_STATUSES,
} from "../../src/modules/activity-history/activity-history.types.js";

describe("chatMessageSchema", () => {
  it("normaliza una consulta válida", () => {
    expect(
      chatMessageSchema.parse({
        sessionId: " session-123 ",
        message: " ¿Cómo cambio moneda? ",
      }),
    ).toEqual({
      sessionId: "session-123",
      message: "¿Cómo cambio moneda?",
    });
  });

  it.each([
    { sessionId: "short", message: "hola" },
    { sessionId: "session con espacios", message: "hola" },
    { sessionId: "session-123", message: "" },
    { sessionId: "session-123", message: "x".repeat(1501) },
  ])("rechaza chat inválido %#", (payload) => {
    expect(chatMessageSchema.safeParse(payload).success).toBe(false);
  });
});

describe("activityHistoryQuerySchema", () => {
  it("aplica el límite por defecto", () => {
    expect(activityHistoryQuerySchema.parse({})).toEqual({ limit: 25 });
  });

  it("normaliza una consulta completa", () => {
    expect(
      activityHistoryQuerySchema.parse({
        limit: "50",
        cursor: " cursor-value ",
        category: "AUTH",
        status: "SUCCESS",
        eventType: " LOGIN_SUCCESS ",
      }),
    ).toEqual({
      limit: 50,
      cursor: "cursor-value",
      category: "AUTH",
      status: "SUCCESS",
      eventType: "LOGIN_SUCCESS",
    });
  });

  it("mantiene los catálogos esperados", () => {
    expect(ACTIVITY_CATEGORIES).toEqual([
      "AUTH",
      "PROFILE",
      "WALLET",
      "EMAIL",
      "SECURITY",
      "SYSTEM",
    ]);
    expect(ACTIVITY_STATUSES).toEqual([
      "SUCCESS",
      "FAILED",
      "PENDING",
      "INFO",
    ]);
  });

  it.each([
    { limit: 0 },
    { limit: 101 },
    { category: "UNKNOWN" },
    { status: "UNKNOWN" },
    { cursor: "" },
  ])("rechaza query inválida %#", (query) => {
    expect(activityHistoryQuerySchema.safeParse(query).success).toBe(false);
  });
});
