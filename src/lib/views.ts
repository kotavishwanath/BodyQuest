import { MODEL_NODES, type ModelFile, type ModelNode, type RenderGroup } from "@/lib/model-index";
import type { AgeMode, SystemId } from "@/types/content";

/**
 * Layer peeling and system views (Section 6, Level 1).
 *
 * A "view" decides how each mesh node is drawn:
 *  - solid:    fully drawn and selectable
 *  - backdrop: fully drawn for context, not selectable
 *  - ghost:    faint see-through silhouette, not selectable
 *  - hidden:   not drawn (and its GLB need not be loaded)
 *
 * Peel views show render groups (outside → in). System views show every node
 * that belongs to that body system, with the skin and skeleton ghosted.
 */

export const PEEL_VIEWS = ["skin", "muscles", "organs", "skeleton"] as const;
export const SYSTEM_VIEWS = ["circulatory", "nervous", "respiratory", "digestive", "urinary", "sensory", "immune", "endocrine"] as const;

export type PeelView = (typeof PEEL_VIEWS)[number];
export type SystemView = (typeof SYSTEM_VIEWS)[number];
export type ViewId = PeelView | SystemView;

export type NodeStyle = "solid" | "backdrop" | "ghost" | "hidden";

export const VIEW_ICONS: Record<ViewId, string> = {
  skin: "🧍",
  muscles: "💪",
  organs: "🫀",
  skeleton: "🦴",
  circulatory: "🩸",
  nervous: "⚡",
  respiratory: "🫁",
  digestive: "🍽️",
  urinary: "💧",
  sensory: "👀",
  immune: "🛡️",
  endocrine: "🧪",
};

const isSystemView = (view: ViewId): view is SystemView => (SYSTEM_VIEWS as readonly string[]).includes(view);

/** Little Explorers only peel from the outside to "inside" (the heart). */
export function peelViewsForMode(mode: AgeMode): PeelView[] {
  return mode === "little" ? ["skin", "organs"] : [...PEEL_VIEWS];
}

/** System views offered in each age mode (immune & endocrine from Junior Doctors). */
export function systemViewsForMode(mode: AgeMode): SystemView[] {
  if (mode === "little") return [];
  if (mode === "young") return SYSTEM_VIEWS.filter((v) => v !== "immune" && v !== "endocrine");
  return [...SYSTEM_VIEWS];
}

export function isViewAvailable(view: ViewId, mode: AgeMode): boolean {
  return (peelViewsForMode(mode) as ViewId[]).includes(view) || (systemViewsForMode(mode) as ViewId[]).includes(view);
}

const GROUP_STYLES: Record<PeelView, Record<RenderGroup, NodeStyle>> = {
  skin: { skin: "solid", muscles: "hidden", organs: "hidden", skeleton: "hidden" },
  muscles: { skin: "ghost", muscles: "solid", organs: "hidden", skeleton: "backdrop" },
  organs: { skin: "ghost", muscles: "hidden", organs: "solid", skeleton: "ghost" },
  skeleton: { skin: "ghost", muscles: "hidden", organs: "hidden", skeleton: "solid" },
};

export function nodeStyle(node: ModelNode, view: ViewId): NodeStyle {
  if (isSystemView(view)) {
    if (node.systems.includes(view)) return "solid";
    return node.group === "skin" || node.group === "skeleton" ? "ghost" : "hidden";
  }
  return GROUP_STYLES[view][node.group];
}

/** GLB files needed to draw a view. */
export function filesForView(view: ViewId): ModelFile[] {
  const files = new Set<ModelFile>();
  for (const node of Object.values(MODEL_NODES)) {
    if (nodeStyle(node, view) !== "hidden") files.add(node.file);
  }
  return [...files];
}

/** The peel view in which a node is shown solid (used when focusing a part). */
export function viewForNode(node: ModelNode): ViewId {
  return node.group;
}

// ── System routes (/explore/[system]) ────────────────────────────────────
export const SYSTEM_VIEW: Partial<Record<SystemId, ViewId>> = {
  integumentary: "skin",
  skeletal: "skeleton",
  muscular: "muscles",
  circulatory: "circulatory",
  nervous: "nervous",
  respiratory: "respiratory",
  digestive: "digestive",
  urinary: "urinary",
  sensory: "sensory",
  immune: "immune",
  endocrine: "endocrine",
};

/** Systems with their own explorer page. */
export const EXPLORABLE_SYSTEMS = [
  "skeletal",
  "muscular",
  "circulatory",
  "nervous",
  "respiratory",
  "digestive",
  "urinary",
  "sensory",
  "immune",
  "endocrine",
] as const;
export type ExplorableSystem = (typeof EXPLORABLE_SYSTEMS)[number];

export function isExplorableSystem(value: string): value is ExplorableSystem {
  return (EXPLORABLE_SYSTEMS as readonly string[]).includes(value);
}

export function systemForView(view: ViewId): ExplorableSystem | undefined {
  return EXPLORABLE_SYSTEMS.find((system) => SYSTEM_VIEW[system] === view);
}
