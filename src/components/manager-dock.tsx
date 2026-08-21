import { MessageSquare, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChatPanel } from "@/components/chat-panel";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

export function ManagerDock() {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-5 left-4 z-50 flex flex-col items-start gap-3">
      {open ? (
        <div className="dock-enter pointer-events-auto flex h-[min(72vh,36rem)] w-[min(calc(100vw-2rem),24rem)] flex-col overflow-hidden border border-border bg-surface">
          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
            <ChatPanel />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fab-pulse pointer-events-auto relative grid size-14 place-items-center rounded-full bg-accent text-accent-fg transition-transform duration-150 ease-out hover:scale-105 active:scale-95",
        )}
        aria-label={open ? "Закрыть чат с оператором" : "Открыть чат с оператором"}
        aria-expanded={open}
      >
        {open ? <X className="size-6" /> : <MessageSquare className="size-6" />}
      </button>
    </div>,
    document.body,
  );
}
