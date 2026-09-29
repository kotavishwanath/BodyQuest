import { useSyncExternalStore } from "react";
import files from "@/generated/atlas-files.json";
import type { AtlasCatalogue, AtlasSystemId } from "@/types/atlas";

type State =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: AtlasCatalogue }
  | { status: "error"; error: string };

let state: State = { status: "idle" };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load() {
  if (state.status !== "idle") return;
  state = { status: "loading" };
  fetch(files.catalogue)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<AtlasCatalogue>;
    })
    .then((data) => {
      state = { status: "ready", data };
      emit();
    })
    .catch((error: unknown) => {
      state = { status: "error", error: error instanceof Error ? error.message : String(error) };
      emit();
    });
}

const SERVER: State = { status: "idle" };

/** Fetches the atlas catalogue once (≈ 680 KB) and shares it. */
export function useAtlasCatalogue(): State {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      load();
      return () => listeners.delete(onChange);
    },
    () => state,
    () => SERVER,
  );
}

/** Lets the user retry after a network error. */
export function retryAtlasCatalogue() {
  state = { status: "idle" };
  load();
  emit();
}

/** Systems hidden from a mode are removed from search and selection. */
export function allowedSystems(catalogue: AtlasCatalogue, allowed: Set<AtlasSystemId>) {
  return (conceptIndex: number) => catalogue.concepts[conceptIndex].parts.every((p) => allowed.has(catalogue.parts[p].system));
}

export interface SearchHit {
  index: number;
  name: string;
  pieces: number;
}

/** Name search: whole-word prefix matches first, then shorter names. */
export function searchConcepts(
  catalogue: AtlasCatalogue,
  query: string,
  isAllowed: (conceptIndex: number) => boolean,
  limit = 60,
): SearchHit[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  const words = term.split(/\s+/);
  const hits: (SearchHit & { score: number })[] = [];
  catalogue.concepts.forEach((concept, index) => {
    const name = concept.name.toLowerCase();
    if (!words.every((w) => name.includes(w))) return;
    if (!isAllowed(index)) return;
    const startsWord = new RegExp(`(^|\\s)${words[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name);
    const score = (name === term ? 0 : name.startsWith(term) ? 1 : startsWord ? 2 : 3) * 1000 + name.length;
    hits.push({ index, name: concept.name, pieces: concept.parts.length, score });
  });
  return hits.sort((a, b) => a.score - b.score).slice(0, limit);
}

/** PART-OF chain from the outermost parent down to the concept. */
export function conceptTrail(catalogue: AtlasCatalogue, index: number): number[] {
  const trail: number[] = [];
  const seen = new Set<number>();
  let current: number | undefined = index;
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    trail.unshift(current);
    current = catalogue.concepts[current].parent;
  }
  return trail;
}

/** Index of the concept that represents a single mesh (always exists). */
export function conceptForPart(catalogue: AtlasCatalogue, partIndex: number): number {
  const conceptId = catalogue.parts[partIndex].concept;
  return catalogue.concepts.findIndex((c) => c.id === conceptId);
}
