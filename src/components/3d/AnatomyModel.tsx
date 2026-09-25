"use client";

import { Bvh, useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Select } from "@react-three/postprocessing";
import { Suspense, useRef, type RefObject } from "react";
import { DoubleSide, FrontSide, Mesh, type Group } from "three";
import { breathAmount } from "@/lib/breathing";
import { MODEL_FILES, MODEL_NODES, nodesInFile, type ModelFile, type RenderGroup } from "@/lib/model-index";
import { resolvePartForNode } from "@/lib/parts";
import { useAppStore } from "@/lib/store";
import { filesForView, nodeStyle, type NodeStyle, type ViewId } from "@/lib/views";
import type { AgeMode, Vec3 } from "@/types/content";
import { JourneyMarker, NerveSignals } from "./BodyEffects";
import { CrossSection, CUT_PLANE, StencilWriters } from "./CrossSection";
import { LabelTracker } from "./PartLabel";

/*
 * Real anatomy model (BodyParts3D, CC BY-SA 2.1 JP) built by `npm run models`.
 * Each GLB node is named after a `meshName` in /content/parts. Files are
 * loaded lazily per view; meshopt decoding is bundled (no CDN requests).
 */

const HIGHLIGHT = "#ffc53d";
const GHOST_OPACITY: Record<RenderGroup, number> = { skin: 0.1, muscles: 0.12, organs: 0.15, skeleton: 0.16 };
/** Neutral tint for the see-through skin silhouette (incl. shorts). */
const GHOST_SKIN = "#c8cdea";
const noRaycast = () => null;

const useModelFile = (file: ModelFile) => useGLTF(MODEL_FILES[file], false, true);

interface NodeProps {
  name: string;
  source: Mesh;
  mode: AgeMode;
  view: ViewId;
  reducedMotion: boolean;
  bodyRef: RefObject<Group | null>;
}

function AnatomyNode({ name, source, mode, view, reducedMotion, bodyRef }: NodeProps) {
  const node = MODEL_NODES[name];
  const part = resolvePartForNode(name, mode);
  const selectedPartId = useAppStore((s) => s.selectedPartId);
  const closeUp = useAppStore((s) => s.closeUp);
  const cut = useAppStore((s) => s.cut);

  let style: NodeStyle | "dim" = nodeStyle(node, view);
  // Little Explorers only see their basic parts inside the body.
  if (mode === "little" && node.group !== "skin" && style !== "ghost" && !part) style = "hidden";
  const isFocus = part !== undefined && part.id === selectedPartId;
  // Level 2 close-up: other organs fade to 10%; see-through context layers
  // are hidden so they don't stack up into a haze in front of the organ.
  if (closeUp && selectedPartId && !isFocus && style !== "hidden") style = style === "ghost" ? "hidden" : "dim";

  const interactive = style === "solid" && part !== undefined;
  const partId = interactive ? part.id : null;
  const hovered = useAppStore((s) => partId !== null && (s.hoveredPartId === partId || s.hintPartId === partId));
  const selected = partId !== null && selectedPartId === partId;
  const hoverPart = useAppStore((s) => s.hoverPart);
  const focusPart = useAppStore((s) => s.focusPart);
  const cutting = cut && isFocus && style === "solid";

  const pulseRef = useRef<Group>(null);
  const animation = interactive ? part.animation : undefined;

  // Idle animations around the node's centre: heartbeat and breathing.
  // The "Breathe with me" guide drives the lungs and diaphragm in time.
  useFrame(({ clock }) => {
    const group = pulseRef.current;
    if (!group) return;
    const since = useAppStore.getState().breathingSince;
    if (animation === "breathe" && since !== null) {
      const amount = breathAmount((performance.now() - since) / 1000);
      if (name === "diaphragm") group.scale.set(1, 1 - 0.14 * amount, 1);
      else group.scale.setScalar(1 + 0.07 * amount);
      return;
    }
    let scale = 1;
    if (!reducedMotion && animation === "pulse") {
      scale = 1 + 0.06 * Math.pow(Math.max(0, Math.sin(clock.elapsedTime * Math.PI * 2 * 1.1)), 8);
    } else if (!reducedMotion && animation === "breathe") {
      scale = 1 + 0.025 * Math.sin(clock.elapsedTime * 1.4);
    }
    group.scale.setScalar(scale);
  });

  if (style === "hidden") return null;

  const ghost = style === "ghost" || style === "dim";
  const opacity = style === "dim" ? 0.1 : GHOST_OPACITY[node.group];
  const emissiveIntensity = selected ? 0.35 : hovered ? 0.2 : 0;
  const [cx, cy, cz] = node.center;

  const mesh = (
    <>
      {cutting && <StencilWriters source={source} />}
      <mesh
        name={name}
        geometry={source.geometry}
        position={source.position}
        quaternion={source.quaternion}
        scale={source.scale}
        raycast={interactive ? Mesh.prototype.raycast : noRaycast}
        renderOrder={ghost ? 4 : cutting ? 3 : 0}
      >
        <meshStandardMaterial
          color={style === "ghost" && node.group === "skin" ? GHOST_SKIN : node.color}
          roughness={node.group === "skin" ? 0.65 : 0.5}
          metalness={0}
          emissive={HIGHLIGHT}
          emissiveIntensity={cutting ? 0 : emissiveIntensity}
          transparent={ghost}
          opacity={ghost ? opacity : 1}
          depthWrite={!ghost}
          side={node.group === "skin" || cutting ? DoubleSide : FrontSide}
          clippingPlanes={cutting ? [CUT_PLANE] : null}
        />
      </mesh>
    </>
  );

  // Pivot animated nodes around their own centre.
  const content = animation ? (
    <group position={[cx, cy, cz]}>
      <group ref={pulseRef}>
        <group position={[-cx, -cy, -cz]}>{mesh}</group>
      </group>
    </group>
  ) : (
    mesh
  );

  if (!partId) return content;

  const toModelSpace = (event: ThreeEvent<PointerEvent | MouseEvent>): Vec3 | null => {
    const local = bodyRef.current?.worldToLocal(event.point.clone());
    return local ? [local.x, local.y, local.z] : null;
  };
  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    hoverPart(partId, toModelSpace(event));
    document.body.style.cursor = "pointer";
  };
  const handleOut = () => {
    if (useAppStore.getState().hoveredPartId === partId) hoverPart(null);
    document.body.style.cursor = "";
  };
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const { game, guess } = useAppStore.getState();
    if (game) guess(partId);
    else focusPart(partId, toModelSpace(event));
  };

  return (
    <Select enabled={(hovered || selected) && !cutting}>
      <group onPointerOver={handleOver} onPointerOut={handleOut} onClick={handleClick}>
        {content}
      </group>
    </Select>
  );
}

function ModelFileNodes({ file, ...rest }: Omit<NodeProps, "name" | "source"> & { file: ModelFile }) {
  const { nodes } = useModelFile(file);
  return (
    <>
      {nodesInFile(file).map((name) => {
        const source = nodes[name];
        return source instanceof Mesh ? <AnatomyNode key={name} name={name} source={source} {...rest} /> : null;
      })}
    </>
  );
}

interface AnatomyModelProps {
  mode: AgeMode;
  reducedMotion: boolean;
}

export function AnatomyModel({ mode, reducedMotion }: AnatomyModelProps) {
  const bodyRef = useRef<Group>(null);
  const view = useAppStore((s) => s.view);
  const files = filesForView(view);

  // Smoothly turn the body towards the requested rotation.
  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body) return;
    const target = useAppStore.getState().modelRotation;
    body.rotation.y += (target - body.rotation.y) * Math.min(1, delta * 6);
  });

  return (
    <>
      <group ref={bodyRef}>
        <Bvh firstHitOnly>
          {files.map((file) => (
            <Suspense key={file} fallback={null}>
              <ModelFileNodes file={file} mode={mode} view={view} reducedMotion={reducedMotion} bodyRef={bodyRef} />
            </Suspense>
          ))}
        </Bvh>
        <NerveSignals reducedMotion={reducedMotion} />
        <JourneyMarker mode={mode} />
        <LabelTracker mode={mode} bodyRef={bodyRef} />
      </group>
      <CrossSection bodyRef={bodyRef} />
    </>
  );
}
