/** In-depth anatomy atlas (Junior + BiPC), built by scripts/build-atlas.mjs. */

import type { Disorder, KeyTerm } from "./content";

export const ATLAS_SYSTEM_IDS = [
  "skeletal",
  "muscular",
  "cardiac",
  "arterial",
  "venous",
  "nervous",
  "sensory",
  "respiratory",
  "digestive",
  "urinary",
  "lymphatic",
  "endocrine",
  "reproductive",
  "integumentary",
  "connective",
] as const;
export type AtlasSystemId = (typeof ATLAS_SYSTEM_IDS)[number];

export interface AtlasPart {
  /** BodyParts3D element file id, e.g. "FJ3365". */
  id: string;
  /** FMA concept id of the mesh, e.g. "FMA24474". */
  concept: string;
  name: string;
  system: AtlasSystemId;
  /** Bounding box centre and size in scene metres. */
  center: [number, number, number];
  size: [number, number, number];
}

export interface AtlasConcept {
  /** FMA id, or "BV:..." for curated groups. */
  id: string;
  name: string;
  /** Indices into `parts`. */
  parts: number[];
  /** Index of the PART-OF parent concept. */
  parent?: number;
}

export interface AtlasCatalogue {
  source: string;
  triangles: number;
  bytes: number;
  systems: Partial<Record<AtlasSystemId, { file: string; parts: number; triangles: number }>>;
  parts: AtlasPart[];
  concepts: AtlasConcept[];
}

export interface AtlasMcq {
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface NcertRef {
  class: 11 | 12;
  /** NCERT chapter title (rationalised edition). */
  chapter: string;
  /** False for topics only in state-board syllabi (e.g. TS/AP BIE). */
  ncert?: boolean;
}

/** Study notes for one structure (content/atlas/notes/*.json). */
export interface AtlasNote {
  /** Slug used in URLs, e.g. "heart". */
  id: string;
  /** Atlas concept ids this note describes; the first is the one we select. */
  concepts: string[];
  title: string;
  /** Short explanation for Junior Doctors (ages 9–14). */
  junior: string;
  syllabus: NcertRef[];
  definition: string;
  structure: string[];
  functions: string[];
  /** High-yield facts for NEET. */
  neetPoints: string[];
  keyTerms?: KeyTerm[];
  /** Numbers worth remembering, e.g. "Cardiac output ≈ 5 L/min". */
  numbers?: string[];
  commonMistakes?: string[];
  disorders?: Disorder[];
  mnemonic?: string;
  mcqs: AtlasMcq[];
}
