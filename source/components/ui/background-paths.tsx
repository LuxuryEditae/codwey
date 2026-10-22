"use client";

import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PATH_COUNT = 28;

function buildPaths(position: number) {
  return Array.from({ length: PATH_COUNT }, (_, i) => ({
    id: `${position}-${i}`,
    d: `M${-380 - i * 5 * position} ${-189 + i * 6}C${-380 - i * 5 * position} ${-189 + i * 6} ${-312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
    opacity: 0.06 + i * 0.006,
  }));
}

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
};

export function BackgroundPaths({
  title = "Background Paths",
  description = "Telegram-боты, Mini Apps и автоматизация. Продумываем, разрабатываем и запускаем цифровые продукты для вашего бизнеса.",
  ctaLabel = "Обсудить проект",
  ctaHref = "#calculator",
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
              <Button asChild variant="ghost" className="paths-button">
                <a href={ctaHref}>
                  <span>{ctaLabel}</span>
                  <ArrowUpRight size={19} />
                </a>
              </Button>
            </div>
            <a href="#work" className="paths-secondary">
              Наши проекты <ArrowDown size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
