"""Gör om KASSETTEN:s renderingar (tools/kassett.py) till bilder för appen: ui/kassett/*.webp + kassett.json.

Lagren behåller genomskinligheten (webp med alfa): skugga (på bordet), skap (locket och sidorna), bak, kassett_bak/kassett_fram (kassetten i luckan), vhs_bak/vhs_fram
(VHS-bandet bakom fronten), inre (bandspelarens insida), panel, nere (bara de nedtryckta knapparna), lucka (rökglaset); vu är bara ljus (läggs till i appen),
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
LAGER = [("skugga", True, 88), ("bak", True, 90), ("kassett_bak", True, 90), ("kassett_fram", True, 92), ("vhs_bak", True, 90), ("vhs_fram", True, 92), ("inre", True, 88), ("skap", True, 92),
         ("panel", True, 92), ("nere", True, 92), ("lucka", True, 92), ("vu", False, 90), ("nav", True, 92)]
for namn, alfa, kval in LAGER:
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
    if namn == "skugga":   # bara skuggan där bandspelaren står (bordet bakom den tonas bort: där skulle den bli en grå gloria)
        import numpy as np
        a_ = np.asarray(im).astype(np.float32); fy, fh, e = info["front"][1], info["front"][3], info["enhet"]
        y = np.arange(a_.shape[0])[:, None]; y1 = fy + fh + 0.02 * e; y0 = y1 - 0.35 * e
        a_[..., 3] *= np.clip((y - y0) / (y1 - y0), 0, 1) ** 2
        x = np.arange(a_.shape[1])[None, :]; kant = 0.07 * a_.shape[1]   # tonas ut mot bildens kanter (inget skarpt slut)
        a_[..., 3] *= np.clip(np.minimum(x, a_.shape[1] - 1 - x) / kant, 0, 1) ** 1.5
        im = Image.fromarray(a_.astype(np.uint8), "RGBA")
    if namn == "nere":   # bara knapparna behövs (appen klipper ut dem): resten genomskinligt, så blir filen liten
        import numpy as np
        a_ = np.asarray(im).copy(); mask = np.zeros(a_.shape[:2], bool)
        for k in info["knappar"]:
            x, y, w, h = [int(round(v)) for v in k["ruta"]]; mask[max(0, y):y + h + 1, max(0, x):x + w + 1] = True
        a_[~mask] = 0; im = Image.fromarray(a_, "RGBA")
    FIL = {"skugga": "kassett_skugga", "skap": "kassett_skap", "bak": "kassett_fack", "kassett_bak": "kassett_bak", "kassett_fram": "kassett_fram", "vhs_bak": "kassett_vhs_bak",
           "vhs_fram": "kassett_vhs_fram", "inre": "kassett_inre", "panel": "kassett_panel", "nere": "kassett_nere", "lucka": "kassett_lucka",
           "vu": "kassett_vu", "nav": "kassett_nav"}
    sti = os.path.join(ut, FIL[namn] + ".webp")   # unika namn (pluggen slår upp filerna på namnet)
    im.save(sti, quality=kval, method=6, alpha_quality=100, exact=True)
    filer[namn] = os.path.basename(sti)
    print(f"{namn}: {im.size[0]}x{im.size[1]}, {os.path.getsize(sti) // 1024} KB")
info["bilder"] = filer
json.dump(info, open(os.path.join(ut, "kassett.json"), "w"), indent=1)
