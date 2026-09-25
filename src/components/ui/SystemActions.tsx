"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { AGE_MODE_CONFIG } from "@/lib/age-modes";
import { breathAmount, isInhaling } from "@/lib/breathing";
import { getJourney, journeySteps, journeyText, type Journey } from "@/lib/journeys";
import { getDisplayName, getPart } from "@/lib/parts";
import { useProgressStore } from "@/lib/progress";
import { speak, stopSpeaking } from "@/lib/speech";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AgeMode } from "@/types/content";

const actionButton =
  "pointer-events-auto inline-flex min-h-[var(--tap)] items-center gap-2 rounded-full border-2 bg-card px-4 font-semibold shadow hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50";

/** Starts a journey from its first stop that is shown in this age mode. */
function startJourney(journey: Journey, mode: AgeMode) {
  const steps = journeySteps(journey, mode);
  if (steps.length === 0) return;
  const { setView, setJourney, focusPart } = useAppStore.getState();
  if (journey.view) setView(journey.view);
  setJourney({ id: journey.id, step: 0 });
  focusPart(steps[0].partId);
}

/** Context buttons: body tour, breathe, send a signal, follow the food. */
export function SystemActions({ mode }: { mode: AgeMode }) {
  const t = useTranslations("Actions");
  const tJourneys = useTranslations("Journeys");
  const view = useAppStore((s) => s.view);
  const selectedId = useAppStore((s) => s.selectedPartId);
  const breathing = useAppStore((s) => s.breathingSince !== null);
  const journey = useAppStore((s) => s.journey);
  const game = useAppStore((s) => s.game);
  const toggleBreathing = useAppStore((s) => s.toggleBreathing);
  const sendSignal = useAppStore((s) => s.sendSignal);

  if (journey || game) return null;
  const selected = selectedId ? getPart(selectedId) : undefined;
  const breathingContext = view === "respiratory" || selected?.system === "respiratory" || selected?.id === "diaphragm";
  const food = getJourney("follow-the-food");
  const tour = getJourney("grand-tour");
  const little = mode === "little";

  return (
    <div className="flex flex-wrap gap-2">
      {tour?.visibleInModes.includes(mode) && !selectedId && (
        <button type="button" onClick={() => startJourney(tour, mode)} className={cn(actionButton, little && "text-xl")}>
          🚌 {tJourneys("start-grand-tour")}
        </button>
      )}
      {!little && (breathingContext || breathing) && (
        <button type="button" aria-pressed={breathing} onClick={toggleBreathing} className={cn(actionButton, breathing && "border-primary")}>
          🌬️ {breathing ? t("stopBreathing") : t("breathe")}
        </button>
      )}
      {!little && view === "nervous" && (
        <button type="button" onClick={sendSignal} className={actionButton}>
          ⚡ {t("signal")}
        </button>
      )}
      {view === "digestive" && food?.visibleInModes.includes(mode) && (
        <button type="button" onClick={() => startJourney(food, mode)} className={actionButton}>
          🍎 {t("followFood")}
        </button>
      )}
    </div>
  );
}

/** "Breathe in… / Breathe out…" guide, in time with the 3D lungs. */
export function BreathingGuide() {
  const t = useTranslations("Actions");
  const since = useAppStore((s) => s.breathingSince);
  const circle = useRef<HTMLDivElement>(null);
  const [inhaling, setInhaling] = useState(true);

  useEffect(() => {
    if (since === null) return;
    let frame = 0;
    const tick = () => {
      const seconds = (performance.now() - since) / 1000;
      if (circle.current) circle.current.style.transform = `scale(${0.55 + 0.45 * breathAmount(seconds)})`;
      setInhaling(isInhaling(seconds));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [since]);

  if (since === null) return null;
  return (
    <div className="pointer-events-none flex items-center gap-3 rounded-full bg-card/90 py-2 pl-2 pr-5 shadow" role="status" aria-live="polite">
      <div className="flex size-14 items-center justify-center">
        <div ref={circle} className="size-14 rounded-full bg-sky-300/80 ring-4 ring-sky-400/60" />
      </div>
      <span className="text-lg font-bold">{inhaling ? t("breatheIn") : t("breatheOut")}</span>
    </div>
  );
}

const STEP_SECONDS = 7;

/** Guided journey panel: narrates each stop and moves the camera. */
export function JourneyPanel({ mode }: { mode: AgeMode }) {
  const t = useTranslations("Actions");
  const tJourneys = useTranslations("Journeys");
  const locale = useLocale();
  const journey = useAppStore((s) => s.journey);
  const setJourney = useAppStore((s) => s.setJourney);
  const focusPart = useAppStore((s) => s.focusPart);

  const data = journey ? getJourney(journey.id) : undefined;
  const steps = data ? journeySteps(data, mode) : [];
  const step = journey ? steps[journey.step] : undefined;
  const part = step ? getPart(step.partId) : undefined;
  const text = step ? journeyText(step, mode) : "";
  const total = steps.length;

  // Narrate each stop, then move on once the narration has finished and the
  // stop has been shown for at least STEP_SECONDS (works without speech too).
  useEffect(() => {
    if (!data || !journey || !text) return;
    const advance = () => {
      const nextStep = journey.step + 1;
      if (nextStep >= total) {
        useProgressStore.getState().recordEvent(`${data.id}-complete`, mode);
        setJourney(null);
        return;
      }
      setJourney({ id: data.id, step: nextStep });
      focusPart(journeySteps(data, mode)[nextStep].partId);
    };
    let cancelled = false;
    let spoken = false;
    let shown = false;
    const maybeNext = () => {
      if (!cancelled && spoken && shown) advance();
    };
    const timer = window.setTimeout(() => {
      shown = true;
      maybeNext();
    }, STEP_SECONDS * 1000);
    void speak(text, { locale, rate: AGE_MODE_CONFIG[mode].speechRate }).then(() => {
      spoken = true;
      maybeNext();
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopSpeaking();
    };
  }, [data, journey, text, total, locale, mode, setJourney, focusPart]);

  if (!data || !journey || !step || !part) return null;

  const goNext = () => {
    const nextStep = journey.step + 1;
    if (nextStep >= total) {
      useProgressStore.getState().recordEvent(`${data.id}-complete`, mode);
      setJourney(null);
      return;
    }
    setJourney({ id: data.id, step: nextStep });
    focusPart(steps[nextStep].partId);
  };

  return (
    <section
      aria-live="polite"
      className="absolute inset-x-2 bottom-2 z-20 rounded-3xl border-2 bg-card p-5 shadow-2xl lg:inset-x-auto lg:bottom-4 lg:right-4 lg:w-[420px]"
    >
      <p className="text-sm font-bold uppercase tracking-wide text-primary">
        {data.id === "grand-tour" ? "🚌" : "🍎"} {tJourneys(data.id)} · {t("journeyStep", { current: journey.step + 1, total })}
      </p>
      <h2 className={cn("mt-1 font-bold", mode === "little" ? "text-4xl" : "text-2xl")}>
        {part.icon && <span aria-hidden="true">{part.icon} </span>}
        {getDisplayName(part, mode)}
      </h2>
      <p className={cn("mt-2 leading-relaxed", mode === "little" ? "text-2xl" : "text-lg")}>{text}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={goNext} className="min-h-[var(--tap)] rounded-full bg-primary px-5 font-bold text-primary-foreground hover:brightness-110">
          {t("journeyNext")} →
        </button>
        <button type="button" onClick={() => setJourney(null)} className="min-h-[var(--tap)] rounded-full border-2 px-5 font-semibold hover:bg-muted">
          {t("journeyStop")}
        </button>
      </div>
    </section>
  );
}
