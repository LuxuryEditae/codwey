import { Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Gamepad2, Globe, Smartphone, Sparkles } from "lucide-react";
import { CATEGORIES, filterProducts, minPriceOf, type Category, type ProductKind } from "@/data/catalog";
import { formatRub } from "@/lib/utils";

export const CATEGORY_ICONS = {
  sites: Globe,
  bots: Bot,
  apps: Smartphone,
  roblox: Gamepad2,
  other: Sparkles,
} as const;

export function CategoryCard({
  category,
  kind,
}: {
  category: Category;
  kind: ProductKind;
}) {
  const list = filterProducts(category.id, kind);
  if (list.length === 0) return null;

  const Icon = CATEGORY_ICONS[category.id];
  const title = kind === "ready" ? category.readyTitle : category.customTitle;
  const countLabel = kind === "ready" ? `${list.length} готовых` : `${list.length} на заказ`;

  return (
    <Link
      to="/catalog"
      search={{ cat: category.id, kind }}
      className="lift group flex flex-col border border-border bg-surface p-6"
    >
      <Icon className="size-5 text-fg" />
      <h3 className="mt-5 font-display text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted">{category.blurb}</p>
      <p className="mt-6 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted">
          {countLabel} · от {formatRub(minPriceOf(list))}
        </span>
        <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
}

export function CategoryGrid({ kind }: { kind: ProductKind }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CATEGORIES.map((category) => (
        <CategoryCard key={`${kind}-${category.id}`} category={category} kind={kind} />
      ))}
    </div>
  );
}
