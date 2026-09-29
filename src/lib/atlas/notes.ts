import circulatory from "../../../content/atlas/notes/circulatory.json";
import digestive from "../../../content/atlas/notes/digestive.json";
import endocrine from "../../../content/atlas/notes/endocrine.json";
import excretory from "../../../content/atlas/notes/excretory.json";
import immune from "../../../content/atlas/notes/immune.json";
import locomotion from "../../../content/atlas/notes/locomotion.json";
import neural from "../../../content/atlas/notes/neural.json";
import reproductive from "../../../content/atlas/notes/reproductive.json";
import respiratory from "../../../content/atlas/notes/respiratory.json";
import sensory from "../../../content/atlas/notes/sensory.json";
import type { AtlasNote } from "@/types/atlas";

/** Chapter groups in syllabus order (Class 11 → Class 12). */
export const NOTE_GROUPS = [
  { id: "respiratory", notes: respiratory },
  { id: "circulatory", notes: circulatory },
  { id: "excretory", notes: excretory },
  { id: "locomotion", notes: locomotion },
  { id: "neural", notes: neural },
  { id: "sensory", notes: sensory },
  { id: "endocrine", notes: endocrine },
  { id: "digestive", notes: digestive },
  { id: "immune", notes: immune },
  { id: "reproductive", notes: reproductive },
] as const;
export type NoteGroupId = (typeof NOTE_GROUPS)[number]["id"];

function validate(note: AtlasNote, group: string): AtlasNote {
  const where = `content/atlas/notes/${group}.json → ${note.id}`;
  if (!/^[a-z0-9-]+$/.test(note.id)) throw new Error(`${where}: id must be a lowercase slug`);
  if (!note.concepts.length) throw new Error(`${where}: needs at least one concept id`);
  for (const key of ["title", "junior", "definition"] as const) if (!note[key]?.trim()) throw new Error(`${where}: missing ${key}`);
  if (!note.structure.length || !note.functions.length || !note.neetPoints.length) throw new Error(`${where}: structure, functions and neetPoints are required`);
  if (!note.syllabus.length) throw new Error(`${where}: missing syllabus reference`);
  if (note.mcqs.length < 2) throw new Error(`${where}: needs at least 2 MCQs`);
  note.mcqs.forEach((q, i) => {
    if (q.options.length !== 4) throw new Error(`${where}: MCQ ${i + 1} needs 4 options`);
    if (q.answer < 0 || q.answer > 3) throw new Error(`${where}: MCQ ${i + 1} has an invalid answer`);
    if (!q.explanation.trim()) throw new Error(`${where}: MCQ ${i + 1} needs an explanation`);
  });
  return note;
}

export const ATLAS_NOTES: AtlasNote[] = NOTE_GROUPS.flatMap((g) => (g.notes as AtlasNote[]).map((n) => validate(n, g.id)));

const byId = new Map<string, AtlasNote>();
const byConcept = new Map<string, AtlasNote>();
for (const note of ATLAS_NOTES) {
  if (byId.has(note.id)) throw new Error(`Duplicate atlas note id "${note.id}"`);
  byId.set(note.id, note);
  for (const concept of note.concepts) if (!byConcept.has(concept)) byConcept.set(concept, note);
}

export const getAtlasNote = (id: string) => byId.get(id);
export const noteForConcept = (conceptId: string) => byConcept.get(conceptId);
export const noteGroupOf = (note: AtlasNote): NoteGroupId =>
  NOTE_GROUPS.find((g) => (g.notes as AtlasNote[]).some((n) => n.id === note.id))!.id;
