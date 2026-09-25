"use client";

import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import type { PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { getPart, getPartNode } from "@/lib/parts";
import { useAppStore } from "@/lib/store";
import type { BodyPart, Vec3 } from "@/types/content";

export const HOME_SHOT = { position: [0, 1.0, 3.7] as Vec3, target: [0, 0.88, 0] as Vec3 };

const VIEW_DIRECTIONS: Record<"front" | "back" | "side", Vec3> = {
  front: [0, 0.15, 1],
  back: [0, 0.15, -1],
  side: [1, 0.1, 0.25],
};

/** Rotates a model-space point by the body's Y rotation. */
function rotateY([x, y, z]: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

/** Camera position and target that frame a part. */
function frameShot(part: BodyPart, rotation: number, narrow: boolean) {
  if (part.cameraTarget) {
    return { position: rotateY(part.cameraTarget.position, rotation), target: rotateY(part.cameraTarget.lookAt, rotation) };
  }
  const node = getPartNode(part);
  if (!node) return HOME_SHOT;
  const target = rotateY(node.center, rotation);
  const [dx, dy, dz] = VIEW_DIRECTIONS[node.view];
  const length = Math.hypot(dx, dy, dz);
  const direction = rotateY([dx / length, dy / length, dz / length], rotation);
  const distance = Math.min(3.6, Math.max(0.5, node.radius * 3.2 + 0.3) * (narrow ? 1.35 : 1));
  const position: Vec3 = [
    target[0] + direction[0] * distance,
    target[1] + direction[1] * distance,
    target[2] + direction[2] * distance,
  ];
  return { position, target };
}

/**
 * Flies the camera to the selected part (or back home) with a smooth
 * ~1 s eased tween, and shifts the view so the part stays clear of the info
 * panel (side panel on large screens, bottom sheet on small ones).
 * Instant when the user prefers reduced motion.
 */
export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const selectedId = useAppStore((s) => s.selectedPartId);
  const homeRequest = useAppStore((s) => s.cameraHomeRequest);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!controls) return;
    const part = selectedId ? getPart(selectedId) : undefined;
    // Panel is ~440 px wide on large screens; the bottom sheet covers the lower part on phones.
    const wide = size.width >= 1024;
    const shot = part ? frameShot(part, useAppStore.getState().modelRotation, !wide) : HOME_SHOT;
    const duration = reducedMotion ? 0 : 1;
    const options = { duration, ease: "power2.inOut", onUpdate: () => controls.update() };
    const [px, py, pz] = shot.position;
    const [tx, ty, tz] = shot.target;

    const target = part ? (wide ? { x: 220, y: 0 } : { x: 0, y: size.height * 0.28 }) : { x: 0, y: 0 };
    const applyOffset = () => {
      const perspective = camera as PerspectiveCamera;
      if (offset.current.x === 0 && offset.current.y === 0) perspective.clearViewOffset();
      else perspective.setViewOffset(size.width, size.height, offset.current.x, offset.current.y, size.width, size.height);
    };

    const tweens = [
      gsap.to(camera.position, { x: px, y: py, z: pz, ...options }),
      gsap.to(controls.target, { x: tx, y: ty, z: tz, ...options }),
      gsap.to(offset.current, { ...target, duration, ease: "power2.inOut", onUpdate: applyOffset, onComplete: applyOffset }),
    ];
    return () => tweens.forEach((tween) => tween.kill());
  }, [selectedId, homeRequest, camera, controls, reducedMotion, size.width, size.height]);

  return null;
}
