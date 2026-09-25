"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Mascot } from "@/components/ui/Mascot";
import { AGE_MODE_CONFIG } from "@/lib/age-modes";
import { speak } from "@/lib/speech";
import { useAppStore } from "@/lib/store";
import type { ViewId } from "@/lib/views";
import type { AgeMode } from "@/types/content";

type TipKey = ViewId | "little" | "selected" | "tour";

/** Chooses Cella's tip for what the learner is looking at right now. */
function useTipKey(mode: AgeMode): TipKey | null {
  const view = useAppStore((s) => s.view);
  const selected = useAppStore((s) => s.selectedPartId !== null);
  const busy = useAppStore((s) => s.game !== null || s.journey !== null || s.micro !== null);
  if (busy) return null;
  if (mode === "little") return "little";
  if (selected) return "selected";
  return view === "skin" ? "tour" : view;
}

/**
 * Cella, the friendly cell guide. Pops up with a tip when the view changes,
 * then tucks away; tap her to hear the tip again.
 */
export function MascotGuide({ mode }: { mode: AgeMode }) {
  const t = useTranslations("Mascot");
  const locale = useLocale();
  const tipKey = useTipKey(mode);
  // The tip is shown until dismissed (or for a few seconds after it changes).
  const [dismissed, setDismissed] = useState<TipKey | null>(null);

  useEffect(() => {
    if (!tipKey) return;
    const id = window.setTimeout(() => setDismissed(tipKey), 7000);
    return () => window.clearTimeout(id);
  }, [tipKey]);

  if (!tipKey) return null;
  const tip = t(`tips.${tipKey}`);
  const open = dismissed !== tipKey;

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex max-w-[16rem] flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.p
            role="status"
            aria-label={t("label")}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-auto rounded-2xl rounded-br-sm border-2 bg-card px-3 py-2 text-sm font-semibold shadow-lg"
          >
            {tip}
          </motion.p>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => {
          if (open) {
            setDismissed(tipKey);
          } else {
            setDismissed(null);
            void speak(tip, { locale, rate: AGE_MODE_CONFIG[mode].speechRate });
          }
        }}
        aria-label={open ? t("close") : t("open")}
        aria-expanded={open}
        className="pointer-events-auto rounded-full bg-card/90 p-1 shadow-lg ring-2 ring-primary/30 hover:ring-primary"
      >
        <Mascot className="size-14" />
      </button>
    </div>
  );
}
