// BLONDA BRIS – gränssnittets logik: flikar, rattar, reglage, ljudlistan, vågen, rullen och tangenterna.
"use strict";

(() => {
  const D = window.BRIS_DATA;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const P = {}; D.params.forEach((p) => (P[p.id] = p));

  // ---------------------------------------------------------------- tillstånd
  const S = {
    v: {}, preset: 65, tab: "play", view: "roll", oct: 0, playing: false, tempo: 120, hostTempo: false,
    pattern: null, standalone: false, web: Bridge.mode === "web", midi: [],
    m: { env: 0, lfo: 0, pk: 0, mask: 0, step: -1, nc: 0, scope: null },
  };
  D.params.forEach((p) => (S.v[p.id] = p.def));
  const plantOf = (i) => D.plants[D.presets[i].plant];

  // ---------------------------------------------------------------- sidorna
  const PAGES = [
    { id: "play", name: "PLAY", wave: "osc", kt: "AMP", knobs: [["aa", "A"], ["ad", "D"], ["asus", "S"], ["ar", "R"]],
      rt: "TONE", right: [["s", "cut", "CUTOFF"], ["s", "res", "RESONANCE"], ["s", "chorus", "CHORUS"], ["s", "dmix", "DELAY"], ["s", "rvb", "REVERB"]] },
    { id: "osc", name: "OSC", wave: "osc", kt: "OSC", knobs: [["pw", "PW"], ["sub", "SUB"], ["detune", "DETUNE"], ["porta", "GLIDE"]],
      rt: "VOICE", right: [["c", "vform", ["SAW", "PULSE", "SAW + PULSE"]], ["c", "lage", ["POLY STEREO", "POLY", "MONO", "UNISON"]], ["s", "uniint", "INTERVAL"], ["s", "bendr", "BEND"]] },
    { id: "filter", name: "FILTER", wave: "filter", kt: "FILTER ENV", knobs: [["fa", "A"], ["fd", "D"], ["fs", "S"], ["fr", "R"]],
      rt: "FILTER", right: [["s", "cut", "CUTOFF"], ["s", "res", "RESONANCE"], ["s", "eg1", "ENVELOPE"], ["s", "kbd", "KEY TRACK"], ["s", "velf", "VELOCITY"]] },
    { id: "mod", name: "MOD", wave: "lfo", kt: "LFO", knobs: [["lrate", "RATE"], ["lfoosc", "VIB"], ["lfopwm", "PWM"], ["lfocut", "FILT"]],
      rt: "LFO", right: [["c", "lwave", ["TRIANGLE", "RAMP UP", "RAMP DOWN", "SQUARE", "RANDOM"]], ["s", "lfoamp", "TREMOLO"], ["s", "mwosc", "WHEEL VIB"], ["s", "mwcut", "WHEEL CUT"]] },
    { id: "fx", name: "FX", wave: "scope", kt: "CHORUS · DELAY", knobs: [["chorus", "CHORUS"], ["dtime", "TIME"], ["dfb", "FDBK"], ["dmix", "MIX"]],
      rt: "FX", right: [["s", "rvb", "REVERB"], ["s", "rsize", "SPACE"], ["s", "drive", "DRIVE"], ["s", "vela", "VELOCITY"], ["s", "vol", "VOLUME"]] },
  ];

  function fmt(id, v) {
    const p = P[id];
    if (id === "uniint") return (v > 0 ? "+" : "") + Math.round(v) + " ST";
    if (id === "bendr") return Math.round(v) + " ST";
    if (id === "kbda") return (v > 0 ? "+" : "") + Math.round(v * 100);
    if (p.int) return String(Math.round(v));
    return String(Math.round(((v - p.min) / (p.max - p.min)) * 100));
  }

  // ---------------------------------------------------------------- kontroller
  const binds = {};   // id -> [uppdatera(v)]
  function bind(id, f) { (binds[id] = binds[id] || []).push(f); f(S.v[id]); }
  function setParam(id, v, user) {
    const p = P[id]; if (!p) return;
    v = clamp(v, p.min, p.max); if (p.int) v = Math.round(v);
    if (S.v[id] === v && user) return;
    S.v[id] = v;
    (binds[id] || []).forEach((f) => f(v));
    if (user) Bridge.send({ t: "param", id, v });
    if (id === "cut" || id === "res" || id === "lrate") flower.signals({ [id]: v });
  }
  const gesture = (id, on) => Bridge.send({ t: "gesture", id, on });

  function dragger(node, id, mode, getRect) {
    // mode: "v" (ratt: dra upp/ned), "h" (reglage: absolut position)
    let start = 0, sv = 0, pid = null;
    const p = P[id];
    node.addEventListener("pointerdown", (e) => {
      if (pid !== null) return;
      pid = e.pointerId; node.setPointerCapture(pid); node.classList.add("drag");
      gesture(id, true);
      start = e.clientY; sv = S.v[id];
      if (mode === "h") apply(e);
      showVal(true);
      e.preventDefault();
    });
    const apply = (e) => {
      if (mode === "h") {
        const r = getRect();
        setParam(id, p.min + clamp((e.clientX - r.left) / r.width, 0, 1) * (p.max - p.min), true);
      } else {
        const k = (e.shiftKey ? 0.2 : 1) * (p.max - p.min) / 180;
        setParam(id, sv + (start - e.clientY) * k, true);
      }
    };
    node.addEventListener("pointermove", (e) => { if (e.pointerId === pid) apply(e); });
    const end = (e) => { if (e.pointerId !== pid) return; pid = null; node.classList.remove("drag"); gesture(id, false); showVal(false); };
    node.addEventListener("pointerup", end); node.addEventListener("pointercancel", end);
    node.addEventListener("dblclick", () => { gesture(id, true); setParam(id, p.def, true); gesture(id, false); });
    node.addEventListener("wheel", (e) => { e.preventDefault(); const st = p.int ? Math.sign(-e.deltaY) : -e.deltaY * (p.max - p.min) / 1500; setParam(id, S.v[id] + st, true); }, { passive: false });
    let lab = null, txt = "";
    function showVal(on) {
      lab = lab || node.querySelector(".lab");
      if (!lab) return;
      if (on) { txt = lab.dataset.t; node._live = true; lab.innerHTML = `<span class="val">${fmt(id, S.v[id])}</span>`; }
      else { node._live = false; lab.textContent = lab.dataset.t; }
    }
    bind(id, (v) => { if (node._live && lab) lab.innerHTML = `<span class="val">${fmt(id, v)}</span>`; });
  }

  function knob(id, label) {
    const k = el("div", "knob");
    const c = el("canvas"); const lab = el("div", "lab", label); lab.dataset.t = label;
    k.append(c, lab);
    const draw = (v) => {
      const dpr = window.devicePixelRatio || 1, s = c.clientWidth || 34;
      if (c.width !== Math.round(s * dpr)) { c.width = c.height = Math.round(s * dpr); }
      const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, s, s);
      const p = P[id], x = (v - p.min) / (p.max - p.min);
      const r = s / 2 - 2.5, a0 = PI * 0.75, a1 = PI * 2.25;
      g.lineCap = "round"; g.lineWidth = 1.4;
      g.strokeStyle = "rgba(43,37,33,0.16)"; g.beginPath(); g.arc(s / 2, s / 2, r, a0, a1); g.stroke();
      const acc = getComputedStyle(document.documentElement).getPropertyValue("--a").trim();
      g.strokeStyle = acc; g.lineWidth = 2;
      const mid = p.min < 0 ? a0 + (a1 - a0) / 2 : a0;
      const av = a0 + (a1 - a0) * x;
      g.beginPath(); g.arc(s / 2, s / 2, r, Math.min(mid, av), Math.max(mid, av)); g.stroke();
    };
    k._draw = () => draw(S.v[id]);
    bind(id, draw);
    dragger(k, id, "v");
    return k;
  }

  function slider(id, label) {
    const s = el("div", "slider");
    const lab = el("div", "lab", label); lab.dataset.t = label;
    const tr = el("div", "tr"); const fill = el("div", "fill"); const hd = el("div", "hd");
    tr.append(fill, hd); s.append(lab, tr);
    bind(id, (v) => {
      const p = P[id], x = (v - p.min) / (p.max - p.min);
      hd.style.left = x * 100 + "%";
      if (p.min < 0) { const m = 50; fill.style.left = Math.min(m, x * 100) + "%"; fill.style.width = Math.abs(x * 100 - m) + "%"; }
      else { fill.style.left = "0"; fill.style.width = x * 100 + "%"; }
    });
    dragger(s, id, "h", () => tr.getBoundingClientRect());
    return s;
  }

  function choice(id, opts) {
    const c = el("div", "choice");
    const bs = opts.map((o, i) => { const b = el("button", "opt", `<i></i>${o}`); b.onclick = () => { gesture(id, true); setParam(id, i, true); gesture(id, false); }; c.append(b); return b; });
    bind(id, (v) => bs.forEach((b, i) => b.classList.toggle("on", i === Math.round(v))));
    return c;
  }

  // ---------------------------------------------------------------- vågen (vänster panel)
  let waveCv = null, waveType = "osc";
  function drawWave(t) {
    if (!waveCv || !waveCv.isConnected) return;
    const dpr = window.devicePixelRatio || 1, w = waveCv.clientWidth, h = waveCv.clientHeight;
    if (!w) return;
    if (waveCv.width !== Math.round(w * dpr) || waveCv.height !== Math.round(h * dpr)) { waveCv.width = Math.round(w * dpr); waveCv.height = Math.round(h * dpr); }
    const g = waveCv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const acc = cssVar("--a");
    const rgb = hexRgb(acc);
    const mid = h * 0.55;
    const ys = new Float32Array(161);
    const v = S.v, env = envSm;
    let dots = null;
    if (waveType === "osc") {
      const N = 160, fc = 1.5 + 40 * Math.pow(v.cut, 2.2) * (1 + v.eg1 * env * 2), q = v.res;
      const cyc = 1.25, ph = t * 0.06;
      let mx = 1e-6;
      for (let i = 0; i <= N; i++) {
        const x = (i / N) * cyc + ph; let y = 0;
        for (let hN = 1; hN <= 14; hN++) {
          const saw = (hN % 2 ? 1 : -1) / hN;
          const pul = (2 / (hN * PI)) * Math.sin(hN * PI * v.pw);
          const a = v.vform === 0 ? saw : v.vform === 1 ? pul : 0.62 * (saw + pul);
          const fg = 1 / (1 + Math.pow(hN / 4.5, 2)) / Math.sqrt(1 + Math.pow(hN / fc, 8)) + q * 2.2 * Math.exp(-Math.pow((hN - fc) / (0.18 * fc + 0.6), 2));
          y += a * fg * Math.sin(TAU * hN * x);
        }
        if (v.sub > 0) y += v.sub * 0.6 * (Math.sin(TAU * 0.5 * x) + Math.sin(TAU * 1.5 * x) / 3) * (1 / Math.sqrt(1 + Math.pow(0.5 / fc, 8)));
        ys[i] = y; mx = Math.max(mx, Math.abs(y));
      }
      const amp = h * 0.36 * (0.45 + 0.55 * env);
      for (let i = 0; i <= N; i++) ys[i] = mid - (ys[i] / mx) * amp;
    } else if (waveType === "lfo") {
      const N = 160, lw = v.lwave;
      for (let i = 0; i <= N; i++) {
        const p = ((i / N) * 2) % 1; let y;
        if (lw === 0) y = 1 - 4 * Math.abs(p - 0.5); else if (lw === 1) y = 2 * p - 1; else if (lw === 2) y = 1 - 2 * p; else if (lw === 3) y = p < 0.5 ? 1 : -1;
        else { const k = Math.floor((i / N) * 2 * 4); y = Math.sin(k * 12.9898) * 43758.5453 % 1 * 2 - (k % 2 ? 0.5 : 0.2); y = clamp(y, -1, 1); }
        ys[i] = mid - y * h * 0.3;
      }
      const lr = 0.1 * Math.pow(1000, v.lrate);
      const pp = (t * Math.min(lr, 3)) % 1 * 0.5;
      dots = [[pp * w, ys[Math.round(pp * N)]]];
    } else if (waveType === "filter") {
      const N = 160, fc = 20 * Math.pow(1000, v.cut), k = v.res;
      for (let i = 0; i <= N; i++) {
        const f = 20 * Math.pow(1000, i / N);
        const r = f / fc;
        let m = 1 / Math.sqrt(1 + Math.pow(r, 8)) * (1 + k * 2.4 * Math.exp(-Math.pow(Math.log(r) / 0.28, 2)));
        ys[i] = h * 0.9 - clamp(m, 0, 3.6) / 3.6 * h * 0.8 * 1.0 - 0;
      }
      dots = [[clamp(v.cut, 0, 1) * w, ys[Math.round(clamp(v.cut, 0, 1) * N)]]];
    } else {
      const sc = S.m.scope; const N = 160;
      let mx = 0.05;
      if (sc) for (let i = 0; i < sc.length; i++) mx = Math.max(mx, Math.abs(sc[i]));
      for (let i = 0; i <= N; i++) { const y = sc ? sc[Math.floor((i / N) * (sc.length - 1))] : 0; ys[i] = mid - (y / mx) * h * 0.34 * Math.min(1, mx * 4); }
    }
    // mjuk yta
    const N = ys.length - 1;
    g.beginPath(); g.moveTo(0, mid);
    for (let i = 0; i <= N; i++) g.lineTo((i / N) * w, ys[i]);
    g.lineTo(w, mid); g.closePath();
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, `rgba(${rgb},0.42)`); gr.addColorStop(0.55, `rgba(${rgb},0.16)`); gr.addColorStop(1, `rgba(${rgb},0.30)`);
    g.fillStyle = gr; g.fill();
    // sidorna tonar ut
    const fade = g.createLinearGradient(0, 0, w, 0);
    fade.addColorStop(0, "rgba(255,255,255,1)"); fade.addColorStop(0.12, "rgba(255,255,255,0)"); fade.addColorStop(0.88, "rgba(255,255,255,0)"); fade.addColorStop(1, "rgba(255,255,255,1)");
    g.globalCompositeOperation = "destination-out"; g.fillStyle = fade; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over";
    g.strokeStyle = `rgba(${rgb},0.75)`; g.lineWidth = 1.3; g.beginPath();
    for (let i = 0; i <= N; i++) { const x = (i / N) * w; i ? g.lineTo(x, ys[i]) : g.moveTo(x, ys[i]); }
    g.stroke();
    if (dots) { g.fillStyle = acc; for (const [x, y] of dots) { g.beginPath(); g.arc(x, y, 3.5, 0, TAU); g.fill(); } }
  }

  // ---------------------------------------------------------------- bygg panelerna
  let knobEls = [];
  function buildPanels() {
    const pg = PAGES.find((p) => p.id === S.tab) || PAGES[0];
    for (const k in binds) delete binds[k];
    knobEls = [];
    const L = $("#left"), Rt = $("#right");
    L.innerHTML = ""; Rt.innerHTML = "";
    // ljudväljaren
    const br = el("div", "browser");
    br.append(el("div", "ttl", "SOUND"));
    const row = el("div", "row");
    const prev = el("button", "arr", '<svg class="ic" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M15 5l-7 7 7 7"/></svg>');
    const next = el("button", "arr", '<svg class="ic" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M9 5l7 7-7 7"/></svg>');
    const cur = el("button", "cur"); const nm = el("div", "nm");
    prev.onclick = () => step(-1); next.onclick = () => step(1); cur.onclick = openMenu;
    row.append(prev, cur, next); br.append(row, nm);
    br._upd = () => { const pr = D.presets[S.preset], pl = plantOf(S.preset); cur.textContent = `${pl.cat} ${String(pr.nr).padStart(2, "0")}`; nm.textContent = pr.name.toUpperCase(); };
    browserEl = br; br._upd();
    L.append(br);
    const ww = el("div", "wave-wrap"); waveCv = el("canvas", "wave"); ww.append(waveCv); L.append(ww); waveType = pg.wave;
    const kn = el("div", "knobs");
    pg.knobs.forEach(([id, lab]) => { const k = knob(id, lab); kn.append(k); knobEls.push(k); });
    L.append(kn);
    // höger
    const box = el("div"); box.append(el("div", "ttl", pg.rt));
    const sl = el("div", "sliders");
    pg.right.forEach((c) => { if (c[0] === "s") sl.append(slider(c[1], c[2])); else sl.append(choice(c[1], c[2])); });
    box.append(sl); Rt.append(box);
    document.querySelectorAll("#tabs button, #tabs2 button").forEach((b) => b.classList.toggle("on", b.dataset.tab === S.tab));
  }
  let browserEl = null;

  function buildTabs() {
    for (const n of ["#tabs", "#tabs2"]) {
      const t = $(n); t.innerHTML = "";
      PAGES.forEach((p) => { const b = el("button", "", p.name); b.dataset.tab = p.id; b.onclick = () => { S.tab = p.id; buildPanels(); saveUi(); }; t.append(b); });
    }
  }

  // ---------------------------------------------------------------- ljud och växt
  function applyTheme() {
    const pl = plantOf(S.preset);
    const r = document.documentElement.style;
    const rgb = hexRgb(pl.color);
    r.setProperty("--a", pl.color); r.setProperty("--a2", `rgba(${rgb},.38)`); r.setProperty("--a3", `rgba(${rgb},.12)`); r.setProperty("--bg", pl.bg);
    const mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.content = pl.bg;
    flower.set(pl, S.preset, D.presets[S.preset].nr, pl.color);
    knobEls.forEach((k) => k._draw());
    browserEl && browserEl._upd();
    document.querySelectorAll("#list .it").forEach((b) => b.classList.toggle("on", +b.dataset.i === S.preset));
  }
  function selectPreset(i) {
    Bridge.send({ t: "preset", i });
    onPreset(i);
  }
  function onPreset(i) {
    const prevPlant = S.pattern ? S.pattern.plant : null;
    S.preset = i;
    applyTheme();
    const pl = plantOf(i);
    if (!S.pattern || (!S.pattern.edited && prevPlant !== pl.id)) loadPhrase(pl.id, false);
  }
  function step(d) {
    const o = D.order, k = o.indexOf(S.preset);
    selectPreset(o[(k + d + o.length) % o.length]);
  }

  // ---------------------------------------------------------------- menyn
  function buildMenu() {
    const list = $("#list"); list.innerHTML = "";
    D.plants.forEach((pl, pi) => {
      const g = el("div", "grp");
      g.append(el("div", "gh", `<i style="background:${pl.color}"></i>${pl.cat} <span>· ${pl.name}</span>`));
      const it = el("div", "items");
      D.order.filter((i) => D.presets[i].plant === pi).forEach((i) => {
        const b = el("button", "it", D.presets[i].name); b.dataset.i = i;
        b.onclick = () => { selectPreset(i); };
        it.append(b);
      });
      g.append(it); list.append(g);
    });
    buildFoot();
  }
  function buildFoot() {
    const f = $("#mfoot"); f.innerHTML = "";
    if (S.standalone) { const b = el("button", "", "AUDIO / MIDI SETTINGS"); b.onclick = () => Bridge.send({ t: "settings" }); f.append(b); }
    if (S.web) f.append(el("span", "", S.midi.length ? "MIDI IN · " + S.midi.join(", ").toUpperCase() : "MIDI IN · CONNECT A KEYBOARD"));
    const pan = el("button", "", "ALL NOTES OFF"); pan.onclick = () => Bridge.send({ t: "panic" }); f.append(pan);
    f.append(el("span", "", `BLONDA BRIS · ${D.presets.length} SOUNDS · ${D.plants.length} PLANTS`));
  }
  function openMenu() { $("#menu").classList.add("open"); const on = $("#list .it.on"); if (on) on.scrollIntoView({ block: "center" }); }
  function closeMenu() { $("#menu").classList.remove("open"); }

  // ---------------------------------------------------------------- frasen / rullen
  const SCALE = [0, 2, 3, 5, 7, 8, 10];   // c-moll
  const inScale = (n) => SCALE.includes(((n % 12) + 12) % 12);
  function scaleFrom(low, count) { const r = []; let n = low; while (r.length < count) { if (inScale(n)) r.push(n); n++; } return r; }
  function loadPhrase(plantId, user) {
    const ph = D.phrases[plantId];
    const notes = ph.notes.map((n) => n.slice());
    let lo = Math.min(...notes.map((n) => n[2])), hi = Math.max(...notes.map((n) => n[2]));
    let low = lo - 1; while (!inScale(low)) low--;
    const all = scaleFrom(low, 40);
    const rows = clamp(all.indexOf(hi) + 2, 10, 15);
    S.pattern = { rate: ph.rate, low, rows, notes, plant: plantId, edited: false };
    sendPattern();
  }
  function sendPattern() { const p = S.pattern; Bridge.send({ t: "pattern", rate: p.rate, low: p.low, rows: p.rows, notes: p.notes, plant: p.plant, edited: p.edited }); updTside(); }

  const roll = { cv: null, hover: null, tStep: 0, lastStep: -1 };
  function rollGeom() {
    const w = roll.cv.clientWidth, h = roll.cv.clientHeight;
    const rows = S.pattern.rows, cw = w / 16, rh = h / rows;
    return { w, h, rows, cw, rh, scale: scaleFrom(S.pattern.low, rows) };
  }
  function drawRoll(now) {
    const cv = roll.cv; if (!cv || !S.pattern || S.view !== "roll") return;
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const G = rollGeom(), acc = cssVar("--a"), rgb = hexRgb(acc);
    // fält
    g.fillStyle = "rgba(255,255,255,0.28)"; roundRect(g, 0, 0, w, h, 6); g.fill();
    for (let i = 0; i <= 16; i++) {
      g.fillStyle = i % 4 === 0 ? "rgba(43,37,33,0.10)" : "rgba(43,37,33,0.045)";
      g.fillRect(Math.round(i * G.cw), 0, 1, h);
    }
    for (let r = 0; r < G.rows; r++) if (G.scale[r] % 12 === 0) { g.fillStyle = "rgba(43,37,33,0.025)"; g.fillRect(0, h - (r + 1) * G.rh, w, G.rh); }
    // toner
    const bh = Math.max(4, Math.min(7, G.rh * 0.42));
    for (const n of S.pattern.notes) {
      let r = G.scale.indexOf(n[2]); if (r < 0) { r = 0; let best = 99; G.scale.forEach((s, k) => { if (Math.abs(s - n[2]) < best) { best = Math.abs(s - n[2]); r = k; } }); }
      const y = h - (r + 0.5) * G.rh - bh / 2, x = n[0] * G.cw + 2, len = Math.min(16 - n[0], n[1]) * G.cw - 4;
      g.fillStyle = `rgba(${rgb},${0.28 + (n[3] / 127) * 0.42})`;
      roundRect(g, x, y, Math.max(4, len), bh, bh / 2); g.fill();
    }
    // spelhuvud
    const st = S.m.step;
    if (st >= 0) {
      if (st !== roll.lastStep) { roll.lastStep = st; roll.tStep = now; }
      const dur = 60000 / S.tempo / S.pattern.rate;
      const x = (st + Math.min(1, (now - roll.tStep) / dur)) * G.cw;
      g.fillStyle = acc; g.fillRect(Math.round(x), 0, 1.5, h);
      g.beginPath(); g.arc(x + 0.75, 3, 3.5, 0, TAU); g.fill();
    } else roll.lastStep = -1;
  }
  function rollInput() {
    const cv = roll.cv;
    let drag = null;
    cv.addEventListener("pointerdown", (e) => {
      const r = cv.getBoundingClientRect(), G = rollGeom();
      const stp = clamp(Math.floor((e.clientX - r.left) / G.cw), 0, 15), row = clamp(Math.floor((r.bottom - e.clientY) / G.rh), 0, G.rows - 1);
      const note = G.scale[row];
      const hit = S.pattern.notes.findIndex((n) => n[2] === note && stp >= n[0] && stp < n[0] + n[1]);
      cv.setPointerCapture(e.pointerId);
      if (hit >= 0) { drag = { del: hit, moved: false, x0: e.clientX }; }
      else {
        const n = [stp, 1, note, 100];
        S.pattern.notes.push(n); S.pattern.edited = true;
        drag = { n, s0: stp, moved: false };
        audition(note);
        sendPattern();
      }
      e.preventDefault();
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const r = cv.getBoundingClientRect(), G = rollGeom();
      if (drag.n) {
        const s = clamp(Math.floor((e.clientX - r.left) / G.cw), drag.s0, 15);
        const len = s - drag.s0 + 1;
        if (len !== drag.n[1]) { drag.n[1] = len; sendPattern(); }
      } else if (Math.abs(e.clientX - drag.x0) > 6) drag.moved = true;
    });
    const up = () => {
      if (drag && drag.del !== undefined && !drag.moved) { S.pattern.notes.splice(drag.del, 1); S.pattern.edited = true; sendPattern(); }
      drag = null;
    };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  }
  function audition(n) {
    if (S.playing) return;
    Bridge.send({ t: "note", n, v: 96 });
    setTimeout(() => Bridge.send({ t: "off", n }), 180);
  }

  // ---------------------------------------------------------------- tangenterna
  const keys = { cv: null, down: new Map(), lit: new Set(), lvl: new Map() };
  function keyLayout() {
    const w = keys.cv.clientWidth, h = keys.cv.clientHeight;
    const nW = clamp(Math.floor(w / 52), 7, 26);
    const ww = w / nW, base = 48 + S.oct * 12;
    const whites = [], blacks = [];
    let n = base, i = 0;
    while (whites.length < nW) {
      const pc = n % 12;
      if ([1, 3, 6, 8, 10].includes(pc)) { blacks.push({ n, x: whites.length * ww - ww * 0.24, w: ww * 0.48, h: h * 0.56 }); }
      else whites.push({ n, x: whites.length * ww, w: ww, h });
      n++; i++;
    }
    return { whites, blacks: blacks.filter((b) => b.x > 0 && b.x + b.w < w), ww };
  }
  function keyAt(x, y) {
    const L = keyLayout();
    for (const b of L.blacks) if (x >= b.x && x < b.x + b.w && y < b.h) return { n: b.n, y: y / b.h };
    for (const k of L.whites) if (x >= k.x && x < k.x + k.w) return { n: k.n, y: y / k.h };
    return null;
  }
  // minimalistiska tangenter: en ljus yta med hårfina skiljelinjer, mjuka svarta tangenter, och en tryckt tangent
  // som tänds underifrån i växtens färg och tonar ut lugnt när den släpps
  function drawKeys() {
    const cv = keys.cv; if (!cv || S.view !== "keys") return;
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const L = keyLayout(), acc = cssVar("--a"), rgb = hexRgb(acc);
    // nivåer: 1 medan tangenten hålls, tonar ut efter släpp
    for (const n of keys.lit) keys.lvl.set(n, 1);
    for (const [n, v] of keys.lvl) { if (!keys.lit.has(n)) { const nv = v * 0.88; if (nv < 0.01) keys.lvl.delete(n); else keys.lvl.set(n, nv); } }
    const lv = (n) => keys.lvl.get(n) || 0;
    const kw = L.whites.length * L.ww;
    g.fillStyle = "rgba(255,255,255,0.34)"; roundRect(g, 0, 0, kw, h, 8); g.fill();
    for (const k of L.whites) {
      const v = lv(k.n);
      if (v > 0) {
        const gr = g.createLinearGradient(0, h, 0, h * 0.25);
        gr.addColorStop(0, `rgba(${rgb},${0.30 * v})`); gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr; g.fillRect(k.x + 1, 0, k.w - 2, h);
        g.fillStyle = `rgba(${rgb},${v})`; roundRect(g, k.x + k.w * 0.3, h - 7, k.w * 0.4, 2, 1); g.fill();
      }
      if (k.x > 0) { g.fillStyle = "rgba(43,37,33,0.075)"; g.fillRect(Math.round(k.x), 10, 1, h - 20); }
      if (k.n % 12 === 0) { g.fillStyle = "rgba(43,37,33,0.32)"; g.font = "500 9px 'BLONDA Mono'"; g.textAlign = "center"; g.fillText("C" + (Math.floor(k.n / 12) - 1), k.x + k.w / 2, h - 16); }
    }
    for (const b of L.blacks) {
      const v = lv(b.n);
      // hålet först, så att skiljelinjerna inte syns genom den svarta tangenten
      g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; roundRect(g, b.x - 1, 0, b.w + 2, b.h + 1, Math.min(6, b.w / 2)); g.fill();
      g.globalCompositeOperation = "source-over";
      g.fillStyle = "rgba(43,37,33,0.24)";
      roundRect(g, b.x, 0, b.w, b.h, Math.min(6, b.w / 2)); g.fill();
      if (v > 0) { g.fillStyle = `rgba(${rgb},${0.85 * v})`; roundRect(g, b.x, 0, b.w, b.h, Math.min(6, b.w / 2)); g.fill(); }
    }
  }
  function keysInput() {
    const cv = keys.cv;
    const press = (pid, x, y) => {
      const k = keyAt(x, y); const old = keys.down.get(pid);
      if (k && old === k.n) return;
      if (old !== undefined) { Bridge.send({ t: "off", n: old }); keys.lit.delete(old); keys.down.delete(pid); }
      if (k) { const v = Math.round(clamp(50 + k.y * 77, 1, 127)); Bridge.send({ t: "note", n: k.n, v }); keys.lit.add(k.n); keys.down.set(pid, k.n); }
    };
    cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect(); press(e.pointerId, e.clientX - r.left, e.clientY - r.top); e.preventDefault(); });
    cv.addEventListener("pointermove", (e) => { if (!keys.down.has(e.pointerId)) return; const r = cv.getBoundingClientRect(); press(e.pointerId, e.clientX - r.left, e.clientY - r.top); });
    const up = (e) => { const old = keys.down.get(e.pointerId); if (old !== undefined) { Bridge.send({ t: "off", n: old }); keys.lit.delete(old); keys.down.delete(e.pointerId); } };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  }
  // datorns tangentbord: A W S E D F T G Y H U J K O L P  (Z/X = oktav)
  const KB = "awsedftgyhujkolp";
  const kbDown = new Map();
  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === "z" || k === "x") { S.oct = clamp(S.oct + (k === "z" ? -1 : 1), -3, 3); updTside(); saveUi(); return; }
    if (k === " ") { togglePlay(); e.preventDefault(); return; }
    const i = KB.indexOf(k); if (i < 0 || kbDown.has(k)) return;
    ensureAudio();
    const n = 60 + S.oct * 12 + i; kbDown.set(k, n); keys.lit.add(n);
    Bridge.send({ t: "note", n, v: 100 });
  });
  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase(), n = kbDown.get(k); if (n === undefined) return;
    kbDown.delete(k); keys.lit.delete(n); Bridge.send({ t: "off", n });
  });

  // ---------------------------------------------------------------- transport
  function togglePlay() { setPlaying(!S.playing); }
  function setPlaying(on) { ensureAudio(); S.playing = on; $("#play").classList.toggle("on", on); Bridge.send({ t: "play", on }); }
  function updTside() {
    const t = $("#tside"); t.innerHTML = "";
    if (S.view === "roll" && S.pattern) {
      [[4, "1/16"], [2, "1/8"]].forEach(([r, l]) => { const b = el("button", "tbtn" + (S.pattern.rate === r ? " on" : ""), l); b.onclick = () => { S.pattern.rate = r; S.pattern.edited = true; sendPattern(); }; t.append(b); });
      const c = el("button", "tbtn", "CLEAR"); c.onclick = () => { S.pattern.notes = []; S.pattern.edited = true; sendPattern(); };
      const rs = el("button", "tbtn", "RESET"); rs.onclick = () => loadPhrase(plantOf(S.preset).id, true);
      t.append(c, rs);
    } else {
      const m = el("button", "tbtn", "OCT −"); m.onclick = () => { S.oct = clamp(S.oct - 1, -3, 3); updTside(); saveUi(); };
      const v = el("span", "", (S.oct > 0 ? "+" : "") + S.oct);
      const p = el("button", "tbtn", "+"); p.onclick = () => { S.oct = clamp(S.oct + 1, -3, 3); updTside(); saveUi(); };
      t.append(m, v, p);
    }
  }
  function setView(v) {
    S.view = v; $("#app").classList.toggle("keys", v === "keys");
    $("#vRoll").classList.toggle("on", v === "roll"); $("#vKeys").classList.toggle("on", v === "keys");
    updTside(); saveUi();
  }
  function saveUi() { Bridge.send({ t: "ui", s: JSON.stringify({ tab: S.tab, view: S.view, oct: S.oct }) }); }

  // tempo: dra upp/ned
  function tempoInput() {
    const t = $("#tempo"); let y0 = 0, b0 = 0, pid = null;
    t.addEventListener("pointerdown", (e) => { if (S.hostTempo) return; pid = e.pointerId; t.setPointerCapture(pid); y0 = e.clientY; b0 = S.tempo; });
    t.addEventListener("pointermove", (e) => { if (e.pointerId !== pid) return; setTempo(Math.round((b0 + (y0 - e.clientY) * 0.5) * 2) / 2); });
    t.addEventListener("pointerup", () => (pid = null));
    t.addEventListener("dblclick", () => { if (!S.hostTempo) setTempo(120); });
  }
  function setTempo(b) { S.tempo = clamp(b, 40, 240); updTempo(); Bridge.send({ t: "tempo", bpm: S.tempo }); }
  function updTempo() { $("#bpm").textContent = S.tempo.toFixed(1) + " BPM"; $("#tempo").classList.toggle("host", S.hostTempo); }

  // ---------------------------------------------------------------- ljudstart (webben)
  function ensureAudio() { if (Bridge.mode === "web" && !Bridge.running) Bridge.startAudio().then(() => $("#start").classList.remove("show")); }

  // ---------------------------------------------------------------- hjälpare
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function hexRgb(hex) { const n = parseInt(hex.replace("#", ""), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
  function roundRect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // ---------------------------------------------------------------- start
  const flower = Blommor.create($("#fBack"), $("#fGl"), $("#fFront"), D.blommor);
  flower.preload([...new Set(D.plants.map((p) => p.photo))]);
  let envSm = 0;
  buildTabs();
  buildPanels();
  buildMenu();
  roll.cv = $("#roll canvas"); keys.cv = $("#keys canvas");
  rollInput(); keysInput(); tempoInput();
  $("#menuBtn").onclick = openMenu; $("#menuClose").onclick = closeMenu; $("#menu .shade").onclick = closeMenu;
  $("#play").onclick = togglePlay;
  $("#stop").onclick = () => { setPlaying(false); };
  $("#back").onclick = () => { if (S.playing) { Bridge.send({ t: "play", on: false }); Bridge.send({ t: "play", on: true }); } };
  $("#vRoll").onclick = () => setView("roll"); $("#vKeys").onclick = () => setView("keys");
  document.addEventListener("pointerdown", () => ensureAudio(), { capture: true });

  Bridge.on.state = (st) => {
    S.standalone = !!st.standalone; S.web = !!st.web;
    if (st.params) for (const id in st.params) setParam(id, st.params[id], false);
    S.tempo = st.tempo || 120; S.hostTempo = !!st.hostTempo; updTempo();
    S.playing = !!st.playing; $("#play").classList.toggle("on", S.playing);
    if (st.ui) { try { const u = JSON.parse(st.ui); S.tab = u.tab || S.tab; S.view = u.view || S.view; S.oct = u.oct || 0; } catch (e) { /* */ } }
    S.pattern = st.pattern && st.pattern.notes ? st.pattern : null;
    S.preset = st.preset ?? S.preset;
    buildPanels();
    onPreset(S.preset);
    if (S.pattern) sendPattern();
    setView(S.view);
    buildFoot();
    if (Bridge.needsGesture) $("#start").classList.add("show");
    flower.signals({ cut: S.v.cut, res: S.v.res, lrate: S.v.lrate });
  };
  Bridge.on.params = (v) => { for (const id in v) setParam(id, v[id], false); };
  Bridge.on.preset = (i) => { if (i !== S.preset) onPreset(i); };
  Bridge.on.info = (m) => { if (m.midi) { S.midi = m.midi; buildFoot(); } };
  Bridge.on.meters = (m) => {
    S.m.env = m.env; S.m.lfo = m.lfo; S.m.pk = m.pk; S.m.mask = m.mask; S.m.step = m.step; S.m.nc = m.nc;
    if (m.scope) S.m.scope = m.scope;
    if (m.bpm && m.host) { S.hostTempo = true; if (Math.abs(m.bpm - S.tempo) > 0.01) { S.tempo = m.bpm; updTempo(); } }
    if (m.playing !== undefined && m.playing !== S.playing) { S.playing = m.playing; $("#play").classList.toggle("on", S.playing); }
    flower.signals({ env: m.env, lfo: m.lfo, pk: m.pk, mask: m.mask, step: m.step, nc: m.nc });
  };
  $("#start").addEventListener("click", () => { ensureAudio(); });

  function loop(now) {
    requestAnimationFrame(loop);
    envSm += (S.m.env - envSm) * 0.12;
    drawWave(now / 1000);
    drawRoll(now);
    drawKeys();
  }
  requestAnimationFrame(loop);
  window.addEventListener("resize", () => knobEls.forEach((k) => k._draw()));
  document.fonts && document.fonts.ready.then(() => knobEls.forEach((k) => k._draw()));
  Bridge.start();
  window.__bris = { S, setParam, selectPreset, setPlaying, setView, loadPhrase };   // för tester
})();
