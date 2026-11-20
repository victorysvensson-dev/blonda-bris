"""Gör om KNAPPSATSEN:s renderingar (tools/knappsats.py) till bilder för appen: ui/knappsats/.

  knappsats.webp        hela bilden med tangenterna uppe
  knappsats_nere.webp   varje tangent nedtryckt (med en kant runt om), packade i en bild; json: "nere"
  knappsats_index.png   vilken tangent varje bildpunkt hör till (1..17, 0 = ingen), uppe och nere ihop: där ritas
                        den nedtryckta tangenten, och där träffar man den
  knappsats.json        storlek, filnamn, tangenternas namn och rutor, LCD-fönstrets hörn och lamporna (NUM, REC)

python3 tools/knappsats_bilder.py <mapp med uppe.png, nere0.png ..., index_uppe.png, index_nere.png, knappsats.json>
"""
import json, os, sys
import numpy as np
from PIL import Image

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = sys.argv[1]
ut = os.path.join(ROT, "ui", "knappsats"); os.makedirs(ut, exist_ok=True)
info = json.load(open(os.path.join(d, "knappsats.json")))


def index(namn):   # värdet är 12 * tangentens nummer (tools/knappsats.py)
    a = np.asarray(Image.open(os.path.join(d, namn + ".png")).convert("L")).astype(np.int32)
    return np.rint(a / 12.0).astype(np.int32)


iu, ine = index("index_uppe"), index("index_nere")
# tangentens område: där den är uppe eller nere (en bildpunkt som någon av dem täcker); kanten växer en bildpunkt
idx = np.where(iu > 0, iu, ine).astype(np.uint8)
for _ in range(2):
    p = np.pad(idx, 1)
    gr = np.maximum.reduce([p[1:-1, :-2], p[1:-1, 2:], p[:-2, 1:-1], p[2:, 1:-1]])
    idx = np.where(idx == 0, gr, idx)
N = len(info["tangenter"])
if idx.max() > N: sys.exit(f"index {idx.max()} men bara {N} tangenter")

uppe = Image.open(os.path.join(d, "uppe.png")).convert("RGB")
uppe.save(os.path.join(ut, "knappsats.webp"), quality=90, method=6)
Image.fromarray(idx, "L").save(os.path.join(ut, "knappsats_index.png"), optimize=True)

# den nedtryckta tangenten, ur passet där dess grupp är nere (grannarna uppe): tangentens område växt KANT bildpunkter
# åt alla håll (också in över grannarna, som är uppe i passet och alltså ser ut som i bilden), så att också den mjuka
# kanten runt tangenten uppe (kantutjämningen, skuggan) byts ut och inget av den ligger kvar när den är nere.
# Alla läggs i en bild (rad för rad) med alfa = området; json säger var varje tangent ligger där och i bilden.
KANT = 5
def vax(m, n):
    for _ in range(n):
        p = np.pad(m, 1)
        m = p[1:-1, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:] | p[:-2, 1:-1] | p[2:, 1:-1] | p[:-2, :-2] | p[:-2, 2:] | p[2:, :-2] | p[2:, 2:]
    return m
pass_ = {}
bitar, rutor, nere_r = [], {}, {}
for k, namn in enumerate(info["tangenter"]):
    m0 = idx == k + 1
    ys, xs = np.nonzero(m0)
    if not len(xs): sys.exit(f"tangenten {namn} syns inte i bilden")
    rutor[namn] = [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]
    m = vax(m0, KANT)
    ys, xs = np.nonzero(m); x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    g = info["grupp"][k]
    if g not in pass_: pass_[g] = np.asarray(Image.open(os.path.join(d, f"nere{g}.png")).convert("RGB"))
    alfa = np.where(m[y0:y1, x0:x1], 255, 0).astype(np.uint8)
    bitar.append((namn, x0, y0, np.dstack([pass_[g][y0:y1, x0:x1], alfa])))
# packa: rader om högst 1024 bildpunkter
AW = 1024; ax = ay = rad_h = 0; plats = []
for namn, x0, y0, bit in bitar:
    h_, w_ = bit.shape[:2]
    if ax + w_ > AW: ax, ay, rad_h = 0, ay + rad_h + 2, 0
    plats.append((ax, ay)); nere_r[namn] = [ax, ay, int(x0), int(y0), w_, h_]; ax += w_ + 2; rad_h = max(rad_h, h_)
atlas = np.zeros((ay + rad_h, AW, 4), np.uint8)
for (namn, x0, y0, bit), (px, py) in zip(bitar, plats):
    atlas[py:py + bit.shape[0], px:px + bit.shape[1]] = bit
Image.fromarray(atlas, "RGBA").save(os.path.join(ut, "knappsats_nere.webp"), quality=90, method=6)

meta = {"w": info["w"], "h": info["h"], "bilder": {"uppe": "knappsats.webp", "nere": "knappsats_nere.webp", "index": "knappsats_index.png"},
        "tangenter": info["tangenter"], "rutor": rutor, "nere": nere_r, "lcd": info["lcd"], "lampa": info["lampa"], "rec": info["rec"], "lampa_r": info["lampa_r"]}
json.dump(meta, open(os.path.join(ut, "knappsats.json"), "w"), indent=1)
kb = sum(os.path.getsize(os.path.join(ut, f)) for f in meta["bilder"].values()) // 1024
print(f"{N} tangenter, {info['w']}x{info['h']}, {kb} KB")
