// BLONDA BRIS – den hemliga patchen SJÖN: en stilla skogssjö i månsken, räknad i realtid (WebGL).
// Varje ton släpper en droppe där man spelar (vänster–höger som på tangentbordet). Ringarna sprider sig, korsar
// varandra och bryter månens spegling. Himlen (måne, stjärnor, trädlinje) och dess spegling räknas med samma
// funktion, så speglingen stämmer med krusningarna. Arpen blir regn. Ytan ritas i halv upplösning (vatten är mjukt).
// Bakom sjön: fjäll och blandskog (gran, tall, björk, lövträd), renderade i Blender (tools/sjon_land.py) för dagen och
// natten i en bild (ui/sjon/land.webp). Små moln driver förbi.
// Då och då faller en stjärna (och syns i vattnet). Fem tryck på månen gör dag: månen går ner bakom skogen, himlen
// ljusnar i en gryning och solen stiger. Fem tryck på solen gör natt igen (samma väg tillbaka).
"use strict";
const Sjon = (() => {
  const MAX = 24, LH = 0.24, LASP = (11 * 0.24).toFixed(4);   // landskapsbilden: 11 gånger så bred som hög (tools/sjon_land.py)
  const VS = `attribute vec2 aP; varying vec2 vUv; void main() { vUv = vec2(aP.x, 1.0 - aP.y); gl_Position = vec4(aP * 2.0 - 1.0, 0.0, 1.0); }`;
  const FS = `#ifdef GL_EXT_shader_texture_lod
    #extension GL_EXT_shader_texture_lod : enable
    #endif
    precision highp float;
    varying vec2 vUv;                    // 0..1, y nedåt
    uniform vec2 uRes; uniform float uT, uHy, uN, uAsp, uMx, uMy, uMr;
    uniform vec3 uSol;                   // solen: x, y (skärmen), radie
    uniform float uDag, uGry, uPuls;     // dagsljus 0..1, gryningens färg 0..1, ett sken när man trycker på månen/solen
    uniform vec4 uSf;                    // stjärnfallet: start x, y (x i bildförhållandets enheter), riktning (rad), ålder (s)
    uniform vec3 uSfL;                   // stjärnfallets livslängd (s), fart (skärmhöjder per s) och storlek (1 = nära, ~0.3 = långt bort)
    uniform vec4 uD[${MAX}];             // droppe: världens x, z, starttid, styrka
    uniform vec3 uC[${MAX}];             // droppens färg (ett svagt sken i ringarna)
    uniform sampler2D uL;                // landskapet (fjäll och skog, renderat i Blender): dag överst, natt spegelvänd under
    uniform float uLand;                 // 0 = bilden har inte laddats än, 1 = laddad (tonar in)
    uniform float uLod;                  // bildens förminskningsnivå (räknas i JS ur ytans storlek)
    // Bilden läses i grenar (himmel/vatten, inom bandet) där grannpunkterna kan ta olika väg; derivatorna, som annars
    // väljer nivån, är då odefinierade och ger en rand vid bandets kant. Nivån sätts därför direkt (uLod). Utan
    // tillägget har bilden ingen förminskningskedja (JS) och läses rakt.
    vec4 landBild(vec2 t) {
    #ifdef GL_EXT_shader_texture_lod
      return texture2DLodEXT(uL, t, uLod);
    #else
      return texture2D(uL, t);
    #endif
    }
    const float LASP = ${LASP};          // bildens bredd i skärmens enheter (bandets höjd LH = 1 skärmhöjd × LH)
    uniform vec4 uMoln[2];               // molnen: mitt x, y (skärmen, x i bildförhållandets enheter), bredd, frö
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
      // landskapet (berg och skog) skymmer allt bakom sig: ur bilden som räknades en gång (natt och dag blandas)
      if (upp >= 0.0 && upp < LH && uLand > 0.0) {
        // bildens mitt i skärmens mitt; på en smal skärm syns mitten av panoramat
        float tx = 0.5 + (s.x - 0.5) * uAsp / LASP, h = upp / LH;
        vec4 L = uDag < 0.001 ? landBild(vec2(tx, 0.5 + 0.5 * h)) : uDag > 0.999 ? landBild(vec2(tx, 0.5 - 0.5 * h))
               : mix(landBild(vec2(tx, 0.5 + 0.5 * h)), landBild(vec2(tx, 0.5 - 0.5 * h)), uDag);
        vec3 glod = vec3(0.02, 0.03, 0.05) * exp(-r * 6.0) * 0.4 * (1.0 - uDag);   // månskenet nära månen
        c = mix(c, L.rgb + glod + vec3(0.25, 0.1, 0.03) * uGry * 0.25, L.a * uLand);
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

  function create(parent) {
    const cv = document.createElement("canvas"); cv.id = "sjon";
    parent.prepend(cv);   // först i body: appen ritas ovanpå
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
    let prog = null, u = {}, buf = null, aktiv = false, t0 = performance.now(), nasta = 0, lugn = 0;
    let landTex = null, landT0 = -1, lodExt = null;   // landskapsbilden och när den laddades (den tonar in)
    // molnen: två små, driver sakta åt höger och kommer tillbaka från vänster
    const moln = [{ x: 0.3, y: 0.12, b: 0.07, s: 3.1, v: 0.004 }, { x: 1.1, y: 0.2, b: 0.045, s: 7.7, v: 0.0028 }];
    const MOLN = new Float32Array(8);
    // dag och natt: p går 0 (natt) -> 1 (dag) på DYGN sekunder när man har gjort dag (och tillbaka för natt)
    const DYGN = 14;
    let p = 0, mal = 0, tFor = 0, puls = 0, p0 = 0, tStart = 0;   // p räknas ur klockan (inte bildrutorna), så att det tar lika lång tid överallt
    const sf = { x: 0, y: 0, v: 0, t0: -99, liv: 1, fart: 1, k: 1 }; let sfNasta = 15 + Math.random() * 20;
    const D = new Float32Array(MAX * 4), C = new Float32Array(MAX * 3); let n = 0, pos = 0;
    if (gl) {
      try {
        const sh = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        lodExt = gl.getExtension("EXT_shader_texture_lod");   // (före kompileringen: då finns GL_EXT_shader_texture_lod i shadern)
        prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        for (const k of ["uRes", "uT", "uHy", "uN", "uAsp", "uMx", "uMy", "uMr", "uD", "uC", "uSol", "uDag", "uGry", "uPuls", "uSf", "uSfL", "uL", "uLand", "uMoln", "uLod"]) u[k] = gl.getUniformLocation(prog, k);
        // landskapet: ett eget program som ritar i två bilder (natt, dag) när storleken ändras
        // landskapet: bilden laddas när sjön skapas (tools/sjon_bilder.py), med mipmaps (den förminskas mycket)
        landTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, landTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        const im = new Image();
        im.onload = () => {
          gl.bindTexture(gl.TEXTURE_2D, landTex);
          gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
          if (lodExt) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
          landT0 = nu();
        };
        im.onerror = () => console.warn("sjön: kunde inte ladda landskapet");
        im.src = "sjon/land.webp";
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
    function rita() {
      const dpr = Math.min(2, window.devicePixelRatio || 1) * 0.5;
      const w = Math.max(2, Math.round(cv.clientWidth * dpr)), h = Math.max(2, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      if (!gl || !prog) return;
      const L = lage();
      moln.forEach((m, i) => MOLN.set([m.x * L.asp, m.y, m.b, m.s], i * 4));
      gl.viewport(0, 0, w, h); gl.useProgram(prog);
      gl.uniform2f(u.uRes, w, h); gl.uniform1f(u.uT, nu()); gl.uniform1f(u.uHy, L.hy); gl.uniform1f(u.uAsp, L.asp);
      gl.uniform1f(u.uMx, L.mx); gl.uniform1f(u.uMy, L.my); gl.uniform1f(u.uMr, L.mr);
      gl.uniform1f(u.uN, n); gl.uniform4fv(u.uD, D); gl.uniform3fv(u.uC, C);
      gl.uniform3f(u.uSol, L.sx, L.sy, L.sr); gl.uniform1f(u.uDag, L.dag); gl.uniform1f(u.uGry, L.gry); gl.uniform1f(u.uPuls, puls);
      gl.uniform4f(u.uSf, sf.x, sf.y, sf.v, nu() - sf.t0); gl.uniform3f(u.uSfL, sf.liv, sf.fart, sf.k);
      gl.uniform4fv(u.uMoln, MOLN);
      // landskapet tonar in kort första gången det är klart (innan dess syns bara himlen bakom)
      gl.uniform1f(u.uLand, landT0 >= 0 ? Math.min(1, (nu() - landT0) / 0.35) : 0);
      // nivån: hur många bildpunkter i bilden som faller på en bildpunkt på ytan (2048 × 512 per halva, se LASP och LH)
      gl.uniform1f(u.uLod, Math.max(0, Math.log2(Math.max(2048 / (LASP * h), 512 / (LH * h)))));
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, landTex); gl.uniform1i(u.uL, 0);
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
        // molnen driver
        const L0 = lage();
        for (const m of moln) { m.x += m.v * dt; if (m.x > 1.25) { m.x = -0.25; m.y = 0.08 + Math.random() * (L0.hy * 0.45); m.s = Math.random() * 50; } }
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
