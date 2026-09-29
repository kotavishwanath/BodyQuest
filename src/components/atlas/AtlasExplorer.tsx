"use client";

import { useProgress } from "@react-three/drei";
import { BookOpen, Layers3, RotateCcw, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { PlayfulLoader } from "@/components/ui/PlayfulLoader";
import { RequireAgeMode } from "@/components/ui/RequireAgeMode";
import { usePrefersReducedMotion, useWebGLSupport } from "@/hooks/use-client-env";
import { Link } from "@/i18n/navigation";
import { allowedSystems, retryAtlasCatalogue, searchConcepts, useAtlasCatalogue } from "@/lib/atlas/catalogue";
import { NOTE_GROUPS, getAtlasNote } from "@/lib/atlas/notes";
import { useAtlasStore, type AtlasView } from "@/lib/atlas/store";
import { ATLAS_PRESETS, atlasSystemsForMode, isAtlasMode, type AtlasPreset } from "@/lib/atlas/systems";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AtlasCatalogue, AtlasNote } from "@/types/atlas";
import { AtlasDetails } from "./AtlasDetails";

const AtlasScene = dynamic(() => import("./AtlasScene"), { ssr: false, loading: () => <PlayfulLoader /> });

type Mode = "junior" | "bipc";
const VIEWS: AtlasView[] = ["three-quarter", "front", "side", "back"];

function LoadingOverlay() {
  const t = useTranslations("Atlas");
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div role="status" className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex justify-center">
      <div className="w-72 rounded-2xl border bg-card/95 p-4 shadow-lg">
        <p className="text-sm font-semibold">{t("loading", { progress: Math.round(progress) })}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

function SearchBox({ catalogue, mode, inputRef }: { catalogue: AtlasCatalogue; mode: Mode; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const t = useTranslations("Atlas");
  const select = useAtlasStore((s) => s.select);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const isAllowed = useMemo(() => allowedSystems(catalogue, new Set(atlasSystemsForMode(mode).map((s) => s.id))), [catalogue, mode]);
  const results = useMemo(() => searchConcepts(catalogue, query, isAllowed), [catalogue, query, isAllowed]);

  const choose = (index: number) => {
    select(index);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      choose(results[active].index);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showList = open && query.trim().length > 0;
  return (
    <div className="relative w-full">
      <label className="flex min-h-[var(--tap)] items-center gap-2 rounded-full border bg-card/95 px-4 shadow-sm backdrop-blur focus-within:ring-4 focus-within:ring-ring/40">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{t("search")}</span>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={query}
          placeholder={t("searchPlaceholder")}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden rounded border px-1.5 text-[10px] text-muted-foreground sm:inline">/</kbd>
      </label>
      {showList && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-[50vh] overflow-y-auto rounded-2xl border bg-popover p-1 shadow-xl">
          <p className="px-3 py-1 text-[11px] text-muted-foreground" aria-live="polite">
            {results.length ? t("results", { count: results.length }) : t("noResults", { query })}
          </p>
          <ul id={listId} role="listbox" aria-label={t("search")}>
            {results.map((hit, i) => (
              <li
                key={hit.index}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(hit.index)}
                onMouseEnter={() => setActive(i)}
                className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm", i === active && "bg-accent text-accent-foreground")}
              >
                <span className="min-w-0 truncate">{hit.name}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{t("pieces", { count: hit.pieces })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SystemsPanel({ catalogue, mode }: { catalogue: AtlasCatalogue; mode: Mode }) {
  const t = useTranslations("Atlas");
  const visible = useAtlasStore((s) => s.visible);
  const toggleSystem = useAtlasStore((s) => s.toggleSystem);
  const setPreset = useAtlasStore((s) => s.setPreset);
  const skin = useAtlasStore((s) => s.skin);
  const toggleSkin = useAtlasStore((s) => s.toggleSkin);
  const systems = atlasSystemsForMode(mode).filter((s) => catalogue.systems[s.id]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(ATLAS_PRESETS) as AtlasPreset[]).map((preset) => (
          <button key={preset} type="button" onClick={() => setPreset(preset, mode)} className="min-h-9 rounded-full border px-3 text-xs font-semibold hover:bg-muted">
            {t(`presets.${preset}`)}
          </button>
        ))}
      </div>
      <ul className="space-y-0.5">
        {systems.map((s) => {
          const on = visible.includes(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => toggleSystem(s.id)}
                className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2 text-left text-sm hover:bg-muted"
              >
                <span
                  className={cn("size-3.5 shrink-0 rounded-full border-2 transition-opacity", !on && "opacity-30")}
                  style={{ background: on ? s.color : "transparent", borderColor: s.color }}
                  aria-hidden="true"
                />
                <span className={cn("flex-1", !on && "text-muted-foreground")}>{t(`systemNames.${s.id}`)}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{catalogue.systems[s.id]?.parts}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <label className="flex min-h-10 items-center gap-2.5 rounded-xl px-2 text-sm hover:bg-muted">
        <input type="checkbox" checked={skin} onChange={toggleSkin} className="size-4 accent-[var(--primary)]" />
        {t("bodySurface")}
      </label>
    </div>
  );
}

function NotesPanel({ catalogue, onPick }: { catalogue: AtlasCatalogue; onPick: (note: AtlasNote) => void }) {
  const t = useTranslations("Atlas");
  const mode = useAppStore((s) => s.ageMode);
  const groups = NOTE_GROUPS.filter((g) => mode === "bipc" || g.id !== "reproductive");
  const ids = useMemo(() => new Set(catalogue.concepts.map((c) => c.id)), [catalogue]);
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t("notesCount", { count: groups.reduce((n, g) => n + g.notes.length, 0) })}</p>
      {groups.map((group) => (
        <section key={group.id}>
          <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t(`groups.${group.id}`)}</h3>
          <ul className="flex flex-wrap gap-1">
            {(group.notes as AtlasNote[])
              .filter((n) => ids.has(n.concepts[0]))
              .map((note) => (
                <li key={note.id}>
                  <button type="button" onClick={() => onPick(note)} className="min-h-8 rounded-full border bg-card px-2.5 text-xs hover:bg-accent">
                    {note.title}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Dock({ mode }: { mode: Mode }) {
  const t = useTranslations("Atlas");
  const explode = useAtlasStore((s) => s.explode);
  const setExplode = useAtlasStore((s) => s.setExplode);
  const view = useAtlasStore((s) => s.view);
  const setView = useAtlasStore((s) => s.setView);
  const reset = useAtlasStore((s) => s.reset);
  const stage = explode > 0.8 ? "everyPiece" : explode > 0.05 ? "systemsApart" : "assembled";

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-2xl border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
      <label className="flex min-w-48 flex-1 flex-col gap-0.5 text-xs">
        <span className="flex justify-between font-semibold">
          {t("explode")} <span className="font-normal text-muted-foreground">{t(stage)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(explode * 100)}
          onChange={(e) => setExplode(Number(e.target.value) / 100)}
          className="accent-[var(--primary)]"
          aria-valuetext={t(stage)}
        />
      </label>
      <div role="group" aria-label={t("viewsLabel")} className="flex gap-1">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            aria-label={t("viewLabel", { view: t(`views.${v}`) })}
            disabled={explode > 0.8 && v !== "front"}
            className={cn("min-h-9 min-w-9 rounded-lg border px-2 text-xs font-semibold hover:bg-muted disabled:opacity-40", view === v && "bg-accent text-accent-foreground")}
          >
            {t(`views.${v}`)}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => reset(mode)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold hover:bg-muted">
        <RotateCcw className="size-3.5" aria-hidden="true" />
        {t("reset")}
      </button>
    </div>
  );
}

function HoverChip({ catalogue }: { catalogue: AtlasCatalogue }) {
  const hovered = useAtlasStore((s) => s.hoveredPart);
  if (hovered === null) return null;
  return (
    <p className="pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-full bg-foreground/85 px-3 py-1 text-xs font-medium text-background shadow lg:top-4">
      {catalogue.parts[hovered]?.name}
    </p>
  );
}

function AtlasApp({ catalogue, mode }: { catalogue: AtlasCatalogue; mode: Mode }) {
  const t = useTranslations("Atlas");
  const webgl = useWebGLSupport();
  const reducedMotion = usePrefersReducedMotion();
  const theme = useAppStore((s) => s.theme);
  const init = useAtlasStore((s) => s.init);
  const select = useAtlasStore((s) => s.select);
  const selected = useAtlasStore((s) => s.selected);
  const hovered = useAtlasStore((s) => s.hoveredPart);
  const [panel, setPanel] = useState<"systems" | "notes" | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const systems = useMemo(() => atlasSystemsForMode(mode).map((s) => s.id), [mode]);
  const conceptIndex = useMemo(() => new Map(catalogue.concepts.map((c, i) => [c.id, i])), [catalogue]);
  const isAllowed = useMemo(() => allowedSystems(catalogue, new Set(systems)), [catalogue, systems]);

  // Start fresh for this mode, then apply a deep link (?s=FMA7088 or ?note=heart).
  useEffect(() => {
    init(mode);
    const params = new URLSearchParams(window.location.search);
    const note = params.get("note") ? getAtlasNote(params.get("note")!) : undefined;
    const id = note?.concepts[0] ?? params.get("s");
    const index = id ? conceptIndex.get(id) : undefined;
    if (index !== undefined && isAllowed(index)) select(index);
  }, [mode, init, select, conceptIndex, isAllowed]);

  // Keep the URL shareable.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("note");
    if (selected === null) url.searchParams.delete("s");
    else url.searchParams.set("s", catalogue.concepts[selected].id);
    window.history.replaceState(window.history.state, "", url);
  }, [selected, catalogue]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape" && !typing) {
        useAtlasStore.getState().select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pickNote = (note: AtlasNote) => {
    const index = conceptIndex.get(note.concepts[0]);
    if (index !== undefined) select(index);
    setPanel(null);
  };

  const detailOpen = selected !== null;
  const sidePanel = (which: "systems" | "notes") =>
    which === "systems" ? <SystemsPanel catalogue={catalogue} mode={mode} /> : <NotesPanel catalogue={catalogue} onPick={pickNote} />;

  return (
    <div className="relative h-[calc(100dvh-6.5rem)] min-h-[520px] overflow-hidden sm:h-[calc(100dvh-3.75rem)]">
      <h1 className="sr-only">{t("title")}</h1>

      <div
        role="group"
        aria-roledescription="3D model"
        aria-label={t("canvasLabel", { count: catalogue.parts.length })}
        className={cn("absolute inset-0", hovered !== null && "cursor-pointer")}
      >
        {webgl === false ? (
          <p className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">{t("noWebgl")}</p>
        ) : webgl ? (
          <AtlasScene catalogue={catalogue} systems={systems} detailOpen={detailOpen} reducedMotion={reducedMotion} dark={theme === "dark" && mode === "bipc"} />
        ) : null}
      </div>
      <LoadingOverlay />
      <HoverChip catalogue={catalogue} />

      {/* Top bar: search + panel toggles */}
      <div className={cn("absolute left-2 right-2 top-2 z-20 flex items-start gap-2 lg:left-3 lg:w-72 lg:flex-col", detailOpen && "lg:right-auto")}>
        <SearchBox catalogue={catalogue} mode={mode} inputRef={searchRef} />
        <div className="flex gap-1.5">
          {(["systems", "notes"] as const).map((which) => (
            <button
              key={which}
              type="button"
              onClick={() => setPanel((p) => (p === which ? null : which))}
              aria-expanded={panel === which}
              className={cn(
                "inline-flex min-h-[var(--tap)] items-center gap-1.5 rounded-full border bg-card/95 px-3 text-sm font-semibold shadow-sm backdrop-blur hover:bg-muted",
                panel === which && "bg-accent text-accent-foreground",
              )}
            >
              {which === "systems" ? <Layers3 className="size-4" aria-hidden="true" /> : <BookOpen className="size-4" aria-hidden="true" />}
              <span className="hidden sm:inline">{t(which)}</span>
            </button>
          ))}
        </div>
      </div>

      {panel && (
        <aside
          aria-label={t(panel)}
          className="absolute inset-x-2 bottom-2 top-16 z-20 overflow-y-auto rounded-2xl border bg-card/97 p-3 shadow-xl backdrop-blur lg:bottom-24 lg:left-3 lg:right-auto lg:top-32 lg:w-72"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">{t(panel)}</h2>
            <button type="button" onClick={() => setPanel(null)} aria-label={t("close")} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          {sidePanel(panel)}
        </aside>
      )}

      {detailOpen && selected !== null && (
        <aside
          aria-labelledby="atlas-detail-title"
          className="absolute inset-x-0 bottom-0 z-20 h-[44%] rounded-t-3xl border-t bg-card shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[400px] lg:rounded-none lg:border-l lg:border-t-0"
        >
          <AtlasDetails key={selected} catalogue={catalogue} conceptIndex={selected} mode={mode} />
        </aside>
      )}

      <div className={cn("pointer-events-none absolute inset-x-2 bottom-2 z-10 flex justify-center lg:bottom-4", detailOpen && "hidden lg:flex lg:right-[412px]")}>
        <Dock mode={mode} />
      </div>

      <p className={cn("pointer-events-none absolute bottom-1 right-2 z-0 hidden max-w-sm text-right text-[10px] leading-tight text-muted-foreground lg:block", detailOpen && "lg:hidden")}>
        {t("credit")} {t("disclaimer")}
      </p>
    </div>
  );
}

function OlderOnly() {
  const t = useTranslations("Atlas");
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-5xl" aria-hidden="true">🧬</p>
      <h1 className="mt-3 text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-lg">{t("olderOnly")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/explore" className="inline-flex min-h-[var(--tap)] items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground">
          {t("backToExplore")}
        </Link>
        <Link href="/" className="inline-flex min-h-[var(--tap)] items-center rounded-full border px-5 font-semibold hover:bg-muted">
          {t("switchMode")}
        </Link>
      </div>
    </div>
  );
}

function AtlasLoader({ mode }: { mode: Mode }) {
  const t = useTranslations("Atlas");
  const state = useAtlasCatalogue();
  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-lg">{t("error")}</p>
        <button type="button" onClick={retryAtlasCatalogue} className="mt-4 min-h-[var(--tap)] rounded-full bg-primary px-5 font-semibold text-primary-foreground">
          {t("retry")}
        </button>
      </div>
    );
  }
  if (state.status !== "ready") {
    return (
      <div role="status" className="flex flex-1 flex-col items-center justify-center py-16">
        <PlayfulLoader />
        <p className="text-sm text-muted-foreground">{t("loadingCatalogue")}</p>
      </div>
    );
  }
  return <AtlasApp catalogue={state.data} mode={mode} />;
}

/** The in-depth anatomy atlas (Junior Doctors and BiPC Scholars). */
export function AtlasExplorer() {
  return <RequireAgeMode>{(mode) => (isAtlasMode(mode) ? <AtlasLoader mode={mode} /> : <OlderOnly />)}</RequireAgeMode>;
}
