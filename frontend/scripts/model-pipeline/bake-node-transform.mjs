// weld()/meshopt() normalize the node transform (scale ~0.5, offset to the origin). The app
// centers and scales each model from its Box3, so a re-posed mesh would sit differently from
// the source. Copying the source node's world transform into the vertices keeps the files'
// presentation identical to the originals.
import { transformPrimitive } from "@gltf-transform/functions";

function trs(translation, rotation, scale) {
  const [x, y, z, w] = rotation;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    [(1 - (yy + zz)) * scale[0], (xy + wz) * scale[0], (xz - wy) * scale[0], 0],
    [(xy - wz) * scale[1], (1 - (xx + zz)) * scale[1], (yz + wx) * scale[1], 0],
    [(xz + wy) * scale[2], (yz - wx) * scale[2], (1 - (xx + yy)) * scale[2], 0],
    [translation[0], translation[1], translation[2], 1],
  ];
}

function worldMatrix(roots, parent = null) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    out[c * 4 + r] = parent ? parent[r] * roots[c][0] + parent[4 + r] * roots[c][1] + parent[8 + r] * roots[c][2] + parent[12 + r] * roots[c][3] : roots[c][r];
  }
  return out;
}

export function bakeNodeTransform(source) {
  const node = source.getRoot().listScenes()[0]?.listChildren().find((n) => n.getMesh());
  const local = node ? trs(node.getTranslation(), node.getRotation(), node.getScale()) : trs([0, 0, 0], [0, 0, 0, 1], [1, 1, 1]);
  const m = worldMatrix(local);
  return async (doc) => {
    for (const n of doc.getRoot().listNodes()) {
      if (!n.getMesh()) continue;
      for (const prim of n.getMesh().listPrimitives()) transformPrimitive(prim, m);
      n.setTranslation([0, 0, 0]);
      n.setRotation([0, 0, 0, 1]);
      n.setScale([1, 1, 1]);
    }
  };
}
