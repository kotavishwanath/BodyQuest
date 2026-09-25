"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CatmullRomCurve3, Vector3, type Mesh } from "three";
import { getJourney, journeySteps } from "@/lib/journeys";
import { SIGNAL_PATH } from "@/lib/model-index";
import { getPart, getPartNode } from "@/lib/parts";
import { useAppStore } from "@/lib/store";
import type { AgeMode } from "@/types/content";

const PULSES = 3;
const TRAIL = 4;
const PULSE_SECONDS = 2.2;
const AUTO_PULSE_SECONDS = 3.5;

/**
 * Glowing "messages" travelling from the brain down the spinal cord to the
 * right hand (Section 6, nervous system). Shown in the nervous-system view;
 * the "Send a message" button fires extra pulses. Place inside the body group.
 */
export function NerveSignals({ reducedMotion }: { reducedMotion: boolean }) {
  const view = useAppStore((s) => s.view);
  const signalRequest = useAppStore((s) => s.signalRequest);
  const curve = useMemo(() => new CatmullRomCurve3(SIGNAL_PATH.map((p) => new Vector3(...p))), []);
  const meshes = useRef<(Mesh | null)[]>([]);
  const starts = useRef<number[]>(Array(PULSES).fill(-Infinity));
  const lastAuto = useRef(0);
  const pending = useRef(0);
  const point = useMemo(() => new Vector3(), []);

  const active = view === "nervous";

  // Queue a pulse whenever the button is pressed (consumed in the frame loop).
  useEffect(() => {
    if (signalRequest > 0) pending.current += 1;
  }, [signalRequest]);

  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    const launch = () => {
      const free = starts.current.findIndex((s) => now - s > PULSE_SECONDS);
      if (free >= 0) starts.current[free] = now;
    };
    if (pending.current > 0) {
      pending.current -= 1;
      launch();
    }
    if (active && !reducedMotion && now - lastAuto.current > AUTO_PULSE_SECONDS) {
      lastAuto.current = now;
      launch();
    }
    for (let p = 0; p < PULSES; p++) {
      const t = (now - starts.current[p]) / PULSE_SECONDS;
      for (let k = 0; k < TRAIL; k++) {
        const mesh = meshes.current[p * TRAIL + k];
        if (!mesh) continue;
        const tk = t - k * 0.025;
        mesh.visible = (active || t < 1) && tk >= 0 && tk <= 1;
        if (mesh.visible) mesh.position.copy(curve.getPointAt(tk, point));
      }
    }
  });

  return (
    <>
      {Array.from({ length: PULSES * TRAIL }, (_, i) => {
        const k = i % TRAIL;
        return (
          <mesh
            key={i}
            ref={(m) => {
              meshes.current[i] = m;
            }}
            visible={false}
            renderOrder={10}
            raycast={() => null}
          >
            <sphereGeometry args={[0.012 * (1 - k * 0.2), 12, 8]} />
            <meshBasicMaterial color={k === 0 ? "#fffbd1" : "#ffd84a"} transparent opacity={1 - k * 0.22} depthTest={false} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
}

/** A little "food ball" that travels between the stops of a journey. */
export function JourneyMarker({ mode }: { mode: AgeMode }) {
  const journey = useAppStore((s) => s.journey);
  const ref = useRef<Mesh>(null);
  const target = useMemo(() => new Vector3(), []);

  const data = journey ? getJourney(journey.id) : undefined;
  const step = data?.marker && journey ? journeySteps(data, mode)[journey.step] : undefined;
  const part = step ? getPart(step.partId) : undefined;
  const node = part ? getPartNode(part) : undefined;

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh || !node) return;
    target.set(...node.center);
    // Start at the first stop instantly, then glide between stops.
    if (!mesh.visible) mesh.position.copy(target);
    mesh.visible = true;
    mesh.position.lerp(target, Math.min(1, delta * 2.5));
  });

  if (!node) return null;
  return (
    <mesh ref={ref} visible={false} renderOrder={10} raycast={() => null}>
      <sphereGeometry args={[0.022, 20, 14]} />
      <meshBasicMaterial color="#ffb703" depthTest={false} toneMapped={false} />
    </mesh>
  );
}
