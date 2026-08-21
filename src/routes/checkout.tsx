import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ConsentCheck } from "@/components/consent-check";
import { HostingNote } from "@/components/hosting-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveCart, useCart } from "@/lib/cart";
import { createPayment } from "@/lib/payments/client";
import {
  PAYMENT_METHODS,
  PAYMENT_SNAPSHOT_KEY,
  type PaymentMethodId,
  type PaymentSnapshot,
} from "@/lib/payments/methods";
import { useConsent } from "@/lib/consent";
import { useHydrated } from "@/lib/use-hydrated";
import { cn, formatRub } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

function CheckoutPage() {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const { items, total } = resolveCart(hydrated ? lines : []);
  const ready = items.filter((i) => i.product.kind === "ready");
  const amount = ready.reduce((n, i) => n + i.line, 0);

  const [contact, setContact] = useState("");
  const [method, setMethod] = useState<PaymentMethodId>(2);
  const consent = useConsent((s) => s.agreed);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function pay() {
    if (!consent) {
      setError("Поставьте галочку: без согласия на 152-ФЗ оплату не откроем.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await createPayment({
        data: {
          contact,
          method,
          items: ready.map((i) => ({ slug: i.product.slug, qty: i.qty })),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const snapshot: PaymentSnapshot = {
        transactionId: result.transactionId,
        method: result.method,
        amount: result.amount,
        description: result.description,
        contact: result.contact,
        items: result.items,
        mode: result.mode,
      };
      sessionStorage.setItem(PAYMENT_SNAPSHOT_KEY, JSON.stringify(snapshot));
      await navigate({ to: "/pay/demo" });
    } catch {
      setError("Не получилось создать платёж");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="font-mono text-xs text-muted">оплата</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Оформить</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        СБП, карта, SberPay, крипта — через Platega.
      </p>
      <HostingNote className="mt-3 max-w-xl text-sm text-muted" />

      {ready.length === 0 ? (
        <div className="mt-10">
          <p className="text-muted">Готовых позиций в корзине нет. Заказ без готового — через менеджера.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/catalog" search={{ kind: "ready" }}>
                Готовое
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/order">На заказ</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <section>
            <h2 className="font-display text-xl font-semibold">Позиции</h2>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {ready.map(({ product, qty, line }) => (
                <li key={product.slug} className="flex items-baseline justify-between gap-3 py-3">
                  <span>
                    <span className="font-medium">{product.name}</span>
                    <span className="mt-1 block text-xs text-muted">×{qty}</span>
                  </span>
                  <span className="tabular-nums">{formatRub(line)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-display text-2xl font-semibold tabular-nums">{formatRub(amount)}</p>
          </section>

          <section className="border border-border bg-surface p-5">
            <h2 className="font-display text-xl font-semibold">Способ</h2>
            <div className="mt-4 grid gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    "flex h-14 items-center justify-between rounded-md px-4 text-left",
                    method === m.id ? "bg-accent text-accent-fg" : "bg-elevated text-fg",
                  )}
                >
                  <span className="font-medium">{m.label}</span>
                  <span className={cn("text-xs", method === m.id ? "text-accent-fg/70" : "text-muted")}>
                    {m.hint}
                  </span>
                </button>
              ))}
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm text-muted">Telegram или почта</span>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="@username"
                autoComplete="username"
              />
            </label>

            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

            <div className="mt-5">
              <ConsentCheck />
            </div>

            <Button className="mt-5 w-full" size="lg" disabled={pending || !consent} onClick={() => void pay()}>
              {pending ? "Создаём платёж…" : `Оплатить ${formatRub(amount)}`}
            </Button>
            <p className="mt-3 text-xs leading-relaxed text-subtle">
              После ключей Platega (PLATEGA_MERCHANT_ID и PLATEGA_SECRET) кнопка уйдёт на их страницу.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
