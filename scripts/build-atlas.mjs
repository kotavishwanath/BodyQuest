#!/usr/bin/env node
/**
 * Builds the in-depth anatomy atlas (Junior + BiPC) from BodyParts3D 4.0.
 *
 *   npm run atlas
 *
 * Every one of the 2,234 source meshes is kept as its own selectable part.
 * Parts are sorted into display systems, simplified for the web, and packed
 * into one GLB per system: a single merged mesh whose `_PART` vertex attribute
 * holds the global part index (used for picking, highlighting and the
 * exploded view in the shader). A catalogue JSON lists parts, the named FMA
 * concepts that group them (for search) and the PART-OF hierarchy.
 *
 * Output: public/atlas/<system>.<hash>.glb, public/atlas/atlas.<hash>.json and
 * src/generated/atlas-files.json (the catalogue URL).
 *
 * Data: BodyParts3D, © The Database Center for Life Science, CC BY 4.0.
 */

import { createHash } from "node:crypto";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Accessor, Document, NodeIO } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { quantize, reorder } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { ancestors, ensureBp3d4, loadCatalogue, loadObj } from "./bp3d4.mjs";
import { bounds, compact, computeNormals, dropDegenerate, simplify } from "./mesh-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "atlas");
const FILES_INDEX = path.join(ROOT, "src", "generated", "atlas-files.json");

/** The whole-body skin comes from the kids' skin model (it has modesty shorts). */
const SKIN_ELEMENT = "FJ2810";
/** Left out of the atlas entirely. */
const EXCLUDED_NAMES = /pubic hair/i;

/** Triangle budget per system (the raw data has 6.7 M triangles). */
const BUDGET = {
  skeletal: 300_000,
  muscular: 300_000,
  cardiac: 45_000,
  arterial: 150_000,
  venous: 110_000,
  nervous: 120_000,
  sensory: 30_000,
  respiratory: 80_000,
  digestive: 100_000,
  urinary: 25_000,
  lymphatic: 12_000,
  endocrine: 12_000,
  reproductive: 30_000,
  integumentary: 20_000,
  connective: 60_000,
};
const MIN_TRIANGLES = 80;

/** Curated groups (ids prefixed "BV:"), e.g. both lungs or the larynx. */
const GROUPS = [
  { id: "BV:lungs", name: "Lungs", concepts: ["FMA7309", "FMA7310"] },
  { id: "BV:eyeballs", name: "Eyeballs", concepts: ["FMA12514", "FMA12515"] },
  {
    id: "BV:larynx",
    name: "Larynx",
    system: "respiratory",
    names: /cricoid|cricothyroid|arytenoid|thyroid cartilage|epiglott|corniculate|cuneiform|conus elasticus|vocal|thyrohyoid|crico-arytenoid|thyro-arytenoid|vocalis/i,
  },
  { id: "BV:nasal-cartilages", name: "Nasal cartilages", system: "respiratory", names: /nasal cartilage|alar cartilage/i },
  { id: "BV:teeth", name: "Teeth", system: "skeletal", names: /tooth$/i },
  { id: "BV:heart-valves", name: "Heart valves", system: "cardiac", names: /valve|leaflet/i },
  { id: "BV:papillary-muscles", name: "Papillary muscles", system: "cardiac", names: /papillary muscle/i },
  { id: "BV:adrenal-glands", name: "Adrenal glands", system: "endocrine", names: /adrenal/i },
  { id: "BV:intervertebral-disks", name: "Intervertebral disks", names: /intervertebral disk/i },
  { id: "BV:cerebrum", name: "Cerebrum", concepts: ["FMA61819", "FMA67292"] },
  { id: "BV:biceps-brachii", name: "Biceps brachii", system: "muscular", names: /biceps brachii/i },
  { id: "BV:triceps-brachii", name: "Triceps brachii", system: "muscular", names: /triceps brachii/i },
  { id: "BV:deltoid", name: "Deltoid", system: "muscular", names: /deltoid$/i },
  { id: "BV:pectoralis-major", name: "Pectoralis major", system: "muscular", names: /pectoralis major/i },
  { id: "BV:quadriceps", name: "Quadriceps femoris", system: "muscular", names: /rectus femoris|vastus (lateralis|medialis|intermedius)/i },
  { id: "BV:gastrocnemius", name: "Gastrocnemius", system: "muscular", names: /gastrocnemius/i },
  { id: "BV:intercostals", name: "Intercostal muscles", system: "muscular", names: /intercostal muscle/i },
  { id: "BV:penis", name: "Penis", system: "reproductive", names: /corpus cavernosum|corpus spongiosum|glans penis/i },
];

const has = (list, re) => list.some((name) => re.test(name));

/** Display system for a mesh, from its IS-A / PART-OF ancestry and name. */
function classify(name, isaNames, allNames) {
  const n = name.toLowerCase();
  if (has(allNames, /genital|testis|penis|scrotum|prostat|epididym|seminal|spermatic|ductus deferens|ovary|uterus|vagina|clitoris|labium|vulva|placenta|umbilical/)) return "reproductive";
  if (has(isaNames, /^artery$|arterial tree|^arterial trunk/)) return "arterial";
  if (has(isaNames, /^vein$|venous tree|^venous trunk|venous anastomosis|venous plexus/)) return "venous";
  if (/hair|eyebrow|eyelash|\bnail\b/.test(n)) return "integumentary";
  if (/papillary muscle|chorda|trabecula carnea/.test(n)) return "cardiac";
  if (/gallbladder|bile|biliary|hepatic duct|cystic duct/.test(n)) return "digestive";
  if (/cricoid|cricothyroid|arytenoid|thyroid cartilage|epiglott|corniculate|cuneiform cartilage|conus elasticus|vocal|thyrohyoid|nasal cartilage|alar cartilage|nasal septum/.test(n)) return "respiratory";
  if (has(isaNames, /^muscle organ$|^muscle of|head of muscle organ|zone of muscle organ|^tendon/)) return "muscular";
  if (/intervertebral disk|articular disk|meniscus/.test(n)) return "connective";
  if (has(isaNames, /^bone organ$|^tooth$|^bone$/) || /sternum|\bbone\b|vertebra$|\brib\b|hyoid|malleus|incus|stapes/.test(n)) return "skeletal";
  if (/nerve|ganglion/.test(n)) return "nervous";
  if (/lacrimal|tarsal plate|eyelid|check ligament|trochlea of|tendinous ring|external ear|auricle/.test(n)) return "sensory";
  if (has(allNames, /^heart$|cardiac|atrium|ventricle of heart|valve/)) return "cardiac";
  if (has(allNames, /neuraxis|^nerve$|neural tree|^brain$|spinal cord|ganglion|cranial nerve|nervous/) || /tentorium|interventricular foramen|interpeduncular/.test(n)) return "nervous";
  if (has(allNames, /eyeball|^eye$|\blens\b|\bretina\b|cornea|^ear$|cochlea|auditory|vestibul|labyrinth|tympanic/)) return "sensory";
  if (has(allNames, /tracheobronchial|bronch|^lung|larynx|trachea|pleura|nasal cavity|respiratory/)) return "respiratory";
  if (has(allNames, /spleen|thymus|lymph|tonsil/)) return "lymphatic";
  if (has(allNames, /thyroid gland|parathyroid|adrenal|suprarenal|pituitary|hypophysis|pineal/)) return "endocrine";
  if (has(allNames, /kidney|ureter|urinary|bladder|urethra|renal/)) return "urinary";
  if (has(allNames, /alimentary|digestive|stomach|intestin|colon|rectum|anal canal|liver|hepat|pancrea|esophag|pharynx|gallbladder|tongue|cecum|appendix|duoden|jejun|ileum|salivary|parotid|biliary|bile/)) return "digestive";
  if (/arter|arterial arch|palmar arch/.test(n)) return "arterial";
  if (/vein|venous/.test(n)) return "venous";
  if (/muscle|inteross|lumbrical|trapezius|spinalis|intertransversari|interspinales|levatores|linea alba|raphe/.test(n)) return "muscular";
  return "connective";
}

/** Concepts too generic to be useful in search. */
const GENERIC =
  /^(physical |material )?anatomical|^organ( |$)|cardinal organ part|organ region|organ segment|organ component|organ zone|solid organ|nonparenchymatous|cavitated organ|^region of|^segment of|^subdivision of|^zone of|set of organ|anatomical (set|cluster)|^body proper$|^human body$|^body cavity|cell part cluster|^organ with/i;

async function writeSystemGlb(system, parts, io) {
  const vertexTotal = parts.reduce((n, p) => n + p.mesh.positions.length / 3, 0);
  const indexTotal = parts.reduce((n, p) => n + p.mesh.indices.length, 0);
  const positions = new Float32Array(vertexTotal * 3);
  const normals = new Float32Array(vertexTotal * 3);
  const partIds = new Uint16Array(vertexTotal);
  const indices = new Uint32Array(indexTotal);
  let v = 0;
  let i = 0;
  for (const part of parts) {
    const { mesh } = part;
    positions.set(mesh.positions, v * 3);
    normals.set(computeNormals(mesh), v * 3);
    partIds.fill(part.index, v, v + mesh.positions.length / 3);
    for (let k = 0; k < mesh.indices.length; k++) indices[i + k] = mesh.indices[k] + v;
    v += mesh.positions.length / 3;
    i += mesh.indices.length;
  }

  const doc = new Document();
  const buffer = doc.createBuffer();
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(positions).setBuffer(buffer))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(normals).setBuffer(buffer))
    .setAttribute("_PART", doc.createAccessor().setType(Accessor.Type.SCALAR).setArray(partIds).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType("SCALAR").setArray(indices).setBuffer(buffer));
  const mesh = doc.createMesh(system).addPrimitive(prim);
  doc.createScene(system).addChild(doc.createNode(system).setMesh(mesh));
  await doc.transform(
    reorder({ encoder: MeshoptEncoder, target: "size" }),
    quantize({ pattern: /^(POSITION|NORMAL)$/ }),
  );
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const glb = await io.writeBinary(doc);
  const hash = createHash("sha256").update(glb).digest("hex").slice(0, 10);
  const fileName = `${system}.${hash}.glb`;
  await writeFile(path.join(OUT_DIR, fileName), glb);
  return { fileName, bytes: glb.byteLength, triangles: indexTotal / 3 };
}

const round = (values, digits = 4) => values.map((x) => +x.toFixed(digits));

async function main() {
  await ensureBp3d4();
  await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

  console.log("Reading catalogue…");
  const cat = await loadCatalogue();
  const nameOf = (concept) => cat.names.get(concept) ?? "";

  // Which compound concepts contain each element (for naming and classification).
  const containers = new Map();
  for (const [concept, set] of cat.conceptElements) {
    for (const element of set) {
      if (!containers.has(element)) containers.set(element, []);
      containers.get(element).push(concept);
    }
  }

  // ── Parts ──────────────────────────────────────────────────────────────
  const parts = [];
  for (const element of cat.elements.values()) {
    if (element.id === SKIN_ELEMENT) continue;
    const own = containers.get(element.id) ?? [];
    // Some headers lack a name/concept: use the most specific containing concept.
    const specific = [...own].sort((a, b) => cat.conceptElements.get(a).size - cat.conceptElements.get(b).size)[0];
    const concept = element.concept ?? specific;
    const name = element.name || nameOf(concept);
    if (EXCLUDED_NAMES.test(name)) continue;
    const isaNames = [...ancestors(cat.isaParents, concept)].map(nameOf).map((s) => s.toLowerCase());
    const allNames = [
      ...isaNames,
      ...[...ancestors(cat.partofParents, concept)].map(nameOf),
      ...own.map(nameOf),
      name,
    ].map((s) => s.toLowerCase());
    parts.push({ id: element.id, concept, name: name.charAt(0).toUpperCase() + name.slice(1), system: classify(name, isaNames, allNames) });
  }

  // Raw geometry
  console.log(`Loading ${parts.length} meshes…`);
  const rawTris = {};
  for (const part of parts) {
    const raw = await loadObj(part.id);
    part.mesh = compact({ positions: raw.positions, indices: dropDegenerate(raw.indices) });
    rawTris[part.system] = (rawTris[part.system] ?? 0) + part.mesh.indices.length / 3;
  }

  // Stable order: by system, then name. Index = value of the _PART attribute.
  const systems = Object.keys(BUDGET);
  parts.sort((a, b) => systems.indexOf(a.system) - systems.indexOf(b.system) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  parts.forEach((part, index) => (part.index = index));
  const unknown = parts.filter((p) => !systems.includes(p.system));
  if (unknown.length) throw new Error(`Unassigned systems: ${[...new Set(unknown.map((p) => p.system))].join(", ")}`);

  await mkdir(OUT_DIR, { recursive: true });
  for (const f of await readdir(OUT_DIR)) if (f.endsWith(".glb") || f.endsWith(".json")) await rm(path.join(OUT_DIR, f));

  const systemFiles = {};
  let totalBytes = 0;
  let totalTris = 0;
  for (const system of systems) {
    const group = parts.filter((p) => p.system === system);
    if (!group.length) continue;
    const ratio = Math.min(1, BUDGET[system] / rawTris[system]);
    for (const part of group) {
      const count = part.mesh.indices.length / 3;
      const partRatio = Math.max(ratio, Math.min(1, MIN_TRIANGLES / count));
      part.mesh = simplify(part.mesh, partRatio, 0.01);
      const b = bounds(part.mesh.positions);
      part.center = round(b.center);
      part.size = round(b.max.map((x, k) => x - b.min[k]));
    }
    const { fileName, bytes, triangles } = await writeSystemGlb(system, group, io);
    systemFiles[system] = { file: `/atlas/${fileName}`, parts: group.length, triangles };
    totalBytes += bytes;
    totalTris += triangles;
    console.log(`  ✓ ${fileName}  ${group.length} parts, ${triangles} triangles, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  }

  // ── Concepts (search + hierarchy) ──────────────────────────────────────
  const partIndex = new Map(parts.map((p) => [p.id, p.index]));
  const concepts = [];
  const conceptIndex = new Map();
  const addConcept = (id, name, members) => {
    if (conceptIndex.has(id)) return;
    conceptIndex.set(id, concepts.length);
    concepts.push({ id, name: name.charAt(0).toUpperCase() + name.slice(1), parts: members });
  };
  // Every part is its own concept first, so search always finds single meshes.
  for (const part of parts) addConcept(part.concept, part.name, [part.index]);
  for (const [id, set] of cat.conceptElements) {
    const name = nameOf(id);
    if (!name || GENERIC.test(name)) continue;
    const members = [...set].map((e) => partIndex.get(e)).filter((x) => x !== undefined).sort((a, b) => a - b);
    if (!members.length || members.length > 600) continue;
    if (conceptIndex.has(id)) {
      // A part's own concept may also be a compound (e.g. both sides).
      const existing = concepts[conceptIndex.get(id)];
      existing.parts = [...new Set([...existing.parts, ...members])].sort((a, b) => a - b);
      continue;
    }
    addConcept(id, name, members);
  }
  // PART-OF parent (first parent that is also a concept here).
  for (const concept of concepts) {
    const parent = (cat.partofParents.get(concept.id) ?? []).find((p) => conceptIndex.has(p));
    if (parent) concept.parent = conceptIndex.get(parent);
  }

  // Curated groups for syllabus topics that have no single source concept.
  for (const group of GROUPS) {
    const members = new Set();
    for (const id of group.concepts ?? []) for (const i of concepts[conceptIndex.get(id)]?.parts ?? []) members.add(i);
    if (group.names) for (const p of parts) if (group.names.test(p.name) && (!group.system || p.system === group.system)) members.add(p.index);
    if (!members.size) throw new Error(`Group ${group.id} is empty`);
    addConcept(group.id, group.name, [...members].sort((a, b) => a - b));
  }

  const catalogue = {
    source: "BodyParts3D 4.0, © The Database Center for Life Science, CC BY 4.0",
    triangles: totalTris,
    bytes: totalBytes,
    systems: systemFiles,
    parts: parts.map((p) => ({ id: p.id, concept: p.concept, name: p.name, system: p.system, center: p.center, size: p.size })),
    concepts,
  };
  const json = JSON.stringify(catalogue);
  const hash = createHash("sha256").update(json).digest("hex").slice(0, 10);
  const catalogueFile = `atlas.${hash}.json`;
  await writeFile(path.join(OUT_DIR, catalogueFile), json);
  await mkdir(path.dirname(FILES_INDEX), { recursive: true });
  await writeFile(FILES_INDEX, `${JSON.stringify({ catalogue: `/atlas/${catalogueFile}` }, null, 2)}\n`);

  const counts = Object.fromEntries(systems.map((s) => [s, parts.filter((p) => p.system === s).length]));
  console.log(counts);
  console.log(
    `Done: ${parts.length} parts, ${concepts.length} concepts, ${totalTris.toLocaleString()} triangles, ${(totalBytes / 1024 / 1024).toFixed(1)} MB geometry, catalogue ${(json.length / 1024).toFixed(0)} KB.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
