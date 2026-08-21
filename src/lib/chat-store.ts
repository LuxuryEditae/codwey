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
  push: (msg: Omit<ChatMessage, "id"> & { id?: string }) => string;
  reset: () => void;
};

export const useChat = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      push: (msg) => {
        const id = msg.id ?? crypto.randomUUID();
        set({ messages: [...get().messages, { ...msg, id }] });
        return id;
      },
      reset: () => set({ messages: [] }),
    }),
    { name: "codwey-chat" },
  ),
);
