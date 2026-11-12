// Structural analysis and world-space bounds for the model pipeline.

export function analyze(doc) {
  const root = doc.getRoot();
  const meshes = root.listMeshes();
  const primitives = meshes.flatMap((m) => m.listPrimitives());
  if (primitives.length !== 1) throw new Error(`expected a single primitive, found ${primitives.length}`);
  const prim = primitives[0];
  const pos = prim.getAttribute("POSITION");
  if (!pos) throw new Error("primitive has no POSITION");
  const n = pos.getCount();
  const indices = prim.getIndices() ? prim.getIndices().getArray() : null;
  const triangles = (indices ? indices.length : n) / 3;

  let boundary = 0;
  let nonManifold = 0;
  let degenerate = 0;
  if (indices) {
    const edges = new Map();
    for (let t = 0; t < triangles; t++) {
      const a = indices[3 * t], b = indices[3 * t + 1], c = indices[3 * t + 2];
      if (a === b || b === c || a === c) { degenerate++; continue; }
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const key = u < v ? `${u}_${v}` : `${v}_${u}`;
        const e = edges.get(key);
        if (e) e.count++;
        else edges.set(key, { count: 1 });
      }
    }
    for (const e of edges.values()) {
      if (e.count === 1) boundary++;
      else if (e.count > 2) nonManifold++;
    }
  }

  return {
    meshes: meshes.length,
    primitives: primitives.length,
    indexed: !!indices,
    hasNormals: !!prim.getAttribute("NORMAL"),
    triangles,
    vertices: n,
    degenerate,
    boundaryEdges: boundary,
    nonManifoldEdges: nonManifold,
    watertight: !!indices && boundary === 0 && nonManifold === 0 && degenerate === 0,
  };
}

export function worldBounds(doc) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const compose = (node, parent) => {
    // Column-major 4x4 TRS, matching glTF node transforms.
    const [qx, qy, qz, qw] = node.getRotation();
    const [sx, sy, sz] = node.getScale();
    const [tx, ty, tz] = node.getTranslation();
    const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
    const xx = qx * x2, xy = qx * y2, xz = qx * z2, yy = qy * y2, yz = qy * z2, zz = qz * z2;
    const wx = qw * x2, wy = qw * y2, wz = qw * z2;
    const local = [
      (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
      (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
      (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
      tx, ty, tz, 1,
    ];
    if (!parent) return local;
    const out = new Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        out[c * 4 + r] =
          parent[r] * local[c * 4] + parent[4 + r] * local[c * 4 + 1] + parent[8 + r] * local[c * 4 + 2] + parent[12 + r] * local[c * 4 + 3];
      }
    }
    return out;
  };
  const visit = (node, parent) => {
    const world = compose(node, parent);
    for (const prim of node.getMesh()?.listPrimitives() ?? []) {
      const a = prim.getAttribute("POSITION");
      const arr = a.getArray();
      // Normalized packed accessors expose raw integers here.
      const k = a.getNormalized() ? 1 / 32767 : 1;
      const size = a.getElementSize();
      for (let i = 0; i < arr.length; i += size) {
        const x = arr[i] * k, y = arr[i + 1] * k, z = arr[i + 2] * k;
        const px = world[0] * x + world[4] * y + world[8] * z + world[12];
        const py = world[1] * x + world[5] * y + world[9] * z + world[13];
        const pz = world[2] * x + world[6] * y + world[10] * z + world[14];
        if (px < min[0]) min[0] = px; if (py < min[1]) min[1] = py; if (pz < min[2]) min[2] = pz;
        if (px > max[0]) max[0] = px; if (py > max[1]) max[1] = py; if (pz > max[2]) max[2] = pz;
      }
    }
    for (const child of node.listChildren()) visit(child, world);
  };
  for (const scene of doc.getRoot().listScenes()) for (const node of scene.listChildren()) visit(node, null);
  return { min, max };
}

// Largest corner deviation between two world-space bounds, as a percentage of the source diagonal.
export function boundsDriftPct(sourceBox, otherBox) {
  const drift = Math.max(...sourceBox.min.map((v, i) => Math.abs(v - otherBox.min[i])), ...sourceBox.max.map((v, i) => Math.abs(v - otherBox.max[i])));
  const diag = Math.hypot(...sourceBox.max.map((v, i) => v - sourceBox.min[i]));
  return +(100 * drift / diag).toFixed(4);
}
