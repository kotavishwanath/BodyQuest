"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useReducer } from "react";
import { Confetti } from "@/components/ui/Confetti";
import { Link } from "@/i18n/navigation";
import { AGE_MODE_CONFIG } from "@/lib/age-modes";
import { playSound } from "@/lib/audio";
import { FIND_IT_ROUNDS, pickFindItTargets } from "@/lib/games";
import { getDisplayName, getPart, isPartSolidInView, viewForPart } from "@/lib/parts";
import { useProgressStore } from "@/lib/progress";
import { speak } from "@/lib/speech";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AgeMode } from "@/types/content";

interface GameState {
  status: "idle" | "asking" | "correct" | "done";
  targets: string[];
  round: number;
  misses: number;
  firstTry: number;
  /** Last wrong guess (for kind feedback) and a counter to react to each miss. */
  wrong: string | null;
  missCount: number;
}

type Action = { type: "start"; targets: string[] } | { type: "guess"; partId: string } | { type: "next" };

const initial: GameState = { status: "idle", targets: [], round: 0, misses: 0, firstTry: 0, wrong: null, missCount: 0 };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "start":
      return { ...initial, status: "asking", targets: action.targets };
    case "guess": {
      if (state.status !== "asking") return state;
      if (action.partId === state.targets[state.round]) {
        return { ...state, status: "correct", firstTry: state.firstTry + (state.misses === 0 ? 1 : 0), wrong: null };
      }
      return { ...state, misses: state.misses + 1, wrong: action.partId, missCount: state.missCount + 1 };
    }
    case "next":
      if (state.round + 1 >= state.targets.length) return { ...state, status: "done" };
      return { ...state, status: "asking", round: state.round + 1, misses: 0, wrong: null };
  }
}

/**
 * "Find It!": the site names a body part and the child taps it on the 3D
 * model. Gentle hints on a miss (never a harsh "wrong"), confetti on success.
 */
export function FindItGame({ mode }: { mode: AgeMode }) {
  const t = useTranslations("FindIt");
  const tGames = useTranslations("Games");
  const locale = useLocale();
  const [state, dispatch] = useReducer(reducer, initial);
  const little = mode === "little";
  const rate = AGE_MODE_CONFIG[mode].speechRate;

  const target = state.status !== "idle" ? getPart(state.targets[state.round]) : undefined;
  const targetName = target ? (little ? target.names.common.toLowerCase() : getDisplayName(target, mode)) : "";
  const prompt = target ? (little ? t("promptLittle", { name: targetName }) : t("prompt", { name: targetName })) : "";
  const praise = t(`great.${String(state.round % 4) as "0" | "1" | "2" | "3"}`);
  const wrongPart = state.wrong ? getPart(state.wrong) : undefined;

  // Turn on game mode (taps become guesses) while this component is mounted.
  useEffect(() => {
    useAppStore.getState().setGame("find-it");
    const unsubscribe = useAppStore.subscribe((s, prev) => {
      if (s.gameGuess && s.gameGuess !== prev.gameGuess) dispatch({ type: "guess", partId: s.gameGuess.partId });
    });
    return () => {
      unsubscribe();
      useAppStore.getState().setGame(null);
    };
  }, []);

  // New round: show the layer where the target lives and ask for it.
  useEffect(() => {
    if (state.status !== "asking" || !target) return;
    const { view, setView, setHint } = useAppStore.getState();
    setHint(null);
    if (!isPartSolidInView(target, view)) setView(viewForPart(target));
    void speak(prompt, { locale, rate });
  }, [state.status, state.round, target, prompt, locale, rate]);

  // Kind feedback on a miss; after two misses the target starts to glow.
  useEffect(() => {
    if (state.missCount === 0 || !target) return;
    playSound("try");
    const text = little ? t("almostLittle") : t("almost", { name: wrongPart ? getDisplayName(wrongPart, mode) : "" });
    void speak(state.misses >= 2 ? `${text} ${t("hint")}` : text, { locale, rate });
    if (state.misses >= 2) useAppStore.getState().setHint(target.id);
  }, [state.missCount, state.misses, target, wrongPart, little, mode, locale, rate, t]);

  // Celebrate, then move to the next round.
  useEffect(() => {
    if (state.status !== "correct") return;
    playSound("success");
    useAppStore.getState().setHint(null);
    void speak(praise, { locale, rate });
    const id = window.setTimeout(() => dispatch({ type: "next" }), 1800);
    return () => window.clearTimeout(id);
  }, [state.status, praise, locale, rate]);

  useEffect(() => {
    if (state.status !== "done") return;
    useProgressStore.getState().recordEvent("find-it-complete", mode);
    void speak(t("done"), { locale, rate });
  }, [state.status, mode, locale, rate, t]);

  const card = "pointer-events-auto mx-auto w-full max-w-md rounded-3xl border-4 border-primary/30 bg-card/95 p-4 text-center shadow-xl";

  if (state.status === "idle") {
    return (
      <div className={card}>
        <p className="text-3xl font-bold">🎯 {t("title")}</p>
        <button
          type="button"
          onClick={() => dispatch({ type: "start", targets: pickFindItTargets(mode) })}
          className="mt-3 min-h-[var(--tap)] rounded-full bg-primary px-10 text-2xl font-bold text-primary-foreground hover:brightness-110"
        >
          ▶ {tGames("play")}
        </button>
        <p className="mt-2 text-sm text-muted-foreground">{t("listHint")}</p>
      </div>
    );
  }

  if (state.status === "done") {
    return (
      <div className={card} role="status" aria-live="polite">
        <Confetti burst={999} />
        <p className="text-3xl font-bold">🎉 {t("done")}</p>
        <p className="mt-1 text-4xl" aria-hidden="true">
          {"⭐".repeat(Math.max(1, Math.round((state.firstTry / FIND_IT_ROUNDS) * 3)))}
        </p>
        <p className="mt-1 text-lg">{t("score", { first: state.firstTry, total: state.targets.length })}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "start", targets: pickFindItTargets(mode) })}
            className="min-h-[var(--tap)] rounded-full bg-primary px-6 text-lg font-bold text-primary-foreground hover:brightness-110"
          >
            🔁 {tGames("playAgain")}
          </button>
          <Link href="/games" className="inline-flex min-h-[var(--tap)] items-center rounded-full border-2 px-6 text-lg font-semibold hover:bg-muted">
            {tGames("backToGames")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(card, "p-3 sm:p-4")} aria-live="polite">
      <Confetti burst={state.status === "correct" ? state.round + 1 : 0} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-muted-foreground">{t("round", { current: state.round + 1, total: state.targets.length })}</p>
        <button
          type="button"
          onClick={() => void speak(prompt, { locale, rate })}
          className="min-h-[var(--tap)] rounded-full border-2 px-4 text-sm font-semibold hover:bg-muted"
        >
          🔊 {t("repeat")}
        </button>
      </div>
      <p className={cn("mt-1 font-bold", little ? "text-2xl sm:text-4xl" : "text-xl sm:text-2xl")}>
        {little && target?.icon && <span aria-hidden="true">{target.icon} </span>}
        {state.status === "correct" ? `🎉 ${praise}` : prompt}
      </p>
      {state.status === "asking" && state.wrong && (
        <p className="mt-1 text-base sm:text-lg">
          {little ? t("almostLittle") : t("almost", { name: wrongPart ? getDisplayName(wrongPart, mode) : "" })}
          {state.misses >= 2 && ` ${t("hint")}`}
        </p>
      )}
    </div>
  );
}
