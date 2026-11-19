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
# BAND (effekten sliten ur blonda-motor): av/på och alla dess rattar med prefixet "ta", i effektens ordning.
# Används av den hemliga patchen KASSETTEN (media 0 = kassett).
SLITEN = json.load(open(os.path.join(ROT, "External/blonda-motor/motorer/sliten/sliten.json"), encoding="utf-8"))
EXTRA.append(("tape", "Tape", 0.0, 1.0, 0.0, True))
for _p in SLITEN["params"]:
    EXTRA.append(("ta" + _p["id"], "TAPE " + _p["name"], _p["min"], _p["max"], _p["default"], _p["integer"] or _p["id"] == "media"))
# REC LEVEL: hur hårt bandet spelas in på (bandspelaren i KASSETTEN och TAPE under FX). 0.6 = 0 dB.
EXTRA.append(("tarec", "TAPE Rec Level", 0.0, 1.0, 0.6))
# MOTORER: de hemliga patcharnas egna ljudmotorer ur blonda-motor (ORGEL, SLÖJA, STAV). "motor" väljer vilken som låter
# (0 = BRIS), sedan alla motorernas rattar med ett prefix per motor, utom de som delas med BRIS (DELADE: effekterna
# efter rösterna och volymen; BRIS värde gäller för alla motorer). Motorernas fabriksljud får index efter BRIS
# (kNumFactory + motorns första + ljudets index).
MOTORER = [("orgel", "ORGEL", "og"), ("sloja", "SLÖJA", "sj"), ("stav", "STAV", "sv"), ("one", "ONE", "on"), ("mello", "MELLO", "ml")]
DELADE = {"chorus", "dtime", "dfb", "dmix", "bendr", "vol"}
# MELLO (bandinstrumentet i MELLOTRON) är BRIS egen: tools/mellotron.py skriver core/mello.json
MOTOR_DATA = {m: json.load(open(os.path.join(ROT, "core/mello.json" if m == "mello" else f"External/blonda-motor/motorer/{m}/{m}.json"), encoding="utf-8")) for m, _, _ in MOTORER}
EXTRA.append(("motor", "Engine", 0.0, float(len(MOTORER)), 0.0, True))
for _m, _namn, _pre in MOTORER:
    for _p in MOTOR_DATA[_m]["params"]:
        if _p["id"] not in DELADE:
            EXTRA.append((_pre + _p["id"], _namn + " " + _p["name"], _p["min"], _p["max"], _p["default"], _p["integer"]))
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

# De hemliga patcharna. Var och en har ett eget ljud som bara finns här (inte bland fabriksljuden): ljud = namnet
# och alla inställningar, ovanpå init-ljudet. Inställningarna utanför BRIS-motorn (MOOD, bandet, rummet ...) sätts
# tillbaka när man lämnar patchen. melodi = tonklasserna (0 = C) som låser upp den, i vilken oktav som helst, medan
# appen lyssnar (fem tryck på BLONDA; KRISTALL: fem tryck på versionen). scen = katalogen i ui/ med scenens data.
HEMLIGA = [
    # KRISTALL "prisma": glasigt, ljust och skimrande (smal puls, resonans, chorus), ett kort eko och ett ljust rum
    dict(id="kristall", namn="KRISTALL", ljudnamn="prisma", melodi=None, scen="kristall",
         satt={"vform": 1, "pw": 0.16, "lfopwm": 0.12, "lrate": 0.3, "cut": 0.68, "res": 0.38, "eg1": 0.22, "kbd": 0.9,
               "fa": 0, "fd": 0.42, "fs": 0.3, "fr": 0.6, "aa": 0, "ad": 0.62, "asus": 0.45, "ar": 0.62, "detune": 0.2,
               "chorus": 0.65, "dmix": 0.24, "dtime": 0.42, "dfb": 0.38, "velf": 0.4, "vela": 0.5, "vol": 0.6,
               "rvb": 0.35, "rsize": 0.8, "mowet": 1, "mowmode": 0, "motime": 0.7, "mowmod": 0.85, "moblend": 0.3, "motone": 0.6}),
    # SJÖN "månvatten": ett mjukt, ihåligt anslag som klingar ut länge, med långt eko (som ringarna) och ett stort rum
    dict(id="sjon", namn="SJÖN", ljudnamn="månvatten", melodi=[11, 9, 2, 9], scen=None,   # B-A-D-A
         satt={"vform": 1, "pw": 0.3, "lfopwm": 0.2, "lrate": 0.22, "sub": 0.1, "cut": 0.52, "res": 0.25, "eg1": 0.35, "kbd": 0.8,
               "fa": 0, "fd": 0.5, "fs": 0.15, "fr": 0.7, "aa": 0.01, "ad": 0.78, "asus": 0.22, "ar": 0.85, "detune": 0.22,
               "chorus": 0.7, "dmix": 0.4, "dtime": 0.62, "dfb": 0.55, "velf": 0.4, "vela": 0.5, "vol": 0.5,
               "rvb": 0.45, "rsize": 0.95, "mowet": 1, "mowmode": 0, "motime": 0.86, "mowmod": 0.75, "moblend": 0.42, "motone": 0.35}),
    # KASSETTEN "varm 106": ett varmt Juno 106-ljud mellan pad och keys (såg + sub, lågt filter, mycket chorus) genom bandet
    dict(id="kassett", namn="KASSETTEN", ljudnamn="varm 106", melodi=[2, 4, 0, 9, 2, 4], scen="kassett",   # D-E-C-A-D-E
         satt={"vform": 0, "sub": 0.4, "pw": 0.5, "cut": 0.4, "res": 0.12, "eg1": 0.3, "kbd": 0.45, "fa": 0.02, "fd": 0.55,
               "fs": 0.45, "fr": 0.55, "aa": 0.04, "ad": 0.6, "asus": 0.82, "ar": 0.58, "detune": 0.12, "chorus": 0.9,
               "lfoosc": 0.03, "lrate": 0.45, "dmix": 0.12, "dtime": 0.4, "dfb": 0.25, "velf": 0.3, "vela": 0.4,
               "drive": 0.1, "rvb": 0.18, "rsize": 0.5, "tape": 1, "tawet": 1, "tabredd": 0.85}, band=0),
    # NORRSKEN "polarljus": motorn SLÖJA (skimrande additiv pad) med ett svävande eko och ett stort rum. F-A-D-E.
    dict(id="norrsken", namn="NORRSKEN", ljudnamn="polarljus", melodi=[5, 9, 2, 4], scen="norrsken", motor="sloja",
         satt={"vol": 0.88, "rvb": 0.5, "rsize": 1.0, "mowet": 1, "mowmode": 0, "motime": 0.92, "mowmod": 0.9, "moblend": 0.4,
               "motone": 0.55}),
    # NATTÅGET "nattåg": motorn STAV (elpiano med tremolo), ett litet rum och lite band (som en gammal inspelning).
    # B-A-G-G-A-G-E.
    dict(id="nattag", namn="NATTÅGET", ljudnamn="nattåg", melodi=[11, 9, 7, 7, 9, 7, 4], scen=None, motor="stav",
         satt={"vol": 0.92, "rvb": 0.25, "rsize": 0.55, "tape": 1, "tamedia": 0, "taage": 0.3, "tawow": 0.25, "taflut": 0.2,
               "tasat": 0.35, "tabrus": 0.15, "taavbr": 0.02, "taton": 0.5, "tawet": 1}),
    # ORGELN "katedral": motorn ORGEL (fullt verk) i ett enormt stenrum. B-A-C-H (B = B♭, H = B).
    dict(id="orgel", namn="ORGELN", ljudnamn="katedral", melodi=[10, 9, 0, 11], scen="orgel", motor="orgel",
         satt={"vol": 0.8, "rvb": 0.7, "rsize": 1.0, "mowet": 1, "mowmode": 0, "motime": 0.97, "mowmod": 0.3, "moblend": 0.45,
               "motone": 0.45}),
    # ANALOG "one": motorn ONE (BRIS möter Moog) med alla dess ljud, i ett litet rum. D-E-C-C-G (de fem tonerna).
    dict(id="analog", namn="ANALOG", ljudnamn="one", melodi=[2, 4, 0, 0, 7], scen=None, motor="one",
         satt={"vol": 0.7, "rvb": 0.18, "rsize": 0.45}),
    # MELLOTRON "violiner": bandinstrumentet MELLO (sju riktiga mellotronband) med alla sina ljud, i ett mjukt rum.
    # C-G-E-A-G.
    dict(id="mellotron", namn="MELLOTRON", ljudnamn="violiner", melodi=[0, 7, 4, 9, 7], scen=None, motor="mello",
         satt={"vol": 0.72, "rvb": 0.3, "rsize": 0.6}),
]
# Banden i KASSETTEN (och under FX när den är hittad): varje band ställer in bandet (SLITEN) på sitt sätt.
# namn, etikett (står på kassetten), färg (randen), inställningar
BAND = [
    ("TYPE I", "NORMAL", "#e8742c", {"tamedia": 0, "taage": 0.5, "tawow": 0.4, "taflut": 0.35, "tasat": 0.55, "tabrus": 0.35, "taavbr": 0.1, "taton": 0.42}),
    ("TYPE II", "CHROME", "#3d6fd6", {"tamedia": 0, "taage": 0.32, "tawow": 0.25, "taflut": 0.22, "tasat": 0.38, "tabrus": 0.2, "taavbr": 0.05, "taton": 0.56}),
    ("METAL", "METAL", "#8e959e", {"tamedia": 0, "taage": 0.2, "tawow": 0.15, "taflut": 0.12, "tasat": 0.28, "tabrus": 0.12, "taavbr": 0.02, "taton": 0.64}),
    ("WORN", "SLITEN", "#a07a48", {"tamedia": 0, "taage": 0.88, "tawow": 0.72, "taflut": 0.6, "tasat": 0.7, "tabrus": 0.55, "taavbr": 0.45, "taton": 0.3}),
    ("MICRO", "DIKTAFON", "#c9c2b0", {"tamedia": 6, "taage": 0.55, "tawow": 0.45, "taflut": 0.5, "tasat": 0.6, "tabrus": 0.45, "taavbr": 0.2, "taton": 0.4}),
    ("VHS", "VHS", "#d23a3a", {"tamedia": 1, "taage": 0.5, "tawow": 0.45, "taflut": 0.35, "tasat": 0.5, "tabrus": 0.35, "taavbr": 0.15, "taton": 0.45}),
]

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
    for _m, _n, pre in MOTORER:
        egna = [e[0] for e in EXTRA if e[0].startswith(pre)]
        vant = [pre + x["id"] for x in MOTOR_DATA[_m]["params"] if x["id"] not in DELADE]
        if egna != vant: sys.exit(f"prefixet {pre} krockar: {sorted(set(egna) - set(vant))}")
        if any(p["id"].startswith(pre) for p in BRIS["params"]): sys.exit(f"prefixet {pre} krockar med BRIS")
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
    # motorerna: prefix och var deras fabriksljud börjar
    forsta, h_m = len(namn), []
    for m, mn, pre in MOTORER:
        n_ = len(MOTOR_DATA[m]["presets"])
        h_m.append(f'    {{"{m}", "{mn}", "{pre}", {forsta}, {n_}}},')
        forsta += n_
    h += ["};", "", "// de hemliga patcharnas motorer (motor = index + 1); fabriksljuden har index efter BRIS",
          "struct MotorInfo { const char* id; const char* name; const char* prefix; int firstPreset; int numPresets; };",
          f"constexpr int kNumMotorer = {len(MOTORER)};", f"constexpr int kNumAllPresets = {forsta};",
          "inline constexpr MotorInfo kMotorer[kNumMotorer] = {"] + h_m
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
    # de hemliga patcharna: ljudet, inställningarna ovanpå och scenens data (ui/<scen>/<scen>.json)
    giltiga = {p["id"] for p in data["params"]}
    data["motorer"], forsta = [], len(namn)
    for m, mn, pre in MOTORER:
        pr = [x["name"] for x in MOTOR_DATA[m]["presets"]]
        data["motorer"].append(dict(id=m, namn=mn, prefix=pre, forsta=forsta, ljud=pr, delade=sorted(DELADE),
                                    params=[x["id"] for x in MOTOR_DATA[m]["params"]]))
        if "band" in MOTOR_DATA[m]:   # MELLO: banden (namn, grundton, längd) till scenen och webben
            data["motorer"][-1]["band"] = [dict(namn=b["namn"], rot=b["rot"], sek=b["sek"]) for b in MOTOR_DATA[m]["band"]]
        forsta += len(pr)
    data["hemliga"] = []
    for i_, h in enumerate(HEMLIGA):
        okand = [k for k in h["satt"] if k not in giltiga]
        if okand: sys.exit(f"{h['id']}: okända parametrar {okand}")
        e = dict(id=h["id"], namn=h["namn"], nr=i_ + 1, ljud=namn.index("init"), ljudnamn=h["ljudnamn"], satt=h["satt"],
                 melodi=h["melodi"], band=h.get("band"))
        if h.get("motor"):   # en egen motor: patchens ljud är motorns fabriksljud med namnet ljudnamn
            mi = next(x for x in data["motorer"] if x["id"] == h["motor"])
            if h["ljudnamn"] not in mi["ljud"]: sys.exit(f"{h['id']}: {h['motor']} har inget ljud {h['ljudnamn']!r}")
            e["motor"] = h["motor"]; e["ljud"] = mi["forsta"] + mi["ljud"].index(h["ljudnamn"])
        if h["scen"]:
            sj = os.path.join(ROT, f"ui/{h['scen']}/{h['scen']}.json")
            if not os.path.exists(sj): sys.exit(f"{h['id']}: saknar {sj}")
            e["scen"] = json.load(open(sj, encoding="utf-8"))
        data["hemliga"].append(e)
    data["band"] = []
    for b_ in BAND:
        okand = [k for k in b_[3] if k not in giltiga]
        if okand: sys.exit(f"bandet {b_[0]}: okända parametrar {okand}")
        data["band"].append(dict(namn=b_[0], etikett=b_[1], farg=b_[2], satt=b_[3]))
    js = ("// GENERERAD av tools/kategorier.py – ändra inte för hand.\n"
          "window.BRIS_DATA = " + json.dumps(data, ensure_ascii=True, separators=(",", ":")) + ";\n")
    open(os.path.join(ROT, "ui/data.js"), "w", encoding="utf-8").write(js)
    print(f"{len(namn)} ljud i {len(VAXTER)} växter: " +
          ", ".join(f'{v["kat"]} {sum(1 for n in namn if vaxt_av[n] == v["id"])}' for v in VAXTER))


if __name__ == "__main__":
    main()
