"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Confetti } from "@/components/ui/Confetti";
import { playSound } from "@/lib/audio";
import { getPart, isPartVisible } from "@/lib/parts";
import { getSticker, useProgressStore } from "@/lib/progress";
import { useAppStore } from "@/lib/store";

/**
 * Records explored parts and game events for stickers (on this device only),
 * and celebrates newly earned stickers. Mounted once in <Providers>.
 */
export function ProgressTracker() {
  useEffect(() => {
    return useAppStore.subscribe((state, previous) => {
      const mode = state.ageMode;
      if (!mode || state.game) return;
      const { recordExplore, recordEvent } = useProgressStore.getState();
      if (state.selectedPartId && state.selectedPartId !== previous.selectedPartId) {
        const part = getPart(state.selectedPartId);
        if (part && isPartVisible(part, mode)) recordExplore(part.id, mode);
      }
      if (state.micro && state.micro !== previous.micro) {
        recordEvent(state.micro.level === "cell" ? "cell-opened" : "tissue-opened", mode);
      }
    });
  }, []);

  return <StickerCelebration />;
}

function StickerCelebration() {
  const t = useTranslations("Stickers");
  const unseen = useProgressStore((s) => s.unseen);
  const markSeen = useProgressStore((s) => s.markSeen);
  const stickers = unseen.map(getSticker).filter((s) => s !== undefined);

  useEffect(() => {
    if (unseen.length > 0) playSound("sticker");
  }, [unseen.length]);

  return (
    <AnimatePresence>
      {stickers.length > 0 && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-sm rounded-3xl border-4 border-amber-300 bg-card p-5 text-center shadow-2xl"
        >
          <Confetti burst={unseen.length} />
          <p className="text-sm font-bold uppercase tracking-wide text-primary">{t("newSticker")}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {stickers.map((sticker) => (
              <div key={sticker.id} className="flex flex-col items-center">
                <span className="text-6xl" aria-hidden="true">{sticker.icon}</span>
                <span className="mt-1 text-lg font-bold">{sticker.name}</span>
                <span className="text-sm text-muted-foreground">{sticker.description}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={markSeen}
            className="mt-4 min-h-[var(--tap)] rounded-full bg-primary px-8 text-lg font-bold text-primary-foreground hover:brightness-110"
          >
            🎉 Yay!
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
