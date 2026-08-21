import type { Product } from "@/data/catalog";
import { cn } from "@/lib/utils";

function hashSlug(slug: string) {
  let n = 0;
  for (let i = 0; i < slug.length; i++) n = (n * 33 + slug.charCodeAt(i)) >>> 0;
  return n;
}

export function ProductCover({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const h = hashSlug(product.slug);
  const shift = (h % 40) - 20;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-elevated",
        className,
      )}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(80% 70% at ${50 + shift}% 20%, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 60%)`,
        }}
      />
      <svg viewBox="0 0 320 200" className="relative z-10 h-full w-full">
        {product.category === "bots" ? <BotArt seed={h} /> : null}
        {product.category === "sites" ? <SiteArt seed={h} /> : null}
        {product.category === "apps" ? <AppArt seed={h} /> : null}
        {product.category === "roblox" ? <RobloxArt seed={h} /> : null}
        {product.category === "other" ? <OtherArt seed={h} /> : null}
      </svg>
      {product.kind === "custom" ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-bg/80 px-2.5 py-1 text-[11px] font-medium tracking-wide text-accent">
          на заказ
        </span>
      ) : null}
    </div>
  );
}

function BotArt({ seed }: { seed: number }) {
  const y = 48 + (seed % 12);
  return (
    <g fill="none" stroke="currentColor">
      <rect x="54" y="28" width="212" height="148" rx="22" className="text-border" strokeWidth="1.4" />
      <rect x="70" y="44" width="120" height="22" rx="11" className="text-accent" fill="currentColor" opacity="0.85" stroke="none" />
      <rect x="130" y={y + 28} width="120" height="22" rx="11" className="text-muted" fill="currentColor" opacity="0.25" stroke="none" />
      <rect x="70" y={y + 58} width="150" height="22" rx="11" className="text-fg" fill="currentColor" opacity="0.12" stroke="none" />
      <circle cx="246" cy="156" r="10" className="text-accent" fill="currentColor" stroke="none" />
    </g>
  );
}

function SiteArt({ seed }: { seed: number }) {
  const cols = 3 + (seed % 2);
  return (
    <g fill="none">
      <rect x="36" y="34" width="248" height="140" rx="10" className="text-border" stroke="currentColor" strokeWidth="1.4" />
      <rect x="36" y="34" width="248" height="18" rx="10" className="text-elevated" fill="currentColor" />
      <circle cx="50" cy="43" r="3" className="text-muted" fill="currentColor" />
      <circle cx="62" cy="43" r="3" className="text-muted" fill="currentColor" />
      <rect x="48" y="64" width="100" height="10" rx="3" className="text-fg" fill="currentColor" opacity="0.7" />
      <rect x="48" y="80" width="70" height="6" rx="3" className="text-muted" fill="currentColor" opacity="0.4" />
      {Array.from({ length: cols }).map((_, i) => (
        <rect
          key={i}
          x={48 + i * 78}
          y="100"
          width="70"
          height="52"
          rx="8"
          className="text-accent"
          fill="currentColor"
          opacity={0.18 + ((seed + i) % 3) * 0.1}
        />
      ))}
    </g>
  );
}

function AppArt({ seed }: { seed: number }) {
  return (
    <g fill="none">
      <rect x="110" y="18" width="100" height="168" rx="18" className="text-border" stroke="currentColor" strokeWidth="1.5" />
      <rect x="118" y="36" width="84" height="132" rx="8" className="text-bg" fill="currentColor" />
      <rect x="126" y="46" width="50" height="8" rx="3" className="text-fg" fill="currentColor" opacity="0.7" />
      <rect x="126" y="62" width="68" height="28" rx="6" className="text-accent" fill="currentColor" opacity="0.8" />
      <rect x="126" y="98" width="68" height="10" rx="3" className="text-muted" fill="currentColor" opacity="0.35" />
      <rect x="126" y="114" width="44" height="10" rx="3" className="text-muted" fill="currentColor" opacity="0.25" />
      <rect x="148" y="170" width="24" height="4" rx="2" className="text-subtle" fill="currentColor" />
      <circle cx="210" cy="30" r={4 + (seed % 3)} className="text-accent" fill="currentColor" opacity="0.5" />
    </g>
  );
}

function RobloxArt({ seed }: { seed: number }) {
  const offset = seed % 16;
  return (
    <g>
      <rect x={70 + offset} y="110" width="44" height="44" rx="4" className="text-accent" fill="currentColor" opacity="0.85" />
      <rect x={108 + offset} y="78" width="44" height="76" rx="4" className="text-fg" fill="currentColor" opacity="0.18" />
      <rect x={146 + offset} y="50" width="44" height="104" rx="4" className="text-accent" fill="currentColor" opacity="0.45" />
      <rect x={184 + offset} y="90" width="44" height="64" rx="4" className="text-fg" fill="currentColor" opacity="0.28" />
      <rect x="40" y="154" width="240" height="8" rx="2" className="text-border" fill="currentColor" />
    </g>
  );
}

function OtherArt({ seed }: { seed: number }) {
  return (
    <g fill="none" stroke="currentColor" className="text-accent" strokeWidth="1.6">
      <path d={`M48 140 L110 ${60 + (seed % 20)} L170 120 L250 48`} />
      <circle cx="110" cy={60 + (seed % 20)} r="5" fill="currentColor" stroke="none" />
      <circle cx="170" cy="120" r="5" fill="currentColor" stroke="none" className="text-fg" />
      <circle cx="250" cy="48" r="5" fill="currentColor" stroke="none" />
      <rect x="48" y="148" width="224" height="1.5" className="text-border" fill="currentColor" stroke="none" />
    </g>
  );
}
