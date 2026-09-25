"use client";

import { useTranslations } from "next-intl";
import { PlayfulLoader } from "@/components/ui/PlayfulLoader";
import { RequireAgeMode, useProgressHydrated } from "@/components/ui/RequireAgeMode";
import { STICKERS, useProgressStore } from "@/lib/progress";
import { cn } from "@/lib/utils";

/** Sticker book: earned stickers in colour, the rest as friendly goals. */
export function StickerBook() {
  const t = useTranslations("Stickers");
  const hydrated = useProgressHydrated();
  const earned = useProgressStore((s) => s.stickers);
  const resetProgress = useProgressStore((s) => s.resetProgress);

  return (
    <RequireAgeMode>
      {(mode) => {
        if (!hydrated) return <PlayfulLoader />;
        const stickers = STICKERS.filter((s) => s.modes.includes(mode));
        const count = stickers.filter((s) => earned[s.id]).length;
        return (
          <>
            <p className="mb-4 text-center text-xl font-bold">{t("earned", { count, total: stickers.length })}</p>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {stickers.map((sticker) => {
                const has = Boolean(earned[sticker.id]);
                return (
                  <li
                    key={sticker.id}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-3xl border-4 p-4 text-center",
                      has ? "border-amber-300 bg-amber-50 text-slate-900 shadow" : "border-dashed bg-muted/50",
                    )}
                  >
                    <span className={cn("text-5xl", !has && "opacity-30 grayscale")} aria-hidden="true">
                      {sticker.icon}
                    </span>
                    <span className="font-bold">{sticker.name}</span>
                    <span className={cn("text-sm", has ? "text-slate-700" : "text-muted-foreground")}>
                      {has ? sticker.description : `${t("locked")}: ${sticker.description}`}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 text-center text-sm text-muted-foreground">🔒 {t("privacy")}</p>
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t("resetConfirm"))) resetProgress();
                }}
                className="min-h-[var(--tap)] rounded-full border-2 px-5 text-sm font-semibold hover:bg-muted"
              >
                {t("reset")}
              </button>
            </div>
          </>
        );
      }}
    </RequireAgeMode>
  );
}
