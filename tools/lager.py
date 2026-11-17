"""BLONDA BRIS – blommor i lager: främre kronblad framför stoftet, så att stoftet kommer inifrån blomman.

Läser den utklippta blomman (ui/blommor/<foto>.webp) och skriver
  ui/blommor/<foto>_fram.webp   masken för det främre lagret (vit, alfa = hur mycket "fram" pixeln är)
  ui/blommor/blommor.json        <foto>.lager = { fram: "<foto>_fram", hjarta: [[u, v], ...] }
Ritaren (ui/blommor.js) ritar blomman, sedan stoftet ur hjärtat, sedan blomman igen genom masken. Lagren har
samma pixlar och rör sig exakt lika, så blomman ser likadan ut; bara stoftet hamnar bakom de främre kronbladen.
Där kanten mellan lagren är en verklig kant i bilden är masken skarp, där ådringen löper obruten tonar den mjukt.

Lagerordningen (vad som ligger fram, bak och inuti) följer Victorys utsnittna kronblad för varje blomma
(t.ex. BLONDA_Orange_Reconstructed_Petals: 01 bakre övre, 02 nedre böjda, 03 röda hjärtat inuti, 04 främre räfflade,
05 lilla krullen/stjälken). Pixlarna är originalets: bitarna är nygenererade och stämmer inte pixel för pixel.
ut = riktningen stoftet strömmar ut i (grader på skärmen: 180 = vänster, 270 = upp).

    python3 tools/lager.py
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
UT = os.path.join(ROT, "ui", "blommor")

# Koordinater i bildens pixlar (samma som ui/blommor/<foto>.webp).
LAGER = {
    # amaryllis (ARP)
    "orange": dict(
        # 04 det stora högra kronbladet: verklig vänsterkant upptill, sedan obruten ådring ned mot hjärtat,
        # och hjärtats övre/högra kant (kronbladets nedre kant) längst ned
        fram=[[(470, 0), (940, 0), (940, 864), (705, 864), (716, 826), (701, 762), (662, 703), (622, 652), (565, 613),
               (502, 586), (470, 560), (438, 515), (398, 440), (377, 370), (375, 330), (386, 265), (421, 205),
               (468, 142), (500, 96), (480, 40)],
              # läppen framför hjärtat nedtill
              [(486, 706), (560, 724), (622, 766), (690, 834), (705, 864), (560, 864), (505, 790), (478, 735)]],
        mjuk=[(355, 320, 505, 585)],          # där kanten inte syns i bilden: mjuk övergång (x0, y0, x1, y1)
        hjarta=[(488, 588), (530, 592), (570, 612), (620, 648), (660, 700), (700, 765), (714, 825), (690, 832),
                (620, 765), (560, 722), (497, 707), (481, 660)],
        ut=(184, 245),                        # hjärtats öppning vetter åt vänster: ut åt vänster och uppåt (grader, 180 = vänster, 270 = upp)
    ),
    # iris och vit iris (PAD, INIT): samma uppbyggnad som den orange
    "lavendel": dict(
        fram=[[(650, 0), (1060, 0), (1060, 972), (830, 972), (720, 800), (700, 735), (660, 680), (610, 640), (560, 612),
               (520, 598), (480, 565), (440, 530), (410, 490), (397, 440), (400, 380), (408, 335), (422, 298), (442, 268),
               (472, 238), (512, 204), (556, 173), (602, 144), (650, 118)],
              [(540, 738), (578, 718), (618, 745), (660, 790), (705, 832), (745, 972), (600, 972), (560, 800), (530, 760)]],
        mjuk=[],
        hjarta=[(482, 610), (520, 600), (560, 612), (610, 640), (660, 680), (700, 735), (720, 800), (705, 830), (660, 790),
                (615, 745), (575, 722), (540, 738), (520, 710), (485, 690)],
        ut=(184, 245),
    ),
    # skäggiris (POLY): de två hängande kronbladen (falls) med skäggen ligger framför; hjärtat är V:et mellan dem
    "iris": dict(
        fram=[[(0, 640), (372, 628), (420, 612), (500, 618), (570, 655), (640, 688), (692, 720), (742, 760), (792, 808),
               (822, 858), (842, 918), (850, 1164), (0, 1164)],
              [(850, 1164), (845, 860), (850, 800), (855, 740), (860, 680), (872, 615), (895, 560), (940, 520), (1000, 505),
               (1100, 520), (1484, 520), (1484, 1164)]],
        mjuk=[],
        hjarta=[(740, 650), (800, 600), (860, 620), (856, 760), (842, 860), (810, 820), (770, 770), (720, 720)],
        ut=(245, 295),
    ),
    # kanna (BRASS): samma uppbyggnad som den orange
    "kanna": dict(
        fram=[[(740, 0), (1320, 0), (1320, 1400), (1030, 1400), (985, 1100), (965, 1040), (955, 970), (930, 900), (890, 840),
               (840, 790), (780, 752), (720, 736), (680, 712), (630, 660), (590, 600), (565, 540), (552, 470), (552, 400),
               (558, 350), (572, 300), (602, 258), (645, 205), (692, 175), (745, 140)],
              [(700, 885), (760, 895), (820, 930), (880, 985), (940, 1045), (975, 1110), (990, 1200), (900, 1100), (800, 1030),
               (740, 960), (705, 920)]],
        mjuk=[(530, 440, 700, 740)],
        hjarta=[(670, 740), (720, 736), (780, 752), (840, 790), (890, 840), (930, 900), (955, 970), (965, 1040), (940, 1045),
                (880, 985), (820, 930), (760, 895), (700, 885), (672, 860), (662, 800)],
        ut=(184, 245),
    ),
    # strelitzia (LEAD): näbben (och stjälken) ligger framför; hjärtat är öppningen där bladen växer upp
    "strelitzia": dict(
        fram=[[(500, 530), (560, 500), (640, 488), (700, 470), (780, 445), (900, 427), (1000, 417), (1100, 408), (1200, 401),
               (1290, 396), (1300, 720), (600, 720), (560, 1010), (400, 1010), (420, 800), (480, 640)]],
        mjuk=[],
        hjarta=[(650, 440), (700, 420), (760, 410), (820, 420), (850, 450), (800, 470), (720, 480), (660, 480)],
        ut=(240, 300),
    ),
    # lilja (BELL): de undre kronbladen, det övre vänstra och det vänstra ligger framför; stoftet följer ståndarna
    "lilja": dict(
        fram=[[(760, 705), (840, 690), (900, 672), (1000, 664), (1150, 668), (1300, 690), (1500, 690), (1500, 1140),
               (760, 1140), (700, 800)],
              [(740, 30), (850, 40), (905, 140), (905, 330), (860, 440), (800, 560), (765, 640), (720, 640), (700, 500),
               (720, 300), (790, 150)],
              [(410, 360), (520, 370), (620, 430), (690, 520), (760, 640), (720, 690), (640, 640), (500, 520), (420, 430)]],
        mjuk=[],
        hjarta=[(745, 640), (800, 615), (870, 620), (880, 665), (830, 690), (770, 700)],
        ut=(290, 340),
    ),
    # eukalyptus (BASS): stoftet kommer från knopparna och driver åt vänster; de största bladen ligger framför
    "eukalyptus": dict(
        fram=[[(1045, 500), (1100, 430), (1250, 390), (1400, 410), (1450, 530), (1420, 680), (1300, 770), (1150, 780),
               (1060, 700), (1040, 600)],
              [(640, 710), (700, 650), (830, 638), (950, 660), (1030, 760), (1035, 880), (980, 980), (870, 1030), (740, 1010),
               (660, 930), (640, 820)],
              [(250, 250), (300, 130), (420, 65), (560, 60), (690, 120), (765, 250), (740, 400), (660, 480), (560, 500),
               (450, 510), (330, 470), (260, 370)]],
        mjuk=[],
        hjarta=[(1020, 90), (1100, 90), (1200, 40), (1340, 35), (1385, 80), (1350, 180), (1260, 160), (1120, 170), (1060, 170)],
        ut=(150, 210),
    ),
    # gladiolus (STRINGS): det stora högra och det lila böjda kronbladet framför; stoftet stiger uppför strimman
    "silke": dict(
        fram=[[(800, 330), (760, 380), (735, 430), (705, 520), (668, 590), (630, 650), (600, 700), (575, 760), (560, 820),
               (540, 900), (700, 1060), (1320, 1060), (1320, 320)],
              [(380, 520), (470, 505), (560, 510), (590, 560), (595, 620), (578, 690), (552, 760), (525, 840), (500, 990),
               (420, 1000), (400, 700), (440, 620), (380, 560)]],
        mjuk=[],
        hjarta=[(565, 700), (600, 690), (640, 720), (650, 760), (620, 800), (580, 810), (550, 780)],
        ut=(250, 290),
    ),
    # solfjäder och nattviol (PLUCK, FX): det bruna vänstra och det lila nedre bladet framför; hjärtat är foten
    "solfjader": dict(
        fram=[[(0, 285), (280, 285), (400, 330), (480, 380), (540, 450), (590, 540), (630, 620), (660, 700), (672, 800),
               (652, 900), (610, 1000), (570, 1110), (0, 1110)],
              [(650, 1000), (720, 780), (800, 690), (900, 630), (1000, 610), (1100, 605), (1300, 650), (1460, 760),
               (1460, 1110), (620, 1110)]],
        mjuk=[],
        hjarta=[(615, 900), (660, 860), (700, 850), (720, 900), (690, 980), (640, 1010), (610, 980)],
        ut=(245, 295),
    ),
}


def mask(img, cfg):
    w, h = img.size
    hard = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(hard)
    for poly in cfg["fram"]:
        d.polygon(poly, fill=255)
    a = np.asarray(hard, np.float32) / 255
    skarp = np.asarray(hard.filter(ImageFilter.GaussianBlur(2.5)), np.float32) / 255
    mjuk = np.asarray(hard.filter(ImageFilter.GaussianBlur(26)), np.float32) / 255
    vikt = Image.new("L", (w, h), 0)
    dv = ImageDraw.Draw(vikt)
    for r in cfg.get("mjuk", []):
        dv.rectangle(r, fill=255)
    vikt = np.asarray(vikt.filter(ImageFilter.GaussianBlur(30)), np.float32) / 255
    m = vikt * mjuk + (1 - vikt) * skarp
    m *= np.asarray(img.getchannel("A"), np.float32) / 255     # bara där blomman finns
    del a
    out = np.zeros((h, w, 4), np.uint8)
    out[..., :3] = 255
    out[..., 3] = np.clip(m * 255 + 0.5, 0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def main():
    jf = os.path.join(UT, "blommor.json")
    info = json.load(open(jf, encoding="utf-8"))
    for foto, cfg in LAGER.items():
        if not os.path.exists(os.path.join(UT, foto + ".webp")): continue   # bilden används inte längre (se tools/kategorier.py)
        img = Image.open(os.path.join(UT, foto + ".webp")).convert("RGBA")
        w, h = img.size
        m = mask(img, cfg)
        m.save(os.path.join(UT, foto + "_fram.webp"), "WEBP", lossless=True, quality=100, method=6)
        info[foto]["lager"] = dict(fram=foto + "_fram", hjarta=[[round(x / w, 4), round(y / h, 4)] for x, y in cfg["hjarta"]],
                                   ut=list(cfg["ut"]))
        print(f"{foto}: mask {os.path.getsize(os.path.join(UT, foto + '_fram.webp')) // 1024} KB, hjärta {len(cfg['hjarta'])} punkter")
    json.dump(info, open(jf, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
