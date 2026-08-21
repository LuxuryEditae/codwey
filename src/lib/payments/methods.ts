export type PaymentMethodId = 2 | 11 | 12 | 13 | 14;

export type PaymentMethod = {
  id: PaymentMethodId;
  code: string;
  label: string;
  hint: string;
};

/** Platega PaymentMethodInt — https://docs.platega.io */
export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 2, code: "SBPQR", label: "СБП", hint: "QR или ссылка в приложении банка" },
  { id: 11, code: "CARD", label: "Карта", hint: "Мир, Visa, Mastercard" },
  { id: 14, code: "SBERPAY", label: "SberPay", hint: "Оплата через Сбер" },
  { id: 13, code: "CRYPTO", label: "Крипта", hint: "USDT и другие" },
  { id: 12, code: "INTL", label: "Международная", hint: "Карты из-за рубежа" },
];

export function getPaymentMethod(id: number) {
  return PAYMENT_METHODS.find((m) => m.id === id);
}

export const PAYMENT_SNAPSHOT_KEY = "codwey-payment";

export type PaymentSnapshot = {
  transactionId: string;
  method: PaymentMethodId;
  amount: number;
  description: string;
  contact: string;
  items: { slug: string; name: string; qty: number; line: number }[];
  mode: "stub" | "live";
};
