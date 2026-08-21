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

export type LeadDraft = {
  category: string;
  contact: string;
  description: string;
  amount?: number;
  timeline?: string;
};

export type ManagerSuccess = {
  ok: true;
  message: string;
  questions: string[];
  quote: Quote | null;
  submit?: boolean;
  lead?: LeadDraft | null;
  ticketId?: string | null;
};

export type ManagerFailure = {
  ok: false;
  error: string;
};

export type ManagerReply = ManagerSuccess | ManagerFailure;

export type ChatImage = {
  mime: string;
  data: string;
};
