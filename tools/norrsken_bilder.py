"""Gör om NORRSKENs fjällrenderingar (tools/norrsken_fjall.py: bas.exr, sken.exr, linjära RGBA) till en bild för appen.

Båda passen läggs i en webp på 2048 × 512 (tvåpotens, så att webbläsaren kan göra mipmaps): bas i övre halvan med
strandlinjen nedåt, sken i undre halvan spegelvänt (strandlinjen uppåt), så att de möts vid strandlinjen och inget
genomskinligt blöder in där. Varje halva är 256 rader; fjällen tar de hs närmast mitten. Färgen lagras rak
(inte förmultiplicerad), skalad (kb, ks) och med gamma 2.2; alfa är fjällens täckning. Shadern i ui/norrsken.js gör
tillbaka: linjärt = rgb^2.2 / k, och fjällen = bas + sken × norrskenets färg rakt ovanför.

python3 tools/norrsken_bilder.py <mapp>
Utdata: ui/norrsken/fjall.webp + ui/norrsken/norrsken.json (bäddas in i data.js av tools/kategorier.py).
"""
import argparse, json, os
import numpy as np
import OpenEXR
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("mapp")
ap.add_argument("--kvalitet", type=int, default=90)
a = ap.parse_args()
ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def las(namn):
    ch = OpenEXR.File(os.path.join(a.mapp, namn + ".exr")).channels()
    im = ch["RGBA"].pixels if "RGBA" in ch else np.dstack([ch[k].pixels for k in "RGBA"])
    return np.maximum(im.astype(np.float32), 0)

bas, sken = las("bas"), las("sken")
alfa = np.maximum(bas[..., 3], sken[..., 3])
rader = np.where(alfa.max(axis=1) > 0.004)[0]
topp = max(0, rader.min() - 4)
bas, sken, alfa = bas[topp:], sken[topp:], alfa[topp:]
H0, W0 = alfa.shape

def rak(p):   # rak färg (inte förmultiplicerad med alfa)
    return p[..., :3] / np.maximum(alfa[..., None], 1e-4)

def skala(c):  # så att det ljusaste (99,7 percentilen där fjällen finns) hamnar på 0,92
    v = c[alfa > 0.5].max(axis=1)
    return 0.92 / max(1e-6, float(np.percentile(v, 99.7)))

def fyll(c):  # himlen ovanför fjällen får färgen från kammen under (så att mipmaps inte ger mörka kanter)
    ut = c.copy(); tack = alfa >= 0.5
    for x in range(c.shape[1]):
        r = np.where(tack[:, x])[0]
        if len(r): ut[: r[0], x] = c[r[0], x]
        else: ut[:, x] = 0
    return ut
cb, cs = fyll(rak(bas)), fyll(rak(sken))
kb, ks = skala(cb), skala(cs)
enc = lambda c, k: np.clip(c * k, 0, 1) ** (1 / 2.2)
W, HALV = 2048, 256; H = min(HALV, round(H0 * W / W0))
def bild(c, k):
    rgba = np.dstack([enc(c, k), alfa])
    return Image.fromarray(np.round(rgba * 255).astype(np.uint8), "RGBA").resize((W, H), Image.LANCZOS)
ut = os.path.join(ROT, "ui", "norrsken"); os.makedirs(ut, exist_ok=True)
hel = Image.new("RGBA", (W, HALV * 2), (0, 0, 0, 0))
hel.paste(bild(cb, kb), (0, HALV - H)); hel.paste(bild(cs, ks).transpose(Image.FLIP_TOP_BOTTOM), (0, HALV))
hel.save(os.path.join(ut, "fjall.webp"), quality=a.kvalitet, method=6, exact=True)
meta = {"bild": "fjall.webp", "w": W, "halv": HALV, "hs": H, "kb": round(kb, 5), "ks": round(ks, 5)}
json.dump(meta, open(os.path.join(ut, "norrsken.json"), "w"), indent=1)
print(meta, os.path.getsize(os.path.join(ut, "fjall.webp")) // 1024, "kB")
