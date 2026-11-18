// BLONDA BRIS – den hemliga patchen SJÖN: en stilla skogssjö i månsken, räknad i realtid (WebGL).
// Varje ton släpper en droppe där man spelar (vänster–höger som på tangentbordet). Ringarna sprider sig, korsar
// varandra och bryter månens spegling. Himlen (måne, stjärnor, trädlinje) och dess spegling räknas med samma
// funktion, så speglingen stämmer med krusningarna. Arpen blir regn. Ytan ritas i halv upplösning (vatten är mjukt).
"use strict";
const Sjon = (() => {
  const MAX = 24;
  const VS = `attribute vec2 aP; varying vec2 vUv; void main() { vUv = vec2(aP.x, 1.0 - aP.y); gl_Position = vec4(aP * 2.0 - 1.0, 0.0, 1.0); }`;
  const FS = `precision highp float;
    varying vec2 vUv;                    // 0..1, y nedåt
    uniform vec2 uRes; uniform float uT, uHy, uN, uAsp, uMx, uMy, uMr;
    uniform vec4 uD[${MAX}];             // droppe: världens x, z, starttid, styrka
    uniform vec3 uC[${MAX}];             // droppens färg (ett svagt sken i ringarna)
    const float FOV = 1.25;              // brännvidd: hur fort sjön flyr mot horisonten
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    // trädlinjen på andra sidan sjön: granar (trianglar) i två rader ovanpå en mjuk ås
    float skog(float x) {
      float h = 0.018 + 0.012 * noise(vec2(x * 3.0, 1.7));
      for (int r = 0; r < 2; r++) {
        float w = r == 0 ? 0.011 : 0.017, c = floor(x / w), f = fract(x / w);
        float th = (r == 0 ? 0.03 : 0.045) * (0.45 + 0.55 * hash(vec2(c, float(r) * 7.0)));
        h = max(h, (r == 0 ? 0.012 : 0.0) + th * (1.0 - 2.0 * abs(f - 0.5)));
      }
      return h;
    }
    // himlen i skärmens koordinater (x 0..1, y nedåt; horisonten vid uHy)
    vec3 himmel(vec2 s, float skarpa) {
      float upp = uHy - s.y;
      vec3 c = mix(vec3(0.020, 0.040, 0.075), vec3(0.004, 0.008, 0.020), smoothstep(0.0, 0.45, upp));
      // stjärnor
      vec2 g = vec2(s.x * uAsp, s.y) * 140.0, id = floor(g), f = fract(g) - 0.5;
      float st = hash(id), ljus = step(0.985, st) * smoothstep(0.08 * skarpa + 0.05, 0.0, length(f + (vec2(hash(id + 3.1), hash(id + 5.7)) - 0.5) * 0.6));
      c += vec3(0.7, 0.8, 1.0) * ljus * (0.55 + 0.45 * sin(uT * (1.0 + 3.0 * st) + st * 60.0)) * smoothstep(0.0, 0.08, upp);
      // månen: skiva med mjuka fält, ring av ljus runt omkring
      vec2 d = vec2((s.x - uMx) * uAsp, s.y - uMy); float r = length(d);
      float skiva = smoothstep(uMr, uMr - 0.002 - 0.004 / skarpa, r);
      float flackar = 0.82 + 0.18 * noise(d * 90.0) - 0.1 * smoothstep(0.3, 0.8, noise(d * 40.0 + 3.0));
      c = mix(c, vec3(1.0, 0.97, 0.90) * flackar * 1.02, skiva);
      c += vec3(0.55, 0.65, 0.85) * (0.10 * exp(-r * 14.0) + 0.05 * exp(-r * 4.0));
      // skogen skymmer allt bakom sig
      float tr = skog(s.x * uAsp * 0.5);
      if (upp >= 0.0 && upp < tr) c = vec3(0.003, 0.006, 0.010) + vec3(0.02, 0.03, 0.05) * exp(-r * 6.0) * 0.4;
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
      vec3 vatten = vec3(0.004, 0.010, 0.020);
      vec3 c = vatten + himmel(sr, 0.6) * mix(0.35, 1.0, fres) + sken;
      c *= 1.0 - 0.35 * smoothstep(0.55, 1.0, s.y);   // mörkare närmast tangentbordet
      gl_FragColor = vec4(c, 1.0);
    }`;

  function create(parent) {
    const cv = document.createElement("canvas"); cv.id = "sjon";
    parent.prepend(cv);   // först i body: appen ritas ovanpå
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
    let prog = null, u = {}, buf = null, aktiv = false, t0 = performance.now(), nasta = 0, lugn = 0;
    const D = new Float32Array(MAX * 4), C = new Float32Array(MAX * 3); let n = 0, pos = 0;
    if (gl) {
      try {
        const sh = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        for (const k of ["uRes", "uT", "uHy", "uN", "uAsp", "uMx", "uMy", "uMr", "uD", "uC"]) u[k] = gl.getUniformLocation(prog, k);
        u.aP = gl.getAttribLocation(prog, "aP");
        buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      } catch (e) { console.warn("sjön:", e.message); prog = null; }
    }
    const nu = () => (performance.now() - t0) / 1000;
    // horisonten och månen följer skärmens form (i liggande läge lägre horisont, i stående högre)
    function lage() {
      const W = innerWidth, H = innerHeight, asp = W / H;
      const hy = asp > 1.2 ? 0.40 : 0.36;
      return { asp, hy, mx: 0.5, my: hy - (asp > 1.2 ? 0.17 : 0.12), mr: asp > 1.2 ? 0.032 : 0.024 };
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
      gl.viewport(0, 0, w, h); gl.useProgram(prog);
      gl.uniform2f(u.uRes, w, h); gl.uniform1f(u.uT, nu()); gl.uniform1f(u.uHy, L.hy); gl.uniform1f(u.uAsp, L.asp);
      gl.uniform1f(u.uMx, L.mx); gl.uniform1f(u.uMy, L.my); gl.uniform1f(u.uMr, L.mr);
      gl.uniform1f(u.uN, n); gl.uniform4fv(u.uD, D); gl.uniform3fv(u.uC, C);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(u.aP); gl.vertexAttribPointer(u.aP, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    return {
      visa(pa) { aktiv = !!pa; cv.style.display = aktiv ? "block" : "none"; },
      // en ton: en droppe där tonen ligger (f 0..1 över tangentbordet), en bit ut i sjön, i tonens färg
      anslag(nt, f, farg) {
        const z = 2.6 + Math.random() * 3.6;
        const c = farg.map((v) => v / 255);
        droppe(f, z, 1.0, c);
      },
      tick(S) {
        if (!aktiv) return;
        // sjön lever även när ingen spelar: en liten droppe då och då, långt ut
        const t = nu();
        if (t > lugn) { if (lugn > 0) droppe(0.2 + Math.random() * 0.6, 7 + Math.random() * 5, 0.35, [0.4, 0.6, 0.9]); lugn = t + 3 + Math.random() * 5; }
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
        return { vatten: vatten / Math.max(1, nv), droppar: n };
      },
      klar() { return !!(gl && prog); },
      webgl: !!(gl && prog),
    };
  }
  return { create };
})();
