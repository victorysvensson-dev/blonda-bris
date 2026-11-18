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
ljudväljare; OSC, FILTER, AMP, MOD och FX är ljudets inställningar. Versionen står uppe till höger (t.ex. BRIS 1.3.0).
Glid: håll tangenter och för fingrarna rakt uppåt så moduleras ljudet; vad som moduleras väljs i raden SLIDE UP
ovanför tangenterna (OFF, FILTER, VIBRATO, TREMOLO, PWM, WAH). Det ändrar inte ljudets sparade värden.
Reglaget eller ratten för det som moduleras visar en prick vid det modulerade värdet. KEYS − / + zoomar
tangenterna (fler eller större), strecket ovanför dem ändrar höjden (dubbelklick = standard).
MPE: klaviaturer med MPE (Roli, Linnstrument, Osmose, Logic) – slide (CC74) styr glidet, tryck blir aftertouch och
böj på tonkanalerna följer den senast spelade tonen. Motorn har ett filter och en böj för alla röster, så uttrycket
slås ihop i stället för att vara helt per ton.
På iPad och iPhone får allt plats utan att man skrollar, stående som liggande.

## 1.12.0

- De hemliga patcharna har egna ljud som bara finns i dem (inte bland fabriksljuden, inställningarna ligger i
  tools/kategorier.py): KRISTALL "prisma" (glasigt och skimrande), SJÖN "månvatten" (mjukt, ihåligt anslag med långt
  eko och stort rum, som ringarna på vattnet) och KASSETTEN "varm 106" (ett varmt Juno 106-ljud mellan pad och keys,
  såg och sub, lågt filter och mycket chorus) genom bandet.
- KASSETTEN: sex band att byta mellan, TYPE I, TYPE II (krom), METAL, WORN (slitet), MICRO (diktafon) och VHS. Byt
  till höger under TAPE eller genom att trycka på kassetten. Spolarna stannar, luckan mörknar och kassetten får
  bandets färg och namn. Till höger finns också WEAR, WOW och NOISE.
- När KASSETTEN är hittad finns bandet även under FX (knappen TAPE vid SPACE): av/på, banden, WEAR, WOW, FLUTTER,
  NOISE, SATURATION, DROPOUTS, TONE och MIX, i alla ljud.
- Tonföljderna gäller bara när appen lyssnar: tryck fem gånger på BLONDA, så lyssnar den i ungefär fem sekunder
  (varje ton håller den öppen lite till) medan bokstäverna i BLONDA lyfter och lyser upp i en våg. Då kan man inte
  råka hitta en hemlig patch genom att bara spela.
- tester/lyssna.cpp spelar en fras genom hela kärnan och skriver en wav (för att lyssna på och mäta ett ljud).

## 1.11.0

- Två nya hemliga patchar, som låses upp genom att man spelar en tonföljd på tangenterna (i vilken oktav som helst).
  En skylt visar SECRET 02/03 och namnet, och de ligger sedan under SECRET i ljudlistan tillsammans med KRISTALL:
  - **SJÖN** (B-A-D-A, "bada"): en skogssjö i månsken över hela skärmen, räknad i realtid (ui/sjon.js). Varje ton
    släpper en droppe där man spelar; ringarna sprider sig, korsar varandra och bryter månens spegling. Himlen
    (månen, stjärnorna och granarna på andra stranden) och dess spegling räknas med samma ljusmodell. Arpen blir regn,
    och en liten droppe faller då och då även när ingen spelar. Ljudet är Bellish med mjukare filter, längre klang,
    droppande eko och MOOD:s rum.
  - **KASSETTEN** (D-E-C-A-D-E, "decade"): en kassettbandspelare renderad i Blender i lager (tools/kassett.py), med
    spolar som snurrar med bandets riktiga fart (ett fullt nav långsammare än ett tomt) medan bandet flyttas från den
    ena spolen till den andra och vänder vid slutet, VU-mätare som följer vänster och höger kanal med VU-mätarens
    tröghet, och ett räkneverk. FREEZE i MOOD stoppar bandet mjukt. Ljudet är vintagekeys genom bandet.
- Bandet: BLONDA SLITEN ur blonda-motor finns nu i BRIS kärna (parametrarna tape och ta..., media 0 = kassett).
  Av = ljudet bitexakt som förut.
- En hemlig patch sparar inställningarna den ändrar (MOOD, bandet, rummet) och sätter tillbaka dem när man lämnar
  den. Med arpen igång följer ljuset och tangenterna arpen i alla hemliga patchar.
- Gränssnittet får vänster och höger nivå var för sig (pl/pr) för VU-mätarna.

## 1.10.1

- KRISTALL med arpen igång: ljuset följer arpen. Varje ton arpen spelar skjuter en stråle, tänder glaset på sitt
  ställe och klingar av när nästa ton tar över (även samma ton två gånger i rad tänds på nytt), medan de hållna
  tangenterna lyser svagt. Stängs arpen av lyser de hållna tonerna som vanligt igen.

## 1.10.0

- Den hemliga patchen KRISTALL: tryck fem gånger på versionen uppe till höger. Då blir BRIS mörk och blomman byts
  mot en glasscen (kuber, klot, ring, pyramid, kupol och en räfflad våg i glas, och mässingskuber) som är renderad på
  riktigt i Blender/Cycles med brytning, regnbågsskimmer och reflexer i golvet (tools/kristall.py). Scenen är
  renderad en gång per ljusposition längs tangentbordet, och appen blandar renderingarna efter var man spelar
  (ljus är linjärt), så att glaset lyser upp, skimrar och speglar sig på rätt ställe (ui/kristall.js). Varje ton
  lyser lila eller bärnsten (F–A bärnsten, resten lila), med en stråle upp ur tangenten och ett mörkt tangentbord
  där de spelade tangenterna glöder. KRISTALL spelar Vintage Saw och ligger sedan överst i ljudlistan (SECRET);
  ett annat ljud lämnar den.
- Det varma ljuset ur tangenterna i det vanliga läget är borttaget (LIGHT i menyn finns inte längre). Koden finns
  kvar och används av KRISTALL.
- Rättat: på iPhone liggande krockade versionen med ARP-fliken (versionen blev längre); webbtestet kollar nu att
  logga, flikar och version aldrig överlappar i någon storlek.
- Rättat: toner som hölls från en klaviatur (MIDI) eller av arpen klingade av redan när de tändes, så att
  tangenterna bara lyste svagt. Nu lyser de fullt så länge tonen hålls.

## 1.9.0

- Ljuset (ersätter skrivmaskinen från 1.8.0): där man spelar strålar ett varmt ljus upp ur tangentbordet över
  blomman och faller ut över tangenterna runt omkring, som lampan vid anslaget i en skrivmaskin, och resten av
  skärmen skuggas en aning. Det tonar upp snabbt och klingar av långsamt (efter tid, lika på 60 och 120 Hz), för
  tangenterna, arpen och MIDI. Stängs av med LIGHT i menyn.
- Fyra nya blommor komponerade av Victorys lösa kronblad (tools/komponera.py, ark i resurser/kronblad/):
  GLADIOLUS (guld), SOLFJÄDER (smaragd), AMARYLLIS (magenta) och NATTVIOL (blå iris). VIT IRIS använder nu
  silkesblomman, så att ingen blomma längre är en kopia av en annan.

## 1.8.0

- Nytt tangentbord: en sammanhängande ljus bädd med mjuk skugga, vita tangenter med tunna skiljelinjer och tonnamn på
  C, svarta tangenter i mörk taupe med rak överkant, rundad underkant och en ljus fas. En spelad tangent får ett sken
  nerifrån och en prick.

## 1.7.2

- Multitouch: alla knappar (fotknapparna, FREEZE, flikar, val) fungerar medan andra fingrar spelar. iOS skickar
  inget klick när ett finger redan ligger på skärmen, så knapparna reagerar på sina egna pekhändelser.
  Fotknapparna slår om redan när fingret trycker ner, som på pedalen.
- Ingen textmarkering eller kopiera-meny när man håller kvar ett finger (utom i namnfältet).
- De svarta tangenterna är ljusare och har en jämn färg utan tonning.

## 1.7.1

- PLAY: reglagen till höger är CUTOFF, CHORUS och REVERB.
- AUDIO / MIDI SETTINGS i den fristående appen öppnar en egen ruta över gränssnittet (MIDI-ingångar av/på,
  Bluetooth MIDI, utgång, samplingsfrekvens, buffert) som stängs med krysset eller ett tryck utanför. Förut öppnades
  JUCE:s gråa sida, som inte gick att stänga på iPad.

## MOOD (från 1.7.0)

Sidan MOOD är effekten `mood` ur blonda-motor, gjord i Chase Bliss MOOD MKII:s anda för att bygga atmosfärer.
Den ligger sist i kedjan. Fotknapparna över blomman: **WET** och **FREEZE** (wet-kanalen), **LOOP** och **DUB**
(mikrolooper).

- WET (vänster): REVERB / DELAY / SLIP, TIME, MODIFY, TONE och CLOCK (gemensam klocka i harmoniska steg: lägre =
  längre loopar och ekon, mörkare och mer vikning).
- MICRO-LOOP (höger): ENV / TAPE / STRETCH, LENGTH, MODIFY och MIX. Loopen lyssnar alltid, så LOOP spelar upp det
  man just spelat.
- HIDDEN: FADE, WIDTH, BALANCE, DIRECT, ROUTING (IN, IN + LOOP, LOOP), SPREAD, HALF och SMOOTH.

Är både WET och LOOP av går ljudet igenom oförändrat (testat sampel för sampel). FREEZE, LOOP och DUB sparas inte i
egna ljud eftersom de gäller stunden. Ramping, Classic mode och MIDI-klocksynk från pedalen finns inte med.

## ARP och ackordpads (från 1.7.0)

- **ARP** (egen sida): UP, DOWN, UP-DOWN och RANDOM, takt 1/4 till 1/32 (följer tempot), 1–4 oktaver och GATE.
- **PADS** (knappen ovanför tangenterna): fyra ackordpads tonar fram över skärmen och blomman blir suddig bakom.
  - Tryck på en pad för att spela ackordet.
  - **REC**: tryck på REC och sedan på en pad, spela ackordet på pianot (eller en klaviatur) och tryck på paden igen.
  - **HOLD**: ackordet ligger kvar tills man trycker på samma pad igen eller byter pad.
  - **FOLLOW**: pianot rättas till skalan för det senaste ackordet. Skalan är dur, mixolydisk, lydisk, moll, dorisk,
    frygisk eller lokrisk utifrån ackordets toner. Tangenterna utanför skalan tonas ner och grundtonen får en prick.
- Med ARP på arpas padens ackord, och pianot spelar vanligt ovanpå. Utan pad arpas tangenterna.
- MIDI från en vanlig klaviatur går samma väg (FOLLOW och ARP). I BRIS MPE går MIDI direkt till motorn.

## Blommorna i lager

Varje blomma har en mask för sina främre kronblad (`ui/blommor/<foto>_fram.webp`, skriven av `tools/lager.py`).
Blomman ritas, sedan stoftet ur hjärtat (eller knopparna), sedan blomman igen genom masken: stoftet kommer inifrån
och glider in bakom de främre kronbladen. Lagren har samma pixlar och rör sig lika, så blomman ser likadan ut.
Vad som ligger fram, bak och inuti följer Victorys utsnittna kronblad för varje blomma.

## BLONDA BRIS MPE

En egen app och AUv3 bredvid BRIS (`-DBRIS_MPE=ON`), med motorn `brismpe` ur blonda-motor: samma 90 ljud och samma
blommor, men varje ton har egen böj, egen slide och eget tryck. På skärmen får varje finger sin egen slide (för
fingret uppåt på tangenten); vad slide styr väljs i SLIDE UP (FILTER, VIBRATO, TREMOLO, PWM, WAH) och sparas som
parametern Slide Target. MPE-klaviaturer (kanal 1 huvudkanal, 2–16 en ton var) spelar per ton. Utan uttryck låter
BRIS MPE exakt som BRIS. iPad först:

```sh
curl -sL https://raw.githubusercontent.com/victorysvensson-dev/blonda-bris/main/tools/ios-installera.sh | bash -s xcode mpe
```

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
`motorer/{bris,brismpe,rum,vibe,sliten}` (utan .genexpr och _presets.js) hit till `External/blonda-motor/`, skriv commit i `External/blonda-motor/VERSION`
och kör testerna.

© BLONDA. Byggt med JUCE 8.
