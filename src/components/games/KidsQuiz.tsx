"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Confetti } from "@/components/ui/Confetti";
import { Link } from "@/i18n/navigation";
import { AGE_MODE_CONFIG } from "@/lib/age-modes";
import { playSound } from "@/lib/audio";
import { defaultQuizLevel, pickQuestions, QUIZ_LEVELS, type KidsQuestion } from "@/lib/games";
import { useProgressStore, type QuizLevel } from "@/lib/progress";
import { speak } from "@/lib/speech";
import { cn } from "@/lib/utils";
import type { AgeMode } from "@/types/content";

/** Kids' quiz with three levels (Tiny tots, Easy, Tricky). Kind feedback only. */
export function KidsQuiz({ mode }: { mode: AgeMode }) {
  const t = useTranslations("Quiz");
  const tGames = useTranslations("Games");
  const locale = useLocale();
  const rate = AGE_MODE_CONFIG[mode].speechRate;
  const [level, setLevel] = useState<QuizLevel>(defaultQuizLevel(mode));
  const [questions, setQuestions] = useState<KidsQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const best = useProgressStore((s) => s.quizBest[level]);
  const setQuizBest = useProgressStore((s) => s.setQuizBest);
  const recordEvent = useProgressStore((s) => s.recordEvent);

  const pictures = level === "little";
  const question = questions?.[index];

  const ask = (q: KidsQuestion) => {
    // Tiny tots may not read yet, so read out the question and the choices.
    const options = pictures ? ` ${q.options.map((o) => o.replace(/^\S+\s/, "")).join(", ")}?` : "";
    void speak(`${q.question}${options}`, { locale, rate });
  };

  const start = () => {
    const picked = pickQuestions(level);
    setQuestions(picked);
    setIndex(0);
    setChoice(null);
    setScore(0);
    setFinished(false);
    if (picked[0]) ask(picked[0]);
  };

  const answer = (i: number) => {
    if (!question || choice !== null) return;
    setChoice(i);
    const right = i === question.answer;
    if (right) setScore((s) => s + 1);
    playSound(right ? "success" : "try");
    const feedback = right ? t("correct") : t("notQuite", { answer: question.options[question.answer] });
    void speak(`${feedback.replace("🎉", "")} ${question.explain}`, { locale, rate });
  };

  const next = () => {
    if (!questions) return;
    if (index + 1 >= questions.length) {
      setFinished(true);
      setQuizBest(level, score);
      if (score === questions.length) recordEvent("quiz-perfect", mode);
      playSound("sticker");
      void speak(t("score", { score, total: questions.length }), { locale, rate });
      return;
    }
    setIndex(index + 1);
    setChoice(null);
    ask(questions[index + 1]);
  };

  if (!questions) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border-2 bg-card p-6 text-center shadow">
        <h2 className="text-2xl font-bold">{t("chooseLevel")}</h2>
        <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label={t("chooseLevel")}>
          {QUIZ_LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              onClick={() => setLevel(l)}
              className={cn(
                "min-h-[var(--tap)] rounded-full border-2 px-5 text-lg font-semibold hover:bg-accent",
                level === l && "border-primary bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {l === "little" ? "🐣" : l === "young" ? "🚀" : "🔬"} {t(`levels.${l}`)}
            </button>
          ))}
        </div>
        {best !== undefined && <p className="mt-3 text-muted-foreground">{t("best", { best })}</p>}
        <button type="button" onClick={start} className="mt-5 min-h-[var(--tap)] rounded-full bg-primary px-10 text-xl font-bold text-primary-foreground hover:brightness-110">
          ▶ {t("start")}
        </button>
      </div>
    );
  }

  if (finished) {
    const stars = Math.max(1, Math.round((score / questions.length) * 3));
    return (
      <div className="mx-auto max-w-xl rounded-3xl border-2 bg-card p-6 text-center shadow" role="status" aria-live="polite">
        <Confetti burst={score === questions.length ? 555 : 0} />
        <p className="text-5xl" aria-hidden="true">{"⭐".repeat(stars)}</p>
        <p className="mt-2 text-3xl font-bold">{t("score", { score, total: questions.length })}</p>
        <p className="text-muted-foreground">{tGames("stars", { count: stars })}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={start} className="min-h-[var(--tap)] rounded-full bg-primary px-6 font-bold text-primary-foreground hover:brightness-110">
            🔁 {tGames("playAgain")}
          </button>
          <button type="button" onClick={() => setQuestions(null)} className="min-h-[var(--tap)] rounded-full border-2 px-6 font-semibold hover:bg-muted">
            {t("chooseLevel")}
          </button>
          <Link href="/games" className="inline-flex min-h-[var(--tap)] items-center rounded-full border-2 px-6 font-semibold hover:bg-muted">
            {tGames("backToGames")}
          </Link>
        </div>
      </div>
    );
  }

  if (!question) return null;
  const answered = choice !== null;
  const right = choice === question.answer;

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border-2 bg-card p-6 shadow">
      <p className="text-sm font-bold text-muted-foreground">{t("question", { current: index + 1, total: questions.length })}</p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <h2 className={cn("font-bold", pictures ? "text-3xl" : "text-2xl")}>{question.question}</h2>
        <button type="button" onClick={() => ask(question)} aria-label={t("question", { current: index + 1, total: questions.length })} className="inline-flex size-[var(--tap)] shrink-0 items-center justify-center rounded-full border-2 text-xl hover:bg-muted">
          🔊
        </button>
      </div>
      <ul className={cn("mt-4 grid gap-3", pictures ? "grid-cols-3" : "sm:grid-cols-3")}>
        {question.options.map((option, i) => {
          const isAnswer = i === question.answer;
          const [icon, ...rest] = option.split(" ");
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => answer(i)}
                disabled={answered}
                className={cn(
                  "flex min-h-[var(--tap)] w-full flex-col items-center justify-center rounded-2xl border-4 bg-card p-3 text-lg font-bold transition hover:bg-accent disabled:cursor-default",
                  pictures && "min-h-28",
                  answered && isAnswer && "border-emerald-500 bg-emerald-50 text-emerald-900",
                  answered && choice === i && !isAnswer && "border-amber-400 bg-amber-50 text-amber-900",
                )}
              >
                {pictures ? (
                  <>
                    <span className="text-5xl" aria-hidden="true">{icon}</span>
                    <span>{rest.join(" ")}</span>
                  </>
                ) : (
                  option
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {answered && (
        <div className="mt-4 rounded-2xl bg-secondary p-4 text-secondary-foreground" role="status" aria-live="polite">
          <Confetti burst={right ? index + 1 : 0} />
          <p className="text-lg font-bold">{right ? t("correct") : t("notQuite", { answer: question.options[question.answer] })}</p>
          <p className="mt-1">{question.explain}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={next} className="min-h-[var(--tap)] rounded-full bg-primary px-6 font-bold text-primary-foreground hover:brightness-110">
              {index + 1 >= questions.length ? t("finish") : t("next")} →
            </button>
            {mode !== "little" && (
              <Link href={`/explore/part/${question.partId}`} className="inline-flex min-h-[var(--tap)] items-center rounded-full border-2 px-5 font-semibold hover:bg-muted">
                🔍 {t("review")}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
