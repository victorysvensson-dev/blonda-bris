// BLONDA BRIS – växterna. Varje kategori av ljud är en egen växt, ritad med kod (inga bilder):
// kronblad byggs av tusentals fina fibrer som i silke, och växten rör sig med ljudet:
// den andas med volymhöljet, öppnar sig med filtret, vajar med LFO:n och släpper pollen när toner spelas.
// Varje ljud inom en kategori får sin egen variant (färgton, vinklar, storlek) från ljudets nummer.
"use strict";

const Vaxter = (() => {
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- hjälpare
  function rng(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  // färg: [h, s, l, a] -> css, med färgtonsförskjutning
  let hueShift = 0;
  const C = (h, s, l, a = 1) => `hsla(${(h + hueShift).toFixed(1)},${s}%,${l}%,${a})`;
  function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  // kronbladsformer: bredd (0..1) längs bladet t = 0 (bas) .. 1 (spets)
  const FORM = {
    obovat: (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.0)), 0.55) * (0.3 + 0.7 * Math.pow(t, 0.7)),
    lans: (t) => Math.pow(Math.sin(Math.PI * t), 0.85) * (1 - 0.35 * t),
    ovat: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.7),
    rem: (t) => Math.pow(Math.sin(Math.PI * t), 0.3) * (1 - 0.5 * t * t),
    rund: (t) => Math.pow(Math.sin(Math.PI * t), 0.5),
    spets: (t) => Math.pow(Math.sin(Math.PI * t), 1.2) * (1 - 0.2 * t),
  };

  function canvas(w, h) { const c = document.createElement("canvas"); c.width = Math.max(2, Math.ceil(w)); c.height = Math.max(2, Math.ceil(h)); return c; }

  // ---------------------------------------------------------------- ett kronblad / blad som bild
  // o: len, wid (px), form, bend (sidböj, andel av len), ruffle, freq, cols [bas, mitt, spets], edge, throat, fib, fibA,
  //    alpha, veins (blad: mittnerv + sidonerver), shadow
  function petal(o, rnd) {
    const len = o.len, wid = o.wid, bend = o.bend || 0;
    const pad = Math.ceil(wid * 0.25 + Math.abs(bend) * len + 18);
    const W = wid + pad * 2, H = len + pad * 2;
    const cv = canvas(W, H), g = cv.getContext("2d");
    const bx = W / 2, by = H - pad;
    const form = FORM[o.form || "obovat"];
    const N = 72, ruf = o.ruffle || 0, fq = o.freq || 7;
    const ph1 = rnd() * 10, ph2 = rnd() * 10;
    const cx = (t) => bend * len * t * t;
    const hw = (t, side) => {
      const w = (wid / 2) * form(t);
      const r = ruf * (Math.sin(t * fq * TAU * 0.5 + (side < 0 ? ph1 : ph2)) * 0.6 + Math.sin(t * fq * TAU * 1.3 + ph2) * 0.4);
      return w * (1 + r * Math.pow(t, 0.6));
    };
    const pts = [];
    for (let i = 0; i <= N; i++) { const t = i / N; pts.push([bx + cx(t) - hw(t, -1), by - t * len]); }
    for (let i = N; i >= 0; i--) { const t = i / N; pts.push([bx + cx(t) + hw(t, 1), by - t * len]); }
    const path = new Path2D();
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; path.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    path.closePath();

    // mjuk skugga bakom bladet
    if (o.shadow !== false) {
      g.save();
      g.shadowColor = "rgba(70,40,50,0.16)"; g.shadowBlur = Math.max(6, wid * 0.08); g.shadowOffsetX = wid * 0.02; g.shadowOffsetY = wid * 0.05;
      g.fillStyle = "rgba(0,0,0,0.12)"; g.fill(path); g.restore();
      g.save(); g.globalCompositeOperation = "destination-out"; g.fill(path); g.restore();
    }
    g.save();
    g.globalAlpha = o.alpha ?? 0.96;
    const lg = g.createLinearGradient(0, by, 0, by - len);
    const cols = o.cols;
    lg.addColorStop(0, cols[0]); lg.addColorStop(0.45, cols[1]); lg.addColorStop(1, cols[2]);
    g.fillStyle = lg; g.fill(path);
    g.clip(path);
    g.globalAlpha = 1;
    // svalg / bas
    if (o.throat) {
      const rg = g.createRadialGradient(bx, by, 0, bx, by, len * (o.throat.r || 0.45));
      rg.addColorStop(0, o.throat.c); rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    // fibrer (silke) eller nerver (blad)
    const F = o.fib ?? Math.round(wid / 2.2);
    const fl = o.fibLight || "rgba(255,255,255,1)", fd = o.fibDark || "rgba(60,20,60,1)";
    g.lineCap = "round";
    for (let k = 0; k < F; k++) {
      const u = ((k + rnd() * 0.8) / F) * 2 - 1;
      const light = rnd() < 0.55;
      g.strokeStyle = light ? fl : fd;
      g.globalAlpha = (light ? 0.10 : 0.07) * (o.fibA ?? 1) * (0.4 + rnd() * 1.2);
      g.lineWidth = 0.5 + rnd() * 1.1;
      const end = 0.94 + rnd() * 0.08, wob = rnd() * 6, wa = 0.012 + rnd() * 0.02;
      g.beginPath();
      for (let i = 0; i <= 26; i++) {
        const t = (i / 26) * end;
        const side = u < 0 ? -1 : 1;
        const x = bx + cx(t) + u * hw(t, side) * (0.97 + Math.sin(t * 8 + wob) * wa);
        const y = by - t * len;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    // tvärljus: ljusare mot ena kanten, mörkare mitt
    g.globalAlpha = 1;
    const sg = g.createLinearGradient(bx - wid / 2, 0, bx + wid / 2, 0);
    sg.addColorStop(0, "rgba(255,255,255,0.22)"); sg.addColorStop(0.42, "rgba(255,255,255,0)"); sg.addColorStop(0.5, "rgba(40,10,40,0.06)");
    sg.addColorStop(0.62, "rgba(255,255,255,0)"); sg.addColorStop(1, "rgba(30,10,30,0.08)");
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
    if (o.veins) {
      g.strokeStyle = o.veins; g.globalAlpha = 0.55; g.lineWidth = Math.max(1, wid * 0.012);
      g.beginPath();
      for (let i = 0; i <= 30; i++) { const t = (i / 30) * 0.97; const x = bx + cx(t), y = by - t * len; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      g.lineWidth = Math.max(0.7, wid * 0.006); g.globalAlpha = 0.35;
      const n = o.veinN || 7;
      for (let s = -1; s <= 1; s += 2) for (let k = 1; k <= n; k++) {
        const t0 = k / (n + 1) * 0.85;
        g.beginPath(); g.moveTo(bx + cx(t0), by - t0 * len);
        const t1 = Math.min(0.99, t0 + 0.2);
        g.quadraticCurveTo(bx + cx(t0) + s * hw(t0 + 0.05, s) * 0.55, by - (t0 + 0.06) * len, bx + cx(t1) + s * hw(t1, s) * 0.88, by - t1 * len);
        g.stroke();
      }
    }
    g.restore();
    // kant
    if (o.edge) { g.save(); g.strokeStyle = o.edge; g.globalAlpha = o.edgeA ?? 0.55; g.lineWidth = o.edgeW || 1.2; g.stroke(path); g.restore(); }
    return { cv, ax: bx, ay: by };
  }

  // ---------------------------------------------------------------- påskliljans trumpet (sedd framifrån)
  function cup(r, cols, rnd) {
    const W = r * 2.6, H = r * 2.6, cv = canvas(W, H), g = cv.getContext("2d");
    const cx = W / 2, cy = H / 2;
    const path = new Path2D(); const N = 90;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU;
      const rr = r * (1 + 0.06 * Math.sin(a * 11 + rnd()) + 0.03 * Math.sin(a * 23));
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i ? path.lineTo(x, y) : path.moveTo(x, y);
    }
    path.closePath();
    g.save(); g.shadowColor = "rgba(90,50,0,0.22)"; g.shadowBlur = r * 0.25; g.shadowOffsetY = r * 0.08;
    const rg = g.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    rg.addColorStop(0, cols[0]); rg.addColorStop(0.55, cols[1]); rg.addColorStop(1, cols[2]);
    g.fillStyle = rg; g.fill(path); g.restore();
    g.save(); g.clip(path);
    for (let k = 0; k < 160; k++) {
      const a = rnd() * TAU; g.strokeStyle = rnd() < 0.5 ? "rgba(255,255,230,1)" : "rgba(160,70,0,1)";
      g.globalAlpha = 0.06 + rnd() * 0.1; g.lineWidth = 0.6 + rnd();
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.22, cy + Math.sin(a) * r * 0.22); g.lineTo(cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 1.05); g.stroke();
    }
    g.globalAlpha = 1;
    const ig = g.createRadialGradient(cx, cy, 0, cx, cy, r * 0.42);
    ig.addColorStop(0, "rgba(120,60,0,0.45)"); ig.addColorStop(1, "rgba(120,60,0,0)");
    g.fillStyle = ig; g.fillRect(0, 0, W, H);
    g.restore();
    g.strokeStyle = "rgba(255,240,200,0.8)"; g.lineWidth = 1.4; g.stroke(path);
    return { cv, ax: cx, ay: cy };
  }

  // maskrosens frökula (statisk bild som vrids)
  function seedHead(r, rnd, cols) {
    const W = r * 2.7, cv = canvas(W, W), g = cv.getContext("2d");
    const c = W / 2, n = 170, ga = Math.PI * (3 - Math.sqrt(5));
    const seeds = [];
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2, rr = Math.sqrt(1 - y * y), th = ga * i;
      seeds.push([Math.cos(th) * rr, y, Math.sin(th) * rr]);
    }
    seeds.sort((a, b) => a[2] - b[2]);
    g.lineCap = "round";
    for (const s of seeds) {
      const depth = (s[2] + 1) / 2;
      const ex = c + s[0] * r, ey = c + s[1] * r;
      g.strokeStyle = cols.stalk; g.globalAlpha = 0.25 + depth * 0.45; g.lineWidth = 0.7;
      g.beginPath(); g.moveTo(c + s[0] * r * 0.14, c + s[1] * r * 0.14); g.lineTo(ex, ey); g.stroke();
      const pr = r * (0.13 + 0.04 * rnd());
      const base = Math.atan2(s[1], s[0]);
      g.strokeStyle = cols.pappus; g.globalAlpha = 0.22 + depth * 0.5; g.lineWidth = 0.6;
      for (let k = 0; k < 13; k++) {
        const a = base + (k / 12 - 0.5) * 2.6 + (rnd() - 0.5) * 0.15;
        g.beginPath(); g.moveTo(ex, ey); g.quadraticCurveTo(ex + Math.cos(a) * pr * 0.6, ey + Math.sin(a) * pr * 0.6 - pr * 0.08, ex + Math.cos(a) * pr, ey + Math.sin(a) * pr); g.stroke();
      }
      g.fillStyle = cols.dot; g.globalAlpha = 0.35 + depth * 0.4;
      g.beginPath(); g.arc(ex, ey, 0.9, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    const rg = g.createRadialGradient(c, c, 0, c, c, r * 0.16);
    rg.addColorStop(0, cols.core); rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.beginPath(); g.arc(c, c, r * 0.16, 0, TAU); g.fill();
    return { cv, ax: c, ay: c };
  }
  function seed(px) {
    const W = px * 2.4, cv = canvas(W, W), g = cv.getContext("2d"), c = W / 2;
    g.strokeStyle = "rgba(120,100,80,0.6)"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(c, c + px * 0.9); g.lineTo(c, c); g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 0.6;
    for (let k = 0; k < 14; k++) { const a = -Math.PI / 2 + (k / 13 - 0.5) * 2.8; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * px, c + Math.sin(a) * px); g.stroke(); }
    return { cv, ax: c, ay: c };
  }
  function floret(px, cols, rnd) {
    const W = px * 3, cv = canvas(W, W), g = cv.getContext("2d"), c = W / 2;
    g.fillStyle = cols[2]; g.globalAlpha = 0.9;
    g.beginPath(); g.ellipse(c, c + px * 0.35, px * 0.32, px * 0.55, 0, 0, TAU); g.fill();
    for (let k = 0; k < 4; k++) {
      const a = -Math.PI / 2 + (k - 1.5) * 0.65 + (rnd() - 0.5) * 0.2;
      const x = c + Math.cos(a) * px * 0.55, y = c + Math.sin(a) * px * 0.45;
      const rg = g.createRadialGradient(x, y, 0, x, y, px * 0.55);
      rg.addColorStop(0, cols[0]); rg.addColorStop(1, cols[1]);
      g.fillStyle = rg; g.globalAlpha = 0.95;
      g.beginPath(); g.ellipse(x, y, px * 0.42, px * 0.34, a, 0, TAU); g.fill();
    }
    return { cv, ax: c, ay: c };
  }

  // ---------------------------------------------------------------- arterna
  // Alla mått i R (växtens radie). En del: { s: bild, x, y, a (vinkel, 0 = upp, medurs), sx, sy, z, sw (vajning), ph, op (öppning), g (grupp) }
  // Scen: { parts, groups, stems: [{pts, w, c0, c1}], back(ctx,R,t,sig), front(ctx,R,t,sig) }
  const ART = {};

  function P(sc, R, rnd, d, x, y, a, extra = {}) {
    const o = Object.assign({}, d, { len: d.len * R * (0.95 + rnd() * 0.1), wid: d.wid * R * (0.95 + rnd() * 0.1) });
    const s = petal(o, rnd);
    sc.parts.push(Object.assign({ s, x, y, a: a + (rnd() - 0.5) * 0.08, sx: 1, sy: 1, z: 0, sw: 0.025 + rnd() * 0.02, ph: rnd() * TAU, op: 0.08 }, extra));
  }
  function stem(sc, pts, w, c0, c1, z = -10) { sc.stems.push({ pts, w, c0, c1, z }); }

  ART.iris = (sc, R, rnd) => {
    stem(sc, [[0, 0.1], [0.02, 0.6], [0.06, 1.1], [0.05, 1.7]], 0.032, C(95, 22, 52), C(100, 18, 40));
    P(sc, R, rnd, { len: 1.1, wid: 0.16, form: "rem", cols: [C(110, 20, 52, 0.9), C(105, 22, 60, 0.85), C(95, 25, 72, 0.7)], fibLight: C(80, 30, 85), fibDark: C(120, 30, 25), edge: C(90, 30, 80) },
      0.05, 1.32, -0.28, { z: -9, sw: 0.015 });
    const std = { len: 0.78, wid: 0.5, form: "obovat", ruffle: 0.07, freq: 6, cols: [C(48, 70, 88), C(266, 52, 78), C(270, 58, 88)], edge: C(276, 70, 93), throat: { c: C(45, 90, 75, 0.7), r: 0.35 }, fibLight: C(280, 80, 96), fibDark: C(262, 50, 45) };
    P(sc, R, rnd, std, -0.03, 0.05, -0.46, { z: 1, op: 0.12 });
    P(sc, R, rnd, std, 0.03, 0.05, 0.46, { z: 1, op: 0.12 });
    P(sc, R, rnd, Object.assign({}, std, { len: 0.9 }), 0, 0.05, 0.02, { z: 2, op: 0.04 });
    const arm = { len: 0.4, wid: 0.17, form: "lans", cols: [C(275, 30, 88), C(272, 40, 86), C(268, 45, 82)], edge: C(270, 50, 94), fibDark: C(265, 40, 55), fibLight: C(0, 0, 100) };
    P(sc, R, rnd, arm, -0.02, 0.04, -0.95, { z: 3 });
    P(sc, R, rnd, arm, 0.02, 0.04, 0.95, { z: 3 });
    const fall = { len: 0.82, wid: 0.6, form: "obovat", ruffle: 0.06, freq: 5, cols: [C(40, 85, 68), C(266, 56, 62), C(268, 55, 74)], edge: C(272, 60, 86),
      throat: { c: C(28, 95, 55, 0.95), r: 0.42 }, fibLight: C(275, 70, 92), fibDark: C(262, 60, 32) };
    P(sc, R, rnd, Object.assign({ bend: -0.08 }, fall), -0.05, 0.04, -2.35, { z: 4, op: -0.1 });
    P(sc, R, rnd, Object.assign({ bend: 0.08 }, fall), 0.05, 0.04, 2.35, { z: 4, op: -0.1 });
    P(sc, R, rnd, Object.assign({}, fall, { len: 0.78 }), 0, 0.06, Math.PI, { z: 5, sy: 0.82, op: 0 });
    sc.beard = true;
  };

  ART.kanna = (sc, R, rnd) => {
    stem(sc, [[0, 0.55], [0.02, 0.9], [0.06, 1.25], [0.04, 1.7]], 0.026, C(28, 60, 60), C(20, 40, 45));
    const p = { form: "obovat", ruffle: 0.13, freq: 9, cols: [C(6, 82, 40), C(20, 92, 58), C(30, 88, 82)], edge: C(34, 90, 92), edgeA: 0.7,
      throat: { c: C(355, 80, 30, 0.85), r: 0.38 }, fibLight: C(35, 100, 92), fibDark: C(8, 80, 30), fib: 200 };
    P(sc, R, rnd, Object.assign({}, p, { len: 0.95, wid: 0.84, bend: -0.1 }), -0.02, 0.55, -0.62, { z: 1, op: 0.1 });
    P(sc, R, rnd, Object.assign({}, p, { len: 1.02, wid: 0.9, bend: 0.12 }), 0.02, 0.55, 0.42, { z: 2, op: 0.1 });
    P(sc, R, rnd, Object.assign({}, p, { len: 0.62, wid: 0.46 }), 0.04, 0.55, 1.2, { z: 1, op: 0.14 });
    P(sc, R, rnd, Object.assign({}, p, { len: 0.72, wid: 0.62, bend: 0.22 }), -0.03, 0.56, -1.95, { z: 3, sy: 0.85, op: -0.12 });
    P(sc, R, rnd, Object.assign({}, p, { len: 1.05, wid: 0.78, bend: -0.05, cols: [C(4, 85, 38), C(16, 92, 55), C(28, 90, 78)] }), 0, 0.56, -0.08, { z: 4, op: 0.03 });
  };

  ART.lilja = (sc, R, rnd) => {
    stem(sc, [[0.05, 0.12], [-0.12, 0.6], [-0.3, 1.1], [-0.38, 1.7]], 0.024, C(150, 12, 58), C(160, 12, 44));
    stem(sc, [[-0.6, -0.42], [-0.55, -0.1], [-0.35, 0.5], [-0.25, 0.85]], 0.016, C(165, 12, 60), C(150, 12, 50));
    P(sc, R, rnd, { len: 0.44, wid: 0.2, form: "lans", cols: [C(150, 14, 62), C(205, 30, 62), C(215, 45, 55)], edge: C(220, 40, 80), fibDark: C(220, 40, 30), fibLight: C(200, 50, 90) },
      -0.6, -0.4, -0.28, { z: -5, sw: 0.04 });
    P(sc, R, rnd, { len: 0.9, wid: 0.12, form: "rem", cols: [C(150, 14, 55, 0.85), C(160, 15, 62, 0.8), C(170, 18, 72, 0.7)], edge: C(160, 20, 82) }, -0.3, 1.15, 0.5, { z: -8, sw: 0.015 });
    sc.groups.push({ x: 0.08, y: -0.02, a: -0.12, sx: 1, sy: 0.72 });
    const t = { len: 0.74, wid: 0.36, form: "lans", bend: 0.05, cols: [C(215, 35, 95, 0.92), C(222, 60, 84, 0.86), C(225, 72, 66, 0.85)], edge: C(226, 85, 56), edgeA: 0.75, edgeW: 1.4,
      throat: { c: C(60, 60, 92, 0.7), r: 0.3 }, fibLight: C(0, 0, 100), fibDark: C(228, 70, 45), fibA: 1.3, alpha: 0.9 };
    for (let k = 0; k < 6; k++) {
      const a = k * (TAU / 6) + 0.3 + (rnd() - 0.5) * 0.15;
      P(sc, R, rnd, t, 0, 0, a, { g: 0, z: Math.cos(a) < 0 ? 4 : 1, op: 0.1 });
    }
    sc.stamens = { x: 0.08, y: -0.02, n: 6, len: 0.42, col: C(220, 15, 70), tip: C(30, 35, 45) };
  };

  ART.eukalyptus = (sc, R, rnd) => {
    const br = [[-0.78, 1.25], [-0.2, 0.55], [0.15, -0.1], [0.58, -0.9]];
    stem(sc, br, 0.022, C(20, 40, 55), C(70, 25, 55));
    sc.branch = br;
    const bez = (t) => {
      const u = 1 - t;
      const x = u * u * u * br[0][0] + 3 * u * u * t * br[1][0] + 3 * u * t * t * br[2][0] + t * t * t * br[3][0];
      const y = u * u * u * br[0][1] + 3 * u * u * t * br[1][1] + 3 * u * t * t * br[2][1] + t * t * t * br[3][1];
      return [x, y];
    };
    const leaf = (sz) => ({ len: sz, wid: sz * 0.9, form: "rund", cols: [C(85, 22, 60, 0.95), C(78, 24, 70, 0.92), C(62, 30, 78, 0.9)], edge: C(30, 55, 62), edgeA: 0.55, edgeW: 1.3,
      fib: 60, fibA: 0.5, fibLight: C(70, 30, 92), fibDark: C(100, 30, 30), veins: C(60, 30, 88), veinN: 6 });
    const n = 7;
    for (let k = 0; k < n; k++) {
      const t = 0.12 + (k / (n - 1)) * 0.74;
      const [x, y] = bez(t), [x2, y2] = bez(t + 0.01);
      const ang = Math.atan2(x2 - x, -(y2 - y));
      const side = k % 2 ? 1 : -1;
      const sz = lerp(0.62, 0.36, t) * (0.9 + rnd() * 0.2);
      P(sc, R, rnd, leaf(sz), x, y, ang + side * (1.05 + rnd() * 0.35), { z: k % 3, sw: 0.035, op: 0.05 * side });
    }
    sc.buds = [];
    const [ex, ey] = bez(0.97);
    for (let k = 0; k < 9; k++) sc.buds.push({ x: ex + (rnd() - 0.3) * 0.28, y: ey + (rnd() - 0.6) * 0.22, r: 0.035 + rnd() * 0.02, sx: ex, sy: ey + 0.08 });
  };

  ART.strelitzia = (sc, R, rnd) => {
    P(sc, R, rnd, { len: 1.55, wid: 0.5, form: "lans", bend: -0.06, cols: [C(110, 35, 32), C(100, 38, 40), C(85, 40, 52)], edge: C(80, 40, 62), fib: 90, fibA: 0.8, fibLight: C(80, 40, 75), fibDark: C(130, 40, 18), veins: C(80, 35, 70), veinN: 10 },
      -0.18, 1.0, -0.62, { z: -6, sw: 0.012 });
    stem(sc, [[-0.02, 0.28], [0.0, 0.8], [0.04, 1.2], [0.05, 1.7]], 0.03, C(100, 25, 48), C(110, 25, 36));
    P(sc, R, rnd, { len: 0.98, wid: 0.2, form: "spets", bend: 0.05, cols: [C(110, 35, 38), C(345, 55, 42), C(290, 35, 30)], edge: C(330, 50, 70), fib: 70, fibLight: C(340, 60, 80), fibDark: C(280, 40, 20) },
      -0.08, 0.3, Math.PI / 2 - 0.16, { z: 3, sw: 0.01, op: 0 });
    const sep = { len: 0.86, wid: 0.15, form: "spets", cols: [C(20, 95, 48), C(30, 98, 56), C(42, 98, 64)], edge: C(45, 100, 80), fib: 60, fibLight: C(48, 100, 85), fibDark: C(15, 90, 35) };
    P(sc, R, rnd, sep, 0.14, 0.2, -0.32, { z: 1, op: 0.1 });
    P(sc, R, rnd, Object.assign({}, sep, { len: 0.95 }), 0.16, 0.2, 0.08, { z: 2, op: 0.08 });
    P(sc, R, rnd, Object.assign({}, sep, { len: 0.8 }), 0.18, 0.21, 0.48, { z: 2, op: 0.08 });
    const tong = { len: 0.66, wid: 0.07, form: "spets", cols: [C(235, 60, 35), C(240, 70, 45), C(250, 60, 55)], edge: C(240, 60, 75), fib: 20 };
    P(sc, R, rnd, tong, 0.17, 0.21, -0.05, { z: 4, op: 0.06 });
    P(sc, R, rnd, Object.assign({}, tong, { len: 0.55 }), 0.18, 0.21, 0.26, { z: 4, op: 0.06 });
  };

  ART.magnolia = (sc, R, rnd) => {
    stem(sc, [[0, 0.38], [-0.1, 0.8], [-0.35, 1.2], [-0.55, 1.7]], 0.034, C(20, 25, 35), C(25, 20, 28));
    stem(sc, [[-0.2, 0.95], [-0.45, 0.85], [-0.62, 0.7], [-0.72, 0.55]], 0.016, C(20, 25, 38), C(25, 20, 32));
    P(sc, R, rnd, { len: 0.36, wid: 0.16, form: "lans", cols: [C(95, 25, 40), C(90, 30, 52), C(80, 35, 62)], edge: C(80, 30, 75), fib: 30 }, -0.72, 0.55, -0.6, { z: -5, sw: 0.03 });
    const p = { len: 0.86, wid: 0.5, form: "ovat", ruffle: 0.02, cols: [C(328, 42, 52), C(345, 45, 82), C(20, 60, 95)], edge: C(10, 60, 97), throat: { c: C(320, 45, 42, 0.6), r: 0.4 },
      fibLight: C(0, 0, 100), fibDark: C(330, 40, 45), fibA: 0.7 };
    P(sc, R, rnd, p, -0.03, 0.38, -0.5, { z: 1, op: 0.12 });
    P(sc, R, rnd, p, 0.03, 0.38, 0.5, { z: 1, op: 0.12 });
    P(sc, R, rnd, Object.assign({}, p, { len: 0.92 }), 0, 0.38, -0.02, { z: 2, op: 0.04 });
    P(sc, R, rnd, Object.assign({}, p, { len: 0.78, bend: -0.06 }), -0.04, 0.4, -0.95, { z: 3, sy: 0.92, op: 0.15 });
    P(sc, R, rnd, Object.assign({}, p, { len: 0.78, bend: 0.06 }), 0.04, 0.4, 0.95, { z: 3, sy: 0.92, op: 0.15 });
    P(sc, R, rnd, Object.assign({}, p, { len: 0.62, wid: 0.56, cols: [C(330, 45, 55), C(345, 42, 85), C(20, 55, 96)] }), 0, 0.42, 0.06, { z: 4, sy: 0.75, op: 0.02 });
  };

  ART.pasklilja = (sc, R, rnd) => {
    stem(sc, [[0, 0.2], [0.02, 0.7], [0.0, 1.2], [0.02, 1.7]], 0.03, C(95, 35, 48), C(100, 30, 38));
    const leaf = { len: 1.25, wid: 0.13, form: "rem", cols: [C(100, 35, 40, 0.9), C(95, 35, 48, 0.85), C(85, 40, 58, 0.8)], edge: C(85, 40, 70), fib: 30 };
    P(sc, R, rnd, leaf, -0.04, 1.6, -0.32, { z: -8, sw: 0.015 });
    P(sc, R, rnd, Object.assign({}, leaf, { len: 1.05 }), 0.06, 1.6, 0.26, { z: -8, sw: 0.015 });
    sc.groups.push({ x: 0, y: 0, a: 0.15, sx: 1, sy: 0.9 });
    const p = { len: 0.66, wid: 0.4, form: "ovat", ruffle: 0.02, cols: [C(48, 85, 72), C(52, 90, 82), C(54, 92, 88)], edge: C(55, 100, 92), fibLight: C(55, 100, 96), fibDark: C(40, 80, 45), fibA: 0.8 };
    for (let k = 0; k < 6; k++) { const a = k * (TAU / 6) + (rnd() - 0.5) * 0.12; P(sc, R, rnd, p, 0, 0, a, { g: 0, z: 1, op: 0.07 }); }
    const c = cup(0.3 * R, [C(30, 95, 45), C(38, 98, 55), C(46, 100, 66)], rnd);
    sc.parts.push({ s: c, x: 0, y: 0, a: 0, sx: 1, sy: 1, z: 5, sw: 0.01, ph: 0, op: 0, g: 0, breathe: 1.6 });
  };

  ART.pion = (sc, R, rnd) => {
    stem(sc, [[0, 0.3], [0.03, 0.8], [0.0, 1.25], [0.02, 1.7]], 0.03, C(110, 25, 40), C(115, 25, 30));
    const leaf = { len: 0.62, wid: 0.3, form: "lans", cols: [C(120, 28, 32), C(110, 30, 40), C(100, 30, 48)], edge: C(100, 30, 60), fib: 40, veins: C(100, 25, 60), veinN: 5 };
    P(sc, R, rnd, leaf, 0.0, 0.62, -1.3, { z: -6 });
    P(sc, R, rnd, leaf, 0.02, 0.7, 1.25, { z: -6 });
    sc.groups.push({ x: 0, y: 0, a: 0, sx: 1, sy: 0.88 });
    const lay = [
      { n: 8, len: 0.74, wid: 0.62, cols: [C(334, 55, 55), C(338, 62, 74), C(345, 55, 89)], z: 1, op: 0.09 },
      { n: 8, len: 0.58, wid: 0.52, cols: [C(332, 62, 50), C(336, 65, 68), C(342, 60, 84)], z: 2, op: 0.12 },
      { n: 10, len: 0.42, wid: 0.38, cols: [C(330, 70, 42), C(334, 68, 60), C(340, 62, 78)], z: 3, op: 0.18 },
      { n: 7, len: 0.24, wid: 0.24, cols: [C(328, 70, 38), C(332, 70, 52), C(338, 65, 70)], z: 4, op: 0.25 },
    ];
    lay.forEach((L, li) => {
      const off = rnd() * TAU;
      for (let k = 0; k < L.n; k++) {
        const a = off + k * (TAU / L.n) + (rnd() - 0.5) * 0.25;
        P(sc, R, rnd, { len: L.len, wid: L.wid, form: "obovat", ruffle: 0.1 + li * 0.03, freq: 7, bend: (rnd() - 0.5) * 0.15, cols: L.cols, edge: C(345, 70, 93), edgeA: 0.5,
          fibLight: C(345, 80, 95), fibDark: C(330, 70, 30) }, 0, 0, a, { g: 0, z: L.z + (Math.cos(a) < -0.3 ? 0.5 : 0), op: L.op });
      }
    });
  };

  ART.lavendel = (sc, R, rnd) => {
    const tips = [[-0.42, -0.95], [0.04, -1.12], [0.46, -0.85]];
    sc.spikes = [];
    const cols = [[C(265, 55, 72), C(258, 45, 55), C(250, 25, 45)], [C(270, 50, 68), C(262, 45, 52), C(255, 25, 42)], [C(260, 55, 75), C(255, 48, 58), C(248, 25, 48)]];
    sc.florets = cols.map((c) => floret(0.07 * R, c, rnd));
    tips.forEach((tp, i) => {
      const base = [0.02 * i - 0.02, 1.7];
      const pts = [base, [base[0] + (tp[0] - base[0]) * 0.2, 0.9], [tp[0] * 0.85, tp[1] * 0.2], tp];
      stem(sc, pts, 0.014, C(95, 18, 55), C(100, 15, 45));
      const fl = [];
      for (let k = 0; k < 16; k++) {
        const t = 0.55 + (k / 15) * 0.45;
        const u = 1 - t;
        const x = u * u * u * pts[0][0] + 3 * u * u * t * pts[1][0] + 3 * u * t * t * pts[2][0] + t * t * t * pts[3][0];
        const y = u * u * u * pts[0][1] + 3 * u * u * t * pts[1][1] + 3 * u * t * t * pts[2][1] + t * t * t * pts[3][1];
        const side = k % 2 ? 1 : -1;
        fl.push({ x: x + side * 0.035 * (1 - (k / 15) * 0.5), y, a: side * 0.5 + (rnd() - 0.5) * 0.3, s: 0.8 + (1 - k / 15) * 0.45, v: (rnd() * 3) | 0, k });
      }
      sc.spikes.push(fl);
    });
  };

  ART.maskros = (sc, R, rnd) => {
    stem(sc, [[0, -0.05], [0.04, 0.5], [-0.02, 1.1], [0.03, 1.7]], 0.016, C(90, 20, 72), C(95, 18, 60));
    sc.head = seedHead(0.66 * R, rnd, { stalk: C(35, 18, 45), pappus: C(35, 12, 62), dot: C(30, 25, 38), core: C(35, 40, 40, 0.8) });
    sc.seed = seed(0.13 * R);
    sc.headPos = [0, -0.1];
    P(sc, R, rnd, { len: 0.7, wid: 0.12, form: "lans", ruffle: 0.25, freq: 6, cols: [C(100, 30, 40, 0.9), C(95, 32, 48, 0.85), C(90, 35, 56, 0.8)], edge: C(90, 30, 68), fib: 25 },
      0.0, 1.55, -0.9, { z: -8, sw: 0.02 });
  };

  ART.fro = (sc, R, rnd) => {
    stem(sc, [[0, 0.05], [0.04, 0.4], [-0.02, 0.8], [0.0, 1.15]], 0.03, C(100, 35, 60), C(80, 25, 55));
    const cot = { len: 0.5, wid: 0.36, form: "rund", cols: [C(105, 40, 45), C(100, 45, 55), C(90, 50, 64)], edge: C(90, 50, 75), fib: 50, fibA: 0.6, veins: C(90, 40, 72), veinN: 4 };
    P(sc, R, rnd, Object.assign({ bend: -0.12 }, cot), 0, 0.06, -1.15, { z: 1, op: 0.15 });
    P(sc, R, rnd, Object.assign({ bend: 0.12 }, cot), 0, 0.06, 1.15, { z: 1, op: 0.15 });
    const nl = { len: 0.24, wid: 0.13, form: "lans", cols: [C(100, 45, 50), C(95, 50, 60), C(88, 55, 70)], edge: C(90, 50, 80), fib: 20 };
    P(sc, R, rnd, nl, 0, 0.04, -0.35, { z: 2, op: 0.3 });
    P(sc, R, rnd, nl, 0, 0.04, 0.35, { z: 2, op: 0.3 });
    sc.soil = true;
  };

  // ---------------------------------------------------------------- ritaren
  function create(cv, opts = {}) {
    const ctx = cv.getContext("2d");
    let W = 0, H = 0, dpr = 1, R = 100, CX = 0, CY = 0;
    let plant = "fro", preset = 0, accent = "#7a4bd4", acc = [122, 75, 212];
    let scene = null, need = true, buildT = 0;
    const sig = { env: 0, lfo: 0, pk: 0, mask: 0, step: -1, nc: 0, cut: 0.5, res: 0.1, lrate: 0.45 };
    let envS = 0, pkS = 0, lph = 0, lastNc = -1, t0 = performance.now(), last = t0;
    const pollen = [], flyers = [];
    let lit = new Float32Array(48);

    function resize() {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const nw = Math.round(r.width), nh = Math.round(r.height);
      if (nw === W && nh === H && cv.width === Math.round(nw * dpr)) return;
      W = nw; H = nh;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const nR = opts.size ? Math.min(W, H) * opts.size : Math.max(40, Math.min(W * 0.31, H * 0.37));
      if (Math.abs(nR - R) / R > 0.04 || !scene) { R = nR; need = true; }
      CX = W / 2; CY = H * (opts.cy || 0.47);
    }

    function build() {
      need = false;
      const rnd = rng(preset * 2654435761 + plant.length * 97);
      hueShift = (rnd() - 0.5) * 18;
      const sc = { parts: [], groups: [], stems: [], rot: (rnd() - 0.5) * 0.16, plant };
      const sR = R * dpr;
      ART[plant](sc, sR, rnd);
      // stjälkarna anges i R; delarna i R (x, y)
      sc.parts.sort((a, b) => a.z - b.z);
      hueShift = 0;
      scene = sc;
    }

    function bez(p, t) {
      const u = 1 - t;
      return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
        u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]];
    }
    function drawStem(s, sway) {
      const N = 18;
      for (let i = 0; i < N; i++) {
        const [x0, y0] = bez(s.pts, i / N), [x1, y1] = bez(s.pts, (i + 1) / N);
        const k0 = sway * (1 - i / N), k1 = sway * (1 - (i + 1) / N);
        ctx.strokeStyle = i < N / 2 ? s.c0 : s.c1;
        ctx.lineWidth = Math.max(1, s.w * R * (1 - (i / N) * 0.35));
        ctx.beginPath(); ctx.moveTo(CX + (x0 + k0) * R, CY + y0 * R); ctx.lineTo(CX + (x1 + k1) * R, CY + y1 * R); ctx.stroke();
      }
    }

    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000;
      resize();
      if (need) { if (now - buildT > 60) { buildT = now; build(); } }
      if (!scene || !W) return;
      envS += (sig.env - envS) * (sig.env > envS ? 0.25 : 0.08);
      pkS += (sig.pk - pkS) * 0.15;
      const lr = Math.min(1.2, 0.1 * Math.pow(1000, sig.lrate));
      lph = (lph + lr * dt) % 1;
      // nya toner -> pollen
      if (lastNc < 0) lastNc = sig.nc;
      if (sig.nc !== lastNc) {
        const n = Math.min(6, (sig.nc - lastNc + 1000) % 1000);
        for (let k = 0; k < n * 3; k++) {
          const a = Math.random() * TAU, sp = 0.08 + Math.random() * 0.25;
          pollen.push({ x: (Math.random() - 0.5) * 0.4, y: (Math.random() - 0.6) * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.12, life: 1, r: 1 + Math.random() * 2 });
        }
        if (scene.head) for (let k = 0; k < n; k++) flyers.push({ x: scene.headPos[0] + (Math.random() - 0.5) * 0.5, y: scene.headPos[1] + (Math.random() - 0.5) * 0.5, vx: 0.08 + Math.random() * 0.15, vy: -0.1 - Math.random() * 0.12, a: Math.random() * TAU, life: 1 });
        if (scene.spikes) for (let k = 0; k < 3; k++) lit[(Math.random() * 48) | 0] = 1;
        lastNc = sig.nc;
      }
      if (scene.spikes && sig.step >= 0) for (let i = 0; i < 3; i++) lit[i * 16 + (sig.step % 16)] = 1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // glöd + ring med LFO-punkt
      const gl = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.5);
      gl.addColorStop(0, `rgba(${acc[0]},${acc[1]},${acc[2]},${0.05 + envS * 0.13 + pkS * 0.05})`);
      gl.addColorStop(1, `rgba(${acc[0]},${acc[1]},${acc[2]},0)`);
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
      const rr = R * 1.18;
      if (opts.ring !== false) {
        ctx.strokeStyle = "rgba(43,37,33,0.11)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(CX, CY, rr, 0, TAU); ctx.stroke();
        const oa = lph * TAU - Math.PI / 2;
        ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(CX + Math.cos(oa) * rr, CY + Math.sin(oa) * rr, 4, 0, TAU); ctx.fill();
      }

      const sway = Math.sin(t * 0.55) * 0.012 + sig.lfo * 0.012;
      const breath = envS * 0.05;
      const openAmt = (sig.cut - 0.5) * 0.7 + envS * 0.9;

      // hela växten vrids lite runt stjälkens fot
      ctx.save();
      const pivX = CX, pivY = CY + R * 1.6;
      ctx.translate(pivX, pivY); ctx.rotate(scene.rot + sway); ctx.translate(-pivX, -pivY);

      if (scene.soil) {
        const sg = ctx.createRadialGradient(CX, CY + R * 1.18, 0, CX, CY + R * 1.18, R * 0.9);
        sg.addColorStop(0, "rgba(90,70,50,0.18)"); sg.addColorStop(1, "rgba(90,70,50,0)");
        ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(CX, CY + R * 1.18, R * 0.9, R * 0.12, 0, 0, TAU); ctx.fill();
      }
      ctx.lineCap = "round";
      for (const s of scene.stems) drawStem(s, Math.sin(t * 0.9) * 0.01);

      // lavendelns ax
      if (scene.spikes) {
        scene.spikes.forEach((fl, i) => {
          for (const f of fl) {
            const L = lit[i * 16 + f.k]; lit[i * 16 + f.k] *= 0.9;
            const img = scene.florets[f.v];
            const sc = (0.85 + f.s * 0.25) * (1 + L * 0.5 + breath);
            ctx.save();
            ctx.translate(CX + f.x * R, CY + f.y * R); ctx.rotate(f.a + Math.sin(t * 1.3 + f.k) * 0.04);
            ctx.scale(sc, sc);
            if (L > 0.05) { ctx.shadowColor = accent; ctx.shadowBlur = 14 * L; }
            ctx.drawImage(img.cv, -img.ax / dpr, -img.ay / dpr, img.cv.width / dpr, img.cv.height / dpr);
            ctx.restore();
          }
        });
      }
      // eukalyptusknoppar (bakom bladen)
      if (scene.buds) {
        for (const b of scene.buds) {
          ctx.strokeStyle = "rgba(150,110,90,0.6)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(CX + b.sx * R, CY + b.sy * R); ctx.lineTo(CX + b.x * R, CY + b.y * R); ctx.stroke();
          const g = ctx.createRadialGradient(CX + b.x * R - 2, CY + b.y * R - 2, 0, CX + b.x * R, CY + b.y * R, b.r * R * 1.3);
          g.addColorStop(0, "rgba(252,236,214,1)"); g.addColorStop(1, "rgba(206,160,120,1)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(CX + b.x * R, CY + b.y * R, b.r * R * (1 + breath), b.r * R * 1.2 * (1 + breath), 0.3, 0, TAU); ctx.fill();
        }
      }
      // maskrosens kula
      if (scene.head) {
        const h = scene.head;
        ctx.save();
        ctx.translate(CX + scene.headPos[0] * R, CY + scene.headPos[1] * R);
        ctx.rotate(t * 0.04 + sig.lfo * 0.05);
        const s = 1 + breath * 1.2;
        ctx.scale(s, s);
        ctx.drawImage(h.cv, -h.ax / dpr, -h.ay / dpr, h.cv.width / dpr, h.cv.height / dpr);
        ctx.restore();
      }

      // delarna (kronblad, blad)
      for (const p of scene.parts) {
        ctx.save();
        if (p.g !== undefined) {
          const G = scene.groups[p.g];
          ctx.translate(CX + G.x * R, CY + G.y * R); ctx.rotate(G.a); ctx.scale(G.sx, G.sy * (1 + breath * 0.3));
          ctx.translate(p.x * R, p.y * R);
        } else ctx.translate(CX + p.x * R, CY + p.y * R);
        const sgn = p.a > 0.05 ? 1 : p.a < -0.05 ? -1 : 0;
        const a = p.a + Math.sin(t * (0.7 + (p.ph % 1) * 0.6) + p.ph) * p.sw * (0.6 + envS) + p.op * openAmt * (sgn || (Math.abs(p.a) > 3 ? 0 : 0));
        ctx.rotate(a);
        const b = 1 + breath * (p.breathe || 1);
        ctx.scale(p.sx * b, p.sy * b);
        const s = p.s;
        ctx.drawImage(s.cv, -s.ax / dpr, -s.ay / dpr, s.cv.width / dpr, s.cv.height / dpr);
        ctx.restore();
      }

      // irisens skägg
      if (scene.beard) {
        ctx.save();
        ctx.fillStyle = "rgba(255,170,40,0.9)";
        for (let k = 0; k < 26; k++) {
          const a = Math.PI + (k % 3 - 1) * 0.0 + ((k * 37) % 7 - 3) * 0.02;
          const d = 0.08 + (k / 26) * 0.24;
          const x = CX + Math.sin(a) * d * R * 0.2 + ((k * 13) % 5 - 2) * 0.6, y = CY + 0.06 * R + d * R * 0.82;
          ctx.globalAlpha = 0.5 + (k % 4) * 0.12;
          ctx.beginPath(); ctx.arc(x, y, 1.1 + (k % 3) * 0.5, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
      // liljans ståndare
      if (scene.stamens) {
        const st = scene.stamens;
        ctx.save();
        ctx.translate(CX + st.x * R, CY + st.y * R);
        for (let k = 0; k < st.n; k++) {
          const a = -0.9 + (k / (st.n - 1)) * 1.6 + Math.sin(t * 0.9 + k) * 0.03 + envS * 0.08 * (k - 2.5) / 2.5;
          const L = st.len * R * (0.85 + (k % 3) * 0.08) * (1 + breath);
          const ex = Math.sin(a) * L, ey = -Math.cos(a) * L * 0.75;
          ctx.strokeStyle = st.col; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(ex * 0.4, ey * 0.7, ex, ey); ctx.stroke();
          ctx.fillStyle = st.tip;
          ctx.beginPath(); ctx.ellipse(ex, ey, 2.6, 4.6, a + 1.2, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();

      // flygande frön (maskros)
      for (let i = flyers.length - 1; i >= 0; i--) {
        const f = flyers[i];
        f.life -= dt * 0.22; f.x += f.vx * dt; f.y += f.vy * dt; f.vx += Math.sin(t * 1.4 + i) * 0.01 * dt;
        if (f.life <= 0) { flyers.splice(i, 1); continue; }
        const s = scene.seed;
        ctx.save(); ctx.globalAlpha = Math.min(1, f.life * 1.5);
        ctx.translate(CX + f.x * R, CY + f.y * R); ctx.rotate(Math.sin(t + i) * 0.3);
        ctx.drawImage(s.cv, -s.ax / dpr, -s.ay / dpr, s.cv.width / dpr, s.cv.height / dpr);
        ctx.restore();
      }
      // pollen
      ctx.fillStyle = accent;
      for (let i = pollen.length - 1; i >= 0; i--) {
        const p = pollen[i];
        p.life -= dt * 0.6; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 0.02 * dt;
        if (p.life <= 0) { pollen.splice(i, 1); continue; }
        ctx.globalAlpha = p.life * 0.7;
        ctx.beginPath(); ctx.arc(CX + p.x * R, CY + p.y * R, p.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // stjälkarna tonar ut nedtill
      const fd = ctx.createLinearGradient(0, H * 0.8, 0, H);
      fd.addColorStop(0, "rgba(0,0,0,0)"); fd.addColorStop(1, "rgba(0,0,0,1)");
      ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = fd; ctx.fillRect(0, H * 0.8, W, H * 0.2); ctx.globalCompositeOperation = "source-over";
    }
    requestAnimationFrame(frame);
    window.addEventListener("resize", () => { resize(); });

    return {
      set(pl, pre, col) {
        if (pl !== plant || pre !== preset) { plant = ART[pl] ? pl : "fro"; preset = pre; need = true; pollen.length = 0; flyers.length = 0; }
        accent = col; acc = hexToRgb(col);
      },
      signals(s) { Object.assign(sig, s); },
    };
  }

  return { create, species: Object.keys(ART) };
})();
