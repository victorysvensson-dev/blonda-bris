"""Gör om glasscenens renderingar (tools/kristall.py, linjära EXR) till en bild för appen.

Alla pass läggs i ett rutnät i en webp (ui/kristall/kristall.webp) + ui/kristall/kristall.json.
Varje pass:
  - får en mjuk glöd (bloom) inbakad: en suddig kopia av sig själv. Suddning är linjär, så glöden blir rätt
    även när appen blandar passen (glöden av summan = summan av glöden).
  - lagras som e = (v / (1 + v)) ^ (1/2.2), som appen avkodar exakt (v = t / (1 - t), t = e^2.2).
    Det rymmer starka högdagrar i 8 bitar, och grundpasset ser rätt ut även utan avkodning (2D-reserven).

python3 tools/kristall_bilder.py <mapp med bas.exr, ljus0.exr ...> [--bredd 1024]
"""
import argparse, json, os, sys
import cv2, numpy as np, OpenEXR   # pip install opencv-python-headless OpenEXR pillow
from PIL import Image

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument("mapp")
ap.add_argument("--bredd", type=int, default=1280)
ap.add_argument("--kol", type=int, default=3)
ap.add_argument("--skala", type=float, default=1.0, help="ljusstyrka in i bilden (före kodningen)")
ap.add_argument("--kvalitet", type=int, default=92)
a = ap.parse_args()

def las(namn):
    p = os.path.join(a.mapp, namn)
    if not os.path.exists(p): sys.exit(f"saknas: {namn}")
    ch = OpenEXR.File(p).channels()
    im = (ch["RGBA"].pixels[..., :3] if "RGBA" in ch else np.dstack([ch[k].pixels for k in "RGB"])).astype(np.float32)
    return np.nan_to_num(np.maximum(im, 0), nan=0, posinf=0)

pass_ = ["bas.exr"]
k = 0
while os.path.exists(os.path.join(a.mapp, f"ljus{k}.exr")): pass_.append(f"ljus{k}.exr"); k += 1
antal = k
if antal < 2: sys.exit("för få ljuspass")

bilder = []
for p in pass_:
    im = las(p) * a.skala
    h0, w0 = im.shape[:2]
    w = a.bredd; h = round(h0 * w / w0)
    im = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)
    # glöd: en nära och en vid suddning av hela passet (ingen tröskel, så att det förblir linjärt)
    g1 = cv2.GaussianBlur(im, (0, 0), w * 0.010)
    g2 = cv2.GaussianBlur(im, (0, 0), w * 0.045)
    im = im + 0.06 * g1 + 0.05 * g2
    bilder.append(im)

H, W = bilder[0].shape[:2]
rader = -(-len(bilder) // a.kol)
atlas = np.zeros((rader * H, a.kol * W, 3), np.float32)
for i, im in enumerate(bilder):
    r, c = divmod(i, a.kol)
    atlas[r * H:(r + 1) * H, c * W:(c + 1) * W] = im
e = (atlas / (1 + atlas)) ** (1 / 2.2)
ut = os.path.join(ROT, "ui", "kristall"); os.makedirs(ut, exist_ok=True)
Image.fromarray(np.clip(np.round(e * 255), 0, 255).astype(np.uint8)).save(os.path.join(ut, "kristall.webp"), quality=a.kvalitet, method=6)
meta = {"bild": "kristall.webp", "antal": antal, "kol": a.kol, "w": W, "h": H, "exp": 1.0, "styrka": 1.0}
gammal = os.path.join(ut, "kristall.json")
if os.path.exists(gammal):   # exponering och styrka ställs in i json-filen och behålls
    try:
        g = json.load(open(gammal)); meta["exp"] = g.get("exp", 1.0); meta["styrka"] = g.get("styrka", 1.0)
    except Exception: pass
json.dump(meta, open(gammal, "w"), indent=1)
print(f"{len(bilder)} pass ({antal} ljus), {W}x{H} -> {a.kol}x{rader}, {os.path.getsize(os.path.join(ut, 'kristall.webp')) // 1024} KB")
