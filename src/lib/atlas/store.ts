import { create } from "zustand";
import type { AtlasSystemId } from "@/types/atlas";
import type { AgeMode } from "@/types/content";
import { ATLAS_PRESETS, atlasSystemsForMode, type AtlasPreset } from "./systems";

export type AtlasView = "three-quarter" | "front" | "side" | "back";

interface AtlasState {
  visible: AtlasSystemId[];
  /** Selected concept index in the catalogue. */
  selected: number | null;
  hoveredPart: number | null;
  /** Show only the selected structure. */
  isolate: boolean;
  /** 0 = assembled, 0.5 = systems pulled apart, 1 = every piece laid out. */
  explode: number;
  view: AtlasView;
  /** Bumped to re-run the camera move for the current view/selection. */
  cameraRequest: number;
  skin: boolean;

  init: (mode: AgeMode) => void;
  toggleSystem: (id: AtlasSystemId) => void;
  setPreset: (preset: AtlasPreset, mode: AgeMode) => void;
  select: (concept: number | null) => void;
  hover: (part: number | null) => void;
  toggleIsolate: () => void;
  setExplode: (value: number) => void;
  setView: (view: AtlasView) => void;
  toggleSkin: () => void;
  reset: (mode: AgeMode) => void;
}

const defaults = (mode: AgeMode) => atlasSystemsForMode(mode).filter((s) => s.defaultOn).map((s) => s.id);

export const useAtlasStore = create<AtlasState>()((set) => ({
  visible: [],
  selected: null,
  hoveredPart: null,
  isolate: false,
  explode: 0,
  view: "three-quarter",
  cameraRequest: 0,
  skin: false,

  init: (mode) => set({ visible: defaults(mode), selected: null, isolate: false, explode: 0, skin: false }),
  toggleSystem: (id) =>
    set((s) => ({
      visible: s.visible.includes(id) ? s.visible.filter((x) => x !== id) : [...s.visible, id],
      isolate: false,
    })),
  setPreset: (preset, mode) => {
    const allowed = atlasSystemsForMode(mode).map((s) => s.id);
    const list = ATLAS_PRESETS[preset];
    // "All" leaves out opt-in systems (reproductive, skin-surface hair, connective tissue).
    const next = list === null ? allowed.filter((id) => id !== "reproductive") : list.filter((id) => allowed.includes(id));
    set({ visible: next, isolate: false, selected: null });
  },
  select: (selected) => set((s) => ({ selected, isolate: selected === null ? false : s.isolate, cameraRequest: s.cameraRequest + 1 })),
  hover: (hoveredPart) => set({ hoveredPart }),
  toggleIsolate: () => set((s) => ({ isolate: s.selected !== null && !s.isolate, cameraRequest: s.cameraRequest + 1 })),
  setExplode: (explode) => set({ explode: Math.min(1, Math.max(0, explode)) }),
  setView: (view) => set((s) => ({ view, cameraRequest: s.cameraRequest + 1 })),
  toggleSkin: () => set((s) => ({ skin: !s.skin })),
  reset: (mode) =>
    set((s) => ({
      visible: defaults(mode),
      selected: null,
      isolate: false,
      explode: 0,
      skin: false,
      view: "three-quarter",
      cameraRequest: s.cameraRequest + 1,
    })),
}));
