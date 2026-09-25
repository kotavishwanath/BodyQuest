"use client";

import { BuildSkeleton } from "@/components/games/BuildSkeleton";
import { KidsQuiz } from "@/components/games/KidsQuiz";
import { RequireAgeMode } from "@/components/ui/RequireAgeMode";

/** Client wrappers so server pages can render age-aware games. */
export function BuildSkeletonScreen() {
  return <RequireAgeMode>{(mode) => <BuildSkeleton mode={mode} />}</RequireAgeMode>;
}

export function KidsQuizScreen() {
  return <RequireAgeMode>{(mode) => <KidsQuiz mode={mode} />}</RequireAgeMode>;
}
