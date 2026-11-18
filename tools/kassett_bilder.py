"""Gör om KASSETTEN:s renderingar (tools/kassett.py) till bilder för appen: ui/kassett/*.webp + kassett.json.

bak och fram behåller genomskinligheten (webp med alfa, förlustfri alfa), vu är bara ljus (läggs till i appen),
nav är spolnavets bild. kassett.json får positionerna ur renderingen (bildpunkter i bak/fram) och filnamnen.

python3 tools/kassett_bilder.py <mapp med bak.png, fram.png, vu.png, nav.png, kassett.json>
"""
import json, os, sys
from PIL import Image

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = sys.argv[1]
ut = os.path.join(ROT, "ui", "kassett"); os.makedirs(ut, exist_ok=True)
info = json.load(open(os.path.join(d, "kassett.json")))
filer = {}
for namn, alfa, kval in [("bak", True, 90), ("fram", True, 92), ("vu", False, 90), ("nav", True, 92)]:
    im = Image.open(os.path.join(d, namn + ".png"))
    im = im.convert("RGBA" if alfa else "RGB")
    if namn == "vu":
        # bara ljuset. Appen lägger till det ("lighter"), som också lägger ihop genomskinligheten: därför lagras det
        # med alfa = ljusstyrkan och färgen utan alfa (färg * alfa = ljuset), och mörka bildpunkter blir helt genomskinliga
        import numpy as np
        a_ = np.asarray(im).astype(np.float32)
        al = a_.max(axis=2); al[al < 3] = 0
        rgb = np.where(al[..., None] > 0, a_ * 255.0 / np.maximum(al[..., None], 1), 0)
        im = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), al]).astype(np.uint8), "RGBA")
    sti = os.path.join(ut, "kassett_" + namn + ".webp")   # unika namn (pluggen slår upp filerna på namnet)
    im.save(sti, quality=kval, method=6, alpha_quality=100, exact=True)
    filer[namn] = "kassett_" + namn + ".webp"
    print(f"{namn}: {im.size[0]}x{im.size[1]}, {os.path.getsize(sti) // 1024} KB")
info["bilder"] = filer
json.dump(info, open(os.path.join(ut, "kassett.json"), "w"), indent=1)
