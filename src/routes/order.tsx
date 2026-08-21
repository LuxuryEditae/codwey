import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ConsentCheck } from "@/components/consent-check";
import { HostingNote } from "@/components/hosting-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, type CategoryId } from "@/data/catalog";
import { useConsent } from "@/lib/consent";
import { useHydrated } from "@/lib/use-hydrated";

export const Route = createFileRoute("/order")({ component: OrderPage });

function OrderPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryId>("bots");
  const [task, setTask] = useState("");
  const [contact, setContact] = useState("");
  const hydrated = useHydrated();
  const consent = useConsent((s) => s.agreed) && hydrated;
  const [error, setError] = useState<string | null>(null);

  function goToChat(intent?: string) {
    if (!consent) {
      setError("Поставьте галочку: без согласия на 152-ФЗ заявку не примем.");
      return;
    }
    void navigate({ to: "/chat", search: intent ? { intent } : {} });
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="font-mono text-xs text-muted">на заказ</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Опишите задачу</h1>
      <p className="mt-3 text-muted">
        Не обязательно писать идеально. Менеджер доспросит пробелы и соберёт смету.
      </p>
      <HostingNote className="mt-4 max-w-xl text-sm text-muted" />

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const cat = CATEGORIES.find((c) => c.id === category);
          const intent = [
            `Заказ на ${cat?.label ?? category}.`,
            task.trim() || "Детали пока не расписал — доспроси.",
            contact.trim() ? `Связь: ${contact.trim()}` : "Контакт ещё не дал.",
          ].join(" ");
          goToChat(intent);
        }}
      >
        <fieldset>
          <legend className="mb-2 text-sm text-muted">Тип</legend>
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
            placeholder="Например: бот записи на две услуги, напоминание за час, админ видит слоты…"
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
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={!consent}>
            Отправить менеджеру
          </Button>
          <Button type="button" size="lg" variant="secondary" disabled={!consent} onClick={() => goToChat()}>
            Сразу в чат
          </Button>
        </div>
      </form>
    </main>
  );
}
