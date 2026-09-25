"use client";

import { ContactShadows, Environment, Lightformer, OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Outline, Selection } from "@react-three/postprocessing";
import { useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-client-env";
import { useAppStore } from "@/lib/store";
import type { AgeMode } from "@/types/content";
import { AnatomyModel } from "./AnatomyModel";
import { CameraRig, HOME_SHOT } from "./CameraRig";

const STAGE_COLORS = {
  kids: "#eef0ff",
  studyLight: "#f1f4f9",
  studyDark: "#141a26",
} as const;

interface SceneProps {
  mode: AgeMode;
}

/**
 * The R3F canvas. Loaded only on the client via next/dynamic({ ssr: false })
 * from <ExplorerCanvas>.
 */
export default function Scene({ mode }: SceneProps) {
  const reducedMotion = usePrefersReducedMotion();
  const theme = useAppStore((s) => s.theme);
  const hasSelection = useAppStore((s) => s.selectedPartId !== null);
  // Pause rendering while a tissue/cell view covers the canvas.
  const paused = useAppStore((s) => s.micro !== null);

  // Adaptive quality: PerformanceMonitor lowers resolution and turns off
  // post-processing and soft shadows on slow devices.
  const [dpr, setDpr] = useState(1.5);
  const [effects, setEffects] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);

  const background =
    mode === "bipc" ? (theme === "dark" ? STAGE_COLORS.studyDark : STAGE_COLORS.studyLight) : STAGE_COLORS.kids;

  return (
    <Canvas
      dpr={[1, dpr]}
      frameloop={paused ? "never" : "always"}
      camera={{ position: HOME_SHOT.position, fov: 35, near: 0.02, far: 50 }}
      gl={{ antialias: true, powerPreference: "high-performance", stencil: true }}
      onCreated={({ gl }) => {
        // Needed for the organ cross-section (clipping planes on materials).
        gl.localClippingEnabled = true;
      }}
    >
      <color attach="background" args={[background]} />
      <PerformanceMonitor
        onIncline={() => setDpr(1.5)}
        onDecline={() => {
          setDpr(1);
          setEffects(false);
        }}
      />

      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#ffffff", "#bba9e8", 0.55]} />
      <directionalLight position={[2, 4, 3]} intensity={1.5} />
      <directionalLight position={[-3, 2, -2.5]} intensity={0.6} />
      {/* Locally generated environment lighting (no HDR download). */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.4} position={[0, 3, 3]} scale={[6, 2, 1]} />
        <Lightformer intensity={0.7} position={[-3, 1, -2]} scale={[3, 3, 1]} />
        <Lightformer intensity={0.5} position={[3, 1, 0]} rotation-y={-Math.PI / 2} scale={[3, 3, 1]} />
      </Environment>

      <Selection enabled={effects}>
        {effects && (
          <EffectComposer multisampling={4} autoClear={false} stencilBuffer>
            <Outline blur edgeStrength={6} visibleEdgeColor="#ffc53d" hiddenEdgeColor="#ffc53d" />
          </EffectComposer>
        )}
        <AnatomyModel mode={mode} reducedMotion={reducedMotion} />
      </Selection>

      {effects && <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={2.4} blur={2.4} far={1.2} resolution={256} />}

      <OrbitControls
        makeDefault
        target={HOME_SHOT.target}
        enablePan={false}
        enableDamping
        minDistance={0.3}
        maxDistance={6}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI * 0.62}
        autoRotate={!reducedMotion && !hasSelection && !userInteracted && !paused}
        autoRotateSpeed={0.5}
        onStart={() => setUserInteracted(true)}
      />
      <CameraRig reducedMotion={reducedMotion} />
    </Canvas>
  );
}
