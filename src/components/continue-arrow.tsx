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
      className="fixed inset-0 z-[70] flex h-[100svh] w-full flex-col items-center justify-center bg-bg/95 px-6 text-fg"
      aria-label="Открыть менеджера"
    >
      <p className="font-display text-center text-4xl font-semibold tracking-tight sm:text-6xl">
        Продолжите здесь
      </p>
      <p className="mt-4 max-w-md text-center text-base text-muted sm:text-lg">
        Заявка ушла менеджеру. Нажмите, чтобы открыть чат.
      </p>
      <ArrowDown className="mt-10 size-24 animate-bounce sm:size-32" />
      <span className="mt-8 rounded-md bg-accent px-6 py-3 text-sm font-medium text-accent-fg">
        Открыть менеджера
      </span>
      <span className="pointer-events-none absolute bottom-20 right-4 hidden md:block">
        <ArrowDown className="size-20 animate-bounce" />
      </span>
      <span className="pointer-events-none absolute bottom-16 right-[12%] md:hidden">
        <ArrowDown className="size-16 animate-bounce" />
      </span>
    </button>
  );
}
