// Smooth vertex normals for indexed triangle primitives.
//
// The source CAD meshes have no NORMAL attribute; the app relied on three.js
// computeVertexNormals, which averages face normals area-weighted over the dense source mesh.
// This bakes the same kind of average into the file. The exponent `weight` controls how much a
// single large triangle can dominate a vertex (1 = area-weighted, 0 = one vote per face).
import { Accessor, Primitive } from "@gltf-transform/core";

export function smoothNormals({ weight = 1, attribute = "NORMAL" } = {}) {
  return async (doc) => {
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        if (prim.getMode() !== Primitive.Mode.TRIANGLES) continue;
        prim.setAttribute(attribute, doc.createAccessor(attribute).setType(Accessor.Type.VEC3).setArray(buildNormals(prim, weight)));
      }
    }
  };
}

function buildNormals(prim, weight) {
  const position = prim.getAttribute("POSITION");
  if (!position) throw new Error("primitive has no POSITION");
  const pos = position.getArray();
  const vertCount = position.getCount();
  const indices = prim.getIndices()
    ? Uint32Array.from(prim.getIndices().getArray())
    : Uint32Array.from({ length: vertCount }, (_, i) => i);

  const acc = new Float64Array(vertCount * 3);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const e1x = pos[b] - pos[a], e1y = pos[b + 1] - pos[a + 1], e1z = pos[b + 2] - pos[a + 2];
    const e2x = pos[c] - pos[a], e2y = pos[c + 1] - pos[a + 1], e2z = pos[c + 2] - pos[a + 2];
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const l = Math.hypot(nx, ny, nz);
    if (l === 0) continue;
    // weight 1: bare cross product (area-weighted). weight 0: unit normal (per-face vote).
    nx /= l; ny /= l; nz /= l;
    const w = Math.pow(l / 2, weight);
    nx *= w; ny *= w; nz *= w;
    acc[a] += nx; acc[a + 1] += ny; acc[a + 2] += nz;
    acc[b] += nx; acc[b + 1] += ny; acc[b + 2] += nz;
    acc[c] += nx; acc[c + 1] += ny; acc[c + 2] += nz;
  }

  const normals = new Float32Array(vertCount * 3);
  for (let v = 0; v < vertCount; v++) {
    const x = acc[3 * v], y = acc[3 * v + 1], z = acc[3 * v + 2];
    const l = Math.hypot(x, y, z);
    if (l > 0) { normals[3 * v] = x / l; normals[3 * v + 1] = y / l; normals[3 * v + 2] = z / l; }
    else { normals[3 * v + 1] = 1; }
  }
  return normals;
}
