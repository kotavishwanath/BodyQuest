"use client";

import { useTranslations } from "next-intl";
import { getDisplayName, getPartsInView } from "@/lib/parts";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AgeMode } from "@/types/content";

/**
 * Keyboard- and screen-reader-friendly list of the parts that can be chosen
 * in the current layer. Also serves as the 2D fallback when WebGL is missing.
 */
export function PartsList({ mode }: { mode: AgeMode }) {
  const t = useTranslations("Explore");
  const view = useAppStore((s) => s.view);
  const selectedId = useAppStore((s) => s.selectedPartId);
  const focusPart = useAppStore((s) => s.focusPart);
  const hoverPart = useAppStore((s) => s.hoverPart);
  const game = useAppStore((s) => s.game);
  const guess = useAppStore((s) => s.guess);
  const parts = getPartsInView(mode, view);
  const little = mode === "little";

  return (
    // During games the list stays available to keyboard / screen-reader users
    // as the way to answer, but is hidden visually so it doesn't give answers away.
    <nav aria-label={t("partsList")} className={game ? "sr-only" : "pointer-events-auto"}>
      <ul className="flex gap-2 overflow-x-auto p-1 [scrollbar-width:thin]">
        {parts.map((part) => {
          const selected = selectedId === part.id;
          return (
            <li key={part.id} className="shrink-0">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => (game ? guess(part.id) : focusPart(part.id))}
                onFocus={() => hoverPart(part.id, null)}
                onBlur={() => hoverPart(null)}
                onMouseEnter={() => hoverPart(part.id, null)}
                onMouseLeave={() => hoverPart(null)}
                className={cn(
                  "flex min-h-[var(--tap)] items-center gap-2 rounded-full border-2 bg-card px-4 font-semibold shadow-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50",
                  little && "px-5 text-2xl",
                  selected && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {part.icon && <span aria-hidden="true">{part.icon}</span>}
                <span className={cn(little && "sr-only sm:not-sr-only")}>{getDisplayName(part, mode)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
