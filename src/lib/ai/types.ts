export type QuoteItem = {
  name: string;
  detail?: string;
  price: number;
};

export type Quote = {
  title: string;
  items: QuoteItem[];
  total: number;
  timeline: string;
  notes?: string;
};

export type ManagerSuccess = {
  ok: true;
  message: string;
  questions: string[];
  quote: Quote | null;
};

export type ManagerFailure = {
  ok: false;
  error: string;
};

export type ManagerReply = ManagerSuccess | ManagerFailure;
