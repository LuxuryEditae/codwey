import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import {
  getPaymentMethod,
  PAYMENT_SNAPSHOT_KEY,
  type PaymentSnapshot,
} from "@/lib/payments/methods";
import { useHydrated } from "@/lib/use-hydrated";
import { formatRub } from "@/lib/utils";

export const Route = createFileRoute("/pay/demo")({ component: PayDemoPage });

function readSnapshot(): PaymentSnapshot | null {
  try {
    const raw = sessionStorage.getItem(PAYMENT_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PaymentSnapshot;
  } catch {
    return null;
  }
}

function PayDemoPage() {
  const hydrated = useHydrated();
  const shot = hydrated ? readSnapshot() : null;
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();
  const method = shot ? getPaymentMethod(shot.method) : undefined;

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <p className="text-muted">Загружаем платёж…</p>
      </main>
    );
  }

  if (!shot) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-3xl font-semibold">Платёж не найден</h1>
        <Button asChild className="mt-6">
          <Link to="/checkout">К оформлению</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <p className="font-mono text-xs text-muted">демо Platega</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Оплата</h1>
      <p className="mt-3 text-sm text-muted">
        Ключи ещё не подключены. Так выглядит шаг оплаты. С API это будет страница Platega.
      </p>

      <div className="mt-8 border border-accent bg-surface p-5">
        <p className="font-mono text-xs text-muted">{method?.label ?? "Способ"}</p>
        <p className="mt-2 font-display text-4xl font-semibold tabular-nums">{formatRub(shot.amount)}</p>
        <p className="mt-3 text-sm text-muted">{shot.description}</p>
        <p className="mt-2 text-xs text-subtle">{shot.contact}</p>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Button
          size="lg"
          onClick={() => {
            clear();
            void navigate({ to: "/pay/success" });
          }}
        >
          Оплатить
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link to="/pay/fail">Отменить</Link>
        </Button>
      </div>
      <p className="mt-4 break-all font-mono text-xs text-subtle">{shot.transactionId}</p>
    </main>
  );
}
