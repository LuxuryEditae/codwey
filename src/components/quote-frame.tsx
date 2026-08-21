import type { Quote } from "@/lib/ai/types";
import { formatRub } from "@/lib/utils";

export function QuoteFrame({ quote }: { quote: Quote }) {
  return (
    <figure className="relative my-3 border border-accent bg-surface px-4 py-4 sm:px-5">
      <Corner className="left-1 top-1" />
      <Corner className="right-1 top-1 rotate-90" />
      <Corner className="bottom-1 left-1 -rotate-90" />
      <Corner className="bottom-1 right-1 rotate-180" />

      <figcaption className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs tracking-wide text-muted">Смета</span>
        <span className="font-mono text-xs text-muted">{quote.timeline}</span>
      </figcaption>
      <h3 className="mt-2 font-display text-lg font-medium leading-snug">{quote.title}</h3>
      <ul className="mt-4 space-y-2.5">
        {quote.items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex items-start justify-between gap-4 text-sm">
            <span>
              <span>{item.name}</span>
              {item.detail ? (
                <span className="mt-0.5 block text-xs text-muted">{item.detail}</span>
              ) : null}
            </span>
            <span className="shrink-0 tabular-nums">{formatRub(item.price)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 h-px bg-border" />
      <p className="mt-3 flex items-baseline justify-between gap-4">
        <span className="font-mono text-xs text-muted">Итого</span>
        <span className="font-display text-2xl font-medium tabular-nums">{formatRub(quote.total)}</span>
      </p>
      {quote.notes ? <p className="mt-3 text-xs leading-relaxed text-muted">{quote.notes}</p> : null}
    </figure>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <span className={`pointer-events-none absolute size-2.5 border-t border-l border-accent ${className}`} />
  );
}
