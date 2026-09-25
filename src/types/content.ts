/**
 * Content data model (Section 14 of the build spec).
 * All learning content lives in /content as JSON and is typed here.
 */

export const AGE_MODES = ["little", "young", "junior", "bipc"] as const;
export type AgeMode = (typeof AGE_MODES)[number];

export const BOARDS = ["cbse", "ts-bie", "ap-bie", "other"] as const;
export type Board = (typeof BOARDS)[number];

export type SystemId =
  | "external" // whole-body regions (head, hands, feet...) used in kids' modes
  | "integumentary"
  | "muscular"
  | "skeletal"
  | "nervous"
  | "circulatory"
  | "respiratory"
  | "digestive"
  | "urinary"
  | "sensory"
  | "immune"
  | "endocrine"
  | "reproductive";

export type Vec3 = [number, number, number];

export interface LittleContent {
  /** One short sentence, spoken aloud. */
  say: string;
}

export interface YoungContent {
  what: string;
  does: string;
  funFact: string;
}

export interface JuniorContent extends YoungContent {
  /** IDs of related parts. */
  worksWith: string[];
  details: string;
}

export interface KeyTerm {
  term: string;
  meaning: string;
}

export interface SyllabusRef {
  board: Board;
  class: 11 | 12;
  /** Chapter slug, e.g. "body-fluids-and-circulation". */
  chapter: string;
  topic: string;
  inSyllabus: boolean;
}

export interface CrossSubjectLink {
  concept: string;
  explanation: string;
  /** LaTeX source, rendered with KaTeX. */
  formula?: string;
}

export interface Disorder {
  name: string;
  cause: string;
  symptoms: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface BipcContent {
  definition: string;
  structure: string;
  function: string;
  keyTerms: KeyTerm[];
  syllabusRefs: SyllabusRef[];
  physicsLinks?: CrossSubjectLink[];
  chemistryLinks?: CrossSubjectLink[];
  disorders?: Disorder[];
  mnemonics?: string[];
  commonMistakes?: string[];
  examTips?: string[];
  simulationIds?: string[];
  diagramIds?: string[];
  flashcards?: Flashcard[];
}

/**
 * Per-mode content. A block is required for every mode listed in
 * `visibleInModes` (enforced at load time by `validateParts`). The one
 * exception: BiPC may fall back to the Junior block until detailed BiPC notes
 * are written (Phase 6).
 */
export interface PartContent {
  little?: LittleContent;
  young?: YoungContent;
  junior?: JuniorContent;
  bipc?: BipcContent;
}

export interface KidsQuizItem {
  question: string;
  options: string[];
  answer: number;
  mode: AgeMode;
}

export type PartAnimation = "pulse" | "breathe" | "flex" | "flow" | "signal";

export interface BodyPart {
  id: string;
  /** Matches the node name in the GLB (see src/generated/model-index.json). */
  meshName: string;
  /** Extra mesh nodes that also select this part (e.g. both skin regions of the eye). */
  meshNames?: string[];
  system: SystemId;
  /** Depth order for layer peeling (0 = outermost). */
  layer: number;
  parentId?: string;
  children?: string[];
  visibleInModes: AgeMode[];
  /** Emoji used as a picture cue for pre-readers. */
  icon?: string;
  names: { common: string; scientific?: string; pronunciation?: string };
  content: PartContent;
  animation?: PartAnimation;
  /** Tissue for the Level 3 zoom (defaults by system, see lib/micro.ts). */
  tissue?: "bone" | "muscle" | "nerve" | "skin";
  /**
   * Optional camera override in model space (metres). By default the camera
   * frames the part using its mesh bounds from the model index.
   */
  cameraTarget?: { position: Vec3; lookAt: Vec3 };
  audio?: { effect?: string };
  quiz?: KidsQuizItem[];
}

export interface Question {
  id: string;
  type:
    | "mcq"
    | "assertion-reason"
    | "match"
    | "statements"
    | "diagram"
    | "numerical";
  subject: "biology" | "physics" | "chemistry";
  syllabusRef: { board: Board; class: 11 | 12; chapter: string };
  difficulty: 1 | 2 | 3;
  stem: string;
  options?: string[];
  answer: number | number[] | string;
  explanation: string;
  relatedPartIds: string[];
}
