#!/usr/bin/env python3
"""BLONDA BRIS – blommorna ur Victorys designbilder.

Klipper ut varje blomma ur designbilderna (resurser/design/*.png), tar bort designens ring och prick, förstorar
med Real-ESRGAN (om det finns) och gör bakgrunden genomskinlig, så att blomman kan röra sig fritt i gränssnittet.
Skriver ui/blommor/<namn>.webp och ui/blommor/blommor.json (bakgrundsfärg och blommans fot per bild).

  python3 tools/blommor.py [--esrgan /väg/realesrgan-ncnn-vulkan] [--modell realesr-animevideov3 --skala 2]
"""
import argparse, json, os, subprocess, tempfile
import numpy as np
import cv2
from PIL import Image

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROT, "resurser/design")
UT = os.path.join(ROT, "ui/blommor")

# namn: (designbild, beskärning x0 y0 x1 y1, rutor att måla bort (gränssnittsrester) i beskärningens koordinater,
#        blommans fot (andel av bredd/höjd) = punkten den vajar runt)
BLOMMOR = {
    "iris":       ("01_iris.png",       (458, 70, 1200, 652), [(0, 0, 22, 160)], (0.56, 1.0)),
    "strelitzia": ("02_strelitzia.png", (396, 90, 1200, 640), [], (0.24, 1.0)),
    "lilja":      ("03_lilja.png",      (440, 70, 1190, 640), [], (0.05, 1.0)),
    "eukalyptus": ("04_eukalyptus.png", (450, 85, 1200, 645), [], (0.03, 0.97)),
    "silke":      ("05_silke.png",      (500, 70, 1160, 600), [], (0.33, 1.0)),
    "solfjader":  ("06_solfjader.png",  (470, 75, 1200, 630), [], (0.40, 1.0)),
    "lavendel":   ("07_lavendel.png",   (560, 80, 1090, 566), [], (0.72, 1.0)),
    "orange":     ("08_orange.png",     (600, 52, 1070, 484), [], (0.70, 1.0)),
    "kanna":      ("10_orange.png",     (500, 120, 1160, 820), [], (0.62, 1.0)),
}


# bilder där designen har en ring runt blomman som ska bort
RINGAR = {"iris", "strelitzia", "silke", "lavendel", "kanna"}
GLASRING = {"iris", "strelitzia"}   # tjock glasring med ljus skiva innanför
RENSA = {
    # iris: rutan slutar ovanför det högra hängande kronbladet (y 298); där bladet börjar följer en smal ruta bara
    # ringen (x 664-682), annars klipps kronbladets bleka överkant bort (ringen och bladet har samma färgmättnad)
    "iris": [(622, 100, 742, 298, 90), (664, 298, 682, 332, 46), (80, 300, 340, 505, 30)],
    "strelitzia": [(676, 212, 804, 452, 90), (240, 0, 530, 48, 30), (95, 55, 178, 430, 30)],
}


def bakgrund(img, fg):
    """Bakgrunden som ett mjukt andragradsplan per färgkanal, anpassat till pixlar som inte är blomma."""
    h, w, _ = img.shape
    ys, xs = np.mgrid[0:h, 0:w]
    xn, yn = xs / w, ys / h
    A = np.stack([np.ones_like(xn), xn, yn, xn * xn, yn * yn, xn * yn], -1).reshape(-1, 6)
    m = (~fg).reshape(-1)
    idx = np.flatnonzero(m)
    if len(idx) > 40000: idx = idx[np.random.default_rng(1).choice(len(idx), 40000, replace=False)]
    bg = np.zeros_like(img, dtype=np.float32)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A[idx], img.reshape(-1, 3)[idx, c].astype(np.float64), rcond=None)
        bg[..., c] = (A @ coef).reshape(h, w)
    return bg


def skillnad(img, bg):
    d = np.abs(img.astype(np.float32) - bg)
    return np.maximum(d.max(-1), 0.6 * d.sum(-1) / 3 * 2)


def siluett(d, w, h, oppna=7):
    """Blommans fyllda siluett: tydlig avvikelse från bakgrunden, små hål inne i kronbladen fyllda."""
    sil = (d > 7).astype(np.uint8)
    sil = cv2.morphologyEx(sil, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (oppna, oppna)))   # bort med tunna linjer (ringen)
    sil = cv2.morphologyEx(sil, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    inv = (1 - sil).astype(np.uint8)
    n, lab, stat, _ = cv2.connectedComponentsWithStats(inv, 4)
    for i in range(1, n):
        x, y, bw, bh, area = stat[i]
        if not (x == 0 or y == 0 or x + bw >= w or y + bh >= h) and area < 0.02 * w * h:
            sil[lab == i] = 1
    return sil


def ta_bort_ring(img, bg):
    """Designens tunna ring (och pricken på den) hittas som en cirkel och målas bort där den syns mot bakgrunden,
    aldrig inne i blomman."""
    d = skillnad(cv2.GaussianBlur(img, (0, 0), 0.8), bg)
    h, w = d.shape
    utanfor = cv2.dilate(siluett(d, w, h, 15), np.ones((5, 5), np.uint8)) == 0
    mask = np.zeros((h, w), np.uint8)
    karta = np.clip(d * 6, 0, 255).astype(np.uint8)
    cs = cv2.HoughCircles(karta, cv2.HOUGH_GRADIENT, dp=1.5, minDist=2000, param1=60, param2=28, minRadius=150, maxRadius=460)
    hittad = None
    if cs is not None:
        for cx, cy, r in cs[0][:5]:
            a = np.linspace(0, 2 * np.pi, 720, endpoint=False)
            xs = np.round(cx + r * np.cos(a)).astype(int); ys = np.round(cy + r * np.sin(a)).astype(int)
            ok = (xs >= 2) & (xs < w - 2) & (ys >= 2) & (ys < h - 2)
            if ok.sum() < 100: continue
            # ringen: tunn och svag avvikelse längs cirkeln (finns ett par pixlar innanför/utanför)
            best = 0
            for dr in np.arange(-3, 3.5, 0.5):
                xx = np.round(cx + (r + dr) * np.cos(a[ok])).astype(int).clip(0, w - 1); yy = np.round(cy + (r + dr) * np.sin(a[ok])).astype(int).clip(0, h - 1)
                ute = utanfor[yy, xx]
                if ute.sum() < 150: continue
                best = max(best, float(((d[yy, xx] > 1.0) & (d[yy, xx] < 45))[ute].mean()))
            if os.environ.get('BLOMMOR_DEBUG'): print('  cirkel', int(cx), int(cy), int(r), round(best, 2))
            if best > 0.3: hittad = (float(cx), float(cy), float(r)); break
    if hittad:
        # finjustera mitt och radie så att cirkeln ligger exakt på ringen
        cx, cy, r = hittad
        a = np.linspace(0, 2 * np.pi, 900, endpoint=False)
        ca, sa = np.cos(a), np.sin(a)
        dd = np.minimum(d, 15)
        bestv, bestp = -1, (cx, cy, r)
        for ddx in np.arange(-8, 9, 1.0):
            for ddy in np.arange(-8, 9, 1.0):
                for ddr in np.arange(-8, 9, 1.0):
                    xx = np.round(cx + ddx + (r + ddr) * ca).astype(int); yy = np.round(cy + ddy + (r + ddr) * sa).astype(int)
                    ok = (xx >= 0) & (xx < w) & (yy >= 0) & (yy < h)
                    xx, yy = xx[ok], yy[ok]
                    ute = utanfor[yy, xx]
                    if ute.sum() < 100: continue
                    v = dd[yy, xx][ute].mean()
                    if v > bestv: bestv, bestp = v, (cx + ddx, cy + ddy, r + ddr)
        cx, cy, r = bestp
        hittad = bestp
        yy, xx = np.mgrid[0:h, 0:w]
        rr = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        ann = (np.abs(rr - r) < 13) & (d < 14) & utanfor
        mask[ann] = 1
        # pricken på ringen
        stark = (d > 25).astype(np.uint8)
        n, lab, stat, cen = cv2.connectedComponentsWithStats(stark, 8)
        for i in range(1, n):
            x, y, bw, bh, area = stat[i]
            if area < 500 and bw < 26 and bh < 26 and abs(np.hypot(cen[i][0] - cx, cen[i][1] - cy) - r) < 16:
                mask[lab == i] = 1
        mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))
    ut = img.copy()
    ut[mask > 0] = np.clip(bg[mask > 0], 0, 255).astype(np.uint8)
    return ut, mask, hittad


def forstora(img, esr, modell, skala):
    if not esr:
        return cv2.resize(img, None, fx=skala, fy=skala, interpolation=cv2.INTER_LANCZOS4)
    with tempfile.TemporaryDirectory() as t:
        a, b = os.path.join(t, "a.png"), os.path.join(t, "b.png")
        cv2.imwrite(a, cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
        env = dict(os.environ, VK_ICD_FILENAMES=os.environ.get("VK_ICD_FILENAMES", "/opt/lavapipe/lvp_icd.json"))
        subprocess.run([esr, "-i", a, "-o", b, "-n", modell, "-s", str(skala if modell.startswith("realesr-anime") else 4)],
                       check=True, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        big = cv2.cvtColor(cv2.imread(b), cv2.COLOR_BGR2RGB)
        h, w = img.shape[:2]
        if big.shape[0] != h * skala:
            big = cv2.resize(big, (w * skala, h * skala), interpolation=cv2.INTER_AREA)
        return big


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--esrgan", default="")
    ap.add_argument("--modell", default="realesr-animevideov3")
    ap.add_argument("--skala", type=int, default=2)
    ap.add_argument("--bara", default="")
    a = ap.parse_args()
    os.makedirs(UT, exist_ok=True)
    info_path = os.path.join(UT, "blommor.json")
    info = json.load(open(info_path)) if os.path.exists(info_path) else {}
    for namn, (fil, box, bort, fot) in BLOMMOR.items():
        if a.bara and namn not in a.bara.split(","): continue
        img = np.array(Image.open(os.path.join(SRC, fil)).convert("RGB").crop(box))
        h, w, _ = img.shape
        for (x0, y0, x1, y1) in bort:
            img[y0:y1, x0:x1] = 0   # fylls med bakgrund nedan
        # bakgrund: först grovt (kanterna), sedan med blomman bortmaskad
        kant = np.concatenate([img[:6].reshape(-1, 3), img[-6:].reshape(-1, 3), img[:, :6].reshape(-1, 3), img[:, -6:].reshape(-1, 3)])
        med = np.median(kant, 0)
        fg0 = np.abs(img.astype(np.float32) - med).max(-1) > 14
        for (x0, y0, x1, y1) in bort: fg0[y0:y1, x0:x1] = True
        fg0 = cv2.dilate(fg0.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        bg = bakgrund(img, fg0)
        for (x0, y0, x1, y1) in bort:
            img[y0:y1, x0:x1] = np.clip(bg[y0:y1, x0:x1], 0, 255).astype(np.uint8)
        if namn in RINGAR: img, ring, cirkel = ta_bort_ring(img, bg)
        else: ring, cirkel = np.zeros(img.shape[:2], np.uint8), None
        fg1 = cv2.dilate((skillnad(img, bg) > 6).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        bg = bakgrund(img, fg1)
        # alfa i originalupplösning (där bakgrunden är ren): mjuk nyckling + fylld siluett
        d = skillnad(cv2.GaussianBlur(img, (0, 0), 0.9), bg)
        if cirkel is not None and namn in GLASRING:
            # designens ljusa glasskiva innanför ringen: bara ljusare, utan egen färg -> bakgrund
            cx, cy, r = cirkel
            yy, xx = np.mgrid[0:h, 0:w]
            inne = np.hypot(xx - cx, yy - cy) < r + 22
            df = cv2.GaussianBlur(img, (0, 0), 0.9).astype(np.float32) - bg
            skydd = siluett(d, w, h, 15) > 0
            vit = (df.min(-1) > -3) & ((df.max(-1) - df.min(-1)) < 14) & (d < 40) & inne & ~skydd
            d = np.where(vit, 0, d)
        ka = np.clip((d - 3.0) / 12.0, 0, 1); ka = ka * ka * (3 - 2 * ka)
        sil = siluett(d, w, h)
        core = cv2.erode(sil, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))).astype(np.float32)
        core = cv2.GaussianBlur(core, (0, 0), 1.3)
        alpha = np.maximum(ka, core)
        if cirkel is not None:
            # ringen bort helt (även glasringens ljusa kant), utom där den går över blomman
            cx, cy, r = cirkel
            yy, xx = np.mgrid[0:h, 0:w]
            kropp = cv2.dilate(siluett(d, w, h, 15), np.ones((5, 5), np.uint8)) > 0
            ann = (np.abs(np.hypot(xx - cx, yy - cy) - r) < 14) & ~kropp
            # rutor där glasringens rester (svag färg) tas bort för hand, i beskärningens koordinater
            ch = img.max(-1).astype(np.float32) - img.min(-1)
            hand = np.zeros((h, w), np.float32)
            for (x0, y0, x1, y1, grans) in RENSA.get(namn, []):
                ruta = np.zeros((h, w), bool); ruta[y0:y1, x0:x1] = True
                hand = np.maximum(hand, (ruta & (ch < grans)).astype(np.float32))
            hand = np.clip(cv2.GaussianBlur(hand, (0, 0), 5.0) * 1.6, 0, 1)   # mjuka kanter, inga rutor
            alpha = alpha * (1 - cv2.GaussianBlur(ann.astype(np.float32), (0, 0), 1.5)) * (1 - hand)
        # svagt dis (bakgrund som skiljer lite) bort, så att bildens kanter aldrig syns
        alpha = np.clip((alpha - 0.07) / 0.93, 0, 1)
        f = max(4, int(0.03 * min(h, w)))
        ram = np.ones((h, w), np.float32)
        for i in range(f):
            k = (i + 1) / f
            ram[i, :] = np.minimum(ram[i, :], k); ram[-1 - i, :] = np.minimum(ram[-1 - i, :], k)
            ram[:, i] = np.minimum(ram[:, i], k); ram[:, -1 - i] = np.minimum(ram[:, -1 - i], k)
        alpha *= ram
        # förstora
        big = forstora(img, a.esrgan, a.modell, a.skala).astype(np.float32)
        H, W = big.shape[:2]
        bgb = cv2.resize(bg, (W, H), interpolation=cv2.INTER_CUBIC)
        ab = np.clip(cv2.resize(alpha, (W, H), interpolation=cv2.INTER_CUBIC), 0, 1)
        a3 = np.maximum(ab[..., None], 1e-3)
        fg = np.clip((big - (1 - a3) * bgb) / a3, 0, 255)
        fg[ab < 0.004] = bgb[ab < 0.004]
        rgba = np.dstack([fg, ab * 255]).astype(np.uint8)
        Image.fromarray(rgba, "RGBA").save(os.path.join(UT, f"{namn}.webp"), "WEBP", quality=90, method=6)
        b = np.median(kant, 0)
        info[namn] = dict(w=W, h=H, fot=list(fot), bg="#%02x%02x%02x" % tuple(int(v) for v in np.clip(bg.mean((0, 1)), 0, 255)),
                          ring=int(ring.sum()), cirkel=cirkel is not None)
        print(f"{namn}: {W}x{H}, ring/prickar {int(ring.sum())} px, bakgrund {info[namn]['bg']}, "
              f"{os.path.getsize(os.path.join(UT, namn + '.webp')) // 1024} KB")
    json.dump(info, open(info_path, "w"), indent=1)


if __name__ == "__main__":
    main()
