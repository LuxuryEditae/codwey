import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, type CategoryId } from "@/data/catalog";

export const Route = createFileRoute("/order")({ component: OrderPage });

function OrderPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryId>("bots");
  const [task, setTask] = useState("");
  const [contact, setContact] = useState("");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="font-mono text-xs text-muted">на заказ</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Опишите задачу</h1>
      <p className="mt-3 text-muted">
        Не обязательно писать идеально. Вей доспросит пробелы и соберёт смету. Можно сразу открыть
        чат, если проще текстом.
      </p>

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
          void navigate({ to: "/chat", search: { intent } });
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
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg">
            Отправить Вей
          </Button>
          <Button type="button" size="lg" variant="secondary" onClick={() => void navigate({ to: "/chat" })}>
            Сразу в чат
          </Button>
        </div>
      </form>
    </main>
  );
}
