import { Link } from "@tanstack/react-router";
import { ImagePlus, LoaderCircle, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConsentCheck } from "@/components/consent-check";
import { HostingModal, needsHostingAck } from "@/components/hosting-modal";
import { HostingNote } from "@/components/hosting-note";
import { QuoteFrame } from "@/components/quote-frame";
import { Button } from "@/components/ui/button";
import { sendManagerMessage } from "@/lib/ai/client";
import type { ChatImage } from "@/lib/ai/types";
import { resolveCart, useCart } from "@/lib/cart";
import { useChat } from "@/lib/chat-store";
import { useConsent } from "@/lib/consent";
import { useManagerUi } from "@/lib/manager-ui";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

const STARTERS = [
  "Сколько стоит Telegram-бот магазина?",
  "Нужен лендинг для фотографа",
  "Хочу обби в Roblox на 30 этапов",
  "Что входит в PulseShop?",
];

const usedSeeds = new Set<string>();

function plainChat(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\*/g, "");
}

async function fileToImage(file: File): Promise<ChatImage> {
  const bitmap = await createImageBitmap(file);
  const max = 768;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.55);
  return { mime: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}

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
  const extraCtx = useRef<string>("");
  const takeOrder = useManagerUi((s) => s.takeOrder);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<{ preview: string; payload: ChatImage }[]>([]);
  const [hostingOpen, setHostingOpen] = useState(false);
  const queued = useRef<string | null>(null);
  const consent = useConsent((s) => s.agreed);
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const visible = hydrated ? messages : [];

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [visible, pending]);

  useEffect(() => {
    if (!hydrated || !consent) return;
    const extra = takeOrder();
    const next = extra.seed || seed;
    if (extra.seed) usedSeeds.clear();
    if (extra.context) extraCtx.current = extra.context;
    if (!next || usedSeeds.has(next)) return;
    if (useChat.getState().messages.some((m) => m.content === next)) {
      usedSeeds.add(next);
      return;
    }
    usedSeeds.add(next);
    void submit(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, seed, consent]);

  async function submit(text: string, imgs?: ChatImage[]) {
    const content = text.trim();
    const shot = imgs ?? images.map((i) => i.payload);
    if ((!content && shot.length === 0) || pending) return;
    if (!consent) {
      setError("Отметьте согласие на обработку данных.");
      return;
    }
    const alreadyIn = useChat.getState().messages.some((m) => m.submitted);
    const correcting = /исправ|измен|добав|убер|передел|другое|скидк|дешев|поправ|замен|файл|ссылк|срок|цен|контакт/i.test(
      content,
    );
    const freshOrder = content.startsWith("Заявка с сайта");
    if (alreadyIn && !correcting && !freshOrder && shot.length === 0) {
      push({ role: "user", content });
      push({
        role: "assistant",
        content: "Заявка уже принята. Напишите, что поправить — изменю.",
        questions: [],
      });
      setDraft("");
      return;
    }
    if (needsHostingAck()) {
      queued.current = content || "Смотри фото.";
      setHostingOpen(true);
      return;
    }
    const lastQ = [...useChat.getState().messages]
      .reverse()
      .find((m) => m.role === "assistant")?.questions;
    if (lastQ?.includes(content)) {
      extraCtx.current = [
        extraCtx.current,
        `Клиент нажал кнопку «${content}». Это ответ. Если согласился со скидкой или правкой — сразу пересчитай смету с новыми цифрами. Не повторяй предыдущее сообщение.`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    setError(null);
    setDraft("");
    setImages([]);
    push({
      role: "user",
      content: content || "Фото к задаче",
      image: shot[0] ? `data:${shot[0].mime};base64,${shot[0].data}` : undefined,
    });
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
        context: [context, extraCtx.current, cartText].filter(Boolean).join("\n"),
        images: shot,
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
      submitted: result.submit,
    });
  }

  const lastAssistant = [...visible].reverse().find((m) => m.role === "assistant");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HostingModal
        open={hostingOpen}
        onClose={() => {
          setHostingOpen(false);
          const text = queued.current;
          queued.current = null;
          if (text) void submit(text);
        }}
      />
      <div className="flex items-center justify-between gap-3 border-b border-border px-1 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-md bg-accent text-accent-fg"
            onClick={() => useManagerUi.getState().setOpen(false)}
            aria-label="Закрыть"
          >
            <X className="size-5" />
          </button>
          <div>
            <p className="font-display text-lg font-semibold">Вей</p>
            <p className="text-xs text-muted">ИИ-менеджер Codwey</p>
          </div>
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

      <div ref={scroller} className="min-h-0 flex-1 space-y-6 overflow-y-auto py-4">
        {visible.length === 0 && !pending ? (
          <div className="space-y-4">
            <p className="max-w-md text-sm leading-relaxed text-muted">
              Напишите задачу или прикрепите скрин. Если чего-то не хватает — доспрошу и соберу
              смету. Когда всё ок — отправлю заявку в работу.
            </p>
            <HostingNote />
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

        {visible.map((m, i) => {
          const prevQuote = [...visible]
            .slice(0, i)
            .reverse()
            .find((x) => x.quote)?.quote;
          const showQuote =
            Boolean(m.quote) &&
            (m.submitted ||
              ((m.quote?.items.length ?? 0) >= 2 &&
                JSON.stringify(m.quote) !== JSON.stringify(prevQuote)));
          return (
          <article
            key={m.id}
            className={cn("max-w-[40rem]", m.role === "user" ? "ml-auto" : "mr-auto")}
          >
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-subtle">
              {m.role === "user" ? "вы" : "вей"}
            </p>
            <div
              className={cn(
                "rounded-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user" ? "bg-accent text-accent-fg" : "border border-border bg-elevated text-fg",
              )}
            >
              {m.image ? (
                <img src={m.image} alt="" className="mb-2 max-h-40 rounded-sm object-cover" />
              ) : null}
              {plainChat(m.content)}
            </div>
            {showQuote && m.quote ? <QuoteFrame quote={m.quote} /> : null}
            {m.submitted ? (
              <p className="mt-3 border border-accent bg-surface px-4 py-3 text-sm font-medium">
                Заявка принята!
              </p>
            ) : null}
          </article>
          );
        })}

        {pending ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" />
            Вей смотрит…
          </p>
        ) : null}

        {error ? (
          <p className="rounded-md bg-elevated px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        {lastAssistant?.questions &&
        lastAssistant.questions.length > 0 &&
        !pending &&
        !lastAssistant.submitted &&
        !visible.some((m) => m.submitted) ? (
          <div className="flex flex-wrap gap-2">
            {lastAssistant.questions
              .filter((q) => q.trim().length > 0 && q.trim().length <= 36)
              .filter((q) => {
                const confirm = /да|всё ок|все ок|нормально|принять/i.test(q);
                const waiting = /принять заявк|принять заказ/i.test(lastAssistant.content);
                return waiting || !confirm;
              })
              .slice(0, 3)
              .map((q) => (
              <button
                key={q}
                type="button"
                className="rounded-md bg-surface px-3 py-2 text-left text-sm text-fg shadow-[var(--shadow-border)]"
                onClick={() => void submit(q)}
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border-t border-border pt-3">
        <ConsentCheck />
        {images.length > 0 ? (
          <div className="mt-2 flex gap-2">
            {images.map((img) => (
              <div key={img.preview} className="relative">
                <img src={img.preview} alt="" className="h-14 w-14 rounded-sm object-cover" />
                <button
                  type="button"
                  className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-accent-fg"
                  onClick={() => setImages((prev) => prev.filter((p) => p.preview !== img.preview))}
                  aria-label="Убрать фото"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(draft);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const payload = await fileToImage(file);
                setImages((prev) =>
                  [...prev, { preview: URL.createObjectURL(file), payload }].slice(-1),
                );
              } catch {
                setError("Не получилось прочитать фото");
              }
            }}
          />
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-md bg-elevated text-fg"
            onClick={() => fileRef.current?.click()}
            aria-label="Прикрепить фото"
          >
            <ImagePlus className="size-4" />
          </button>
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
            placeholder="Текст или фото референса…"
            className="min-h-11 max-h-32 flex-1 resize-none rounded-md bg-surface px-3.5 py-2.5 text-sm text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-accent/50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={pending || (!draft.trim() && images.length === 0) || !consent}
            aria-label="Отправить"
          >
            <Send />
          </Button>
        </form>
      </div>
      <p className="mt-2 text-xs text-subtle">
        Мы делаем только продукт. Хостинг лежит на вас.{" "}
        <Link to="/checkout" className="underline-offset-2 hover:text-fg hover:underline">
          Оплата
        </Link>
        .
      </p>
    </div>
  );
}
