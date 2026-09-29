"use client";

import { CameraControls, Environment, Lightformer, useGLTF, type CameraControlsImpl } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Box3, MathUtils, Mesh, MeshStandardMaterial, Vector3, type Object3D, type PerspectiveCamera } from "three";
import { conceptForPart } from "@/lib/atlas/catalogue";
import { BODY_CENTER_Y } from "@/lib/atlas/explode";
import { useAtlasStore, type AtlasView } from "@/lib/atlas/store";
import { ATLAS_SYSTEM } from "@/lib/atlas/systems";
import { MODEL_FILES } from "@/lib/model-index";
import type { AtlasCatalogue, AtlasSystemId } from "@/types/atlas";
import { AtlasRuntime, type RuntimeInput } from "./runtime";

export interface AtlasSceneProps {
  catalogue: AtlasCatalogue;
  systems: AtlasSystemId[];
  /** Detail panel covers the right side (desktop) or the bottom (mobile). */
  detailOpen: boolean;
  reducedMotion: boolean;
  dark: boolean;
}

/** Width of the desktop detail panel in CSS pixels (keep in sync with AtlasExplorer). */
export const DETAIL_PANEL_WIDTH = 400;
const WIDE = 1024;

const VIEW_DIRECTION: Record<AtlasView, Vector3> = {
  "three-quarter": new Vector3(0.42, 0.1, 1).normalize(),
  front: new Vector3(0, 0.03, 1).normalize(),
  side: new Vector3(1, 0.03, 0).normalize(),
  back: new Vector3(0, 0.03, -1).normalize(),
};
const BODY_BOX = new Box3(new Vector3(-0.34, 0, -0.18), new Vector3(0.34, 1.76, 0.2));

/** Gives a loaded system mesh the part-state material and custom picking. */
function prepareMesh(mesh: Mesh, runtime: AtlasRuntime, color: string) {
  const material = runtime.createMaterial(color);
  mesh.material = material;
  // Exploded parts leave the geometry's bounds, so never frustum-cull.
  mesh.frustumCulled = false;
  runtime.attachPicking(mesh);
  return material;
}

function SystemMesh({ url, color, runtime }: { url: string; color: string; runtime: AtlasRuntime }) {
  const gltf = useGLTF(url, false, true);
  const mesh = useMemo(() => {
    let found: Mesh | null = null;
    gltf.scene.traverse((o: Object3D) => {
      if (!found && (o as Mesh).isMesh) found = o as Mesh;
    });
    if (!found) throw new Error(`No mesh in ${url}`);
    return found as Mesh;
  }, [gltf, url]);

  useEffect(() => {
    const material = prepareMesh(mesh, runtime, color);
    return () => material.dispose();
  }, [mesh, runtime, color]);

  return <primitive object={gltf.scene} />;
}

/** Translucent body outline, borrowed from the kids' skin model (with shorts). */
function SkinLayer() {
  const gltf = useGLTF(MODEL_FILES.skin, false, true);
  const visible = useAtlasStore((s) => s.skin && s.explode < 0.05);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const material = new MeshStandardMaterial({ color: "#d9a384", transparent: true, opacity: 0.2, depthWrite: false, roughness: 0.8 });
    clone.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.material = material;
      mesh.renderOrder = 10;
      mesh.raycast = () => {};
    });
    return clone;
  }, [gltf]);
  return <primitive object={scene} visible={visible} />;
}

/** Animates the explode amount, uploads part state and moves the camera. */
function Director({ runtime, detailOpen, reducedMotion }: { runtime: AtlasRuntime; detailOpen: boolean; reducedMotion: boolean }) {
  const { camera, size, controls } = useThree();
  const dirty = useRef(true);
  const current = useRef(0);
  const fitKey = useRef("");
  const selectedParts = useRef<Set<number> | null>(null);

  useEffect(
    () =>
      useAtlasStore.subscribe((s, prev) => {
        dirty.current = true;
        if (s.selected !== prev.selected) {
          selectedParts.current = s.selected === null ? null : new Set(runtime.catalogue.concepts[s.selected].parts);
        }
      }),
    [runtime],
  );

  // Keep the model clear of the detail panel.
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    const wide = size.width >= WIDE;
    if (!detailOpen) cam.clearViewOffset();
    else if (wide) cam.setViewOffset(size.width, size.height, DETAIL_PANEL_WIDTH / 2, 0, size.width, size.height);
    else cam.setViewOffset(size.width, size.height, 0, size.height * 0.22, size.width, size.height);
    cam.updateProjectionMatrix();
    dirty.current = true;
    fitKey.current = "";
  }, [camera, size.width, size.height, detailOpen]);

  useFrame((_, delta) => {
    const s = useAtlasStore.getState();
    const target = s.explode;
    const moving = Math.abs(current.current - target) > 0.0005;
    if (moving) current.current = reducedMotion ? target : MathUtils.damp(current.current, target, 7, Math.min(delta, 0.05));
    else current.current = target;
    if (moving || dirty.current) {
      const input: RuntimeInput = {
        visible: new Set(s.visible),
        selectedParts: selectedParts.current,
        isolate: s.isolate,
        hoveredPart: s.hoveredPart,
      };
      runtime.update(input, current.current, size.width / size.height);
      dirty.current = false;
    }

    // Camera: re-fit after explicit requests, or once the explode settles in a new stage.
    const stage = target > 0.8 ? 2 : target > 0.05 ? 1 : 0;
    const key = `${s.cameraRequest}:${stage}:${s.selected}:${s.isolate}`;
    const cc = controls as unknown as CameraControlsImpl | null;
    if (!cc || key === fitKey.current || Math.abs(current.current - target) > 0.02) return;
    fitKey.current = key;

    const box = new Box3();
    if (s.selected !== null && selectedParts.current) runtime.boxOf(selectedParts.current, box);
    else if (stage === 2) {
      const inv = runtime.inventorySize();
      if (inv) box.set(new Vector3(-inv.width / 2, BODY_CENTER_Y - inv.height / 2, -0.05), new Vector3(inv.width / 2, BODY_CENTER_Y + inv.height / 2, 0.05));
    } else if (stage === 1) {
      const shown: number[] = [];
      runtime.flags.forEach((f, i) => f !== 0 && shown.push(i));
      runtime.boxOf(shown, box);
    }
    if (box.isEmpty()) box.copy(BODY_BOX);

    const center = box.getCenter(new Vector3());
    const radius = Math.max(0.03, box.getSize(new Vector3()).length() / 2);
    const cam = camera as PerspectiveCamera;
    const wide = size.width >= WIDE;
    const width = detailOpen && wide ? size.width - DETAIL_PANEL_WIDTH : size.width;
    const height = detailOpen && !wide ? size.height * 0.56 : size.height;
    const vFov = MathUtils.degToRad(cam.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (width / height));
    const distance = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * (stage === 2 && s.selected === null ? 0.8 : 1.02);
    const direction = stage === 2 ? VIEW_DIRECTION.front : VIEW_DIRECTION[s.view];
    const position = center.clone().addScaledVector(direction, distance);
    void cc.setLookAt(position.x, position.y, position.z, center.x, center.y, center.z, !reducedMotion);
  });

  return null;
}

export default function AtlasScene({ catalogue, systems, detailOpen, reducedMotion, dark }: AtlasSceneProps) {
  const [runtime] = useState(() => new AtlasRuntime(catalogue));
  const hover = useAtlasStore((s) => s.hover);
  const select = useAtlasStore((s) => s.select);
  const visible = useAtlasStore((s) => s.visible);
  const selected = useAtlasStore((s) => s.selected);

  // Load a system's geometry the first time it is shown (or needed by a selection).
  const [loaded, setLoaded] = useState<Set<AtlasSystemId>>(() => new Set());
  const wanted = useMemo(() => {
    const set = new Set(visible.filter((id) => systems.includes(id)));
    if (selected !== null) for (const p of catalogue.concepts[selected].parts) set.add(catalogue.parts[p].system);
    return set;
  }, [visible, selected, systems, catalogue]);
  const toLoad = [...wanted].filter((id) => !loaded.has(id));
  if (toLoad.length) setLoaded(new Set([...loaded, ...toLoad]));

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const part = e.intersections[0] ? AtlasRuntime.partOf(e.intersections[0]) : null;
    if (part !== useAtlasStore.getState().hoveredPart) hover(part);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    const part = e.intersections[0] ? AtlasRuntime.partOf(e.intersections[0]) : null;
    if (part === null) return;
    const concept = conceptForPart(catalogue, part);
    if (concept >= 0) select(concept);
  };

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0.9, 1.2, 3.4], fov: 32, near: 0.01, far: 60 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => hover(null)}
    >
      <color attach="background" args={[dark ? "#141a26" : "#eef1f4"]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#ffffff", "#c9c2b8", 0.6]} />
      <directionalLight position={[2, 4, 3]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2.5]} intensity={0.6} />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.2} position={[0, 3, 3]} scale={[6, 2, 1]} />
        <Lightformer intensity={0.6} position={[-3, 1, -2]} scale={[3, 3, 1]} />
      </Environment>

      <group onPointerMove={onMove} onPointerOut={() => hover(null)} onClick={onClick}>
        {[...loaded].map((id) => {
          const entry = catalogue.systems[id];
          return entry ? (
            <Suspense key={id} fallback={null}>
              <SystemMesh url={entry.file} color={ATLAS_SYSTEM[id].color} runtime={runtime} />
            </Suspense>
          ) : null;
        })}
      </group>
      <Suspense fallback={null}>
        <SkinLayer />
      </Suspense>

      <CameraControls makeDefault minDistance={0.04} maxDistance={14} smoothTime={0.45} draggingSmoothTime={0.1} />
      <Director runtime={runtime} detailOpen={detailOpen} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
