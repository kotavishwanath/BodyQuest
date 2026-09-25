/**
 * Read-aloud narration using the Web Speech API (SpeechSynthesis).
 * If no voice exists for the requested language we fall back to English.
 * Runs entirely on-device; no audio is sent anywhere.
 */

const VOICE_PREFERENCES: Record<string, string[]> = {
  en: ["en-IN", "en-GB", "en-US", "en"],
  hi: ["hi-IN", "hi"],
  te: ["te-IN", "te"],
};

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(locale: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return undefined;

  const preferences = [
    ...(VOICE_PREFERENCES[locale] ?? [locale]),
    ...VOICE_PREFERENCES.en,
  ];
  for (const tag of preferences) {
    const lower = tag.toLowerCase();
    const match = voices.find((voice) =>
      voice.lang.toLowerCase().replace("_", "-").startsWith(lower),
    );
    if (match) return match;
  }
  return undefined;
}

export interface SpeakOptions {
  locale?: string;
  rate?: number;
}

/** Speaks `text`, cancelling anything already playing. Resolves when done. */
export function speak(text: string, { locale = "en", rate = 1 }: SpeakOptions = {}): Promise<void> {
  if (!isSpeechSupported() || !text.trim()) return Promise.resolve();

  const synth = window.speechSynthesis;
  synth.cancel();

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(locale);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-IN";
    utterance.rate = rate;
    utterance.pitch = 1.05;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
