import { createFileRoute, Link } from "@tanstack/react-router";
import { CategoryGrid } from "@/components/category-card";
import { HostingNote } from "@/components/hosting-note";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
          <p className="reveal font-mono text-xs tracking-wide text-muted">Codwey</p>
          <h1 className="reveal reveal-2 mt-4 max-w-4xl font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Готовые и на заказ: сайты, боты, приложения
          </h1>
          <p className="reveal reveal-3 mt-5 max-w-lg text-base leading-relaxed text-muted">
            Сначала выберите тип — внутри только готовые сборки. Нет готового — заказ ниже.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-semibold tracking-tight">Готовое</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">Сайты, боты, приложения, Roblox — тыкаете раздел, внутри карточки.</p>
        <div className="mt-8">
          <CategoryGrid kind="ready" />
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight">На заказ</h2>
            <p className="mt-3 text-muted">
              Нет готового — опишите задачу, срок и бюджет. Менеджер доспросит и соберёт смету.
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
