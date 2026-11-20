# BLONDA motor

BLONDAs gemensamma bibliotek med ljudmotorer. En motor är en synth utan skal: den tar emot toner,
MIDI och parametrar och ger ut stereoljud. Samma motor kan sedan läggas i Max for Live, VST3/AU,
SEQ.3 på Mac och iOS, på webben eller i hårdvara, och låter likadant överallt.

| Motor | Vad | Röster | Fabriksljud |
|---|---|---|---|
| `bris` | BLONDA BRIS – analog poly efter GS Music Bree6 (oscillator + sub, 4-polig ladder, 2 × ADSR, LFO, chorus, eko) | 6 | 64 i originalets ordning + 25 egna |
| `brismpe` | BLONDA BRIS MPE – BRIS där varje ton har egen böj, egen slide och eget tryck (MPE). Slide styr filter, vibrato, tremolo, PWM eller wah (`slm`). Utan uttryck exakt BRIS, sampel för sampel | 6 | samma som BRIS |
| `one` | BLONDA ONE – BRIS möter Moog: tre oscillatorer per röst (triangel, såg, puls; fotlägen 32'–2'; oscillator 2 och 3 stäms i halvtoner och finstäms), brus, en mixer som driver en 4-polig stege (`drv`), och BRIS röstlägen, LFO, höljen, ensemble och eko | 6 | 49 egna |
| `puls` | BLONDA PULS – trummaskin med åtta syntade trumljud: bastrumma, virvel, kantslag, handklapp, stängd och öppen hihat (stryps), puka, koskälla. Fyra rattar per trumljud (nivå, stämning, längd, karaktär) + drivning | 8 (en per trumljud) | 9 trumset |
| `orgel` | BLONDA ORGEL – piporgel: dragregister 16', 8' (principal och flöjt), 4', 2 2/3', 2', 1 3/5', blandning IV och trumpet 8', svävning (celeste), luft och chiff i anslaget, tremulant och svällare. Pipor på C- och Ciss-sidan | 8 | 6 egna |
| `sloja` | BLONDA SLÖJA – skimrande additiv pad: 16 deltoner per röst som andas (formant), skimrar och glittrar med långsamma LFO:er, udda/jämna deltoner, sub, bredd | 6 | 6 egna |
| `stav` | BLONDA STAV – elpiano med FM-tonstav: tonstav (Rhodes-aktigt), tunga (Wurlitzer-aktigt) eller FM (80-tal); anslaget gör tonen ljusare, pickup (bark), ping, mekanik och stereotremolo | 6 | 5 egna |
| `onempe` | BLONDA ONE MPE – ONE där varje ton har egen böj, egen slide och eget tryck (MPE), som BRIS MPE. Slide styr filter, vibrato, tremolo, PWM eller wah (`slm`). Utan uttryck exakt ONE | 6 | samma som ONE |
| `stavmpe` | BLONDA STAV MPE – STAV med MPE. Slide gör tonen ljusare, ger vibrato, tremolo, morr (pickupen) eller wah (`slm`); trycket ger vibrato. Utan uttryck exakt STAV | 6 | samma som STAV |
| `kor` | BLONDA KÖR – mänskliga röster: tre sångare per ton med alla deltoner upp till 36 genom fyra formanter (vokalerna U, O, A, E, I), röstläge (bas till barn), styrka, sångarformant, vibrato som kommer efter ansatsen, jitter, shimmer och vandring (liv), andning genom formanterna och en mun som öppnar sig i ansatsen | 6 | 11 egna |
| `kormpe` | BLONDA KÖR MPE – KÖR med MPE. Slide flyttar vokalen, ger vibrato, tremolo, styrka eller en vokal som böljar (wah) (`slm`); trycket ger vibrato och styrka. Utan uttryck exakt KÖR | 6 | samma som KÖR |
| `orgelmpe` | BLONDA ORGEL MPE – ORGEL med MPE. Slide gör pipan ljusare, ger vibrato, tremolo, svävning (celeste) eller wah (`slm`); trycket ger tremulant. Utan uttryck exakt ORGEL | 8 | samma som ORGEL |
| `slojampe` | BLONDA SLÖJA MPE – SLÖJA med MPE. Slide gör tonen ljusare, ger vibrato, tremolo, udda deltoner (ihåligt, som PWM) eller wah (`slm`); trycket ger vibrato. Utan uttryck exakt SLÖJA | 6 | samma som SLÖJA |

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
| `mood` | BLONDA MOOD | atmosfärer i Chase Bliss MOOD MKII:s anda: WET (reverb, delay, slip, freeze), mikrolooper som alltid lyssnar (env, tape, stretch, overdub), klocka i harmoniska steg, routing, spread |

`mood` är skriven direkt här i `generator/mood.py` (det finns ingen Max-plugg för den än); Ableton-chatten kan bygga en
plugg av `motorer/mood/mood.genexpr`. Rattarna och vad de gör står överst i `generator/mood.py`.

```cpp
#include "blonda/effekter.h"
auto fx = blonda::createEffect("frys");   // allokerar: gör det före ljudtråden
fx->prepare(sampleRate);
fx->setTempo(bpm);                        // pluggarnas in3 (Lives taktfas) kommer från effektens egen klocka
fx->setParam(fx->findParam("frys"), 1.0);
fx->process(left, right, numSamples);     // på plats, i ljudtråden
```

### Webbmotorer (från BLONDA SOLAR, tidigare ATMOSPHERE)

I `webb/atmosphere/` ligger motorer och effekter som finns som webbkod (Web Audio), ännu inte som GenExpr/C++:

| Motor | Vad |
|---|---|
| `dis` | andande additiv pad/drönare: tre klangskikt per ton som tonar över i varandra |
| `strak` | stråkensemble: sågtänder, kroppsformanter, fördröjt vibrato, BBD-ensemble |
| `glas` | modal klocka: glasstav, klocka eller sjungande skål |
| `luft` | luftton: brus genom smala bandpass + sinus (flöjt, andning, kör) |
| `moln` (effekt) | granulärt moln: korn ur de senaste sekunderna med tonhöjd, panorering och återkoppling |

Där finns också texturbäddar (vind, hav), mjuka trummor, SEQ.3:s webbmotorer och mätning/mastring (LUFS, sann topp,
klangmatchande EQ, limiter). Se `webb/atmosphere/README.md`.

## Så hänger det ihop

```
generator/            <- den enda sanningen (Python)
  byggklossar.py         ladder-filter, polyBLEP, tidskonstanter … delas av alla motorer
  bris.py                BRIS-ljudet, skrivet som GenExpr med byggklossarna (bris(mpe=True) = BRIS MPE)
  brismpe_ljud.py        BRIS MPE: BRIS parametrar och ljud + slide-målet
  one.py, one_ljud.py    ONE (BRIS möter Moog): ljudet och fabriksljuden; effekterna efter rösterna är BRIS (FX_UT i bris.py)
  puls.py, puls_ljud.py  PULS (trummaskinen): ljudet och trumseten
  orgel.py, sloja.py, stav.py (+ _ljud.py)  ORGEL, SLÖJA och STAV: ljudet och fabriksljuden; BRIS röstfördelning
                         och effekter efter rösterna (FX_UT)
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
  bris_motor.h           röstfördelning + Motor-gränssnittet, delas av BRIS och BRIS MPE (handskriven)
  bris.h                 motorn BRIS (handskriven)
motorer/brismpe/      <- samma sorts filer för BRIS MPE; brismpe.h tolkar MPE (kanal 1 huvud, 2–16 en ton var)
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

0.10.1 – MPE-varianterna: ORGEL MPE och SLÖJA MPE blir ljusare utan att bli starkare (FILTER, WAH), SLÖJA MPE:s PWM
ändrar inte nivån, ORGEL MPE:s PWM (svävningen) svävar snabbare, STAV MPE:s FILTER och WAH är tydligare.
Ordinarie motorer oförändrade (facit oförändrat).

0.10.0 – KÖR MPE, ORGEL MPE och SLÖJA MPE: KÖR, ORGEL och SLÖJA med egen böj, slide och tryck per ton
(generatorerna med `mpe=True`, gemensamma bitar i `bris.py`: `MPE_GEN`, `mpe_param`, `mpe_hist`, `mpe_uttryck`).
Nu har alla motorer som BLONDA BRIS använder en MPE-variant. KÖR, ORGEL och SLÖJA låter exakt som förut (facit oförändrat).

0.9.0 – tre nya motorer. KÖR: en kör av mänskliga röster (additiv röstkälla genom fyra formanter, vokaler U–I,
röstläge, sångarformant, vibrato, jitter/shimmer, andning, ansats med stängd mun). ONE MPE och STAV MPE: ONE och STAV med
egen böj, slide och tryck per ton, som BRIS MPE (generator/one.py och stav.py med `mpe=True`). MPE-hanteringen är nu
gemensam (`motorer/bris/mpe_motor.h`); BRIS MPE, ONE och STAV låter exakt som förut (facit och paritet oförändrade).

0.8.0 – ONE får 20 nya fabriksljud (index 50–69) i stil med klassiska analoga ljud som många håller för de bästa:
hoppbrass, filmbrass, nattpad, funkmoog, visslead, glidlead, supersåg, trancepluck, stråkmaskin, änglakör,
arenabrass, syntwavebas, syntwavearp, husorgel, morrsvep, slapbas, mjukpwm, lofi-keys, svävbas, åttabit. De ligger
sist, så de befintliga ljuden och deras nummer är oförändrade (facit för dem oförändrat).

0.7.0 – tre nya motorer: ORGEL (piporgel, 8 röster), SLÖJA (skimrande additiv pad) och STAV (FM-elpiano). Alla tre
räknar sina deltoner med rekursion ur en enda fas per röst (billigt), har BRIS röstfördelning och BRIS effekter efter
rösterna. Röstfördelningen (`bris_motor.h`) tar nu antalet röster som mallparameter (standard 6); BRIS, BRIS MPE och
ONE låter exakt som förut (facit och paritet oförändrade). Facit, beteendetester och paritet för de nya motorerna.

0.6.0 – ny motor: ONE (BRIS möter Moog): tre oscillatorer per röst med vågform, fotläge, halvtoner och finstämning, brus,
drivning in i stegen, och BRIS röstlägen, LFO, höljen, ensemble och eko. 49 fabriksljud. BRIS effekter efter rösterna
ligger nu i `FX_UT` i `generator/bris.py` och delas med ONE; BRIS genererade filer och ljud är oförändrade. Ny
byggkloss: `polyblamp` (rundar triangelns hörn).

0.5.0 – ny effekt: MOOD (WET-kanal med reverb/delay/slip och freeze, mikrolooper som alltid lyssnar med env/tape/stretch
och overdub, gemensam klocka, routing, spread). Facit, beteendetester och paritet mot GenExpr-referensen. Övriga motorer
och effekter oförändrade.

0.4.0 – ny motor: BRIS MPE (egen böj, slide och tryck per ton). Röstfördelningen flyttad till bris_motor.h (oförändrad);
`Motor::midi` är virtuell. BRIS ljud oförändrat (facit och paritet).

0.3.0 – ny motor: PULS, trummaskin med åtta syntade trumljud (facit, beteendetester och paritet mot GenExpr-referensen).
Byggklossen `svf` (tillståndsvariabelt filter). `blonda-render` kan spela trummönster (`--monster`, `--bpm`).
BRIS och effekterna är oförändrade (samma facit).
0.2.0 – åtta effekter från BLONDAs Max for Live-effekter (`blonda::Effect`, `createEffect`); översättaren klarar
`in1..inN` och `dim()`. BRIS är oförändrad (samma facit).
0.1.0 – första motorn (BRIS). Taggar (`v0.1.0` …) gör att projekt kan ligga kvar på en version.

© BLONDA. Alla rättigheter förbehållna.
