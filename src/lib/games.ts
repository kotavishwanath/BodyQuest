import type { AgeMode } from "@/types/content";
import questions from "@content/quiz/kids.json";
import findIt from "@content/games/find-it.json";
import { getPart } from "@/lib/parts";
import type { QuizLevel } from "@/lib/progress";

/** Kids' quiz (3 levels matching the kids' age modes) and Find It! targets. */
export interface KidsQuestion {
  id: string;
  level: QuizLevel;
  partId: string;
  question: string;
  options: string[];
  answer: number;
  explain: string;
}

export const KIDS_QUESTIONS = questions as KidsQuestion[];
export const QUIZ_LEVELS: QuizLevel[] = ["little", "young", "junior"];
export const QUIZ_LENGTH = 8;

export const FIND_IT_ROUNDS = findIt.rounds;
const FIND_IT_TARGETS = findIt.targets as Record<AgeMode, string[]>;

for (const q of KIDS_QUESTIONS) {
  if (!getPart(q.partId)) throw new Error(`Quiz question "${q.id}" uses unknown part "${q.partId}"`);
  if (q.answer < 0 || q.answer >= q.options.length) throw new Error(`Quiz question "${q.id}" has an invalid answer`);
}
for (const ids of Object.values(FIND_IT_TARGETS)) {
  for (const id of ids) if (!getPart(id)) throw new Error(`Find It target "${id}" is not a part`);
}

export function defaultQuizLevel(mode: AgeMode): QuizLevel {
  return mode === "little" ? "little" : mode === "young" ? "young" : "junior";
}

/** Random order; call from event handlers (not during render). */
export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickQuestions(level: QuizLevel): KidsQuestion[] {
  return shuffle(KIDS_QUESTIONS.filter((q) => q.level === level))
    .slice(0, QUIZ_LENGTH)
    .map((q) => {
      const order = shuffle(q.options.map((_, i) => i));
      return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
    });
}

export function pickFindItTargets(mode: AgeMode): string[] {
  return shuffle(FIND_IT_TARGETS[mode]).slice(0, FIND_IT_ROUNDS);
}
