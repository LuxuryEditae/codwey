import { create } from "zustand";

type ManagerUi = {
  open: boolean;
  arrow: boolean;
  seed: string | null;
  setOpen: (open: boolean) => void;
  showArrow: (seed?: string) => void;
  consumeSeed: () => string | null;
  dismissArrow: () => void;
};

export const useManagerUi = create<ManagerUi>((set, get) => ({
  open: false,
  arrow: false,
  seed: null,
  setOpen: (open) => set({ open, arrow: open ? get().arrow : false }),
  showArrow: (seed) => set({ open: true, arrow: true, seed: seed ?? get().seed }),
  consumeSeed: () => {
    const seed = get().seed;
    set({ seed: null });
    return seed;
  },
  dismissArrow: () => set({ arrow: false }),
}));
