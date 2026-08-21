import type { ChatImage, ManagerReply, Quote } from "@/lib/ai/types";
import { sessionId } from "@/lib/session";

type ChatTurn = { role: "user" | "assistant"; content: string };

const API_URL = (import.meta.env.VITE_AI_URL as string | undefined) || "https://api.codway.su/api/manager";

function isQuote(value: unknown): value is Quote {
  if (!value || typeof value !== "object") return false;
  const q = value as Record<string, unknown>;
  if (typeof q.title !== "string" || typeof q.timeline !== "string") return false;
  if (typeof q.total !== "number" || !Array.isArray(q.items)) return false;
  return q.items.every((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.name === "string" && typeof row.price === "number";
  });
}

export async function sendManagerMessage(input: {
  data: { messages: ChatTurn[]; context?: string; images?: ChatImage[] };
}): Promise<ManagerReply> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input.data, sessionId: sessionId() }),
    });
    const raw = (await res.json()) as ManagerReply;
    if (!res.ok || !raw || typeof raw !== "object") {
      return { ok: false, error: "Менеджер сейчас недоступен" };
    }
    if (!raw.ok) return { ok: false, error: raw.error || "Менеджер сейчас недоступен" };
    const quote = isQuote(raw.quote) ? raw.quote : null;
    return {
      ok: true,
      message: raw.message,
      questions: Array.isArray(raw.questions) ? raw.questions : [],
      quote,
      submit: Boolean(raw.submit),
      lead: raw.lead ?? null,
      ticketId: raw.ticketId ?? null,
    };
  } catch {
    return { ok: false, error: "Нет связи с менеджером" };
  }
}

export const ADMIN_API = "https://api.codway.su/api/admin";
