import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ConsentCheck } from "@/components/consent-check";
import { HostingModal, needsHostingAck } from "@/components/hosting-modal";
import { HostingNote } from "@/components/hosting-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, type CategoryId } from "@/data/catalog";
import { useConsent } from "@/lib/consent";
import { useManagerUi } from "@/lib/manager-ui";
import { useHydrated } from "@/lib/use-hydrated";

export const Route = createFileRoute("/order")({ component: OrderPage });

const DEADLINES = [
  { id: "rush", label: "1–2 дня", hint: "+25% к смете" },
  { id: "fast", label: "3–5 дней", hint: "+10%" },
  { id: "week", label: "Неделя", hint: "базовая цена" },
  { id: "two", label: "2 недели", hint: "−5%" },
  { id: "any", label: "Без срока", hint: "базовая цена" },
] as const;

function OrderPage() {
  const [category, setCategory] = useState<CategoryId>("bots");
  const [task, setTask] = useState("");
  const [contact, setContact] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState<(typeof DEADLINES)[number]["id"]>("week");
  const hydrated = useHydrated();
  const consent = useConsent((s) => s.agreed) && hydrated;
  const [error, setError] = useState<string | null>(null);
  const [hostingOpen, setHostingOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const queueOrder = useManagerUi((s) => s.queueOrder);

  function sendToManager() {
    if (!consent) {
      setError("Отметьте согласие на обработку данных.");
      return;
    }
    if (needsHostingAck()) {
      setHostingOpen(true);
      return;
    }
    const cat = CATEGORIES.find((c) => c.id === category);
    const due = DEADLINES.find((d) => d.id === deadline);
    const seed = [
      `Заявка с сайта.`,
      `Категория: ${cat?.label ?? category}.`,
      `Задача: ${task.trim() || "пока коротко"}.`,
      `Срок: ${due?.label ?? "неделя"} (${due?.hint}).`,
      budget.trim() ? `Бюджет клиента примерно: ${budget.trim()} ₽.` : "Бюджет не указан.",
      `Контакт: ${contact.trim() || "не указан"}.`,
    ].join("\n");
    const context = [
      "Это заявка с формы «на заказ».",
      "Срок влияет на цену: 1–2 дня +25%, 3–5 дней +10%, неделя база, 2 недели −5%.",
      "Бюджет клиента — ориентир, можно чуть выше или ниже с объяснением.",
      "Не принимай заявку сразу. Расспроси: логотип, поля, куда падают заявки, оплата.",
      "Если клиент просит исправить — replace=true, обнови ту же заявку.",
    ].join(" ");
    queueOrder(seed, context);
    setSent(true);
  }

  if (sent) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <p className="font-mono text-xs text-muted">на заказ</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Заявка у менеджера</h1>
        <p className="mt-4 text-muted">
          Форма закрыта. Нажмите на большую стрелку — заявка уйдёт менеджеру, он посчитает смету.
        </p>
        <Button className="mt-8" variant="secondary" onClick={() => setSent(false)}>
          Новая заявка
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <HostingModal
        open={hostingOpen}
        onClose={() => {
          setHostingOpen(false);
          sendToManager();
        }}
      />
      <p className="font-mono text-xs text-muted">на заказ</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Опишите задачу</h1>
      <p className="mt-3 text-muted">
        Категория, срок, контакт и что нужно. Срок меняет цену. Менеджер соберёт смету.
      </p>
      <HostingNote className="mt-4 max-w-xl text-sm text-muted" />

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          sendToManager();
        }}
      >
        <fieldset>
          <legend className="mb-2 text-sm text-muted">Категория</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`h-11 rounded-md px-4 text-sm ${
                  category === c.id ? "bg-accent text-accent-fg" : "bg-elevated text-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-2 block text-sm text-muted">Что нужно сделать</span>
          <Textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Например: бот записи на две услуги, напоминание за час…"
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm text-muted">Срок</legend>
          <div className="flex flex-wrap gap-2">
            {DEADLINES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDeadline(d.id)}
                className={`h-11 rounded-md px-4 text-sm ${
                  deadline === d.id ? "bg-accent text-accent-fg" : "bg-elevated text-muted"
                }`}
              >
                {d.label}
                <span className="ml-2 text-xs opacity-70">{d.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-2 block text-sm text-muted">Бюджет примерно, ₽</span>
          <Input
            inputMode="numeric"
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="например 3000"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-muted">Telegram или почта</span>
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="@username"
          />
        </label>
        <ConsentCheck />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" size="lg" disabled={!consent}>
          Отправить менеджеру
        </Button>
      </form>
    </main>
  );
}
