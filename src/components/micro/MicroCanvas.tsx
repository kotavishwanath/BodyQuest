"use client";

import { Bounds, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { usePrefersReducedMotion } from "@/hooks/use-client-env";
import { MicroSceneContent, type MicroSceneProps } from "./MicroScenes";

/** Second, lightweight canvas for the tissue and cell views (client only). */
export default function MicroCanvas(props: MicroSceneProps & { background: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const { background, ...scene } = props;
  const wide = scene.level === "cell" && scene.cellScene === "gallery";

  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: wide ? [0, 1.2, 7.5] : [1.8, 2.8, 3.6], fov: 45 }} onPointerMissed={() => scene.pick("")}>
      <color attach="background" args={[background]} />
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#ffffff", "#bba9e8", 0.5]} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} />
      <Bounds fit clip observe margin={1.1}>
        <MicroSceneContent {...scene} />
      </Bounds>
      <OrbitControls enablePan={false} minDistance={2.5} maxDistance={11} autoRotate={!reducedMotion} autoRotateSpeed={0.6} makeDefault />
    </Canvas>
  );
}
