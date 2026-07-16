import { beforeEach, describe, expect, it } from "vitest";

import {
  appendChatMessage,
  cleanupExpiredChatSessions,
  clearChatSessionsForTests,
  getOrCreateChatSession,
} from "../../src/modules/chat/chat.memory.js";

const TTL = 20 * 60 * 1000;

describe("memoria del chatbot", () => {
  beforeEach(() => {
    clearChatSessionsForTests();
  });

  it("crea y reutiliza una sesión vigente", () => {
    const first = getOrCreateChatSession("session-123", 1_000);
    const second = getOrCreateChatSession("session-123", 2_000);
    expect(second).toBe(first);
  });

  it("reemplaza una sesión vencida", () => {
    const first = getOrCreateChatSession("session-123", 0);
    const second = getOrCreateChatSession("session-123", TTL + 1);
    expect(second).not.toBe(first);
    expect(second.messages).toEqual([]);
  });

  it("conserva como máximo los últimos 20 mensajes", () => {
    const session = getOrCreateChatSession("session-123", 0);

    for (let index = 0; index < 25; index += 1) {
      appendChatMessage(session, {
        role: index % 2 === 0 ? "user" : "model",
        text: `message-${index}`,
        createdAt: index,
      });
    }

    expect(session.messages).toHaveLength(20);
    expect(session.messages[0]?.text).toBe("message-5");
    expect(session.messages.at(-1)?.text).toBe("message-24");
    expect(session.lastMessageAt).toBe(24);
  });

  it("limpia únicamente sesiones vencidas", () => {
    const expired = getOrCreateChatSession("expired-session", 0);
    const active = getOrCreateChatSession("active-session", 1_000);

    cleanupExpiredChatSessions(TTL + 1);

    expect(getOrCreateChatSession("expired-session", TTL + 1)).not.toBe(expired);
    expect(getOrCreateChatSession("active-session", TTL + 1)).toBe(active);
  });
});
