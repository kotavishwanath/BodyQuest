"use client";

import { useTranslations } from "next-intl";

export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Errors");
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl" aria-hidden="true">🩹</p>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="max-w-md text-lg text-muted-foreground">{t("body")}</p>
      <button
        type="button"
        onClick={reset}
        className="min-h-[var(--tap)] rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground hover:brightness-110"
      >
        {t("retry")}
      </button>
    </main>
  );
}
