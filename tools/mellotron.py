#!/usr/bin/env python3
"""MELLOTRON: banden (samplingarna) och motorn MELLOs parametrar och fabriksljud. Den enda sanningen för motorn.

    python3 tools/mellotron.py [mapp med Mellotron__1-48k.wav ... Mellotron__7-48k.wav]

Med en mapp: banden görs i ordning ur originalen (48 kHz, 16 bitar stereo, alla i C) och skrivs till
ui/mellotron/band_<n>.wav: tystnaden före tonen tas bort, svansen tonas ut när den har klingat av, och de skrivs om
till 32 kHz (banden har inget över 8 kHz, så inget går förlorat) i 16 bitar stereo. Inget normaliseras: nivån
mäts och blir en förstärkning per band i motorn.

Utan mapp: bara tabellerna görs om (ur banden som redan finns).

Skriver core/mello_ljud.h (parametrar, fabriksljud och banden för kärnan) och core/mello.json (samma sak för
tools/kategorier.py och webben). Ändra parametrar och ljud här, aldrig i de genererade filerna.
"""
import json, os, sys, wave
import numpy as np

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 32000

# banden: originalets nummer, namn (UI), grundton (MIDI), nivå i dB ovanpå den uppmätta (klangfärg och smak)
BAND = [
    (1, "FLUTE", 60, 0.0),
    (2, "VIBES", 72, 0.0),
    (3, "VIOLINS", 60, 0.0),
    (4, "BRASS", 72, -1.0),
    (5, "SAX", 60, 0.0),
    (6, "CELLO", 60, 0.0),
    (7, "CHOIR", 60, 0.0),
]

# parametrar: id, namn, min, max, standard, heltal. De sex sista delas med BRIS (effekterna efter rösterna och volymen)
# och ska heta som där. Lägg bara till nya i slutet (före de delade).
PARAMS = [
    ("band", "Tape", 0, len(BAND) - 1, 2, True),
    ("ton", "Tone", 0, 1, 0.5, False),
    ("wow", "Wow & Flutter", 0, 1, 0.3, False),
    ("slit", "Wear", 0, 1, 0.25, False),
    ("fart", "Speed", -1, 1, 0, False),
    ("aa", "Attack", 0, 1, 0.08, False),
    ("ar", "Release", 0, 1, 0.3, False),
    ("vela", "Velocity > Amp", 0, 1, 0.2, False),
    ("mwosc", "Wheel > Vibrato", 0, 1, 0.5, False),
    ("bredd", "Width", 0, 1, 0.8, False),
    ("chorus", "Chorus", 0, 1, 0.0, False),
    ("dtime", "Delay Time", 0, 1, 0.35, False),
    ("dfb", "Delay Feedback", 0, 1, 0.3, False),
    ("dmix", "Delay Mix", 0, 1, 0.0, False),
    ("bendr", "Bend Range", 0, 12, 2, True),
    ("vol", "Volume", 0, 1, 0.7, False),
]
KEEP = ["bendr", "vol"]

# fabriksljud: index 0 är alltid init. Parametrar som inte nämns får standardvärdet (utom KEEP).
PRESETS = [
    ("init", {}),
    ("violiner", {"band": 2, "ton": 0.48, "wow": 0.3, "slit": 0.25, "aa": 0.12, "ar": 0.35}),
    ("flöjt", {"band": 0, "ton": 0.52, "wow": 0.3, "slit": 0.2, "aa": 0.06, "ar": 0.3}),
    ("vibrafon", {"band": 1, "ton": 0.55, "wow": 0.2, "slit": 0.15, "aa": 0.0, "ar": 0.45, "vela": 0.5}),
    ("mässing", {"band": 3, "ton": 0.55, "wow": 0.25, "slit": 0.25, "aa": 0.02, "ar": 0.2, "vela": 0.4}),
    ("saxofon", {"band": 4, "ton": 0.5, "wow": 0.25, "slit": 0.2, "aa": 0.03, "ar": 0.3}),
    ("cello", {"band": 5, "ton": 0.45, "wow": 0.3, "slit": 0.25, "aa": 0.1, "ar": 0.35}),
    ("kör", {"band": 6, "ton": 0.47, "wow": 0.3, "slit": 0.25, "aa": 0.15, "ar": 0.45}),
    ("slitna violiner", {"band": 2, "ton": 0.32, "wow": 0.75, "slit": 0.8, "aa": 0.12, "ar": 0.35}),
    ("ekoflöjt", {"band": 0, "ton": 0.5, "wow": 0.35, "slit": 0.25, "aa": 0.06, "ar": 0.35, "dmix": 0.3, "dtime": 0.5, "dfb": 0.45}),
    ("långsam kör", {"band": 6, "ton": 0.42, "wow": 0.4, "slit": 0.3, "fart": -0.35, "aa": 0.35, "ar": 0.6, "chorus": 0.35}),
    ("mörk cello", {"band": 5, "ton": 0.28, "wow": 0.35, "slit": 0.4, "aa": 0.15, "ar": 0.4}),
    ("ljus vibrafon", {"band": 1, "ton": 0.7, "wow": 0.15, "slit": 0.1, "ar": 0.55, "vela": 0.6, "chorus": 0.4}),
    ("sliten mässing", {"band": 3, "ton": 0.38, "wow": 0.6, "slit": 0.75, "aa": 0.02, "ar": 0.2, "vela": 0.4}),
]


def las(fil):
    w = wave.open(fil)
    assert w.getsampwidth() == 2, fil
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, w.getnchannels()).astype(np.float64) / 32768
    if x.shape[1] == 1: x = np.repeat(x, 2, axis=1)
    return x, w.getframerate()


def skriv(fil, x, sr):
    y = np.clip(np.round(x * 32767), -32768, 32767).astype("<i2")
    with wave.open(fil, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y.tobytes())


def gor_band(mapp):
    from scipy.signal import resample_poly
    os.makedirs(os.path.join(ROT, "ui/mellotron"), exist_ok=True)
    for i, (nr, namn, rot, _db) in enumerate(BAND):
        x, sr = las(os.path.join(mapp, f"Mellotron__{nr}-48k.wav"))
        hop = sr // 200   # 5 ms
        env = np.array([np.abs(x[k:k + hop]).max() for k in range(0, len(x) - hop, hop)])
        top = env.max()
        start = max(0, int(np.argmax(env > top * 10 ** (-45 / 20))) * hop - sr // 1000)
        slut = (len(env) - int(np.argmax(env[::-1] > top * 10 ** (-60 / 20)))) * hop
        x = x[start:min(len(x), slut + sr // 50)].copy()
        fade = min(len(x) // 4, sr // 50)
        x[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
        x[:sr // 2000] *= np.linspace(0, 1, sr // 2000)[:, None]
        y = resample_poly(x, SR, sr, axis=0)
        skriv(os.path.join(ROT, f"ui/mellotron/band_{i + 1}.wav"), y, SR)
        print(f"band {i + 1} {namn}: {len(y) / SR:.2f} s")


def matt():
    """banden som finns: längd, nivå (rms över det som klingar) -> förstärkning till samma nivå"""
    ut = []
    for i, (nr, namn, rot, db) in enumerate(BAND):
        x, sr = las(os.path.join(ROT, f"ui/mellotron/band_{i + 1}.wav"))
        assert sr == SR
        m = x.mean(axis=1)
        hop = SR // 20
        r = np.array([np.sqrt((m[k:k + hop] ** 2).mean()) for k in range(0, len(m) - hop, hop)])
        klingar = r[r > r.max() * 0.25]
        rms = float(np.sqrt((klingar ** 2).mean()))
        gain = 0.16 / rms * 10 ** (db / 20)
        ut.append(dict(id=f"band{i + 1}", namn=namn, rot=rot, ramar=len(x), sek=round(len(x) / SR, 3), gain=round(gain, 4)))
    return ut


def main():
    if len(sys.argv) > 1: gor_band(sys.argv[1])
    band = matt()
    ids = [p[0] for p in PARAMS]
    for namn, v in PRESETS:
        okand = [k for k in v if k not in ids]
        if okand: sys.exit(f"{namn}: okända parametrar {okand}")
    js = dict(motor="mello", params=[dict(id=p[0], name=p[1], min=p[2], max=p[3], default=p[4], integer=p[5]) for p in PARAMS],
              keep=KEEP, uiOnly=[], voices=12, types=[b["namn"] for b in band], band=band,
              presets=[dict(name=n, values=v) for n, v in PRESETS])
    open(os.path.join(ROT, "core/mello.json"), "w", encoding="utf-8").write(json.dumps(js, ensure_ascii=False, indent=1) + "\n")

    h = ["// GENERERAD av tools/mellotron.py – ändra inte för hand.", "// MELLO (MELLOTRON): parametrar, fabriksljud och banden.",
         "#pragma once", '#include "blonda/motor.h"', "", "namespace blonda::app::mello {", "",
         f"constexpr int kNumParams = {len(PARAMS)};", "inline constexpr ParamInfo kParams[kNumParams] = {"]
    for p in PARAMS:
        h.append(f'    {{"{p[0]}", "{p[1]}", {float(p[2])}, {float(p[3])}, {float(p[4])}, {"true" if p[5] else "false"}, {"true" if p[0] in KEEP else "false"}}},')
    h += ["};", "enum Param {"] + [f"    P_{p[0].upper()} = {i}," for i, p in enumerate(PARAMS)] + ["};", ""]
    vals, info = [], []
    for namn, v in PRESETS:
        info.append(f'    {{"{namn}", {len(vals)}, {len(v)}}},')
        for k, x in v.items(): vals.append(f"    {{{ids.index(k)}, {float(x)}}},")
    h += [f"constexpr int kNumPresets = {len(PRESETS)};", "inline constexpr PresetInfo kPresets[kNumPresets] = {"] + info + ["};",
          f"inline constexpr PresetValue kPresetValues[{max(1, len(vals))}] = {{"] + (vals or ["    {0, 0.0},"]) + ["};", ""]
    h += ["// banden: namn, grundton (MIDI), längd i ramar vid kBandSr, förstärkning till samma nivå",
          "struct BandInfo { const char* name; int root; int frames; double gain; };",
          f"constexpr int kNumBand = {len(band)};", f"constexpr double kBandSr = {float(SR)};",
          "inline constexpr BandInfo kBand[kNumBand] = {"]
    for b in band:
        h.append(f'    {{"{b["namn"]}", {b["rot"]}, {b["ramar"]}, {b["gain"]}}},')
    h += ["};", "", "}  // namespace blonda::app::mello", ""]
    open(os.path.join(ROT, "core/mello_ljud.h"), "w", encoding="utf-8").write("\n".join(h))
    for b in band: print(f'{b["id"]} {b["namn"]:8s} rot {b["rot"]} {b["sek"]:.2f} s gain {b["gain"]}')


if __name__ == "__main__":
    main()
