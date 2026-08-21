import { ArrowDown } from "lucide-react";
import { useManagerUi } from "@/lib/manager-ui";

export function ContinueArrow() {
  const arrow = useManagerUi((s) => s.arrow);
  const open = useManagerUi((s) => s.open);
  const setOpen = useManagerUi((s) => s.setOpen);
  const dismiss = useManagerUi((s) => s.dismissArrow);
  if (!arrow || open) return null;

  function go() {
    dismiss();
    setOpen(true);
  }

  return (
    <button
      type="button"
      onClick={go}
      className="fixed inset-0 z-[90] flex h-[100svh] w-full flex-col items-center justify-center bg-bg px-6 text-fg"
      aria-label="Открыть менеджера"
    >
      <p className="font-display text-center text-4xl font-semibold tracking-tight sm:text-6xl">
        Продолжите здесь
      </p>
      <p className="mt-4 max-w-md text-center text-base text-muted sm:text-lg">
        Нажмите — заявка уйдёт менеджеру. Он расспросит детали и посчитает смету.
      </p>
      <ArrowDown className="mt-10 size-28 animate-bounce sm:size-36" />
      <span className="mt-8 rounded-md bg-accent px-8 py-4 text-base font-medium text-accent-fg">
        Открыть менеджера
      </span>
    </button>
  );
}
