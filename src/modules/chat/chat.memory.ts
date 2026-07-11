
export type ChatRole = "user" | "model";

export type ChatMessage = {
  role: ChatRole;
  text: string;
  createdAt: number;
};

export type ChatSession = {
  sessionId: string;
  messages: ChatMessage[];
  lastMessageAt: number;
};

const SESSION_TTL_MS = 20 * 60 * 1000;
const MAX_HISTORY_MESSAGES = 20;

const sessions = new Map<string, ChatSession>();

function isExpired(
  session: ChatSession,
  now: number
): boolean {
  return now - session.lastMessageAt > SESSION_TTL_MS;
}

export function getOrCreateChatSession(
  sessionId: string,
  now = Date.now()
): ChatSession {
  const existing = sessions.get(sessionId);

  if (existing && !isExpired(existing, now)) {
    return existing;
  }

  const freshSession: ChatSession = {
    sessionId,
    messages: [],
    lastMessageAt: now,
  };

  sessions.set(sessionId, freshSession);
  return freshSession;
}

export function appendChatMessage(
  session: ChatSession,
  message: ChatMessage
): void {
  session.messages.push(message);

  if (session.messages.length > MAX_HISTORY_MESSAGES) {
    session.messages.splice(
      0,
      session.messages.length - MAX_HISTORY_MESSAGES
    );
  }

  session.lastMessageAt = message.createdAt;
}

export function cleanupExpiredChatSessions(
  now = Date.now()
): void {
  for (const [sessionId, session] of sessions) {
    if (isExpired(session, now)) {
      sessions.delete(sessionId);
    }
  }
}

export function clearChatSessionsForTests(): void {
  sessions.clear();
}
