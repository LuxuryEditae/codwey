import { createFileRoute } from "@tanstack/react-router";
import { ChatPanel } from "@/components/chat-panel";
import { getProduct } from "@/data/catalog";

type ChatSearch = { product?: string; intent?: string };

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>): ChatSearch => ({
    product: typeof search.product === "string" ? search.product : undefined,
    intent: typeof search.intent === "string" ? search.intent : undefined,
  }),
  component: ChatPage,
});

function ChatPage() {
  const { product: slug, intent } = Route.useSearch();
  const product = slug ? getProduct(slug) : undefined;

  let seed: string | undefined;
  let context: string | undefined;
  if (product) {
    context = `Клиент открыл продукт ${product.name} (${product.slug}, ${product.kind}, ${product.price} ₽, ${product.category}).`;
    seed =
      product.kind === "custom"
        ? `Хочу заказать: ${product.name}. ${product.tagline}. Посчитай, но сначала уточни, если мало данных.`
        : `Интересует готовый продукт ${product.name} за ${product.price} ₽. Расскажи, что входит, и как оформить.`;
  } else if (intent) {
    seed = intent;
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <ChatPanel seed={seed} context={context} />
    </main>
  );
}
