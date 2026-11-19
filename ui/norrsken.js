// BLONDA BRIS – den hemliga patchen NORRSKEN: norrsken över snöiga fjäll och en stilla sjö, räknat i realtid (WebGL).
// Norrskenet är tre lager av slöjor (grönt nertill, lila upptill) med strålar som vandrar långsamt. Varje ton får
// slöjan att flamma upp där man spelar (vänster–höger som på tangentbordet) och en våg att gå genom den; fjällens snö
// lyses upp av norrskenet, och sjön speglar alltihop. Arpen blir pulser i slöjan. Ritas i halv upplösning.
"use strict";
const Norrsken = (() => {
  const MAX = 16;
  const VS = `attribute vec2 aP; varying vec2 vUv; void main() { vUv = vec2(aP.x, 1.0 - aP.y); gl_Position = vec4(aP * 2.0 - 1.0, 0.0, 1.0); }`;
  // två varianter av bilden: med späckhuggarna (bara medan de syns) och utan, så att sjön är billig resten av tiden
  const FS = `precision highp float;
    varying vec2 vUv;                    // 0..1, y nedåt
    uniform float uT, uHy, uAsp, uN;
    uniform vec4 uP[${MAX}];             // puls: x (0..1), starttid, styrka, -
    uniform vec3 uC[${MAX}];             // pulsens färg
    uniform sampler2D uFj;               // fjällen (tools/norrsken_bilder.py)
    uniform vec4 uFjM;
    uniform vec2 uFjG;                   // hur starkt bas- och skenpasset lyser
    uniform float uFjH;                  // remsans höjd på skärmen (andel av höjden)
    uniform vec4 uSp;                    // späckhuggarna (se spack)
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
    // pulserna från tonerna: hur mycket slöjan flammar upp vid x (och i vilken färg)
    vec4 pulser(float x) {
      float b = 0.0; vec3 c = vec3(0.0);
      for (int i = 0; i < ${MAX}; i++) {
        if (float(i) >= uN) break;
        vec4 P = uP[i]; float age = uT - P.y; if (age < 0.0 || age > 6.0) continue;
        float dx = (x - P.x) * uAsp, g = exp(-dx * dx * 9.0) * P.z;
        float k = exp(-age * 0.9) * (1.0 - exp(-age * 14.0));
        b += g * k; c += uC[i] * g * k;
      }
      return vec4(c, b);
    }
    float vag(float x) {
      float v = 0.0;
      for (int i = 0; i < ${MAX}; i++) {
        if (float(i) >= uN) break;
        vec4 P = uP[i]; float age = uT - P.y; if (age < 0.0 || age > 6.0) continue;
        float dx = (x - P.x) * uAsp;
        v += 0.012 * sin(dx * 30.0 - age * 7.0) * exp(-abs(dx) * 2.5) * exp(-age * 1.1) * P.z;
      }
      return v;
    }
    // norrskenet vid skärmpunkten s (x 0..1, y nedåt): tre slöjor, längst bort svagast och högst upp
    vec3 norrsken(vec2 s, vec4 pu, float vg) {
      vec3 c = vec3(0.0); float x = s.x * uAsp, t = uT;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        // slöjornas nederkanter slingrar sig var för sig och korsar varandra (inga parallella band)
        float yb = uHy - 0.24 - 0.06 * fi + (0.07 + 0.02 * fi) * sin(x * (0.7 + 0.45 * fi) + t * (0.04 + 0.015 * fi) + fi * 2.7)
                   + 0.05 * (noise(vec2(x * (1.2 + 0.5 * fi) + t * 0.03, fi * 5.0)) - 0.5) + vg;
        float d = yb - s.y;                                         // över slöjans nederkant: > 0
        float upp = d > 0.0 ? exp(-d * (4.5 + 2.0 * fi)) : exp(d * 45.0);
        float stralar = 0.45 + 0.55 * pow(noise(vec2(x * 38.0 + t * 0.25 + fi * 13.0, fi * 3.0 + t * 0.05)), 2.0);
        float veck = 0.35 + 0.65 * smoothstep(0.15, 0.85, noise(vec2(x * 1.4 - t * 0.07 + fi * 7.0, 2.0 + fi)));
        // som förut för en ton i taget, men många toner samtidigt mättas (taket är ungefär 80 % av det gamla maxet)
        float b = upp * stralar * veck * (0.85 - 0.22 * fi) * (1.0 + 5.0 * (1.0 - exp(-pu.w * 0.45)));
        vec3 gron = vec3(0.12, 0.95, 0.48), lila = vec3(0.55, 0.22, 0.85);
        vec3 f = mix(gron, lila, smoothstep(0.02, 0.2, d)) + pu.rgb / max(pu.w, 0.001) * min(pu.w, 1.0) * 0.35 * exp(-max(d, 0.0) * 6.0);
        c += f * b * 0.55;
      }
      return c;
    }
    // fjällen: renderade i Blender (tools/norrsken_fjall.py) i två pass, ett med himlens svaga ljus och ett med vitt
    // ljus uppifrån som färgas med norrskenets färg. ty 0 vid stranden .. 1 överst i remsan; ger färg och täckning.
    // uFjM: kb, ks (passens skalning), remsans bredd/höjd, remsans höjd i bilden (andel av hela höjden)
    // Bilden läses i varje pixel (aldrig inne i en gren som bara vissa pixlar går in i): annars räknar grafikkortet
    // fel upplösningsnivå i remsans kant, och det blir ett mörkt streck över skärmen där.
    vec4 fjall(float x, float upp, vec3 sken) {
      float ty = upp / uFjH, inne = step(-0.01, ty) * step(ty, 1.0), tc = clamp(ty, 0.0, 1.0);
      float tx = 0.5 + (x - uAsp * 0.5) / (uFjH * uFjM.z), m = 0.6 / 512.0;
      vec4 b = texture2D(uFj, vec2(tx, min(0.5 - m, 0.5 - tc * uFjM.w)));
      vec4 k = texture2D(uFj, vec2(tx, max(0.5 + m, 0.5 + tc * uFjM.w)));
      vec3 ljus = mix(vec3(dot(sken, vec3(0.3, 0.5, 0.2))), sken, 0.55);   // snön är vit: bara en ton av norrskenets färg
      vec3 lin = pow(b.rgb, vec3(2.2)) / uFjM.x * uFjG.x + pow(k.rgb, vec3(2.2)) / uFjM.y * ljus * uFjG.y;
      return vec4(lin, b.a * inne);
    }
    // en gran: smal kon med hängande grenvåningar (sågtand i kanten) och en tunn topp. y 0..1 uppåt i granen,
    // dx sidled i granens höjder, r slump. Ger täckning.
    float granform(float dx, float y, float r, float aa) {
      if (y < 0.0 || y > 1.0) return 0.0;
      float vaning = fract(y * (5.0 + 4.0 * r) + r * 3.0);
      float halv = pow(1.0 - y, 1.15) * (0.2 + 0.1 * r) * (0.6 + 0.4 * (1.0 - vaning)) + 0.004;
      return smoothstep(halv + aa, halv - aa, abs(dx));
    }
    // en skog av granar längs en linje: två förskjutna rader med celler (så att det inte blir ett jämnt mönster),
    // olika höjd (högre bestånd här och där), och gläntor där det inte står några. upp = höjd över skogens fot,
    // hmax = högsta granen, w = cellernas bredd, glest = hur mycket gläntor. Ger täckning och höjden i granen.
    vec2 granar(float x, float upp, float w, float hmax, float seed, float aa, float glest) {
      float tack = 0.0, hy = 0.0;
      if (upp < 0.0 || upp > hmax * 1.15) return vec2(0.0);
      for (int k = 0; k < 2; k++) {
        float o = float(k) * 0.5, c = floor(x / w + o), r = hash(vec2(c, seed + float(k) * 17.0));
        if (hash(vec2(c, seed + 5.0 + float(k))) < glest * (0.4 + 0.9 * noise(vec2(x * 1.3, seed)))) continue;
        float bestand = 0.55 + 0.6 * noise(vec2(x * 2.2, seed + 9.0));
        float th = hmax * (0.35 + 0.5 * pow(r, 0.7)) * bestand;
        float cx = (c - o + 0.5 + (hash(vec2(c, seed + 3.0)) - 0.5) * 0.6) * w;
        float tk = granform((x - cx) / th, upp / th, r, aa / th);
        if (tk > tack) { tack = tk; hy = upp / th; }
      }
      return vec2(tack, hy);
    }
    vec3 himmel(vec2 s, float skarpa) {
      float upp = uHy - s.y, x = s.x * uAsp;
      vec3 c = mix(vec3(0.012, 0.03, 0.05), vec3(0.003, 0.006, 0.016), smoothstep(0.0, 0.55, upp));
      // stjärnor (blinkar lite)
      vec2 g = vec2(x, s.y) * 140.0, id = floor(g), f = fract(g) - 0.5;
      float st = hash(id), ljus = step(0.986, st) * smoothstep(0.08 * skarpa + 0.05, 0.0, length(f + (vec2(hash(id + 3.1), hash(id + 5.7)) - 0.5) * 0.6));
      c += vec3(0.7, 0.8, 1.0) * ljus * (0.85 + 0.15 * sin(uT * (0.4 + 1.2 * st) + st * 60.0)) * smoothstep(0.0, 0.1, upp);
      vec4 pu = pulser(s.x); float vg = vag(s.x);
      vec3 nk = norrsken(s, pu, vg);
      c += nk + vec3(0.01, 0.045, 0.025) * exp(-abs(upp - 0.3) * 5.0) * (0.6 + 0.4 * noise(vec2(x * 0.8 + uT * 0.02, 7.0)));
      // norrskenets ljus på snön: hur starkt det lyser rakt ovanför fjällen
      vec3 sken = norrsken(vec2(s.x, uHy - 0.24), pu, vg) * 1.4 + vec3(0.02, 0.03, 0.05);
      float aa = 0.0016 / skarpa;
      vec4 fj = fjall(x, upp, sken);
      c = mix(c, fj.rgb, fj.a);
      // skogen i två lager med djup: längst bort en mjuk ås med små granar i dis (ljusare, nästan himlens färg), och
      // närmast strandskogen: större granar i olika höjd med gläntor, nästan svart, topparna fångar lite av norrskenet
      if (upp < 0.075 && upp > -0.01) {
        float ga = 0.0012 / skarpa;
        float asB = 0.005 + 0.013 * noise(vec2(x * 0.8, 4.2)) + 0.007 * noise(vec2(x * 1.9, 8.1));
        vec2 gB = granar(x + 7.3, upp - asB * 0.85, 0.004, 0.013, 11.0, ga, 0.12);
        vec3 dis = mix(c, vec3(0.03, 0.05, 0.07) + sken * 0.1, 0.8);
        c = mix(c, dis, max(gB.x, smoothstep(asB + ga, asB - ga, upp)));
        float as = 0.0012 + 0.003 * noise(vec2(x * 2.0, 1.7)) + 0.001 * noise(vec2(x * 11.0, 3.1));
        vec3 svart = vec3(0.003, 0.005, 0.007);
        c = mix(c, svart, smoothstep(as + ga, as - ga, upp));
        vec2 g1 = granar(x + 2.1, upp - as * 0.7, 0.0095, 0.042, 7.0, ga, 0.35);
        c = mix(c, svart + sken * 0.07 * g1.y * g1.y, g1.x);
      }
      return c;
    }
    // mjukt tak: det ljusaste stannar under 0,82 (ungefär 80 % av helt vitt, färgen behålls); allt under 0,62 är orört
    vec3 tak(vec3 c) {
      float m = max(max(c.r, c.g), c.b);
      if (m <= 0.62) return c;
      return c * (0.62 + 0.2 * (1.0 - exp(-(m - 0.62) / 0.5))) / m;   // långsamt mot taket, så strålarna syns kvar
    }
    // Späckhuggarna: en flock på tre (en hane med hög, rak ryggfena och två mindre med böjd fena) som simmar förbi och
    // kommer upp och andas två gånger var. Varje andetag är en båge genom ytan, och kroppen följer bågen som ett tåg
    // följer rälsen: huvudet kommer upp först (med blåsten), sedan rullar ryggen och fenan över ytan och böjer sig efter
    // bågen, och sist går stjärtspolen ner. Kroppen slår lite med stjärten medan den simmar, och hanens höga fena
    // vickar. Där kroppen bryter ytan skummar det, bakom huvudet breder ett kölvatten ut sig i ett V, och där den kom
    // upp sprider sig ringar (det är späckhuggarna som gör vågorna).
    // uSp: starttid, riktning (±1), avstånd (raden under horisonten, d0) och var de börjar (x).
    // Mått i kroppslängder L (längre bort = mindre på skärmen). Bågen: ryggradens höjd P(u) = SP_HT - SP_K u²
    // (u framåt från bågens topp, uppåt från vattenytan); nosen är kroppens +0,5, stjärten -0,5.
    const float SP_FART = 0.85, SP_HT = -0.012, SP_K = 0.42, SP_U0 = -1.1, SP_TID = 3.3;
    float blast = 0.0, skum = 0.0, glans = 0.0, flack = 0.0;
    // kroppens tjocklek: trubbigt huvud, tjockast en bit bakom huvudet, och en stjärtspole som är hög sedd från sidan
    float sprofil(float bx) {
      float q = clamp(bx + 0.5, 0.0, 1.0);
      return pow(q, 0.5) * pow(1.0 - q, 0.38) / 0.5478;
    }
    // en späckhuggare i kroppens egna mått (bx längs kroppen, by ut från ryggraden). hf = fenans höjd, krok = hur böjd
    // den är, vick = fenans topp just nu. Ger täckning (x) och glans (y).
    vec2 kropp(float bx, float by, float hf, float krok, float vick, float aa) {
      float e = sprofil(bx), ovan = 0.105 * e, under = -0.085 * e;
      // stjärtfenorna ligger vågrätt: från sidan en kort, platt kil bakom stjärtspolen
      float stj = clamp((-0.47 - bx) / 0.09, 0.0, 1.0);
      ovan = max(ovan, 0.012 * stj); under = min(under, -0.008 * stj);
      float inne = clamp(min(min(ovan - by, by - under), min(bx + 0.56, 0.5 - bx)) / aa + 0.5, 0.0, 1.0);
      // ryggfenan: hanens rak och hög, de andras lägre och bakåtböjd
      float bas = 0.105 * sprofil(0.05), hh = (by - bas) / hf;
      float topp = mix(0.055, -0.035, krok) + vick * hh * hh;
      float fram = 0.125 - (0.125 - topp) * pow(clamp(hh, 0.0, 1.0), mix(1.0, 0.7, krok));
      float bak = -0.02 + (topp + 0.02) * hh + krok * 0.025 * sin(3.14159 * clamp(hh, 0.0, 1.0));
      float fen = clamp(min(min(1.0 - hh, hh + 0.15) * hf, min(bx - bak, fram - bx)) / aa + 0.5, 0.0, 1.0);
      // glans längs ryggen och fenans framkant (ljuset från norrskenet)
      float g = smoothstep(0.02, 0.0, ovan - by) * inne + fen * smoothstep(0.012, 0.0, fram - bx) * 0.6;
      // de ljusa fläckarna: ögonfläcken bakom ögat och sadeln bakom fenan (svagt grå i natten)
      vec2 o = (vec2(bx, by) - vec2(0.3, 0.045)) / vec2(0.065, 0.018);
      vec2 sa = (vec2(bx, by) - vec2(-0.1, 0.105 * sprofil(-0.1) - 0.02)) / vec2(0.09, 0.022);
      flack = max(flack, (exp(-dot(o, o)) * 0.9 + exp(-dot(sa, sa)) * 0.5) * inne);
      return vec2(max(inne, fen), g);
    }
    // punkten (u, v) i bågens mått -> kroppens mått (bx, by), när nosen är vid uh. Kroppen följer bågen: punkten
    // projiceras på ryggraden (två steg räcker, bågen är svag), och avståndet längs bågen från nosen ger bx.
    vec2 tillkropp(float u, float v, float uh, float tid) {
      float us = u, n = 0.0;
      for (int it = 0; it < 2; it++) {
        float pp = -2.0 * SP_K * us, c = inversesqrt(1.0 + pp * pp), sn = pp * c;
        n = (u - us) * (-sn) + (v - (SP_HT - SP_K * us * us)) * c;
        us = u + n * sn;
      }
      float pm = -SP_K * (uh + us), bx = 0.5 - (uh - us) * sqrt(1.0 + pm * pm);
      // stjärtslaget: en våg bakåt längs kroppen, större mot stjärten
      float sv = 0.5 - bx;
      n -= 0.014 * sin(6.2832 * (bx * 1.1 + tid * 1.5)) * sv * sv * 2.0;
      return vec2(bx, n);
    }
    vec4 spack(float x, float d) {
      vec4 r = vec4(0.0); blast = 0.0; skum = 0.0; glans = 0.0; flack = 0.0;
      float t = uT - uSp.x;
      if (t < 0.0 || t > 24.0) return r;
      float dir = uSp.y;
      float ub = -sqrt((SP_HT + 0.093) / SP_K);          // där andningshålet bryter ytan
      float tb = (ub + 0.17 - SP_U0) / SP_FART;           // när det händer (andningshålet är 0,17 bakom nosen)
      for (int i = 0; i < 3; i++) {
        float fi = float(i), hane = step(fi, 0.5);
        float d0 = uSp.z * (1.0 + (fi - 1.0) * 0.07);                  // lite olika långt bort
        float L = d0 * 1.4 * mix(0.82, 1.0, hane);
        float hf = mix(0.12, 0.19, hane), krok = 1.0 - hane;
        float vick = hane * 0.018 * sin(uT * 2.3 + fi);
        float aa = 0.0028 / L;
        for (int k = 0; k < 2; k++) {
          float start = fi * 1.4 + float(k) * 5.6, ts = t - start;   // tid sedan andetaget började
          if (ts < 0.0 || ts > 14.0) continue;
          float X0 = uSp.w + dir * L * (SP_FART * start - fi * 1.6 - SP_U0);   // bågens topp
          float u = (x - X0) * dir / L, v = (d0 - d) / L, uh = SP_U0 + SP_FART * ts;
          if (ts <= SP_TID && abs(u - uh + 0.5) < 0.95 && abs(v) < 0.45) {
            // ovanför ytan: kroppen; under: dess spegelbild (samma punkt speglad i ytan)
            vec2 b = tillkropp(u, abs(v), uh, uT);
            vec2 kb = kropp(b.x, b.y, hf, krok, vick, aa);
            if (v > 0.0) { r.x = max(r.x, kb.x); glans = max(glans, kb.y); }
            else r.y = max(r.y, kb.x * 0.45 * smoothstep(-0.3, 0.0, v));
            // skum där kroppen skär genom ytan
            vec2 b0 = tillkropp(u, 0.004, uh, uT);
            float yta = kropp(b0.x, b0.y, hf, krok, vick, aa).x;
            skum = max(skum, yta * exp(-pow(v / 0.022, 2.0)) * (0.55 + 0.45 * noise(vec2(u * 50.0, uT * 4.0))));
          }
          // kölvattnet: ett V bakom nosen (vi ser sjön snett, så det blir platt), medan kroppen är nära ytan
          float xr = u - uh, w = (d - d0) / L * 3.6;
          if (xr < 0.0 && xr > -3.0 && ts < SP_TID + 2.0) {
            float lin = abs(w) + xr * 0.34;
            r.w += 0.004 * exp(-lin * lin / 0.004) * sin(xr * 22.0 + ts * 9.0) * exp(xr * 0.7)
                   * smoothstep(-0.2, 0.3, uh + 0.6) * smoothstep(SP_TID + 2.0, SP_TID, ts);
          }
          // blåsten: när andningshålet når ytan står en dimma som stiger och sprids där den blåstes
          float ba = ts - tb;
          if (ba > 0.0 && ba < 2.6) {
            vec2 bp = vec2(u - ub, v - 0.08 - ba * 0.2);
            float br = 0.035 + ba * 0.08;
            bp /= vec2(br, br * 2.0);
            blast = max(blast, 0.7 * exp(-dot(bp, bp)) * exp(-ba * 1.3) * smoothstep(0.0, 0.15, ba) * step(0.0, v));
          }
          // ringarna där den kom upp: platta ellipser, som sprider sig och klingar av
          float tau = ts - tb;
          if (tau > 0.0) {
            float rr = length(vec2(u, w));
            float front = smoothstep(tau * 1.5 + 0.7, tau * 1.5, rr);
            r.w += 0.007 * sin(rr * 10.0 - tau * 6.0) * exp(-rr * 0.6) * exp(-tau * 0.3) * front * smoothstep(0.0, 0.6, tau);
          }
        }
      }
      r.z = glans;
      return r;
    }
    void main() {
      vec2 s = vUv;
      float d = s.y - uHy, sjo = step(0.0, d);
      // sjön: en spegel med krusningar (mer närmast), en lång dyning som rör sig, och späckhuggarnas ringar
      float nara = smoothstep(0.0, 0.3, d);
#if MED_SPACK
      vec4 sp4 = sjo > 0.0 ? spack(s.x * uAsp, d) : vec4(0.0);
#else
      vec4 sp4 = vec4(0.0);
#endif
      float kr = (noise(vec2(s.x * uAsp * 22.0, d * 90.0 - uT * 0.5)) - 0.5) * 0.005 * nara
               + 0.002 * sin(d * 80.0 + s.x * uAsp * 1.3 - uT * 0.7 + noise(vec2(s.x * uAsp * 3.0, uT * 0.08)) * 2.5) * smoothstep(0.02, 0.3, d)
               + sp4.w;
      kr += (noise(vec2(s.x * uAsp * 60.0, d * 400.0 - uT * 0.4)) - 0.5) * 0.0016 * smoothstep(0.0, 0.03, d);   // spegeln är inte helt blank ens närmast stranden
      // himlen ritas en gång per pixel (antingen rakt eller speglad), så att bilden läses lika i alla pixlar
      vec2 q = sjo > 0.0 ? vec2(s.x + kr * 0.5, uHy - d + kr) : s;
      vec3 h = himmel(q, sjo > 0.0 ? 0.45 : 1.0);
      vec3 c = h;
      if (sjo > 0.0) {
        c = h * (0.55 + 0.25 * nara) + vec3(0.004, 0.008, 0.012);
        // ringarnas vågkammar fångar lite ljus
        c += h * max(0.0, sp4.w) * 40.0;
        // späckhuggarna: svarta, med blank, våt rygg som fångar norrskenet, och en mörk spegelbild
        vec3 sken = norrsken(vec2(s.x, uHy - 0.24), pulser(s.x), 0.0) * 1.4;
        vec3 hud = vec3(0.004, 0.006, 0.008) + sken * 0.3 * sp4.z + (vec3(0.1, 0.12, 0.13) + sken * 0.3) * flack;
        c = mix(c, hud, sp4.x);
        c = mix(c, c * 0.4, sp4.y);
        c += (vec3(0.16, 0.19, 0.21) + sken * 0.4) * blast + (vec3(0.06, 0.08, 0.09) + sken * 0.25) * skum * (1.0 - sp4.x);
        c *= 1.0 - 0.35 * smoothstep(0.35, 0.6, d);   // mörkare närmast tangentbordet
      }
      // udden: en skogklädd udde som sticker ut i sjön till vänster, närmare än stranden (större granar), och dess
      // spegelbild i vattnet (speglad i uddens egen strandlinje)
      {
        float ux = s.x * uAsp, ub = 0.3 * min(uAsp, 1.6);
        float ds = 0.05 * (1.0 - smoothstep(ub * 0.3, ub, ux)) * (0.85 + 0.15 * noise(vec2(ux * 9.0, 2.0)));
        float gh = 0.03 + ds * 2.2, ga = 0.0015;
        if (ux < ub && d > ds - gh - 0.005 && d < ds + gh * 2.2) {   // bara där udden och dess spegelbild kan synas
          vec3 svart = vec3(0.002, 0.004, 0.006);
          vec3 kant = vec3(0.006, 0.022, 0.016);   // topparna fångar lite av norrskenets gröna
          float land = step(0.0, d) * smoothstep(ds + ga, ds - ga, d);
          vec2 tr = granar(ux + 5.0, ds - d, 0.016, gh, 23.0, ga, 0.15);
          c = mix(c, svart + kant * tr.y * tr.y, max(land, tr.x));
          if (d > ds) {   // spegelbilden, mörk och lite krusig
            float dm = 2.0 * ds - d + kr * 1.5;
            vec2 trs = granar(ux + 5.0 + kr * 0.5, ds - dm, 0.016, gh, 23.0, ga * 3.0, 0.15);
            c = mix(c, c * 0.25, trs.x * 0.85 * smoothstep(gh * 2.2, 0.0, d - ds));
          }
        }
      }
      gl_FragColor = vec4(tak(c), 1.0);
    }`;

  // meta: ui/norrsken/norrsken.json (bild, w, halv, hs, kb, ks), bas: katalogen bilden ligger i
  function create(parent, meta, bas) {
    const cv = document.createElement("canvas"); cv.id = "norrsken"; cv.className = "himmel";
    parent.prepend(cv);   // först i body: appen ritas ovanpå
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
    let prog = null, u = {}, buf = null, aktiv = false, lugn = 0, tex = null, fjallKlar = false;
    const PROG = [null, null], U = [{}, {}];   // 0 utan späckhuggare, 1 med
    let sp = [-100, 1, 0.12, 0.5], spNasta = 0;   // späckhuggarna: starttid, riktning, avstånd, x
    const M = meta || { w: 2048, halv: 256, hs: 196, kb: 1, ks: 1 }, A = M.w / M.hs;
    const t0 = performance.now(), P = new Float32Array(MAX * 4), C = new Float32Array(MAX * 3); let n = 0, pos = 0;
    if (gl) {
      try {
        const sh = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        const vs = sh(gl.VERTEX_SHADER, VS);
        for (let v = 0; v < 2; v++) {
          const pr = gl.createProgram(); gl.attachShader(pr, vs);
          gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS.replace("precision highp float;", `precision highp float;\n#define MED_SPACK ${v}`))); gl.linkProgram(pr);
          if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
          for (const k of ["uT", "uHy", "uAsp", "uN", "uP", "uC", "uFj", "uFjM", "uFjG", "uFjH", "uSp"]) U[v][k] = gl.getUniformLocation(pr, k);
          U[v].aP = gl.getAttribLocation(pr, "aP");
          PROG[v] = pr;
        }
        prog = PROG[0]; u = U[0];
        // fjällen: en genomskinlig pixel tills bilden har laddats
        tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (meta && meta.bild) {
          const im = new Image();
          im.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            fjallKlar = true;
          };
          im.onerror = () => console.warn("norrsken: kunde inte ladda", meta.bild);
          im.src = (bas || "") + meta.bild;
        }
        buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      } catch (e) { console.warn("norrsken:", e.message); prog = null; }
    }
    let fryst = null;   // tester: stoppad klocka
    const nu = () => fryst !== null ? fryst : (performance.now() - t0) / 1000;
    const lage = () => { const asp = innerWidth / innerHeight; return { asp, hy: asp > 1.2 ? 0.56 : 0.5 }; };
    function puls(f, styrka, farg) { P.set([f, nu(), styrka, 0], pos * 4); C.set(farg, pos * 3); pos = (pos + 1) % MAX; n = Math.min(MAX, n + 1); }
    // upplösningen anpassar sig: på en långsam grafikkrets (eller i en emulerad) ritas bilden glesare, så att appen
    // hinner med tangenterna; på en snabb kommer den tillbaka till halva skärmens upplösning
    let skala = 0.5, senTick = 0, snittDt = 16, senJust = 0;
    function anpassa(t) {
      if (senTick > 0) { const dt = Math.min(500, (t - senTick) * 1000); snittDt += (dt - snittDt) * 0.1; }
      senTick = t;
      if (t - senJust < 1) return;
      if (snittDt > 45 && skala > 0.26) { skala = Math.max(0.25, skala * 0.8); senJust = t; }
      else if (snittDt < 24 && skala < 0.5) { skala = Math.min(0.5, skala * 1.12); senJust = t; }
    }
    function rita() {
      const dpr = Math.min(2, window.devicePixelRatio || 1) * skala;
      const w = Math.max(2, Math.round(cv.clientWidth * dpr)), h = Math.max(2, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      if (!gl || !prog) return;
      const L = lage();
      const v = nu() - sp[0] < 25 ? 1 : 0; prog = PROG[v]; u = U[v];   // späckhuggarna syns i högst 24 s
      gl.viewport(0, 0, w, h); gl.useProgram(prog);
      gl.uniform1f(u.uT, nu()); gl.uniform1f(u.uHy, L.hy); gl.uniform1f(u.uAsp, L.asp);
      gl.uniform1f(u.uN, n); gl.uniform4fv(u.uP, P); gl.uniform3fv(u.uC, C);
      // fjällremsan: lika hög som förut på liggande skärmar, men alltid minst så hög att den täcker hela bredden
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.uFj, 0);
      gl.uniform4f(u.uFjM, M.kb, M.ks, A, M.hs / (2 * M.halv)); gl.uniform2f(u.uFjG, 1.6, 1.5);
      gl.uniform1f(u.uFjH, Math.max(L.asp > 1.2 ? 0.2 : 0.17, L.asp / A * 1.02));
      gl.uniform4f(u.uSp, sp[0], sp[1], sp[2], sp[3]);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(u.aP); gl.vertexAttribPointer(u.aP, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // späckhuggarna kommer: från ena sidan mot den andra, på ett slumpat avstånd
    // (o: riktning, avstånd och x för tester; annars slumpat)
    function spackhuggare(o) {
      const t = nu(); if (t - sp[0] < 22 && !(o && o.tvinga)) return false;
      const asp = innerWidth / innerHeight, dir = o ? o.dir : Math.random() < 0.5 ? 1 : -1, d0 = o ? o.d0 : 0.085 + Math.random() * 0.06;
      sp = [t - (o && o.alder ? o.alder : 0), dir, d0, o ? o.x * asp : asp * (dir > 0 ? 0.12 + Math.random() * 0.3 : 0.58 + Math.random() * 0.3)];
      spNasta = t + 100 + Math.random() * 100;   // mer sällan: var annan till var tredje minut
      return true;
    }
    return {
      visa(pa) { aktiv = !!pa; cv.style.display = aktiv ? "block" : "none"; if (aktiv) spNasta = nu() + 20 + Math.random() * 20; },
      spackhuggare,
      // ett tryck på sjön lockar fram dem (om de inte redan är där)
      vatten(x, y) { return aktiv && y / innerHeight > lage().hy + 0.02; },
      // en ton: slöjan flammar upp där tonen ligger (f 0..1 över tangentbordet), i tonens färg
      anslag(nt, f, farg) { puls(f, 1.0, farg.map((v) => v / 255)); },
      tick() {
        if (!aktiv) return;
        const t = nu();   // norrskenet lever även när ingen spelar: en svag puls då och då
        if (t > lugn) { if (lugn > 0) puls(0.15 + Math.random() * 0.7, 0.35, [0.3, 1.0, 0.6]); lugn = t + 4 + Math.random() * 6; }
        if (spNasta > 0 && t > spNasta) spackhuggare();
        anpassa(performance.now() / 1000);
        rita();
      },
      // tester: medelljuset (0..255) i himlen och hur många pulser som lever
      matt() {
        rita(); if (!gl || !prog) return null;
        const w = cv.width, h = cv.height, px = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const L = lage(); let himmel = 0, nh = 0, gron = 0;
        for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
          const i = (y * w + x) * 4, sy = 1 - y / h;
          if (sy < L.hy - 0.18) { himmel += (px[i] + px[i + 1] + px[i + 2]) / 3; gron += px[i + 1] - (px[i] + px[i + 2]) / 2; nh++; }
        }
        return { himmel: himmel / Math.max(1, nh), gron: gron / Math.max(1, nh), pulser: n, spack: nu() - sp[0] < 22 };
      },
      klar() { return !!(gl && prog && fjallKlar); },
      frys(t) { fryst = t === null || t === undefined ? null : t; },
    };
  }
  return { create };
})();
