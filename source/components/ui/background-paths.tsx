"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function FloatingPaths({ position }: { position: number }) {
  const reduceMotion = useReducedMotion();
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));
  return (
    <div
      className="absolute inset-0 pointer-events-none paths-layer"
      aria-hidden="true"
    >
      <svg
        className="w-full h-full text-slate-950 dark:text-white"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <path key={`base-${path.id}`} d={path.d} stroke="currentColor" strokeWidth={path.width} strokeOpacity={0.12 + path.id * 0.008} />
        ))}
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.018}
            initial={{ pathLength: reduceMotion ? 1 : 0.3, opacity: 0.6 }}
            animate={
              reduceMotion
                ? { pathLength: 1, opacity: 0.4 }
                : {
                    pathLength: 1,
                    opacity: [0.3, 0.6, 0.3],
                    pathOffset: [0, 1, 0],
                  }
            }
            transition={{
              duration: 20 + path.id * 0.27,
              repeat: reduceMotion ? 0 : Infinity,
              ease: "linear",
            }}
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
  ctaLabel = "Обсудить вашу идею",
  ctaHref = "#calculator",
}: BackgroundPathsProps) {
  const reduceMotion = useReducedMotion();
  return (
    <section
      className="paths-hero relative w-full flex items-center justify-center overflow-hidden bg-white dark:bg-neutral-950"
      aria-labelledby="hero-title"
    >
      <div className="absolute inset-0 paths-canvas">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
      <div className="relative z-10 paths-content text-center">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="paths-kicker">
            <span className="status-dot" /> Независимая digital-студия{" "}
            <span className="kicker-separator">/</span> CodWay
          </div>
          <h1 id="hero-title" aria-label={title.replace(/\n/g, " ")}>
            {title.split("\n").map((line, lineIndex) => (
              <span
                className="paths-title-line"
                key={lineIndex}
                aria-hidden="true"
              >
                {line.split(" ").map((word, wordIndex) => (
                  <span className="paths-word" key={wordIndex}>
                    {Array.from(word).map((letter, letterIndex) => (
                      <motion.span
                        key={letterIndex}
                        className="paths-letter inline-block text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 to-neutral-700/80 dark:from-white dark:to-white/80"
                        initial={
                          reduceMotion
                            ? false
                            : { y: 65, opacity: 0, filter: "blur(5px)" }
                        }
                        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                        transition={{
                          delay:
                            lineIndex * 0.12 +
                            wordIndex * 0.06 +
                            letterIndex * 0.018,
                          type: "spring",
                          stiffness: 150,
                          damping: 25,
                        }}
                      >
                        {letter}
                      </motion.span>
                    ))}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <p className="paths-description">{description}</p>
          <div className="paths-actions">
            <div className="paths-button-wrap group relative bg-gradient-to-b from-black/10 to-white/10 dark:from-white/10 dark:to-black/10 p-px rounded-2xl backdrop-blur-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <Button
                asChild
                variant="ghost"
                className="paths-button rounded-[1.15rem] px-8 py-6 text-lg font-semibold backdrop-blur-md bg-white/95 hover:bg-white/100 dark:bg-black/95 dark:hover:bg-black/100 text-black dark:text-white transition-all duration-300 group-hover:-translate-y-0.5 border border-black/10 dark:border-white/10 hover:shadow-md dark:hover:shadow-neutral-800/50"
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
        </motion.div>
      </div>
      <div className="paths-bottom">
        <span>DEVELOPMENT, WITH INTENTION.</span>
        <a href="#services">
          Листайте, чтобы узнать больше <ArrowDown size={13} />
        </a>
        <span>© 2026</span>
      </div>
    </section>
  );
}
