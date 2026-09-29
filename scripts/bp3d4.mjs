/**
 * BodyParts3D 4.0 data access shared by scripts/build-atlas.mjs and
 * scripts/build-models.mjs.
 *
 * Source: BodyParts3D, © The Database Center for Life Science, licensed under
 * CC Attribution 4.0 International (licence page updated 2025-02-27; it
 * supersedes the older CC BY-SA 2.1 JP text still present in the OBJ headers).
 * https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
 *
 * Files are downloaded once into .cache/bp3d4 (git-ignored).
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CACHE_DIR = path.join(ROOT, ".cache", "bp3d4");
const OBJ_DIR = path.join(CACHE_DIR, "obj", "isa_BP3D_4.0_obj_99");
const BASE_URL = "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST";
const TABLES = [
  "isa_element_parts.txt",
  "isa_inclusion_relation_list.txt",
  "isa_parts_list_e.txt",
  "partof_element_parts.txt",
  "partof_inclusion_relation_list.txt",
  "partof_parts_list_e.txt",
];
const ARCHIVE = "isa_BP3D_4.0_obj_99.zip";

// BodyParts3D: millimetres, Z up, −Y anterior, −X = subject's right.
// Scene: metres, Y up, +Z anterior (towards the camera), feet at y = 0.
// Offsets come from the 4.0 skin bounds (FJ2810).
const FLOOR_MM = -78.1112;
const CENTER_Y_MM = -100.768;
export const toScene = (x, y, z) => [x / 1000, (z - FLOOR_MM) / 1000, -(y - CENTER_Y_MM) / 1000];

export async function ensureBp3d4() {
  await mkdir(CACHE_DIR, { recursive: true });
  for (const file of [...TABLES, ARCHIVE]) {
    const target = path.join(CACHE_DIR, file);
    if (existsSync(target)) continue;
    console.log(`Downloading ${file}…`);
    const res = await fetch(`${BASE_URL}/${file}`);
    if (!res.ok) throw new Error(`Download failed for ${file}: HTTP ${res.status}`);
    await writeFile(target, Buffer.from(await res.arrayBuffer()));
  }
  if (!existsSync(OBJ_DIR)) {
    console.log("Unpacking meshes…");
    execFileSync("unzip", ["-q", "-o", path.join(CACHE_DIR, ARCHIVE), "-d", path.join(CACHE_DIR, "obj")]);
  }
}

async function tsv(file) {
  const text = await readFile(path.join(CACHE_DIR, file), "utf8");
  return text
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/\r$/, "").split("\t"));
}

/**
 * Loads names, hierarchies and element headers.
 * - elements: FJ id → { id, concept, name } (from each OBJ header)
 * - names: concept id → English name
 * - conceptElements: concept id → Set of FJ ids (IS-A and PART-OF compounds)
 * - isaParents / partofParents: concept id → parent concept ids
 * - representation: BP id → concept id
 */
export async function loadCatalogue() {
  const names = new Map();
  const representation = new Map();
  for (const file of ["isa_parts_list_e.txt", "partof_parts_list_e.txt"]) {
    for (const [concept, rep, name] of await tsv(file)) {
      names.set(concept, name);
      representation.set(rep, concept);
    }
  }
  const conceptElements = new Map();
  const isaConcepts = new Set();
  for (const file of ["isa_element_parts.txt", "partof_element_parts.txt"]) {
    for (const [concept, name, element] of await tsv(file)) {
      if (!names.has(concept)) names.set(concept, name);
      if (!conceptElements.has(concept)) conceptElements.set(concept, new Set());
      conceptElements.get(concept).add(element);
      if (file.startsWith("isa")) isaConcepts.add(concept);
    }
  }
  const parents = async (file) => {
    const map = new Map();
    for (const [parent, , child] of await tsv(file)) {
      if (!map.has(child)) map.set(child, []);
      map.get(child).push(parent);
    }
    return map;
  };
  const isaParents = await parents("isa_inclusion_relation_list.txt");
  const partofParents = await parents("partof_inclusion_relation_list.txt");

  const elements = new Map();
  for (const file of (await readdir(OBJ_DIR)).filter((f) => f.endsWith(".obj")).sort()) {
    const head = (await readFile(path.join(OBJ_DIR, file), "utf8")).slice(0, 1500);
    const id = file.replace(".obj", "");
    elements.set(id, {
      id,
      concept: /Concept ID : (\S+)/.exec(head)?.[1],
      name: /English name : (.*)/.exec(head)?.[1]?.trim() ?? "",
    });
  }
  return { names, representation, conceptElements, isaConcepts, isaParents, partofParents, elements };
}

/** All ancestors of a concept in a parent map. */
export function ancestors(parentMap, concept, seen = new Set()) {
  for (const parent of parentMap.get(concept) ?? []) {
    if (seen.has(parent)) continue;
    seen.add(parent);
    ancestors(parentMap, parent, seen);
  }
  return seen;
}

/** Parses an OBJ mesh into scene-space positions and triangle indices. */
export async function loadObj(id) {
  const text = await readFile(path.join(OBJ_DIR, `${id}.obj`), "utf8");
  const positions = [];
  const indices = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("v ")) {
      const [x, y, z] = line.slice(2).trim().split(/\s+/).map(Number);
      positions.push(...toScene(x, y, z));
    } else if (line.startsWith("f ")) {
      const face = line
        .slice(2)
        .trim()
        .split(/\s+/)
        .map((token) => Number.parseInt(token, 10) - 1);
      for (let i = 1; i + 1 < face.length; i++) indices.push(face[0], face[i], face[i + 1]);
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}
