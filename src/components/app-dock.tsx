import { Link, useRouterState, useSearch } from "@tanstack/react-router";
import { MessageSquare, Package, PenLine, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { cn } from "@/lib/utils";

export function AppDock() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useSearch({ strict: false }) as { kind?: string; cat?: string };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const readyActive = pathname.startsWith("/catalog") && search.kind === "ready" && !search.cat;
  const orderActive = pathname === "/order";

  return (
    <>
      {open ? (
        <div
          className={cn(
            "dock-enter fixed z-50 flex flex-col overflow-hidden border border-border bg-surface",
            "inset-x-3 bottom-20 top-16 md:inset-auto md:bottom-24 md:right-4 md:top-auto md:h-[min(72vh,36rem)] md:w-96",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
            <ChatPanel />
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid h-14 grid-cols-3">
          <Link
            to="/catalog"
            search={{ kind: "ready" }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs",
              readyActive ? "text-fg" : "text-muted",
            )}
          >
            <Package className="size-5" />
            Готовое
          </Link>
          <Link
            to="/order"
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs",
              orderActive ? "text-fg" : "text-muted",
            )}
          >
            <PenLine className="size-5" />
            На заказ
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-xs",
              open ? "text-fg" : "text-muted",
            )}
            aria-label={open ? "Закрыть чат с менеджером" : "Открыть чат с менеджером"}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <MessageSquare className="size-5" />}
            Менеджер
          </button>
        </div>
      </nav>

      <div className="fixed bottom-5 right-4 z-50 hidden md:block">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="fab-pulse relative grid size-14 place-items-center rounded-full bg-accent text-accent-fg transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
          aria-label={open ? "Закрыть чат с менеджером" : "Открыть чат с менеджером"}
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <MessageSquare className="size-6" />}
        </button>
      </div>
    </>
  );
}
