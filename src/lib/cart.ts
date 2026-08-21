import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getProduct, type Product } from "@/data/catalog";

export type CartLine = {
  slug: string;
  qty: number;
};

type CartState = {
  lines: CartLine[];
  add: (slug: string) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (slug) => {
        const lines = get().lines;
        const existing = lines.find((l) => l.slug === slug);
        if (existing) {
          set({
            lines: lines.map((l) =>
              l.slug === slug ? { ...l, qty: l.qty + 1 } : l,
            ),
          });
          return;
        }
        set({ lines: [...lines, { slug, qty: 1 }] });
      },
      remove: (slug) =>
        set({ lines: get().lines.filter((l) => l.slug !== slug) }),
      setQty: (slug, qty) => {
        if (qty <= 0) {
          set({ lines: get().lines.filter((l) => l.slug !== slug) });
          return;
        }
        set({
          lines: get().lines.map((l) => (l.slug === slug ? { ...l, qty } : l)),
        });
      },
      clear: () => set({ lines: [] }),
    }),
    { name: "codwey-cart" },
  ),
);

export function cartCount(lines: CartLine[]) {
  return lines.reduce((n, l) => n + l.qty, 0);
}

export function resolveCart(lines: CartLine[]) {
  const items: { product: Product; qty: number; line: number }[] = [];
  for (const line of lines) {
    const product = getProduct(line.slug);
    if (!product) continue;
    items.push({ product, qty: line.qty, line: product.price * line.qty });
  }
  const total = items.reduce((n, i) => n + i.line, 0);
  return { items, total };
}
