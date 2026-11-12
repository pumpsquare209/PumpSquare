// Builds the LOD variants served by the homepage viewers.
// Usage: node build.mjs [--tier desktop|mobile|all] [--version v2] [--normal-weight 1]
// Writes public/models/<name>-<tier>-vN.glb and appends measurements to work/build-report-vN.json.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, simplify, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bakeNodeTransform } from "./bake-node-transform.mjs";
import { fixNonManifold } from "./fix-nonmanifold.mjs";
import { smoothNormals } from "./smooth-normals.mjs";
import { analyze, boundsDriftPct, worldBounds } from "./report.mjs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : fallback;
};
const version = opt("version", "v2");
const tierFilter = opt("tier", "all");
const ERROR = 0.001;
const NORMAL_WEIGHT = Number(opt("normal-weight", "1"));

// Desktop target keeps detail; mobile sits above the 40k-60k window because 60k visibly
// faceted the pump's vent hatch and equipment bosses (see FINAL REPORT).
const TIERS = {
  desktop: { tris: { pump: 120000, last: 120000 } },
  mobile: { tris: { pump: 80000, last: 80000 } },
};
const MODELS = [
  { name: "pump", src: "../../public/models/pumpsquare-pump.glb" },
  { name: "last", src: "../../public/models/homelastsection.glb" },
];

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready, MeshoptDecoder.ready]);

mkdirSync("work", { recursive: true });
const reportPath = join("work", `build-report-${version}.json`);
const report = [];

for (const tier of Object.keys(TIERS)) {
  if (tierFilter !== "all" && tierFilter !== tier) continue;
  for (const model of MODELS) {
    const target = TIERS[tier].tris[model.name];
    const src = await io.read(model.src);
    const srcStats = analyze(src);
    const srcBox = worldBounds(src);
    if (srcStats.triangles <= target) {
      throw new Error(`${model.name} already below target ${target}; refusing to up-sample`);
    }
    const doc = await io.read(model.src);
    await doc.transform(
      weld({ tolerance: 0 }),
      dedup(),
      simplify({ simplifier: MeshoptSimplifier, ratio: target / srcStats.triangles, error: ERROR, steps: 40 }),
      fixNonManifold(),
      smoothNormals({ weight: NORMAL_WEIGHT }),
      prune(),
    );
    // meshopt/weld re-pose the node (dequantization is carried by the node matrix); restore the
    // source pose in the vertices so the app's Box3 centering matches the originals.
    await doc.transform(bakeNodeTransform(src));
    await doc.transform(meshopt({ encoder: MeshoptEncoder, simplifier: MeshoptSimplifier, level: "medium" }));
    const out = `../../public/models/${model.name}-${tier}-${version}.glb`;
    await io.write(out, doc);

    const written = await io.read(out);
    const stats = analyze(written);
    if (stats.meshes !== 1 || stats.primitives !== 1) throw new Error("mesh structure changed");
    if (!stats.indexed || !stats.hasNormals) throw new Error("output lost indices or normals");
    if (stats.boundaryEdges !== 0 || stats.degenerate !== 0) throw new Error(`output has holes (${stats.boundaryEdges} boundary, ${stats.degenerate} degenerate)`);
    if (stats.nonManifoldEdges) console.warn(`warning: ${stats.nonManifoldEdges} duplicated-stitch edges (source had 0)`);

    const drift = boundsDriftPct(srcBox, worldBounds(written));
    if (drift > 0.05) throw new Error(`shape drifted ${drift}% of model size`);

    const row = {
      model: model.name,
      tier,
      version,
      file: out.split("/").pop(),
      simplifyError: ERROR,
      normalWeight: NORMAL_WEIGHT,
      srcTriangles: srcStats.triangles,
      srcVertices: srcStats.vertices,
      srcMB: +(statSync(model.src).size / 1048576).toFixed(2),
      triangles: stats.triangles,
      pctOfSource: +(100 * stats.triangles / srcStats.triangles).toFixed(1),
      vertices: stats.vertices,
      meshes: stats.meshes,
      primitives: stats.primitives,
      hasNormals: stats.hasNormals,
      boundaryEdges: stats.boundaryEdges,
      nonManifoldEdges: stats.nonManifoldEdges,
      boundsDriftPct: drift,
      sizeMB: +(statSync(out).size / 1048576).toFixed(2),
      gpuMemoryEstimateMB: +((stats.vertices * 12 + stats.triangles * 3 * 4) / 1048576).toFixed(2),
      srcGpuMemoryEstimateMB: +((srcStats.vertices * 12 + srcStats.triangles * 3 * 4) / 1048576).toFixed(2),
    };
    report.push(row);
    console.log(JSON.stringify(row));
  }
}

let existing = [];
try { existing = JSON.parse(readFileSync(reportPath, "utf8")); } catch {}
const merged = [...existing.filter((r) => !report.some((n) => n.file === r.file)), ...report];
writeFileSync(reportPath, JSON.stringify(merged, null, 1));
