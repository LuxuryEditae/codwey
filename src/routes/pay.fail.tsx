import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pay/fail")({ component: PayFailPage });

function PayFailPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <p className="font-mono text-xs text-muted">оплата</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Не прошло</h1>
      <p className="mt-4 text-muted">Можно выбрать другой способ или написать менеджеру.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/checkout">Попробовать снова</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/chat">Менеджер</Link>
        </Button>
      </div>
    </main>
  );
}
