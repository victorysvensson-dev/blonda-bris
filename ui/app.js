// BLONDA BRIS – gränssnittets logik: flikar, rattar, reglage, ljudlistan, vågen och tangenterna.
// PLAY = blomman stort och tangenter att spela på. Övriga flikar = ljudets inställningar.
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
    v: {}, preset: 65, tab: "play", oct: 0, standalone: false, web: Bridge.mode === "web", midi: [],
    m: { env: 0, lfo: 0, pk: 0, mask: 0, nc: 0, scope: null },
  };
  D.params.forEach((p) => (S.v[p.id] = p.def));
  const plantOf = (i) => D.plants[D.presets[i].plant];

  // ---------------------------------------------------------------- sidorna
  const PAGES = [
    { id: "play", name: "PLAY", rt: "TONE", right: [["s", "cut", "CUTOFF"], ["s", "res", "RESONANCE"], ["s", "rvb", "SPACE"]] },
    { id: "osc", name: "OSC", wave: "osc", kt: "OSC", knobs: [["pw", "PW"], ["sub", "SUB"], ["detune", "DETUNE"], ["porta", "GLIDE"]],
      rt: "VOICE", right: [["c", "vform", ["SAW", "PULSE", "BOTH"]], ["c", "lage", ["STEREO", "POLY", "MONO", "UNISON"]], ["s", "uniint", "INTERVAL"], ["s", "bendr", "BEND"]] },
    { id: "filter", name: "FILTER", wave: "filter", kt: "ENVELOPE", knobs: [["fa", "A"], ["fd", "D"], ["fs", "S"], ["fr", "R"]],
      rt: "FILTER", right: [["s", "cut", "CUTOFF"], ["s", "res", "RESONANCE"], ["s", "eg1", "ENVELOPE"], ["s", "kbd", "KEY TRACK"]] },
    { id: "amp", name: "AMP", wave: "env", kt: "ENVELOPE", knobs: [["aa", "A"], ["ad", "D"], ["asus", "S"], ["ar", "R"]],
      rt: "AMP", right: [["s", "vela", "VELOCITY"], ["s", "lfoamp", "TREMOLO"], ["s", "vol", "VOLUME"]] },
    { id: "mod", name: "MOD", wave: "lfo", kt: "LFO", knobs: [["lrate", "RATE"], ["lfoosc", "VIB"], ["lfopwm", "PWM"], ["lfocut", "FILT"]],
      rt: "SHAPE", right: [["c", "lwave", ["TRI", "UP", "DOWN", "SQR", "RND"]], ["s", "mwosc", "WHEEL VIB"], ["s", "mwcut", "WHEEL CUT"]] },
    { id: "fx", name: "FX", wave: "scope", kt: "CHORUS · DELAY", knobs: [["chorus", "CHORUS"], ["dtime", "TIME"], ["dfb", "FDBK"], ["dmix", "MIX"]],
      rt: "SPACE", right: [["s", "rvb", "REVERB"], ["s", "rsize", "SIZE"], ["s", "drive", "DRIVE"]] },
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
    } else if (waveType === "env") {
      // ADSR som form: attack, decay, sustain, release (tiderna 0..1 visas proportionellt)
      const a = 0.04 + v.aa * 0.3, d = 0.04 + v.ad * 0.3, r = 0.04 + v.ar * 0.3, s = v.asus;
      const tot = a + d + 0.25 + r, N = 160;
      for (let i = 0; i <= N; i++) {
        const x = (i / N) * tot; let y;
        if (x < a) y = x / a; else if (x < a + d) y = 1 - (1 - s) * ((x - a) / d); else if (x < a + d + 0.25) y = s; else y = s * (1 - (x - a - d - 0.25) / r);
        ys[i] = h * 0.88 - clamp(y, 0, 1) * h * 0.72;
      }
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


  // ---------------------------------------------------------------- bygg sidan
  let knobEls = [], browserEl = null;
  function buildPanels() {
    const pg = PAGES.find((p) => p.id === S.tab) || PAGES[0];
    for (const k in binds) delete binds[k];
    knobEls = [];
    const L = $("#left"), Rt = $("#right");
    L.innerHTML = ""; Rt.innerHTML = "";
    document.getElementById("app").className = "tab-" + pg.id;
    // ljudväljaren
    const br = el("div", "browser");
    br.append(el("div", "ttl", "SOUND"));
    const row = el("div", "row");
    const prev = el("button", "arr", '<svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>');
    const next = el("button", "arr", '<svg class="ic" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>');
    const cur = el("button", "cur"); const nm = el("div", "nm");
    prev.onclick = () => step(-1); next.onclick = () => step(1); cur.onclick = openMenu;
    const mid = el("div", "mid"); mid.append(cur, nm);
    row.append(prev, mid, next); br.append(row);
    br._upd = () => { const pr = D.presets[S.preset], pl = plantOf(S.preset); cur.textContent = `${pl.cat} ${String(pr.nr).padStart(2, "0")}`; nm.textContent = pr.name.toUpperCase(); };
    browserEl = br; br._upd();
    L.append(br);
    waveCv = null;
    if (pg.wave) { const ww = el("div", "wave-wrap"); waveCv = el("canvas", "wave"); ww.append(waveCv); L.append(ww); waveType = pg.wave; }
    if (pg.knobs) {
      const kb = el("div", "kbox"); kb.append(el("div", "ttl", pg.kt));
      const kn = el("div", "knobs");
      pg.knobs.forEach(([id, lab]) => { const k = knob(id, lab); kn.append(k); knobEls.push(k); });
      kb.append(kn); L.append(kb);
    }
    const box = el("div", "rbox"); box.append(el("div", "ttl", pg.rt));
    const sl = el("div", "sliders");
    pg.right.forEach((c) => { if (c[0] === "s") sl.append(slider(c[1], c[2])); else sl.append(choice(c[1], c[2])); });
    box.append(sl); Rt.append(box);
    document.querySelectorAll("#tabs button, #tabs2 button").forEach((b) => b.classList.toggle("on", b.dataset.tab === S.tab));
  }

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
    flower.set(pl, pl.color);
    knobEls.forEach((k) => k._draw());
    browserEl && browserEl._upd();
    document.querySelectorAll("#list .it").forEach((b) => b.classList.toggle("on", +b.dataset.i === S.preset));
  }
  function selectPreset(i) { Bridge.send({ t: "preset", i }); onPreset(i); }
  function onPreset(i) { S.preset = i; applyTheme(); }
  function step(d) { const o = D.order, k = o.indexOf(S.preset); selectPreset(o[(k + d + o.length) % o.length]); }

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
    f.append(el("span", "", `BLONDA BRIS ${D.version} · ${D.presets.length} SOUNDS`));
  }
  function openMenu() { $("#menu").classList.add("open"); const on = $("#list .it.on"); if (on) on.scrollIntoView({ block: "center" }); }
  function closeMenu() { $("#menu").classList.remove("open"); }

  // ---------------------------------------------------------------- tangenterna
  // Minimalistiska: en ljus yta med hårfina skiljelinjer och mjuka svarta tangenter. En tryckt tangent tänds
  // underifrån i växtens färg och tonar ut lugnt. Till vänster en smal kant med oktav: + / C3 / −.
  const keys = { cv: null, down: new Map(), lit: new Set(), lvl: new Map() };
  const GUT = 34;
  function keyLayout() {
    const w = keys.cv.clientWidth - GUT, h = keys.cv.clientHeight;
    const nW = clamp(Math.round(w / 54), 7, 26);
    const ww = w / nW, base = 48 + S.oct * 12;
    const whites = [], blacks = [];
    let n = base;
    while (whites.length < nW) {
      const pc = n % 12;
      if ([1, 3, 6, 8, 10].includes(pc)) blacks.push({ n, x: GUT + whites.length * ww - ww * 0.24, w: ww * 0.48, h: h * 0.58 });
      else whites.push({ n, x: GUT + whites.length * ww, w: ww, h });
      n++;
    }
    return { whites, blacks: blacks.filter((b) => b.x > GUT && b.x + b.w < GUT + w), ww, w, h };
  }
  function keyAt(x, y) {
    const L = keyLayout();
    for (const b of L.blacks) if (x >= b.x && x < b.x + b.w && y < b.h) return { n: b.n, y: y / b.h };
    for (const k of L.whites) if (x >= k.x && x < k.x + k.w) return { n: k.n, y: y / k.h };
    return null;
  }
  function drawKeys() {
    const cv = keys.cv; if (!cv) return;
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const L = keyLayout(), acc = cssVar("--a"), rgb = hexRgb(acc);
    for (const n of keys.lit) keys.lvl.set(n, 1);
    for (const [n, v] of keys.lvl) { if (!keys.lit.has(n)) { const nv = v * 0.88; if (nv < 0.01) keys.lvl.delete(n); else keys.lvl.set(n, nv); } }
    const lv = (n) => keys.lvl.get(n) || 0;
    // oktavkanten
    g.fillStyle = "rgba(43,37,33,0.45)"; g.font = "500 13px 'BLONDA Mono'"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("+", GUT / 2 - 4, h * 0.2); g.fillText("−", GUT / 2 - 4, h * 0.8);
    g.font = "500 9px 'BLONDA Mono'"; g.fillStyle = "rgba(43,37,33,0.35)"; g.fillText("C" + (3 + S.oct), GUT / 2 - 4, h * 0.5);
    g.fillStyle = "rgba(255,255,255,0.34)"; roundRect(g, GUT, 0, L.w, h, 8); g.fill();
    for (const k of L.whites) {
      const v = lv(k.n);
      if (v > 0) {
        const gr = g.createLinearGradient(0, h, 0, h * 0.25);
        gr.addColorStop(0, `rgba(${rgb},${0.30 * v})`); gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr; g.fillRect(k.x + 1, 0, k.w - 2, h);
        g.fillStyle = `rgba(${rgb},${v})`; roundRect(g, k.x + k.w * 0.3, h - 7, k.w * 0.4, 2, 1); g.fill();
      }
      if (k.x > GUT + 1) { g.fillStyle = "rgba(43,37,33,0.075)"; g.fillRect(Math.round(k.x), 10, 1, h - 20); }
    }
    for (const b of L.blacks) {
      const v = lv(b.n), rr = Math.min(6, b.w / 2);
      g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; roundRect(g, b.x - 1, 0, b.w + 2, b.h + 1, rr); g.fill();
      g.globalCompositeOperation = "source-over";
      g.fillStyle = "rgba(43,37,33,0.24)"; roundRect(g, b.x, 0, b.w, b.h, rr); g.fill();
      if (v > 0) { g.fillStyle = `rgba(${rgb},${0.85 * v})`; roundRect(g, b.x, 0, b.w, b.h, rr); g.fill(); }
    }
  }
  function setOct(o) {
    o = clamp(o, -3, 3); if (o === S.oct) return;
    for (const n of keys.down.values()) Bridge.send({ t: "off", n });
    keys.down.clear(); keys.lit.clear(); S.oct = o; saveUi();
  }
  function keysInput() {
    const cv = keys.cv;
    const press = (pid, x, y) => {
      const k = keyAt(x, y); const old = keys.down.get(pid);
      if (k && old === k.n) return;
      if (old !== undefined) { Bridge.send({ t: "off", n: old }); keys.lit.delete(old); keys.down.delete(pid); }
      if (k) { const v = Math.round(clamp(50 + k.y * 77, 1, 127)); Bridge.send({ t: "note", n: k.n, v }); keys.lit.add(k.n); keys.down.set(pid, k.n); }
    };
    cv.addEventListener("pointerdown", (e) => {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < GUT) { if (y < r.height * 0.4) setOct(S.oct + 1); else if (y > r.height * 0.6) setOct(S.oct - 1); return; }
      cv.setPointerCapture(e.pointerId); press(e.pointerId, x, y); e.preventDefault();
    });
    cv.addEventListener("pointermove", (e) => { if (!keys.down.has(e.pointerId)) return; const r = cv.getBoundingClientRect(); press(e.pointerId, e.clientX - r.left, e.clientY - r.top); });
    const up = (e) => { const old = keys.down.get(e.pointerId); if (old !== undefined) { Bridge.send({ t: "off", n: old }); keys.lit.delete(old); keys.down.delete(e.pointerId); } };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  }
  const KB = "awsedftgyhujkolp";
  const kbDown = new Map();
  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === "z" || k === "x") { setOct(S.oct + (k === "z" ? -1 : 1)); return; }
    const i = KB.indexOf(k); if (i < 0 || kbDown.has(k)) return;
    ensureAudio();
    const n = 60 + S.oct * 12 + i; kbDown.set(k, n); keys.lit.add(n);
    Bridge.send({ t: "note", n, v: 100 });
  });
  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase(), n = kbDown.get(k); if (n === undefined) return;
    kbDown.delete(k); keys.lit.delete(n); Bridge.send({ t: "off", n });
  });


  function saveUi() { Bridge.send({ t: "ui", s: JSON.stringify({ tab: S.tab, oct: S.oct }) }); }

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
  $("#ver").textContent = "BRIS " + D.version;
  buildTabs();
  buildPanels();
  buildMenu();
  keys.cv = $("#keys canvas");
  keysInput();
  $("#menuBtn").onclick = openMenu; $("#menuClose").onclick = closeMenu; $("#menu .shade").onclick = closeMenu;
  document.addEventListener("pointerdown", () => ensureAudio(), { capture: true });

  Bridge.on.state = (st) => {
    S.standalone = !!st.standalone; S.web = !!st.web;
    if (st.params) for (const id in st.params) setParam(id, st.params[id], false);
    if (st.ui) { try { const u = JSON.parse(st.ui); if (PAGES.some((p) => p.id === u.tab)) S.tab = u.tab; S.oct = u.oct || 0; } catch (e) { /* */ } }
    S.preset = st.preset ?? S.preset;
    buildPanels();
    onPreset(S.preset);
    buildFoot();
    Bridge.send({ t: "play", on: false });   // rullen finns inte längre: se till att den aldrig spelar
    if (Bridge.needsGesture) $("#start").classList.add("show");
    flower.signals({ cut: S.v.cut, res: S.v.res, lrate: S.v.lrate });
  };
  Bridge.on.params = (v) => { for (const id in v) setParam(id, v[id], false); };
  Bridge.on.preset = (i) => { if (i !== S.preset) onPreset(i); };
  Bridge.on.info = (m) => { if (m.midi) { S.midi = m.midi; buildFoot(); } };
  Bridge.on.meters = (m) => {
    S.m.env = m.env; S.m.lfo = m.lfo; S.m.pk = m.pk; S.m.mask = m.mask; S.m.nc = m.nc;
    if (m.scope) S.m.scope = m.scope;
    flower.signals({ env: m.env, lfo: m.lfo, pk: m.pk, mask: m.mask, nc: m.nc });
  };
  $("#start").addEventListener("click", () => { ensureAudio(); });

  function loop(now) {
    requestAnimationFrame(loop);
    envSm += (S.m.env - envSm) * 0.12;
    drawWave(now / 1000);
    drawKeys();
  }
  requestAnimationFrame(loop);
  window.addEventListener("resize", () => knobEls.forEach((k) => k._draw()));
  document.fonts && document.fonts.ready.then(() => knobEls.forEach((k) => k._draw()));
  Bridge.start();
  window.__bris = { S, setParam, selectPreset, note: (n, v) => Bridge.send({ t: "note", n, v }), off: (n) => Bridge.send({ t: "off", n }), tab: (t) => { S.tab = t; buildPanels(); } };   // för tester
})();
