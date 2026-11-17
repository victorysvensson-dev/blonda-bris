#!/usr/bin/env python3
"""BLONDA BRIS – nya blommor komponerade av Victorys lösa kronblad (resurser/kronblad/<ark>.png).

Varje ark har kronblad på genomskinlig bakgrund. Ett recept väljer bitar ur arket, vrider och skalar dem runt sin
spets (bladets fäste, den lägsta punkten) och lägger spetsarna i blommans fot, bakifrån och fram, med en mjuk
skugga från varje lager på det som ligger under. Det främre lagret skrivs också som mask (<namn>_fram.webp), så att
stoftet kommer inifrån blomman precis som för de andra (se tools/lager.py och ui/blommor.js).

Skriver ui/blommor/<namn>.webp, <namn>_fram.webp och posten i ui/blommor/blommor.json.

  python3 tools/komponera.py [--bara namn] [--visa /tmp/ut.png]
"""
import argparse, json, os
import numpy as np
import cv2
from PIL import Image

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROT, "resurser/kronblad")
UT = os.path.join(ROT, "ui/blommor")
W, H = 1480, 1240
FOT = (0.52, 0.93)   # blommans fot (andel), där alla spetsar möts

# bit = komponentens nummer i arket (se bitar()), v = vridning i grader (medurs), s = skala, d = förskjutning av
# spetsen från foten (px), fram = ligger framför stoftet. Ordningen är bakifrån och fram.
RECEPT = {
    # smaragd: tre stora blad som en solfjäder, ståndarna och ett krullat blad framför
    "smaragd": dict(ark="smaragd", bg="#eef3ef", bitar=[
        dict(bit=3, v=-13, s=1.0, d=(-26, 0)),
        dict(bit=2, v=11, s=0.98, d=(22, -6)),
        dict(bit=1, v=-2, s=1.12, d=(0, -14)),
        dict(bit=13, v=-24, s=0.9, d=(-10, -60)),
        dict(bit=7, v=-12, s=1.0, d=(-20, 0), fram=True),
    ], hjarta=[(0.46, 0.66), (0.54, 0.64), (0.57, 0.76), (0.52, 0.86), (0.46, 0.79)], ut=(240, 300)),
    # guld (gladiolus): gula och korallröda blad
    "guld": dict(ark="guld", bg="#f8efe6", bitar=[
        dict(bit=3, v=-13, s=1.0, d=(-24, 0)),
        dict(bit=2, v=9, s=0.96, d=(14, -4)),
        dict(bit=1, v=-3, s=1.12, d=(0, -14)),
        dict(bit=12, v=-18, s=0.95, d=(-14, -50)),
        dict(bit=6, v=4, s=0.92, d=(-24, -24), fram=True),
    ], hjarta=[(0.46, 0.66), (0.54, 0.64), (0.57, 0.76), (0.52, 0.86), (0.46, 0.79)], ut=(240, 300)),
    # blå iris (nattviol): tre stående blad (standards) och två hängande med skägg (falls) framför
    "blaiiris": dict(ark="blaiiris", bg="#eff0f8", fot=(0.52, 0.66), bitar=[
        dict(bit=3, v=-16, s=0.92, d=(-30, -60)),
        dict(bit=2, v=16, s=0.92, d=(30, -64)),
        dict(bit=1, v=-1, s=1.0, d=(0, -70)),
        dict(bit=9, v=0, s=1.2, d=(0, -20)),
        dict(bit=4, v=-6, s=0.9, d=(-30, -40), spets=(330, 60), fram=True),
        dict(bit=5, v=4, s=0.9, d=(30, -40), spets=(80, 55), fram=True),
    ], hjarta=[(0.46, 0.50), (0.56, 0.49), (0.58, 0.60), (0.52, 0.70), (0.45, 0.62)], ut=(245, 295)),
    # magenta (amaryllis): djupröda blad, ståndare och ett böjt blad framför
    "magenta": dict(ark="magenta", bg="#f8eef2", bitar=[
        dict(bit=2, v=-13, s=1.0, d=(-26, 0)),
        dict(bit=3, v=10, s=0.98, d=(20, -6)),
        dict(bit=1, v=-2, s=1.12, d=(0, -14)),
        dict(bit=12, v=-10, s=1.0, d=(-6, -56)),
        dict(bit=7, v=-10, s=0.95, d=(-24, 0), fram=True),
    ], hjarta=[(0.46, 0.66), (0.54, 0.64), (0.57, 0.76), (0.52, 0.86), (0.46, 0.79)], ut=(240, 300)),
}


def bitar(ark):
    a = np.array(Image.open(os.path.join(SRC, ark + ".png")).convert("RGBA"))
    # arkens alfa är 250-254 inne i bladen och har ett svagt dis runt dem: rätta till så att bladen är helt täckta
    # inuti (annars blir de svagt genomskinliga och lagren räknas inte exakt) och diset försvinner
    al = a[..., 3].astype(np.float32)
    a[..., 3] = (np.clip((al - 24) / (240 - 24), 0, 1) * 255).round().astype(np.uint8)
    k, lab, st, _ = cv2.connectedComponentsWithStats((a[..., 3] > 40).astype(np.uint8), 8)
    ut = {}
    for i in range(1, k):
        x, y, w, h, ar = st[i]
        if ar < 1500: continue
        m = cv2.dilate((lab == i).astype(np.uint8), np.ones((5, 5), np.uint8))[y:y + h, x:x + w] > 0
        p = a[y:y + h, x:x + w].copy(); p[~m] = 0
        ys, xs = np.nonzero(p[..., 3] > 128)
        botten = ys >= ys.max() - max(3, int(0.01 * h))
        ut[i] = dict(rgba=p, spets=(float(xs[botten].mean()), float(ys.max())))
    return ut


def placera(b, v, s, d, spets=None, fot=FOT):
    """Bitens RGBA vriden v grader runt spetsen, skalad s och med spetsen i foten + d, på hela duken (premultiplicerad)."""
    p = b["rgba"].astype(np.float32) / 255.0
    p[..., :3] *= p[..., 3:4]
    sx, sy = spets if spets else b["spets"]
    M = cv2.getRotationMatrix2D((sx, sy), -v, s)
    M[0, 2] += fot[0] * W + d[0] - sx
    M[1, 2] += fot[1] * H + d[1] - sy
    return cv2.warpAffine(p, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=0).clip(0, 1)


def komponera(namn):
    r = RECEPT[namn]
    B = bitar(r["ark"])
    duk = np.zeros((H, W, 4), np.float32)   # premultiplicerad
    fram = np.zeros((H, W), np.float32)
    for lag in r["bitar"]:
        p = placera(B[lag["bit"]], lag["v"], lag["s"], lag["d"], lag.get("spets"), r.get("fot", FOT))
        a = p[..., 3]
        # mjuk skugga från lagret på det som redan ligger under (lite nedåt), ger djup mellan bladen
        sk = cv2.GaussianBlur(a, (0, 0), 16)
        sk = np.roll(sk, 10, axis=0)
        duk[..., :3] *= (1 - 0.30 * sk)[..., None]
        duk = p + duk * (1 - a[..., None])
        # hur mycket av pixelns täckning som kommer från de främre lagren (efter det som ligger över)
        fram = fram * (1 - a) + (a if lag.get("fram") else 0)
    # beskär till blommans utsträckning (med marginal) och flytta foten därefter
    al = duk[..., 3]
    ys, xs = np.nonzero(al > 0.01)
    m = 24
    x0, x1 = max(0, xs.min() - m), min(W, xs.max() + m)
    y0, y1 = max(0, ys.min() - m), min(H, ys.max() + m)
    # masken = de främre lagrens andel av pixeln, skarp (ungefär en pixel bred övergång där ett främre blad ligger
    # över ett bakre) och hel ut över blommans ytterkant
    andel = fram / np.maximum(al, 1e-6)
    andel = np.clip((andel - 0.35) / 0.3, 0, 1)
    ute = al < 0.02
    nara = cv2.dilate((andel > 0.5).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    fram = np.where(ute, nara.astype(np.float32), andel)
    duk, fram = duk[y0:y1, x0:x1], fram[y0:y1, x0:x1]
    h, w = duk.shape[:2]
    a = np.maximum(duk[..., 3:4], 1e-6)
    rgb = np.where(duk[..., 3:4] > 1e-4, duk[..., :3] / a, 0)
    rgba = np.dstack([rgb * 255, duk[..., 3] * 255]).clip(0, 255).round().astype(np.uint8)   # avrunda (inte kapa): helt täckt = 255
    F = r.get("fot", FOT)
    fot = ((F[0] * W - x0) / w, min(1.0, (F[1] * H - y0) / h))
    # hjärtat och fot uttrycks i den beskurna bilden
    hj = [((u * W - x0) / w, (v * H - y0) / h) for (u, v) in r["hjarta"]]
    # som i tools/lager.py mjukas kanten mellan främre och bakre blad 2,5 px. Ut över blommans ytterkant är masken
    # hel (inte gånger bildens alfa): där finns bara det främre bladet, så det bakre lagret ska inte ha något där.
    # Annars delar båda lagren på de halvgenomskinliga kantpixlarna, och när 2D-reserven skalar ner lagren var för
    # sig blir kanten mörkare än i bilden.
    hard = (fram > 0.5).astype(np.float32)
    m = cv2.GaussianBlur(hard, (0, 0), 2.5)
    m = np.where((duk[..., 3] < 0.999) & (hard > 0.5), 1.0, m)   # hela kantpixlar som hör till det främre lagret
    fm = np.dstack([np.full((h, w, 3), 255, np.uint8), np.clip(m * 255 + 0.5, 0, 255).astype(np.uint8)])
    return rgba, fm, fot, hj


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bara", default="")
    ap.add_argument("--visa", default="")
    a = ap.parse_args()
    info_path = os.path.join(UT, "blommor.json")
    info = json.load(open(info_path))
    visa = []
    for namn, r in RECEPT.items():
        if a.bara and namn not in a.bara.split(","): continue
        rgba, fm, fot, hj = komponera(namn)
        Image.fromarray(rgba, "RGBA").save(os.path.join(UT, namn + ".webp"), "WEBP", quality=90, method=6)
        Image.fromarray(fm, "RGBA").save(os.path.join(UT, namn + "_fram.webp"), "WEBP", lossless=True, quality=100, method=6)   # förlustfri: masken måste vara exakt
        h, w = rgba.shape[:2]
        info[namn] = dict(w=w, h=h, fot=[round(float(fot[0]), 3), round(float(fot[1]), 3)], bg=r["bg"], ring=0, cirkel=False,
                          lager=dict(fram=namn + "_fram", hjarta=[[round(float(u), 4), round(float(v), 4)] for u, v in hj], ut=list(r["ut"])))
        print(f"{namn}: {w}x{h}, fot {info[namn]['fot']}, {os.path.getsize(os.path.join(UT, namn + '.webp')) // 1024} KB")
        if a.visa:
            bg = Image.new("RGBA", (w, h), r["bg"]); bg.alpha_composite(Image.fromarray(rgba, "RGBA"))
            visa.append(bg.convert("RGB"))
    json.dump(info, open(info_path, "w"), ensure_ascii=False)
    if a.visa and visa:
        hh = 520
        visa = [v.resize((int(v.width * hh / v.height), hh)) for v in visa]
        c = Image.new("RGB", (sum(v.width for v in visa) + 10 * len(visa), hh), "white"); x = 0
        for v in visa: c.paste(v, (x, 0)); x += v.width + 10
        c.save(a.visa)


if __name__ == "__main__":
    main()
