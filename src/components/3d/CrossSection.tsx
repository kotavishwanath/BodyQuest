"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import {
  AlwaysStencilFunc,
  BackSide,
  Color,
  DecrementWrapStencilOp,
  FrontSide,
  IncrementWrapStencilOp,
  NotEqualStencilFunc,
  Plane,
  ReplaceStencilOp,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ModelNode } from "@/lib/model-index";
import { getPart, getPartNode } from "@/lib/parts";
import { useAppStore } from "@/lib/store";

/**
 * Cross-section (Level 2 close-up): a clipping plane that faces the camera
 * and cuts away the near half of the selected organ. The open cut is filled
 * with a coloured "cap" using the classic stencil technique: back faces add
 * to the stencil buffer, front faces subtract, and the cap is drawn wherever
 * the count is non-zero (i.e. inside the solid).
 */
export const CUT_PLANE = new Plane(new Vector3(0, 0, -1), 0);
const CLIP = [CUT_PLANE];

const stencilBase = {
  depthWrite: false,
  depthTest: false,
  colorWrite: false,
  stencilWrite: true,
  stencilFunc: AlwaysStencilFunc,
  clippingPlanes: CLIP,
} as const;

/** Invisible stencil writers that share the organ's geometry and transform. */
export function StencilWriters({ source }: { source: Mesh }) {
  const common = { geometry: source.geometry, position: source.position, quaternion: source.quaternion, scale: source.scale };
  return (
    <>
      <mesh {...common} renderOrder={1}>
        <meshBasicMaterial
          {...stencilBase}
          side={BackSide}
          stencilFail={IncrementWrapStencilOp}
          stencilZFail={IncrementWrapStencilOp}
          stencilZPass={IncrementWrapStencilOp}
        />
      </mesh>
      <mesh {...common} renderOrder={1}>
        <meshBasicMaterial
          {...stencilBase}
          side={FrontSide}
          stencilFail={DecrementWrapStencilOp}
          stencilZFail={DecrementWrapStencilOp}
          stencilZPass={DecrementWrapStencilOp}
        />
      </mesh>
    </>
  );
}

/** Colour of the cut surface: bone shows reddish marrow, others a darker tone. */
function capColor(node: ModelNode): string {
  if (node.group === "skeleton") return "#b8644a";
  if (node.group === "skin") return "#e6b49a";
  return `#${new Color(node.color).multiplyScalar(0.72).getHexString()}`;
}

/**
 * Positions the cut plane every frame (so it follows the camera while the
 * user orbits) and draws the cap. Place outside the rotating body group.
 */
export function CrossSection({ bodyRef }: { bodyRef: RefObject<Group | null> }) {
  const cut = useAppStore((s) => s.cut);
  const selectedId = useAppStore((s) => s.selectedPartId);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const capRef = useRef<Mesh>(null);
  const temp = useMemo(() => ({ center: new Vector3(), normal: new Vector3(), point: new Vector3(), look: new Vector3() }), []);

  const part = selectedId ? getPart(selectedId) : undefined;
  const node = part ? getPartNode(part) : undefined;

  useFrame(({ camera }) => {
    const body = bodyRef.current;
    if (!cut || !node || !body) return;
    const { center, normal, point, look } = temp;
    body.localToWorld(center.set(...node.center));
    const target = controls?.target ?? center;
    normal.copy(target).sub(camera.position).normalize();
    const depth = useAppStore.getState().cutDepth * node.radius * 0.8;
    point.copy(center).addScaledVector(normal, depth);
    CUT_PLANE.setFromNormalAndCoplanarPoint(normal, point);
    const cap = capRef.current;
    if (cap) {
      cap.position.copy(point);
      cap.lookAt(look.copy(point).sub(normal));
    }
  });

  if (!cut || !node) return null;
  const size = node.radius * 3;

  return (
    <mesh
      ref={capRef}
      renderOrder={2}
      onAfterRender={(renderer) => renderer.clearStencil()}
      raycast={() => null}
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        color={capColor(node)}
        roughness={0.8}
        stencilWrite
        stencilRef={0}
        stencilFunc={NotEqualStencilFunc}
        stencilFail={ReplaceStencilOp}
        stencilZFail={ReplaceStencilOp}
        stencilZPass={ReplaceStencilOp}
      />
    </mesh>
  );
}
