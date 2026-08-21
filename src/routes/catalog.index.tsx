import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { CATEGORIES, PRODUCTS, type CategoryId } from "@/data/catalog";
import { cn } from "@/lib/utils";

type CatalogSearch = {
  cat?: string;
};

export const Route = createFileRoute("/catalog/")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    cat: typeof search.cat === "string" ? search.cat : undefined,
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const { cat } = Route.useSearch();
  const active = (CATEGORIES.some((c) => c.id === cat) ? cat : "all") as CategoryId | "all";
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "ready" | "custom">("all");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      if (active !== "all" && p.category !== active) return false;
      if (kind !== "all" && p.kind !== kind) return false;
      if (!q) return true;
      return `${p.name} ${p.tagline} ${p.description}`.toLowerCase().includes(q);
    });
  }, [active, kind, query]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="font-mono text-xs text-muted">каталог</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Готовое и на заказ</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Цены ниже типичных объявлений на Авито. Готовое отдаём сразу, кастом считаем сметой в чате.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Chip to="/catalog" search={{}} active={active === "all"}>
          Все
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} to="/catalog" search={{ cat: c.id }} active={active === c.id}>
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: бот, лендинг, обби…"
          className="max-w-md"
        />
        <div className="flex gap-2">
          {(["all", "ready", "custom"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "h-11 rounded-md px-3 text-sm",
                kind === k ? "bg-accent text-accent-fg" : "bg-elevated text-muted",
              )}
            >
              {k === "all" ? "Все типы" : k === "ready" ? "Готовое" : "На заказ"}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-12 text-muted">Ничего не нашлось. Попробуйте другой запрос или напишите Вей.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}

function Chip({
  children,
  to,
  search,
  active,
}: {
  children: string;
  to: "/catalog";
  search: CatalogSearch;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      search={search}
      className={cn(
        "inline-flex h-11 items-center rounded-md px-4 text-sm",
        active ? "bg-accent text-accent-fg" : "bg-elevated text-muted hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}
