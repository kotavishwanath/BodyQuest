"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AgePicker } from "@/components/ui/AgePicker";
import { PlayfulLoader } from "@/components/ui/PlayfulLoader";
import { useStoreHydrated } from "@/hooks/use-client-env";
import { useProgressStore } from "@/lib/progress";
import { useAppStore } from "@/lib/store";
import type { AgeMode } from "@/types/content";
import { useSyncExternalStore } from "react";

/** True once the sticker/progress store has loaded from localStorage. */
export function useProgressHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useProgressStore.persist.onFinishHydration(onChange),
    () => useProgressStore.persist.hasHydrated(),
    () => false,
  );
}

/** Renders children with the learner's age mode, or asks for it first. */
export function RequireAgeMode({ children }: { children: (mode: AgeMode) => ReactNode }) {
  const t = useTranslations("Explore");
  const hydrated = useStoreHydrated();
  const ageMode = useAppStore((s) => s.ageMode);
  if (!hydrated) return <PlayfulLoader />;
  if (!ageMode) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <p className="mb-6 text-center text-lg">{t("chooseAge")}</p>
        <AgePicker stay />
      </div>
    );
  }
  return <>{children(ageMode)}</>;
}
