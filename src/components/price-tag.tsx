import type { Product } from "@/data/catalog";
import { formatRub } from "@/lib/utils";

export function PriceTag({ product }: { product: Product }) {
  const label =
    product.kind === "custom" ? `от ${formatRub(product.price)}` : formatRub(product.price);
  return (
    <div className="border border-accent bg-surface px-4 py-4">
      <p className="font-mono text-xs text-muted">{product.kind === "custom" ? "от" : "цена"}</p>
      <p className="mt-1 font-display text-3xl font-medium tabular-nums">{label}</p>
      {product.oldPrice && product.kind === "ready" ? (
        <p className="mt-1 text-sm text-subtle line-through tabular-nums">{formatRub(product.oldPrice)}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted">Срок: {product.timeline}</p>
    </div>
  );
}
