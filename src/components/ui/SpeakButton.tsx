"use client";

import { Square, Volume2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSpeechSupported } from "@/hooks/use-client-env";
import { speak, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";

interface SpeakButtonProps {
  text: string;
  rate?: number;
  /** Visible label; defaults to "Listen". */
  label?: string;
  className?: string;
}

/** Reads `text` aloud. Hidden when the browser has no speech support. */
export function SpeakButton({ text, rate = 1, label, className }: SpeakButtonProps) {
  const t = useTranslations("Common");
  const locale = useLocale();
  const supported = useSpeechSupported();
  const [speaking, setSpeaking] = useState(false);

  // Stop narration if the button unmounts (e.g. panel closes).
  useEffect(() => stopSpeaking, []);

  if (!supported) return null;

  const handleClick = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    void speak(text, { locale, rate }).then(() => setSpeaking(false));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={speaking}
      className={cn(
        "inline-flex min-h-[var(--tap)] items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
        className,
      )}
    >
      {speaking ? <Square className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
      <span>{speaking ? t("stop") : (label ?? t("listen"))}</span>
    </button>
  );
}
