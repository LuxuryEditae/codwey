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

function OrderPage() {
  const [category, setCategory] = useState<CategoryId>("bots");
  const [task, setTask] = useState("");
  const [contact, setContact] = useState("");
  const hydrated = useHydrated();
  const consent = useConsent((s) => s.agreed) && hydrated;
  const [error, setError] = useState<string | null>(null);
  const [hostingOpen, setHostingOpen] = useState(false);
  const showArrow = useManagerUi((s) => s.showArrow);

  function sendToManager() {
    if (!consent) {
      setError("Поставьте галочку: без согласия на 152-ФЗ заявку не примем.");
      return;
    }
    if (needsHostingAck()) {
      setHostingOpen(true);
      return;
    }
    const cat = CATEGORIES.find((c) => c.id === category);
    const intent = [
      `Заявка с формы. Категория: ${cat?.label ?? category}.`,
      task.trim() || "Описание пока короткое — доспроси.",
      contact.trim() ? `Контакт: ${contact.trim()}` : "Контакт ещё не дал.",
      "Спроси, всё ли указал или хочет что-то добавить. Потом спроси: всё ок, отправляем заявку в работу?",
    ].join(" ");
    showArrow(intent);
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
        Категория, контакт и что нужно. Дальше менеджер доспросит и отправит заявку в работу.
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
