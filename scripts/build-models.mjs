#!/usr/bin/env node
/**
 * Builds the anatomy GLB files in /public/models from BodyParts3D STL meshes.
 *
 *   npm run models          (downloads into .cache/bp3d on first run)
 *
 * Steps: download → parse STL → convert mm/Z-up to metres/Y-up → merge per
 * node → weld → simplify (meshoptimizer) → smooth normals → split skin into
 * regions → quantize + meshopt-compress → content-hashed GLB per file, plus
 * src/generated/model-index.json (node → file, group, system, colour, bounds).
 *
 * Licence of the generated models: CC BY-SA 2.1 JP (see ATTRIBUTION.txt).
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { meshopt, quantize } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { COLORS, FILES, LANDMARKS, NERVE_PATHS, NODES, SKIN } from "./anatomy-manifest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = path.join(ROOT, ".cache", "bp3d");
const OUT_DIR = path.join(ROOT, "public", "models");
const INDEX_FILE = path.join(ROOT, "src", "generated", "model-index.json");
const SOURCE_URL =
  "https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/main/assets/BodyParts3D_data/stl";

// BodyParts3D: millimetres, Z up, −Y anterior, −X = subject's right.
// Scene: metres, Y up, +Z anterior (towards the camera), feet at y = 0.
const FLOOR_MM = -14;
const CENTER_Y_MM = -96.5;
const toScene = (x, y, z) => [x / 1000, (z - FLOOR_MM) / 1000, -(y - CENTER_Y_MM) / 1000];

const MIN_TRIANGLES_PER_NODE = 400;

// ── Download ──────────────────────────────────────────────────────────────
async function download(ids) {
  await mkdir(CACHE_DIR, { recursive: true });
  const missing = ids.filter((id) => !existsSync(path.join(CACHE_DIR, `${id}.stl`)));
  if (missing.length) console.log(`Downloading ${missing.length} STL files…`);
  let next = 0;
  async function worker() {
    while (next < missing.length) {
      const id = missing[next++];
      const res = await fetch(`${SOURCE_URL}/${id}.stl`);
      if (!res.ok) throw new Error(`Download failed for ${id}: HTTP ${res.status}`);
      await writeFile(path.join(CACHE_DIR, `${id}.stl`), Buffer.from(await res.arrayBuffer()));
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
}

// ── STL parsing (binary) ─────────────────────────────────────────────────
const stlCache = new Map();
async function loadStl(id) {
  if (stlCache.has(id)) return stlCache.get(id);
  const buf = await readFile(path.join(CACHE_DIR, `${id}.stl`));
  const count = buf.readUInt32LE(80);
  if (buf.length !== 84 + count * 50) throw new Error(`${id}: not a binary STL`);
  const positions = new Float32Array(count * 9);
  for (let t = 0; t < count; t++) {
    const base = 84 + t * 50 + 12;
    for (let v = 0; v < 3; v++) {
      const o = base + v * 12;
      const p = toScene(buf.readFloatLE(o), buf.readFloatLE(o + 4), buf.readFloatLE(o + 8));
      positions.set(p, t * 9 + v * 3);
    }
  }
  stlCache.set(id, positions);
  return positions;
}

async function loadMerged(ids) {
  const parts = await Promise.all(ids.map(loadStl));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// ── Mesh processing ──────────────────────────────────────────────────────
/** Merges identical vertices of a triangle soup → indexed mesh. */
function weld(soup) {
  const map = new Map();
  const positions = [];
  const indices = new Uint32Array(soup.length / 3);
  for (let i = 0; i < soup.length; i += 3) {
    const key = `${Math.round(soup[i] * 1e5)},${Math.round(soup[i + 1] * 1e5)},${Math.round(soup[i + 2] * 1e5)}`;
    let index = map.get(key);
    if (index === undefined) {
      index = positions.length / 3;
      map.set(key, index);
      positions.push(soup[i], soup[i + 1], soup[i + 2]);
    }
    indices[i / 3] = index;
  }
  // Drop degenerate triangles created by welding.
  const clean = [];
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
    if (a !== b && b !== c && a !== c) clean.push(a, b, c);
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(clean) };
}

/** Removes unused vertices and re-numbers indices (optionally carrying normals). */
function compact({ positions, indices, normals }) {
  const remap = new Int32Array(positions.length / 3).fill(-1);
  const out = [];
  const outNormals = [];
  const newIndices = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const old = indices[i];
    if (remap[old] === -1) {
      remap[old] = out.length / 3;
      out.push(positions[old * 3], positions[old * 3 + 1], positions[old * 3 + 2]);
      if (normals) outNormals.push(normals[old * 3], normals[old * 3 + 1], normals[old * 3 + 2]);
    }
    newIndices[i] = remap[old];
  }
  return {
    positions: new Float32Array(out),
    indices: newIndices,
    ...(normals ? { normals: new Float32Array(outNormals) } : {}),
  };
}

function simplify(mesh, ratio) {
  if (ratio >= 0.999) return mesh;
  const target = Math.max(3, Math.floor((mesh.indices.length * ratio) / 3) * 3);
  let [indices] = MeshoptSimplifier.simplify(mesh.indices, mesh.positions, 3, target, 0.02, []);
  if (indices.length > target * 1.6) {
    [indices] = MeshoptSimplifier.simplifySloppy(mesh.indices, mesh.positions, 3, null, target, 0.05);
  }
  return compact({ positions: mesh.positions, indices });
}

/** Area-weighted smooth vertex normals. */
function computeNormals({ positions, indices }) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i] * 3, indices[i + 1] * 3, indices[i + 2] * 3];
    const e1 = [positions[b] - positions[a], positions[b + 1] - positions[a + 1], positions[b + 2] - positions[a + 2]];
    const e2 = [positions[c] - positions[a], positions[c + 1] - positions[a + 1], positions[c + 2] - positions[a + 2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    for (const v of [a, b, c]) {
      normals[v] += n[0];
      normals[v + 1] += n[1];
      normals[v + 2] += n[2];
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= len;
    normals[i + 1] /= len;
    normals[i + 2] /= len;
  }
  return normals;
}

function bounds(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  const center = min.map((v, k) => (v + max[k]) / 2);
  const radius = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2;
  return { min, max, center, radius };
}

// ── Nearest-landmark lookup (uniform grid) ───────────────────────────────
class PointGrid {
  constructor(cell = 0.03) {
    this.cell = cell;
    this.cells = new Map();
  }
  key(ix, iy, iz) {
    return `${ix},${iy},${iz}`;
  }
  add(x, y, z, label) {
    const k = this.key(Math.floor(x / this.cell), Math.floor(y / this.cell), Math.floor(z / this.cell));
    let list = this.cells.get(k);
    if (!list) this.cells.set(k, (list = []));
    list.push(x, y, z, label);
  }
  nearest(x, y, z, maxRings = 12) {
    const [cx, cy, cz] = [Math.floor(x / this.cell), Math.floor(y / this.cell), Math.floor(z / this.cell)];
    let best = null;
    let bestD = Infinity;
    for (let r = 0; r <= maxRings; r++) {
      for (let ix = cx - r; ix <= cx + r; ix++)
        for (let iy = cy - r; iy <= cy + r; iy++)
          for (let iz = cz - r; iz <= cz + r; iz++) {
            if (Math.max(Math.abs(ix - cx), Math.abs(iy - cy), Math.abs(iz - cz)) !== r) continue;
            const list = this.cells.get(this.key(ix, iy, iz));
            if (!list) continue;
            for (let i = 0; i < list.length; i += 4) {
              const d = (list[i] - x) ** 2 + (list[i + 1] - y) ** 2 + (list[i + 2] - z) ** 2;
              if (d < bestD) {
                bestD = d;
                best = list[i + 3];
              }
            }
          }
      // Anything in a further ring is at least r * cell away.
      if (best !== null && Math.sqrt(bestD) <= r * this.cell) break;
    }
    return { label: best, distance: Math.sqrt(bestD) };
  }
}

async function samplePoints(ids, step = 9) {
  const soup = await loadMerged(ids);
  const points = [];
  for (let i = 0; i < soup.length; i += 3 * step) points.push([soup[i], soup[i + 1], soup[i + 2]]);
  return points;
}

// ── Skin regions ─────────────────────────────────────────────────────────
async function buildSkin(ratio) {
  console.log("Processing skin…");
  let skin = simplify(weld(await loadStl(SKIN.fma)), ratio);
  const pos = skin.positions;

  // Landmarks
  const boneGrid = new PointGrid(0.03);
  const legGrid = new PointGrid(0.03);
  for (const region of ["head", "neck", "torso", "arms", "hands", "legs", "feet"]) {
    for (const [x, y, z] of await samplePoints(LANDMARKS[region], 7)) {
      boneGrid.add(x, y, z, region);
      if (region === "legs") legGrid.add(x, y, z, region);
    }
  }
  const xiphoidY = bounds(await loadMerged(LANDMARKS.xiphoid)).min[1];
  const hipBones = await loadMerged(LANDMARKS.hipBones);
  const hip = bounds(hipBones);
  const femurTop = bounds(await loadMerged(["FMA24474", "FMA24475"])).max[1];
  const shortsTop = femurTop + 0.07;
  const shortsBottom = hip.min[1] - 0.08;

  const eyeSoup = await loadMerged(LANDMARKS.eyeball);
  const eyes = [1, -1].map((side) => {
    const pts = [];
    for (let i = 0; i < eyeSoup.length; i += 3) if (Math.sign(eyeSoup[i]) === side) pts.push(eyeSoup[i], eyeSoup[i + 1], eyeSoup[i + 2]);
    const b = bounds(pts);
    return { center: b.center, radius: b.radius / Math.SQRT2 };
  });
  const featureGrid = new PointGrid(0.01);
  for (const [x, y, z] of await samplePoints(LANDMARKS.nose, 3)) featureGrid.add(x, y, z, "nose");
  for (const [x, y, z] of await samplePoints(LANDMARKS.lips, 2)) featureGrid.add(x, y, z, "mouth");
  for (const [x, y, z] of await samplePoints(LANDMARKS.ear, 3)) featureGrid.add(x, y, z, "ears");

  // Modesty: flatten the front of the groin into a smooth "shorts" surface.
  let zCap = -Infinity;
  const capSamples = [];
  for (let i = 0; i < pos.length; i += 3) {
    const [x, y, z] = [pos[i], pos[i + 1], pos[i + 2]];
    if (Math.abs(x) > 0.09 && Math.abs(x) < 0.14 && y > hip.min[1] - 0.02 && y < femurTop) capSamples.push(z);
  }
  capSamples.sort((a, b) => a - b);
  zCap = capSamples[Math.floor(capSamples.length * 0.9)] ?? zCap;
  for (let i = 0; i < pos.length; i += 3) {
    const [x, y] = [pos[i], pos[i + 1]];
    if (Math.abs(x) < 0.09 && y > shortsBottom && y < femurTop + 0.02 && pos[i + 2] > zCap) pos[i + 2] = zCap;
  }

  // Classify each triangle by its centroid.
  const normals = computeNormals({ positions: pos, indices: skin.indices });
  const verts = Array.from(pos);
  const norms = Array.from(normals);
  const regionTris = new Map(SKIN.regions.map((r) => [r, []]));
  const { indices } = skin;
  const centroid = (a, b, c) => [0, 1, 2].map((k) => (verts[a * 3 + k] + verts[b * 3 + k] + verts[c * 3 + k]) / 3);

  // Splits a triangle by the plane y = y0 (keeps winding), adding vertices.
  const edgeCache = new Map();
  const cut = (i, j, y0) => {
    const key = `${Math.min(i, j)}:${Math.max(i, j)}:${y0}`;
    let index = edgeCache.get(key);
    if (index === undefined) {
      const t = (y0 - verts[i * 3 + 1]) / (verts[j * 3 + 1] - verts[i * 3 + 1]);
      index = verts.length / 3;
      for (let k = 0; k < 3; k++) {
        verts.push(verts[i * 3 + k] + (verts[j * 3 + k] - verts[i * 3 + k]) * t);
        norms.push(norms[i * 3 + k] + (norms[j * 3 + k] - norms[i * 3 + k]) * t);
      }
      edgeCache.set(key, index);
    }
    return index;
  };
  const splitByPlane = (tri, y0) => {
    const side = tri.map((v) => Math.sign(verts[v * 3 + 1] - y0));
    if (side.every((s) => s >= 0) || side.every((s) => s <= 0)) return [tri];
    // Rotate so the lone vertex (on its own side) comes first.
    for (let r = 0; r < 3; r++) {
      const [a, b, c] = [tri[r], tri[(r + 1) % 3], tri[(r + 2) % 3]];
      const [sa, sb, sc] = [side[r], side[(r + 1) % 3], side[(r + 2) % 3]];
      if (sa !== 0 && sb !== sa && sc !== sa && (sb !== 0 || sc !== 0)) {
        const p = cut(a, b, y0);
        const q = cut(a, c, y0);
        return [[a, p, q], [p, b, c], [p, c, q]];
      }
    }
    return [tri];
  };

  for (let t = 0; t < indices.length; t += 3) {
    const tri = [indices[t], indices[t + 1], indices[t + 2]];
    const [x, y, z] = centroid(...tri);
    let region = boneGrid.nearest(x, y, z).label ?? "torso";
    if (region === "torso") region = y < xiphoidY ? "tummy" : "chest";

    // Thigh skin that faces the hanging hands is nearest to the hand bones.
    // If it faces outwards and is almost as close to the leg bones, it is thigh.
    if (region === "hands" && y < shortsTop && y > shortsBottom) {
      const nx = (norms[tri[0] * 3] + norms[tri[1] * 3] + norms[tri[2] * 3]) / 3;
      const handDistance = boneGrid.nearest(x, y, z).distance;
      const legDistance = legGrid.nearest(x, y, z).distance;
      if (nx * Math.sign(x) > 0.3 && legDistance < handDistance + 0.04) region = "legs";
    }

    if (region === "head") {
      const eye = eyes.find((e) => Math.hypot(x - e.center[0], y - e.center[1], z - e.center[2]) < e.radius * 1.35 && z > e.center[2]);
      const feature = featureGrid.nearest(x, y, z, 3);
      if (eye) region = "eyes";
      else if (feature.label === "nose" && feature.distance < 0.012) region = "nose";
      else if (feature.label === "mouth" && feature.distance < 0.009) region = "mouth";
      else if (feature.label === "ears" && feature.distance < 0.012) region = "ears";
    }

    // Swim shorts with straight hems: clip tummy/leg skin along two planes.
    if (region === "tummy" || region === "legs") {
      for (const upper of splitByPlane(tri, shortsTop)) {
        for (const piece of splitByPlane(upper, shortsBottom)) {
          const cy = centroid(...piece)[1];
          const pieceRegion = cy < shortsTop && cy > shortsBottom ? "shorts" : cy >= shortsTop ? "tummy" : "legs";
          regionTris.get(`skin_${pieceRegion}`).push(...piece);
        }
      }
      continue;
    }
    regionTris.get(`skin_${region}`).push(...tri);
  }

  const allPositions = new Float32Array(verts);
  const allNormals = new Float32Array(norms);
  const meshes = [];
  for (const [name, tris] of regionTris) {
    if (tris.length === 0) {
      console.warn(`  ! skin region ${name} is empty`);
      continue;
    }
    const mesh = compact({ positions: allPositions, normals: allNormals, indices: new Uint32Array(tris) });
    meshes.push({
      name,
      file: "skin",
      group: "skin",
      system: "integumentary",
      color: name === "skin_shorts" ? COLORS.shorts : COLORS.skin,
      mesh,
    });
  }
  const hair = simplify(weld(await loadMerged(SKIN.hair)), Math.min(1, ratio * 2));
  meshes.push({ name: "hair", file: "skin", group: "skin", system: "integumentary", color: COLORS.hair, mesh: hair });
  return meshes;
}

// ── Schematic nerves ─────────────────────────────────────────────────────
/** Resolves [fmaId, fx, fy, fz] landmark points to scene coordinates. */
async function landmarkPoints(points, mirror) {
  const out = [];
  for (const [rawId, fx, fy, fz] of points) {
    const id = mirror?.[rawId] ?? rawId;
    const b = bounds(await loadMerged([id]));
    // Mirrored side: flip x within the box so medial/lateral stay consistent.
    const u = mirror ? 1 - fx : fx;
    out.push([0, 1, 2].map((k) => b.min[k] + (b.max[k] - b.min[k]) * [u, fy, fz][k]));
  }
  return out;
}

function tube(points, radius) {
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
  const geometry = new TubeGeometry(curve, points.length * 16, radius, 8, false);
  return {
    positions: new Float32Array(geometry.getAttribute("position").array),
    indices: new Uint32Array(geometry.getIndex().array),
  };
}

function mergeMeshes(meshes) {
  let offset = 0;
  const positions = [];
  const indices = [];
  for (const mesh of meshes) {
    positions.push(...mesh.positions);
    for (const i of mesh.indices) indices.push(i + offset);
    offset += mesh.positions.length / 3;
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

async function buildNerves(brainCenter) {
  console.log("Building schematic spinal cord and nerves…");
  const cord = await landmarkPoints(NERVE_PATHS.spinalCord.points);
  const limbs = [];
  let rightArm = null;
  for (const key of ["arm", "leg"]) {
    const { points, radius, mirror } = NERVE_PATHS[key];
    const right = await landmarkPoints(points);
    const left = await landmarkPoints(points, mirror);
    limbs.push(tube(right, radius), tube(left, radius));
    if (key === "arm") rightArm = right;
  }
  const nodes = [
    { name: "spinal_cord", file: "organs", group: "organs", system: "nervous", color: COLORS.nerve, view: "back", mesh: tube(cord, NERVE_PATHS.spinalCord.radius) },
    { name: "nerves", file: "organs", group: "organs", system: "nervous", color: COLORS.nerve, mesh: mergeMeshes(limbs) },
  ];
  // Path a "message" travels: brain → spinal cord → right hand.
  const signal = [brainCenter, cord[0], cord[1], ...rightArm];
  return { nodes, paths: { signal: signal.map((p) => p.map((v) => +v.toFixed(4))) } };
}

// ── GLB writing ──────────────────────────────────────────────────────────
async function writeGlb(fileKey, nodes, io) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(fileKey);
  for (const node of nodes) {
    const { positions, indices } = node.mesh;
    const prim = doc
      .createPrimitive()
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(positions).setBuffer(buffer))
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(node.mesh.normals ?? computeNormals(node.mesh)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(indices).setBuffer(buffer));
    const mesh = doc.createMesh(node.name).addPrimitive(prim);
    scene.addChild(doc.createNode(node.name).setMesh(mesh));
  }
  await doc.transform(quantize(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const glb = await io.writeBinary(doc);
  const hash = createHash("sha256").update(glb).digest("hex").slice(0, 10);
  const fileName = `${fileKey}.${hash}.glb`;
  await writeFile(path.join(OUT_DIR, fileName), glb);
  return { fileName, bytes: glb.byteLength };
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

  const allIds = new Set([SKIN.fma, ...SKIN.hair, ...NODES.flatMap((n) => n.fma), ...Object.values(LANDMARKS).flat()]);
  await download([...allIds]);

  // Raw triangle counts per file → simplification ratios.
  const triCount = async (ids) => (await loadMerged(ids)).length / 9;
  const nodeTris = new Map();
  for (const node of NODES) nodeTris.set(node.name, await triCount(node.fma));
  const skinTris = await triCount([SKIN.fma]);

  const built = [];
  for (const [fileKey, { triangleBudget }] of Object.entries(FILES)) {
    if (fileKey === "skin") {
      built.push(...(await buildSkin(Math.min(1, triangleBudget / skinTris))));
      continue;
    }
    const nodes = NODES.filter((n) => n.file === fileKey);
    const total = nodes.reduce((s, n) => s + nodeTris.get(n.name), 0);
    const ratio = Math.min(1, triangleBudget / total);
    console.log(`Processing ${fileKey} (${nodes.length} nodes, ${total} → ~${Math.round(total * ratio)} triangles)…`);
    for (const node of nodes) {
      const raw = nodeTris.get(node.name);
      const nodeRatio = Math.max(ratio, Math.min(1, MIN_TRIANGLES_PER_NODE / raw));
      const mesh = simplify(weld(await loadMerged(node.fma)), nodeRatio);
      built.push({ ...node, mesh });
    }
  }

  const brain = built.find((n) => n.name === "brain");
  const nerves = await buildNerves(bounds(brain.mesh.positions).center);
  built.push(...nerves.nodes);

  // Write GLBs (remove previous hashed files first).
  await mkdir(OUT_DIR, { recursive: true });
  for (const f of await readdir(OUT_DIR)) if (f.endsWith(".glb")) await rm(path.join(OUT_DIR, f));

  const index = { source: "BodyParts3D (CC BY-SA 2.1 JP)", files: {}, paths: nerves.paths, nodes: {} };
  for (const fileKey of Object.keys(FILES)) {
    const nodes = built.filter((n) => n.file === fileKey);
    const { fileName, bytes } = await writeGlb(fileKey, nodes, io);
    const triangles = nodes.reduce((s, n) => s + n.mesh.indices.length / 3, 0);
    index.files[fileKey] = `/models/${fileName}`;
    console.log(`  ✓ ${fileName}  ${(bytes / 1024).toFixed(0)} KB, ${triangles} triangles`);
  }
  for (const node of built) {
    const b = bounds(node.mesh.positions);
    index.nodes[node.name] = {
      file: node.file,
      group: node.group,
      system: node.system,
      systems: [node.system, ...(node.alsoIn ?? SKIN.alsoIn[node.name] ?? [])],
      color: node.color,
      view: node.view ?? "front",
      center: b.center.map((v) => +v.toFixed(4)),
      radius: +b.radius.toFixed(4),
    };
  }
  await mkdir(path.dirname(INDEX_FILE), { recursive: true });
  await writeFile(INDEX_FILE, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, INDEX_FILE)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
