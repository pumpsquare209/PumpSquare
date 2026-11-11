import re, html, urllib.request, urllib.parse, sys, time

BASE = "http://localhost:3100"
pages = ["/", "/about", "/industries", "/contact", "/products", "/products/external-gear-pumps"]
VIEWPORTS = [("desktop", 1920), ("mobile", 390)]
ACC = "image/avif,image/webp,image/*,*/*;q=0.8"

def sanitize(s):
    s = s.strip()
    # if next/image srcset only has a 'w' list, heights (if any) come after width
    parts = s.split()
    w = parts[0]
    if w.endswith("w"):
        return int(w[:-1])
    return None

def fetch(url):
    req = urllib.request.Request(BASE + url, headers={"Accept": ACC, "User-Agent": "Mozilla/5.0 (Chrome/140)"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
        return r.headers.get("Content-Type"), len(data)

def pick(cands, vw):
    best = min(cands, key=lambda c: abs(c[1] - vw))
    return best

report = {}
for page in pages:
    with urllib.request.urlopen(BASE + page, timeout=60) as r:
        doc = r.read().decode("utf-8", "replace")
    tags = re.findall(r'(?:<img|<link)[^>]*>', doc)
    imgs = []
    for tag in tags:
        src_m = re.search(r'\bsrc="([^"]+)"', tag)
        if not src_m or "/_next/image" not in src_m.group(1):
            continue
        src = html.unescape(src_m.group(1))
        q = urllib.parse.parse_qs(urllib.parse.urlparse(src).query)
        orig = q.get("url", [""])[0]
        ss_m = re.search(r'srcSet="([^"]+)"', tag)
        cands = []
        if ss_m:
            for c in html.unescape(ss_m.group(1)).split(","):
                parts = c.strip().split()
                if len(parts) >= 2 and parts[1].endswith("w"):
                    cands.append((parts[0], int(parts[1][:-1])))
        if not cands:
            cands = [(src, int(q.get("w", ["0"])[0] or 0))]
        sizes_m = re.search(r'sizes="([^"]+)"', tag)
        imgs.append({"orig": orig, "cands": cands, "sizes": sizes_m.group(1) if sizes_m else None,
                     "lazy": 'loading="lazy"' in tag})
    per_view = {}
    for label, vw in VIEWPORTS:
        total = 0
        rows = []
        for im in imgs:
            url, w = pick(im["cands"], vw)
            ct, size = fetch(url)
            total += size
            rows.append((im["orig"], w, ct, size, im["lazy"]))
        per_view[label] = (total, rows)
    report[page] = per_view

for page, per_view in report.items():
    print(f"\n===== {page}")
    for label, (total, rows) in per_view.items():
        print(f"  -- {label}: eager+lazy image payload total = {total/1024:.1f} KiB ({len(rows)} images)")
        for orig, w, ct, size, lazy in rows:
            print(f"     w={w:<5} {ct:<14} {size/1024:8.1f} KiB  lazy={lazy}  {orig}")
