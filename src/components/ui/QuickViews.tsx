"use client";

import { useTranslations } from "next-intl";
import { useAppStore, type QuickView } from "@/lib/store";

const QUICK_VIEWS: { id: QuickView; icon: string }[] = [
  { id: "front", icon: "🧍" },
  { id: "side", icon: "↔️" },
  { id: "back", icon: "🔄" },
];

/** Front / side / back quick-view buttons. */
export function QuickViews() {
  const t = useTranslations("Explore");
  const showQuickView = useAppStore((s) => s.showQuickView);

  return (
    <div role="group" aria-label={t("cameraViews")} className="pointer-events-auto flex gap-1 rounded-full bg-card/90 p-1 shadow">
      {QUICK_VIEWS.map(({ id, icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => showQuickView(id)}
          className="inline-flex min-h-[var(--tap)] items-center gap-1 rounded-full px-3 text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
        >
          <span aria-hidden="true">{icon}</span>
          {t(id)}
        </button>
      ))}
    </div>
  );
}
