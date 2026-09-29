/** Mesh helpers shared by the model build scripts. */

import { MeshoptSimplifier } from "meshoptimizer";

/** Merges identical vertices of a triangle soup → indexed mesh. */
export function weld(soup) {
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
  return { positions: new Float32Array(positions), indices: dropDegenerate(indices) };
}

/** Removes triangles that reference the same vertex twice. */
export function dropDegenerate(indices) {
  const clean = [];
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
    if (a !== b && b !== c && a !== c) clean.push(a, b, c);
  }
  return new Uint32Array(clean);
}

/** Removes unused vertices and re-numbers indices (optionally carrying normals). */
export function compact({ positions, indices, normals }) {
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

/** Simplifies to roughly `ratio` of the triangles (meshoptimizer). */
export function simplify(mesh, ratio, error = 0.02) {
  if (ratio >= 0.999) return mesh;
  const target = Math.max(3, Math.floor((mesh.indices.length * ratio) / 3) * 3);
  let [indices] = MeshoptSimplifier.simplify(mesh.indices, mesh.positions, 3, target, error, []);
  if (indices.length > target * 1.6) {
    [indices] = MeshoptSimplifier.simplifySloppy(mesh.indices, mesh.positions, 3, null, target, error * 2.5);
  }
  return compact({ positions: mesh.positions, indices });
}

/** Area-weighted smooth vertex normals. */
export function computeNormals({ positions, indices }) {
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

export function bounds(positions) {
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
