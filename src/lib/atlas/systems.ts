import type { AtlasSystemId } from "@/types/atlas";
import type { AgeMode } from "@/types/content";

export interface AtlasSystemConfig {
  id: AtlasSystemId;
  color: string;
  /** Shown when the atlas opens. */
  defaultOn: boolean;
  /** Age modes that may see this system at all. */
  modes: readonly AgeMode[];
}

const BOTH = ["junior", "bipc"] as const;

/** Display order, colours and visibility rules for the atlas systems. */
export const ATLAS_SYSTEMS: readonly AtlasSystemConfig[] = [
  { id: "skeletal", color: "#e6dcc0", defaultOn: true, modes: BOTH },
  { id: "muscular", color: "#b95c50", defaultOn: false, modes: BOTH },
  { id: "cardiac", color: "#b3263a", defaultOn: true, modes: BOTH },
  { id: "arterial", color: "#c43d33", defaultOn: false, modes: BOTH },
  { id: "venous", color: "#3a67b0", defaultOn: false, modes: BOTH },
  { id: "nervous", color: "#e3bd5c", defaultOn: true, modes: BOTH },
  { id: "sensory", color: "#9fc2cc", defaultOn: true, modes: BOTH },
  { id: "respiratory", color: "#d88e97", defaultOn: true, modes: BOTH },
  { id: "digestive", color: "#c9905f", defaultOn: true, modes: BOTH },
  { id: "urinary", color: "#a4574a", defaultOn: true, modes: BOTH },
  { id: "lymphatic", color: "#86a37a", defaultOn: true, modes: BOTH },
  { id: "endocrine", color: "#d69a6e", defaultOn: true, modes: BOTH },
  // Class 12 "Human Reproduction": BiPC only and off until the student turns it on.
  { id: "reproductive", color: "#c4978c", defaultOn: false, modes: ["bipc"] },
  { id: "integumentary", color: "#4a3426", defaultOn: false, modes: BOTH },
  { id: "connective", color: "#b7cbc3", defaultOn: false, modes: BOTH },
];

export const ATLAS_SYSTEM: Record<AtlasSystemId, AtlasSystemConfig> = Object.fromEntries(
  ATLAS_SYSTEMS.map((s) => [s.id, s]),
) as Record<AtlasSystemId, AtlasSystemConfig>;

export function atlasSystemsForMode(mode: AgeMode): AtlasSystemConfig[] {
  return ATLAS_SYSTEMS.filter((s) => s.modes.includes(mode));
}

export function isAtlasMode(mode: AgeMode | null): mode is "junior" | "bipc" {
  return mode === "junior" || mode === "bipc";
}

/** Presets like Human Atlas: everything, just bones, just organs. */
export const ATLAS_PRESETS = {
  all: null,
  skeleton: ["skeletal"],
  organs: ["cardiac", "respiratory", "digestive", "urinary", "endocrine", "lymphatic", "sensory", "reproductive"],
  vessels: ["cardiac", "arterial", "venous"],
} as const satisfies Record<string, readonly AtlasSystemId[] | null>;
export type AtlasPreset = keyof typeof ATLAS_PRESETS;
