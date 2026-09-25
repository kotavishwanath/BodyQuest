"use client";

import { useTranslations } from "next-intl";

/** Playful loading state: a beating heart. Motion stops with reduced-motion. */
export function PlayfulLoader() {
  const t = useTranslations("Common");
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3"
    >
      <span className="animate-heartbeat text-6xl" aria-hidden="true">
        ❤️
      </span>
      <p className="text-lg font-medium text-muted-foreground">{t("loading")}</p>
    </div>
  );
}
