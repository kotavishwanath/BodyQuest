"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useStoreHydrated } from "@/hooks/use-client-env";
import { useRouter } from "@/i18n/navigation";
import { AGE_MODE_CONFIG } from "@/lib/age-modes";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AGE_MODES, type AgeMode } from "@/types/content";

/** "How old are you?" picker with four big illustrated buttons. */
export function AgePicker({ stay = false }: { stay?: boolean }) {
  const t = useTranslations("AgeModes");
  const tHome = useTranslations("Home");
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const ageMode = useAppStore((state) => state.ageMode);
  const setAgeMode = useAppStore((state) => state.setAgeMode);

  const current = hydrated ? ageMode : null;

  const choose = (mode: AgeMode) => {
    setAgeMode(mode);
    if (!stay) router.push("/explore");
  };

  return (
    <section aria-labelledby="age-question" className="w-full">
      <h2 id="age-question" className="text-center text-3xl font-bold sm:text-4xl">
        {tHome("question")}
      </h2>
      <p className="mt-2 text-center text-lg text-muted-foreground">{tHome("questionHint")}</p>

      {current && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => router.push("/explore")}
            className="inline-flex min-h-[var(--tap)] items-center gap-2 rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
          >
            {tHome("continueAs", { mode: `${AGE_MODE_CONFIG[current].emoji} ${t(`${current}.label`)}` })}
            <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {AGE_MODES.map((mode, index) => {
          const config = AGE_MODE_CONFIG[mode];
          const isCurrent = current === mode;
          return (
            <motion.li
              key={mode}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07, duration: 0.3 }}
            >
              <button
                type="button"
                onClick={() => choose(mode)}
                aria-pressed={isCurrent}
                className={cn(
                  "flex min-h-28 w-full items-center gap-4 rounded-3xl border-4 p-5 text-left text-slate-900 shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50",
                  config.cardClass,
                  isCurrent && "ring-4 ring-primary",
                )}
              >
                <span className="text-6xl" aria-hidden="true">
                  {config.emoji}
                </span>
                <span className="flex flex-col">
                  <span className="text-2xl font-bold">{t(`${mode}.label`)}</span>
                  <span className="text-base font-semibold text-slate-700">{t(`${mode}.ages`)}</span>
                  <span className="text-base text-slate-700">{t(`${mode}.blurb`)}</span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
