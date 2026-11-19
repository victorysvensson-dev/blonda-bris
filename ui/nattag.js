// BLONDA BRIS – den hemliga patchen NATTÅGET: utsikten genom ett tågfönster en regnig natt, räknat i realtid (WebGL).
// Ute glider landskapet förbi i lager: stadens ljus långt bort (långsamt), en skogskant, banvallen och lyktstolpar
// som susar förbi. Rutan är immig och full av regndroppar som bryter ljuset (varje droppe är en liten upp-och-ner-lins),
// och några droppar rinner ner och lämnar ett klart spår. Varje ton blir ett ljus som far förbi i tonens färg (höga
// toner högre upp); arpens slag blir en rad ljus i rälsens takt. Tåget skakar lätt vid skarvarna. Halv upplösning.
"use strict";
const Nattag = (() => {
  const MAX = 16;
  const VS = `attribute vec2 aP; varying vec2 vUv; void main() { vUv = vec2(aP.x, 1.0 - aP.y); gl_Position = vec4(aP * 2.0 - 1.0, 0.0, 1.0); }`;
  const FS = `precision highp float;
    varying vec2 vUv;                    // 0..1, y nedåt
    uniform float uT, uAsp, uN;
    uniform vec4 uP[${MAX}];             // ljus: höjd (0..1), starttid, avstånd (0 nära .. 1 långt bort), styrka
    uniform vec3 uC[${MAX}];             // ljusets färg
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    // ett ljus i rörelse: en mjuk punkt som dras ut i sidled (rörelseoskärpa) L åt vardera hållet
    float strek(vec2 p, vec2 c, float r, float L) { vec2 d = p - c; d.x = max(abs(d.x) - L, 0.0); return exp(-dot(d, d) / (r * r)); }
    // en bokeh-skiva (ljus ur fokus): fylld cirkel med mjuk kant
    float skiva(vec2 p, vec2 c, float r) { return 1.0 - smoothstep(r * 0.7, r, length(p - c)); }

    // landskapet utanför; p.x 0..uAsp, p.y 0..1 uppåt; bl = hur suddigt (0 skarpt genom en droppe, 1 genom imman)
    vec3 ute(vec2 p, float bl) {
      float t = uT, hz = 0.42;
      vec3 c = mix(vec3(0.03, 0.034, 0.06), vec3(0.008, 0.009, 0.018), smoothstep(hz, 1.0, p.y));
      c += vec3(0.16, 0.085, 0.035) * exp(-max(p.y - hz, 0.0) * 7.0) * (0.5 + 0.5 * noise(vec2(p.x * 0.7 + t * 0.012, 1.0)));
      // stadens ljus långt bort: glider långsamt
      float sx = p.x + t * 0.03, cw = 0.06, ci = floor(sx / cw);
      for (int k = -1; k <= 1; k++) {
        float cc = ci + float(k);
        for (int j = 0; j < 3; j++) {
          float fj = float(j), hj = hash(vec2(cc, fj * 7.3));
          if (hj < 0.2) continue;
          vec2 lc = vec2((cc + hash(vec2(cc, fj + 1.1))) * cw, hz + 0.004 + 0.06 * pow(hash(vec2(cc, fj + 2.3)), 2.0));
          float r = 0.0022 + bl * 0.014;
          vec3 lf = hash(vec2(cc, fj + 3.7)) > 0.8 ? vec3(0.7, 0.82, 1.0) : vec3(1.0, 0.7, 0.38);
          c += lf * skiva(vec2(sx, p.y), lc, r) * (0.5 + 0.7 * hj) * min(2.0, 0.008 / r);
        }
      }
      // skogskanten: går fortare
      float mx = p.x + t * 0.12;
      float hh = hz + 0.008 + 0.04 * noise(vec2(mx * 2.2, 0.0)) + 0.022 * noise(vec2(mx * 9.0, 3.0)) + 0.012 * noise(vec2(mx * 38.0, 5.0));
      float e = 0.002 + bl * 0.014;
      c = mix(c, vec3(0.007, 0.008, 0.011), 1.0 - smoothstep(hh - e, hh + e, p.y));
      // banvallen närmast: grus som susar förbi i streck
      float nv = smoothstep(0.24, 0.0, p.y);
      c += vec3(0.022, 0.019, 0.016) * noise(vec2(p.x * 2.0 + t * 2.2, p.y * 70.0)) * nv * (1.0 - 0.5 * bl);
      // lyktstolpar: en med jämna mellanrum, nära och snabb
      float lx = p.x + t * 1.5, per = 1.15, li = floor(lx / per), lpx = (li + 0.5) * per;
      float pw = 0.022 + bl * 0.012, post = (1.0 - smoothstep(pw * 0.5, pw, abs(lx - lpx))) * step(p.y, 0.8);
      c = mix(c, vec3(0.003), post * 0.65);
      vec2 lp = vec2(lx, p.y) - vec2(lpx, 0.8);
      c += vec3(1.0, 0.76, 0.46) * (strek(vec2(lx, p.y), vec2(lpx, 0.8), 0.007 + bl * 0.022, 0.05) * 1.5 + exp(-length(lp) * 7.0) * 0.12);
      // tonernas ljus: far förbi från höger till vänster, de nära fort och stora, de långt bort långsamt och små
      for (int i = 0; i < ${MAX}; i++) {
        if (float(i) >= uN) break;
        vec4 q = uP[i]; float age = t - q.y;
        if (age < 0.0) continue;
        float v = mix(1.6, 0.2, q.z), x = uAsp + 0.25 - age * v;
        if (x < -0.4) continue;
        vec2 lc = vec2(x, q.x);
        float r = mix(0.011, 0.0035, q.z) + bl * mix(0.03, 0.012, q.z);
        float g = strek(p, lc, r, v * 0.028) * 1.5 + exp(-length(p - lc) * mix(7.0, 22.0, q.z)) * 0.22;
        c += uC[i] * g * q.w * mix(1.0, 0.55, q.z);
      }
      return c;
    }

    // stilla droppar i ett rutnät: riktning från droppens mitt (i radier) och täckning
    vec3 droppar(vec2 uv, float tat, float seed) {
      vec2 g = uv * tat, id = floor(g), f = fract(g) - 0.5;
      if (hash(id + seed) < 0.4) return vec3(0.0);
      vec2 o = (vec2(hash(id + seed + 3.1), hash(id + seed + 5.7)) - 0.5) * 0.5;
      float r = 0.1 + 0.22 * hash(id + seed + 9.2);
      vec2 d = (f - o) / r; d.y *= 1.1;
      return vec3(d, 1.0 - smoothstep(0.8, 1.0, length(d)));
    }
    // droppar som rinner ner i några kolumner; z = täckning, w = det klara spåret de lämnar efter sig
    vec4 rinner(vec2 uv) {
      float kol = floor(uAsp * 7.0), cx = floor(uv.x / uAsp * kol), hx = hash(vec2(cx, 41.0));
      if (hx < 0.5) return vec4(0.0);
      float fart = 0.06 + 0.12 * hash(vec2(cx, 42.0)), langd = 1.6 + 1.4 * hash(vec2(cx, 43.0));
      float yh = 1.15 - fract(uT * fart / langd + hx * 7.0) * langd;          // huvudets höjd (rör sig nedåt)
      float bx = (cx + 0.5) / kol * uAsp + 0.012 * sin(yh * 23.0 + cx) + 0.006 * sin(yh * 61.0);
      float rr = 0.011 + 0.006 * hash(vec2(cx, 44.0));
      vec2 d = (uv - vec2(bx, yh)) / rr; d.y *= 0.85;
      float m = 1.0 - smoothstep(0.8, 1.0, length(d));
      // spåret ovanför huvudet: smala klara rännor och små kvarlämnade droppar
      float ov = uv.y - yh, spx = uv.x - (cx + 0.5) / kol * uAsp - 0.012 * sin(uv.y * 23.0 + cx) - 0.006 * sin(uv.y * 61.0);
      float spar = step(0.0, ov) * (1.0 - smoothstep(rr * 0.25, rr * 0.6, abs(spx))) * exp(-ov * 2.5);
      float sm = fract(uv.y * 34.0 + cx) - 0.5; vec2 sd = vec2(spx, sm / 34.0) / (rr * 0.4);
      float sma = step(0.0, ov) * step(0.6, hash(vec2(cx, floor(uv.y * 34.0 + cx)))) * (1.0 - smoothstep(0.7, 1.0, length(sd))) * exp(-ov * 1.5);
      if (sma > m) { d = sd; m = sma; }
      return vec4(d, m, spar);
    }

    void main() {
      vec2 s = vUv, uv = vec2(s.x * uAsp, 1.0 - s.y);
      // skakningar vid rälsskarvarna (två slag) och ett lätt gungande
      float fas = mod(uT, 1.08);
      float sk = 0.0028 * (exp(-fas * 28.0) + step(0.17, fas) * exp(-(fas - 0.17) * 28.0)) + 0.0009 * sin(uT * 2.3);
      vec2 p = uv + vec2(0.0, sk);
      vec3 d1 = droppar(uv, 26.0, 1.0), d2 = droppar(uv * vec2(1.0, 1.0) + 3.7, 11.0, 7.0);
      vec4 dr = rinner(uv);
      vec3 dd = d1; float rad = 1.0 / 26.0;
      if (d2.z > dd.z) { dd = d2; rad = 1.0 / 11.0 * 0.32; }
      if (dr.z > dd.z) { dd = dr.xyz; rad = 0.014; }
      float imma = 1.0 - 0.55 * dr.w;
      vec3 bak = ute(p, imma) * (0.8 + 0.2 * dr.w);
      vec3 c = bak;
      if (dd.z > 0.01) {
        // droppen: en liten lins som visar utsikten upp och ner och skarpare, mörk kant och en glimt upptill
        vec2 n = dd.xy; float l = length(n);
        vec3 lins = ute(p - n * rad * 3.2 + vec2(0.0, rad * 0.6), 0.12) * (0.95 - 0.45 * pow(l, 3.0));
        lins += vec3(0.5, 0.45, 0.4) * pow(max(0.0, 1.0 - length(n - vec2(-0.35, 0.45)) * 2.6), 3.0) * 0.5;
        c = mix(bak, lins, dd.z);
      }
      // kupéns varma sken som speglas svagt i rutan, och fönsterkarmens mörka kanter
      c += vec3(0.05, 0.03, 0.012) * smoothstep(0.55, 1.0, s.y) * (0.6 + 0.4 * s.x);
      vec2 q = abs(s - 0.5) * 2.0;
      c *= 1.0 - 0.6 * smoothstep(0.72, 1.08, length(pow(q, vec2(4.0))) * 0.5 + max(q.x, q.y) * 0.5);
      gl_FragColor = vec4(c, 1.0);
    }`;

  function create(parent) {
    const cv = document.createElement("canvas"); cv.id = "nattag"; cv.className = "himmel";
    parent.prepend(cv);   // först i body: appen ritas ovanpå
    const gl = cv.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
    let prog = null, u = {}, buf = null, aktiv = false, lugn = 0;
    const t0 = performance.now(), P = new Float32Array(MAX * 4), C = new Float32Array(MAX * 3); let n = 0, pos = 0;
    if (gl) {
      try {
        const sh = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        for (const k of ["uT", "uAsp", "uN", "uP", "uC"]) u[k] = gl.getUniformLocation(prog, k);
        u.aP = gl.getAttribLocation(prog, "aP");
        buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      } catch (e) { console.warn("nattag:", e.message); prog = null; }
    }
    const nu = () => (performance.now() - t0) / 1000;
    // ett ljus som far förbi: höjd 0..1, avstånd 0 (nära) .. 1 (långt bort)
    function ljus(hojd, avst, styrka, farg) { P.set([hojd, nu(), avst, styrka], pos * 4); C.set(farg, pos * 3); pos = (pos + 1) % MAX; n = Math.min(MAX, n + 1); }
    // hur många ljus som syns i fönstret just nu
    function synliga() {
      const t = nu(), asp = innerWidth / innerHeight; let k = 0;
      for (let i = 0; i < n; i++) { const age = t - P[i * 4 + 1], v = 1.6 + (0.2 - 1.6) * P[i * 4 + 2], x = asp + 0.25 - age * v; if (age >= 0 && x > -0.4) k++; }
      return k;
    }
    function rita() {
      const dpr = Math.min(2, window.devicePixelRatio || 1) * 0.5;
      const w = Math.max(2, Math.round(cv.clientWidth * dpr)), h = Math.max(2, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      if (!gl || !prog) return;
      gl.viewport(0, 0, w, h); gl.useProgram(prog);
      gl.uniform1f(u.uT, nu()); gl.uniform1f(u.uAsp, w / h);
      gl.uniform1f(u.uN, n); gl.uniform4fv(u.uP, P); gl.uniform3fv(u.uC, C);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(u.aP); gl.vertexAttribPointer(u.aP, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    return {
      visa(pa) { aktiv = !!pa; cv.style.display = aktiv ? "block" : "none"; },
      // en ton: ett ljus i tonens färg far förbi, högre upp ju högre tonen är (f 0..1 över tangentbordet)
      // (låga toner natriumgula som gatlyktorna, höga kallt vita som signaler långt bort)
      anslag(nt, f, farg) {
        const t = Math.min(1, Math.max(0, (nt - 36) / 60)), a = [1.0, 0.6, 0.24], b = [1.0, 0.86, 0.66], c = [0.68, 0.8, 1.0];
        const k = t < 0.5 ? a.map((v, i) => v + (b[i] - v) * t * 2) : b.map((v, i) => v + (c[i] - v) * (t - 0.5) * 2);
        ljus(0.3 + 0.5 * f, Math.random() * 0.85, 1.0, k.map((v, i) => v * 0.7 + (farg[i] / 255) * 0.3));
      },
      tick() {
        if (!aktiv) return;
        const t = nu();   // även när ingen spelar: ett svagt ljus långt bort då och då (en gård, en station)
        if (t > lugn) { if (lugn > 0) ljus(0.44 + Math.random() * 0.1, 0.6 + Math.random() * 0.4, 0.5, [1.0, 0.8, 0.55]); lugn = t + 2 + Math.random() * 4; }
        rita();
      },
      // tester: medelljuset (0..255), hur varmt det är (röd minus blå) och hur många ljus som syns
      matt() {
        rita(); if (!gl || !prog) return null;
        const w = cv.width, h = cv.height, px = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let ljus = 0, varm = 0, k = 0;
        for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const i = (y * w + x) * 4; ljus += (px[i] + px[i + 1] + px[i + 2]) / 3; varm += px[i] - px[i + 2]; k++; }
        return { ljus: ljus / Math.max(1, k), varm: varm / Math.max(1, k), ljusen: synliga() };
      },
      klar() { return !!(gl && prog); },
    };
  }
  return { create };
})();
