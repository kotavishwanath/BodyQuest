"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getPart, isPartSolidInView, viewForPart } from "@/lib/parts";
import type { ViewId } from "@/lib/views";
import type { TissueId } from "@/types/micro";
import type { AgeMode, Vec3 } from "@/types/content";

export type QuickView = "front" | "back" | "side";

const QUICK_VIEW_ANGLE: Record<QuickView, number> = {
  front: 0,
  back: Math.PI,
  side: -Math.PI / 2,
};

/** Level 3 (tissue) / Level 4 (cell) magnified views. */
export interface MicroState {
  tissue: TissueId;
  level: "tissue" | "cell";
}

/** Values reset whenever the focused part or view changes. */
const CLEAR_FOCUS_TOOLS = { closeUp: false, cut: false, cutDepth: 0, micro: null } as const;

/**
 * Global client state. Only settings (age mode, theme) are persisted, and only
 * to localStorage on this device. Nothing is ever sent to a server.
 */
interface AppState {
  ageMode: AgeMode | null;
  theme: "light" | "dark";
  view: ViewId;
  selectedPartId: string | null;
  hoveredPartId: string | null;
  /** Where the floating label sits (model space); null = part centre. */
  labelAnchor: Vec3 | null;
  /** Target Y rotation of the body model (radians). */
  modelRotation: number;
  /** Incremented to ask the camera to fly back to the whole-body view. */
  cameraHomeRequest: number;

  /** Level 2: the rest of the body fades so the selected organ stands out. */
  closeUp: boolean;
  /** Cross-section through the selected organ, facing the camera. */
  cut: boolean;
  /** Cut plane position, −1 (near side) … 1 (far side) of the organ. */
  cutDepth: number;
  micro: MicroState | null;
  /** performance.now() when the "Breathe with me" guide started. */
  breathingSince: number | null;
  /** Incremented to send a nerve signal from the brain to the hand. */
  signalRequest: number;
  journey: { id: string; step: number } | null;
  soundOn: boolean;
  /** Active 3D game; taps on parts become guesses instead of selections. */
  game: "find-it" | null;
  gameGuess: { partId: string; n: number } | null;
  /** Part that glows as a gentle hint during a game. */
  hintPartId: string | null;

  setAgeMode: (mode: AgeMode) => void;
  toggleTheme: () => void;
  setView: (view: ViewId) => void;
  /** Selects a part and switches to a view where it is visible. */
  focusPart: (id: string | null, anchor?: Vec3 | null) => void;
  hoverPart: (id: string | null, anchor?: Vec3 | null) => void;
  rotateModel: (delta: number) => void;
  showQuickView: (quickView: QuickView) => void;
  toggleCloseUp: () => void;
  toggleCut: () => void;
  setCutDepth: (depth: number) => void;
  openMicro: (micro: MicroState | null) => void;
  toggleBreathing: () => void;
  sendSignal: () => void;
  setJourney: (journey: { id: string; step: number } | null) => void;
  toggleSound: () => void;
  setGame: (game: "find-it" | null) => void;
  guess: (partId: string) => void;
  setHint: (partId: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ageMode: null,
      theme: "light",
      view: "skin",
      selectedPartId: null,
      hoveredPartId: null,
      labelAnchor: null,
      modelRotation: 0,
      cameraHomeRequest: 0,
      ...CLEAR_FOCUS_TOOLS,
      breathingSince: null,
      signalRequest: 0,
      journey: null,
      soundOn: true,
      game: null,
      gameGuess: null,
      hintPartId: null,

      setAgeMode: (ageMode) =>
        set({ ageMode, view: "skin", selectedPartId: null, hoveredPartId: null, journey: null, ...CLEAR_FOCUS_TOOLS }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      setView: (view) => {
        const selected = get().selectedPartId ? getPart(get().selectedPartId!) : undefined;
        const keepSelection = selected && isPartSolidInView(selected, view);
        set({ view, hoveredPartId: null, selectedPartId: keepSelection ? selected.id : null, journey: null, ...CLEAR_FOCUS_TOOLS });
      },
      focusPart: (id, anchor = null) => {
        const part = id ? getPart(id) : undefined;
        if (!part) {
          set({ selectedPartId: null, labelAnchor: null, ...CLEAR_FOCUS_TOOLS });
          return;
        }
        const { view, selectedPartId } = get();
        set({
          selectedPartId: part.id,
          labelAnchor: anchor,
          view: isPartSolidInView(part, view) ? view : viewForPart(part),
          ...(part.id === selectedPartId ? {} : CLEAR_FOCUS_TOOLS),
        });
      },
      hoverPart: (hoveredPartId, anchor) =>
        set((s) => ({ hoveredPartId, labelAnchor: anchor === undefined ? s.labelAnchor : anchor })),
      rotateModel: (delta) => set((s) => ({ modelRotation: s.modelRotation + delta })),
      showQuickView: (quickView) =>
        set((s) => {
          // Turn the shortest way round to the requested side.
          const turns = Math.round((s.modelRotation - QUICK_VIEW_ANGLE[quickView]) / (2 * Math.PI));
          return {
            modelRotation: turns * 2 * Math.PI + QUICK_VIEW_ANGLE[quickView],
            selectedPartId: null,
            cameraHomeRequest: s.cameraHomeRequest + 1,
            ...CLEAR_FOCUS_TOOLS,
          };
        }),
      toggleCloseUp: () => set((s) => ({ closeUp: !s.closeUp, cut: s.closeUp ? false : s.cut })),
      toggleCut: () => set((s) => ({ cut: !s.cut, closeUp: true, cutDepth: 0 })),
      setCutDepth: (cutDepth) => set({ cutDepth }),
      openMicro: (micro) => set({ micro }),
      toggleBreathing: () => set((s) => ({ breathingSince: s.breathingSince === null ? performance.now() : null })),
      sendSignal: () => set((s) => ({ signalRequest: s.signalRequest + 1 })),
      setJourney: (journey) => set({ journey }),
      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      setGame: (game) => set({ game, gameGuess: null, hintPartId: null, selectedPartId: null, journey: null, ...CLEAR_FOCUS_TOOLS }),
      guess: (partId) => set((s) => ({ gameGuess: { partId, n: (s.gameGuess?.n ?? 0) + 1 } })),
      setHint: (hintPartId) => set({ hintPartId }),
    }),
    {
      name: "bodyverse-settings",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ ageMode: state.ageMode, theme: state.theme, soundOn: state.soundOn }),
      // Rehydrated manually in <Providers> so SSR/static HTML matches the
      // first client render (avoids hydration mismatches).
      skipHydration: true,
    },
  ),
);
