import { useState } from "react";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { id: "a", text: "От 40 000 ₽", ok: false },
  { id: "b", text: "1 490 ₽, готовый PulseShop", ok: true },
  { id: "c", text: "Бесплатно, если очень попросить", ok: false },
];

export function QuizBotDemo() {
  const [choice, setChoice] = useState<string | null>(null);
  const picked = OPTIONS.find((o) => o.id === choice);

  return (
    <div className="mx-auto max-w-sm border border-border bg-elevated p-3">
      <div className="bg-bg px-3 py-4">
        <p className="text-center font-mono text-xs text-subtle">QuizStorm · демо</p>
        <p className="mt-4 text-sm leading-relaxed text-fg">
          Сколько стоит готовый магазин-бот в Codwey?
        </p>
        <div className="mt-3 space-y-2">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={Boolean(choice)}
              onClick={() => setChoice(o.id)}
              className="w-full border border-border bg-surface px-3 py-3 text-left text-sm text-fg disabled:opacity-80"
            >
              {o.text}
            </button>
          ))}
        </div>
        {picked ? (
          <p className={`mt-3 text-sm ${picked.ok ? "text-accent" : "text-danger"}`}>
            {picked.ok ? "Верно. PulseShop — 1 490 ₽." : "Нет. У нас готовое дешевле рынка."}
          </p>
        ) : null}
        {choice ? (
          <Button className="mt-3 w-full" variant="secondary" size="sm" onClick={() => setChoice(null)}>
            Ещё раз
          </Button>
        ) : null}
      </div>
    </div>
  );
}
