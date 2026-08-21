import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatRub } from "@/lib/utils";

const ITEMS = [
  { id: "tee", name: "Футболка Codwey", price: 1290 },
  { id: "cap", name: "Кепка Sage", price: 890 },
  { id: "mug", name: "Кружка Ink", price: 590 },
];

export function ShopBotDemo() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const lines = useMemo(
    () => ITEMS.filter((i) => (cart[i.id] ?? 0) > 0).map((i) => ({ ...i, qty: cart[i.id] })),
    [cart],
  );
  const total = lines.reduce((n, l) => n + l.price * l.qty, 0);

  return (
    <div className="mx-auto max-w-sm border border-border bg-elevated p-3">
      <div className="bg-bg px-3 py-4">
        <p className="text-center font-mono text-xs text-subtle">PulseShop · демо</p>
        <div className="mt-3 space-y-2">
          {ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border border-border bg-surface px-3 py-3"
            >
              <div>
                <p className="text-sm text-fg">{item.name}</p>
                <p className="text-xs tabular-nums text-muted">{formatRub(item.price)}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDone(false);
                  setCart((c) => ({ ...c, [item.id]: (c[item.id] ?? 0) + 1 }));
                }}
              >
                В корзину
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 border border-border bg-surface px-3 py-3">
          {lines.length === 0 ? (
            <p className="text-sm text-muted">Корзина пуста</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {lines.map((l) => (
                <li key={l.id} className="flex justify-between tabular-nums">
                  <span>
                    {l.name} ×{l.qty}
                  </span>
                  <span>{formatRub(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 flex justify-between font-medium tabular-nums">
            <span>Итого</span>
            <span>{formatRub(total)}</span>
          </p>
          <Button
            className="mt-3 w-full"
            disabled={lines.length === 0}
            onClick={() => setDone(true)}
          >
            Оформить
          </Button>
          {done ? (
            <p className="mt-2 text-xs text-accent">Заявка ушла админу. В настоящем боте — в Telegram.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
