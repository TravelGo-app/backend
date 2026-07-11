
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import {
  appendChatMessage,
  cleanupExpiredChatSessions,
  getOrCreateChatSession,
} from "./chat.memory.js";
import type { ChatMessageInput } from "./chat.schemas.js";

const SYSTEM_PROMPT = `
Sos el asistente oficial de TravelGo.

Respondé únicamente sobre TravelGo y temas directamente relacionados con la app:
- uso de la app;
- cuenta, login y recuperación de contraseña;
- wallet y balances;
- depósitos;
- transferencias;
- intercambio de divisas;
- tasas de cambio;
- dudas generales sobre operaciones dentro de TravelGo.

Si el usuario pregunta algo ajeno a TravelGo, no respondas el tema externo.
Redirigí amablemente la conversación aclarando que solo podés ayudar con TravelGo.

Usá español claro, breve y amable.
No inventes datos sensibles, saldos, operaciones o información privada.
Si la consulta requiere una acción real, indicá que debe hacerse desde la app.
`.trim();

type GeminiPart = { text: string };
type GeminiContent = {
  role?: "user" | "model";
  parts: GeminiPart[];
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
  error?: { message?: string };
};

function buildGeminiContents(
  history: Array<{ role: "user" | "model"; text: string }>
): GeminiContent[] {
  return history.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }],
  }));
}

function extractReply(data: GeminiResponse): string {
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .join("")
    .trim();

  if (!text) {
    throw new AppError(
      "Gemini no devolvió una respuesta válida",
      500
    );
  }

  return text;
}

export async function sendChatMessage(
  input: ChatMessageInput
): Promise<{ reply: string }> {
  if (!env.geminiApiKey) {
    throw new AppError(
      "Gemini API no está configurada",
      500
    );
  }

  const now = Date.now();
  cleanupExpiredChatSessions(now);

  const session = getOrCreateChatSession(
    input.sessionId,
    now
  );

  appendChatMessage(session, {
    role: "user",
    text: input.message,
    createdAt: now,
  });

  const requestBody = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: buildGeminiContents(session.messages),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 500,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      env.geminiModel
    )}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  const data = (await response.json().catch(() => null)) as
    | GeminiResponse
    | null;

  if (!response.ok) {
    throw new AppError(
      data?.error?.message ??
        "No se pudo obtener respuesta de Gemini",
      500
    );
  }

  if (!data) {
    throw new AppError("Gemini no devolvió JSON válido", 500);
  }

  const reply = extractReply(data);

  appendChatMessage(session, {
    role: "model",
    text: reply,
    createdAt: Date.now(),
  });

  return { reply };
}
