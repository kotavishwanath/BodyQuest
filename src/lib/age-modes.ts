import type { AgeMode } from "@/types/content";

export interface AgeModeConfig {
  id: AgeMode;
  emoji: string;
  /** UI theme: playful for kids, focused "study" theme for BiPC. */
  theme: "kids" | "study";
  /** Visual style of the 3D model (Section 13). */
  modelStyle: "cartoon" | "semi-realistic" | "realistic";
  /** Tailwind classes for the picker card background. */
  cardClass: string;
  /** Narration speed for SpeechSynthesis. */
  speechRate: number;
  /** Speak automatically when a part is selected (pre-readers). */
  autoSpeak: boolean;
}

export const AGE_MODE_CONFIG: Record<AgeMode, AgeModeConfig> = {
  little: {
    id: "little",
    emoji: "🐣",
    theme: "kids",
    modelStyle: "cartoon",
    cardClass: "bg-amber-100 hover:bg-amber-200 border-amber-300",
    speechRate: 0.85,
    autoSpeak: true,
  },
  young: {
    id: "young",
    emoji: "🚀",
    theme: "kids",
    modelStyle: "cartoon",
    cardClass: "bg-sky-100 hover:bg-sky-200 border-sky-300",
    speechRate: 0.95,
    autoSpeak: false,
  },
  junior: {
    id: "junior",
    emoji: "🔬",
    theme: "kids",
    modelStyle: "semi-realistic",
    cardClass: "bg-emerald-100 hover:bg-emerald-200 border-emerald-300",
    speechRate: 1,
    autoSpeak: false,
  },
  bipc: {
    id: "bipc",
    emoji: "🩺",
    theme: "study",
    modelStyle: "realistic",
    cardClass: "bg-slate-100 hover:bg-slate-200 border-slate-300",
    speechRate: 1,
    autoSpeak: false,
  },
};
