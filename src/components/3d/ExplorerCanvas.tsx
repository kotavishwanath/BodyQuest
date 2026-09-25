"use client";

import dynamic from "next/dynamic";
import { useProgress } from "@react-three/drei";
import { useTranslations } from "next-intl";
import { Suspense, type KeyboardEvent } from "react";
import { PlayfulLoader } from "@/components/ui/PlayfulLoader";
import { useWebGLSupport } from "@/hooks/use-client-env";
import { useAppStore } from "@/lib/store";
import type { AgeMode } from "@/types/content";
import { FloatingLabel } from "./PartLabel";

// ssr:false must be used from a Client Component in the App Router.
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => <PlayfulLoader />,
});

const ROTATE_STEP = Math.PI / 8;

/** Shows download progress while anatomy models are loading. */
function ModelLoadingOverlay({ label }: { label: string }) {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <p className="rounded-full bg-card/95 px-5 py-2 text-lg font-semibold shadow">
        <span className="mr-2 inline-block animate-heartbeat" aria-hidden="true">❤️</span>
        {label} {Math.round(progress)}%
      </p>
    </div>
  );
}

/**
 * Wraps the 3D scene: WebGL detection (2D fallback), lazy loading and
 * keyboard controls (← → rotate, Esc deselect).
 */
export function ExplorerCanvas({ mode }: { mode: AgeMode }) {
  const t = useTranslations("Explore");
  const tCommon = useTranslations("Common");
  const webgl = useWebGLSupport();
  const rotateModel = useAppStore((s) => s.rotateModel);
  const focusPart = useAppStore((s) => s.focusPart);

  if (webgl === null) return <PlayfulLoader />;

  if (!webgl) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="max-w-md rounded-3xl bg-card p-6 text-center text-lg shadow">
          <span className="mb-2 block text-5xl" aria-hidden="true">🖼️</span>
          {t("noWebgl")}
        </p>
      </div>
    );
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotateModel(-ROTATE_STEP);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      rotateModel(ROTATE_STEP);
    } else if (event.key === "Escape") {
      focusPart(null);
    }
  };

  return (
    <div
      tabIndex={0}
      role="group"
      aria-roledescription="3D model"
      aria-label={t("canvasLabel")}
      onKeyDown={handleKeyDown}
      className="absolute inset-0 touch-none outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ring/60"
    >
      <Suspense fallback={<PlayfulLoader />}>
        <Scene mode={mode} />
      </Suspense>
      <FloatingLabel mode={mode} />
      <ModelLoadingOverlay label={tCommon("loading")} />
    </div>
  );
}
