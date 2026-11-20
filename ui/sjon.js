// BLONDA BRIS – den hemliga patchen SJÖN: en stilla skogssjö i månsken, räknad i realtid (WebGL).
// Varje ton släpper en droppe där man spelar (vänster–höger som på tangentbordet). Ringarna sprider sig, korsar
// varandra och bryter månens spegling. Himlen (måne, stjärnor, trädlinje) och dess spegling räknas med samma
// funktion, så speglingen stämmer med krusningarna. Arpen blir regn. Ytan ritas i halv upplösning (vatten är mjukt).
// Bakom sjön: fjäll, en ås och flera rader blandskog (gran, tall, björk, lövträd), räknat en gång i en bild för natten
// och en för dagen (FS_L). Små moln driver förbi och på dagen flyger en flock fåglar förbi då och då.
// Då och då faller en stjärna (och syns i vattnet). Fem tryck på månen gör dag: månen går ner bakom skogen, himlen
// ljusnar i en gryning och solen stiger. Fem tryck på solen gör natt igen (samma väg tillbaka).
"use strict";
const Sjon = (() => {
  const MAX = 24, LH = 0.24;
  const VS = `attribute vec2 aP; varying vec2 vUv; void main() { vUv = vec2(aP.x, 1.0 - aP.y); gl_Position = vec4(aP * 2.0 - 1.0, 0.0, 1.0); }`;
  const FS = `precision highp float;
    varying vec2 vUv;                    // 0..1, y nedåt
    uniform vec2 uRes; uniform float uT, uHy, uN, uAsp, uMx, uMy, uMr;
    uniform vec3 uSol;                   // solen: x, y (skärmen), radie
    uniform float uDag, uGry, uPuls;     // dagsljus 0..1, gryningens färg 0..1, ett sken när man trycker på månen/solen
    uniform vec4 uSf;                    // stjärnfallet: start x, y (x i bildförhållandets enheter), riktning (rad), ålder (s)
    uniform vec3 uSfL;                   // stjärnfallets livslängd (s), fart (skärmhöjder per s) och storlek (1 = nära, ~0.3 = långt bort)
    uniform vec4 uD[${MAX}];             // droppe: världens x, z, starttid, styrka
    uniform vec3 uC[${MAX}];             // droppens färg (ett svagt sken i ringarna)
    uniform sampler2D uLn, uLd;          // landskapet (berg och skog) räknat en gång: natt och dag (färg, täckning)
    uniform vec4 uMoln[2];               // molnen: mitt x, y (skärmen, x i bildförhållandets enheter), bredd, frö
    uniform vec4 uFg[6];                 // fåglarna: x, y (som molnen), storlek, vingslagets fas (storlek 0 = ingen)
    const float LH = ${LH};              // landskapets band över horisonten (andel av skärmens höjd)
    const float FOV = 1.25;              // brännvidd: hur fort sjön flyr mot horisonten
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    // himlen i skärmens koordinater (x 0..1, y nedåt; horisonten vid uHy)
    vec3 himmel(vec2 s, float skarpa) {
      float upp = uHy - s.y;
      vec3 natt = mix(vec3(0.020, 0.040, 0.075), vec3(0.004, 0.008, 0.020), smoothstep(0.0, 0.45, upp));
      vec3 dag = mix(vec3(0.62, 0.77, 0.90), vec3(0.17, 0.41, 0.78), smoothstep(0.0, 0.5, upp));   // klarblå sommarhimmel
      vec3 c = mix(natt, dag, uDag);
      // gryningen: varmt vid horisonten, starkast runt solen
      vec2 ds = vec2((s.x - uSol.x) * uAsp, s.y - uSol.y); float rs = length(ds);
      c += vec3(0.95, 0.42, 0.18) * uGry * (exp(-max(upp, 0.0) * 7.0) * 0.55 + exp(-rs * 3.0) * 0.35);
      c += vec3(0.45, 0.25, 0.45) * uGry * 0.25 * smoothstep(0.1, 0.45, upp);
      // stjärnor
      vec2 g = vec2(s.x * uAsp, s.y) * 140.0, id = floor(g), f = fract(g) - 0.5;
      float st = hash(id), ljus = step(0.985, st) * smoothstep(0.08 * skarpa + 0.05, 0.0, length(f + (vec2(hash(id + 3.1), hash(id + 5.7)) - 0.5) * 0.6));
      float natten = (1.0 - uDag) * (1.0 - uDag);
      c += vec3(0.7, 0.8, 1.0) * ljus * (0.85 + 0.15 * sin(uT * (0.4 + 1.2 * st) + st * 60.0)) * smoothstep(0.0, 0.08, upp) * natten;
      // stjärnfallet: ett ljust huvud med en svans som tonar bort, tänds och slocknar under sin korta väg
      if (uSf.w >= 0.0 && uSf.w < uSfL.x) {
        vec2 dir = vec2(cos(uSf.z), sin(uSf.z)), huvud = uSf.xy + dir * uSfL.y * uSf.w;
        vec2 p = vec2(s.x * uAsp, s.y) - huvud; float bak = -dot(p, dir), sid = abs(dot(p, vec2(-dir.y, dir.x)));
        float k = uSfL.z, lang = (0.05 + 0.1 * min(1.0, uSf.w * 4.0)) * k;
        float svans = step(0.0, bak) * smoothstep(lang, 0.0, bak) + smoothstep(0.004 * k, 0.0, length(p)) * 1.5;
        float liv = sin(3.14159 * uSf.w / uSfL.x);
        c += vec3(0.85, 0.92, 1.0) * svans * smoothstep((0.0022 + bak * 0.012) * (0.4 + 0.6 * k), 0.0, sid) * liv * natten * smoothstep(0.0, 0.04, upp) * (0.5 + 0.8 * k);
      }
      // månen: skiva med mjuka fält, ring av ljus runt omkring
      vec2 d = vec2((s.x - uMx) * uAsp, s.y - uMy); float r = length(d);
      float skiva = smoothstep(uMr, uMr - 0.002 - 0.004 / skarpa, r);
      float flackar = 0.82 + 0.18 * noise(d * 90.0) - 0.1 * smoothstep(0.3, 0.8, noise(d * 40.0 + 3.0));
      c = mix(c, mix(vec3(1.0, 0.97, 0.90) * flackar * 1.02, vec3(0.85, 0.88, 0.95) * flackar * 0.9, uDag), skiva);
      c += vec3(0.55, 0.65, 0.85) * (0.10 * exp(-r * 14.0) + 0.05 * exp(-r * 4.0)) * (1.0 - uDag) * (1.0 + uPuls * 3.0 * step(uMy, uHy));
      // solen: orange nära horisonten, vit högre upp, med ett varmt sken
      float hojd = uHy - uSol.y, sv = smoothstep(uSol.z, uSol.z - 0.003 - 0.004 / skarpa, rs);
      vec3 solf = mix(vec3(1.0, 0.55, 0.22), vec3(1.0, 0.96, 0.86), smoothstep(0.0, 0.22, hojd));
      c = mix(c, solf * 1.5, sv);
      // solskenet: himlen blir varmt gul runt solen (blandas mot gult, så det blå tar slut i stället för att bli vitt),
      // närmast skivan ljust gulvitt
      vec3 gul = vec3(1.0, 0.80, 0.38);
      float syns = smoothstep(-0.06, 0.02, hojd) * (1.0 + uPuls * 2.0);
      c = mix(c, vec3(1.0, 0.84, 0.48), clamp((0.6 * exp(-rs * 8.0) + 0.22 * exp(-rs * 2.6)) * syns, 0.0, 0.85) * max(uDag, uGry));
      c += (vec3(1.0, 0.9, 0.62) * 0.45 * exp(-rs * 16.0) + gul * 0.05 * exp(-rs * 1.5)) * syns;
      // molnen: små stackmoln som driver förbi (solsidan ljusare, undersidan grå; på natten svagt månbelysta)
      vec2 px = vec2(s.x * uAsp, s.y);
      for (int i = 0; i < 2; i++) {
        vec4 M = uMoln[i]; if (M.z <= 0.0) continue;
        vec2 q = (px - M.xy) / M.z;
        if (abs(q.x) > 1.3 || abs(q.y) > 0.7) continue;
        float f = noise(q * 3.0 + M.w) * 0.6 + noise(q * 9.0 + M.w * 2.0) * 0.4;
        float form = 1.0 - length(q * vec2(0.85, 1.9 + 0.8 * step(0.0, q.y)));   // platt botten, bullig topp
        float tack = smoothstep(0.0, 0.25, form + f * 0.55 - 0.4);
        float ljus = clamp(0.55 - q.y * 0.9 + (q.x * sign(uSol.x * uAsp - M.x)) * 0.25 + f * 0.3, 0.0, 1.2);
        vec3 dagm = mix(vec3(0.62, 0.68, 0.78), vec3(1.0, 0.98, 0.95), ljus) + gul * 0.15 * ljus;
        vec3 nattm = mix(vec3(0.012, 0.018, 0.03), vec3(0.09, 0.1, 0.13), ljus) * (0.6 + 0.8 * exp(-r * 3.0));
        vec3 grym = mix(vec3(0.55, 0.32, 0.4), vec3(1.0, 0.62, 0.38), ljus);
        c = mix(c, mix(mix(nattm, dagm, uDag), grym, uGry * 0.6), tack * 0.92);
      }
      // fåglarna: små silhuetter med vingar som slår (en flock som flyger förbi då och då)
      for (int i = 0; i < 6; i++) {
        vec4 F = uFg[i]; if (F.z <= 0.0 || skarpa < 1.0) continue;   // (för små för att synas i speglingen)
        vec2 q = (px - F.xy) / F.z;
        if (abs(q.x) > 1.2 || abs(q.y) > 0.8) continue;
        float slag = sin(F.w), ax = abs(q.x);
        float linje = -slag * 0.55 * ax + 0.35 * ax * ax * (0.5 + 0.5 * slag);     // vingarna: upp och ner, böjda
        float tj = 0.09 * (1.0 - ax * ax) + 0.025;
        float vinge = step(ax, 1.0) * smoothstep(tj + 0.06 / skarpa, tj - 0.02, abs(q.y - linje));
        float kroppen = smoothstep(0.16, 0.08, length(q * vec2(1.0, 1.6)));
        c = mix(c, mix(vec3(0.004, 0.006, 0.01), vec3(0.08, 0.1, 0.12), uDag), max(vinge, kroppen) * 0.9);
      }
      // landskapet (berg och skog) skymmer allt bakom sig: ur bilden som räknades en gång (natt och dag blandas)
      if (upp >= 0.0 && upp < LH) {
        vec2 tc = vec2(s.x, upp / LH);
        vec4 L = uDag < 0.001 ? texture2D(uLn, tc) : uDag > 0.999 ? texture2D(uLd, tc) : mix(texture2D(uLn, tc), texture2D(uLd, tc), uDag);
        vec3 glod = vec3(0.02, 0.03, 0.05) * exp(-r * 6.0) * 0.4 * (1.0 - uDag);   // månskenet nära månen
        c = mix(c, L.rgb + glod + vec3(0.25, 0.1, 0.03) * uGry * 0.25, L.a);
      }
      // dis vid vattnet i gryningen och på dagen
      if (upp >= 0.0) {
        vec3 horis = mix(vec3(0.020, 0.040, 0.075), vec3(0.62, 0.77, 0.90), uDag) + vec3(0.95, 0.42, 0.18) * uGry * 0.5;
        c = mix(c, horis * 0.9, exp(-upp * 90.0) * (0.06 + 0.25 * uDag + 0.2 * uGry));
      }
      return c;
    }
    void main() {
      vec2 s = vUv;
      if (s.y < uHy) { gl_FragColor = vec4(himmel(s, 1.0), 1.0); return; }
      // strålen från ögat (1 över ytan) mot vattnet
      float u = (s.x - 0.5) * uAsp * FOV, v = (s.y - uHy) * FOV;
      v = max(v, 0.0015);
      vec2 P = vec2(u, 1.0) / v;          // världens (x, z) där strålen träffar ytan
      // lugna småvågor: några sinusvågor i olika riktningar + fint brus (bryter månens spegling i en pelare)
      vec2 gr = vec2(0.0);
      for (int i = 0; i < 5; i++) {
        float fi = float(i), a = 0.010 / (1.0 + fi * 0.6), k = 2.2 + fi * 1.9, w = 0.6 + fi * 0.35;
        vec2 dir = vec2(cos(fi * 2.17 + 0.4), sin(fi * 2.17 + 0.4));
        gr += dir * a * k * cos(dot(dir, P) * k + uT * w);
      }
      gr += (vec2(noise(P * 6.0 + uT * 0.4), noise(P * 6.0 - uT * 0.35 + 9.0)) - 0.5) * 0.02;
      gr *= 0.12 + 0.88 * smoothstep(0.0, 0.3, v);   // långt bort (nära horisonten) är ytan lugnare: skogen speglas som en mörk rand
      // dropparnas ringar: ett vågpaket som rör sig utåt och klingar av
      vec3 sken = vec3(0.0);
      for (int i = 0; i < ${MAX}; i++) {
        if (float(i) >= uN) break;
        vec4 D = uD[i]; float age = uT - D.z; if (age < 0.0 || age > 7.0) continue;
        vec2 dv = P - D.xy; float r = length(dv) + 1e-4;
        float front = 0.18 + age * 1.15, dd = r - front, w = 0.16 + age * 0.22, k = 11.0;
        float amp = D.w * exp(-age * 0.6) / (1.0 + r * 0.5);
        float g = exp(-dd * dd / (w * w)) * (dd < 0.0 ? 1.0 : exp(-dd * 6.0));
        float dh = amp * g * (k * cos(k * dd) - 2.0 * dd / (w * w) * sin(k * dd));
        gr += dv / r * dh * 0.09;
        // ringarna fångar tonens ljus (svagt), och där droppen slog ner blixtrar det till
        float topp = max(0.0, sin(k * dd));
        sken += uC[i] * amp * g * topp * topp * 1.4 + uC[i] * D.w * exp(-age * 5.0) * exp(-r * r * 14.0) * 1.1;
      }
      // skala lutningen med avståndet (långt bort ser man vågorna flackare)
      vec3 n = normalize(vec3(-gr.x, 1.0, -gr.y));
      vec3 rd = normalize(vec3(u, -v, 1.0));
      vec3 rf = reflect(rd, n);
      rf.y = max(rf.y, 0.0005);
      vec2 sr = vec2(0.5 + rf.x / rf.z / (uAsp * FOV), uHy - rf.y / rf.z / FOV);
      float fres = 0.02 + 0.98 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
      vec3 vatten = mix(vec3(0.004, 0.010, 0.020), vec3(0.05, 0.12, 0.15), uDag);
      vec3 c = vatten + himmel(sr, 0.6) * mix(mix(0.35, 0.5, uDag), 1.0, fres) + sken;
      c *= 1.0 - 0.35 * smoothstep(0.55, 1.0, s.y);   // mörkare närmast tangentbordet
      gl_FragColor = vec4(c, 1.0);
    }`;

  // Landskapet på andra sidan sjön, räknat en gång (när storleken ändras) i en bild för natten och en för dagen:
  // fjäll längst bort (snö på topparna), en disig ås, och flera rader skog som följer kullar. Träden är olika:
  // granar (grenvåningar med ojämna, hängande grenar och en smal topp), tallar (rak stam, platt oregelbunden krona),
  // björkar (vit stam, luftig krona) och lövträd (rundade kronor). Ljuset (solen/månen) kommer från sidan.
  // Bilden: x = skärmens x, y = höjd över horisonten (0..LH); färg och täckning.
  const FS_L = `precision highp float;
    uniform vec2 uRes; uniform float uAsp, uDag, uSida;
    const float LH = ${LH};
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }
    // träden ritas i trädets egna mått: X = sidled och Y = höjd, båda i trädhöjder (0 = foten, 1 = toppen)
    // Ger täckning, sida (-1..1, för ljuset från sidan), stam (0/1) och kronans höjd (för toppljuset).
    struct Trad { float t, sd, stam, y; };
    float klump(vec2 p, vec2 m, vec2 r) { return length((p - m) / r) - 1.0; }   // ellips: < 0 inuti
    Trad gran(float X, float Y, float r, float c, float seed, float aa) {
      Trad o; o.y = Y; o.stam = 0.0;
      X -= Y * Y * (r - 0.5) * 0.03;                                   // lite lutning
      float nv = 6.0 + 5.0 * r, v = Y * nv + r * 3.0, vaning = fract(v);
      float spets = pow(1.0 - vaning, 1.5);                            // grenarna hänger: bredast längst ner i varje våning
      float ojamn = 0.6 + 0.6 * noise(vec2(floor(v) * 3.1 + c, seed + sign(X) * 5.0)) + 0.3 * noise(vec2(Y * 70.0 + c, X * 40.0));
      float halv = pow(1.0 - Y, 0.95) * 0.17 * (0.45 + 0.7 * spets * ojamn) * (0.85 + 0.35 * r) + 0.004;
      halv = max(halv, 0.012 * step(Y, 0.08));                         // stammen vid foten
      o.t = smoothstep(halv + aa, halv - aa, abs(X)); o.sd = X / max(halv, 0.03);
      return o;
    }
    Trad tall(float X, float Y, float r, float c, float seed, float aa) {
      Trad o; o.y = Y;
      float bo = (r - 0.5) * 0.08 * Y * Y + 0.02 * sin(Y * 7.0 + c);   // stammen slingrar lite
      float stam = smoothstep(0.014 + aa, 0.014 - aa, abs(X - bo)) * step(Y, 0.9);
      // kronan: platta, oregelbundna klumpar högst upp (och ibland en gren lägre ner)
      vec2 p = vec2(X - bo, Y);
      float h1 = hash(vec2(c, seed + 41.0)), h2 = hash(vec2(c, seed + 43.0));
      float k = klump(p, vec2(0.02 * (h1 - 0.5), 0.9), vec2(0.1 + 0.04 * h1, 0.08));
      k = min(k, klump(p, vec2(-0.09 + 0.04 * h2, 0.8), vec2(0.09, 0.05)));
      k = min(k, klump(p, vec2(0.08 - 0.03 * h1, 0.74 - 0.04 * h2), vec2(0.08, 0.045)));
      k = min(k, klump(p, vec2(-0.03, 0.68 - 0.05 * h1), vec2(0.06, 0.04)));
      if (h2 > 0.45) k = min(k, klump(p, vec2(0.09 * sign(h1 - 0.5), 0.58), vec2(0.06, 0.03)));
      k += (noise(p * 60.0 + c) - 0.5) * 0.5;
      float krona = smoothstep(aa * 4.0, -aa * 4.0, k * 0.08);
      o.t = max(stam, krona); o.stam = stam * (1.0 - krona); o.sd = clamp(p.x / 0.2, -1.0, 1.0);
      return o;
    }
    Trad bjork(float X, float Y, float r, float c, float seed, float aa) {
      Trad o; o.y = Y;
      float bo = (r - 0.5) * 0.1 * Y * Y;
      float stam = smoothstep(0.012 + aa, 0.012 - aa, abs(X - bo)) * step(Y, 0.92);
      vec2 p = vec2(X - bo, Y);
      float k = klump(p, vec2(0.0, 0.66), vec2(0.15 + 0.04 * r, 0.33));
      k = min(k, klump(p, vec2(0.06 * sign(r - 0.5), 0.5), vec2(0.1, 0.16)));
      float luft = noise(p * 45.0 + c * 7.0) * 0.7 + noise(p * 120.0 + c) * 0.3;   // luftig: hål och fransar
      k += (luft - 0.42) * 0.9;
      float krona = smoothstep(aa * 4.0, -aa * 4.0, k * 0.1);
      o.t = max(stam, krona); o.stam = stam * (1.0 - krona); o.sd = clamp(p.x / 0.18, -1.0, 1.0);
      return o;
    }
    Trad lov(float X, float Y, float r, float c, float seed, float aa) {
      Trad o; o.y = Y;
      float stam = smoothstep(0.016 + aa, 0.016 - aa, abs(X)) * step(Y, 0.4);
      vec2 p = vec2(X, Y);
      float h1 = hash(vec2(c, seed + 51.0)), h2 = hash(vec2(c, seed + 53.0));
      float k = klump(p, vec2(0.0, 0.66), vec2(0.2, 0.25));
      k = min(k, klump(p, vec2(-0.15, 0.5 + 0.1 * h1), vec2(0.14, 0.15)));
      k = min(k, klump(p, vec2(0.15, 0.48 + 0.1 * h2), vec2(0.14, 0.14)));
      k = min(k, klump(p, vec2(0.05 * (h1 - h2), 0.85), vec2(0.13, 0.14)));
      k += (noise(p * 40.0 + c) - 0.5) * 0.35 + (noise(p * 110.0 + c) - 0.5) * 0.15;
      float krona = smoothstep(aa * 4.0, -aa * 4.0, k * 0.1);
      o.t = max(stam, krona); o.stam = stam * (1.0 - krona); o.sd = clamp(p.x / 0.3, -1.0, 1.0);
      return o;
    }
    // en rad skog: ovanpå en tät krontäckning som följer kullarna står träd av olika slag (andel tall, björk och
    // lövträd; resten gran), olika höga och med luckor, i två förskjutna led. Grannarnas kronor räknas med så att
    // breda träd inte klipps. Ger färgen och täckningen (rgb, a).
    vec4 rad(float x, float upp, float w, float hmax, float seed, float tk, float kf, float glest, float pTall, float pBjork, float pLov, vec3 bas, vec3 sol, float dis, vec3 horis) {
      float kulle = noise(vec2(x * 1.2 + seed, seed * 0.37)) * 0.6 + noise(vec2(x * 4.0, seed + 1.0)) * 0.3 + noise(vec2(x * 11.0, seed + 2.0)) * 0.1;
      upp -= hmax * kf * kulle * kulle;
      vec3 col = vec3(0.0); float tack = 0.0;
      if (upp < 0.0) return vec4(mix(bas * 0.8, horis, dis), 1.0);
      float tak = hmax * tk * (0.7 + 0.5 * noise(vec2(x / w * 0.5, seed)) + 0.25 * noise(vec2(x / w * 2.0, seed + 4.0)));
      float ktack = smoothstep(tak + 0.0012, tak - 0.0012, upp);
      if (ktack > 0.0) { col = bas * (0.72 + 0.3 * noise(vec2(x * 700.0, upp * 900.0))) + sol * 0.12 * (upp / max(tak, 1e-4)); tack = ktack; }
      float pix = LH / uRes.y;
      for (int k = 0; k < 2; k++) {
        float ww = w * (1.0 + float(k) * 0.15), xs = x + float(k) * 0.5 * ww, c0 = floor(xs / ww);
        for (int j = -2; j <= 2; j++) {
          float c = c0 + float(j), sk = seed + float(k) * 31.0;
          float r = hash(vec2(c, sk));
          if (hash(vec2(c, sk + 9.0)) < glest + 0.15 * float(k)) continue;
          float cx = (c + 0.5 + (hash(vec2(c, sk + 2.0)) - 0.5) * 0.7) * ww;
          float typ = hash(vec2(c, sk + 13.0));
          float th = hmax * (0.45 + 0.55 * r) * (hash(vec2(c, sk + 5.0)) < 0.07 ? 1.3 : 1.0) * (1.0 - 0.12 * float(k));
          if (typ < pTall) th *= 1.1;
          float X = (xs - cx) / th, Y = upp / th;
          if (Y > 1.0 || abs(X) > 0.42) continue;
          float aa = pix * 0.9 / th;
          Trad t; vec3 tf;
          if (typ < pTall) { t = tall(X, Y, r, c, sk, aa); tf = bas * vec3(1.0, 1.05, 1.0); }
          else if (typ < pTall + pBjork) { t = bjork(X, Y, r, c, sk, aa); tf = bas * vec3(1.6, 1.6, 0.8) + vec3(0.04, 0.05, 0.0) * uDag; }
          else if (typ < pTall + pBjork + pLov) { t = lov(X, Y, r, c, sk, aa); tf = bas * vec3(1.35, 1.45, 0.85); }
          else { t = gran(X, Y, r, c, sk, aa); tf = bas * vec3(0.85, 0.95, 1.0); }
          if (t.t <= 0.0) continue;
          float barr = 0.8 + 0.4 * noise(vec2(xs * 1200.0, upp * 1600.0));
          float ljus = 0.75 + 0.5 * clamp(t.sd * uSida, -1.0, 1.0);
          vec3 tc = tf * barr * ljus + sol * t.y * t.y * (0.4 + 0.6 * clamp(t.sd * uSida, 0.0, 1.0));
          // stammen: mörk, tallens rödbrun, björkens vit med svarta fläckar (på natten bara mörk)
          float bj = step(pTall, typ) * step(typ, pTall + pBjork), ta = step(typ, pTall);
          vec3 stamf = mix(vec3(0.05, 0.04, 0.03), vec3(0.42, 0.24, 0.14), ta);
          stamf = mix(stamf, vec3(0.78, 0.78, 0.74) * (noise(vec2(c * 9.0, upp / th * 40.0)) < 0.3 ? 0.15 : 1.0), bj);
          tc = mix(tc, mix(bas * 0.5, stamf * (0.75 + 0.35 * clamp(-X * 40.0 * uSida, -1.0, 1.0)), uDag), t.stam);
          col = mix(col, tc, t.t); tack = max(tack, t.t);
        }
      }
      return vec4(mix(col, horis, dis), tack);
    }
    // fjällen längst bort: en stor topp till vänster och en lägre till höger, kantiga åsar (veckat brus), snö där det
    // är högt (ojämn gräns och fåror), bergsidorna ljusa och skuggiga från sidan, blåa av diset
    float vass(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * (1.0 - abs(noise(p) * 2.0 - 1.0)); p *= 2.1; a *= 0.5; } return v; }
    float bergh(float sx, float x) {
      float bw = clamp(1.6 / uAsp, 1.0, 2.4), bh = mix(0.7, 1.0, clamp(uAsp, 0.0, 1.0));   // på en smal skärm: bredare och lägre toppar
      float form = bh * (0.1 * exp(-pow((sx - 0.22) / (0.15 * bw), 2.0)) + 0.065 * exp(-pow((sx - 0.83) / (0.11 * bw), 2.0)) + 0.025 * exp(-pow((sx - 0.55) / 0.25, 2.0)));
      return 0.03 + form * (0.6 + 0.45 * vass(vec2(x * 6.0, 2.3)) + 0.35 * vass(vec2(x * 22.0, 7.1))) + 0.008 * vass(vec2(x * 40.0, 5.0));
    }
    vec4 berg(float sx, float x, float upp, vec3 horis) {   // sx = skärmens x 0..1 (topparnas läge), x = som träden
      float h = bergh(sx, x);
      float tack = smoothstep(h + 0.0012, h - 0.0012, upp);
      if (tack <= 0.0) return vec4(0.0);
      // lutningen (åt vilket håll sidan vetter) ger ljus och skugga; fåror och åsar nedför sidorna
      // fårorna går snett nedför: åt vänster på vänstra sidan av en topp, åt höger på den högra (ur den stora formen)
      float bw = clamp(1.6 / uAsp, 1.0, 2.4), w1 = 0.15 * bw, w2 = 0.11 * bw;
      float dF = (-2.0 * (sx - 0.22) / (w1 * w1) * 0.1 * exp(-pow((sx - 0.22) / w1, 2.0)) - 2.0 * (sx - 0.83) / (w2 * w2) * 0.065 * exp(-pow((sx - 0.83) / w2, 2.0))) * bw;
      float riktn = clamp(dF * 1.5, -1.0, 1.0);
      float faror = vass(vec2(x * 45.0 + upp * 70.0 * riktn, upp * 28.0 - x * 8.0 * riktn));
      // ljus och skugga: sidan som vetter mot ljuset (stora formen) och åsarna mellan fårorna (ändras också på höjden)
      float as2 = vass(vec2(x * 18.0 + upp * 40.0 * riktn, upp * 10.0));
      float ljus = clamp(0.5 - riktn * 0.35 * uSida + (as2 - 0.55) * 0.8 * uSida * sign(riktn + 0.001) + (faror - 0.55) * 0.5, 0.0, 1.0);
      // snön: över en ojämn gräns, och bara i fårorna en bit nedanför; åsarna (branta) blir fläckvis bara
      float grans = 0.092 + 0.012 * noise(vec2(x * 30.0, 1.0)) - (faror - 0.5) * 0.035;
      float sno = smoothstep(0.0, 0.004, upp - grans) * smoothstep(0.25, 0.4, faror + (upp - grans) * 8.0);
      vec3 sten = mix(vec3(0.012, 0.018, 0.032), vec3(0.24, 0.31, 0.42), uDag) * (0.6 + 0.7 * ljus);
      vec3 snof = mix(vec3(0.10, 0.12, 0.17), vec3(0.95, 0.97, 1.0), uDag) * (0.6 + 0.5 * ljus);
      vec3 col = mix(sten, snof, sno);
      return vec4(mix(col, horis, 0.42 - 0.12 * uDag + 0.3 * (1.0 - upp / max(h, 1e-4)) * uDag), tack);
    }
    void main() {
      float sx = gl_FragCoord.x / uRes.x, x = sx * uAsp * 0.5, upp = gl_FragCoord.y / uRes.y * LH;
      vec3 horis = mix(vec3(0.020, 0.040, 0.075), vec3(0.62, 0.77, 0.90), uDag);
      vec3 bak = mix(vec3(0.012, 0.02, 0.032), vec3(0.34, 0.50, 0.47), uDag);
      vec3 mitt = mix(vec3(0.006, 0.011, 0.018), vec3(0.13, 0.31, 0.14), uDag);
      vec3 fram = mix(vec3(0.003, 0.006, 0.010), vec3(0.06, 0.18, 0.07), uDag);
      vec3 sol = vec3(0.33, 0.36, 0.10) * uDag;
      vec3 C = vec3(0.0); float A = 0.0;
      vec4 l;
      #define LAGG(l) C = C * (1.0 - l.a) + l.rgb * l.a; A = A * (1.0 - l.a) + l.a;
      l = berg(sx, x, upp, horis); LAGG(l)
      float k0 = 0.012 + 0.02 * noise(vec2(x * 1.6, 8.0)) + 0.005 * noise(vec2(x * 30.0, 2.0));     // åsen
      l = vec4(mix(bak, horis, 0.55) * (0.9 + 0.2 * noise(vec2(x * 220.0, upp * 300.0))), smoothstep(k0 + 0.001, k0 - 0.001, upp)); LAGG(l)
      l = rad(x + 3.7, upp, 0.0045, 0.03, 11.0, 0.35, 1.4, 0.1, 0.15, 0.05, 0.1, bak, sol * 0.3, 0.4, horis); LAGG(l)
      l = rad(x + 2.1, upp, 0.0065, 0.045, 13.0, 0.3, 1.2, 0.15, 0.2, 0.1, 0.12, bak, sol * 0.4, 0.2, horis); LAGG(l)
      l = rad(x + 1.3, upp, 0.011, 0.06, 7.0, 0.25, 0.8, 0.3, 0.22, 0.14, 0.18, mitt, sol * 0.5, 0.0, horis); LAGG(l)
      float a = 0.004 + 0.016 * pow(noise(vec2(x * 2.2, 1.7)), 2.0) + 0.004 * noise(vec2(x * 9.0, 3.1));   // strandens mark (udde och vik)
      l = vec4(fram * (0.85 + 0.3 * noise(vec2(x * 400.0, 3.0))), smoothstep(a + 0.0012, a - 0.0012, upp)); LAGG(l)
      l = rad(x, upp - a * 0.6, 0.02, 0.085, 3.0, 0.08, 0.25, 0.42, 0.25, 0.2, 0.12, fram, sol * 0.6, 0.0, horis); LAGG(l)
      gl_FragColor = vec4(A > 0.001 ? C / A : vec3(0.0), A);
    }`;

  function create(parent) {
    const cv = document.createElement("canvas"); cv.id = "sjon";
    parent.prepend(cv);   // först i body: appen ritas ovanpå
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
    let prog = null, u = {}, buf = null, aktiv = false, t0 = performance.now(), nasta = 0, lugn = 0;
    let progL = null; const uL = {}, land = []; let landSig = "";   // landskapet (natt, dag) och storleken det räknades för
    // molnen (två små, driver sakta åt höger och kommer tillbaka från vänster) och fåglarna (en flock då och då)
    const moln = [{ x: 0.3, y: 0.12, b: 0.07, s: 3.1, v: 0.004 }, { x: 1.1, y: 0.2, b: 0.045, s: 7.7, v: 0.0028 }];
    const MOLN = new Float32Array(8), FG = new Float32Array(24);
    let flock = null, flockNasta = 25 + Math.random() * 30;
    // dag och natt: p går 0 (natt) -> 1 (dag) på DYGN sekunder när man har gjort dag (och tillbaka för natt)
    const DYGN = 14;
    let p = 0, mal = 0, tFor = 0, puls = 0, p0 = 0, tStart = 0;   // p räknas ur klockan (inte bildrutorna), så att det tar lika lång tid överallt
    const sf = { x: 0, y: 0, v: 0, t0: -99, liv: 1, fart: 1, k: 1 }; let sfNasta = 15 + Math.random() * 20;
    const D = new Float32Array(MAX * 4), C = new Float32Array(MAX * 3); let n = 0, pos = 0;
    if (gl) {
      try {
        const sh = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        for (const k of ["uRes", "uT", "uHy", "uN", "uAsp", "uMx", "uMy", "uMr", "uD", "uC", "uSol", "uDag", "uGry", "uPuls", "uSf", "uSfL", "uLn", "uLd", "uMoln", "uFg"]) u[k] = gl.getUniformLocation(prog, k);
        // landskapet: ett eget program som ritar i två bilder (natt, dag) när storleken ändras
        progL = gl.createProgram(); gl.attachShader(progL, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(progL, sh(gl.FRAGMENT_SHADER, FS_L)); gl.linkProgram(progL);
        if (!gl.getProgramParameter(progL, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(progL));
        for (const k of ["uRes", "uAsp", "uDag", "uSida"]) uL[k] = gl.getUniformLocation(progL, k);
        uL.aP = gl.getAttribLocation(progL, "aP");
        for (let i = 0; i < 2; i++) {
          const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          const f = gl.createFramebuffer(); land.push({ t, f });
        }
        u.aP = gl.getAttribLocation(prog, "aP");
        buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      } catch (e) { console.warn("sjön:", e.message); prog = null; }
    }
    const nu = () => (performance.now() - t0) / 1000;
    // horisonten och månen följer skärmens form (i liggande läge lägre horisont, i stående högre)
    const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
    function lage() {
      const W = innerWidth, H = innerHeight, asp = W / H, ligg = asp > 1.2;
      const hy = ligg ? 0.40 : 0.36, hog = ligg ? 0.17 : 0.12, mr = ligg ? 0.032 : 0.024;
      // månen går ner till vänster bakom skogen (första 45 %), solen stiger till höger (sista 55 %)
      const pm = ease(p / 0.45), ps = ease((p - 0.45) / 0.55);
      return { asp, hy, mx: 0.5 - 0.1 * pm, my: hy - hog + (hog + mr * 2.2) * pm, mr,
        sx: 0.6, sy: hy + mr * 2.6 - (hog + 0.05 + mr * 2.6) * ps, sr: mr * 1.1,
        dag: ease((p - 0.3) / 0.65), gry: Math.sin(Math.PI * Math.min(1, Math.max(0, (p - 0.25) / 0.65))) };
    }
    function droppe(f, z, styrka, farg) {
      const L = lage(), FOV = 1.25;
      const x = (f - 0.5) * L.asp * FOV * z;   // samma kamera som i ytan: skärmens x vid avståndet z
      D.set([x, z, nu(), styrka], pos * 4); C.set(farg, pos * 3);
      pos = (pos + 1) % MAX; n = Math.min(MAX, n + 1);
    }
    // landskapet i två bilder (natt: ljuset från månen till vänster, dag: från solen till höger), i ungefär dubbla
    // ytans upplösning (det är skarpt, vattnet mjukt); räknas bara om när storleken eller formen ändras
    function ritaLand(w, h, L) {
      const tw = Math.min(2048, Math.round(w * 1.6)), th = Math.max(8, Math.round(h * LH * 1.6)), sig = tw + "x" + th + ":" + L.asp.toFixed(3);
      if (sig === landSig) return;
      landSig = sig;
      gl.useProgram(progL);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(uL.aP); gl.vertexAttribPointer(uL.aP, 2, gl.FLOAT, false, 0, 0);
      land.forEach((b, i) => {
        gl.bindTexture(gl.TEXTURE_2D, b.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, b.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, b.t, 0);
        gl.viewport(0, 0, tw, th);
        gl.uniform2f(uL.uRes, tw, th); gl.uniform1f(uL.uAsp, L.asp); gl.uniform1f(uL.uDag, i); gl.uniform1f(uL.uSida, i ? 1 : -1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    function rita() {
      const dpr = Math.min(2, window.devicePixelRatio || 1) * 0.5;
      const w = Math.max(2, Math.round(cv.clientWidth * dpr)), h = Math.max(2, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      if (!gl || !prog) return;
      const L = lage();
      ritaLand(w, h, L);
      moln.forEach((m, i) => MOLN.set([m.x * L.asp, m.y, m.b, m.s], i * 4));
      FG.fill(0);
      if (flock) flock.f.forEach((f, i) => FG.set([f.x * L.asp, f.y, f.st, f.fas], i * 4));
      gl.viewport(0, 0, w, h); gl.useProgram(prog);
      gl.uniform2f(u.uRes, w, h); gl.uniform1f(u.uT, nu()); gl.uniform1f(u.uHy, L.hy); gl.uniform1f(u.uAsp, L.asp);
      gl.uniform1f(u.uMx, L.mx); gl.uniform1f(u.uMy, L.my); gl.uniform1f(u.uMr, L.mr);
      gl.uniform1f(u.uN, n); gl.uniform4fv(u.uD, D); gl.uniform3fv(u.uC, C);
      gl.uniform3f(u.uSol, L.sx, L.sy, L.sr); gl.uniform1f(u.uDag, L.dag); gl.uniform1f(u.uGry, L.gry); gl.uniform1f(u.uPuls, puls);
      gl.uniform4f(u.uSf, sf.x, sf.y, sf.v, nu() - sf.t0); gl.uniform3f(u.uSfL, sf.liv, sf.fart, sf.k);
      gl.uniform4fv(u.uMoln, MOLN); gl.uniform4fv(u.uFg, FG);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, land[0].t); gl.uniform1i(u.uLn, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, land[1].t); gl.uniform1i(u.uLd, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(u.aP); gl.vertexAttribPointer(u.aP, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // ett stjärnfall: startar högt upp på en slumpad plats och faller snett nedåt åt vänster eller höger
    // långt = långt bort: ett litet, kort och svagt stjärnfall, lägre ner mot skogen
    function stjarnfall(langt = false) {
      const L = lage(), hoger = Math.random() < 0.5;
      sf.k = langt ? 0.22 + Math.random() * 0.15 : 1;
      sf.x = (0.15 + Math.random() * 0.7) * L.asp;
      sf.y = langt ? L.hy * (0.45 + Math.random() * 0.35) : 0.04 + Math.random() * (L.hy * 0.45);
      const vinkel = (0.35 + Math.random() * 0.4); sf.v = hoger ? vinkel : Math.PI - vinkel;
      sf.liv = (0.7 + Math.random() * 0.5) * (langt ? 0.6 : 1); sf.fart = (0.45 + Math.random() * 0.25) * (langt ? 0.3 : 1); sf.t0 = nu();
    }
    return {
      visa(pa) { aktiv = !!pa; cv.style.display = aktiv ? "block" : "none"; tFor = 0; },
      // träffar ett tryck på skärmen månen (på natten) eller solen (på dagen)? Lite generöst runt om.
      traff(x, y) {
        const L = lage(), sx = x / innerWidth, sy = y / innerHeight;
        const kropp = p < 0.5 ? [L.mx, L.my, L.mr] : [L.sx, L.sy, L.sr];
        if (kropp[1] > L.hy) return null;
        return Math.hypot((sx - kropp[0]) * L.asp, sy - kropp[1]) < kropp[2] * 2.4 ? (p < 0.5 ? "mane" : "sol") : null;
      },
      puls() { puls = 1; },
      // gör dag (true) eller natt (false); direkt = utan att vänta på solen
      dag(pa, direkt) { mal = pa ? 1 : 0; p0 = direkt ? mal : p; p = p0; tStart = nu(); },
      arDag() { return mal === 1; },
      stjarnfall,
      faglar() { flockNasta = 0; flock = null; },   // tester: en flock nu
      // var månen/solen är på skärmen (bildpunkter), för tester
      plats() { const L = lage(), k = p < 0.5 ? [L.mx, L.my] : [L.sx, L.sy]; return [k[0] * innerWidth, k[1] * innerHeight]; },
      lage() { const L = lage(); return { p, mal, dag: L.dag, my: L.my, sy: L.sy, hy: L.hy, sf: nu() - sf.t0 < sf.liv }; },
      // en ton: en droppe där tonen ligger (f 0..1 över tangentbordet), en bit ut i sjön, i tonens färg
      anslag(nt, f, farg) {
        const z = 2.6 + Math.random() * 3.6;
        const c = farg.map((v) => v / 255);
        droppe(f, z, 1.0, c);
      },
      tick(S) {
        if (!aktiv) return;
        // sjön lever även när ingen spelar: en liten droppe då och då, långt ut
        const t = nu(), dt = Math.min(0.1, Math.max(0, t - (tFor || t))); tFor = t;
        if (p !== mal) p = mal > p0 ? Math.min(mal, p0 + (t - tStart) / DYGN) : Math.max(mal, p0 - (t - tStart) / DYGN);
        puls = Math.max(0, puls - dt * 2.5);
        if (t > sfNasta) { if (p < 0.3) stjarnfall(Math.random() < 0.4); sfNasta = t + 25 + Math.random() * 35; }   // ungefär en gång i minuten
        // molnen driver; en flock fåglar flyger förbi då och då (en till sex, i ett löst V, vingarna slår var för sig)
        const L0 = lage();
        for (const m of moln) { m.x += m.v * dt; if (m.x > 1.25) { m.x = -0.25; m.y = 0.08 + Math.random() * (L0.hy * 0.45); m.s = Math.random() * 50; } }
        if (!flock && t > flockNasta && (L0.dag > 0.3 || L0.gry > 0.2 || flockNasta === 0)) {   // fåglar flyger på dagen och i gryningen
          const hoger = Math.random() < 0.5, n_ = 1 + Math.floor(Math.random() * 6), y0 = 0.07 + Math.random() * (L0.hy * 0.55), st = 0.011 + Math.random() * 0.006;
          flock = { dir: hoger ? 1 : -1, f: Array.from({ length: n_ }, (_, i) => ({ x: (hoger ? -0.05 : 1.05) - (hoger ? 1 : -1) * (Math.ceil(i / 2) * 0.035),
            y: y0 + Math.ceil(i / 2) * 0.012 * (i % 2 ? 1 : -1) * 0.8 + Math.ceil(i / 2) * 0.01, st: st * (0.85 + Math.random() * 0.3), fas: Math.random() * 6.28, takt: 7 + Math.random() * 3 })) };
        }
        if (flock) {
          let kvar = false;
          for (const f of flock.f) { f.x += flock.dir * 0.045 * dt; f.y += Math.sin(t * 0.7 + f.takt) * 0.002 * dt; f.fas += f.takt * dt; if (f.x > -0.1 && f.x < 1.1) kvar = true; }
          if (!kvar) { flock = null; flockNasta = t + 40 + Math.random() * 60; }
        }
        if (t > lugn) { if (lugn > 0) droppe(0.2 + Math.random() * 0.6, 7 + Math.random() * 5, 0.35, [0.4, 0.6, 0.9]); lugn = t + 3 + Math.random() * 5; }
        document.documentElement.classList.toggle("sjon-dag", lage().dag > 0.5);   // mörkare textskugga mot dagens ljusa himmel
        rita();
      },
      // tester: ritar nu och mäter medelljuset (0..255) i ett band runt horisonten och i vattnet
      matt() {
        rita(); if (!gl || !prog) return null;
        const w = cv.width, h = cv.height, px = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let vatten = 0, nv = 0;
        const L = lage();
        for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
          const i = (y * w + x) * 4, sy = 1 - y / h;   // readPixels börjar nerifrån
          if (sy > L.hy + 0.02) { vatten += (px[i] + px[i + 1] + px[i + 2]) / 3; nv++; }
        }
        let himmel = 0, nh = 0;
        for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
          const i = (y * w + x) * 4, sy = 1 - y / h;
          if (sy < L.hy - 0.08) { himmel += (px[i] + px[i + 1] + px[i + 2]) / 3; nh++; }
        }
        return { vatten: vatten / Math.max(1, nv), himmel: himmel / Math.max(1, nh), droppar: n };
      },
      klar() { return !!(gl && prog); },
      webgl: !!(gl && prog),
    };
  }
  return { create };
})();
