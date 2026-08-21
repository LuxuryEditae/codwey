import { createServerFn } from "@tanstack/react-start";
import { getProduct } from "@/data/catalog";
import { getPaymentMethod, type PaymentMethodId } from "@/lib/payments/methods";

type ItemIn = { slug: string; qty: number };

type Payload = {
  items: ItemIn[];
  method: PaymentMethodId;
  contact: string;
};

export type CreatePaymentResult =
  | {
      ok: true;
      mode: "stub" | "live";
      transactionId: string;
      amount: number;
      method: PaymentMethodId;
      description: string;
      contact: string;
      items: { slug: string; name: string; qty: number; line: number }[];
      redirect?: string;
    }
  | { ok: false; error: string };

const PLATEGA_URL = "https://app.platega.io/transaction/process";

function siteOrigin() {
  return (process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? "https://codwey.su").replace(/\/$/, "");
}

export const createPayment = createServerFn({ method: "POST" })
  .validator((input: Payload) => input)
  .handler(async ({ data }): Promise<CreatePaymentResult> => {
    const method = getPaymentMethod(data.method);
    if (!method) return { ok: false, error: "Выберите способ оплаты" };

    const contact = data.contact.trim().slice(0, 120);
    if (!contact) return { ok: false, error: "Укажите Telegram или почту" };

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
      return { ok: false, error: "В корзине нет готовых позиций" };
    }

    const amount = resolved.reduce((n, i) => n + i.line, 0);
    const description = resolved.map((i) => `${i.name} ×${i.qty}`).join(", ");
    const origin = siteOrigin();
    const merchantId = process.env.PLATEGA_MERCHANT_ID?.trim();
    const secret = process.env.PLATEGA_SECRET?.trim();

    if (!merchantId || !secret) {
      return {
        ok: true,
        mode: "stub",
        transactionId: crypto.randomUUID(),
        amount,
        method: method.id,
        description,
        contact,
        items: resolved,
      };
    }

    try {
      const res = await fetch(PLATEGA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MerchantId": merchantId,
          "X-Secret": secret,
        },
        body: JSON.stringify({
          paymentMethod: method.id,
          paymentDetails: { amount, currency: "RUB" },
          description: `Codwey: ${description}`.slice(0, 240),
          return: `${origin}/pay/success`,
          failedUrl: `${origin}/pay/fail`,
          payload: contact,
        }),
      });

      const raw = (await res.json()) as {
        transactionId?: string;
        redirect?: string;
        status?: string;
        message?: string;
        error?: string;
      };

      if (!res.ok || !raw.redirect || !raw.transactionId) {
        return {
          ok: false,
          error: raw.message || raw.error || `Platega ответила ${res.status}`,
        };
      }

      return {
        ok: true,
        mode: "live",
        transactionId: raw.transactionId,
        amount,
        method: method.id,
        description,
        contact,
        items: resolved,
        redirect: raw.redirect,
      };
    } catch {
      return { ok: false, error: "Не удалось связаться с Platega" };
    }
  });
