import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Gamepad2, Globe, Smartphone, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { CATEGORIES, customProducts, featuredProducts, readyProducts } from "@/data/catalog";
import { formatRub } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

const ICONS = {
  sites: Globe,
  bots: Bot,
  apps: Smartphone,
  roblox: Gamepad2,
  other: Sparkles,
} as const;

function Home() {
  const featured = featuredProducts();
  const custom = customProducts();
  const readyCount = readyProducts().length;
  const minReady = Math.min(...readyProducts().map((p) => p.price));

  return (
    <main>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="reveal font-mono text-xs tracking-wide text-muted">студия цифровых вещей</p>
            <h1 className="reveal reveal-2 mt-5 font-display text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="italic">Готовое</span> и на заказ: сайты, боты, Roblox.
            </h1>
            <p className="reveal reveal-3 mt-6 max-w-md text-base leading-relaxed text-muted">
              {readyCount} продуктов от {formatRub(minReady)}. Менеджер Вей доспрашивает и собирает
              смету в рамке — дешевле типичного Авито.
            </p>
            <div className="reveal reveal-4 mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/catalog">
                  Каталог
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/order">Описать задачу</Link>
              </Button>
            </div>
          </div>

          <aside className="reveal reveal-3 border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <dl className="space-y-6">
              <Stat k="Готовых сборок" v={String(readyCount)} />
              <Stat k="Старт цены" v={formatRub(minReady)} />
              <Stat k="Смета" v="в чате, по блокам" />
            </dl>
            <ol className="mt-10 space-y-3 border-t border-border pt-8 font-display text-lg">
              <li className="flex justify-between gap-4">
                <span>PulseShop</span>
                <span className="tabular-nums text-muted">1 490 ₽</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>NovaStudio</span>
                <span className="tabular-nums text-muted">2 490 ₽</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>NeonKart</span>
                <span className="tabular-nums text-muted">990 ₽</span>
              </li>
            </ol>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-medium italic">Категории</h2>
        <div className="mt-8 divide-y divide-border border-y border-border">
          {CATEGORIES.map((c) => {
            const Icon = ICONS[c.id];
            return (
              <Link
                key={c.id}
                to="/catalog"
                search={{ cat: c.id }}
                className="lift flex items-start gap-4 py-5"
              >
                <Icon className="mt-1 size-5 shrink-0 text-accent" />
                <span>
                  <span className="font-display text-xl font-medium">{c.label}</span>
                  <span className="mt-1 block text-sm text-muted">{c.blurb}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-medium italic">Хиты</h2>
            <Link to="/catalog" className="text-sm text-muted hover:text-fg">
              Весь каталог
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-medium italic">Как это работает</h2>
        <ol className="mt-8 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "01", t: "Выбираете", d: "Готовый продукт из каталога или описываете задачу." },
            { n: "02", t: "Вей уточняет", d: "Если чего-то не хватает — доспрашивает по делу, не анкетой." },
            { n: "03", t: "Смета в рамке", d: "Блоки, сумма, срок. Без скрытых часов." },
            { n: "04", t: "Сдача", d: "Исходники, инструкция, запуск. Правки — в рамках сметы." },
          ].map((s) => (
            <li key={s.n} className="bg-bg p-5">
              <p className="font-mono text-xs text-muted">{s.n}</p>
              <p className="mt-3 font-display text-xl font-medium">{s.t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-medium italic">На заказ</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Не нашли готовое — соберём. Цены стартуют ниже рынка, смета появляется в чате.
          </p>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {custom.map((p) => (
              <Link
                key={p.slug}
                to="/catalog/$slug"
                params={{ slug: p.slug }}
                className="lift flex items-baseline justify-between gap-4 py-4"
              >
                <span>
                  <span className="font-display text-lg font-medium">{p.name}</span>
                  <span className="mt-1 block text-sm text-muted">{p.tagline}</span>
                </span>
                <span className="shrink-0 font-display tabular-nums text-muted">
                  от {formatRub(p.price)}
                </span>
              </Link>
            ))}
          </div>
          <Button asChild className="mt-8">
            <Link to="/order">Описать задачу</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-border pb-4">
      <dt className="text-sm text-muted">{k}</dt>
      <dd className="font-display text-2xl font-medium tabular-nums">{v}</dd>
    </div>
  );
}
