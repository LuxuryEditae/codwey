import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CategoryGrid } from "@/components/category-card";
import { ProductCard } from "@/components/product-card";
import {
  CATEGORIES,
  filterProducts,
  getCategory,
  parseCatalogSearch,
} from "@/data/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/catalog/")({
  validateSearch: parseCatalogSearch,
  component: CatalogPage,
});

function CatalogPage() {
  const { cat, kind } = Route.useSearch();
  const category = getCategory(cat);

  if (!category) {
    const onlyReady = kind === "ready";
    const onlyCustom = kind === "custom";
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        <p className="font-mono text-xs text-muted">каталог</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {onlyReady ? "Готовое" : onlyCustom ? "На заказ" : "Разделы"}
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          {onlyReady
            ? "Выберите тип — внутри только готовые сборки."
            : onlyCustom
              ? "Выберите тип — внутри только заказы."
              : "Сначала выберите, что нужно. Внутри раздела — отдельно готовое и заказ."}
        </p>

        {onlyCustom ? (
          <div className="mt-10 max-w-xl">
            <p className="text-muted">Опишите задачу — менеджер доспросит и даст смету.</p>
            <Link
              to="/order"
              className="mt-6 inline-flex h-12 items-center rounded-md bg-accent px-5 text-base font-medium text-accent-fg"
            >
              Описать задачу
            </Link>
          </div>
        ) : (
          <>
            {onlyReady ? null : (
              <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">Готовое</h2>
            )}
            <div className={onlyReady ? "mt-8" : "mt-6"}>
              <CategoryGrid kind="ready" />
            </div>
            {onlyReady ? null : (
              <div className="mt-14 max-w-xl">
                <h2 className="font-display text-2xl font-semibold tracking-tight">На заказ</h2>
                <p className="mt-3 text-muted">Нет готового — одна форма, без пяти карточек.</p>
                <Link
                  to="/order"
                  className="mt-6 inline-flex h-12 items-center rounded-md bg-accent px-5 text-base font-medium text-accent-fg"
                >
                  Описать задачу
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    );
  }

  const ready = filterProducts(category.id, "ready");
  const title = kind === "ready" ? category.readyTitle : category.label;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <Link
        to="/catalog"
        search={{ kind: "ready" }}
        className="inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Все разделы
      </Link>

      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-xl text-muted">{category.blurb}</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {CATEGORIES.filter((c) => c.id !== "other").map((c) => (
          <Link
            key={c.id}
            to="/catalog"
            search={{ cat: c.id, kind: "ready" }}
            className={cn(
              "inline-flex h-11 items-center rounded-md px-4 text-sm",
              c.id === category.id ? "bg-accent text-accent-fg" : "bg-elevated text-muted hover:text-fg",
            )}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {ready.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Готовое</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ready.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12 max-w-xl">
        <h2 className="font-display text-2xl font-semibold tracking-tight">На заказ</h2>
        <p className="mt-3 text-muted">Нужен {category.label.toLowerCase()} не из списка — опишите задачу.</p>
        <Link
          to="/order"
          className="mt-6 inline-flex h-12 items-center rounded-md bg-accent px-5 text-base font-medium text-accent-fg"
        >
          Описать задачу
        </Link>
      </section>
    </main>
  );
}
