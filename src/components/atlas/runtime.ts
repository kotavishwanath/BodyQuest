import {
  Box3,
  Color,
  DataTexture,
  FloatType,
  Matrix4,
  MeshStandardMaterial,
  NearestFilter,
  Ray,
  RGBAFormat,
  Vector3,
  type BufferGeometry,
  type Intersection,
  type Mesh,
  type Raycaster,
} from "three";
import { explodeOffset, packInventory, type ExplodeLayout } from "@/lib/atlas/explode";
import type { AtlasCatalogue, AtlasSystemId } from "@/types/atlas";

/** Per-part render state, stored in the alpha channel of the state texture. */
export const FLAG = { hidden: 0, normal: 1, hovered: 2, selected: 3, dimmed: 4 } as const;

const TEXTURE_SIZE = 64; // 4,096 texels ≥ 2,232 parts

export interface RuntimeInput {
  visible: ReadonlySet<AtlasSystemId>;
  selectedParts: ReadonlySet<number> | null;
  isolate: boolean;
  hoveredPart: number | null;
}

/**
 * Shared GPU state for all atlas meshes: each texel holds a part's explode
 * offset (rgb, world metres) and its flag (a). The vertex shader reads it by
 * the `_part` vertex attribute, so thousands of parts stay a handful of draw
 * calls.
 */
export class AtlasRuntime {
  readonly texture: DataTexture;
  readonly flags: Uint8Array;
  readonly offsets: Float32Array;
  private readonly data: Float32Array;
  private readonly angle = new Map<AtlasSystemId, number>();
  private layout: ExplodeLayout | null = null;
  private layoutKey = "";
  explode = 0;

  constructor(readonly catalogue: AtlasCatalogue) {
    const count = catalogue.parts.length;
    if (count > TEXTURE_SIZE * TEXTURE_SIZE) throw new Error("Atlas state texture is too small");
    this.data = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
    this.texture = new DataTexture(this.data, TEXTURE_SIZE, TEXTURE_SIZE, RGBAFormat, FloatType);
    this.texture.minFilter = NearestFilter;
    this.texture.magFilter = NearestFilter;
    this.texture.generateMipmaps = false;
    this.flags = new Uint8Array(count);
    this.offsets = new Float32Array(count * 3);
    const systems = Object.keys(catalogue.systems) as AtlasSystemId[];
    systems.forEach((id, i) => this.angle.set(id, (i / systems.length) * Math.PI * 2));
  }

  /** Recomputes flags and offsets and uploads them. */
  update(input: RuntimeInput, explode: number, aspect: number) {
    const { parts } = this.catalogue;
    this.explode = explode;
    const shown: number[] = [];
    for (let i = 0; i < parts.length; i++) {
      const inSystem = input.visible.has(parts[i].system);
      const selected = input.selectedParts?.has(i) ?? false;
      let flag: number = FLAG.normal;
      if (input.isolate && input.selectedParts) flag = selected ? FLAG.selected : FLAG.hidden;
      else if (!inSystem && !selected) flag = FLAG.hidden;
      else if (selected) flag = FLAG.selected;
      else if (input.selectedParts) flag = FLAG.dimmed;
      if (flag !== FLAG.hidden && i === input.hoveredPart && flag !== FLAG.selected) flag = FLAG.hovered;
      this.flags[i] = flag;
      if (flag !== FLAG.hidden) shown.push(i);
    }

    if (explode > 0.5) {
      const key = `${shown.join(",")}:${aspect.toFixed(2)}`;
      if (key !== this.layoutKey) {
        this.layout = packInventory(parts, shown, aspect);
        this.layoutKey = key;
      }
    }

    const out: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < parts.length; i++) {
      if (explode > 0 && this.flags[i] !== FLAG.hidden) {
        explodeOffset(parts[i], this.angle.get(parts[i].system) ?? 0, this.layout?.cells.get(i), explode, out);
      } else {
        out[0] = out[1] = out[2] = 0;
      }
      this.offsets.set(out, i * 3);
      this.data[i * 4] = out[0];
      this.data[i * 4 + 1] = out[1];
      this.data[i * 4 + 2] = out[2];
      this.data[i * 4 + 3] = this.flags[i];
    }
    this.texture.needsUpdate = true;
  }

  inventorySize(): { width: number; height: number } | null {
    return this.layout ? { width: this.layout.width, height: this.layout.height } : null;
  }

  /** World-space box of some parts at their current (exploded) positions. */
  boxOf(indices: Iterable<number>, target = new Box3()): Box3 {
    target.makeEmpty();
    const { parts } = this.catalogue;
    const min = new Vector3();
    const max = new Vector3();
    for (const i of indices) {
      const [cx, cy, cz] = parts[i].center;
      const [sx, sy, sz] = parts[i].size;
      const [ox, oy, oz] = [this.offsets[i * 3], this.offsets[i * 3 + 1], this.offsets[i * 3 + 2]];
      min.set(cx + ox - sx / 2, cy + oy - sy / 2, cz + oz - sz / 2);
      max.set(cx + ox + sx / 2, cy + oy + sy / 2, cz + oz + sz / 2);
      target.expandByPoint(min).expandByPoint(max);
    }
    return target;
  }

  /** Material for one system; the shader reads this runtime's state texture. */
  createMaterial(color: string): MeshStandardMaterial {
    const material = new MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.02 });
    const highlight = new Color("#ffb020");
    const size = `${TEXTURE_SIZE}.0`;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uState = { value: this.texture };
      shader.uniforms.uHighlight = { value: highlight };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
attribute float _part;
uniform sampler2D uState;
varying float vFlag;
varying float vTone;`,
        )
        .replace(
          "#include <project_vertex>",
          `vec4 atlasState = texture2D(uState, (vec2(mod(_part, ${size}), floor(_part / ${size})) + 0.5) / ${size});
vFlag = atlasState.a;
vTone = fract(sin(_part * 12.9898) * 43758.5453);
vec4 mvPosition = modelMatrix * vec4(transformed, 1.0);
mvPosition.xyz += atlasState.rgb;
mvPosition = viewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
if (vFlag < 0.5) gl_Position = vec4(0.0, 0.0, 2.0, 1.0);`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform vec3 uHighlight;
varying float vFlag;
varying float vTone;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
diffuseColor.rgb *= 0.88 + 0.24 * vTone;
if (vFlag > 3.5) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.91, 0.93), 0.7);
else if (vFlag > 2.5) diffuseColor.rgb = mix(diffuseColor.rgb, uHighlight, 0.45);
else if (vFlag > 1.5) diffuseColor.rgb = mix(diffuseColor.rgb, uHighlight, 0.25);`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
if (vFlag > 2.5 && vFlag < 3.5) totalEmissiveRadiance += uHighlight * 0.18;`,
        );
    };
    material.customProgramCacheKey = () => "atlas-part-state";
    return material;
  }

  /** Replaces three.js raycasting so it respects hidden parts and explode offsets. */
  attachPicking(mesh: Mesh) {
    const pick = buildPickData(mesh.geometry);
    const inverse = new Matrix4();
    const ray = new Ray();
    const localRay = new Ray();
    const box = new Box3();
    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    const hit = new Vector3();
    const offset = new Vector3();
    const position = mesh.geometry.getAttribute("position");
    const index = mesh.geometry.index!;
    const { parts } = this.catalogue;

    mesh.raycast = (raycaster: Raycaster, intersects: Intersection[]) => {
      inverse.copy(mesh.matrixWorld).invert();
      let best: Intersection | null = null;
      for (const [part, triangles] of pick) {
        if (this.flags[part] === FLAG.hidden) continue;
        offset.set(this.offsets[part * 3], this.offsets[part * 3 + 1], this.offsets[part * 3 + 2]);
        ray.copy(raycaster.ray);
        ray.origin.sub(offset);
        const [cx, cy, cz] = parts[part].center;
        const [sx, sy, sz] = parts[part].size;
        box.min.set(cx - sx / 2 - 0.002, cy - sy / 2 - 0.002, cz - sz / 2 - 0.002);
        box.max.set(cx + sx / 2 + 0.002, cy + sy / 2 + 0.002, cz + sz / 2 + 0.002);
        if (!ray.intersectsBox(box)) continue;
        localRay.copy(ray).applyMatrix4(inverse);
        for (let t = 0; t < triangles.length; t++) {
          const tri = triangles[t];
          a.fromBufferAttribute(position, index.getX(tri * 3));
          b.fromBufferAttribute(position, index.getX(tri * 3 + 1));
          c.fromBufferAttribute(position, index.getX(tri * 3 + 2));
          if (!localRay.intersectTriangle(a, b, c, false, hit)) continue;
          hit.applyMatrix4(mesh.matrixWorld).add(offset);
          const distance = raycaster.ray.origin.distanceTo(hit);
          if (distance < raycaster.near || distance > raycaster.far) continue;
          if (!best || distance < best.distance) best = { distance, point: hit.clone(), object: mesh, faceIndex: tri };
        }
      }
      if (best) intersects.push(best);
    };
  }

  /** Part index under a raycast hit on an atlas mesh. */
  static partOf(intersection: Intersection): number | null {
    const mesh = intersection.object as Mesh;
    const faceIndex = intersection.faceIndex;
    const index = mesh.geometry?.index;
    const part = mesh.geometry?.getAttribute("_part");
    if (faceIndex == null || !index || !part) return null;
    return part.getX(index.getX(faceIndex * 3));
  }
}

/** Triangle ids grouped by part (computed once per geometry). */
function buildPickData(geometry: BufferGeometry): Map<number, Uint32Array> {
  const index = geometry.index;
  const part = geometry.getAttribute("_part");
  if (!index || !part) throw new Error("Atlas mesh is missing indices or the _part attribute");
  const triangles = index.count / 3;
  const counts = new Map<number, number>();
  for (let t = 0; t < triangles; t++) {
    const p = part.getX(index.getX(t * 3));
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const lists = new Map<number, Uint32Array>();
  const fill = new Map<number, number>();
  for (const [p, n] of counts) {
    lists.set(p, new Uint32Array(n));
    fill.set(p, 0);
  }
  for (let t = 0; t < triangles; t++) {
    const p = part.getX(index.getX(t * 3));
    const at = fill.get(p)!;
    lists.get(p)![at] = t;
    fill.set(p, at + 1);
  }
  return lists;
}
