import { Link } from "@tanstack/react-router";
import { ProductCover } from "@/components/product-cover";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/data/catalog";
import { formatRub } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const priceLabel =
    product.kind === "custom" ? `от ${formatRub(product.price)}` : formatRub(product.price);

  return (
    <Link
      to="/catalog/$slug"
      params={{ slug: product.slug }}
      className="group lift flex flex-col border border-border bg-surface p-2"
    >
      <ProductCover product={product} className="aspect-[16/10]" />
      <div className="flex flex-1 flex-col px-2 pb-2 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-subtle">
            {product.kind === "ready" ? "готовое" : "на заказ"}
          </span>
          {product.popular ? <Badge className="text-accent">хит</Badge> : null}
          {product.isNew ? <Badge>новое</Badge> : null}
          {product.kind === "ready" && product.oldPrice ? (
            <Badge className="line-through">{formatRub(product.oldPrice)}</Badge>
          ) : null}
        </div>
        <h3 className="mt-2 font-display text-xl font-medium leading-snug text-fg">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{product.tagline}</p>
        <p className="mt-4 flex items-baseline justify-between gap-3">
          <span className="font-display text-xl font-medium tabular-nums">{priceLabel}</span>
          <span className="text-xs text-subtle">{product.timeline}</span>
        </p>
      </div>
    </Link>
  );
}
