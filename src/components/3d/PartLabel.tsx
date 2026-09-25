"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import { Vector3, type Group } from "three";
import { getDisplayName, getPart, getPartNode, isPartVisible } from "@/lib/parts";
import { useAppStore } from "@/lib/store";
import type { AgeMode } from "@/types/content";

/**
 * Floating part label rendered in the DOM (outside the canvas) and moved each
 * frame by <LabelTracker>. This avoids drei's <Html>, whose separate React
 * root causes unmount warnings with React 19.
 */
const labelElement: { current: HTMLDivElement | null } = { current: null };

function useLabelPart(mode: AgeMode) {
  const labelId = useAppStore((s) => (s.game ? null : (s.hoveredPartId ?? s.selectedPartId)));
  const found = labelId ? getPart(labelId) : undefined;
  return found && isPartVisible(found, mode) ? found : undefined;
}

/** DOM side: place inside the canvas wrapper (position: relative). */
export function FloatingLabel({ mode }: { mode: AgeMode }) {
  const part = useLabelPart(mode);
  return (
    <div
      ref={(el) => {
        labelElement.current = el;
      }}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-10 will-change-transform"
      style={{ visibility: "hidden" }}
    >
      {part && (
        <div
          className={
            mode === "little"
              ? "whitespace-nowrap rounded-full bg-white px-5 py-2 text-3xl font-bold text-slate-900 shadow-lg"
              : "whitespace-nowrap rounded-full bg-white/95 px-3 py-1 text-base font-semibold text-slate-900 shadow-md"
          }
        >
          {part.icon && mode === "little" ? `${part.icon} ` : ""}
          {getDisplayName(part, mode)}
        </div>
      )}
    </div>
  );
}

/** Canvas side: projects the label anchor to screen space every frame. */
export function LabelTracker({ mode, bodyRef }: { mode: AgeMode; bodyRef: RefObject<Group | null> }) {
  const part = useLabelPart(mode);
  const point = useRef(new Vector3());

  useFrame(({ camera, size }) => {
    const el = labelElement.current;
    const body = bodyRef.current;
    if (!el) return;
    const node = part ? getPartNode(part) : undefined;
    if (!part || !node || !body) {
      el.style.visibility = "hidden";
      return;
    }
    const [x, y, z] = useAppStore.getState().labelAnchor ?? node.center;
    const p = point.current.set(x, y + 0.04, z);
    body.localToWorld(p).project(camera);
    if (p.z > 1) {
      el.style.visibility = "hidden";
      return;
    }
    const sx = ((p.x + 1) / 2) * size.width;
    const sy = ((1 - p.y) / 2) * size.height;
    el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -120%)`;
    el.style.visibility = "visible";
  });

  return null;
}
