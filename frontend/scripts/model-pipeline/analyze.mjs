// Reports topology stats for GLB files. Usage: node analyze.mjs <file.glb> [...]
import { NodeIO } from "@gltf-transform/core";
import { MeshoptDecoder } from "meshoptimizer";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { analyze } from "./report.mjs";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
await MeshoptDecoder.ready;
for (const path of process.argv.slice(2)) {
  const doc = await io.read(path);
  console.log(JSON.stringify({ file: path.split(/[\/]/).pop(), ...analyze(doc) }));
}
