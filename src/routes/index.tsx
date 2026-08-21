import { createFileRoute, Link } from "@tanstack/react-router";
import { HostingNote } from "@/components/hosting-note";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { PRODUCTS } from "@/data/catalog";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const ready = PRODUCTS.filter((p) => p.kind === "ready");

  return (
    <main>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
          <p className="reveal font-mono text-xs tracking-wide text-muted">Codwey</p>
          <h1 className="reveal reveal-2 mt-4 max-w-4xl font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Готовое
          </h1>
          <p className="reveal reveal-3 mt-5 max-w-lg text-base leading-relaxed text-muted">
            Сайты, боты, приложения и Roblox — берёте из каталога и оплачиваете. Ниже, если нет
            готового — заказ.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ready.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight">На заказ</h2>
            <p className="mt-3 text-muted">
              Нет готового — опишите задачу, срок и контакт. Менеджер посчитает смету.
            </p>
            <HostingNote className="mt-3 text-sm text-muted" />
            <Button asChild className="mt-8" size="lg">
              <Link to="/order">Описать задачу</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
