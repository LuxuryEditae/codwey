import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PAYMENT_SNAPSHOT_KEY, type PaymentSnapshot } from "@/lib/payments/methods";
import { formatRub } from "@/lib/utils";

export const Route = createFileRoute("/pay/success")({ component: PaySuccessPage });

function PaySuccessPage() {
  const [shot, setShot] = useState<PaymentSnapshot | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PAYMENT_SNAPSHOT_KEY);
      setShot(raw ? (JSON.parse(raw) as PaymentSnapshot) : null);
    } catch {
      setShot(null);
    }
  }, []);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <p className="font-mono text-xs text-muted">оплата</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Оплачено</h1>
      <p className="mt-4 text-muted">
        Заявка принята. Напишем в Telegram или почту, как забрать исходники.
      </p>
      {shot ? (
        <div className="mt-8 border border-border bg-surface p-5">
          <p className="font-display text-2xl tabular-nums">{formatRub(shot.amount)}</p>
          <p className="mt-2 text-sm text-muted">{shot.description}</p>
          <p className="mt-2 text-sm text-muted">{shot.contact}</p>
        </div>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/catalog" search={{ kind: "ready" }}>
            Ещё готовое
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/">На главную</Link>
        </Button>
      </div>
    </main>
  );
}
