import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, MessageSquare, PenLine, X } from "lucide-react";
import { useEffect } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { ContinueArrow } from "@/components/continue-arrow";
import { useManagerUi } from "@/lib/manager-ui";
import { cn } from "@/lib/utils";

export function AppDock() {
  const open = useManagerUi((s) => s.open);
  const arrow = useManagerUi((s) => s.arrow);
  const setOpen = useManagerUi((s) => s.setOpen);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  const homeActive = pathname === "/" && !open;
  const orderActive = pathname === "/order" && !open;

  function go(to: "/") {
    setOpen(false);
    void navigate({ to });
  }

  return (
    <>
      {open ? (
        <div
          className={cn(
            "dock-enter fixed inset-x-0 top-0 z-40 flex flex-col overflow-hidden border-border bg-surface",
            "md:inset-auto md:bottom-24 md:right-4 md:top-auto md:h-[min(36rem,calc(100svh-7rem))] md:w-96 md:border",
          )}
          style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2">
            <ChatPanel />
          </div>
        </div>
      ) : null}

      <ContinueArrow />

      {!arrow ? (
        <nav className="fixed inset-x-0 bottom-0 z-[200] border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] md:hidden">
          <div className="grid h-14 grid-cols-3">
            <button
              type="button"
              onClick={() => go("/")}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs",
                homeActive ? "text-fg" : "text-muted",
              )}
            >
              <Home className="size-5" />
              Главная
            </button>
            <Link
              to="/order"
              onClick={() => setOpen(false)}
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
              onClick={() => setOpen(!open)}
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
      ) : null}

      {!arrow && !open ? (
        <div className="fixed bottom-5 right-4 z-50 hidden md:block">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="fab-pulse relative grid size-14 place-items-center rounded-full bg-accent text-accent-fg transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
            aria-label="Открыть чат с менеджером"
          >
            <MessageSquare className="size-5" />
          </button>
        </div>
      ) : null}
    </>
  );
}
