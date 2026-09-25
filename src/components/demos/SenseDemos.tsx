"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";

/**
 * Small interactive experiments for the sense organs (Section 6, item 9).
 * Everything runs locally; the ear demo uses the Web Audio API at a gentle,
 * capped volume.
 */

const chip =
  "min-h-[var(--tap)] rounded-full border-2 bg-card px-4 font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50";

function EyeDemo() {
  const t = useTranslations("Demos");
  const [light, setLight] = useState(30);
  const pupil = 26 - (light / 100) * 17; // dark → big pupil
  return (
    <div>
      <svg viewBox="0 0 200 110" className="mx-auto h-28 w-full max-w-xs" aria-hidden="true">
        <ellipse cx="100" cy="55" rx="90" ry="48" fill="#fff" stroke="#1f2340" strokeWidth="4" />
        <circle cx="100" cy="55" r="38" fill="#4f8a8b" />
        <circle cx="100" cy="55" r={pupil} fill="#111" style={{ transition: "r 0.4s ease" }} />
        <circle cx="88" cy="42" r="6" fill="#fff" opacity="0.8" />
      </svg>
      <label className="mt-2 block text-sm font-semibold">
        {t("eyeLight")}
        <div className="flex items-center gap-2">
          <span aria-hidden="true">🌙 {t("eyeDark")}</span>
          <input type="range" min={0} max={100} value={light} onChange={(e) => setLight(Number(e.target.value))} className="w-full accent-primary" />
          <span aria-hidden="true">{t("eyeBright")} ☀️</span>
        </div>
      </label>
      <p className="mt-2">{t("eyeText")}</p>
    </div>
  );
}

function EarDemo() {
  const t = useTranslations("Demos");
  const [loud, setLoud] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => void audio.current?.close(), []);

  const play = (frequency: number) => {
    audio.current ??= new AudioContext();
    const ctx = audio.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    // Gentle volumes, faded in and out to avoid clicks.
    const peak = loud ? 0.18 : 0.05;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip} onClick={() => play(220)}>🐘 {t("earLow")}</button>
        <button type="button" className={chip} onClick={() => play(880)}>🐦 {t("earHigh")}</button>
        <button type="button" className={chip} aria-pressed={loud} onClick={() => setLoud((v) => !v)}>
          {loud ? `🔊 ${t("earLoud")}` : `🔈 ${t("earQuiet")}`}
        </button>
      </div>
      <p className="mt-2">{t("earText")}</p>
    </div>
  );
}

const SMELLS = [
  { icon: "🍋", key: "lemon" },
  { icon: "🌹", key: "rose" },
  { icon: "🍞", key: "bread" },
  { icon: "🍛", key: "curry" },
] as const;

function SmellDemo() {
  const t = useTranslations("Demos");
  const [thing, setThing] = useState<(typeof SMELLS)[number] | null>(null);
  return (
    <div>
      <p className="font-semibold">{t("smellPrompt")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SMELLS.map((s) => (
          <button key={s.key} type="button" aria-pressed={thing?.key === s.key} className={cn(chip, "text-2xl")} onClick={() => setThing(s)}>
            {s.icon}
            <span className="sr-only">{s.key}</span>
          </button>
        ))}
      </div>
      {thing && <p className="mt-2">👃 {t("smellText", { thing: thing.key })}</p>}
    </div>
  );
}

const TASTES = [
  { icon: "🍯", food: "Honey", taste: "sweet" },
  { icon: "🥨", food: "A pretzel", taste: "salty" },
  { icon: "🍋", food: "Lemon", taste: "sour" },
  { icon: "🥒", food: "Bitter gourd (karela)", taste: "bitter" },
  { icon: "🍅", food: "Tomato", taste: "savoury (umami)" },
] as const;

function TasteDemo() {
  const t = useTranslations("Demos");
  const [pick, setPick] = useState<(typeof TASTES)[number] | null>(null);
  return (
    <div>
      <p className="font-semibold">{t("tastePrompt")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {TASTES.map((item) => (
          <button key={item.taste} type="button" aria-pressed={pick?.taste === item.taste} className={cn(chip, "text-2xl")} onClick={() => setPick(item)}>
            {item.icon}
            <span className="sr-only">{item.food}</span>
          </button>
        ))}
      </div>
      {pick && <p className="mt-2">👅 {t("tasteText", { food: pick.food, taste: pick.taste })}</p>}
    </div>
  );
}

// Relative density of touch receptors (two-point discrimination: fingertips
// and lips ≈ 2–5 mm, palm ≈ 10 mm, back ≈ 40 mm).
const TOUCH_SPOTS = [
  { icon: "☝️", place: "fingertip", level: "lots", bar: 95 },
  { icon: "👄", place: "lips", level: "lots", bar: 90 },
  { icon: "✋", place: "palm", level: "some", bar: 55 },
  { icon: "🔙", place: "back", level: "few", bar: 12 },
] as const;

function TouchDemo() {
  const t = useTranslations("Demos");
  const [spot, setSpot] = useState<(typeof TOUCH_SPOTS)[number] | null>(null);
  return (
    <div>
      <p className="font-semibold">{t("touchPrompt")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {TOUCH_SPOTS.map((s) => (
          <button key={s.place} type="button" aria-pressed={spot?.place === s.place} className={cn(chip, "text-2xl")} onClick={() => setSpot(s)}>
            {s.icon}
            <span className="sr-only">{s.place}</span>
          </button>
        ))}
      </div>
      {spot && (
        <div className="mt-2">
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${spot.bar}%` }} />
          </div>
          <p className="mt-2">✋ {t("touchText", { place: spot.place, level: t(spot.level) })}</p>
        </div>
      )}
    </div>
  );
}

/** Mini-demo per part id (shown in the info panel). */
export const SENSE_DEMOS: Record<string, ComponentType> = {
  eyes: EyeDemo,
  ears: EarDemo,
  nose: SmellDemo,
  mouth: TasteDemo,
  skin: TouchDemo,
};
