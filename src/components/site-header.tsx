import { Link, useSearch } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { CATEGORIES } from "@/data/catalog";
import { cartCount, useCart } from "@/lib/cart";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const lines = useCart((s) => s.lines);
  const hydrated = useHydrated();
  const count = hydrated ? cartCount(lines) : 0;
  const search = useSearch({ strict: false }) as { cat?: string };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:h-16">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold tracking-tight md:text-2xl">Codwey</span>
          <span className="hidden text-sm text-muted md:inline">готовое и на заказ</span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {CATEGORIES.filter((c) => c.id !== "other").map((c) => (
            <Link
              key={c.id}
              to="/catalog"
              search={{ cat: c.id }}
              className={cn("nav-link text-sm hover:text-fg", search.cat === c.id ? "text-fg" : "text-muted")}
            >
              {c.label}
            </Link>
          ))}
          <Link
            to="/order"
            className="nav-link text-sm text-muted hover:text-fg"
            activeProps={{ className: "text-fg" }}
          >
            На заказ
          </Link>
        </nav>

        <Link
          to="/cart"
          className="relative grid size-11 place-items-center rounded-md text-fg hover:bg-elevated"
          aria-label="Корзина"
        >
          <ShoppingBag className="size-5" />
          {count > 0 ? (
            <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-sm bg-accent px-1 text-xs font-semibold text-accent-fg tabular-nums">
              {count}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
