import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Quote } from "@/lib/ai/types";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  questions?: string[];
  quote?: Quote | null;
  image?: string;
  submitted?: boolean;
};

type ChatState = {
  messages: ChatMessage[];
  busy: boolean;
  fail: string | null;
  epoch: number;
  push: (msg: Omit<ChatMessage, "id"> & { id?: string }) => string;
  reset: () => void;
  setBusy: (busy: boolean) => void;
  setFail: (fail: string | null) => void;
};

export const useChat = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      busy: false,
      fail: null,
      epoch: 0,
      push: (msg) => {
        const id = msg.id ?? crypto.randomUUID();
        set({ messages: [...get().messages, { ...msg, id }] });
        return id;
      },
      reset: () => set({ messages: [], busy: false, fail: null, epoch: get().epoch + 1 }),
      setBusy: (busy) => set({ busy }),
      setFail: (fail) => set({ fail }),
    }),
    { name: "codwey-chat", partialize: (s) => ({ messages: s.messages }) },
  ),
);
