"""Gör om SJÖNs landskap (tools/sjon_land.py: dag.png, natt.png, RGBA med genomskinlig himmel) till en bild för appen.

Båda läggs i en webp på 2048 × 1024 (tvåpotens, så att webbläsaren kan göra mipmaps): dagen i övre halvan med
horisonten nedåt, natten i undre halvan spegelvänd (horisonten uppåt), så att de möts vid horisonten där båda är
täckta och inget genomskinligt blöder in vid mipmaps. Färgen är rak (inte förmultiplicerad); himlen ovanför
landskapet får färgen från kanten under (så att kanterna inte blir mörka när bilden förminskas). Shadern i
ui/sjon.js läser dagen vid t = 0,5 - 0,5·h och natten vid t = 0,5 + 0,5·h (h = höjd över horisonten / bandets höjd).

python3 tools/sjon_bilder.py <mapp med dag.png och natt.png>
Utdata: ui/sjon/land.webp
"""
import argparse, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("mapp")
ap.add_argument("--kvalitet", type=int, default=86)
a = ap.parse_args()
ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 2048, 512

def las(namn):
    im = np.asarray(Image.open(os.path.join(a.mapp, namn + ".png")).convert("RGBA")).astype(np.float32) / 255.0
    rgb, alfa = im[..., :3], im[..., 3]
    ut = rgb.copy(); tack = alfa >= 0.5
    for x in range(rgb.shape[1]):   # himlen: färgen från den översta täckta bildpunkten i kolumnen
        r = np.where(tack[:, x])[0]
        if len(r): ut[: r[0], x] = rgb[r[0], x]
    hel = np.dstack([ut, alfa])
    return np.asarray(Image.fromarray((hel * 255 + 0.5).astype(np.uint8), "RGBA").resize((W, H), Image.LANCZOS))

dag, natt = las("dag"), las("natt")
bild = np.concatenate([dag, natt[::-1]], axis=0)
ut = os.path.join(ROT, "ui", "sjon"); os.makedirs(ut, exist_ok=True)
Image.fromarray(bild, "RGBA").save(os.path.join(ut, "land.webp"), quality=a.kvalitet, method=6)
print("ui/sjon/land.webp", os.path.getsize(os.path.join(ut, "land.webp")) // 1024, "KB")
