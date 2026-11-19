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
        float b = upp * stralar * veck * (0.85 - 0.22 * fi) * (1.0 + pu.w * 2.2);
        vec3 gron = vec3(0.12, 0.95, 0.48), lila = vec3(0.55, 0.22, 0.85);
        vec3 f = mix(gron, lila, smoothstep(0.02, 0.2, d)) + pu.rgb / max(pu.w, 0.001) * min(pu.w, 1.0) * 0.35 * exp(-max(d, 0.0) * 6.0);
        c += f * b * 0.55;
      }
      return c;
    }
    // fjällen: renderade i Blender (tools/norrsken_fjall.py) i två pass, ett med himlens svaga ljus och ett med vitt
    // ljus uppifrån som färgas med norrskenets färg. ty 0 vid stranden .. 1 överst i remsan; ger färg och täckning.
    // uFjM: kb, ks (passens skalning), remsans bredd/höjd, remsans höjd i bilden (andel av hela höjden)
    vec4 fjall(float x, float upp, vec3 sken) {
      float ty = upp / uFjH;
      if (ty < -0.01 || ty > 1.0) return vec4(0.0);
      float tx = 0.5 + (x - uAsp * 0.5) / (uFjH * uFjM.z), m = 0.6 / 512.0;
      vec4 b = texture2D(uFj, vec2(tx, min(0.5 - m, 0.5 - ty * uFjM.w)));
      vec4 k = texture2D(uFj, vec2(tx, max(0.5 + m, 0.5 + ty * uFjM.w)));
      vec3 ljus = mix(vec3(dot(sken, vec3(0.3, 0.5, 0.2))), sken, 0.55);   // snön är vit: bara en ton av norrskenets färg
      vec3 lin = pow(b.rgb, vec3(2.2)) / uFjM.x * uFjG.x + pow(k.rgb, vec3(2.2)) / uFjM.y * ljus * uFjG.y;
      return vec4(lin, b.a);
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

  // meta: ui/norrsken/norrsken.json (bild, w, halv, hs, kb, ks), bas: katalogen bilden ligger i
  function create(parent, meta, bas) {
    const cv = document.createElement("canvas"); cv.id = "norrsken"; cv.className = "himmel";
    parent.prepend(cv);   // först i body: appen ritas ovanpå
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
    let prog = null, u = {}, buf = null, aktiv = false, lugn = 0, tex = null, fjallKlar = false;
    const M = meta || { w: 2048, halv: 256, hs: 196, kb: 1, ks: 1 }, A = M.w / M.hs;
    const t0 = performance.now(), P = new Float32Array(MAX * 4), C = new Float32Array(MAX * 3); let n = 0, pos = 0;
    if (gl) {
      try {
        const sh = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        for (const k of ["uT", "uHy", "uAsp", "uN", "uP", "uC", "uFj", "uFjM", "uFjG", "uFjH"]) u[k] = gl.getUniformLocation(prog, k);
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
      // fjällremsan: lika hög som förut på liggande skärmar, men alltid minst så hög att den täcker hela bredden
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.uFj, 0);
      gl.uniform4f(u.uFjM, M.kb, M.ks, A, M.hs / (2 * M.halv)); gl.uniform2f(u.uFjG, 1.6, 1.5);
      gl.uniform1f(u.uFjH, Math.max(L.asp > 1.2 ? 0.2 : 0.17, L.asp / A * 1.02));
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
      klar() { return !!(gl && prog && fjallKlar); },
    };
  }
  return { create };
})();
