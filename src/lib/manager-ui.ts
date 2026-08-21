import { create } from "zustand";
import { useChat } from "@/lib/chat-store";
import { newSession } from "@/lib/session";

const PENDING_KEY = "codwey-pending-order";

type Pending = { seed: string | null; context: string | null };

function readPending(): Pending {
  if (typeof sessionStorage === "undefined") return { seed: null, context: null };
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return { seed: null, context: null };
    const parsed = JSON.parse(raw) as Pending;
    return { seed: parsed.seed || null, context: parsed.context || null };
  } catch {
    return { seed: null, context: null };
  }
}

function writePending(seed: string | null, context: string | null) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!seed) sessionStorage.removeItem(PENDING_KEY);
    else sessionStorage.setItem(PENDING_KEY, JSON.stringify({ seed, context }));
  } catch {
    /* ignore */
  }
}

type ManagerUi = {
  open: boolean;
  arrow: boolean;
  seed: string | null;
  context: string | null;
  setOpen: (open: boolean) => void;
  queueOrder: (seed: string, context?: string) => void;
  takeOrder: () => Pending;
  dismissArrow: () => void;
};

export const useManagerUi = create<ManagerUi>((set, get) => ({
  open: false,
  arrow: false,
  seed: null,
  context: null,
  setOpen: (open) =>
    set({
      open,
      arrow: open ? false : get().arrow,
    }),
  queueOrder: (seed, context) => {
    useChat.getState().reset();
    newSession();
    writePending(seed, context ?? null);
    set({
      open: false,
      arrow: true,
      seed,
      context: context ?? null,
    });
  },
  takeOrder: () => {
    const mem = get();
    const stored = readPending();
    const seed = mem.seed || stored.seed;
    const context = mem.context || stored.context;
    writePending(null, null);
    set({ seed: null, context: null });
    return { seed, context };
  },
  dismissArrow: () => set({ arrow: false }),
}));
