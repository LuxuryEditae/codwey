import { Link } from "@tanstack/react-router";
import { LoaderCircle, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { QuoteFrame } from "@/components/quote-frame";
import { Button } from "@/components/ui/button";
import { sendManagerMessage } from "@/lib/ai/manager";
import { resolveCart, useCart } from "@/lib/cart";
import { useChat } from "@/lib/chat-store";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

const STARTERS = [
  "Сколько стоит Telegram-бот магазина?",
  "Нужен лендинг для фотографа",
  "Хочу обби в Roblox на 30 этапов",
  "Что входит в PulseShop?",
];

const usedSeeds = new Set<string>();

export function ChatPanel({
  seed,
  context,
}: {
  seed?: string;
  context?: string;
}) {
  const hydrated = useHydrated();
  const messages = useChat((s) => s.messages);
  const push = useChat((s) => s.push);
  const reset = useChat((s) => s.reset);
  const lines = useCart((s) => s.lines);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const visible = hydrated ? messages : [];

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [visible, pending]);

  useEffect(() => {
    if (!hydrated || !seed || usedSeeds.has(seed)) return;
    if (useChat.getState().messages.some((m) => m.content === seed)) {
      usedSeeds.add(seed);
      return;
    }
    usedSeeds.add(seed);
    void submit(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, seed]);

  async function submit(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    setError(null);
    setDraft("");
    push({ role: "user", content });
    setPending(true);

    const cart = resolveCart(lines);
    const cartText =
      cart.items.length > 0
        ? `Корзина клиента: ${cart.items
            .map((i) => `${i.product.name} ×${i.qty} = ${i.line} ₽`)
            .join("; ")}. Итого ${cart.total} ₽.`
        : "Корзина пуста.";

    const history = [...useChat.getState().messages]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    const result = await sendManagerMessage({
      data: {
        messages: history,
        context: [context, cartText].filter(Boolean).join("\n"),
      },
    });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    push({
      role: "assistant",
      content: result.message,
      questions: result.questions,
      quote: result.quote,
    });
  }

  const lastAssistant = [...visible].reverse().find((m) => m.role === "assistant");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-1 pb-3">
        <div>
          <p className="font-display text-lg font-medium italic">Вей</p>
          <p className="text-xs text-muted">Менеджер Codwey · смета в чате</p>
        </div>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-md text-muted hover:bg-elevated hover:text-fg"
          onClick={() => {
            reset();
            setError(null);
          }}
          aria-label="Очистить чат"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
        {visible.length === 0 && !pending ? (
          <div className="space-y-4">
            <p className="max-w-md text-sm leading-relaxed text-muted">
              Напишите, что нужно: готовый продукт или задача на заказ. Если чего-то не хватает —
              я доспрошу и соберу смету в рамке.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-md bg-surface px-3 py-2 text-left text-sm text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
                  onClick={() => void submit(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {visible.map((m) => (
          <article
            key={m.id}
            className={cn("max-w-[40rem]", m.role === "user" ? "ml-auto" : "mr-auto")}
          >
            <div
              className={cn(
                "rounded-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-accent text-accent-fg"
                  : "bg-elevated text-fg",
              )}
            >
              {m.content}
            </div>
            {m.quote ? <QuoteFrame quote={m.quote} /> : null}
          </article>
        ))}

        {pending ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" />
            Вей считает…
          </p>
        ) : null}

        {error ? (
          <p className="rounded-md bg-elevated px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        {lastAssistant?.questions && lastAssistant.questions.length > 0 && !pending ? (
          <div className="flex flex-wrap gap-2">
            {lastAssistant.questions.map((q) => (
              <button
                key={q}
                type="button"
                className="rounded-md bg-surface px-3 py-2 text-left text-sm text-accent shadow-[var(--shadow-border)]"
                onClick={() => void submit(q)}
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <form
        className="flex items-end gap-2 border-t border-border pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(draft);
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(draft);
            }
          }}
          rows={2}
          placeholder="Опишите задачу или задайте вопрос…"
          className="min-h-11 max-h-32 flex-1 resize-none rounded-md bg-surface px-3.5 py-2.5 text-sm text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-accent/50"
        />
        <Button type="submit" size="icon" disabled={pending || !draft.trim()} aria-label="Отправить">
          <Send />
        </Button>
      </form>
      <p className="mt-2 text-xs text-subtle">
        Готовое можно сразу положить{" "}
        <Link to="/catalog" className="text-muted underline-offset-2 hover:text-fg hover:underline">
          в каталог
        </Link>
        . Оформление заказа — здесь, в чате.
      </p>
    </div>
  );
}
