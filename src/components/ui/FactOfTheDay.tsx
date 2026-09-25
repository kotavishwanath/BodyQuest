"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { useStoreHydrated } from "@/hooks/use-client-env";
import { Link } from "@/i18n/navigation";
import { AGE_MODE_CONFIG } from "@/lib/age-modes";
import { factForDay, factText } from "@/lib/facts";
import { getPart, isPartVisible } from "@/lib/parts";
import { useAppStore } from "@/lib/store";

const noopSubscribe = () => () => {};
/** Local date as YYYY-MM-DD (null during static rendering). */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** "Body fact of the day" card, the same fact for everyone on a given day. */
export function FactOfTheDay() {
  const t = useTranslations("Fact");
  const hydrated = useStoreHydrated();
  const ageMode = useAppStore((s) => s.ageMode);
  const day = useSyncExternalStore(noopSubscribe, today, () => null);
  if (!day || !hydrated) return null;

  const mode = ageMode ?? "young";
  const fact = factForDay(day);
  const text = factText(fact, mode);
  const part = getPart(fact.partId);
  const canSee = part !== undefined && isPartVisible(part, mode);

  return (
    <section aria-labelledby="fact-title" className="w-full max-w-xl rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 text-slate-900 shadow-sm">
      <h2 id="fact-title" className="text-sm font-bold uppercase tracking-wide text-amber-800">
        🌟 {t("title")}
      </h2>
      <p className="mt-2 text-xl font-semibold leading-snug">{text}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <SpeakButton text={text} rate={AGE_MODE_CONFIG[mode].speechRate} />
        {canSee && ageMode && (
          <Link
            href={`/explore/part/${fact.partId}`}
            className="inline-flex min-h-[var(--tap)] items-center rounded-full border-2 border-amber-400 bg-white px-5 font-semibold hover:bg-amber-100"
          >
            {t("see")} →
          </Link>
        )}
      </div>
    </section>
  );
}
