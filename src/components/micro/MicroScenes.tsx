"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import {
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type Mesh,
  type Texture,
} from "three";
import type { CellSceneId, TissueId } from "@/types/micro";

/*
 * Stylised, procedural tissue (Level 3) and cell (Level 4) scenes. These are
 * simplified teaching models, not to scale. Every clickable <Structure> id
 * matches a structure id in /content/micro/*.json.
 */

interface PickApi {
  selected: string | null;
  hovered: string | null;
  pick: (id: string) => void;
  hover: (id: string | null) => void;
}
const PickContext = createContext<PickApi>({ selected: null, hovered: null, pick: () => {}, hover: () => {} });
const LookContext = createContext<{ color: string; glow: number; opacity: number; map?: Texture }>({ color: "#fff", glow: 0, opacity: 1 });

/** A clickable structure; its <Piece> children share one highlighted look. */
function Structure({ id, color, opacity = 1, map, children }: { id: string; color: string; opacity?: number; map?: Texture; children: ReactNode }) {
  const { selected, hovered, pick, hover } = useContext(PickContext);
  const glow = selected === id ? 0.5 : hovered === id ? 0.28 : 0;
  return (
    <group
      name={id}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        pick(id);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        hover(id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        hover(null);
        document.body.style.cursor = "";
      }}
    >
      <LookContext.Provider value={{ color, glow, opacity, map }}>{children}</LookContext.Provider>
    </group>
  );
}

type PieceProps = {
  children: ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
};

function Piece({ children, ...transform }: PieceProps) {
  const { color, glow, opacity, map } = useContext(LookContext);
  return (
    <mesh {...transform}>
      {children}
      <meshStandardMaterial
        color={color}
        map={map}
        emissive={color}
        emissiveIntensity={glow}
        roughness={0.55}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity >= 1}
        side={DoubleSide}
      />
    </mesh>
  );
}

/** Deterministic pseudo-random numbers so scenes look the same every time. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useStripes(repeat: number, dark = "#8f2f2a", light = "#d8665a") {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 8;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, 64, 8);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, 22, 8);
    ctx.fillRect(40, 0, 6, 8);
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(1, repeat);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [repeat, dark, light]);
}

const curveOf = (points: [number, number, number][]) => new CatmullRomCurve3(points.map((p) => new Vector3(...p)));

function Tube({ points, radius, segments = 64 }: { points: [number, number, number][]; radius: number; segments?: number }) {
  const curve = useMemo(() => curveOf(points), [points]);
  return (
    <Piece>
      <tubeGeometry args={[curve, segments, radius, 10, false]} />
    </Piece>
  );
}

// ── Tissues ───────────────────────────────────────────────────────────────
function BoneTissue() {
  const osteons: [number, number][] = [
    [-1.1, 0.3],
    [-0.15, 0.55],
    [-0.65, -0.6],
    [0.3, -0.35],
  ];
  const rand = seeded(7);
  const struts = Array.from({ length: 34 }, () => ({
    p: [0.9 + rand() * 1.2, -1 + rand() * 2, -1 + rand() * 2] as [number, number, number],
    r: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI] as [number, number, number],
    l: 0.5 + rand() * 0.6,
  }));
  const blobs = Array.from({ length: 9 }, () => [1 + rand() * 1, -0.8 + rand() * 1.6, -0.8 + rand() * 1.6] as [number, number, number]);

  return (
    <group>
      <Structure id="osteon" color="#eee3c6">
        {osteons.map(([x, z]) =>
          [0.22, 0.32, 0.42, 0.52].map((r) => (
            <Piece key={`${x}-${r}`} position={[x, 0, z]}>
              <cylinderGeometry args={[r, r, 2.2, 40, 1, true]} />
            </Piece>
          )),
        )}
      </Structure>
      <Structure id="canal" color="#c0392b">
        {osteons.map(([x, z]) => (
          <Piece key={x} position={[x, 0, z]}>
            <cylinderGeometry args={[0.09, 0.09, 2.35, 16]} />
          </Piece>
        ))}
      </Structure>
      <Structure id="osteocyte" color="#6b4f3a">
        {osteons.flatMap(([x, z], i) =>
          Array.from({ length: 6 }, (_, k) => {
            const a = (k / 6) * Math.PI * 2 + i;
            return (
              <Piece key={`${i}-${k}`} position={[x + Math.cos(a) * 0.37, -0.8 + k * 0.32, z + Math.sin(a) * 0.37]} scale={[1, 0.5, 1]}>
                <sphereGeometry args={[0.05, 12, 8]} />
              </Piece>
            );
          }),
        )}
      </Structure>
      <Structure id="spongy" color="#e6d7b2">
        {struts.map((s, i) => (
          <Piece key={i} position={s.p} rotation={s.r}>
            <cylinderGeometry args={[0.045, 0.045, s.l, 8]} />
          </Piece>
        ))}
      </Structure>
      <Structure id="marrow" color="#b3303a" opacity={0.85}>
        {blobs.map((p, i) => (
          <Piece key={i} position={p}>
            <sphereGeometry args={[0.18 + (i % 3) * 0.05, 16, 12]} />
          </Piece>
        ))}
      </Structure>
    </group>
  );
}

function MuscleTissue() {
  const stripes = useStripes(40);
  const bigStripes = useStripes(14, "#7a211d", "#e27b6e");
  const bundles: [number, number][] = [
    [0, 0],
    [0.95, -0.4],
    [-0.9, -0.35],
  ];
  const hex: [number, number][] = [[0, 0], ...Array.from({ length: 6 }, (_, k) => [Math.cos((k * Math.PI) / 3) * 0.26, Math.sin((k * Math.PI) / 3) * 0.26] as [number, number])];
  const capillary = useMemo<[number, number, number][]>(
    () => Array.from({ length: 9 }, (_, i) => [-2 + i * 0.5, 0.45 + Math.sin(i) * 0.12, -0.2 + Math.cos(i * 1.3) * 0.25]),
    [],
  );

  return (
    <group>
      <Structure id="fibre" color="#d45f55" map={stripes}>
        {bundles.flatMap(([y, z], b) =>
          hex.map(([dy, dz], k) => (
            <Piece key={`${b}-${k}`} position={[0, y * 0.9 + dy, z + dz]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.12, 0.12, 4, 20]} />
            </Piece>
          )),
        )}
      </Structure>
      <Structure id="fascicle" color="#f2d1c9" opacity={0.2}>
        {bundles.map(([y, z], b) => (
          <Piece key={b} position={[0, y * 0.9, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.44, 0.44, 4.1, 32, 1, true]} />
          </Piece>
        ))}
      </Structure>
      <Structure id="stripes" color="#e27b6e" map={bigStripes}>
        <Piece position={[0, -1.1, 1.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.28, 0.28, 3, 32]} />
        </Piece>
      </Structure>
      <Structure id="nuclei" color="#5b3e96">
        {Array.from({ length: 8 }, (_, i) => (
          <Piece key={i} position={[-1.6 + i * 0.45, -1.1 + (i % 2 ? 0.27 : -0.27), 1.1 + (i % 2 ? 0.05 : 0.08)]} scale={[2.2, 0.6, 0.8]}>
            <sphereGeometry args={[0.06, 12, 8]} />
          </Piece>
        ))}
      </Structure>
      <Structure id="capillary" color="#b71c1c">
        <Tube points={capillary} radius={0.05} />
      </Structure>
    </group>
  );
}

function Signal({ points, speed = 0.45 }: { points: [number, number, number][]; speed?: number }) {
  const curve = useMemo(() => curveOf(points), [points]);
  const ref = useRef<Mesh>(null);
  const p = useMemo(() => new Vector3(), []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.copy(curve.getPointAt((clock.elapsedTime * speed) % 1, p));
  });
  return (
    <mesh ref={ref} raycast={() => null}>
      <sphereGeometry args={[0.07, 12, 8]} />
      <meshBasicMaterial color="#fff59d" toneMapped={false} />
    </mesh>
  );
}

function NerveTissue() {
  const axon: [number, number, number][] = [
    [-1.3, 0.2, 0],
    [-0.6, 0.05, 0.1],
    [0.3, -0.05, 0],
    [1.2, 0.05, -0.1],
    [1.8, 0.1, 0],
  ];
  const dendrites: [number, number, number][][] = [
    [[-1.6, 0.3, 0], [-2.1, 0.9, 0.2], [-2.4, 1.3, 0.1]],
    [[-1.7, 0.2, 0], [-2.3, 0.1, 0.4], [-2.7, 0.3, 0.6]],
    [[-1.6, 0.05, 0], [-2.0, -0.6, -0.2], [-2.3, -1.0, -0.1]],
    [[-1.5, 0.4, -0.1], [-1.6, 1.0, -0.5], [-1.9, 1.4, -0.7]],
    [[-1.5, 0, 0.1], [-1.3, -0.7, 0.5], [-1.5, -1.1, 0.7]],
  ];
  const terminals: [number, number, number][][] = [
    [[1.8, 0.1, 0], [2.2, 0.45, 0.1]],
    [[1.8, 0.1, 0], [2.25, 0.05, 0.25]],
    [[1.8, 0.1, 0], [2.2, -0.3, -0.1]],
  ];
  return (
    <group>
      <Structure id="soma" color="#9b7bd4">
        <Piece position={[-1.55, 0.2, 0]}>
          <sphereGeometry args={[0.36, 32, 24]} />
        </Piece>
      </Structure>
      <Structure id="dendrites" color="#b79be6">
        {dendrites.map((pts, i) => (
          <Tube key={i} points={pts} radius={0.05} segments={24} />
        ))}
      </Structure>
      <Structure id="axon" color="#8e6cc9">
        <Tube points={axon} radius={0.05} />
      </Structure>
      <Structure id="myelin" color="#f5e6b8">
        {[0.08, 0.28, 0.48, 0.68].map((t) => {
          const curve = curveOf(axon);
          const pos = curve.getPointAt(t + 0.09);
          const tangent = curve.getTangentAt(t + 0.09);
          const angle = Math.atan2(tangent.y, tangent.x);
          return (
            <Piece key={t} position={[pos.x, pos.y, pos.z]} rotation={[0, 0, angle - Math.PI / 2]}>
              <capsuleGeometry args={[0.11, 0.42, 6, 16]} />
            </Piece>
          );
        })}
      </Structure>
      <Structure id="terminal" color="#c4a4f2">
        {terminals.map((pts, i) => (
          <group key={i}>
            <Tube points={pts} radius={0.035} segments={12} />
            <Piece position={pts[1]}>
              <sphereGeometry args={[0.08, 12, 8]} />
            </Piece>
          </group>
        ))}
      </Structure>
      <Signal points={axon} />
    </group>
  );
}

function SkinTissue() {
  const coil = useMemo<[number, number, number][]>(
    () => Array.from({ length: 24 }, (_, i) => [0.9 + Math.cos(i * 0.9) * 0.18, -0.5 + i * 0.012, 0.3 + Math.sin(i * 0.9) * 0.18]),
    [],
  );
  const rand = seeded(3);
  const fat = Array.from({ length: 16 }, () => [-1.8 + rand() * 3.6, -1.35 + rand() * 0.6, -1 + rand() * 2] as [number, number, number]);
  return (
    <group>
      <Structure id="epidermis" color="#e0a98a">
        <Piece position={[0, 0.98, 0]}>
          <boxGeometry args={[4, 0.18, 2.4]} />
        </Piece>
      </Structure>
      <Structure id="dermis" color="#f0b8b0" opacity={0.45}>
        <Piece position={[0, 0.3, 0]}>
          <boxGeometry args={[4, 1.2, 2.4]} />
        </Piece>
      </Structure>
      <Structure id="fat" color="#f3d27a" opacity={0.9}>
        {fat.map((p, i) => (
          <Piece key={i} position={p}>
            <sphereGeometry args={[0.2, 16, 12]} />
          </Piece>
        ))}
      </Structure>
      <Structure id="hair" color="#4a3426">
        <Piece position={[-0.8, 0.5, 0.1]} rotation={[0, 0, 0.25]}>
          <cylinderGeometry args={[0.12, 0.16, 1.2, 16]} />
        </Piece>
        <Piece position={[-0.98, 1.55, 0.1]} rotation={[0, 0, 0.25]}>
          <cylinderGeometry args={[0.04, 0.05, 1.2, 10]} />
        </Piece>
      </Structure>
      <Structure id="sweat" color="#6fb7e0">
        <Tube points={coil} radius={0.04} segments={96} />
        <Tube points={[[0.9, -0.22, 0.3], [0.95, 0.4, 0.3], [0.9, 1.08, 0.3]]} radius={0.035} segments={16} />
      </Structure>
      <Structure id="vessels" color="#c62828">
        <Tube points={[[-2, 0.2, -0.6], [-0.5, 0.35, -0.4], [0.8, 0.15, -0.7], [2, 0.3, -0.5]]} radius={0.06} />
        <Tube points={[[-2, 0.0, -0.8], [-0.3, 0.1, -0.9], [1, -0.05, -0.8], [2, 0.05, -0.9]]} radius={0.06} />
      </Structure>
      <Structure id="receptor" color="#f7f0e0">
        <Piece position={[0.1, -0.05, 0.6]} scale={[1, 1.5, 1]}>
          <sphereGeometry args={[0.13, 16, 12]} />
        </Piece>
      </Structure>
    </group>
  );
}

// ── Cells ─────────────────────────────────────────────────────────────────
function AnimalCell() {
  const rand = seeded(11);
  const inside = (r: number): [number, number, number] => {
    const a = rand() * Math.PI * 2;
    const b = (rand() - 0.5) * Math.PI * 0.9;
    const d = 1.05 + rand() * r;
    return [Math.cos(a) * Math.cos(b) * d, Math.sin(b) * d, Math.sin(a) * Math.cos(b) * d];
  };
  const mitochondria = Array.from({ length: 6 }, () => ({ p: inside(0.6), r: [rand() * 3, rand() * 3, rand() * 3] as [number, number, number] }));
  const ribosomes = Array.from({ length: 36 }, () => inside(0.75));
  const lysosomes = Array.from({ length: 3 }, () => inside(0.5));

  return (
    <group>
      <Structure id="membrane" color="#f4b6c2" opacity={0.35}>
        <Piece>
          <sphereGeometry args={[2, 48, 32, 0, Math.PI * 1.5]} />
        </Piece>
      </Structure>
      <Structure id="nucleus" color="#8e7cc3" opacity={0.9}>
        <Piece>
          <sphereGeometry args={[0.72, 40, 28, 0, Math.PI * 1.5]} />
        </Piece>
      </Structure>
      <Structure id="nucleolus" color="#4b3a86">
        <Piece position={[0.12, 0.08, 0.1]}>
          <sphereGeometry args={[0.25, 24, 16]} />
        </Piece>
      </Structure>
      <Structure id="er" color="#7fb3e6">
        {[0.95, 1.07, 1.19].map((r, i) => (
          <Piece key={r} rotation={[Math.PI / 2 + i * 0.25, 0.3, 0.6]}>
            <torusGeometry args={[r, 0.035, 8, 64, Math.PI * 1.3]} />
          </Piece>
        ))}
      </Structure>
      <Structure id="golgi" color="#79c28a">
        {[0, 1, 2, 3].map((i) => (
          <Piece key={i} position={[-1.1, 0.55 + i * 0.1, -0.35]} rotation={[Math.PI / 2, 0, 0.5]} scale={[1, 1, 0.35]}>
            <torusGeometry args={[0.32 - i * 0.03, 0.05, 8, 32, Math.PI]} />
          </Piece>
        ))}
      </Structure>
      <Structure id="mitochondria" color="#f08a4b">
        {mitochondria.map((m, i) => (
          <Piece key={i} position={m.p} rotation={m.r}>
            <capsuleGeometry args={[0.13, 0.36, 6, 16]} />
          </Piece>
        ))}
      </Structure>
      <Structure id="ribosomes" color="#3d5a80">
        {ribosomes.map((p, i) => (
          <Piece key={i} position={p}>
            <sphereGeometry args={[0.035, 8, 6]} />
          </Piece>
        ))}
      </Structure>
      <Structure id="lysosome" color="#d45fa0">
        {lysosomes.map((p, i) => (
          <Piece key={i} position={p}>
            <sphereGeometry args={[0.14, 16, 12]} />
          </Piece>
        ))}
      </Structure>
    </group>
  );
}

function CellGallery() {
  const stripes = useStripes(10);
  const rand = seeded(5);
  const processes = Array.from({ length: 12 }, () => [rand() * Math.PI * 2, (rand() - 0.5) * 2] as [number, number]);
  return (
    <group>
      <group position={[-3, 0, 0]} scale={0.55}>
        <Structure id="neuron" color="#9b7bd4">
          <Piece>
            <sphereGeometry args={[0.4, 24, 16]} />
          </Piece>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 1.4 + 1.2;
            return <Tube key={i} points={[[0, 0, 0], [Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0.1], [Math.cos(a) * 1.5, Math.sin(a) * 1.3, 0]]} radius={0.06} segments={16} />;
          })}
          <Tube points={[[0.3, -0.1, 0], [1, -0.6, 0], [1.2, -1.6, 0.1], [1.1, -2.6, 0]]} radius={0.07} segments={32} />
        </Structure>
      </group>
      <group position={[-1, 0, 0]} rotation={[0.9, 0.3, 0]}>
        <Structure id="rbc" color="#d32f2f">
          <Piece>
            <torusGeometry args={[0.42, 0.2, 20, 40]} />
          </Piece>
          <Piece rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 0.1, 32]} />
          </Piece>
        </Structure>
      </group>
      <group position={[1, 0, 0]} rotation={[0, 0, 0.35]}>
        <Structure id="musclecell" color="#d45f55" map={stripes}>
          <Piece>
            <cylinderGeometry args={[0.28, 0.28, 2.6, 24]} />
          </Piece>
          {[-0.9, -0.3, 0.3, 0.9].map((y, i) => (
            <Piece key={y} position={[i % 2 ? 0.26 : -0.26, y, 0.05]} scale={[0.6, 2, 0.8]}>
              <sphereGeometry args={[0.06, 12, 8]} />
            </Piece>
          ))}
        </Structure>
      </group>
      <group position={[3, 0, 0]}>
        <Structure id="osteocyte" color="#c9a77c">
          <Piece scale={[1.3, 0.8, 1]}>
            <sphereGeometry args={[0.35, 24, 16]} />
          </Piece>
          {processes.map(([a, y], i) => (
            <Tube key={i} points={[[0, 0, 0], [Math.cos(a) * 0.6, y * 0.4, Math.sin(a) * 0.6], [Math.cos(a + 0.3) * 1.0, y * 0.7, Math.sin(a + 0.3) * 1.0]]} radius={0.025} segments={12} />
          ))}
        </Structure>
      </group>
    </group>
  );
}

export interface MicroSceneProps extends PickApi {
  tissue: TissueId;
  level: "tissue" | "cell";
  cellScene: CellSceneId;
}

/** Scene content for the micro canvas. */
export function MicroSceneContent({ tissue, level, cellScene, ...pick }: MicroSceneProps) {
  let scene: ReactNode;
  if (level === "cell") scene = cellScene === "cell" ? <AnimalCell /> : <CellGallery />;
  else if (tissue === "bone") scene = <BoneTissue />;
  else if (tissue === "muscle") scene = <MuscleTissue />;
  else if (tissue === "nerve") scene = <NerveTissue />;
  else scene = <SkinTissue />;
  return <PickContext.Provider value={pick}>{scene}</PickContext.Provider>;
}
