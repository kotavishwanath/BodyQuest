"use client";

import { useTranslations } from "next-intl";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { peelViewsForMode, systemViewsForMode, VIEW_ICONS, type ViewId } from "@/lib/views";
import type { AgeMode } from "@/types/content";

function ViewButton({ id, active, little, onSelect }: { id: ViewId; active: boolean; little: boolean; onSelect: () => void }) {
  const t = useTranslations("Views");
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "flex min-h-[var(--tap)] shrink-0 items-center gap-1.5 rounded-full border-2 px-3 font-semibold transition hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50",
        little && "px-5 text-2xl",
        active && "border-primary bg-primary text-primary-foreground hover:bg-primary",
      )}
    >
      <span aria-hidden="true">{VIEW_ICONS[id]}</span>
      <span className={cn(!little && "sr-only sm:not-sr-only")}>{t(id)}</span>
    </button>
  );
}

/** Big "peel" slider with layer buttons, plus buttons for each body system. */
export function LayerControls({ mode }: { mode: AgeMode }) {
  const t = useTranslations("Views");
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const peel = peelViewsForMode(mode);
  const systems = systemViewsForMode(mode);
  const little = mode === "little";
  const peelIndex = (peel as ViewId[]).indexOf(view);
  // System views sit at the organs depth on the slider.
  const sliderIndex = peelIndex >= 0 ? peelIndex : Math.max(0, (peel as ViewId[]).indexOf("organs"));

  return (
    <div className="pointer-events-auto flex flex-col gap-2 rounded-3xl border-2 bg-card/95 p-2 shadow-lg">
      <div role="group" aria-label={t("label")}>
        <label htmlFor="peel-slider" className="px-1 text-xs font-bold text-muted-foreground">
          {t("peel")}
        </label>
        <input
          id="peel-slider"
          type="range"
          min={0}
          max={peel.length - 1}
          step={1}
          value={sliderIndex}
          aria-valuetext={t(peel[sliderIndex])}
          onChange={(event) => setView(peel[Number(event.target.value)])}
          className="h-3 w-full cursor-pointer accent-primary"
        />
        <div className="mt-1 flex flex-wrap gap-1.5 lg:flex-col">
          {peel.map((id) => (
            <ViewButton key={id} id={id} active={view === id} little={little} onSelect={() => setView(id)} />
          ))}
        </div>
      </div>

      {systems.length > 0 && (
        <div role="group" aria-label={t("systemsLabel")}>
          <p className="px-1 text-xs font-bold text-muted-foreground">{t("systemsLabel")}</p>
          <div className="mt-1 flex gap-1.5 overflow-x-auto pb-1 lg:grid lg:grid-cols-1 lg:overflow-visible">
            {systems.map((id) => (
              <ViewButton key={id} id={id} active={view === id} little={little} onSelect={() => setView(id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
