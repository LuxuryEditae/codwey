import { create } from "zustand";
import { persist } from "zustand/middleware";

type ConsentState = {
  agreed: boolean;
  setAgreed: (agreed: boolean) => void;
};

export const useConsent = create<ConsentState>()(
  persist(
    (set) => ({
      agreed: false,
      setAgreed: (agreed) => set({ agreed }),
    }),
    { name: "codwey-consent" },
  ),
);
