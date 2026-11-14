# BLONDA motor

BLONDAs gemensamma bibliotek med ljudmotorer. En motor är en synth utan skal: den tar emot toner,
MIDI och parametrar och ger ut stereoljud. Samma motor kan sedan läggas i Max for Live, VST3/AU,
SEQ.3 på Mac och iOS, på webben eller i hårdvara, och låter likadant överallt.

| Motor | Vad | Röster | Fabriksljud |
|---|---|---|---|
| `bris` | BLONDA BRIS – analog poly efter GS Music Bree6 (oscillator + sub, 4-polig ladder, 2 × ADSR, LFO, chorus, eko) | 6 | 64 i originalets ordning + 25 egna |
| `puls` | BLONDA PULS – trummaskin med åtta syntade trumljud: bastrumma, virvel, kantslag, handklapp, stängd och öppen hihat (stryps), puka, koskälla. Fyra rattar per trumljud (nivå, stämning, längd, karaktär) + drivning | 8 (en per trumljud) | 9 trumset |

**PULS och toner:** tonnummer % 12 väljer trumljud, så alla oktaver fungerar och C1 = 36 följer General MIDI för de
vanligaste: C BD, C# RS, D SD, D# CP, E SD, F/G/A/B puka (låg → hög), F# CH, G# CB, A# OH. `Puls::hit(röst, styrka)`
slår an ett trumljud direkt (för sekvensrar). Noter av ignoreras; trumljuden klingar ut av sig själva.

### Effekter (från 0.2.0)

Samma GenExpr som BLONDAs Max for Live-effekter, med pluggarnas rattar (namn, intervall, startvärden):

| Effekt | Pluggen | Vad |
|---|---|---|
| `filter` | BLONDA FILTER | DJ-filter: lågpass åt vänster, högpass åt höger, resonans, drive, taktsynkad rörelse |
| `sliten` | BLONDA SLITEN | slitet band: wow, flutter, mättnad, brus, avbrott, olika media |
| `frys` | BLONDA FRYS | frys ljudet till ett kornmoln (storlek, täthet, tonhöjd, baklänges, drift) |
| `skift` | BLONDA SKIFT | tonhöjdsskift med två röster, fördröjning och återkoppling |
| `vibe` | BLONDA VIBE | boom, punch, drive, crush, wobble, band, glue, rum, brus |
| `svav` | BLONDA SVÄV | svävande stereo: spridning, binauralt, panorering |
| `eko` | BLONDA EKO | eko/delay med ping-pong, wow, mättnad, frys, duck |
| `rum` | BLONDA RUM | reverb med storlek, efterklang, dämpning, predelay, modulation |

```cpp
#include "blonda/effekter.h"
auto fx = blonda::createEffect("frys");   // allokerar: gör det före ljudtråden
fx->prepare(sampleRate);
fx->setTempo(bpm);                        // pluggarnas in3 (Lives taktfas) kommer från effektens egen klocka
fx->setParam(fx->findParam("frys"), 1.0);
fx->process(left, right, numSamples);     // på plats, i ljudtråden
```

## Så hänger det ihop

```
generator/            <- den enda sanningen (Python)
  byggklossar.py         ladder-filter, polyBLEP, tidskonstanter … delas av alla motorer
  bris.py                BRIS-ljudet, skrivet som GenExpr med byggklossarna
  puls.py, puls_ljud.py  PULS (trummaskinen): ljudet och trumseten
  bris_ljud.py           parametrar och fabriksljud
  genexpr2cpp.py         översätter GenExpr till C++
  bygg.py                skriver alla filer i motorer/
  effekter/<id>.genexpr  effekternas GenExpr, hämtad ur Max-pluggen med hamta_effekt.py (+ <id>.json: rattarna)
motorer/bris/         <- genererat + motorns C++-skal
  bris.genexpr           går rakt in i Max for Live-pluggens gen~
  bris_gen.h             samma kod som C++ (genererad)
  bris_ljud.h            parametrar och fabriksljud i C++ (genererad)
  bris.json              parametrar och fabriksljud för andra språk (genererad)
  bris_presets.js        fabriksljuden för Max-pluggens gränssnitt (genererad)
  bris.h                 motorn: röstfördelning + Motor-gränssnittet (handskriven)
include/blonda/
  motor.h                gränssnittet alla motorer följer
  blonda_c.h             samma sak som C-funktioner (Swift, WebAssembly, C …)
  motorer.h              createMotor("bris")
  effekt.h               gränssnittet för effekter (ljud in, ljud ut) + GenEffect-skalet
  effekter.h             createEffect("frys")
tester/                tester, facit och referensen som bevisar att C++ = Max-pluggen
verktyg/blonda_render  spela en motor till WAV från terminalen
```

Max-pluggen och C++-motorn byggs från **samma GenExpr-text**. Paritetstestet kör den genererade C++-koden
mot en separat GenExpr-tolk sampel för sampel; skillnaden ligger på ~10⁻¹⁵ (avrundningsbrus), det vill säga
de räknar exakt likadant.

## Använda en motor

**C++ (JUCE, iPlug2, egen app):**

```cmake
add_subdirectory(blonda-motor)
target_link_libraries(min_plugg PRIVATE blonda::motor)
```

```cpp
#include "bris/bris.h"
blonda::bris::Bris motor;
motor.prepare(sampleRate);
motor.loadPreset(motor.findPreset("Poly Magic"));
motor.midi(status, data1, data2);           // eller noteOn/noteOff
motor.setParam(motor.findParam("cut"), 0.4);
motor.process(left, right, numSamples);     // i ljudtråden
```

Alla parametrar finns i `paramInfo(i)` (id, namn, min, max, standard, heltal) – det räcker för att
skapa värdprogrammets parametrar i en VST3/AU automatiskt.

**C / Swift / WebAssembly:** länka `blonda::motor_c` och använd `include/blonda/blonda_c.h`
(`blonda_create("bris")`, `blonda_note_on`, `blonda_process` …). Swift kan anropa C direkt.
(Effekterna finns ännu bara i C++-gränssnittet.)

**Max for Live:** pluggens bygge läser `generator/` härifrån och kopierar `bris.genexpr` och
`bris_presets.js` in i pluggen.

## Bygga och testa

```bash
./kolla.sh            # genererat aktuellt + bygg + tester + paritet (urval)
./kolla.sh --allt     # paritet för alla fabriksljud
build/blonda-render bris --list
build/blonda-render bris --preset "Unison Bass" --notes 36 -o bas.wav
build/blonda-render bris --all utmapp/
build/blonda-render puls --preset Klassisk --monster "36:0,8;38:4,12;42:0,2,4,6,8,10,12,14" --bpm 96 --len 5 -o takt.wav
build/blonda-render puls --all utmapp/   # varje trumset med ett standardmönster
```

Kräver CMake 3.16+, en C++17-kompilator, Python 3 och Node (bara för paritetstestet).
CI kör allt på Linux, macOS och Windows vid varje push.

## Version

0.3.0 – ny motor: PULS, trummaskin med åtta syntade trumljud (facit, beteendetester och paritet mot GenExpr-referensen).
Byggklossen `svf` (tillståndsvariabelt filter). `blonda-render` kan spela trummönster (`--monster`, `--bpm`).
BRIS och effekterna är oförändrade (samma facit).
0.2.0 – åtta effekter från BLONDAs Max for Live-effekter (`blonda::Effect`, `createEffect`); översättaren klarar
`in1..inN` och `dim()`. BRIS är oförändrad (samma facit).
0.1.0 – första motorn (BRIS). Taggar (`v0.1.0` …) gör att projekt kan ligga kvar på en version.

© BLONDA. Alla rättigheter förbehållna.
