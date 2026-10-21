"use client";

import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PATH_COUNT = 34;

function buildPaths(position: number) {
  return Array.from({ length: PATH_COUNT }, (_, i) => ({
    id: `${position}-${i}`,
    d: `M${-380 - i * 5 * position} ${-189 + i * 6}C${-380 - i * 5 * position} ${-189 + i * 6} ${-312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
    opacity: 0.1 + i * 0.009,
  }));
}

/**
 * The path field is rendered as static SVG geometry on purpose.
 *
 * Earlier revisions animated `pathLength`/`pathOffset` through framer-motion
 * while the layer also carried a CSS `mask-image`. On Chromium/Electron that
 * combination invalidated the hero paint surface and the headline could
 * disappear entirely for roughly half of the frames. Static geometry keeps
 * the hero cheap to paint and guarantees the title is always visible.
 */
function FloatingPaths({ position }: { position: number }) {
  const paths = buildPaths(position);
  return (
    <div className="paths-layer" aria-hidden="true">
      <svg
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        {paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
          />
        ))}
      </svg>
    </div>
  );
}

type BackgroundPathsProps = {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  facts?: string[];
};

export function BackgroundPaths({
  title = "Background Paths",
  description = "Telegram-боты, Mini Apps и автоматизация. Продумываем, разрабатываем и запускаем цифровые продукты для вашего бизнеса.",
  ctaLabel = "Обсудить вашу идею",
  ctaHref = "#calculator",
  facts = [],
}: BackgroundPathsProps) {
  return (
    <section
      className="paths-hero relative w-full flex items-center justify-center overflow-hidden"
      aria-labelledby="hero-title"
    >
      <div className="paths-canvas">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
      <div className="paths-glow" aria-hidden="true" />
      <div className="paths-vignette" aria-hidden="true" />
      <div className="relative z-10 paths-content text-center">
        <div>
          <div className="paths-kicker">
            <span className="status-dot" /> Независимая digital-студия{" "}
            <span className="kicker-separator">/</span> CodWay
          </div>
          <h1 id="hero-title" aria-label={title.replace(/\n/g, " ")}>
            {title.split("\n").map((line, lineIndex) => (
              <span className="paths-title-line" key={lineIndex}>
                {line}
              </span>
            ))}
          </h1>
          <p className="paths-description">{description}</p>
          <div className="paths-actions">
            <div className="paths-button-wrap">
              <Button
                asChild
                variant="ghost"
                className="paths-button"
              >
                <a href={ctaHref}>
                  <span>{ctaLabel}</span>
                  <ArrowUpRight size={19} />
                </a>
              </Button>
            </div>
            <a href="#work" className="paths-secondary">
              Посмотреть демо <ArrowDown size={16} />
            </a>
          </div>
          <div className="paths-caption">
            <span>Ваш продукт. Ваш исходный код.</span>
            <span className="caption-dot" />
            <span>От идеи до запуска</span>
          </div>
          {facts.length > 0 && (
            <ul className="paths-facts">
              {facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="paths-bottom">
        <span>DEVELOPMENT, WITH INTENTION.</span>
        <a href="#services">
          Листайте, чтобы узнать больше <ArrowDown size={13} />
        </a>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </section>
  );
}
