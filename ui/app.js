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
    m: { env: 0, lfo: 0, pk: 0, mask: 0, nc: 0, glid: 0, scope: null }, mod: {},
    kz: 1, kh: null,   // tangenternas zoom (1 = ca 56 px per vit tangent) och höjd (andel av fönstret, null = standard)
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
  // modulering (glid/MPE) som visas i reglagen: id -> [uppdatera(värde eller undefined)]
  const modB = {};
  function bindMod(id, f) { (modB[id] = modB[id] || []).push(f); }

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
      if (mv !== undefined) {   // glidet: bågen fortsätter ljusare till det modulerade värdet, med en prick
        const am = a0 + (a1 - a0) * clamp((mv - p.min) / (p.max - p.min), 0, 1);
        g.globalAlpha = 0.45; g.beginPath(); g.arc(s / 2, s / 2, r, Math.min(av, am), Math.max(av, am)); g.stroke(); g.globalAlpha = 1;
        g.fillStyle = acc; g.beginPath(); g.arc(s / 2 + Math.cos(am) * r, s / 2 + Math.sin(am) * r, 2.6, 0, TAU); g.fill();
      }
    };
    let mv;
    k._draw = () => draw(S.v[id]);
    bind(id, draw);
    bindMod(id, (m) => { mv = m; draw(S.v[id]); });
    dragger(k, id, "v");
    return k;
  }

  function slider(id, label) {
    const s = el("div", "slider");
    const lab = el("div", "lab", label); lab.dataset.t = label;
    const tr = el("div", "tr"); const fill = el("div", "fill"); const hd = el("div", "hd");
    const mf = el("div", "mfill"), md = el("div", "mdot");   // glidet: ljusare linje och prick till det modulerade värdet
    tr.append(fill, mf, hd, md); s.append(lab, tr);
    const showMod = (m) => {
      if (m === undefined) { mf.style.display = md.style.display = "none"; return; }
      const p = P[id], x = (S.v[id] - p.min) / (p.max - p.min), xm = clamp((m - p.min) / (p.max - p.min), 0, 1);
      mf.style.display = md.style.display = "block";
      mf.style.left = Math.min(x, xm) * 100 + "%"; mf.style.width = Math.abs(xm - x) * 100 + "%"; md.style.left = xm * 100 + "%";
    };
    bindMod(id, showMod);
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
    for (const k in modB) delete modB[k];
    S.mod = {};   // nästa bildruta skickar moduleringen till de nya reglagen
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
  // Lugna, ljusa tangenter som egna mjuka plattor, svarta tangenter i bläckfärg. En tryckt tangent tänds underifrån
  // i växtens färg. Glid: håll tangenter och för fingrarna rakt uppåt -> ljudet moduleras (målet väljs i raden
  // ovanför: FILTER, VIBRATO, TREMOLO, PWM, WAH). Till vänster oktaven: + / C3 / −.
  const GLID = [["OFF", "OFF"], ...D.glid.targets.map((t) => [t.name, t.short])];
  S.glid = { m: 1, v: 0, sent: -1 };
  const keys = { cv: null, down: new Map(), lit: new Set(), lvl: new Map() };
  const GUT = 34, GAP = 3, KZ_MIN = 0.55, KZ_MAX = 2.4;
  function keyLayout() {
    const w = keys.cv.clientWidth - GUT, h = keys.cv.clientHeight;
    const nW = clamp(Math.round(w / (56 * S.kz)), 5, 40);
    const ww = w / nW, base = 48 + S.oct * 12;
    const whites = [], blacks = [];
    let n = base;
    while (whites.length < nW) {
      const pc = n % 12;
      if ([1, 3, 6, 8, 10].includes(pc)) blacks.push({ n, x: GUT + whites.length * ww - ww * 0.27, w: ww * 0.54, h: h * 0.6, black: true });
      else whites.push({ n, x: GUT + whites.length * ww, w: ww, h });
      n++;
    }
    return { whites, blacks: blacks.filter((b) => b.x > GUT && b.x + b.w < GUT + w), ww, w, h };
  }
  function keyAt(x, y) {
    const L = keyLayout();
    for (const b of L.blacks) if (x >= b.x && x < b.x + b.w && y < b.h) return { ...b, y: y / b.h };
    for (const k of L.whites) if (x >= k.x && x < k.x + k.w) return { ...k, y: y / k.h };
    return null;
  }
  function drawKeys() {
    const cv = keys.cv; if (!cv) return;
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const L = keyLayout(), rgb = hexRgb(cssVar("--a"));
    for (const n of keys.lit) keys.lvl.set(n, 1);
    for (const [n, v] of keys.lvl) { if (!keys.lit.has(n)) { const nv = v * 0.88; if (nv < 0.01) keys.lvl.delete(n); else keys.lvl.set(n, nv); } }
    const lv = (n) => keys.lvl.get(n) || 0;
    // glid per ton (för att rita linjen där fingret glider)
    const gl = new Map();
    for (const d of keys.down.values()) gl.set(d.n, d);
    // oktaven
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(43,37,33,0.42)"; g.font = "400 15px 'BLONDA Mono'";
    g.fillText("+", GUT / 2 - 5, h * 0.2); g.fillText("−", GUT / 2 - 5, h * 0.8);
    g.font = "500 9px 'BLONDA Mono'"; g.fillStyle = "rgba(43,37,33,0.34)"; g.fillText("C" + (3 + S.oct), GUT / 2 - 5, h * 0.5);
    // vita tangenter: egna plattor
    for (const k of L.whites) {
      const v = lv(k.n), x = k.x + GAP / 2, kw = k.w - GAP;
      g.fillStyle = "rgba(255,255,255,0.66)"; roundRect(g, x, 0.5, kw, h - 1, 7); g.fill();
      g.strokeStyle = "rgba(43,37,33,0.07)"; g.lineWidth = 1; roundRect(g, x + 0.5, 0.5, kw - 1, h - 1, 7); g.stroke();
      if (v > 0) {
        const gr = g.createLinearGradient(0, h, 0, h * 0.2);
        gr.addColorStop(0, `rgba(${rgb},${0.34 * v})`); gr.addColorStop(1, `rgba(${rgb},0)`);
        g.save(); roundRect(g, x, 0, kw, h, 7); g.clip(); g.fillStyle = gr; g.fillRect(x, 0, kw, h); g.restore();
        g.fillStyle = `rgba(${rgb},${v})`; roundRect(g, x + kw * 0.32, h - 9, kw * 0.36, 2, 1); g.fill();
      }
    }
    // svarta tangenter: bläck, rundade nertill, med luft runt sig
    for (const b of L.blacks) {
      const v = lv(b.n), rr = Math.min(6, b.w / 2.4);
      g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
      roundRect(g, b.x - GAP, -1, b.w + GAP * 2, b.h + GAP + 1, rr + GAP); g.fill();
      g.globalCompositeOperation = "source-over";
      const gr = g.createLinearGradient(0, 0, 0, b.h);
      gr.addColorStop(0, "rgba(43,37,33,0.70)"); gr.addColorStop(1, "rgba(43,37,33,0.56)");
      g.fillStyle = gr; roundRect(g, b.x, 0, b.w, b.h, rr); g.fill();
      g.fillStyle = "rgba(255,255,255,0.10)"; roundRect(g, b.x + b.w * 0.2, b.h - 7, b.w * 0.6, 2, 1); g.fill();
      if (v > 0) { g.fillStyle = `rgba(${rgb},${0.9 * v})`; roundRect(g, b.x, 0, b.w, b.h, rr); g.fill(); }
    }
    // glidet: en tunn linje från där fingret tryckte till där det är nu, och en prick som lyser starkare ju högre
    if (S.glid.m > 0) for (const d of gl.values()) {
      if (d.up <= 0.01) continue;
      const cx = d.x + d.w / 2, y0 = d.y0, y1 = Math.max(4, d.y);
      const gr = g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(1, `rgba(${rgb},${0.35 + 0.6 * d.up})`);
      g.strokeStyle = gr; g.lineWidth = 2; g.lineCap = "round";
      g.beginPath(); g.moveTo(cx, y0); g.lineTo(cx, y1); g.stroke();
      g.fillStyle = `rgba(${rgb},${0.18 * d.up})`; g.beginPath(); g.arc(cx, y1, 9 + 7 * d.up, 0, TAU); g.fill();
      g.fillStyle = `rgba(${rgb},1)`; g.beginPath(); g.arc(cx, y1, 3, 0, TAU); g.fill();
    }
  }
  function setOct(o) {
    o = clamp(o, -3, 3); if (o === S.oct) return;
    for (const d of keys.down.values()) Bridge.send({ t: "off", n: d.n });
    keys.down.clear(); keys.lit.clear(); S.oct = o; updGlid(); saveUi();
  }
  // glidets värde = det högsta av fingrarna som hålls; skickas högst en gång per bildruta
  function updGlid() {
    let v = 0;
    for (const d of keys.down.values()) v = Math.max(v, d.up);
    S.glid.v = S.glid.m > 0 ? v : 0;
  }
  function sendGlid() {
    if (Math.abs(S.glid.v - S.glid.sent) < 0.004 && !(S.glid.v === 0 && S.glid.sent !== 0)) return;
    S.glid.sent = S.glid.v; Bridge.send({ t: "glid", m: S.glid.m, v: +S.glid.v.toFixed(4) });
  }
  function setGlidMode(m) {
    S.glid.m = m; S.glid.sent = -1; updGlid();
    document.querySelectorAll("#kbar .opt").forEach((o) => o.classList.toggle("on", +o.dataset.m === m));
    Bridge.send({ t: "glid", m, v: S.glid.v }); saveUi();
  }
  function buildKbar() {
    const bar = $("#kbar"); bar.innerHTML = "";
    bar.append(el("span", "ttl", '<span class="l">SLIDE UP</span><span class="s">SLIDE</span>'));
    const row = el("div", "choice");
    GLID.forEach(([lang, kort], m) => {
      const o = el("button", "opt" + (m === S.glid.m ? " on" : ""), `<i></i><span class="l">${lang}</span><span class="s">${kort}</span>`);
      o.dataset.m = m; o.onclick = () => setGlidMode(m); row.append(o);
    });
    bar.append(row);
    // zoom: färre och större tangenter (+) eller fler och mindre (−)
    const z = el("div", "zoom");
    const zo = el("button", "", '<svg class="ic" viewBox="0 0 24 24"><path d="M6 12h12"/></svg>');
    const zi = el("button", "", '<svg class="ic" viewBox="0 0 24 24"><path d="M6 12h12M12 6v12"/></svg>');
    zo.setAttribute("aria-label", "Fler tangenter"); zi.setAttribute("aria-label", "Större tangenter");
    zo.onclick = () => setZoom(S.kz / 1.2); zi.onclick = () => setZoom(S.kz * 1.2);
    z.append(el("span", "ttl", "KEYS"), zo, zi); bar.append(z);
  }
  function setZoom(k) { S.kz = clamp(k, KZ_MIN, KZ_MAX); saveUi(); }
  // tangenternas höjd: dra i strecket ovanför. Sparas som andel av fönstrets höjd; blomman behåller alltid plats.
  function applyKeysHeight() {
    const ks = $("#keys");
    if (S.kh == null) { ks.style.height = ""; return; }
    ks.style.height = Math.round(clamp(S.kh * innerHeight, 120, innerHeight * 0.55)) + "px";
    const st = $("#stage").getBoundingClientRect().height, minSt = Math.min(200, innerHeight * 0.22);
    if (st < minSt) ks.style.height = Math.max(120, ks.getBoundingClientRect().height - (minSt - st)) + "px";
  }
  function gripInput() {
    const gr = $("#kgrip"); let pid = null, y0 = 0, h0 = 0;
    gr.addEventListener("pointerdown", (e) => { pid = e.pointerId; gr.setPointerCapture(pid); y0 = e.clientY; h0 = $("#keys").getBoundingClientRect().height; gr.classList.add("drag"); e.preventDefault(); });
    gr.addEventListener("pointermove", (e) => { if (e.pointerId !== pid) return; S.kh = (h0 + (y0 - e.clientY)) / innerHeight; applyKeysHeight(); knobEls.forEach((k) => k._draw()); });
    const end = (e) => { if (e.pointerId !== pid) return; pid = null; gr.classList.remove("drag"); S.kh = $("#keys").getBoundingClientRect().height / innerHeight; saveUi(); };
    gr.addEventListener("pointerup", end); gr.addEventListener("pointercancel", end);
    gr.addEventListener("dblclick", () => { S.kh = null; applyKeysHeight(); saveUi(); });
  }
  function keysInput() {
    const cv = keys.cv;
    const kh = () => cv.clientHeight;
    const release = (pid) => { const d = keys.down.get(pid); if (!d) return; Bridge.send({ t: "off", n: d.n }); keys.lit.delete(d.n); keys.down.delete(pid); };
    const start = (pid, k, y) => {
      const v = Math.round(clamp(50 + k.y * 77, 1, 127));
      Bridge.send({ t: "note", n: k.n, v }); keys.lit.add(k.n);
      keys.down.set(pid, { n: k.n, x: k.x, w: k.w, black: !!k.black, y0: y, y, up: 0 });
    };
    cv.addEventListener("pointerdown", (e) => {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < GUT) { if (y < r.height * 0.4) setOct(S.oct + 1); else if (y > r.height * 0.6) setOct(S.oct - 1); return; }
      const k = keyAt(x, y); if (!k) return;
      cv.setPointerCapture(e.pointerId); release(e.pointerId); start(e.pointerId, k, y); e.preventDefault();
    });
    cv.addEventListener("pointermove", (e) => {
      const d = keys.down.get(e.pointerId); if (!d) return;
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      // fingret stannar på sin tangent så länge det är inom tangentens bredd (glider man uppåt in bland de svarta
      // tangenterna byts inte tonen); går det åt sidan till en annan tangent spelas den (glissando) och glidet börjar om
      if (x < d.x - 2 || x > d.x + d.w + 2) {
        const k = keyAt(x, y);
        if (k && k.n !== d.n) { release(e.pointerId); start(e.pointerId, k, y); updGlid(); }
        return;
      }
      d.y = y; d.up = clamp((d.y0 - y) / (kh() * 0.55), 0, 1);
      updGlid();
    });
    const up = (e) => { release(e.pointerId); updGlid(); };
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


  // glidets modulering visas i reglagen: målparametern (och LFO-takten för vibrato/tremolo) får en prick vid sitt
  // modulerade värde. Värdet kommer från ljudkärnan (samma utjämning, även MPE-slide från en klaviatur).
  function updateMods() {
    const g = S.glid.m > 0 ? S.m.glid : 0, t = S.glid.m > 0 ? D.glid.targets[S.glid.m - 1] : null;
    const want = {};
    if (t && g > 0.002) {
      const p = P[t.param];
      want[t.param] = clamp(S.v[t.param] + g * t.depth * (p.max - p.min), p.min, p.max);
      if (t.rate) { const b = S.v.lrate, to = Math.max(b, D.glid.rate), v = b + (to - b) * Math.min(1, g * 4); if (v - b > 1e-4) want.lrate = v; }
    }
    for (const id of new Set([...Object.keys(S.mod), ...Object.keys(want)])) {
      if (S.mod[id] === want[id]) continue;
      if (want[id] === undefined) delete S.mod[id]; else S.mod[id] = want[id];
      (modB[id] || []).forEach((f) => f(want[id]));
      if (id === "cut") flower.signals({ cut: want.cut ?? S.v.cut });
    }
  }

  function saveUi() { Bridge.send({ t: "ui", s: JSON.stringify({ tab: S.tab, oct: S.oct, glid: S.glid.m, kz: S.kz, kh: S.kh }) }); }

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
  buildKbar();
  gripInput();
  keysInput();
  $("#menuBtn").onclick = openMenu; $("#menuClose").onclick = closeMenu; $("#menu .shade").onclick = closeMenu;
  document.addEventListener("pointerdown", () => ensureAudio(), { capture: true });

  Bridge.on.state = (st) => {
    S.standalone = !!st.standalone; S.web = !!st.web;
    if (st.params) for (const id in st.params) setParam(id, st.params[id], false);
    if (st.ui) { try { const u = JSON.parse(st.ui); if (PAGES.some((p) => p.id === u.tab)) S.tab = u.tab; S.oct = u.oct || 0; if (u.glid >= 0 && u.glid < GLID.length) S.glid.m = u.glid; if (u.kz > 0) S.kz = clamp(u.kz, KZ_MIN, KZ_MAX); if (u.kh > 0) S.kh = u.kh; } catch (e) { /* */ } }
    if (st.glid >= 0 && st.glid < GLID.length) S.glid.m = st.glid;   // pluggens sparade läge gäller
    S.preset = st.preset ?? S.preset;
    buildPanels();
    onPreset(S.preset);
    buildFoot();
    buildKbar(); S.glid.sent = -1; updGlid(); sendGlid(); applyKeysHeight();
    Bridge.send({ t: "play", on: false });   // rullen finns inte längre: se till att den aldrig spelar
    // layoutens mätvärden till appen (iOS skriver dem till en fil som CI läser); efter en stund och igen senare
    const diag = () => { const pr = document.createElement("div"); pr.style.cssText = "position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
      document.body.append(pr); const c = getComputedStyle(pr); const kb = $("#keys").getBoundingClientRect();
      Bridge.send({ t: "diag", s: `sida ${innerWidth}x${innerHeight} skärm ${screen.width}x${screen.height} visual ${visualViewport ? Math.round(visualViewport.height) : "-"} env ${c.paddingTop} ${c.paddingRight} ${c.paddingBottom} ${c.paddingLeft} tangenter ${Math.round(kb.top)}-${Math.round(kb.bottom)} dpr ${devicePixelRatio}` }); pr.remove(); };
    if (!S.web) { setTimeout(diag, 4000); setTimeout(diag, 20000); }
    if (Bridge.needsGesture) $("#start").classList.add("show");
    flower.signals({ cut: S.v.cut, res: S.v.res, lrate: S.v.lrate });
  };
  Bridge.on.params = (v) => { for (const id in v) setParam(id, v[id], false); };
  Bridge.on.preset = (i) => { if (i !== S.preset) onPreset(i); };
  Bridge.on.info = (m) => { if (m.midi) { S.midi = m.midi; buildFoot(); } };
  Bridge.on.meters = (m) => {
    S.m.env = m.env; S.m.lfo = m.lfo; S.m.pk = m.pk; S.m.mask = m.mask; S.m.nc = m.nc; S.m.glid = m.glid || 0;
    if (m.scope) S.m.scope = m.scope;
    flower.signals({ env: m.env, lfo: m.lfo, pk: m.pk, mask: m.mask, nc: m.nc });
  };
  $("#start").addEventListener("click", () => { ensureAudio(); });

  function loop(now) {
    requestAnimationFrame(loop);
    envSm += (S.m.env - envSm) * 0.12;
    drawWave(now / 1000);
    drawKeys();
    sendGlid();
    updateMods();
  }
  requestAnimationFrame(loop);
  window.addEventListener("resize", () => { applyKeysHeight(); knobEls.forEach((k) => k._draw()); });
  document.fonts && document.fonts.ready.then(() => knobEls.forEach((k) => k._draw()));
  Bridge.start();
  window.__bris = { S, setParam, selectPreset, note: (n, v) => Bridge.send({ t: "note", n, v }), off: (n) => Bridge.send({ t: "off", n }), tab: (t) => { S.tab = t; buildPanels(); }, keys, glidMode: setGlidMode, setZoom, applyKeysHeight };   // för tester
})();
