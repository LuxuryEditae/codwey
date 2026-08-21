import { ArrowDown } from "lucide-react";
import { useManagerUi } from "@/lib/manager-ui";

export function ContinueArrow() {
  const arrow = useManagerUi((s) => s.arrow);
  const dismiss = useManagerUi((s) => s.dismissArrow);
  if (!arrow) return null;

  return (
    <button
      type="button"
      onClick={dismiss}
      className="pointer-events-auto fixed z-[60] flex flex-col items-center gap-2 text-fg md:bottom-24 md:right-4"
      style={{ bottom: "5.5rem", right: "1rem" }}
    >
      <span className="max-w-[11rem] rounded-md bg-accent px-3 py-2 text-left text-xs font-medium text-accent-fg">
        Продолжите здесь — менеджер уточнит заявку
      </span>
      <ArrowDown className="size-8 animate-bounce" />
    </button>
  );
}
