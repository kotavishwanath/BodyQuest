"use client";

import { useAppStore } from "@/lib/store";

/**
 * Tiny synthesised sound effects (Web Audio). No audio files are downloaded,
 * so they also work offline. Respects the sound on/off setting.
 * When recorded clips are added to /public/sounds, swap this for Howler.js.
 */

export type SoundKind = "success" | "try" | "sticker" | "pop";

const NOTES: Record<SoundKind, { f: number; t: number }[]> = {
  success: [{ f: 523.25, t: 0 }, { f: 659.25, t: 0.1 }, { f: 783.99, t: 0.2 }],
  sticker: [{ f: 523.25, t: 0 }, { f: 659.25, t: 0.09 }, { f: 783.99, t: 0.18 }, { f: 1046.5, t: 0.27 }],
  try: [{ f: 392, t: 0 }, { f: 349.23, t: 0.14 }],
  pop: [{ f: 880, t: 0 }],
};

let context: AudioContext | null = null;

export function playSound(kind: SoundKind): void {
  if (typeof window === "undefined" || !useAppStore.getState().soundOn) return;
  try {
    context ??= new AudioContext();
    const ctx = context;
    for (const { f, t } of NOTES[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === "try" ? "sine" : "triangle";
      osc.frequency.value = f;
      const start = ctx.currentTime + t;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(kind === "try" ? 0.05 : 0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    }
  } catch {
    // Audio isn't essential; ignore devices without Web Audio.
  }
}
