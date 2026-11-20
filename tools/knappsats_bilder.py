"""Gör om KNAPPSATSEN:s renderingar (tools/knappsats.py) till bilder för appen: ui/knappsats/.

  knappsats.webp        hela bilden med tangenterna uppe
  knappsats_nere.webp   bara tangenterna nedtryckta (resten genomskinligt): appen klipper ut en tangent i taget
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
# den nedtryckta tangenten ur passet där dess grupp är nere (grannarna uppe)
pass_ = {}
nere = np.zeros((info["h"], info["w"], 3), np.uint8)
for k, g in enumerate(info["grupp"]):
    if g not in pass_: pass_[g] = np.asarray(Image.open(os.path.join(d, f"nere{g}.png")).convert("RGB"))
    m = idx == k + 1; nere[m] = pass_[g][m]
uppe.save(os.path.join(ut, "knappsats.webp"), quality=90, method=6)
alfa = np.where(idx > 0, 255, 0).astype(np.uint8)
Image.fromarray(np.dstack([nere, alfa]), "RGBA").save(os.path.join(ut, "knappsats_nere.webp"), quality=90, method=6)
Image.fromarray(idx, "L").save(os.path.join(ut, "knappsats_index.png"), optimize=True)

rutor = {}
for k, namn in enumerate(info["tangenter"]):
    ys, xs = np.nonzero(idx == k + 1)
    if not len(xs): sys.exit(f"tangenten {namn} syns inte i bilden")
    rutor[namn] = [int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)]
meta = {"w": info["w"], "h": info["h"], "bilder": {"uppe": "knappsats.webp", "nere": "knappsats_nere.webp", "index": "knappsats_index.png"},
        "tangenter": info["tangenter"], "rutor": rutor, "lcd": info["lcd"], "lampa": info["lampa"], "rec": info["rec"], "lampa_r": info["lampa_r"]}
json.dump(meta, open(os.path.join(ut, "knappsats.json"), "w"), indent=1)
kb = sum(os.path.getsize(os.path.join(ut, f)) for f in meta["bilder"].values()) // 1024
print(f"{N} tangenter, {info['w']}x{info['h']}, {kb} KB")
