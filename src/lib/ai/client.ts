import type { ChatImage, ManagerReply, Quote } from "@/lib/ai/types";
import { sessionId } from "@/lib/session";

type ChatTurn = { role: "user" | "assistant"; content: string };

const API_URL = (import.meta.env.VITE_AI_URL as string | undefined) || "https://api.codway.su/api/manager";

function isQuote(value: unknown): value is Quote {
  if (!value || typeof value !== "object") return false;
  const q = value as Record<string, unknown>;
  if (typeof q.total !== "number" || !Array.isArray(q.items)) return false;
  return q.items.every((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.name === "string" && typeof row.price === "number";
  });
}

function visibleMessage(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let t = raw.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (t.startsWith("{") && (t.includes('"message"') || t.includes('"items"'))) {
    try {
      const data = JSON.parse(t) as { message?: unknown; items?: unknown };
      if (typeof data.message === "string" && data.message.trim() && !data.message.trim().startsWith("{")) {
        return data.message.trim();
      }
      if (Array.isArray(data.items)) return "Смета ниже. Так пойдёт?";
    } catch {
      const m = t.match(/"message"\s*:\s*"([\s\S]*?)"\s*,\s*"questions"/);
      if (m?.[1]) return m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
      if (t.includes('"items"')) return "Смета ниже. Так пойдёт?";
    }
  }
  return t;
}

export async function sendManagerMessage(input: {
  data: { messages: ChatTurn[]; context?: string; images?: ChatImage[] };
}): Promise<ManagerReply> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180_000);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input.data, sessionId: sessionId() }),
      signal: ctrl.signal,
    });
    const raw = (await res.json()) as ManagerReply;
    if (!res.ok || !raw || typeof raw !== "object") {
      return { ok: false, error: "Менеджер сейчас недоступен" };
    }
    if (!raw.ok) return { ok: false, error: raw.error || "Менеджер сейчас недоступен" };
    const quote = isQuote(raw.quote)
      ? {
          title: raw.quote.title || "Смета",
          items: raw.quote.items,
          total: raw.quote.total,
          timeline: raw.quote.timeline || "по согласованию",
          notes: raw.quote.notes,
        }
      : null;
    return {
      ok: true,
      message: visibleMessage(raw.message),
      questions: Array.isArray(raw.questions) ? raw.questions : [],
      quote,
      submit: Boolean(raw.submit),
      lead: raw.lead ?? null,
      ticketId: raw.ticketId ?? null,
    };
  } catch {
    return { ok: false, error: "Нет связи с менеджером" };
  } finally {
    clearTimeout(timer);
  }
}

export const ADMIN_API = "https://api.codway.su/api/admin";
