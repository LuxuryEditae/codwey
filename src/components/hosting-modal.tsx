import { useEffect, useState } from "react";
import { HOSTING_NOTE } from "@/lib/legal";
import { Button } from "@/components/ui/button";

const KEY = "codwey-hosting-ok";

export function needsHostingAck(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(KEY) !== "1";
}

export function HostingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    setReady(false);
    const t = window.setTimeout(() => setReady(true), 3000);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-bg/80 p-4">
      <div className="w-full max-w-md border border-border bg-surface p-6">
        <p className="font-mono text-xs text-muted">важно</p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Хостинг на вас</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">{HOSTING_NOTE}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Мы отдаём исходники и инструкцию. Домен, VPS, SSL, токены Telegram / Roblox — ваши.
        </p>
        <Button
          className="mt-6 w-full"
          size="lg"
          disabled={!ready}
          onClick={() => {
            localStorage.setItem(KEY, "1");
            onClose();
          }}
        >
          {ready ? "Понял, хостинг на мне" : "Подождите 3 секунды…"}
        </Button>
      </div>
    </div>
  );
}
