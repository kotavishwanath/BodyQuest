"use client";

import { useSyncExternalStore } from "react";
import { isSpeechSupported } from "@/lib/speech";
import { useAppStore } from "@/lib/store";

/*
 * Hooks for browser-only information. They use useSyncExternalStore so the
 * server/static HTML always renders the "unknown" state and the client updates
 * after hydration without mismatches.
 */

const noopSubscribe = () => () => {};

/** True once persisted settings have been loaded from localStorage. */
export function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useAppStore.persist.onFinishHydration(onChange),
    () => useAppStore.persist.hasHydrated(),
    () => false,
  );
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(REDUCED_MOTION_QUERY);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

let webglSupport: boolean | undefined;

function detectWebGL(): boolean {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = Boolean(
        canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
      );
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

/** `null` while unknown (server render), then true/false on the client. */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(noopSubscribe, detectWebGL, () => null);
}

export function useSpeechSupported(): boolean {
  return useSyncExternalStore(noopSubscribe, isSpeechSupported, () => false);
}
