"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getPart } from "@/lib/parts";
import type { AgeMode, SystemId } from "@/types/content";
import stickerData from "@content/stickers.json";

/**
 * Kids' progress: explored parts, game events and earned stickers.
 * Stored only in localStorage on this device; nothing is sent anywhere.
 */

export type StickerRule =
  | { type: "explore"; count: number; parts?: string[]; systems?: SystemId[] }
  | { type: "event"; event: string };

export interface Sticker {
  id: string;
  icon: string;
  name: string;
  description: string;
  modes: AgeMode[];
  rule: StickerRule;
}

export const STICKERS = stickerData as Sticker[];

export type QuizLevel = "little" | "young" | "junior";

interface ProgressState {
  explored: string[];
  events: string[];
  /** Sticker id → ISO date earned. */
  stickers: Record<string, string>;
  quizBest: Partial<Record<QuizLevel, number>>;
  /** Newly earned stickers waiting to be celebrated (not persisted). */
  unseen: string[];

  recordExplore: (partId: string, mode: AgeMode) => void;
  recordEvent: (event: string, mode: AgeMode) => void;
  setQuizBest: (level: QuizLevel, score: number) => void;
  markSeen: () => void;
  resetProgress: () => void;
}

function countExplored(explored: string[], rule: Extract<StickerRule, { type: "explore" }>): number {
  return explored.filter((id) => {
    if (rule.parts) return rule.parts.includes(id);
    if (rule.systems) {
      const part = getPart(id);
      return part !== undefined && rule.systems.includes(part.system);
    }
    return true;
  }).length;
}

/** Stickers this mode can earn that the given progress now qualifies for. */
function newlyEarned(state: Pick<ProgressState, "explored" | "events" | "stickers">, mode: AgeMode): string[] {
  return STICKERS.filter((sticker) => {
    if (state.stickers[sticker.id] || !sticker.modes.includes(mode)) return false;
    const { rule } = sticker;
    return rule.type === "event" ? state.events.includes(rule.event) : countExplored(state.explored, rule) >= rule.count;
  }).map((s) => s.id);
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => {
      const award = (next: Pick<ProgressState, "explored" | "events">, mode: AgeMode) => {
        const { stickers, unseen } = get();
        const earned = newlyEarned({ ...next, stickers }, mode);
        const now = new Date().toISOString();
        set({
          ...next,
          stickers: { ...stickers, ...Object.fromEntries(earned.map((id) => [id, now])) },
          unseen: [...unseen, ...earned],
        });
      };

      return {
        explored: [],
        events: [],
        stickers: {},
        quizBest: {},
        unseen: [],

        recordExplore: (partId, mode) => {
          const { explored, events } = get();
          if (explored.includes(partId)) return;
          award({ explored: [...explored, partId], events }, mode);
        },
        recordEvent: (event, mode) => {
          const { explored, events } = get();
          award({ explored, events: events.includes(event) ? events : [...events, event] }, mode);
        },
        setQuizBest: (level, score) =>
          set((s) => ({ quizBest: { ...s.quizBest, [level]: Math.max(score, s.quizBest[level] ?? 0) } })),
        markSeen: () => set({ unseen: [] }),
        resetProgress: () => set({ explored: [], events: [], stickers: {}, quizBest: {}, unseen: [] }),
      };
    },
    {
      name: "bodyverse-progress",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ explored, events, stickers, quizBest }) => ({ explored, events, stickers, quizBest }),
      skipHydration: true,
    },
  ),
);

export function getSticker(id: string): Sticker | undefined {
  return STICKERS.find((s) => s.id === id);
}
