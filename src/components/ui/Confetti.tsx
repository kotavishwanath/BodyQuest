"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/use-client-env";

const COLORS = ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff", "#c77dff", "#ff9f1c"];
const PIECES = 36;

/** Deterministic pseudo-random numbers so each burst renders purely. */
function seeded(seed: number) {
  let a = seed * 9973 + 1;
  return () => {
    a = (a * 16807) % 2147483647;
    return (a - 1) / 2147483646;
  };
}

/**
 * A short, cheerful confetti burst. Change `burst` (e.g. increment it) to
 * fire again; 0 renders nothing. Skipped when reduced motion is preferred.
 */
export function Confetti({ burst }: { burst: number }) {
  const reducedMotion = usePrefersReducedMotion();
  if (!burst || reducedMotion) return null;
  const rand = seeded(burst);

  return (
    <div key={burst} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {Array.from({ length: PIECES }, (_, i) => {
        const x = rand() * 100;
        const drift = (rand() - 0.5) * 30;
        const rotate = rand() * 720 - 360;
        const delay = rand() * 0.25;
        const size = 8 + rand() * 8;
        return (
          <motion.span
            key={i}
            className="absolute top-0 block rounded-sm"
            style={{ left: `${x}%`, width: size, height: size * 0.6, background: COLORS[i % COLORS.length] }}
            initial={{ y: "-10vh", x: 0, rotate: 0, opacity: 1 }}
            animate={{ y: "105vh", x: `${drift}vw`, rotate, opacity: [1, 1, 0] }}
            transition={{ duration: 1.8 + rand(), delay, ease: "easeIn" }}
          />
        );
      })}
    </div>
  );
}
