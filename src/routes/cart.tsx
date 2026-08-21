import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { HostingNote } from "@/components/hosting-note";
import { Button } from "@/components/ui/button";
import { cartCount, resolveCart, useCart } from "@/lib/cart";
import { useHydrated } from "@/lib/use-hydrated";
import { formatRub } from "@/lib/utils";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const remove = useCart((s) => s.remove);
  const setQty = useCart((s) => s.setQty);
  const { items, total } = resolveCart(hydrated ? lines : []);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Корзина</h1>
      {items.length === 0 ? (
        <div className="mt-8">
          <p className="text-muted">Пока пусто. Готовое лежит в каталоге.</p>
          <Button asChild className="mt-4">
            <Link to="/catalog">В каталог</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-3">
            {items.map(({ product, qty, line }) => (
              <li
                key={product.slug}
                className="flex flex-col gap-3 border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link
                    to="/catalog/$slug"
                    params={{ slug: product.slug }}
                    className="font-display text-lg font-semibold hover:text-accent"
                  >
                    {product.name}
                  </Link>
                  <p className="text-sm text-muted">{product.tagline}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted">
                    шт.
                    <input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(product.slug, Number(e.target.value))}
                      className="ml-2 h-11 w-16 rounded-md bg-bg px-2 text-center tabular-nums text-fg shadow-[var(--shadow-border)]"
                    />
                  </label>
                  <span className="w-24 text-right font-display tabular-nums">{formatRub(line)}</span>
                  <button
                    type="button"
                    className="grid size-11 place-items-center rounded-xl text-muted hover:bg-elevated hover:text-danger"
                    onClick={() => remove(product.slug)}
                    aria-label="Убрать"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-accent bg-surface px-5 py-4">
            <div>
              <p className="font-mono text-xs text-muted">{cartCount(lines)} поз.</p>
              <p className="font-display text-3xl font-medium tabular-nums">{formatRub(total)}</p>
            </div>
            <Button asChild size="lg">
              <Link to="/checkout">Оплатить</Link>
            </Button>
          </div>
          <HostingNote className="mt-4" />
        </>
      )}
    </main>
  );
}
