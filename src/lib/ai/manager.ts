import { createServerFn } from "@tanstack/react-start";
import { MANAGER_SYSTEM_PROMPT } from "@/lib/ai/prompt";
import type { ManagerReply, Quote } from "@/lib/ai/types";

type ChatTurn = { role: "user" | "assistant"; content: string };

type Payload = {
  messages: ChatTurn[];
  context?: string;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "qwen/qwen3.7-flash";
const XAI_URL = "https://api.x.ai/v1/chat/completions";
const XAI_MODEL = "grok-4.5";

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

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no json");
  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

function parseManager(text: string): { message: string; questions: string[]; quote: Quote | null } {
  try {
    const data = extractJsonObject(text) as Record<string, unknown>;
    const message =
      typeof data.message === "string" && data.message.trim()
        ? data.message.trim()
        : text.trim();
    const questions = Array.isArray(data.questions)
      ? data.questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      : [];
    const quote = isQuote(data.quote) ? data.quote : null;
    if (quote) {
      const sum = quote.items.reduce((n, i) => n + i.price, 0);
      if (Math.abs(sum - quote.total) > 1) quote.total = sum;
    }
    return { message, questions, quote };
  } catch {
    return { message: text.trim(), questions: [], quote: null };
  }
}

type CompatBody = {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature: number;
  max_tokens: number;
};

async function postJson(opts: {
  url: string;
  apiKey: string;
  body: CompatBody;
  extraHeaders?: Record<string, string>;
  socks?: string;
}): Promise<string> {
  const payload = JSON.stringify(opts.body);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${opts.apiKey}`,
    ...opts.extraHeaders,
  };

  if (opts.socks) {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    const proxy = opts.socks.replace(/^socks5h?:\/\//i, "");
    const headerArgs = Object.entries(headers).flatMap(([k, v]) => ["-H", `${k}: ${v}`]);
    const { stdout } = await execFileAsync(
      "curl",
      [
        "-sS",
        "-g",
        "--max-time",
        "90",
        "--socks5-hostname",
        proxy,
        "-X",
        "POST",
        ...headerArgs,
        "-d",
        payload,
        opts.url,
      ],
      { maxBuffer: 2_000_000 },
    );
    return stdout;
  }

  const res = await fetch(opts.url, {
    method: "POST",
    headers,
    body: payload,
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${raw.slice(0, 280)}`);
  }
  return raw;
}

function readChoice(raw: string): string {
  const body = JSON.parse(raw) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (body.error?.message) throw new Error(body.error.message);
  const text = body.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("Пустой ответ модели");
  return text;
}

async function complete(messages: CompatBody["messages"]): Promise<string> {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;
  const socks = process.env.TOR_SOCKS_PROXY || process.env.SOCKS_PROXY;
  const body: CompatBody = {
    model: OPENROUTER_MODEL,
    messages,
    temperature: 0.4,
    max_tokens: 1400,
  };

  if (openrouterKey) {
    try {
      const raw = await postJson({
        url: OPENROUTER_URL,
        apiKey: openrouterKey,
        body,
        socks,
        extraHeaders: {
          "HTTP-Referer": "https://codwey.su",
          "X-Title": "Codwey",
        },
      });
      return readChoice(raw);
    } catch (err) {
      if (!xaiKey) throw err;
    }
  }

  if (xaiKey) {
    const raw = await postJson({
      url: XAI_URL,
      apiKey: xaiKey,
      body: { ...body, model: XAI_MODEL },
    });
    return readChoice(raw);
  }

  throw new Error("AI is not available in this environment");
}

export const sendManagerMessage = createServerFn({ method: "POST" })
  .validator((input: Payload) => input)
  .handler(async ({ data }): Promise<ManagerReply> => {
    const trimmed = data.messages
      .filter((m) => m.content.trim())
      .slice(-16)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    if (trimmed.length === 0) {
      return { ok: false, error: "Напишите сообщение" };
    }

    const lastUser = [...trimmed].reverse().find((m) => m.role === "user");
    if (!lastUser) return { ok: false, error: "Напишите сообщение" };

    const system = data.context
      ? `${MANAGER_SYSTEM_PROMPT}\n\nКонтекст страницы:\n${data.context.slice(0, 2500)}`
      : MANAGER_SYSTEM_PROMPT;

    try {
      const text = await complete([
        { role: "system", content: system },
        ...trimmed,
      ]);
      const parsed = parseManager(text);
      return { ok: true, ...parsed };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось ответить";
      return { ok: false, error: message };
    }
  });
