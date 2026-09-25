import type { AgeMode, BodyPart, SystemId } from "@/types/content";
import type { CellSceneContent, MicroText, TissueContent, TissueId } from "@/types/micro";
import cells from "@content/micro/cells.json";
import tissues from "@content/micro/tissues.json";

/** Level 3 (tissue) / Level 4 (cell) content helpers. */

export const TISSUES = tissues as TissueContent[];
export const CELL_SCENES = cells as CellSceneContent[];

const SYSTEM_TISSUE: Partial<Record<SystemId, TissueId>> = {
  skeletal: "bone",
  muscular: "muscle",
  nervous: "nerve",
  integumentary: "skin",
  external: "skin",
};

/** Tissue to zoom into for a part (per-part override, else by system). */
export function tissueForPart(part: BodyPart): TissueId | undefined {
  return part.tissue ?? SYSTEM_TISSUE[part.system];
}

export function getTissue(id: TissueId): TissueContent {
  const tissue = TISSUES.find((t) => t.id === id);
  if (!tissue) throw new Error(`Unknown tissue "${id}"`);
  return tissue;
}

/** Tissue views from Young Scientists; cell views from Junior Doctors (Section 6). */
export const canSeeTissue = (mode: AgeMode) => mode !== "little";
export const canSeeCells = (mode: AgeMode) => mode === "junior" || mode === "bipc";

/** Picks the text for a mode; BiPC uses Junior until Phase 7 histology notes. */
export function microText(text: MicroText, mode: AgeMode): string {
  if (mode === "young") return text.young ?? text.junior;
  if (mode === "bipc") return text.bipc ?? text.junior;
  return text.junior;
}
