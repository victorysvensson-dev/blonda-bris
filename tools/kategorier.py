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

# Växterna. Ordningen = ordningen i ljudlistan. id används av växtritaren i ui/vaxter.js.
# fx = (rvb, rsize, drive) som sätts när man väljer ett ljud av växten.
VAXTER = [
    dict(id="iris", kat="PAD", namn="IRIS", farg="#7a4bd4", bg="#f6f1f4", fx=(0.35, 0.75, 0.0)),
    dict(id="magnolia", kat="STRINGS", namn="MAGNOLIA", farg="#b3587a", bg="#f7f1ef", fx=(0.30, 0.65, 0.0)),
    dict(id="pion", kat="POLY", namn="PION", farg="#c42f6c", bg="#f8f1f1", fx=(0.20, 0.55, 0.0)),
    dict(id="pasklilja", kat="BRASS", namn="PÅSKLILJA", farg="#c98a00", bg="#f7f3ec", fx=(0.20, 0.55, 0.05)),
    dict(id="strelitzia", kat="LEAD", namn="STRELITZIA", farg="#d8401f", bg="#f8f1ed", fx=(0.18, 0.50, 0.10)),
    dict(id="eukalyptus", kat="BASS", namn="EUKALYPTUS", farg="#5d6b22", bg="#f5f3ee", fx=(0.00, 0.40, 0.15)),
    dict(id="kanna", kat="PLUCK", namn="KANNA", farg="#e8601c", bg="#f2ece8", fx=(0.22, 0.50, 0.0)),
    dict(id="lilja", kat="BELL", namn="LILJA", farg="#2f5bd3", bg="#f6f4f4", fx=(0.30, 0.60, 0.0)),
    dict(id="lavendel", kat="ARP", namn="LAVENDEL", farg="#6a58c6", bg="#f4f2f5", fx=(0.18, 0.50, 0.0)),
    dict(id="maskros", kat="FX", namn="MASKROS", farg="#a07a3a", bg="#f5f2ec", fx=(0.40, 0.85, 0.0)),
    dict(id="fro", kat="INIT", namn="FRÖ", farg="#5f8a4e", bg="#f4f3ef", fx=(0.20, 0.55, 0.0)),
]

# Vilken växt varje fabriksljud är (namn exakt som i blonda-motor).
INDELNING = {
    "iris": ["Simple Pad", "Winter", "Brassy Pad", "Beauty", "Romance", "Twisted Pad", "Morning Pad", "Dove Pad",
             "bris", "blå pad", "mörk drone"],
    "magnolia": ["Ensemble", "Strings", "Juno Low Strings 1", "Juno Low Strings 2", "Humana", "pwm-sträng", "kör"],
    "pion": ["Poly Magic", "Poly Pulse", "Encore", "Vintage Saw", "Vintage Pulse", "Fake Hi Pass", "Hello Bree6",
             "Chordz", "Poly Synth", "vintagekeys", "tremolo", "Sines"],
    "pasklilja": ["Synth Brass", "Synth Horns", "Synth Trumpet", "brass", "syntbrass"],
    "strelitzia": ["SQR Lead", "SAW Lead", "Porta Fun", "Rock Amour", "Prog Synth", "MPE Lead", "mono lead",
                   "kvintlead", "mjuk lead", "visselfilter", "Gladiator", "Distroyer", "Full On", "stor unison"],
    "eukalyptus": ["Unison Bass", "Dance Bass", "PWM Bass", "Deep Bass", "Duckling", "Wawa Bass", "New Wave Bass",
                   "Kompressor Bass", "Rezo Bass", "unison bas", "oktavbas", "pulsbas", "sub-bas"],
    "kanna": ["Strummer", "Pluck 1", "12 Strings", "Soft Pluck", "pluck", "ekopluck"],
    "lilja": ["Steel Drums", "Bellish", "Audio Rate Perc", "ringping", "klocka"],
    "lavendel": ["PWM ARP", "Fly SEQ", "Octave ARP", "Brittle ARP", "Octave SEQ", "Bits", "Mute ARP", "arpeggio"],
    "maskros": ["Riser", "Riser 2", "Opening", "Riser 3", "Riser 4", "Riser 5", "svep", "s&h-bubbel"],
    "fro": ["init"],
}


def ack(*toner):
    return list(toner)


# Standardfraser i rullen (16 steg). rate 4 = sextondelar, 2 = åttondelar. Toner: (steg, längd, ton(er), styrka)
FRASER = {
    "iris": dict(rate=2, toner=[(0, 8, ack(60, 63, 67, 70), 92), (8, 8, ack(56, 60, 63, 67), 88)]),
    "magnolia": dict(rate=2, toner=[(0, 8, ack(55, 60, 63), 90), (8, 4, ack(53, 58, 62), 86), (12, 4, ack(55, 58, 63), 88)]),
    "pion": dict(rate=4, toner=[(0, 4, ack(60, 63, 67, 70), 100), (6, 2, ack(60, 63, 67, 70), 84), (8, 4, ack(56, 60, 63, 67), 96),
                               (14, 2, ack(58, 62, 65), 80)]),
    "pasklilja": dict(rate=4, toner=[(0, 3, ack(60, 63, 67), 110), (6, 2, ack(60, 63, 67), 90), (8, 4, ack(58, 62, 65), 104),
                                    (12, 3, ack(56, 60, 63), 100)]),
    "strelitzia": dict(rate=4, toner=[(0, 3, 72, 104), (3, 1, 75, 88), (4, 4, 79, 100), (8, 2, 77, 92), (10, 2, 75, 90),
                                     (12, 4, 74, 96)]),
    "eukalyptus": dict(rate=4, toner=[(0, 2, 36, 112), (3, 1, 36, 90), (6, 2, 48, 100), (8, 2, 36, 110), (11, 1, 39, 92),
                                     (12, 2, 43, 104), (14, 1, 46, 96)]),
    "kanna": dict(rate=4, toner=[(0, 1, 72, 108), (2, 1, 70, 90), (3, 1, 67, 96), (6, 1, 75, 104), (8, 1, 72, 100),
                                (10, 1, 79, 96), (11, 1, 77, 88), (14, 1, 75, 92)]),
    "lilja": dict(rate=4, toner=[(0, 3, 79, 104), (4, 2, 84, 92), (7, 1, 82, 84), (8, 4, 75, 100), (12, 2, 77, 90),
                                (14, 2, 79, 88)]),
    "lavendel": dict(rate=4, toner=[(i, 1, [60, 63, 67, 70, 72, 70, 67, 63][i % 8], 112 if i % 4 == 0 else 88) for i in range(16)]),
    "maskros": dict(rate=2, toner=[(0, 16, ack(48, 60), 100)]),
    "fro": dict(rate=4, toner=[(0, 4, 60, 100), (4, 4, 63, 96), (8, 4, 67, 100), (12, 4, 70, 96)]),
}


def main():
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
    h += ["};", "", "struct ExtraParam { const char* id; const char* name; double min, max, def; };",
          f"constexpr int kNumExtra = {len(EXTRA)};", "inline constexpr ExtraParam kExtra[kNumExtra] = {"]
    for e in EXTRA:
        h.append(f'    {{"{e[0]}", "{e[1]}", {e[2]}, {e[3]}, {e[4]}}},')
    h += ["};", "", "}  // namespace blonda::app", ""]
    open(os.path.join(ROT, "core/kategorier.h"), "w", encoding="utf-8").write("\n".join(h))

    # ---- JS
    params = [dict(id=p["id"], name=p["name"], min=p["min"], max=p["max"], def_=p["default"], int=p["integer"])
              for p in BRIS["params"] if p["id"] not in BRIS["uiOnly"]]
    for e in EXTRA:
        params.append(dict(id=e[0], name=e[1], min=e[2], max=e[3], def_=e[4], int=False))
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
                plants=[dict(id=v["id"], cat=v["kat"], name=v["namn"], color=v["farg"], bg=v["bg"],
                             fx=list(v["fx"])) for v in VAXTER],
                phrases=fraser, motor=open(os.path.join(ROT, "External/blonda-motor/VERSION")).read().strip())
    js = ("// GENERERAD av tools/kategorier.py – ändra inte för hand.\n"
          "window.BRIS_DATA = " + json.dumps(data, ensure_ascii=True, separators=(",", ":")) + ";\n")
    open(os.path.join(ROT, "ui/data.js"), "w", encoding="utf-8").write(js)
    print(f"{len(namn)} ljud i {len(VAXTER)} växter: " +
          ", ".join(f'{v["kat"]} {sum(1 for n in namn if vaxt_av[n] == v["id"])}' for v in VAXTER))


if __name__ == "__main__":
    main()
