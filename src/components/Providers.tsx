"use client";

import { MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { ProgressTracker } from "@/components/ui/ProgressTracker";
import { AGE_MODE_CONFIG } from "@/lib/age-modes";
import { useProgressStore } from "@/lib/progress";
import { useAppStore } from "@/lib/store";

/**
 * App-wide client setup:
 *  - loads persisted settings from localStorage after hydration
 *  - applies the theme / age-mode attributes to <html>
 *  - makes Motion respect the user's reduced-motion preference
 */
export function Providers({ children }: { children: ReactNode }) {
  const ageMode = useAppStore((state) => state.ageMode);
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    void useAppStore.persist.rehydrate();
    void useProgressStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const uiTheme = ageMode ? AGE_MODE_CONFIG[ageMode].theme : "kids";
    root.dataset.theme = uiTheme;
    root.dataset.mode = ageMode ?? "none";
    root.classList.toggle("dark", uiTheme === "study" && theme === "dark");
  }, [ageMode, theme]);

  return (
    <MotionConfig reducedMotion="user">
      {children}
      <ProgressTracker />
    </MotionConfig>
  );
}
