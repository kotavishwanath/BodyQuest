/** Level 3 (tissue) and Level 4 (cell) content types. See /content/micro. */

export const TISSUE_IDS = ["bone", "muscle", "nerve", "skin"] as const;
export type TissueId = (typeof TISSUE_IDS)[number];

export const CELL_SCENES = ["cell", "gallery"] as const;
export type CellSceneId = (typeof CELL_SCENES)[number];

/** Text per age mode; BiPC falls back to Junior until Phase 7 histology. */
export interface MicroText {
  young?: string;
  junior: string;
  bipc?: string;
}

export interface MicroStructure {
  /** Matches the `name` of the clickable object in the micro scene. */
  id: string;
  name: MicroText;
  text: MicroText;
}

export interface TissueContent {
  id: TissueId;
  name: MicroText;
  intro: MicroText;
  structures: MicroStructure[];
}

export interface CellSceneContent {
  id: CellSceneId;
  name: MicroText;
  intro: MicroText;
  structures: MicroStructure[];
}
