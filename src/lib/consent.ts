import { create } from "zustand";

type ConsentState = {
  agreed: boolean;
  setAgreed: (agreed: boolean) => void;
};

export const useConsent = create<ConsentState>()((set) => ({
  agreed: false,
  setAgreed: (agreed) => set({ agreed }),
}));
