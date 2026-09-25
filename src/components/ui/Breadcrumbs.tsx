"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { getAncestors, getDisplayName, getPart, isPartVisible } from "@/lib/parts";
import { useAppStore } from "@/lib/store";
import type { AgeMode } from "@/types/content";

interface Crumb {
  key: string;
  label: string;
  onSelect?: () => void;
}

/** "Body › Bones › Legs › Femur – thigh bone" trail plus a big Go Back button. */
export function Breadcrumbs({ mode }: { mode: AgeMode }) {
  const t = useTranslations("Explore");
  const tViews = useTranslations("Views");
  const view = useAppStore((s) => s.view);
  const selectedId = useAppStore((s) => s.selectedPartId);
  const setView = useAppStore((s) => s.setView);
  const focusPart = useAppStore((s) => s.focusPart);

  const found = selectedId ? getPart(selectedId) : undefined;
  const part = found && isPartVisible(found, mode) ? found : undefined;

  const crumbs: Crumb[] = [
    {
      key: "body",
      label: t("body"),
      onSelect: () => {
        focusPart(null);
        setView("skin");
      },
    },
  ];
  if (view !== "skin") crumbs.push({ key: view, label: tViews(view), onSelect: () => focusPart(null) });
  if (part) {
    for (const ancestor of getAncestors(part, mode)) {
      crumbs.push({ key: ancestor.id, label: getDisplayName(ancestor, mode), onSelect: () => focusPart(ancestor.id) });
    }
    crumbs.push({ key: part.id, label: getDisplayName(part, mode) });
  }
  // The last crumb is the current location.
  crumbs[crumbs.length - 1] = { ...crumbs[crumbs.length - 1], onSelect: undefined };
  const back = crumbs.length > 1 ? crumbs[crumbs.length - 2].onSelect : undefined;

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-2">
      {back && (
        <button
          type="button"
          onClick={back}
          className="inline-flex min-h-[var(--tap)] items-center gap-2 rounded-full bg-primary px-5 text-lg font-bold text-primary-foreground shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          {t("goBack")}
        </button>
      )}
      {mode !== "little" && (
        <nav aria-label={t("breadcrumb")} className="rounded-full bg-card/90 px-3 py-1.5 shadow">
          <ol className="flex flex-wrap items-center gap-1 text-sm font-semibold">
            {crumbs.map((crumb, index) => (
              <li key={crumb.key} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />}
                {crumb.onSelect ? (
                  <button type="button" onClick={crumb.onSelect} className="rounded px-1 underline-offset-4 hover:underline">
                    {crumb.label}
                  </button>
                ) : (
                  <span aria-current="location" className="px-1 text-primary">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </div>
  );
}
