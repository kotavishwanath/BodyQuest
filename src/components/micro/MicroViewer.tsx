"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PlayfulLoader } from "@/components/ui/PlayfulLoader";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { AGE_MODE_CONFIG } from "@/lib/age-modes";
import { canSeeCells, CELL_SCENES, getTissue, microText } from "@/lib/micro";
import { getDisplayName, getPart } from "@/lib/parts";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AgeMode } from "@/types/content";
import type { CellSceneId, MicroStructure } from "@/types/micro";

const MicroCanvas = dynamic(() => import("./MicroCanvas"), { ssr: false, loading: () => <PlayfulLoader /> });

const STAGE = { kids: "#f3eefe", studyLight: "#eef2f8", studyDark: "#121826" } as const;

/**
 * Level 3 (tissue) and Level 4 (cell) views, opened with a magnifying-glass
 * transition over the 3D body. Structures can be picked in 3D or from the list.
 */
export function MicroViewer({ mode }: { mode: AgeMode }) {
  const t = useTranslations("Micro");
  const tExplore = useTranslations("Explore");
  const tActions = useTranslations("Actions");
  const micro = useAppStore((s) => s.micro);
  const openMicro = useAppStore((s) => s.openMicro);
  const selectedPartId = useAppStore((s) => s.selectedPartId);
  const theme = useAppStore((s) => s.theme);
  const [cellScene, setCellScene] = useState<CellSceneId>("cell");
  const [picked, setPicked] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  if (!micro) return null;

  const tissue = getTissue(micro.tissue);
  const cellContent = CELL_SCENES.find((c) => c.id === cellScene)!;
  const content = micro.level === "tissue" ? tissue : cellContent;
  const structure: MicroStructure | undefined = content.structures.find((s) => s.id === picked);
  const part = selectedPartId ? getPart(selectedPartId) : undefined;
  const background = mode === "bipc" ? (theme === "dark" ? STAGE.studyDark : STAGE.studyLight) : STAGE.kids;

  const title = structure ? microText(structure.name, mode) : microText(content.name, mode);
  const body = structure ? microText(structure.text, mode) : microText(content.intro, mode);

  const goBack = () => {
    setPicked(null);
    if (micro.level === "cell") openMicro({ ...micro, level: "tissue" });
    else openMicro(null);
  };
  const pick = (id: string) => setPicked(id || null);

  return (
    <motion.section
      aria-label={microText(tissue.name, mode)}
      initial={{ clipPath: "circle(0% at 50% 45%)" }}
      animate={{ clipPath: "circle(150% at 50% 45%)" }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      className="absolute inset-0 z-40 flex flex-col"
      style={{ background }}
    >
      {/* Top bar: back, trail, level tabs */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex min-h-[var(--tap)] items-center gap-2 rounded-full bg-primary px-5 text-lg font-bold text-primary-foreground shadow-md hover:brightness-110"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          {tExplore("goBack")}
        </button>
        <nav aria-label={tExplore("breadcrumb")} className="rounded-full bg-card/90 px-3 py-1.5 text-sm font-semibold shadow">
          <ol className="flex flex-wrap items-center gap-1">
            {part && <li>{getDisplayName(part, mode)}</li>}
            <li className="flex items-center gap-1">
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              {micro.level === "tissue" ? (
                <span aria-current="location" className="text-primary">{microText(tissue.name, mode)}</span>
              ) : (
                <button type="button" className="underline-offset-4 hover:underline" onClick={goBack}>
                  {microText(tissue.name, mode)}
                </button>
              )}
            </li>
            {micro.level === "cell" && (
              <li className="flex items-center gap-1">
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                <span aria-current="location" className="text-primary">{t("cellLevel")}</span>
              </li>
            )}
          </ol>
        </nav>
        <div className="ml-auto flex flex-wrap gap-2">
          {micro.level === "tissue" && canSeeCells(mode) && (
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                openMicro({ ...micro, level: "cell" });
              }}
              className="inline-flex min-h-[var(--tap)] items-center gap-2 rounded-full border-2 bg-card px-4 font-semibold shadow hover:bg-accent"
            >
              🔬 {tActions("cells")}
            </button>
          )}
          {micro.level === "cell" &&
            (["cell", "gallery"] as const).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={cellScene === id}
                onClick={() => {
                  setPicked(null);
                  setCellScene(id);
                }}
                className={cn(
                  "min-h-[var(--tap)] rounded-full border-2 bg-card px-4 font-semibold shadow hover:bg-accent",
                  cellScene === id && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {id === "cell" ? t("insideCell") : t("meetCells")}
              </button>
            ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1" role="group" aria-roledescription="3D model" aria-label={t("canvasLabel")}>
        <MicroCanvas
          tissue={micro.tissue}
          level={micro.level}
          cellScene={cellScene}
          selected={picked}
          hovered={hovered}
          pick={pick}
          hover={setHovered}
          background={background}
        />
        <p className="pointer-events-none absolute bottom-2 right-3 text-xs text-muted-foreground">{t("stylised")}</p>
      </div>

      {/* Info card + structure list (keyboard / screen-reader access) */}
      <div className="max-h-[45%] overflow-y-auto border-t-2 bg-card/95 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-1 max-w-2xl leading-relaxed" aria-live="polite">{body}</p>
            {!structure && <p className="mt-1 text-sm text-muted-foreground">{t("tapToLearn")}</p>}
          </div>
          <SpeakButton text={`${title}. ${body}`} rate={AGE_MODE_CONFIG[mode].speechRate} />
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {content.structures.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={picked === s.id}
                onClick={() => pick(s.id)}
                onMouseEnter={() => setHovered(s.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(s.id)}
                onBlur={() => setHovered(null)}
                className={cn(
                  "min-h-[var(--tap)] rounded-full border-2 bg-card px-4 font-semibold hover:bg-accent",
                  picked === s.id && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {microText(s.name, mode)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
