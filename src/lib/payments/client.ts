import { getProduct } from "@/data/catalog";
import { getPaymentMethod, type PaymentMethodId } from "@/lib/payments/methods";

type Payload = {
  items: { slug: string; qty: number }[];
  method: PaymentMethodId;
  contact: string;
};

export async function createPayment({ data }: { data: Payload }) {
  const method = getPaymentMethod(data.method);
  if (!method) return { ok: false as const, error: "Выберите способ оплаты" };
  const contact = data.contact.trim().slice(0, 120);
  if (!contact) return { ok: false as const, error: "Укажите Telegram или почту" };

  const resolved: { slug: string; name: string; qty: number; line: number }[] = [];
  for (const row of data.items.slice(0, 20)) {
    const qty = Math.floor(Number(row.qty));
    if (!Number.isFinite(qty) || qty < 1) continue;
    const product = getProduct(row.slug);
    if (!product || product.kind !== "ready") continue;
    resolved.push({
      slug: product.slug,
      name: product.name,
      qty,
      line: product.price * qty,
    });
  }
  if (resolved.length === 0) {
    return { ok: false as const, error: "В корзине нет готовых позиций" };
  }
  const amount = resolved.reduce((n, i) => n + i.line, 0);
  return {
    ok: true as const,
    mode: "stub" as const,
    transactionId: crypto.randomUUID(),
    amount,
    method: method.id,
    description: resolved.map((i) => `${i.name} ×${i.qty}`).join(", "),
    contact,
    items: resolved,
  };
}
