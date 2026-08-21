import { create } from "zustand";

type ManagerUi = {
  open: boolean;
  arrow: boolean;
  seed: string | null;
  context: string | null;
  setOpen: (open: boolean) => void;
  queueOrder: (seed: string, context?: string) => void;
  consumeSeed: () => { seed: string | null; context: string | null };
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
  queueOrder: (seed, context) =>
    set({
      open: false,
      arrow: true,
      seed,
      context: context ?? get().context,
    }),
  consumeSeed: () => {
    const { seed, context } = get();
    set({ seed: null, context: null });
    return { seed, context };
  },
  dismissArrow: () => set({ arrow: false }),
}));
