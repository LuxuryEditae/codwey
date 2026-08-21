import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { QuizBotDemo } from "@/components/demos/quiz-bot";
import { ShopBotDemo } from "@/components/demos/shop-bot";
import { TicketBotDemo } from "@/components/demos/ticket-bot";
import { PriceTag } from "@/components/price-tag";
import { ProductCover } from "@/components/product-cover";
import { Button } from "@/components/ui/button";
import { CATEGORIES, PRODUCTS, getProduct, type Product } from "@/data/catalog";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/catalog/$slug")({
  component: ProductPage,
});

function BuyBox({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  return (
    <>
      <PriceTag product={product} />
      <div className="mt-4 flex flex-col gap-2">
        {product.kind === "ready" ? (
          <Button
            size="lg"
            onClick={() => {
              add(product.slug);
              toast("В корзине", { description: product.name });
            }}
          >
            <ShoppingBag />
            В корзину
          </Button>
        ) : null}
        <Button asChild size="lg" variant={product.kind === "ready" ? "secondary" : "primary"}>
          <Link to="/chat" search={{ product: product.slug }}>
            <MessageSquare />
            {product.kind === "custom" ? "Собрать смету" : "Обсудить с Вей"}
          </Link>
        </Button>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-subtle">
        Готовое отдаём после оплаты. Кастом — по смете из чата. Цены ниже рынка намеренно.
      </p>
    </>
  );
}

function ProductPage() {
  const { slug } = Route.useParams();
  const product = getProduct(slug);

  if (!product) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="font-display text-3xl font-semibold">Нет такого продукта</h1>
        <Link to="/catalog" className="mt-4 inline-block text-accent">
          В каталог
        </Link>
      </main>
    );
  }

  const related = PRODUCTS.filter(
    (p) => p.category === product.category && p.slug !== product.slug,
  ).slice(0, 3);
  const category = CATEGORIES.find((c) => c.id === product.category);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="text-sm text-muted">
        <Link to="/catalog" className="hover:text-fg">
          Каталог
        </Link>
        <span className="px-2 text-subtle">/</span>
        <Link to="/catalog" search={{ cat: product.category }} className="hover:text-fg">
          {category?.label}
        </Link>
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <ProductCover product={product} className="aspect-[16/9]" />
          <h1 className="mt-6 font-display text-4xl font-medium">{product.name}</h1>
          <p className="mt-3 text-lg text-muted">{product.tagline}</p>
          <div className="mt-6 lg:hidden">
            <BuyBox product={product} />
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            {product.longDescription}
          </p>

          <h2 className="mt-10 font-display text-2xl font-medium italic">Что входит</h2>
          <ul className="mt-4 space-y-2 text-sm text-fg">
            {product.features.map((f) => (
              <li key={f} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="border border-border bg-surface p-4">
              <p className="font-mono text-xs text-subtle">Стек</p>
              <p className="mt-2 text-sm">{product.stack.join(" · ")}</p>
            </div>
            <div className="border border-border bg-surface p-4">
              <p className="font-mono text-xs text-subtle">Отдаём</p>
              <p className="mt-2 text-sm">{product.includes.join(" · ")}</p>
            </div>
          </div>

          {product.demo ? (
            <div className="mt-10">
              <h2 className="font-display text-2xl font-medium italic">Живое демо</h2>
              <p className="mt-2 text-sm text-muted">Упрощённый сценарий — как это выглядит у клиента.</p>
              <div className="mt-5">
                {product.demo === "shop-bot" ? <ShopBotDemo /> : null}
                {product.demo === "ticket-bot" ? <TicketBotDemo /> : null}
                {product.demo === "quiz-bot" ? <QuizBotDemo /> : null}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <BuyBox product={product} />
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-medium italic">Рядом в категории</h2>
          <div className="mt-5 grid gap-px bg-border sm:grid-cols-3">
            {related.map((p) => (
              <Link
                key={p.slug}
                to="/catalog/$slug"
                params={{ slug: p.slug }}
                className="bg-bg p-4 hover:bg-surface"
              >
                <p className="font-display font-medium">{p.name}</p>
                <p className="mt-1 text-sm text-muted">{p.tagline}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
