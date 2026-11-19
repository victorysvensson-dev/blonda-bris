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
        float yb = uHy - 0.2 - 0.07 * fi + 0.06 * sin(x * (0.9 + 0.3 * fi) + t * 0.05 + fi * 2.1)
                   + 0.035 * (noise(vec2(x * 1.7 + t * 0.03, fi * 5.0)) - 0.5) + vg;
        float d = yb - s.y;                                         // över slöjans nederkant: > 0
        float upp = d > 0.0 ? exp(-d * (5.0 + 2.0 * fi)) : exp(d * 70.0);
        float stralar = 0.45 + 0.55 * pow(noise(vec2(x * 38.0 + t * 0.25 + fi * 13.0, fi * 3.0 + t * 0.05)), 2.0);
        float veck = 0.35 + 0.65 * smoothstep(0.15, 0.85, noise(vec2(x * 1.4 - t * 0.07 + fi * 7.0, 2.0 + fi)));
        float b = upp * stralar * veck * (0.85 - 0.22 * fi) * (1.0 + pu.w * 2.2);
        vec3 gron = vec3(0.12, 0.95, 0.48), lila = vec3(0.55, 0.22, 0.85);
        vec3 f = mix(gron, lila, smoothstep(0.02, 0.2, d)) + pu.rgb / max(pu.w, 0.001) * min(pu.w, 1.0) * 0.35 * exp(-max(d, 0.0) * 6.0);
        c += f * b * 0.55;
      }
      return c;
    }
    // fjällen: toppar som vassa kägelformer (en topp per cell, den högsta vid x vinner) med lite ojämnhet.
    // Ger höjden, toppens x och toppens höjd.
    vec3 berg(float x, float seed, float w, float hmax) {
      float c = floor(x / w); vec3 b = vec3(-1.0, 0.0, 0.0);
      for (int k = -1; k <= 1; k++) {
        float ck = c + float(k);
        float pc = (ck + 0.2 + 0.6 * hash(vec2(ck, seed))) * w;
        float hc = hmax * (0.4 + 0.6 * hash(vec2(ck, seed + 1.7)));
        float dx = x - pc, bredd = w * (dx < 0.0 ? 0.6 + 0.5 * hash(vec2(ck, seed + 4.1)) : 0.6 + 0.5 * hash(vec2(ck, seed + 5.3)));
        float h = hc * pow(max(0.0, 1.0 - abs(dx) / bredd), 1.5);   // brant upptill, flackare nertill
        if (h > b.x) b = vec3(h, pc, hc);
      }
      b.x += 0.006 * (noise(vec2(x * 28.0, seed)) - 0.5) + 0.0025 * noise(vec2(x * 95.0, seed));
      return b;
    }
    // färgen på ett fjäll: snö som strålar ner från toppen i rännor, mörka klippor emellan och längre ner, den sida
    // som vetter mot norrskenet (vänster) lite ljusare och toppen ljusast
    vec3 bergfarg(float x, float upp, vec3 b, float seed, vec3 sken) {
      // rännorna går snett ner från kanten (fallinjen), så de aldrig trängs ihop vid en flack kontur
      float djup = max(b.x - upp, 0.0), sx = x < b.y ? -1.0 : 1.0;
      float u = x - sx * djup * 0.55 + 0.004 * noise(vec2(x * 40.0, djup * 60.0));
      float rannor = noise(vec2(u * 45.0 + seed, djup * 8.0 + seed)) * 0.7 + noise(vec2(u * 120.0, djup * 20.0 + seed)) * 0.3;
      float topp = clamp(upp / max(b.z, 0.01), 0.0, 1.0);
      float sno = smoothstep(0.36, 0.74, rannor * 0.72 + topp * 0.5);
      float sida = x < b.y ? 1.0 : 0.6;
      vec3 snof = (vec3(0.12, 0.155, 0.2) + sken * 0.45) * sida * (0.65 + 0.35 * topp);
      vec3 klippa = vec3(0.01, 0.013, 0.018) + sken * 0.03 * sida;
      return mix(klippa, snof, sno);
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
      c += nk;
      // norrskenets ljus på snön: hur starkt det lyser rakt ovanför fjällen
      vec3 sken = norrsken(vec2(s.x, uHy - 0.24), pu, vg) * 1.4 + vec3(0.02, 0.03, 0.05);
      vec3 b1 = berg(x, 3.0, 0.32, 0.16), b2 = berg(x + 0.7, 11.0, 0.22, 0.1);
      float aa = 0.0015 / skarpa;
      if (upp < b1.x + aa && upp > -0.01) {   // bortre raden: disig
        vec3 f1 = mix(bergfarg(x, upp, b1, 3.0, sken), c + vec3(0.01, 0.02, 0.03), 0.55);
        c = mix(c, f1, smoothstep(b1.x + aa, b1.x - aa, upp));
      }
      if (upp < b2.x + aa && upp > -0.01) {   // närmre raden
        c = mix(c, bergfarg(x + 0.7, upp, b2, 11.0, sken), smoothstep(b2.x + aa, b2.x - aa, upp));
      }
      // strandens snö längs vattnet: en tunn, svag kant
      if (upp >= 0.0 && upp < 0.004) c = mix(c, vec3(0.08, 0.1, 0.13) + sken * 0.2, 0.6 * smoothstep(0.004, 0.0015, upp));
      return c;
    }
    void main() {
      vec2 s = vUv;
      if (s.y < uHy) { gl_FragColor = vec4(himmel(s, 1.0), 1.0); return; }
      // sjön: en stilla yta som speglar himlen, med svaga krusningar som blir lugnare långt bort
      float d = s.y - uHy;
      float kr = (noise(vec2(s.x * uAsp * 30.0, d * 120.0 - uT * 0.6)) - 0.5) * 0.004 * smoothstep(0.0, 0.25, d);
      vec2 sp = vec2(s.x + kr * 0.5, uHy - d * 1.0 + kr);
      vec3 c = himmel(sp, 0.55) * (0.55 + 0.25 * smoothstep(0.0, 0.3, d)) + vec3(0.004, 0.008, 0.012);
      c *= 1.0 - 0.35 * smoothstep(0.35, 0.6, d);   // mörkare närmast tangentbordet
      gl_FragColor = vec4(c, 1.0);
    }`;

  function create(parent) {
    const cv = document.createElement("canvas"); cv.id = "norrsken"; cv.className = "himmel";
    parent.prepend(cv);   // först i body: appen ritas ovanpå
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
    let prog = null, u = {}, buf = null, aktiv = false, lugn = 0;
    const t0 = performance.now(), P = new Float32Array(MAX * 4), C = new Float32Array(MAX * 3); let n = 0, pos = 0;
    if (gl) {
      try {
        const sh = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        for (const k of ["uT", "uHy", "uAsp", "uN", "uP", "uC"]) u[k] = gl.getUniformLocation(prog, k);
        u.aP = gl.getAttribLocation(prog, "aP");
        buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      } catch (e) { console.warn("norrsken:", e.message); prog = null; }
    }
    const nu = () => (performance.now() - t0) / 1000;
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
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(u.aP); gl.vertexAttribPointer(u.aP, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    return {
      visa(pa) { aktiv = !!pa; cv.style.display = aktiv ? "block" : "none"; },
      // en ton: slöjan flammar upp där tonen ligger (f 0..1 över tangentbordet), i tonens färg
      anslag(nt, f, farg) { puls(f, 1.0, farg.map((v) => v / 255)); },
      tick() {
        if (!aktiv) return;
        const t = nu();   // norrskenet lever även när ingen spelar: en svag puls då och då
        if (t > lugn) { if (lugn > 0) puls(0.15 + Math.random() * 0.7, 0.35, [0.3, 1.0, 0.6]); lugn = t + 4 + Math.random() * 6; }
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
        return { himmel: himmel / Math.max(1, nh), gron: gron / Math.max(1, nh), pulser: n };
      },
      klar() { return !!(gl && prog); },
    };
  }
  return { create };
})();
