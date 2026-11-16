# BLONDA BRIS

BLONDA BRIS – analog sexstämmig poly efter GS Music Bree6 – som plugg och app:

| Var | Format |
|---|---|
| Mac | **AU** (Logic Pro, GarageBand), **VST3** (Ableton Live m.fl.), fristående app |
| iPad / iPhone | app + **AUv3** (Logic Pro för iPad, GarageBand, AUM) |
| Webben | samma synth i webbläsaren (WebAssembly), med Web MIDI |

Ljudet är BRIS-motorn ur `blonda-motor` (oförändrad, samma GenExpr som Max for Live-pluggen) plus BLONDA RUM
(reverb) och BLONDA VIBE (drive). Alla 90 fabriksljud finns med, och **varje sorts ljud har sin egen blomma** ur BLONDAs design (se Blommorna nedan).
Alla ljud i en kategori visar samma blomma. Gränssnittet är enkelt: PLAY är blomman stort med tangenter och
ljudväljare; OSC, FILTER, AMP, MOD och FX är ljudets inställningar. Versionen står uppe till höger (t.ex. BRIS 1.2.0).
Glid: håll tangenter och för fingrarna rakt uppåt så moduleras ljudet; vad som moduleras väljs i raden SLIDE UP
ovanför tangenterna (OFF, FILTER, VIBRATO, TREMOLO, PWM, WAH). Det ändrar inte ljudets sparade värden.
På iPad och iPhone får allt plats utan att man skrollar, stående som liggande.

## Installera på Macen

```sh
curl -sL https://raw.githubusercontent.com/victorysvensson-dev/blonda-bris/main/tools/installera-mac.sh | sh
```

Lägger AU-pluggen (Logic), VST3 och appen på plats från Releases → senaste och kontrollerar AU:n med `auval`.

## Blommorna

Blommorna är Victorys designbilder (`resurser/design/`), utklippta med `tools/blommor.py`: designens ring och prick
tas bort, bilden förstoras med Real-ESRGAN och bakgrunden blir genomskinlig (`ui/blommor/*.webp`). I gränssnittet
böjs bilden med WebGL (`ui/blommor.js`), så blomman vajar, andas och öppnar sig med ljudet.

| Kategori | Blomma (bild) | | Kategori | Blomma (bild) |
|---|---|---|---|---|
| PAD | iris (07) | | PLUCK | solfjäder (06) |
| STRINGS | gladiolus (05) | | BELL | lilja (03) |
| POLY | skäggiris (01) | | ARP | amaryllis (08, rödare ton) |
| BRASS | kanna (10) | | FX | nattviol (06, blåare ton) |
| LEAD | strelitzia (02) | | INIT | vit iris (07, utan färg) |
| BASS | eukalyptus (04) | | | |

## Så hänger det ihop

```
core/bris_core.h        ljudkärnan: BRIS + RUM + VIBE + mätare (frasspelaren finns kvar men används inte av gränssnittet). Delas av allt nedan.
core/kategorier.h       GENERERAD: växt per ljud, effekter per växt
ui/                     gränssnittet (HTML/CSS/JS) – samma i pluggen, appen och på webben
  app.js                flikar, rattar, reglage, ljudlistan, vågen, tangenterna (med oktav + / −)
  blommor.js            blommorna (WebGL), blommor/*.webp bilderna
  bridge.js             pratar med C++ (JUCE) eller med WebAssembly (webben)
  data.js               GENERERAD: parametrar, ljud, växter, version
plugin/                 JUCE-skalet: AU/VST3/AUv3/Standalone, gränssnittet i en WebView
web/                    webben: bris_wasm.cpp (kärnan som WebAssembly), worklet.js, bygg.sh
tools/kategorier.py     DEN ENDA SANNINGEN för växter, färger och fraser -> core/kategorier.h + ui/data.js
tools/blommor.py        klipper ut blommorna ur designbilderna -> ui/blommor/
External/blonda-motor/  kopia av motorerna ur blonda-motor (se VERSION där)
tester/                 kärnan, wasm = C++, webben i Chrome, pluggens ljuddel
```

## Bygga

```sh
python3 tools/kategorier.py                     # efter ändring av växter/fraser
sh web/bygg.sh                                  # webben -> dist/web (kräver wasi-sdk, WASI_SDK=...)
cmake -B build -G Xcode && cmake --build build --config Release           # Mac: AU, VST3, app
cmake -B build-ios -G Xcode -DCMAKE_SYSTEM_NAME=iOS -DBRIS_TEAM=<team-id>   # iOS: öppna i Xcode, kör på enheten
```

GitHub Actions bygger och testar allt vid varje push (Linux: kärnan, wasm, webben i Chrome, pluggens ljuddel;
Mac: universell AU/VST3/app + `auval`; iOS: app + AUv3 i simulatorn) och lägger Mac-filerna under
Releases → **senaste**.

## Uppdatera BRIS-ljudet

Ljudet ändras bara i `blonda-motor`. Kopiera sedan `include/blonda/{motor,effekt,gen_runtime}.h` och
`motorer/{bris,rum,vibe,sliten}` hit till `External/blonda-motor/`, skriv commit i `External/blonda-motor/VERSION`
och kör testerna.

© BLONDA. Byggt med JUCE 8.
