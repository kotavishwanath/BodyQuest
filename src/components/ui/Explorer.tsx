"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { ExplorerCanvas } from "@/components/3d/ExplorerCanvas";
import { AgePicker } from "@/components/ui/AgePicker";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { InfoPanel } from "@/components/ui/InfoPanel";
import { LayerControls } from "@/components/ui/LayerControls";
import { PartsList } from "@/components/ui/PartsList";
import { PlayfulLoader } from "@/components/ui/PlayfulLoader";
import { QuickViews } from "@/components/ui/QuickViews";
import { BreathingGuide, JourneyPanel, SystemActions } from "@/components/ui/SystemActions";
import { MicroViewer } from "@/components/micro/MicroViewer";
import { FindItGame } from "@/components/games/FindItGame";
import { MascotGuide } from "@/components/ui/MascotGuide";
import { useStoreHydrated } from "@/hooks/use-client-env";
import { getDisplayName, getPart, isPartVisible } from "@/lib/parts";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { systemForView, type ViewId } from "@/lib/views";

interface ExplorerProps {
  /** View to open with (from /explore/[system]). */
  initialView?: ViewId;
  /** Part to focus on open (from /explore/part/[id]). */
  initialPartId?: string;
  /** Play a 3D game instead of free exploring. */
  game?: "find-it";
}

/** Main 3D explorer: canvas, layer controls, breadcrumbs, parts list and info panel. */
export function Explorer({ initialView, initialPartId, game }: ExplorerProps) {
  const t = useTranslations("Explore");
  const locale = useLocale();
  const hydrated = useStoreHydrated();
  const ageMode = useAppStore((s) => s.ageMode);
  const selectedId = useAppStore((s) => s.selectedPartId);
  const journeyActive = useAppStore((s) => s.journey !== null);
  const applied = useRef(false);

  // Apply the route's initial view / part once the age mode is known.
  useEffect(() => {
    if (!hydrated || !ageMode || applied.current) return;
    applied.current = true;
    const { setView, focusPart } = useAppStore.getState();
    const part = initialPartId ? getPart(initialPartId) : undefined;
    if (!game && part && isPartVisible(part, ageMode)) {
      focusPart(part.id);
    } else {
      setView(initialView ?? "skin");
      focusPart(null);
    }
  }, [hydrated, ageMode, initialView, initialPartId, game]);

  // Keep the address bar in sync so every view/part can be shared or bookmarked.
  useEffect(() => {
    if (game) return;
    return useAppStore.subscribe((state, previous) => {
      if (!applied.current) return;
      if (state.selectedPartId === previous.selectedPartId && state.view === previous.view) return;
      const base = `/${locale}/explore`;
      const system = systemForView(state.view);
      const path = state.selectedPartId ? `${base}/part/${state.selectedPartId}` : system ? `${base}/${system}` : base;
      const trailing = window.location.pathname.endsWith("/") ? "/" : "";
      if (window.location.pathname !== path + trailing) window.history.replaceState(null, "", path + trailing);
    });
  }, [locale, game]);

  if (!hydrated) return <PlayfulLoader />;

  if (!ageMode) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <p className="mb-6 text-center text-lg">{t("chooseAge")}</p>
        <AgePicker />
      </div>
    );
  }

  const selected = selectedId ? getPart(selectedId) : undefined;
  const panelOpen = (selected !== undefined && isPartVisible(selected, ageMode)) || journeyActive;
  // A deep link to a part that this age mode doesn't show (until something is picked).
  const linkedPart = initialPartId ? getPart(initialPartId) : undefined;
  const notice =
    linkedPart && !isPartVisible(linkedPart, ageMode) && !selectedId
      ? t("notInMode", { name: linkedPart.names.common })
      : null;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden lg:min-h-[620px]">
      <h1 className="sr-only">{t("heading")}</h1>

      {/* Canvas with the top overlay (breadcrumbs, quick views). On large screens it fills the explorer. */}
      <div className="relative h-[62vh] min-h-[380px] lg:absolute lg:inset-0 lg:h-auto">
        <ExplorerCanvas mode={ageMode} />
        {!game && <MascotGuide mode={ageMode} />}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3",
            panelOpen && "lg:pr-[440px]",
          )}
        >
          {game ? (
            <div className="w-full">
              <FindItGame mode={ageMode} />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Breadcrumbs mode={ageMode} />
                <SystemActions mode={ageMode} />
                <BreathingGuide />
                {notice && (
                  <p role="status" className="pointer-events-auto max-w-md rounded-2xl bg-secondary px-4 py-2 font-semibold text-secondary-foreground shadow">
                    {notice}
                  </p>
                )}
              </div>
              <QuickViews />
            </>
          )}
        </div>
      </div>

      {/* Below the canvas on phones; floating over it on large screens, to the right of the layers column. */}
      <div
        className={cn(
          "px-3 pt-2 lg:pointer-events-none lg:absolute lg:inset-x-0 lg:bottom-6 lg:pt-0",
          !game && "lg:pl-[14.5rem]",
          panelOpen && "lg:pr-[440px]",
        )}
      >
        <PartsList mode={ageMode} />
      </div>
      {!game && (
        <div className="px-3 pb-8 pt-2 lg:pointer-events-none lg:absolute lg:bottom-6 lg:left-3 lg:top-32 lg:flex lg:w-52 lg:flex-col lg:justify-center lg:p-0">
          <LayerControls mode={ageMode} />
        </div>
      )}
      <p className="absolute bottom-1 right-3 max-w-[70%] text-right text-[11px] leading-tight text-muted-foreground">
        {t("modelCredit")}
      </p>

      <InfoPanel mode={ageMode} />
      <JourneyPanel mode={ageMode} />
      <MicroViewer mode={ageMode} />

      <p className="sr-only" aria-live="polite">
        {selected && isPartVisible(selected, ageMode) ? t("selected", { name: getDisplayName(selected, ageMode) }) : ""}
      </p>
    </div>
  );
}
