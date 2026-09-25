import type { AgeMode } from "@/types/content";
import facts from "@content/facts.json";
import { getPart } from "@/lib/parts";

/** "Body Fact of the Day": one fact per day, the same for everyone that day. */
export interface BodyFact {
  id: string;
  partId: string;
  text: { little?: string; young: string; junior: string };
}

export const FACTS = facts as BodyFact[];

for (const fact of FACTS) {
  if (!getPart(fact.partId)) throw new Error(`Fact "${fact.id}" uses unknown part "${fact.partId}"`);
}

/** Picks the fact for a local date string (YYYY-MM-DD). */
export function factForDay(day: string): BodyFact {
  const [y, m, d] = day.split("-").map(Number);
  const dayOfYear = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  return FACTS[(dayOfYear + y) % FACTS.length];
}

export function factText(fact: BodyFact, mode: AgeMode): string {
  if (mode === "little") return fact.text.little ?? fact.text.young;
  return mode === "young" ? fact.text.young : fact.text.junior;
}
