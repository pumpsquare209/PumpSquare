import json, struct, sys, os
from PIL import Image
import io

def parse_glb(path):
    with open(path, "rb") as f:
        data = f.read()
    magic, version, length = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67, "not glb"
    off = 12
    gltf = None
    bin_chunk = None
    while off < len(data):
        clen, ctype = struct.unpack_from("<II", data, off)
        chunk = data[off + 8: off + 8 + clen]
        if ctype == 0x4E4F534A:
            gltf = json.loads(chunk.decode("utf-8"))
        elif ctype == 0x004E4942:
            bin_chunk = chunk
        off += 8 + clen + ((4 - clen % 4) % 4 if clen % 4 else 0)
    return data, gltf, bin_chunk, length

for path in sys.argv[1:]:
    data, g, b, length = parse_glb(path)
    print("=" * 70)
    print(path, f"{length:,} bytes ({length/1048576:.2f} MB)")
    print("generator:", g.get("asset", {}).get("generator"))
    print("extensionsUsed:", g.get("extensionsUsed"))
    print("extensionsRequired:", g.get("extensionsRequired"))
    print("scenes:", len(g.get("scenes", [])), " nodes:", len(g.get("nodes", [])),
          " meshes:", len(g.get("meshes", [])), " materials:", len(g.get("materials", [])),
          " textures:", len(g.get("textures", [])), " images:", len(g.get("images", [])),
          " animations:", len(g.get("animations", [])), " skins:", len(g.get("skins", [])))
    # primitives / draw calls
    prims = 0
    tris = 0
    verts = 0
    for m in g.get("meshes", []):
        for p in m["primitives"]:
            prims += 1
            if "indices" in p:
                tris += g["accessors"][p["indices"]]["count"] // 3
            pos = p["attributes"].get("POSITION")
            if pos is not None:
                verts += g["accessors"][pos]["count"]
    print(f"primitives (draw calls): {prims}  triangles: {tris:,}  vertices: {verts:,}")
    print("attributes on first prim:", sorted(g["meshes"][0]["primitives"][0]["attributes"].keys()) if g.get("meshes") else None)
    # images
    for i, img in enumerate(g.get("images", [])):
        bv = g["bufferViews"][img["bufferView"]]
        raw = b[bv.get("byteOffset", 0): bv.get("byteOffset", 0) + bv["byteLength"]]
        try:
            im = Image.open(io.BytesIO(raw))
            info = f"{im.width}x{im.height} {im.format} {im.mode}"
        except Exception as e:
            info = f"unparseable ({e})"
        print(f"  image[{i}] {img.get('name','')} mime={img.get('mimeType')} bytes={bv['byteLength']:,} {info}")
    # materials
    for i, mat in enumerate(g.get("materials", [])):
        pbr = mat.get("pbrMetallicRoughness", {})
        tex = [k for k in pbr if k.endswith("Texture")] + [k for k in mat if k.endswith("Texture")]
        print(f"  material[{i}] {mat.get('name','')} baseColor={pbr.get('baseColorFactor')} tex={tex}")
    # buffer view total
    print("bufferViews bytes total:", sum(v["byteLength"] for v in g.get("bufferViews", [])))
