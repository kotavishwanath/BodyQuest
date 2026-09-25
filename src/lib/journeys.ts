import type { AgeMode } from "@/types/content";
import food from "@content/journeys/follow-the-food.json";
import tour from "@content/journeys/grand-tour.json";
import { getDisplayName, getPart, getSpeechText, isPartVisible } from "@/lib/parts";
import type { ViewId } from "@/lib/views";

/** Guided journeys through the body ("Follow the Food", the body tour). */
export interface JourneyStep {
  partId: string;
  /** Narration; without it the part's own text for the age mode is used. */
  text?: { young: string; junior: string };
}

export interface Journey {
  id: "follow-the-food" | "grand-tour";
  /** View to start in (steps switch view automatically when needed). */
  view?: ViewId;
  visibleInModes: AgeMode[];
  /** Show the travelling "food ball" marker. */
  marker?: boolean;
  steps: JourneyStep[];
}

export const JOURNEYS: Journey[] = [{ marker: true, ...(food as Omit<Journey, "id">), id: "follow-the-food" }, tour as Journey];

for (const journey of JOURNEYS) {
  for (const step of journey.steps) {
    if (!getPart(step.partId)) throw new Error(`Journey "${journey.id}" uses unknown part "${step.partId}"`);
  }
}

export function getJourney(id: string): Journey | undefined {
  return JOURNEYS.find((j) => j.id === id);
}

/** Steps whose part is shown in this age mode. */
export function journeySteps(journey: Journey, mode: AgeMode): JourneyStep[] {
  return journey.steps.filter((step) => {
    const part = getPart(step.partId);
    return part !== undefined && isPartVisible(part, mode);
  });
}

export function journeyText(step: JourneyStep, mode: AgeMode): string {
  if (step.text) return mode === "young" || mode === "little" ? step.text.young : step.text.junior;
  const part = getPart(step.partId);
  if (!part) return "";
  // The panel already shows the part's name as its heading.
  const text = getSpeechText(part, mode);
  const prefix = `${getDisplayName(part, mode)}. `;
  return text.startsWith(prefix) ? text.slice(prefix.length) : text;
}
