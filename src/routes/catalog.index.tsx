import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CategoryGrid } from "@/components/category-card";
import { ProductCard } from "@/components/product-card";
import {
  CATEGORIES,
  filterProducts,
  getCategory,
  parseCatalogSearch,
  type CategoryId,
  type ProductKind,
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
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <p className="font-mono text-xs text-muted">каталог</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Разделы</h1>
        <p className="mt-3 max-w-xl text-muted">Сначала выберите, что нужно. Внутри раздела — отдельно готовое и заказ.</p>

        <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">Готовое</h2>
        <div className="mt-6">
          <CategoryGrid kind="ready" />
        </div>

        <h2 className="mt-14 font-display text-2xl font-semibold tracking-tight">На заказ</h2>
        <div className="mt-6">
          <CategoryGrid kind="custom" />
        </div>
      </main>
    );
  }

  const ready = filterProducts(category.id, "ready");
  const custom = filterProducts(category.id, "custom");
  const showReady = !kind || kind === "ready";
  const showCustom = !kind || kind === "custom";
  const title =
    kind === "ready" ? category.readyTitle : kind === "custom" ? category.customTitle : category.label;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <Link
        to="/catalog"
        search={{}}
        className="inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Все разделы
      </Link>

      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-xl text-muted">{category.blurb}</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            to="/catalog"
            search={{ cat: c.id, kind }}
            className={cn(
              "inline-flex h-11 items-center rounded-md px-4 text-sm",
              c.id === category.id ? "bg-accent text-accent-fg" : "bg-elevated text-muted hover:text-fg",
            )}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <KindChip cat={category.id} active={!kind} label="Всё в разделе" />
        {ready.length > 0 ? (
          <KindChip cat={category.id} kind="ready" active={kind === "ready"} label="Только готовое" />
        ) : null}
        {custom.length > 0 ? (
          <KindChip cat={category.id} kind="custom" active={kind === "custom"} label="Только заказ" />
        ) : null}
      </div>

      {showReady && ready.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Готовое</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ready.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      ) : null}

      {showCustom && custom.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">На заказ</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {custom.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function KindChip({
  cat,
  kind,
  active,
  label,
}: {
  cat: CategoryId;
  kind?: ProductKind;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      to="/catalog"
      search={kind ? { cat, kind } : { cat }}
      className={cn(
        "inline-flex h-11 items-center rounded-md px-4 text-sm",
        active ? "bg-accent text-accent-fg" : "border border-border text-muted hover:text-fg",
      )}
    >
      {label}
    </Link>
  );
}
