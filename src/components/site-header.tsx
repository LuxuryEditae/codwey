import { Link, useSearch } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { CATEGORIES } from "@/data/catalog";
import { cartCount, useCart } from "@/lib/cart";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const lines = useCart((s) => s.lines);
  const hydrated = useHydrated();
  const count = hydrated ? cartCount(lines) : 0;
  const [open, setOpen] = useState(false);
  const search = useSearch({ strict: false }) as { cat?: string };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-baseline gap-2" onClick={() => setOpen(false)}>
          <span className="font-display text-2xl font-semibold tracking-tight">Codwey</span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
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

        <div className="flex items-center gap-1">
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
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md lg:hidden hover:bg-elevated"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div className={cn("border-t border-border lg:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-6xl flex-col px-4 py-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              to="/catalog"
              search={{ cat: c.id }}
              className="rounded-md px-3 py-3 text-base text-fg"
              onClick={() => setOpen(false)}
            >
              {c.label}
            </Link>
          ))}
          <Link to="/order" className="rounded-md px-3 py-3 text-base text-fg" onClick={() => setOpen(false)}>
            На заказ
          </Link>
        </nav>
      </div>
    </header>
  );
}
