import { useState } from "react";
import { Button } from "@/components/ui/button";

const EVENTS = [
  { id: "night", name: "Sage Night", meta: "пт 22:00 · 12 мест" },
  { id: "talk", name: "Разбор смет", meta: "сб 18:00 · 30 мест" },
];

export function TicketBotDemo() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-sm border border-border bg-elevated p-3">
      <div className="bg-bg px-3 py-4">
        <p className="text-center font-mono text-xs text-subtle">TicketGate · демо</p>
        <div className="mt-3 space-y-2">
          {EVENTS.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => setPicked(ev.id)}
              className="flex w-full flex-col border border-border bg-surface px-3 py-3 text-left hover:bg-elevated"
            >
              <span className="text-sm text-fg">{ev.name}</span>
              <span className="text-xs text-muted">{ev.meta}</span>
            </button>
          ))}
        </div>
        {picked ? (
          <div className="mt-4 border border-border bg-surface px-3 py-4 text-center">
            <div className="mx-auto grid size-24 place-items-center rounded-lg bg-fg">
              <div className="grid size-16 grid-cols-4 grid-rows-4 gap-0.5">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span
                    key={i}
                    className={i % 3 === 0 || i === 5 ? "bg-bg" : "bg-fg"}
                  />
                ))}
              </div>
            </div>
            <p className="mt-3 text-sm text-fg">Билет выдан</p>
            <p className="text-xs text-muted">Покажите QR на входе</p>
            <Button className="mt-3" variant="secondary" size="sm" onClick={() => setPicked(null)}>
              Другое событие
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
