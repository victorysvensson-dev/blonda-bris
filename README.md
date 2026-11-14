# BLONDA BRIS

BLONDA BRIS – analog sexstämmig poly efter GS Music Bree6 – som plugg och app:

| Var | Format |
|---|---|
| Mac | **AU** (Logic Pro, GarageBand), **VST3** (Ableton Live m.fl.), fristående app |
| iPad / iPhone | app + **AUv3** (Logic Pro för iPad, GarageBand, AUM) |
| Webben | samma synth i webbläsaren (WebAssembly), med Web MIDI |

Ljudet är BRIS-motorn ur `blonda-motor` (oförändrad, samma GenExpr som Max for Live-pluggen) plus BLONDA RUM
(reverb) och BLONDA VIBE (drive). Alla 90 fabriksljud finns med, och **varje sorts ljud är en egen växt**:

| Kategori | Växt | | Kategori | Växt |
|---|---|---|---|---|
| PAD | iris | | PLUCK | kanna |
| STRINGS | magnolia | | BELL | lilja |
| POLY | pion | | ARP | lavendel |
| BRASS | påsklilja | | FX | maskros |
| LEAD | strelitzia | | INIT | frö |
| BASS | eukalyptus | | | |

Växterna ritas med kod (fibrer som i silke, inga bilder) och lever med ljudet: de andas med volymhöljet, öppnar sig
med filtret, vajar med LFO:n och släpper pollen när toner spelas. Varje ljud inom en kategori får sin egen variant.

## Så hänger det ihop

```
core/bris_core.h        ljudkärnan: BRIS + RUM + VIBE + frasspelaren (rullen) + mätare. Delas av allt nedan.
core/kategorier.h       GENERERAD: växt per ljud, effekter per växt
ui/                     gränssnittet (HTML/CSS/JS) – samma i pluggen, appen och på webben
  app.js                flikar, rattar, reglage, ljudlistan, vågen, rullen, tangenterna
  vaxter.js             växtritaren
  bridge.js             pratar med C++ (JUCE) eller med WebAssembly (webben)
  data.js               GENERERAD: parametrar, ljud, växter, fraser
plugin/                 JUCE-skalet: AU/VST3/AUv3/Standalone, gränssnittet i en WebView
web/                    webben: bris_wasm.cpp (kärnan som WebAssembly), worklet.js, bygg.sh
tools/kategorier.py     DEN ENDA SANNINGEN för växter, färger och fraser -> core/kategorier.h + ui/data.js
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
