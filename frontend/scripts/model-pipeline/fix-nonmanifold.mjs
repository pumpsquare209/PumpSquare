// The meshopt simplifier occasionally leaves an edge shared by three or four triangles (e.g.
// 1333: a duplicated surface stitch) when it collapses past a thin feature. Source models are
// closed manifolds, so the output should be too.
//
// Removing or flipping triangles cannot fix a duplicated stitch without opening another edge.
// The only self-contained repair is to drop the connected component the bad edge sits in,
// provided that component is a sliver. If the bad edges sit in the main body the mesh is left
// untouched (still closed, just with a duplicated stitch) and the caller records a warning.
import { Accessor, Primitive } from "@gltf-transform/core";

const MAX_DROP_FRACTION = 0.01;

export function fixNonManifold() {
  return async (doc) => {
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        if (prim.getMode() !== Primitive.Mode.TRIANGLES) continue;
        const indices = prim.getIndices();
        if (!indices) continue;
        const src = Array.from(indices.getArray());
        const tris = src.length / 3;
        const key = (u, v) => (u < v ? u * 4294967296 + v : v * 4294967296 + u);

        const edges = new Map();
        const parent = new Int32Array(tris).map((_, i) => i);
        const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
        for (let t = 0; t < tris; t++) for (let c = 0; c < 3; c++) {
          const k = key(src[3 * t + c], src[3 * t + ((c + 1) % 3)]);
          const e = edges.get(k);
          if (!e) edges.set(k, [t]);
          else { e.push(t); const a = find(e[0]), b = find(t); if (a !== b) parent[a] = b; }
        }

        const bad = [...edges.values()].filter((l) => l.length > 2);
        if (!bad.length) continue;
        const drop = new Set(bad.map((l) => find(l[0])));
        let dropped = 0;
        for (let t = 0; t < tris; t++) if (drop.has(find(t))) dropped++;
        if (dropped === 0 || dropped > tris * MAX_DROP_FRACTION) {
          console.log(`fixNonManifold: left ${bad.length} duplicated-stitch edges (no clean sliver repair)`);
          continue;
        }

        const IndexCtor = indices.getArray().constructor;
        const out = new IndexCtor((tris - dropped) * 3);
        for (let t = 0, k = 0; t < tris; t++) {
          if (drop.has(find(t))) continue;
          out[k++] = src[3 * t]; out[k++] = src[3 * t + 1]; out[k++] = src[3 * t + 2];
        }
        prim.setIndices(doc.createAccessor().setType(Accessor.Type.SCALAR).setArray(out));
        console.log(`fixNonManifold: dropped ${dropped} sliver triangles to remove ${bad.length} bad edges`);
      }
    }
  };
}
