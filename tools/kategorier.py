#!/usr/bin/env python3
"""BLONDA BRIS – växterna och kategorierna för alla fabriksljud.

Den enda sanningen för vilken växt varje ljud är, färgerna, effekternas startvärden per växt och
standardfraserna i rullen. Läser parametrar och ljud ur blonda-motor (External/blonda-motor/motorer/bris/bris.json)
och skriver:
  core/kategorier.h   (C++: växt per ljud, effekter per växt, extra parametrar)
  ui/data.js          (gränssnittet: parametrar, ljud, växter, fraser)

  python3 tools/kategorier.py
"""
import json, os, sys

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRIS = json.load(open(os.path.join(ROT, "External/blonda-motor/motorer/bris/bris.json"), encoding="utf-8"))

# Extra parametrar i pluggen utöver BRIS (läggs sist, ändra aldrig ordningen – bara lägg till i slutet).
EXTRA = [
    # id, namn, min, max, standard
    ("rvb", "Reverb", 0.0, 1.0, 0.2),
    ("rsize", "Reverb Size", 0.0, 1.0, 0.55),
    ("drive", "Drive", 0.0, 1.0, 0.0),
]
# MOOD (effekten mood ur blonda-motor) – alla dess rattar med prefixet "mo", i effektens ordning.
MOOD = json.load(open(os.path.join(ROT, "External/blonda-motor/motorer/mood/mood.json"), encoding="utf-8"))
for _p in MOOD["params"]:
    EXTRA.append(("mo" + _p["id"], "MOOD " + _p["name"], _p["min"], _p["max"], _p["default"], _p["integer"]))
# ARP: av/på, läge (UP DOWN UP-DOWN RANDOM), takt (1/4 1/8 1/8T 1/16 1/16T 1/32), oktaver, gate.
EXTRA += [
    ("arp", "Arp", 0.0, 1.0, 0.0, True),
    ("arpm", "Arp Mode", 0.0, 3.0, 0.0, True),
    ("arpr", "Arp Rate", 0.0, 5.0, 3.0, True),
    ("arpo", "Arp Octaves", 1.0, 4.0, 1.0, True),
    ("arpg", "Arp Gate", 0.05, 1.0, 0.6, False),
]
EXTRA = [e if len(e) == 6 else e + (False,) for e in EXTRA]

# Glid på tangenterna (och MPE-slide, CC74): vad fingret som glider uppåt modulerar. Ordningen = läge 1, 2, ...
# (läge 0 = av). param = parametern som får glidet ovanpå sig, djup = andel av parameterns omfång vid fullt glid,
# takt = LFO:n höjs till minst ca 6 Hz medan man glider. Ändra bara genom att lägga till i slutet.
GLID = [
    # id, namn, kort, param, djup, takt
    ("filter", "FILTER", "FILT", "cut", 0.42, False),
    ("vibrato", "VIBRATO", "VIB", "lfoosc", 0.28, True),
    ("tremolo", "TREMOLO", "TREM", "lfoamp", 0.70, True),
    ("pwm", "PWM", "PWM", "lfopwm", 0.80, False),
    ("wah", "WAH", "WAH", "lfocut", 0.60, False),
]
GLID_TAKT = 0.6   # lrate minst så här medan man glider (0.1 * 1000^0.6 = ca 6 Hz)

# Växterna. Ordningen = ordningen i ljudlistan. id används av växtritaren i ui/vaxter.js.
# fx = (rvb, rsize, drive) som sätts när man väljer ett ljud av växten.
VAXTER = [
    dict(id="iris", kat="PAD", namn="IRIS", foto="lavendel", farg="#8350c5", fx=(0.35, 0.75, 0.0)),
    dict(id="gladiolus", kat="STRINGS", namn="GLADIOLUS", foto="guld", farg="#e0662e", fx=(0.30, 0.65, 0.0)),
    dict(id="skaggiris", kat="POLY", namn="SKÄGGIRIS", foto="iris", farg="#6a3dc0", fx=(0.20, 0.55, 0.0)),
    dict(id="kanna", kat="BRASS", namn="KANNA", foto="kanna", farg="#e2612c", fx=(0.20, 0.55, 0.05)),
    dict(id="strelitzia", kat="LEAD", namn="STRELITZIA", foto="strelitzia", farg="#e23f18", fx=(0.18, 0.50, 0.10)),
    dict(id="eukalyptus", kat="BASS", namn="EUKALYPTUS", foto="eukalyptus", farg="#5a6510", fx=(0.00, 0.40, 0.15)),
    dict(id="solfjader", kat="PLUCK", namn="SOLFJÄDER", foto="smaragd", farg="#17806f", fx=(0.22, 0.50, 0.0)),
    dict(id="lilja", kat="BELL", namn="LILJA", foto="lilja", farg="#1f55cc", fx=(0.30, 0.60, 0.0)),
    dict(id="amaryllis", kat="ARP", namn="AMARYLLIS", foto="magenta", farg="#c2185b", fx=(0.18, 0.50, 0.0)),
    dict(id="nattviol", kat="FX", namn="NATTVIOL", foto="blaiiris", farg="#3a42d0", fx=(0.40, 0.85, 0.0)),
    dict(id="vitiris", kat="INIT", namn="VIT IRIS", foto="silke", mattnad=0.12, farg="#7c7470", fx=(0.20, 0.55, 0.0)),
]

# Vilken växt varje fabriksljud är (namn exakt som i blonda-motor).
INDELNING = {
    "iris": ["Simple Pad", "Winter", "Brassy Pad", "Beauty", "Romance", "Twisted Pad", "Morning Pad", "Dove Pad",
             "bris", "blå pad", "mörk drone"],
    "gladiolus": ["Ensemble", "Strings", "Juno Low Strings 1", "Juno Low Strings 2", "Humana", "pwm-sträng", "kör"],
    "skaggiris": ["Poly Magic", "Poly Pulse", "Encore", "Vintage Saw", "Vintage Pulse", "Fake Hi Pass", "Hello Bree6",
             "Chordz", "Poly Synth", "vintagekeys", "tremolo", "Sines"],
    "kanna": ["Synth Brass", "Synth Horns", "Synth Trumpet", "brass", "syntbrass"],
    "strelitzia": ["SQR Lead", "SAW Lead", "Porta Fun", "Rock Amour", "Prog Synth", "MPE Lead", "mono lead",
                   "kvintlead", "mjuk lead", "visselfilter", "Gladiator", "Distroyer", "Full On", "stor unison"],
    "eukalyptus": ["Unison Bass", "Dance Bass", "PWM Bass", "Deep Bass", "Duckling", "Wawa Bass", "New Wave Bass",
                   "Kompressor Bass", "Rezo Bass", "unison bas", "oktavbas", "pulsbas", "sub-bas"],
    "solfjader": ["Strummer", "Pluck 1", "12 Strings", "Soft Pluck", "pluck", "ekopluck"],
    "lilja": ["Steel Drums", "Bellish", "Audio Rate Perc", "ringping", "klocka"],
    "amaryllis": ["PWM ARP", "Fly SEQ", "Octave ARP", "Brittle ARP", "Octave SEQ", "Bits", "Mute ARP", "arpeggio"],
    "nattviol": ["Riser", "Riser 2", "Opening", "Riser 3", "Riser 4", "Riser 5", "svep", "s&h-bubbel"],
    "vitiris": ["init"],
}


def ack(*toner):
    return list(toner)


# Standardfraser i rullen (16 steg). rate 4 = sextondelar, 2 = åttondelar. Toner: (steg, längd, ton(er), styrka)
FRASER = {
    "iris": dict(rate=2, toner=[(0, 8, ack(60, 63, 67, 70), 92), (8, 8, ack(56, 60, 63, 67), 88)]),
    "gladiolus": dict(rate=2, toner=[(0, 8, ack(55, 60, 63), 90), (8, 4, ack(53, 58, 62), 86), (12, 4, ack(55, 58, 63), 88)]),
    "skaggiris": dict(rate=4, toner=[(0, 4, ack(60, 63, 67, 70), 100), (6, 2, ack(60, 63, 67, 70), 84), (8, 4, ack(56, 60, 63, 67), 96),
                               (14, 2, ack(58, 62, 65), 80)]),
    "kanna": dict(rate=4, toner=[(0, 3, ack(60, 63, 67), 110), (6, 2, ack(60, 63, 67), 90), (8, 4, ack(58, 62, 65), 104),
                                    (12, 3, ack(56, 60, 63), 100)]),
    "strelitzia": dict(rate=4, toner=[(0, 3, 72, 104), (3, 1, 75, 88), (4, 4, 79, 100), (8, 2, 77, 92), (10, 2, 75, 90),
                                     (12, 4, 74, 96)]),
    "eukalyptus": dict(rate=4, toner=[(0, 2, 36, 112), (3, 1, 36, 90), (6, 2, 48, 100), (8, 2, 36, 110), (11, 1, 39, 92),
                                     (12, 2, 43, 104), (14, 1, 46, 96)]),
    "solfjader": dict(rate=4, toner=[(0, 1, 72, 108), (2, 1, 70, 90), (3, 1, 67, 96), (6, 1, 75, 104), (8, 1, 72, 100),
                                (10, 1, 79, 96), (11, 1, 77, 88), (14, 1, 75, 92)]),
    "lilja": dict(rate=4, toner=[(0, 3, 79, 104), (4, 2, 84, 92), (7, 1, 82, 84), (8, 4, 75, 100), (12, 2, 77, 90),
                                (14, 2, 79, 88)]),
    "amaryllis": dict(rate=4, toner=[(i, 1, [60, 63, 67, 70, 72, 70, 67, 63][i % 8], 112 if i % 4 == 0 else 88) for i in range(16)]),
    "nattviol": dict(rate=2, toner=[(0, 16, ack(48, 60), 100)]),
    "vitiris": dict(rate=4, toner=[(0, 4, 60, 100), (4, 4, 63, 96), (8, 4, 67, 100), (12, 4, 70, 96)]),
}


def main():
    blom = json.load(open(os.path.join(ROT, "ui/blommor/blommor.json"), encoding="utf-8"))
    for v in VAXTER:
        v["bg"] = blom[v["foto"]]["bg"]
    namn = [p["name"] for p in BRIS["presets"]]
    vaxt_av = {}
    for vid, lista in INDELNING.items():
        for n in lista:
            if n not in namn:
                sys.exit(f"okänt ljud i INDELNING: {n!r}")
            if n in vaxt_av:
                sys.exit(f"ljudet {n!r} finns i två växter")
            vaxt_av[n] = vid
    saknas = [n for n in namn if n not in vaxt_av]
    if saknas:
        sys.exit("ljud utan växt: " + ", ".join(saknas))
    vix = {v["id"]: i for i, v in enumerate(VAXTER)}
    assert set(vix) == set(INDELNING) == set(FRASER)

    # ordning i ljudlistan: växt för växt, inom växten originalordningen
    ordning = []
    nr_i_vaxt = {}
    for v in VAXTER:
        k = 0
        for i, n in enumerate(namn):
            if vaxt_av[n] == v["id"]:
                k += 1
                nr_i_vaxt[i] = k
                ordning.append(i)
    assert sorted(ordning) == list(range(len(namn)))

    # ---- C++
    h = ["// GENERERAD av tools/kategorier.py – ändra inte för hand.", "#pragma once", "",
         "namespace blonda::app {", "",
         f"constexpr int kNumPlants = {len(VAXTER)};",
         f"constexpr int kNumFactory = {len(namn)};", "",
         "struct PlantInfo { const char* id; const char* category; const char* name; float rvb, rsize, drive; };",
         "inline constexpr PlantInfo kPlants[kNumPlants] = {"]
    for v in VAXTER:
        h.append(f'    {{"{v["id"]}", "{v["kat"]}", "{v["namn"]}", {v["fx"][0]:.3f}f, {v["fx"][1]:.3f}f, {v["fx"][2]:.3f}f}},')
    h += ["};", "", "// växt för varje fabriksljud (index som i blonda-motor)",
          "inline constexpr unsigned char kPresetPlant[kNumFactory] = {"]
    h.append("    " + ", ".join(str(vix[vaxt_av[n]]) for n in namn))
    h += ["};", "", "// ljudlistans ordning (växt för växt)", "inline constexpr unsigned char kBrowseOrder[kNumFactory] = {"]
    h.append("    " + ", ".join(map(str, ordning)))
    h += ["};", "", "struct ExtraParam { const char* id; const char* name; double min, max, def; bool integer; };",
          f"constexpr int kNumExtra = {len(EXTRA)};", "inline constexpr ExtraParam kExtra[kNumExtra] = {"]
    for e in EXTRA:
        h.append(f'    {{"{e[0]}", "{e[1]}", {e[2]}, {e[3]}, {e[4]}, {"true" if e[5] else "false"}}},')
    h += ["};", "", "// glid på tangenterna / MPE-slide (läge = index + 1)",
          "struct GlidInfo { const char* id; const char* name; const char* param; double depth; bool rate; };",
          f"constexpr int kNumGlid = {len(GLID)};", f"constexpr double kGlidRate = {GLID_TAKT};",
          "inline constexpr GlidInfo kGlid[kNumGlid] = {"]
    for g in GLID:
        h.append(f'    {{"{g[0]}", "{g[1]}", "{g[3]}", {g[4]}, {"true" if g[5] else "false"}}},')
    h += ["};", "", "}  // namespace blonda::app", ""]
    open(os.path.join(ROT, "core/kategorier.h"), "w", encoding="utf-8").write("\n".join(h))

    # ---- JS
    params = [dict(id=p["id"], name=p["name"], min=p["min"], max=p["max"], def_=p["default"], int=p["integer"])
              for p in BRIS["params"] if p["id"] not in BRIS["uiOnly"]]
    for e in EXTRA:
        params.append(dict(id=e[0], name=e[1], min=e[2], max=e[3], def_=e[4], int=bool(e[5])))
    for p in params:
        p["def"] = p.pop("def_")
    presets = []
    for i, n in enumerate(namn):
        presets.append(dict(i=i, name=n, plant=vix[vaxt_av[n]], nr=nr_i_vaxt[i]))
    fraser = {}
    for vid, f in FRASER.items():
        toner = []
        for steg, lang, ton, sty in f["toner"]:
            for t in (ton if isinstance(ton, list) else [ton]):
                toner.append([steg, lang, t, sty])
        fraser[vid] = dict(rate=f["rate"], notes=toner)
    data = dict(params=params, presets=presets, order=ordning,
                plants=[dict(id=v["id"], cat=v["kat"], name=v["namn"], color=v["farg"], bg=v["bg"], photo=v["foto"],
                             hue=v.get("ton", 0), sat=v.get("mattnad", 1), fx=list(v["fx"])) for v in VAXTER],
                blommor={k: v for k, v in blom.items() if any(x["foto"] == k for x in VAXTER)},   # bara de som används
                glid=dict(rate=GLID_TAKT, targets=[dict(id=g[0], name=g[1], short=g[2], param=g[3], depth=g[4], rate=g[5]) for g in GLID]),
                phrases=fraser, motor=open(os.path.join(ROT, "External/blonda-motor/VERSION")).read().strip(),
                version=open(os.path.join(ROT, "VERSION")).read().strip())
    js = ("// GENERERAD av tools/kategorier.py – ändra inte för hand.\n"
          "window.BRIS_DATA = " + json.dumps(data, ensure_ascii=True, separators=(",", ":")) + ";\n")
    open(os.path.join(ROT, "ui/data.js"), "w", encoding="utf-8").write(js)
    print(f"{len(namn)} ljud i {len(VAXTER)} växter: " +
          ", ".join(f'{v["kat"]} {sum(1 for n in namn if vaxt_av[n] == v["id"])}' for v in VAXTER))


if __name__ == "__main__":
    main()
