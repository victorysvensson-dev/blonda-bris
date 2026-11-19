// BLONDA BRIS – den hemliga patchen NORRSKEN: norrsken över snöiga fjäll och en stilla sjö, räknat i realtid (WebGL).
// Norrskenet är tre lager av slöjor (grönt nertill, lila upptill) med strålar som vandrar långsamt. Varje ton får
// slöjan att flamma upp där man spelar (vänster–höger som på tangentbordet) och en våg att gå genom den; fjällens snö
// lyses upp av norrskenet, och sjön speglar alltihop. Arpen blir pulser i slöjan. Ritas i halv upplösning.
"use strict";
const Norrsken = (() => {
  const MAX = 16;
  const VS = `attribute vec2 aP; varying vec2 vUv; void main() { vUv = vec2(aP.x, 1.0 - aP.y); gl_Position = vec4(aP * 2.0 - 1.0, 0.0, 1.0); }`;
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
    // granarna längs stranden: en rad med grenvåningar ovanpå en låg ås. Ger täckning och höjden i granen (0..1)
    vec2 gran(float x, float upp, float w, float hmax, float seed, float aa) {
      float c = floor(x / w), f = fract(x / w), r = hash(vec2(c, seed));
      float th = hmax * (0.45 + 0.55 * r), y = upp / th;
      if (y > 1.0 || y < 0.0) return vec2(0.0);
      float u = abs(f - 0.5 - (hash(vec2(c, seed + 3.0)) - 0.5) * 0.35) * 2.0;
      float vaning = fract(y * (4.0 + 3.0 * r) + r);
      float halv = (1.0 - y) * (0.55 + 0.45 * (1.0 - vaning)) + 0.03;
      return vec2(smoothstep(halv + aa, halv - aa, u), y);
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
      // stranden: en låg ås med granar, nästan svart, toppen fångar lite av norrskenet
      if (upp < 0.03 && upp > -0.01) {
        float as = 0.002 + 0.004 * noise(vec2(x * 3.0, 1.7)) + 0.002 * noise(vec2(x * 13.0, 3.1));
        vec3 svart = vec3(0.003, 0.005, 0.007);
        vec2 g1 = gran(x + 2.1, upp - as * 0.6, 0.0045, 0.011, 7.0, 0.05 / skarpa);
        c = mix(c, svart + sken * 0.05 * g1.y, g1.x);
        c = mix(c, svart, smoothstep(as + aa, as - aa, upp));
        vec2 g2 = gran(x, upp - as * 0.8, 0.007, 0.017, 3.0, 0.05 / skarpa);
        c = mix(c, svart + sken * 0.06 * g2.y * g2.y, g2.x);
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
    // kommer upp och andas två gånger var. Varje andetag är en mjuk båge: nosen pekar uppåt när den bryter ytan (huvudet
    // och blåsten kommer först), planar ut så att ryggen och fenan syns, och lutar sedan nedåt så att stjärten går ner
    // sist. Där kroppen bryter ytan skummar det, och där den kom upp sprider sig ringar på vattnet (det är vågorna).
    // uSp: starttid, riktning (±1), avstånd (raden under horisonten, d0) och var de börjar (x).
    // Mått i kroppslängder L (längre bort = mindre på skärmen); nosen är vid +0,5, stjärten vid -0,5.
    const float SP_TID = 3.4, SP_FART = 0.45;
    float blast = 0.0, skum = 0.0, glans = 0.0, flack = 0.0;
    // kroppens tjocklek: trubbigt huvud, tjockast en bit bakom huvudet, och en stjärtspole som är hög sedd från sidan
    float sprofil(float bx) {
      float q = clamp(bx + 0.5, 0.0, 1.0);
      return pow(q, 0.5) * pow(1.0 - q, 0.38) / 0.5478;
    }
    // en späckhuggare i kroppens egna mått (bx framåt, by uppåt). hf = fenans höjd, krok = hur böjd den är.
    // Ger täckning (x) och glans (y).
    vec2 kropp(float bx, float by, float hf, float krok, float aa) {
      float e = sprofil(bx), ovan = 0.105 * e, under = -0.085 * e;
      // stjärtfenorna ligger vågrätt: från sidan en kort, platt kil bakom stjärtspolen
      float stj = clamp((-0.47 - bx) / 0.09, 0.0, 1.0);
      ovan = max(ovan, 0.012 * stj); under = min(under, -0.008 * stj);
      float inne = clamp(min(min(ovan - by, by - under), min(bx + 0.56, 0.5 - bx)) / aa + 0.5, 0.0, 1.0);
      // ryggfenan: hanens rak och hög, de andras lägre och bakåtböjd
      float bas = 0.105 * sprofil(0.05), hh = (by - bas) / hf;
      float topp = mix(0.055, -0.035, krok);
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
    // var kroppen är under ett andetag: höjd och lutning (s = 0..1 genom andetaget)
    vec2 sbana(float s) { return vec2(-0.3 + 0.27 * sin(3.14159 * s), 0.5 * cos(3.14159 * s)); }
    // från vattnets mått till kroppens: flytta, luta, och böj kroppen i en båge (ändarna lägre än ryggen)
    vec2 tillkropp(vec2 p, vec2 bana) {
      p.y -= bana.x; float c = cos(bana.y), n = sin(bana.y);
      vec2 b = vec2(p.x * c + p.y * n, -p.x * n + p.y * c);
      return vec2(b.x, b.y + 0.1 * b.x * b.x);
    }
    vec4 spack(float x, float d) {
      vec4 r = vec4(0.0); blast = 0.0; skum = 0.0; glans = 0.0; flack = 0.0;
      float t = uT - uSp.x;
      if (t < 0.0 || t > 22.0) return r;
      float dir = uSp.y;
      for (int i = 0; i < 3; i++) {
        float fi = float(i), hane = step(fi, 0.5);
        float d0 = uSp.z * (1.0 + (fi - 1.0) * 0.07);                  // lite olika långt bort
        float L = d0 * 1.4 * mix(0.82, 1.0, hane);
        float hf = mix(0.12, 0.19, hane), krok = 1.0 - hane;
        float aa = 0.0028 / L;
        for (int k = 0; k < 2; k++) {
          float start = fi * 1.4 + float(k) * 5.6, ts = t - start;   // tid sedan andetaget började
          if (ts < 0.0 || ts > 14.0) continue;
          float x0 = uSp.w + dir * L * (SP_FART * start - fi * 1.6);  // där andetaget börjar
          float v = (d0 - d) / L;
          if (ts <= SP_TID) {
            float sx = ts / SP_TID;
            vec2 bana = sbana(sx);
            float u = (x - x0) * dir / L - SP_FART * ts;
            if (abs(u) < 0.8 && abs(v) < 0.45) {
              // ovanför ytan: kroppen; under: dess spegelbild (samma punkt speglad i ytan)
              vec2 b = tillkropp(vec2(u, abs(v)), bana);
              vec2 kb = kropp(b.x, b.y, hf, krok, aa);
              if (v > 0.0) { r.x = max(r.x, kb.x); glans = max(glans, kb.y); }
              else r.y = max(r.y, kb.x * 0.45 * smoothstep(-0.3, 0.0, v));
              // skum där kroppen skär genom ytan
              vec2 b0 = tillkropp(vec2(u, 0.004), bana);
              float yta = kropp(b0.x, b0.y, hf, krok, aa).x;
              skum = max(skum, yta * exp(-pow(v / 0.022, 2.0)) * (0.55 + 0.45 * noise(vec2(u * 50.0, uT * 4.0))));
            }
          }
          // blåsten: när huvudet bryter ytan står en dimma som stiger och sprids där den blåstes
          float ba = ts - SP_TID * 0.095;
          if (ba > 0.0 && ba < 2.6) {
            vec2 bp = vec2((x - x0) * dir / L - SP_FART * SP_TID * 0.095 - 0.257, v - 0.08 - ba * 0.2);
            float br = 0.035 + ba * 0.08;
            bp /= vec2(br, br * 2.0);
            blast = max(blast, 0.7 * exp(-dot(bp, bp)) * exp(-ba * 1.3) * smoothstep(0.0, 0.15, ba) * step(0.0, v));
          }
          // ringarna där den kom upp: platta ellipser (vi ser sjön snett), som sprider sig och klingar av
          float tau = ts - SP_TID * 0.2;
          if (tau > 0.0) {
            float xm = x0 + dir * L * SP_FART * SP_TID * 0.5;
            float rr = length(vec2((x - xm) / L, (d - d0) / L * 3.6));
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
      vec4 sp4 = sjo > 0.0 ? spack(s.x * uAsp, d) : vec4(0.0);
      float kr = (noise(vec2(s.x * uAsp * 22.0, d * 90.0 - uT * 0.5)) - 0.5) * 0.005 * nara
               + 0.002 * sin(d * 80.0 + s.x * uAsp * 1.3 - uT * 0.7 + noise(vec2(s.x * uAsp * 3.0, uT * 0.08)) * 2.5) * smoothstep(0.02, 0.3, d)
               + sp4.w;
      // himlen ritas en gång per pixel (antingen rakt eller speglad), så att bilden läses lika i alla pixlar
      vec2 q = sjo > 0.0 ? vec2(s.x + kr * 0.5, uHy - d + kr) : s;
      vec3 h = himmel(q, sjo > 0.0 ? 0.55 : 1.0);
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
      gl_FragColor = vec4(tak(c), 1.0);
    }`;

  // meta: ui/norrsken/norrsken.json (bild, w, halv, hs, kb, ks), bas: katalogen bilden ligger i
  function create(parent, meta, bas) {
    const cv = document.createElement("canvas"); cv.id = "norrsken"; cv.className = "himmel";
    parent.prepend(cv);   // först i body: appen ritas ovanpå
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
    let prog = null, u = {}, buf = null, aktiv = false, lugn = 0, tex = null, fjallKlar = false;
    let sp = [-100, 1, 0.12, 0.5], spNasta = 0;   // späckhuggarna: starttid, riktning, avstånd, x
    const M = meta || { w: 2048, halv: 256, hs: 196, kb: 1, ks: 1 }, A = M.w / M.hs;
    const t0 = performance.now(), P = new Float32Array(MAX * 4), C = new Float32Array(MAX * 3); let n = 0, pos = 0;
    if (gl) {
      try {
        const sh = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        for (const k of ["uT", "uHy", "uAsp", "uN", "uP", "uC", "uFj", "uFjM", "uFjG", "uFjH", "uSp"]) u[k] = gl.getUniformLocation(prog, k);
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
        u.aP = gl.getAttribLocation(prog, "aP");
        buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      } catch (e) { console.warn("norrsken:", e.message); prog = null; }
    }
    let fryst = null;   // tester: stoppad klocka
    const nu = () => fryst !== null ? fryst : (performance.now() - t0) / 1000;
    const lage = () => { const asp = innerWidth / innerHeight; return { asp, hy: asp > 1.2 ? 0.56 : 0.5 }; };
    function puls(f, styrka, farg) { P.set([f, nu(), styrka, 0], pos * 4); C.set(farg, pos * 3); pos = (pos + 1) % MAX; n = Math.min(MAX, n + 1); }
    function rita() {
      const dpr = Math.min(2, window.devicePixelRatio || 1) * 0.5;
      const w = Math.max(2, Math.round(cv.clientWidth * dpr)), h = Math.max(2, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      if (!gl || !prog) return;
      const L = lage();
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
