from PIL import Image
import os, sys

root_dir = sys.argv[1] if len(sys.argv) > 1 else "public"
rows = []
for root, _, files in os.walk(root_dir):
    for f in files:
        p = os.path.join(root, f).replace("\\", "/")
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".svg")):
            try:
                im = Image.open(p)
                dims = f"{im.width}x{im.height}"
                mode = im.mode
            except Exception:
                dims = "vector" if f.endswith(".svg") else "?"
                mode = ""
            rows.append((os.path.getsize(p), p, dims, mode))
for s, p, d, m in sorted(rows, reverse=True):
    print(f"{s:>10}  {p:<72} {d:<12} {m}")
total = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(root_dir) for f in fs if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")))
print("TOTAL raster bytes:", total)
