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
    m: { env: 0, lfo: 0, pk: 0, mask: 0, nc: 0, glid: 0, scope: null, fr: -1, fm: 0, an: -1 }, mod: {},
    kz: 1, kh: null,
    motion: !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches),   // MOTION i menyn
    egna: [], eget: null,
    hid: false,               // MOOD: de dolda rattarna (som pedalens hidden options)
    ljus: false,              // det varma ljuset ur tangenterna i det vanliga läget (av sedan 1.10; koden finns kvar)
    hemliga: [], secret: null, fore: null, band: null, fxVal: "kor", // hemliga patchar: upplåsta (id), vald (id eller null), värdena innan den valdes
    // ackordpads: fyra ackord (tonnummer), HOLD, FOLLOW, överlägget öppet; rec/armed/active gäller bara nu
    pads: { list: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67]], hold: false, follow: false, open: false, rec: false, armed: -1, active: -1 },   // egna ljud { name, base, values } och namnet på det som är laddat   // tangenternas zoom (1 = ca 56 px per vit tangent) och höjd (andel av fönstret, null = standard)
  };
  D.params.forEach((p) => (S.v[p.id] = p.def));
  const plantOf = (i) => D.plants[D.presets[i].plant];
  let INK = "43,37,33";   // text och linjer som ritas i dukarna (ljust i det mörka läget)
  // den hemliga patchen: accent, bakgrund och ljusets två färger (lila och bärnsten, per ton)
  const KR = { accent: "#a47cff", bg: "#0b0a13", lila: [150, 100, 255], barn: [255, 172, 82], lilaL: [0.42, 0.20, 1.0], barnL: [1.0, 0.52, 0.16] };
  const KR_HALL = 0.32;   // hur starkt de hållna tangenterna lyser när arpen spelar i en hemlig patch
  const krBarn = (n) => { const pc = ((n % 12) + 12) % 12; return pc >= 5 && pc <= 9; };   // F–A bärnsten, resten lila
  // de hemliga patcharna (tools/kategorier.py HEMLIGA): färger och hur tangenterna glöder i var och en
  const HEM = D.hemliga || [];
  const hemOf = (id) => HEM.find((h) => h.id === id);
  const TEMA = { kristall: { accent: "#a47cff", bg: "#0b0a13" }, sjon: { accent: "#8fd3ff", bg: "#050b14" }, kassett: { accent: "#ffad4a", bg: "#110d0a" } };
  const hemFarg = (n) => {
    if (S.secret === "sjon") { const t = Math.min(1, Math.max(0, (n - 36) / 60)); return [Math.round(80 + 120 * t), Math.round(150 + 85 * t), 255]; }   // djupblått nertill, månljust upptill
    if (S.secret === "kassett") return [255, 168, 72];   // VU-mätarnas varma sken
    return krBarn(n) ? KR.barn : KR.lila;
  };

  // ---------------------------------------------------------------- sidorna
  const PAGES = [
    { id: "play", name: "PLAY", rt: "TONE", right: [["s", "cut", "CUTOFF"], ["s", "chorus", "CHORUS"], ["s", "rvb", "REVERB"]] },
    { id: "osc", name: "OSC", wave: "osc", kt: "OSC", knobs: [["pw", "PW"], ["sub", "SUB"], ["detune", "DETUNE"], ["porta", "GLIDE"]],
      rt: "VOICE", right: [["c", "vform", ["SAW", "PULSE", "BOTH"]], ["c", "lage", ["STEREO", "POLY", "MONO", "UNISON"]], ["s", "uniint", "INTERVAL"], ["s", "bendr", "BEND"]] },
    { id: "filter", name: "FILTER", wave: "filter", kt: "ENVELOPE", knobs: [["fa", "A"], ["fd", "D"], ["fs", "S"], ["fr", "R"]],
      rt: "FILTER", right: [["s", "cut", "CUTOFF"], ["s", "res", "RESONANCE"], ["s", "eg1", "ENVELOPE"], ["s", "kbd", "KEY TRACK"]] },
    { id: "amp", name: "AMP", wave: "env", kt: "ENVELOPE", knobs: [["aa", "A"], ["ad", "D"], ["asus", "S"], ["ar", "R"]],
      rt: "AMP", right: [["s", "vela", "VELOCITY"], ["s", "lfoamp", "TREMOLO"], ["s", "vol", "VOLUME"]] },
    { id: "mod", name: "MOD", wave: "lfo", kt: "LFO", knobs: [["lrate", "RATE"], ["lfoosc", "VIB"], ["lfopwm", "PWM"], ["lfocut", "FILT"]],
      rt: "SHAPE", right: [["c", "lwave", ["TRI", "UP", "DOWN", "SQR", "RND"]], ["s", "mwosc", "WHEEL VIB"], ["s", "mwcut", "WHEEL CUT"]] },
    // FX: en kedja av effekter (till höger) och den valda effektens rattar (till vänster), se FX_KEDJA
    { id: "fx", name: "FX", wave: "scope", fx: true },
    // MOOD: WET-kanalen till vänster, mikrolooperns till höger, fotknapparna (WET FREEZE · LOOP DUB) över blomman.
    // HIDDEN visar de dolda rattarna, som när man håller båda fotknapparna på pedalen.
    { id: "mood", name: "MOOD", fsw: true, kt: "WET", pre: [["c", "mowmode", ["REVERB", "DELAY", "SLIP"]]],
      knobs: [["motime", "TIME"], ["mowmod", "MODIFY"], ["motone", "TONE"], ["moclk", "CLOCK"]],
      rt: "MICRO-LOOP", right: [["c", "molmode", ["ENV", "TAPE", "STRETCH"]], ["s", "molen", "LENGTH"], ["s", "molmod", "MODIFY"], ["s", "moblend", "MIX"]],
      hid: { kt: "HIDDEN", knobs: [["mofade", "FADE"], ["mowidth", "WIDTH"], ["mobal", "BALANCE"], ["modir", "DIRECT"]],
        rt: "ROUTING", right: [["c", "morout", ["IN", "IN + LOOP", "LOOP"]], ["t", [["mosprd", "SPREAD"], ["mohalf", "HALF"], ["mosmth", "SMOOTH"]]]] } },
    { id: "arp", name: "ARP", kt: "ARPEGGIO", pre: [["t", [["arp", "ARP"]]], ["c", "arpm", ["UP", "DOWN", "UP-DOWN", "RANDOM"]]],
      rt: "RATE", right: [["c", "arpr", ["1/4", "1/8", "1/8T", "1/16", "1/16T", "1/32"]], ["c", "arpo", ["1 OCT", "2 OCT", "3 OCT", "4 OCT"]], ["s", "arpg", "GATE"]] },
  ];

  // FX-kedjan i ljudets ordning. av = parametern som slår på/av effekten (de som saknar den är alltid med och visar
  // bara en lampa när de gör något), las = den hemliga patch som låser upp effekten. Fler effekter läggs till här.
  const FX_KEDJA = [
    { id: "kor", namn: "CHORUS · DELAY", knobs: [["chorus", "CHORUS"], ["dtime", "TIME"], ["dfb", "FDBK"], ["dmix", "MIX"]], aktiv: (v) => v.chorus > 0.001 || v.dmix > 0.001 },
    { id: "rum", namn: "SPACE", knobs: [["rvb", "REVERB"], ["rsize", "SIZE"], ["drive", "DRIVE"]], aktiv: (v) => v.rvb > 0.001 || v.drive > 0.001 },
    { id: "tape", namn: "TAPE", av: "tape", las: "kassett", pre: [["b"]], vag: false,
      knobs: [["tarec", "REC LVL"], ["tasat", "SAT"], ["taage", "WEAR"], ["tawow", "WOW"], ["taflut", "FLUTTER"], ["tabrus", "NOISE"], ["taton", "TONE"], ["tawet", "MIX"]] },
  ];
  const fxLista = () => FX_KEDJA.filter((f) => !f.las || S.hemliga.includes(f.las));
  // en tydlig av/på-knapp: ON fylld i växtens färg, OFF tom
  function fxBrytare(f) {
    const b = el("button", "fxpa", "<span>ON</span><span>OFF</span>"); b.setAttribute("aria-label", f.namn + " av/på");
    b.onclick = (e) => { e.stopPropagation(); gesture(f.av, true); setParam(f.av, S.v[f.av] > 0.5 ? 0 : 1, true); gesture(f.av, false); };
    bind(f.av, (v) => { b.classList.toggle("on", v > 0.5); b.setAttribute("aria-pressed", v > 0.5 ? "true" : "false"); });
    return b;
  }
  function buildFx(L, Rt) {
    const lista = fxLista(), f = lista.find((x) => x.id === S.fxVal) || lista[0];
    // vänster: den valda effekten
    const kb = el("div", "kbox fxbox");
    const tt = el("div", "ttl fxttl", `<span>${f.namn}</span>`);
    if (f.av) tt.append(fxBrytare(f));
    kb.append(tt);
    const inn = el("div", "fxinn");
    if (f.av) bind(f.av, (v) => inn.classList.toggle("av", v <= 0.5));
    if (f.pre) { const pr = el("div", "pre"); f.pre.forEach((c) => pr.append(item(c))); inn.append(pr); }
    const kn = el("div", "knobs");
    f.knobs.forEach(([id, lab]) => { const k = knob(id, lab); kn.append(k); knobEls.push(k); });
    inn.append(kn); kb.append(inn);
    if (f.vag === false && waveCv) { waveCv.parentNode.remove(); waveCv = null; }
    L.append(kb);
    // höger: kedjan
    const box = el("div", "rbox fxkedja"); box.append(el("div", "ttl", "FX CHAIN"));
    const ul = el("div", "fxlista");
    lista.forEach((x, i) => {
      const r = el("div", "fxrad" + (x === f ? " vald" : ""));
      const nb = el("button", "fxnamn", `<em>${String(i + 1).padStart(2, "0")}</em><span>${x.namn}</span>`);
      nb.onclick = () => { S.fxVal = x.id; buildPanels(); saveUi(); };
      r.append(nb);
      if (x.av) r.append(fxBrytare(x));
      else { const l = el("i", "fxlampa"); r.append(l); x.knobs.forEach(([id]) => bind(id, () => l.classList.toggle("on", !!x.aktiv(S.v)))); }
      ul.append(r);
    });
    box.append(ul); Rt.append(box);
  }

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
      g.strokeStyle = `rgba(${INK},0.16)`; g.beginPath(); g.arc(s / 2, s / 2, r, a0, a1); g.stroke();
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
    const c = el("div", "choice"), lo = P[id].min;
    const bs = opts.map((o, i) => { const b = el("button", "opt", `<i></i>${o}`); b.onclick = () => { gesture(id, true); setParam(id, lo + i, true); gesture(id, false); }; c.append(b); return b; });
    bind(id, (v) => bs.forEach((b, i) => b.classList.toggle("on", lo + i === Math.round(v))));
    return c;
  }
  // knappar som slås av och på var för sig (av/på-parametrar)
  function toggles(list, cls) {
    const c = el("div", "choice " + (cls || "tog"));
    list.forEach(([id, lab]) => {
      const b = el("button", "opt", `<i></i>${lab}`); b.dataset.id = id;
      b.onclick = () => { gesture(id, true); setParam(id, S.v[id] > 0.5 ? 0 : 1, true); gesture(id, false); };
      bind(id, (v) => b.classList.toggle("on", v > 0.5));
      c.append(b);
    });
    return c;
  }
  // banden (KASSETTEN och TAPE under FX): ett val som ställer in flera av bandets rattar på en gång
  const bandEls = [];
  function bandVal() {
    const c = el("div", "choice band");
    const bs = (D.band || []).map((b, i) => { const k = el("button", "opt", `<i></i>${b.namn}`); k.onclick = () => valjBand(i); c.append(k); return k; });
    const upd = () => bs.forEach((k, i) => k.classList.toggle("on", i === S.band));
    upd(); bandEls.push(upd);
    return c;
  }
  const item = (c) => c[0] === "s" ? slider(c[1], c[2]) : c[0] === "t" ? toggles(c[1]) : c[0] === "b" ? bandVal() : choice(c[1], c[2]);


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
    br._upd = () => {
      const pr = D.presets[S.preset], pl = plantOf(S.preset);
      if (S.eget) { cur.textContent = "MY SOUND"; nm.textContent = S.eget; return; }
      if (S.secret) { const h = hemOf(S.secret); cur.textContent = "SECRET " + String(h.nr).padStart(2, "0"); nm.textContent = h.namn + " · " + h.ljudnamn.toUpperCase(); return; }
      cur.textContent = `${pl.cat} ${String(pr.nr).padStart(2, "0")}`; nm.textContent = pr.name.toUpperCase();
    };
    browserEl = br; br._upd();
    L.append(br);
    waveCv = null;
    if (pg.wave) { const ww = el("div", "wave-wrap"); waveCv = el("canvas", "wave"); ww.append(waveCv); L.append(ww); waveType = pg.wave; }
    bandEls.length = 0;
    if (pg.fx) { buildFx(L, Rt); buildFsw(pg); document.querySelectorAll("#tabs button, #tabs2 button").forEach((b) => b.classList.toggle("on", b.dataset.tab === S.tab)); return; }
    let vy = pg.hid && S.hid ? { ...pg, ...pg.hid, pre: pg.hid.pre || [] } : pg;   // MOOD: dolda rattar
    if (pg.id === "play" && S.secret === "kassett")                                 // KASSETTEN: bandet till höger
      vy = { ...pg, rt: "TAPE", right: [["b"], ["s", "taage", "WEAR"], ["s", "tawow", "WOW"], ["s", "tabrus", "NOISE"]] };
    if (vy.knobs || vy.pre) {
      const kb = el("div", "kbox"); kb.append(el("div", "ttl", vy.kt));
      if (vy.pre && vy.pre.length) { const pr = el("div", "pre"); vy.pre.forEach((c) => pr.append(item(c))); kb.append(pr); }
      if (vy.knobs) {
        const kn = el("div", "knobs");
        vy.knobs.forEach(([id, lab]) => { const k = knob(id, lab); kn.append(k); knobEls.push(k); });
        kb.append(kn);
      }
      L.append(kb);
    }
    const box = el("div", "rbox"); const rt = el("div", "ttl", vy.rt);
    if (pg.hid) {
      const hb = el("button", "hidb" + (S.hid ? " on" : ""), S.hid ? "BACK" : "HIDDEN");
      hb.onclick = () => { S.hid = !S.hid; buildPanels(); };
      rt.append(hb);
    }
    box.append(rt);
    const sl = el("div", "sliders");
    vy.right.forEach((c) => sl.append(item(c)));
    box.append(sl); Rt.append(box);
    buildFsw(pg);
    document.querySelectorAll("#tabs button, #tabs2 button").forEach((b) => b.classList.toggle("on", b.dataset.tab === S.tab));
  }

  // MOOD: fotknapparna över blomman – WET och FREEZE för wet-kanalen, LOOP och DUB för mikrolooper
  function buildFsw(pg) {
    let f = $("#fsw"); if (f) f.remove();
    if (!pg.fsw) return;
    f = el("div", ""); f.id = "fsw";
    const grp = (list) => { const g = el("div", "grp"); list.forEach(([id, lab]) => {
      const b = el("button", "fs", `<i></i><span>${lab}</span>`); b.dataset.id = id;
      b.onclick = () => { gesture(id, true); setParam(id, S.v[id] > 0.5 ? 0 : 1, true); gesture(id, false); };
      bind(id, (v) => b.classList.toggle("on", v > 0.5));
      g.append(b); }); return g; };
    f.append(grp([["mowet", "WET"], ["mofrz", "FREEZE"]]), grp([["moloop", "LOOP"], ["modub", "DUB"]]));
    $("#stage").append(f);
  }

  // ---------------------------------------------------------------- ackordpads
  // Fyra pads över skärmen (blomman blir suddig bakom). Tryck = spela ackordet (HOLD: ligger kvar tills man trycker
  // igen eller byter pad). REC och sedan en pad: tonerna man spelar på pianot (eller en klaviatur) spelas in i den,
  // tryck på paden igen när ackordet är klart. FOLLOW: pianot rättas till skalan för det senaste ackordet.
  const NOTNAMN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const ACKORD = { "0,4,7": "", "0,3,7": "m", "0,4,7,10": "7", "0,4,7,11": "maj7", "0,3,7,10": "m7", "0,3,6": "dim", "0,3,6,9": "dim7",
    "0,3,6,10": "m7b5", "0,4,8": "aug", "0,2,7": "sus2", "0,5,7": "sus4", "0,4,7,9": "6", "0,3,7,9": "m6", "0,2,4,7": "add9",
    "0,2,4,7,10": "9", "0,2,3,7,10": "m9", "0,2,4,7,11": "maj9", "0,7": "5", "0,5,7,10": "7sus4", "0,3,7,11": "mmaj7", "0,2,3,7": "madd9",
    "0,4,7,9,11": "maj13", "0,4,11": "maj7", "0,3,10": "m7", "0,4,10": "7" };
  function ackordNamn(nt) {
    if (!nt.length) return "";
    const pcs = [...new Set(nt.map((n) => n % 12))], bas = Math.min(...nt) % 12;
    // grundtonen = basen om det går, annars en omvändning (/bas)
    for (const r of [bas, ...pcs.filter((p) => p !== bas)]) {
      const k = pcs.map((p) => (p - r + 12) % 12).sort((a, b) => a - b).join(",");
      if (ACKORD[k] !== undefined) return NOTNAMN[r] + ACKORD[k] + (r !== bas ? "/" + NOTNAMN[bas] : "");
    }
    return NOTNAMN[bas] + "…";
  }
  const tonNamn = (n) => NOTNAMN[n % 12] + (Math.floor(n / 12) - 1);   // som tangenterna: 48 = C3
  function padSpela(k) {
    const nt = S.pads.list[k] || [];
    S.pads.active = k;
    Bridge.send({ t: "pad", n: nt, v: 100 });
    updPads();
  }
  function padSlapp() { if (S.pads.active < 0) return; S.pads.active = -1; Bridge.send({ t: "pad", n: [] }); updPads(); }
  function padRec(k) {   // REC-läget: tryck på en pad för att spela in i den, tryck igen för att sluta
    if (S.pads.armed === k) { S.pads.armed = -1; S.pads.rec = false; saveUi(); updPads(); return; }
    S.pads.armed = k; S.pads.list[k] = []; updPads();
  }
  function padLagg(n) {   // en ton som spelas medan en pad spelar in
    const k = S.pads.armed; if (k < 0) return;
    const l = S.pads.list[k]; if (l.includes(n) || l.length >= 8) return;
    l.push(n); l.sort((a, b) => a - b); updPads(); saveUi();
  }
  function setFollow(on) { S.pads.follow = !!on; Bridge.send({ t: "follow", on: S.pads.follow }); updPads(); saveUi(); }
  function oppnaPads(on) {
    S.pads.open = !!on;
    if (!on) { padSlapp(); S.pads.rec = false; S.pads.armed = -1; }
    $("#pads").classList.toggle("open", S.pads.open);
    document.getElementById("app").classList.toggle("pads-open", S.pads.open);
    const kb = $("#kbar .padsb"); if (kb) kb.classList.toggle("on", S.pads.open);
    updPads(); saveUi();
  }
  function buildPads() {
    let o = $("#pads"); if (o) o.remove();
    o = el("div", ""); o.id = "pads";
    const bar = el("div", "pbar choice");
    const knapp = (lab, cls, f) => { const b = el("button", "opt " + cls, `<i></i>${lab}`); b.onclick = f; bar.append(b); return b; };
    knapp("REC", "rec", () => { S.pads.rec = !S.pads.rec; if (!S.pads.rec) S.pads.armed = -1; else padSlapp(); updPads(); saveUi(); });
    knapp("HOLD", "hold", () => { S.pads.hold = !S.pads.hold; if (!S.pads.hold) padSlapp(); updPads(); saveUi(); });
    knapp("FOLLOW", "follow", () => setFollow(!S.pads.follow));
    const ab = el("button", "opt arpb", "<i></i>ARP"); ab.dataset.id = "arp";
    ab.onclick = () => { gesture("arp", true); setParam("arp", S.v.arp > 0.5 ? 0 : 1, true); gesture("arp", false); updPads(); };
    bar.append(ab);
    const x = el("button", "stang", '<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'); x.setAttribute("aria-label", "Close");
    x.onclick = () => oppnaPads(false); bar.append(x);
    const grid = el("div", "pgrid");
    for (let k = 0; k < 4; k++) {
      const p = el("button", "pad", `<span class="nr">${String(k + 1).padStart(2, "0")}</span><span class="ak"></span><span class="tn"></span>`); p.dataset.k = k;
      p.addEventListener("pointerdown", (e) => {
        e.preventDefault(); ensureAudio();
        if (S.pads.rec) { padRec(k); return; }
        if (!(S.pads.list[k] || []).length) return;
        if (S.pads.hold) { if (S.pads.active === k) padSlapp(); else padSpela(k); return; }
        p.setPointerCapture(e.pointerId); padSpela(k);
      });
      const upp = () => { if (!S.pads.hold && !S.pads.rec && S.pads.active === k) padSlapp(); };
      p.addEventListener("pointerup", upp); p.addEventListener("pointercancel", upp);
      grid.append(p);
    }
    o.append(bar, grid);
    $("#main").append(o);
    o.classList.toggle("open", S.pads.open);
    document.getElementById("app").classList.toggle("pads-open", S.pads.open);
    updPads();
  }
  function updPads() {
    const o = $("#pads"); if (!o) return;
    o.querySelector(".rec").classList.toggle("on", S.pads.rec);
    o.querySelector(".hold").classList.toggle("on", S.pads.hold);
    o.querySelector(".follow").classList.toggle("on", S.pads.follow);
    o.querySelector(".arpb").classList.toggle("on", S.v.arp > 0.5);
    o.classList.toggle("recording", S.pads.rec);
    o.querySelectorAll(".pad").forEach((p) => {
      const k = +p.dataset.k, nt = S.pads.list[k] || [];
      p.querySelector(".ak").textContent = nt.length ? ackordNamn(nt) : (S.pads.armed === k ? "PLAY KEYS" : "EMPTY");
      p.querySelector(".tn").textContent = nt.map(tonNamn).join("  ");
      p.classList.toggle("on", S.pads.active === k);
      p.classList.toggle("armed", S.pads.armed === k);
      p.classList.toggle("tom", !nt.length);
    });
  }

  function buildTabs() {
    for (const n of ["#tabs", "#tabs2"]) {
      const t = $(n); t.innerHTML = "";
      PAGES.forEach((p) => { const b = el("button", "", p.name); b.dataset.tab = p.id; b.onclick = () => { S.tab = p.id; buildPanels(); saveUi(); }; t.append(b); });
    }
  }

  // ---------------------------------------------------------------- ljud och växt
  function applyTheme() {
    const pl = plantOf(S.preset), tema = S.secret ? TEMA[S.secret] : null, kr = !!tema;
    const r = document.documentElement.style;
    const col = kr ? tema.accent : pl.color, bg = kr ? tema.bg : pl.bg, rgb = hexRgb(col);
    r.setProperty("--a", col); r.setProperty("--a2", `rgba(${rgb},.38)`); r.setProperty("--a3", `rgba(${rgb},.12)`); r.setProperty("--bg", bg);
    document.documentElement.classList.toggle("hemlig", kr);
    for (const h of HEM) document.documentElement.classList.toggle("h-" + h.id, S.secret === h.id);
    INK = kr ? "233,228,244" : "43,37,33";
    const mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.content = bg;
    flower.set(pl, pl.color); flower.vila(kr);
    for (const id in SCEN) SCEN[id].visa(S.secret === id);
    knobEls.forEach((k) => k._draw());
    browserEl && browserEl._upd();
    document.querySelectorAll("#list .it").forEach((b) => b.classList.toggle("on", b.classList.contains("hem") ? S.secret === b.dataset.hem : b.dataset.i !== undefined && !S.eget && !S.secret && +b.dataset.i === S.preset));
  }
  function selectPreset(i) { lamnaHemlig(); S.eget = null; Bridge.send({ t: "preset", i }); onPreset(i); saveUi(); }
  // en hemlig patch: ett fabriksljud med inställningar ovanpå (MOOD, bandet ...), en egen scen och det mörka läget.
  // De gamla värdena sparas och sätts tillbaka när man lämnar den (ett annat ljud).
  function valjHemlig(id) {
    const h = hemOf(id); if (!h) return;
    if (!S.hemliga.includes(id)) S.hemliga.push(id);
    selectPreset(h.ljud);
    S.fore = {};
    const harBand = h.band !== null && h.band !== undefined && D.band, bi = harBand ? (S.band ?? h.band) : null;
    const satt = { ...h.satt, ...(harBand ? D.band[bi].satt : {}) };
    for (const k in satt) { S.fore[k] = S.v[k]; setParam(k, satt[k], true); }
    if (harBand) { S.band = bi; if (SCEN[id] && SCEN[id].band) SCEN[id].band(D.band[bi], true); }
    S.secret = id; applyTheme(); buildMenu(); buildPanels(); saveUi();
  }
  // ett anslag: en ny ton från tangenterna här (direkt) eller från en klaviatur (via mätarna). Tonföljden räknas,
  // och utan arp får den hemliga patchens scen tonen (SJÖN: en droppe; med arp är det arpens slag som blir droppar)
  function anslag(n) {
    melodiTon(n);
    const sc = S.secret && SCEN[S.secret];
    if (S.v.arp <= 0.5 && sc && sc.anslag) sc.anslag(n, fLage(n, keyLayout()), hemFarg(n));
  }
  // egna: tonerna härifrån (redan räknade). De ligger kvar efter släppet tills mätarna också har släppt dem, eftersom
  // mätarna kan visa tonen först efter att den släppts (ett kort tryck) och den då annars räknas igen som klaviaturens.
  // uiTid: när tonen spelades härifrån; mätarna räknar den inte igen inom 2,5 s (om bildrutorna kommer glest).
  function uiNot(n, v) { Bridge.send({ t: "note", n, v }); keys.egna.set(n, Infinity); keys.uiTid.set(n, performance.now()); anslag(n); }
  function uiOff(n) { Bridge.send({ t: "off", n }); if (keys.egna.has(n)) keys.egna.set(n, 0); }
  // tonföljderna som låser upp: de senaste anslagen (tonklasser, högst 3 s mellan två) jämförs med patchernas melodi
  // Appen lyssnar bara efter tonföljderna en kort stund efter fem tryck på BLONDA (så att man inte råkar hitta en
  // hemlig patch); under tiden rör sig bokstäverna i BLONDA. Varje ton håller lyssnandet öppet minst 2,5 s till.
  const MEL = { buf: [], till: 0, tryck: 0, tt: 0, tid: 0 };
  const LYSSNA_MS = 5000;
  function lyssna(pa) {
    const logo = $("header .logo");
    clearTimeout(MEL.tid);
    if (pa) {
      MEL.till = performance.now() + LYSSNA_MS; MEL.buf = [];
      logo && logo.classList.add("lyssnar");
      const ned = $("#nedrakning");
      const koll = () => {
        const kvar = MEL.till - performance.now();
        if (kvar <= 0) { lyssna(false); return; }
        if (ned) { ned.textContent = String(Math.ceil(kvar / 1000)); ned.classList.add("syns"); }
        MEL.tid = setTimeout(koll, Math.min(kvar, 100));
      };
      koll();
    } else { MEL.till = 0; logo && logo.classList.remove("lyssnar"); const ned = $("#nedrakning"); if (ned) ned.classList.remove("syns"); }
  }
  function melodiTon(n) {
    const t = performance.now();
    if (t >= MEL.till) return;                       // lyssnar inte
    MEL.till = Math.max(MEL.till, t + 2500);
    if (MEL.buf.length && t - MEL.buf[MEL.buf.length - 1].t > 3000) MEL.buf = [];   // en paus på över 3 s börjar om
    MEL.buf = MEL.buf.concat([{ n: ((n % 12) + 12) % 12, t }]).slice(-12);
    for (const h of HEM) {
      if (!h.melodi || MEL.buf.length < h.melodi.length) continue;
      const sista = MEL.buf.slice(-h.melodi.length);
      if (sista.every((e, i) => e.n === h.melodi[i])) {
        MEL.buf = []; lyssna(false);
        if (S.secret !== h.id) { const ny = !S.hemliga.includes(h.id); valjHemlig(h.id); visaHemlig(h.id, ny); }
        return;
      }
    }
  }
  // en kort skylt mitt upptill när en hemlig patch väljs med sin tonföljd (eller versionen): SECRET 02 · SJÖN
  function visaHemlig(id, ny = true) {
    const h = hemOf(id); if (!h) return;
    let t = $("#hemskylt"); if (!t) { t = el("div", "", ""); t.id = "hemskylt"; document.body.append(t); }
    t.innerHTML = `<span>SECRET ${String(h.nr).padStart(2, "0")}${ny ? " · UNLOCKED" : ""}</span><b>${h.namn}</b>`;
    t.classList.remove("syns"); void t.offsetWidth; t.classList.add("syns");
    clearTimeout(visaHemlig.tid); visaHemlig.tid = setTimeout(() => t.classList.remove("syns"), 2600);
  }
  // byta band: bandets rattar ställs in efter bandet (KASSETTEN visar det på kassetten och spolarna stannar en stund)
  function valjBand(i) {
    const b = D.band && D.band[i]; if (!b) return;
    for (const k in b.satt) { gesture(k, true); setParam(k, b.satt[k], true); gesture(k, false); }
    S.band = i;
    bandEls.forEach((f) => f());
    if (S.secret === "kassett") Bridge.send({ t: "band", k: 0, tyst: 1 });   // bandet stannar när det matas ut
    if (SCEN.kassett) SCEN.kassett.band(b);
    saveUi();
  }
  // KASSETTEN är en riktig bandspelare (i ljudkärnan): REC spelar in det man spelar (REC-lampan lyser), PLAY spelar
  // upp, REW och FF spolar (det inspelade hörs som ett ljust tjatter), STOP stannar, PAUSE håller bandet stilla.
  // Rattarna: REC LEVEL = hur hårt det spelas in på bandet (mättnad, VU-mätarna visar nivån), OUTPUT = bandets utnivå.
  const KA_RATT = ["tarec", "taoutv"];
  const KA_KNAPP = { stop: 0, play: 1, rec: 2, rew: 3, ff: 4, paus: 5 };
  function hemFore(id) { if (S.secret && S.fore && !(id in S.fore)) S.fore[id] = S.v[id]; }
  function kassettKnapp(namn) {
    if (!(namn in KA_KNAPP)) return;
    Bridge.send({ t: "band", k: KA_KNAPP[namn] });
    if (SCEN.kassett) SCEN.kassett.tryck(namn);
  }
  // SJÖN: fem tryck på månen gör dag (solen stiger), fem tryck på solen gör natt. Trycken räknas bara om de kommer
  // tätt (högst 1,2 s mellan), och varje tryck får månen/solen att lysa till.
  const himlaTryck = { n: 0, t: 0 };
  document.addEventListener("pointerdown", (e) => {
    if (S.secret !== "sjon" || !SCEN.sjon || !SCEN.sjon.traff) return;
    const k = SCEN.sjon.traff(e.clientX, e.clientY); if (!k) { himlaTryck.n = 0; return; }
    const t = performance.now();
    himlaTryck.n = t - himlaTryck.t < 1200 ? himlaTryck.n + 1 : 1; himlaTryck.t = t;
    SCEN.sjon.puls();
    if (himlaTryck.n >= 5) { himlaTryck.n = 0; SCEN.sjon.dag(k === "mane"); }
  }, true);

  function lamnaHemlig() {
    if (!S.secret) return;
    const var_ = S.secret;
    S.secret = null;
    if (var_ === "kassett") { Bridge.send({ t: "band", k: 0, tyst: 1 }); setTimeout(buildPanels, 0); }   // bandet stannar (tyst)
    if (S.fore) for (const k in S.fore) if (S.fore[k] !== undefined) setParam(k, S.fore[k], true);
    S.fore = null;
  }
  function onPreset(i) { S.preset = i; applyTheme(); }
  function step(d) { const o = D.order, k = o.indexOf(S.preset); selectPreset(o[(k + d + o.length) % o.length]); }

  // ---------------------------------------------------------------- menyn
  const KRYSS = '<svg class="ic" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>';
  function buildMenu() {
    const list = $("#list"); list.innerHTML = "";
    if (S.egna.length) {   // egna ljud överst
      const g = el("div", "grp egna");
      g.append(el("div", "gh", `<i style="background:var(--a)"></i>MY SOUNDS <span>· ${S.egna.length}</span>`));
      const it = el("div", "items");
      S.egna.forEach((e, k) => {
        const rad = el("div", "eg");
        const b = el("button", "it" + (S.eget === e.name ? " on" : ""), "");
        b.textContent = e.name; b.onclick = () => laddaEget(k);
        const x = el("button", "bort", KRYSS); x.setAttribute("aria-label", "Delete");
        x.onclick = () => {   // två tryck: först frågar den, sedan tas ljudet bort
          if (!x.classList.contains("fraga")) { x.classList.add("fraga"); x.innerHTML = "DELETE"; setTimeout(() => { x.classList.remove("fraga"); x.innerHTML = KRYSS; }, 2500); return; }
          S.egna.splice(k, 1); if (S.eget === e.name) S.eget = null;
          Bridge.send({ t: "user", list: S.egna }); buildMenu(); browserEl && browserEl._upd(); saveUi();
        };
        rad.append(b, x); it.append(rad);
      });
      g.append(it); list.append(g);
    }
    const uppl = HEM.filter((h) => S.hemliga.includes(h.id));
    if (uppl.length) {
      const g = el("div", "grp hemlig");
      g.append(el("div", "gh", `<i style="background:${TEMA[S.secret || uppl[0].id].accent}"></i>SECRET <span>· ${uppl.length}</span>`));
      const it = el("div", "items");
      for (const h of uppl) {
        const b = el("button", "it hem" + (S.secret === h.id ? " on" : ""), h.namn); b.dataset.hem = h.id;
        b.onclick = () => { valjHemlig(h.id); };
        it.append(b);
      }
      g.append(it); list.append(g);
    }
    D.plants.forEach((pl, pi) => {
      const g = el("div", "grp");
      g.append(el("div", "gh", `<i style="background:${pl.color}"></i>${pl.cat} <span>· ${pl.name}</span>`));
      const it = el("div", "items");
      D.order.filter((i) => D.presets[i].plant === pi).forEach((i) => {
        const b = el("button", "it" + (!S.eget && !S.secret && i === S.preset ? " on" : ""), D.presets[i].name); b.dataset.i = i;
        b.onclick = () => { selectPreset(i); };
        it.append(b);
      });
      g.append(it); list.append(g);
    });
    buildFoot();
  }
  const BEHALL = ["vol", "bendr", "slm", "mofrz", "moloop", "modub"];   // + MOOD:s FREEZE, LOOP och DUB (stunden, inte ljudet)   // som fabriksljuden: volym, böjomfång och slide-mål följer inte med ljudet
  function sparaEget(namn) {
    namn = namn.replace(/\s+/g, " ").trim().toUpperCase().slice(0, 28);
    if (!namn) return;
    const values = {};
    D.params.forEach((p) => { if (!BEHALL.includes(p.id)) values[p.id] = S.v[p.id]; });
    const e = { name: namn, base: S.preset, values };
    const k = S.egna.findIndex((x) => x.name === namn);
    if (k >= 0) S.egna[k] = e; else S.egna.push(e);
    S.eget = namn;
    Bridge.send({ t: "user", list: S.egna });
    buildMenu(); browserEl && browserEl._upd(); saveUi();
  }
  function laddaEget(k) {
    const e = S.egna[k]; if (!e) return;
    selectPreset(e.base | 0);   // växten och allt ljudet inte nämner
    for (const id in e.values) if (P[id]) setParam(id, e.values[id], true);
    S.eget = e.name;
    document.querySelectorAll("#list .it").forEach((b) => b.classList.toggle("on", b.textContent === e.name && b.closest(".egna")));
    browserEl && browserEl._upd(); saveUi();
  }
  function setMotion(pa) {
    S.motion = !!pa; flower.rorelse(S.motion);
    document.documentElement.classList.toggle("still", !S.motion);
  }
  function buildFoot() {
    const f = $("#mfoot"); f.innerHTML = "";
    const spara = el("button", "", "SAVE SOUND");
    spara.onclick = () => {   // en rad med namn i menyns nederkant
      f.innerHTML = "";
      const inp = el("input", "namn"); inp.type = "text"; inp.maxLength = 28; inp.placeholder = "NAME";
      inp.value = S.eget || D.presets[S.preset].name.toUpperCase() + " 2";
      const ok = el("button", "", "SAVE"), av = el("button", "mute", "CANCEL");
      ok.onclick = () => { sparaEget(inp.value); buildFoot(); };
      av.onclick = () => buildFoot();
      inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") ok.click(); if (e.key === "Escape") av.click(); });
      f.append(inp, ok, av); inp.focus(); inp.select();
    };
    f.append(spara);
    const mo = el("button", "", S.motion ? "MOTION ON" : "MOTION OFF");
    mo.onclick = () => { setMotion(!S.motion); saveUi(); buildFoot(); };
    f.append(mo);
    if (S.standalone) { const b = el("button", "", "AUDIO / MIDI SETTINGS"); b.onclick = () => { closeMenu(); oppnaDev(); }; f.append(b); }
    if (S.web) f.append(el("span", "", S.midi.length ? "MIDI IN · " + S.midi.join(", ").toUpperCase() : "MIDI IN · CONNECT A KEYBOARD"));
    const pan = el("button", "", "ALL NOTES OFF"); pan.onclick = () => { Bridge.send({ t: "panic" }); S.pads.active = -1; updPads(); }; f.append(pan);
    f.append(el("span", "", `BLONDA ${S.name || "BRIS"} ${D.version} · ${D.presets.length} SOUNDS`));
  }
  // ---------------------------------------------------------------- AUDIO / MIDI (fristående appen): egen ruta
  // Pluggen svarar på "settings" med enheterna ("devs"); ändringar skickas som "setdev" och rutan ritas om.
  let devTimer = 0;
  function oppnaDev() {
    let d = $("#dev");
    if (!d) {
      d = el("div", ""); d.id = "dev";
      d.innerHTML = '<div class="kort"><div class="topp"><span class="ttl">AUDIO / MIDI</span><button class="stang" aria-label="Close">'
        + '<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="inn"><span class="tom">…</span></div></div>';
      d.addEventListener("pointerdown", (e) => { if (e.target === d) stangDev(); });
      d.querySelector(".stang").onclick = stangDev;
      document.getElementById("app").append(d);
    }
    d.classList.add("open");
    Bridge.send({ t: "settings" });
    clearInterval(devTimer); devTimer = setInterval(() => Bridge.send({ t: "settings" }), 2000);   // nya MIDI-enheter syns
  }
  function stangDev() { const d = $("#dev"); if (d) d.classList.remove("open"); clearInterval(devTimer); }
  Bridge.on.devs = (m) => {
    const d = $("#dev"); if (!d || !d.classList.contains("open")) return;
    const inn = d.querySelector(".inn"); inn.innerHTML = "";
    const sekt = (namn) => { const s = el("div", "sekt"); s.append(el("div", "rub", namn)); inn.append(s); return s; };
    const val = (s, lista, nu, fmt, f) => { const c = el("div", "choice"); lista.forEach((v) => {
      const b = el("button", "opt" + (String(v) === String(nu) ? " on" : ""), `<i></i>${fmt(v)}`); b.onclick = () => f(v); c.append(b); }); s.append(c); };
    const mi = sekt("MIDI IN");
    if (!(m.midi || []).length) mi.append(el("span", "tom", "NO MIDI DEVICES · CONNECT A KEYBOARD"));
    (m.midi || []).forEach((x) => {
      const b = el("button", "rad" + (x.on ? " on" : ""), `<i></i><span>${String(x.name).toUpperCase()}</span><em>${x.on ? "ON" : "OFF"}</em>`);
      b.onclick = () => Bridge.send({ t: "setdev", what: "midi", id: x.id, on: !x.on }); mi.append(b);
    });
    if (m.bt) { const b = el("button", "rad", "<i></i><span>BLUETOOTH MIDI</span><em>PAIR</em>"); b.onclick = () => Bridge.send({ t: "setdev", what: "bt" }); mi.append(b); }
    if ((m.outs || []).length > 1) val(sekt("OUTPUT"), m.outs, m.out, (v) => String(v).toUpperCase(), (v) => Bridge.send({ t: "setdev", what: "out", v }));
    if ((m.rates || []).length) val(sekt("SAMPLE RATE"), m.rates, m.sr, (v) => (v / 1000).toFixed(v % 1000 ? 1 : 0) + " KHZ", (v) => Bridge.send({ t: "setdev", what: "sr", v }));
    if ((m.bufs || []).length) {
      const bufs = m.bufs.length > 6 ? m.bufs.filter((b) => [64, 128, 256, 512, 1024, 2048].includes(b) || b === m.buf) : m.bufs;
      val(sekt("BUFFER"), bufs, m.buf, (v) => String(v), (v) => Bridge.send({ t: "setdev", what: "buf", v }));
    }
  };
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") stangDev(); });

  function openMenu() { $("#menu").classList.add("open"); const on = $("#list .it.on"); if (on) on.scrollIntoView({ block: "center" }); }
  function closeMenu() { $("#menu").classList.remove("open"); }

  // ---------------------------------------------------------------- tangenterna
  // Lugna, ljusa tangenter som egna mjuka plattor, svarta tangenter i bläckfärg. En tryckt tangent tänds underifrån
  // i växtens färg. Glid: håll tangenter och för fingrarna rakt uppåt -> ljudet moduleras (målet väljs i raden
  // ovanför: FILTER, VIBRATO, TREMOLO, PWM, WAH). Till vänster oktaven: + / C3 / −.
  const GLID = [["OFF", "OFF"], ...D.glid.targets.map((t) => [t.name, t.short])];
  S.glid = { m: 1, v: 0, sent: -1 };
  const keys = { cv: null, down: new Map(), lit: new Set(), lvl: new Map(), egna: new Map(), uiTid: new Map() };   // egna: toner som spelas härifrån (räknade som anslag)
  const GUT = 34, GAP = 3, KZ_MIN = 0.55, KZ_MAX = 2.4;
  function keyLayout() {
    const w = keys.cv.clientWidth - GUT, h = keys.cv.clientHeight;
    const nW = clamp(Math.round(w / (56 * S.kz)), 5, 40);
    const ww = w / nW, base = 48 + S.oct * 12;
    const whites = [], blacks = [];
    let n = base;
    while (whites.length < nW) {
      const pc = n % 12;
      if ([1, 3, 6, 8, 10].includes(pc)) blacks.push({ n, x: GUT + whites.length * ww - ww * 0.24, w: ww * 0.48, h: (h - 9) * 0.6, black: true });
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
    // tonerna som hålls just nu: fingrarna, klaviaturen (MIDI) och arpens ton. De lyser fullt och klingar av först
    // när de släpps (tidigare klingade MIDI-tonerna av redan i samma bildruta som de tändes).
    const held = keys.held = new Set(keys.lit);
    if (S.m.keys) for (let w = 0; w < 4; w++) { const k = S.m.keys[w] >>> 0; if (k) for (let b = 0; b < 32; b++) if ((k >>> b) & 1) held.add(w * 32 + b); }
    // anslagen: nya tangenter sedan förra bildrutan (fingrarna och klaviaturen). De kan låsa upp en hemlig patch
    // (en tonföljd), och i en hemlig patch får scenen dem (SJÖN: en droppe). Med arpen igång är det arpens slag
    // som räknas (notantalet nc räknas upp vid varje slag, även samma ton igen).
    // (tonerna man spelar här räknas direkt när de skickas, uiNot; här kommer klaviaturens toner via mätarna)
    for (const [n, t] of keys.egna) if (t !== Infinity && !held.has(n)) keys.egna.delete(n);   // släppt, och mätarna har släppt den
    for (const n of held) if ((!keys.forra || !keys.forra.has(n)) && !keys.egna.has(n) && !(performance.now() - (keys.uiTid.get(n) || -1e9) < 2500)) anslag(n);
    keys.forra = new Set(held);
    if (S.m.an >= 0) keys.senAn = S.m.an;
    const dn = keys.nc === undefined ? 0 : ((S.m.nc - keys.nc) >>> 0);   // slag sedan förra bildrutan (även flera)
    keys.nc = S.m.nc;
    const scen = S.secret && SCEN[S.secret];
    if (S.v.arp > 0.5 && scen && scen.anslag && keys.senAn !== undefined)
      for (let j = 0; j < Math.min(dn, 4); j++) scen.anslag(keys.senAn, fLage(keys.senAn, L), hemFarg(keys.senAn));
    // en hemlig patch med arpen igång: ljuset följer arpen. Arpens ton lyser fullt och klingar av när nästa tar över;
    // de hållna tangenterna lyser svagt (KR_HALL) så att man ser ackordet arpen spelar.
    const krArp = !!S.secret && S.v.arp > 0.5;
    if (!krArp) for (const n of held) keys.lvl.set(n, 1);
    else for (const n of held) if (!keys.lvl.has(n)) keys.lvl.set(n, KR_HALL);
    if (S.m.an >= 0) {   // arpens ton
      if (krArp) keys.lvl.set(S.m.an, 1);
      else { held.add(S.m.an); keys.lvl.set(S.m.an, Math.max(keys.lvl.get(S.m.an) || 0, 0.7)); }
    }
    // FOLLOW: tangenterna utanför ackordets skala tonas ner, grundtonen får en prick
    const fm = S.pads.follow && S.m.fm ? S.m.fm : 0, iSkala = (n) => !fm || ((fm >> (n % 12)) & 1);
    const tnu = performance.now(), kdt = Math.min(0.5, Math.max(0, (tnu - (keys.t || tnu)) / 1000)); keys.t = tnu;
    const kner = S.motion ? Math.exp(-kdt / 0.13) : 0;   // tangentens sken klingar av efter tid, inte bildrutor
    if (krArp) for (const [n, v] of keys.lvl) {
      if (n === S.m.an) continue;
      const lo = held.has(n) ? KR_HALL : 0, nv = lo + (v - lo) * kner;
      if (!lo && nv < 0.01) keys.lvl.delete(n); else keys.lvl.set(n, nv);
    }
    else for (const [n, v] of keys.lvl) { if (!held.has(n)) { const nv = v * kner; if (nv < 0.01) keys.lvl.delete(n); else keys.lvl.set(n, nv); } }
    const lv = (n) => keys.lvl.get(n) || 0;
    // glid per ton (för att rita linjen där fingret glider)
    const gl = new Map();
    for (const d of keys.down.values()) gl.set(d.n, d);
    // oktaven
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = `rgba(${INK},0.42)`; g.font = "400 15px 'BLONDA Mono'";
    g.fillText("+", GUT / 2 - 5, h * 0.2); g.fillText("−", GUT / 2 - 5, h * 0.8);
    g.font = "500 9px 'BLONDA Mono'"; g.fillStyle = `rgba(${INK},0.34)`; g.fillText("C" + (3 + S.oct), GUT / 2 - 5, h * 0.5);
    if (S.secret) tangenterHemlig(g, L, h, lv, iSkala); else {
    // ett sammanhängande tangentbord: en ljus bädd med mjuk skugga, vita tangenter med tunna skiljelinjer,
    // tonnamn på C, och svarta tangenter i mörk taupe med rak överkant, rundad underkant och en ljus fas nertill
    const bx = GUT, bw = L.w, bh = h - 9, br = 12;
    g.save();
    g.shadowColor = "rgba(70,45,35,0.13)"; g.shadowBlur = 18; g.shadowOffsetY = 6;
    g.fillStyle = "rgba(255,253,252,0.96)"; roundRect(g, bx, 0, bw, bh, br); g.fill();
    g.restore();
    g.save(); roundRect(g, bx, 0, bw, bh, br); g.clip();
    for (const k of L.whites) {
      const v = lv(k.n), x = k.x, kw = k.w;
      if (v > 0) {
        const gr = g.createLinearGradient(0, bh, 0, bh * 0.25);
        gr.addColorStop(0, `rgba(${rgb},${0.26 * v})`); gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr; g.fillRect(x, 0, kw, bh);
        g.fillStyle = `rgba(${rgb},${v})`; g.beginPath(); g.arc(x + kw / 2, bh - 24, 3.2, 0, TAU); g.fill();
      }
      if (!iSkala(k.n)) { g.fillStyle = `rgba(${INK},0.07)`; g.fillRect(x, 0, kw, bh); }
      else if (fm && k.n % 12 === S.m.fr) { g.fillStyle = `rgba(${rgb},0.8)`; g.beginPath(); g.arc(x + kw / 2, bh - 24, 2.4, 0, TAU); g.fill(); }
      if (k.n % 12 === 0 && kw > 26) {   // tonnamn på C
        g.font = "500 9px 'BLONDA Mono'"; g.fillStyle = `rgba(${INK},0.42)`; g.textAlign = "left";
        g.fillText("C" + (Math.floor(k.n / 12) - 1), x + Math.min(14, kw * 0.22), bh - 26);
      }
      if (k.x > bx + 1) { g.fillStyle = `rgba(${INK},0.11)`; g.fillRect(Math.round(k.x) - 0.5, 0, 1, bh); }
    }
    // en svag skugga i överkanten, som om tangenterna går in under en kant
    const ts = g.createLinearGradient(0, 0, 0, 9); ts.addColorStop(0, `rgba(${INK},0.07)`); ts.addColorStop(1, `rgba(${INK},0)`);
    g.fillStyle = ts; g.fillRect(bx, 0, bw, 9);
    for (const b of L.blacks) {
      const v = lv(b.n), rr = Math.min(5, b.w / 3), bh2 = b.h;
      g.save();
      g.shadowColor = "rgba(30,20,20,0.28)"; g.shadowBlur = 6; g.shadowOffsetY = 3;
      g.fillStyle = "rgb(80,73,75)"; nedRund(g, b.x, -1, b.w, bh2 + 1, rr); g.fill();
      g.restore();
      g.fillStyle = "rgba(255,255,255,0.13)"; nedRund(g, b.x + 1.5, bh2 - 9, b.w - 3, 7.5, rr - 1); g.fill();   // fasen nertill
      g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(b.x + 1.5, 0, 1, bh2 - 10);                         // ljuskant
      if (v > 0) {
        g.fillStyle = `rgba(${rgb},${0.62 * v})`; nedRund(g, b.x, -1, b.w, bh2 + 1, rr); g.fill();
        g.fillStyle = `rgba(255,255,255,${0.9 * v})`; g.beginPath(); g.arc(b.x + b.w / 2, bh2 - 18, 2.6, 0, TAU); g.fill();
      }
      if (!iSkala(b.n)) { g.fillStyle = "rgba(246,241,238,0.5)"; nedRund(g, b.x, -1, b.w, bh2 + 1, rr); g.fill(); }
      else if (fm && b.n % 12 === S.m.fr) { g.fillStyle = `rgba(${rgb},1)`; g.beginPath(); g.arc(b.x + b.w / 2, bh2 - 18, 2.2, 0, TAU); g.fill(); }
    }
    g.restore();
    }
    drawLjus(L, lv);
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
  // de hemliga patcharnas tangentbord: mörkt glas, och de spelade tangenterna glöder i patchens färg
  // (KRISTALL: lila / bärnsten per ton, SJÖN: månljus, KASSETTEN: VU-mätarnas varma sken)
  function tangenterHemlig(g, L, h, lv, iSkala) {
    const bx = GUT, bw = L.w, bh = h - 9, br = 12;
    const kc = (n) => hemFarg(n).join(",");
    g.save();
    g.shadowColor = "rgba(0,0,0,0.55)"; g.shadowBlur = 22; g.shadowOffsetY = 8;
    g.fillStyle = "rgb(16,14,24)"; roundRect(g, bx, 0, bw, bh, br); g.fill();
    g.restore();
    g.save(); roundRect(g, bx, 0, bw, bh, br); g.clip();
    for (const k of L.whites) {
      const v = lv(k.n), x = k.x, kw = k.w;
      const gr = g.createLinearGradient(0, 0, 0, bh);
      gr.addColorStop(0, "rgb(24,22,34)"); gr.addColorStop(0.8, "rgb(20,18,29)"); gr.addColorStop(1, "rgb(30,28,41)");
      g.fillStyle = gr; g.fillRect(x, 0, kw, bh);
      if (v > 0) {   // tangenten lyser inifrån, starkast nertill där ljuset kommer ut
        const c = kc(k.n), lg = g.createLinearGradient(0, bh, 0, 0);
        lg.addColorStop(0, `rgba(${c},${0.95 * v})`); lg.addColorStop(0.45, `rgba(${c},${0.55 * v})`); lg.addColorStop(1, `rgba(${c},${0.22 * v})`);
        g.fillStyle = lg; g.fillRect(x + 1, 0, kw - 2, bh);
        const kg = g.createRadialGradient(x + kw / 2, bh, 0, x + kw / 2, bh, kw * 0.9);
        kg.addColorStop(0, `rgba(255,248,240,${0.85 * v})`); kg.addColorStop(1, "rgba(255,248,240,0)");
        g.fillStyle = kg; g.fillRect(x, bh - kw, kw, kw);
      }
      if (!iSkala(k.n)) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x, 0, kw, bh); }
      if (k.n % 12 === 0 && kw > 26) {
        g.font = "500 9px 'BLONDA Mono'"; g.fillStyle = v > 0.3 ? "rgba(20,14,30,0.7)" : "rgba(233,228,244,0.42)"; g.textAlign = "left";
        g.fillText("C" + (Math.floor(k.n / 12) - 1), x + Math.min(14, kw * 0.22), bh - 26);
      }
      if (k.x > bx + 1) { g.fillStyle = "rgba(255,255,255,0.07)"; g.fillRect(Math.round(k.x) - 0.5, 0, 1, bh); }
    }
    const ts = g.createLinearGradient(0, 0, 0, 12); ts.addColorStop(0, "rgba(0,0,0,0.5)"); ts.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = ts; g.fillRect(bx, 0, bw, 12);
    for (const b of L.blacks) {
      const v = lv(b.n), rr = Math.min(5, b.w / 3), bh2 = b.h;
      g.save();
      g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = 8; g.shadowOffsetY = 4;
      const gr = g.createLinearGradient(0, 0, 0, bh2);
      gr.addColorStop(0, "rgb(10,9,15)"); gr.addColorStop(1, "rgb(22,20,30)");
      g.fillStyle = gr; nedRund(g, b.x, -1, b.w, bh2 + 1, rr); g.fill();
      g.restore();
      g.fillStyle = "rgba(255,255,255,0.10)"; nedRund(g, b.x + 1.5, bh2 - 9, b.w - 3, 7.5, rr - 1); g.fill();   // fasen nertill
      g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(b.x + 1.5, 0, 1, bh2 - 10);
      if (v > 0) {
        const c = kc(b.n), lg = g.createLinearGradient(0, bh2, 0, 0);
        lg.addColorStop(0, `rgba(${c},${0.95 * v})`); lg.addColorStop(1, `rgba(${c},${0.45 * v})`);
        g.fillStyle = lg; nedRund(g, b.x + 1, -1, b.w - 2, bh2, rr); g.fill();
        g.fillStyle = `rgba(255,248,240,${0.6 * v})`; nedRund(g, b.x + b.w * 0.3, bh2 * 0.15, b.w * 0.4, bh2 * 0.7, rr); g.fill();
      }
      if (!iSkala(b.n)) { g.fillStyle = "rgba(0,0,0,0.4)"; nedRund(g, b.x, -1, b.w, bh2 + 1, rr); g.fill(); }
    }
    g.restore();
    g.strokeStyle = "rgba(255,255,255,0.08)"; g.lineWidth = 1; roundRect(g, bx + 0.5, 0.5, bw - 1, bh - 1, br); g.stroke();   // glasets kant
  }
  // ---------------------------------------------------------------- ljuset
  // Som en lampa vid skrivmaskinens anslag: där man spelar strålar ett varmt ljus upp ur tangentbordet över blomman,
  // och resten av skärmen skuggas en aning, så att ljuset syns. Ljuset tonar upp snabbt och klingar av långsamt.
  const ljus = { cv: null, v: new Map(), tomt: true, t: 0 };
  function drawLjus(L, lv) {
    if (!ljus.cv) {
      ljus.cv = el("canvas", ""); ljus.cv.id = "ljus";
      document.getElementById("app").append(ljus.cv);
    }
    const cv = ljus.cv, W = innerWidth, Hh = innerHeight, sk = 0.5;   // halv upplösning räcker för mjukt ljus
    if (cv.width !== Math.round(W * sk) || cv.height !== Math.round(Hh * sk)) { cv.width = Math.round(W * sk); cv.height = Math.round(Hh * sk); }
    // ljusets styrka per ton: upp snabbt, ner långsamt (direkt utan rörelse)
    const pa = new Set();
    const krL = S.secret === "kristall";
    const paL = krL || S.ljus;   // det vanliga varma ljuset (S.ljus) är avstängt sedan 1.10
    // KRISTALL med arpen igång: bara arpens ton lyser, och varje nytt slag tänder den på nytt (även samma ton
    // två gånger i rad: notantalet nc räknas upp vid varje anslag); annars lyser tonerna som hålls
    const krArp = krL && S.v.arp > 0.5;
    if (krArp) {
      if (S.m.an >= 0) { pa.add(S.m.an); if (S.m.nc !== ljus.nc) ljus.v.set(S.m.an, 1); }
    } else if (paL && keys.held) for (const n of keys.held) pa.add(n);
    ljus.nc = S.m.nc;
    // efter tid, inte bildrutor (60 eller 120 Hz, eller en långsam webbläsare, ska kännas likadant)
    const nu = performance.now(), dt = Math.min(0.5, Math.max(0, (nu - (ljus.t || nu)) / 1000)); ljus.t = nu;
    const upp = S.motion ? 1 - Math.exp(-dt / 0.045) : 1, ner = S.motion ? Math.exp(-dt / (krArp ? 0.2 : 0.32)) : 0;   // arpen: kortare svans
    for (const n of pa) ljus.v.set(n, (ljus.v.get(n) || 0) + (1 - (ljus.v.get(n) || 0)) * upp);
    for (const [n, v] of ljus.v) if (!pa.has(n)) { const nv = v * ner; if (nv < 0.01) ljus.v.delete(n); else ljus.v.set(n, nv); }
    const g = cv.getContext("2d");
    const r = keys.cv.getBoundingClientRect();
    const pos = (n) => { const k = L.whites.find((x) => x.n === n) || L.blacks.find((x) => x.n === n); return k ? r.left + k.x + k.w / 2 : null; };
    // glasscenen: ljuspassen blandas efter var tonerna ligger på tangentbordet och färgas per ton
    if (SCEN.kristall && krL) {
      const lista = [];
      for (const [n, v] of ljus.v) lista.push({ f: fLage(n, L), v, c: krBarn(n) ? KR.barnL : KR.lilaL });
      const sig = lista.map((l) => l.f.toFixed(3) + ":" + l.v.toFixed(3)).join();
      if (sig !== ljus.sig) { ljus.sig = sig; SCEN.kristall.ljus(lista); }
    }
    if (!ljus.v.size) { if (!ljus.tomt) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); ljus.tomt = true; } return; }   // hela duken (utan halveringen)
    ljus.tomt = false;
    g.setTransform(sk, 0, 0, sk, 0, 0); g.clearRect(0, 0, W, Hh);
    if (krL) { stralar(g, r, pos); return; }
    let A = 0; for (const v of ljus.v.values()) A = Math.max(A, v);
    // skuggan över allt, jämn (en svag lutning över hela höjden ger synliga trappsteg i 8 bitar)
    g.fillStyle = `rgba(58,42,34,${0.1 * A})`; g.fillRect(0, 0, W, Hh);
    const R = Math.min(Hh * 0.7, 720), y0 = r.top + 2, mjuk = Math.round(R * 0.05);
    g.filter = `blur(${mjuk}px)`;
    for (const [n, v] of ljus.v) {
      const x = pos(n); if (x === null) continue;
      // ljuskäglan: smal vid tangenten, vidgas uppåt och tonar bort
      const strale = () => { g.beginPath(); g.moveTo(x - 14, y0); g.lineTo(x - R * 0.42, y0 - R); g.lineTo(x + R * 0.42, y0 - R); g.lineTo(x + 14, y0); g.closePath(); };
      g.globalCompositeOperation = "destination-out";
      let lg = g.createLinearGradient(0, y0, 0, y0 - R); lg.addColorStop(0, `rgba(0,0,0,${v})`); lg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = lg; strale(); g.fill();
      g.globalCompositeOperation = "source-over";
      lg = g.createLinearGradient(0, y0, 0, y0 - R);
      lg.addColorStop(0, `rgba(255,232,190,${0.85 * v})`); lg.addColorStop(0.3, `rgba(255,236,200,${0.45 * v})`); lg.addColorStop(0.65, `rgba(255,240,212,${0.14 * v})`); lg.addColorStop(1, "rgba(255,240,215,0)");
      g.fillStyle = lg; strale(); g.fill();
      // det varma skenet där ljuset kommer ut, precis ovanför tangentbordet
      const hs = g.createRadialGradient(x, y0 - 8, 0, x, y0 - 8, 110);
      hs.addColorStop(0, `rgba(255,236,200,${0.8 * v})`); hs.addColorStop(1, "rgba(255,240,212,0)");
      g.fillStyle = hs; g.fillRect(x - 110, y0 - 118, 220, 116);
      // och ljuset faller ner över tangenterna runt den spelade, som lampans sken på pappret
      const kh = r.height, ky = y0 + kh * 0.45, kr = Math.max(90, kh * 1.05);
      g.globalCompositeOperation = "destination-out";
      let pl = g.createRadialGradient(x, ky, 0, x, ky, kr); pl.addColorStop(0, `rgba(0,0,0,${v})`); pl.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = pl; g.fillRect(x - kr, ky - kr, kr * 2, kr * 2);
      g.globalCompositeOperation = "source-over";
      pl = g.createRadialGradient(x, ky, 0, x, ky, kr); pl.addColorStop(0, `rgba(255,238,206,${0.42 * v})`); pl.addColorStop(1, "rgba(255,240,215,0)");
      g.fillStyle = pl; g.fillRect(x - kr, ky - kr, kr * 2, kr * 2);
    }
    g.filter = "none";
    g.globalCompositeOperation = "source-over";
  }

  // var en ton ligger på tangentbordet 0..1 (vänster..höger), även utanför det som syns (då vid kanten)
  function fLage(n, L) {
    const vit = (m) => Math.floor(m / 12) * 7 + [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6][((m % 12) + 12) % 12];
    const w0 = L.whites.length ? vit(L.whites[0].n) : 0, nv = Math.max(1, L.whites.length);
    return Math.min(1, Math.max(0, (vit(n) - w0 + 0.5) / nv));
  }
  // den hemliga patchens strålar: smala, färgade ljuspelare ur de spelade tangenterna upp genom scenen, med ett
  // mjukt sken runt omkring, ett bloss där strålen lämnar tangenten och ett sken över tangenterna ("lighter" = ljus
  // som läggs till). En pelare är en radiell gradient som sträcks på höjden: den tonar ut åt sidorna och uppåt.
  function stralar(g, r, pos) {
    const y0 = r.top + 1, hojd = Math.max(200, y0 * 0.88);
    g.globalCompositeOperation = "lighter";
    for (const [n, v] of ljus.v) {
      const x = pos(n); if (x === null) continue;
      const c = (krBarn(n) ? KR.barn : KR.lila).join(",");
      const pelare = (bredd, a) => {
        g.save(); g.beginPath(); g.rect(x - bredd, y0 - hojd, bredd * 2, hojd); g.clip();
        g.translate(x, y0); g.scale(1, hojd / bredd);
        const rg = g.createRadialGradient(0, 0, 0, 0, 0, bredd);
        rg.addColorStop(0, `rgba(${c},${a})`); rg.addColorStop(0.35, `rgba(${c},${a * 0.45})`); rg.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = rg; g.fillRect(-bredd, -bredd, bredd * 2, bredd);
        g.restore();
      };
      pelare(90, 0.22 * v); pelare(30, 0.42 * v); pelare(6, 0.9 * v); pelare(1.6, 0.9 * v);
      const bl = g.createRadialGradient(x, y0, 0, x, y0, 130);   // blosset där strålen kommer ut
      bl.addColorStop(0, `rgba(255,246,236,${0.6 * v})`); bl.addColorStop(0.12, `rgba(${c},${0.45 * v})`); bl.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = bl; g.fillRect(x - 130, y0 - 130, 260, 260);
      const fl = g.createLinearGradient(x - 170, 0, x + 170, 0);   // en tunn linje längs tangentbordets kant
      fl.addColorStop(0, `rgba(${c},0)`); fl.addColorStop(0.5, `rgba(${c},${0.4 * v})`); fl.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = fl; g.fillRect(x - 170, y0 - 1.5, 340, 3);
      const kh = r.height, ky = y0 + kh * 0.55, kr = Math.max(90, kh * 0.9);
      const pl = g.createRadialGradient(x, ky, 0, x, ky, kr);    // skenet över tangenterna runt omkring
      pl.addColorStop(0, `rgba(${c},${0.28 * v})`); pl.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = pl; g.fillRect(x - kr, ky - kr, kr * 2, kr * 2);
    }
    g.globalCompositeOperation = "source-over";
  }

  function setOct(o) {
    o = clamp(o, -3, 3); if (o === S.oct) return;
    for (const d of keys.down.values()) uiOff(d.n);
    keys.down.clear(); keys.lit.clear(); S.oct = o; updGlid(); saveUi();
  }
  // glidets värde = det högsta av fingrarna som hålls; skickas högst en gång per bildruta
  function updGlid() {
    let v = 0;
    for (const d of keys.down.values()) v = Math.max(v, d.up);
    S.glid.v = S.glid.m > 0 ? v : 0;
  }
  function sendGlid() {
    if (S.mpe) {   // BRIS MPE: varje finger har sin egen slide på sin ton
      for (const d of keys.down.values()) if (d.dirty) { d.dirty = false; Bridge.send({ t: "slide", n: d.n, v: +d.up.toFixed(4) }); }
      return;
    }
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
    z.append(el("span", "ttl", "KEYS"), zo, zi);
    const pw = el("div", "choice padsw"), pb = el("button", "opt padsb" + (S.pads.open ? " on" : ""), "<i></i>PADS");
    pb.onclick = () => oppnaPads(!S.pads.open); pw.append(pb);
    bar.append(pw, z);
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
    const release = (pid) => { const d = keys.down.get(pid); if (!d) return; uiOff(d.n); keys.lit.delete(d.n); keys.down.delete(pid); };
    // sliden börjar där fingret trycker: högt upp på tangenten = mer redan från början. Vita tangenter: från de svarta
    // tangenternas nederkant (0) till toppen (1), nedanför är det 0 som förut. Svarta: från mitten av tangenten.
    const upStart = (k, y) => {
      const lo = k.black ? k.h * 0.55 : (cv.clientHeight - 9) * 0.6, hi = (k.black ? k.h : cv.clientHeight - 9) * 0.06;
      return clamp((lo - y) / Math.max(1, lo - hi), 0, 1);
    };
    const start = (pid, k, y) => {
      const v = Math.round(clamp(50 + k.y * 77, 1, 127));
      const d = { n: k.n, x: k.x, w: k.w, black: !!k.black, y0: y, y, s0: upStart(k, y), up: 0 };
      d.up = d.s0; d.dirty = d.up > 0;
      keys.down.set(pid, d);
      if (!S.mpe && d.up > 0) { updGlid(); sendGlid(); }   // BRIS: glidet fram före tonen, så att den börjar där
      uiNot(k.n, v); keys.lit.add(k.n); padLagg(k.n);
      if (S.mpe && d.up > 0) sendGlid();                   // BRIS MPE: slide per ton, efter tonen (den får sin kanal)
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
      const up = clamp(d.s0 + (d.y0 - y) / (kh() * 0.55), 0, 1);
      d.y = y; if (Math.abs(up - d.up) > 0.002) d.dirty = true; d.up = up;
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
    const n = 60 + S.oct * 12 + i; kbDown.set(k, n); keys.lit.add(n); padLagg(n);
    uiNot(n, 100);
  });
  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase(), n = kbDown.get(k); if (n === undefined) return;
    kbDown.delete(k); keys.lit.delete(n); uiOff(n);
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

  function saveUi() { Bridge.send({ t: "ui", s: JSON.stringify({ tab: S.tab, oct: S.oct, glid: S.glid.m, kz: S.kz, kh: S.kh, motion: S.motion, eget: S.eget, hemliga: S.hemliga, secret: S.secret, fore: S.fore, band: S.band, fxVal: S.fxVal,
    pads: { list: S.pads.list, hold: S.pads.hold, follow: S.pads.follow, open: S.pads.open } }) }); }

  // ---------------------------------------------------------------- ljudstart (webben)
  function ensureAudio() { if (Bridge.mode === "web" && !Bridge.running) Bridge.startAudio().then(() => $("#start").classList.remove("show")); }

  // ---------------------------------------------------------------- hjälpare
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function hexRgb(hex) { const n = parseInt(hex.replace("#", ""), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
  // rak överkant, rundade hörn nertill (de svarta tangenterna)
  function nedRund(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.closePath(); }
  function roundRect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // ---------------------------------------------------------------- start
  const flower = Blommor.create($("#fBack"), $("#fGl"), $("#fFront"), D.blommor);
  flower.preload([...new Set(D.plants.map((p) => p.photo))]);
  // de hemliga patcharnas scener (skapas bara om modulen och datan finns)
  const SCEN = {};
  for (const h of HEM) {
    if (h.id === "kristall" && h.scen && typeof Kristall !== "undefined") SCEN.kristall = Kristall.create($("#stage"), h.scen, "kristall/");
    if (h.id === "sjon" && typeof Sjon !== "undefined") SCEN.sjon = Sjon.create(document.body);
    if (h.id === "kassett" && h.scen && typeof Kassett !== "undefined") SCEN.kassett = Kassett.create($("#stage"), h.scen, "kassett/", (i, g, r) => Bridge.send({ t: "sfx", i, g, r }));
  }
  // BLONDA: bokstäverna var för sig (de rör sig när appen lyssnar), fem tryck inom tre sekunder börjar lyssna
  { const logo = $("header .logo");
    if (logo) {
      logo.innerHTML = [...logo.textContent.trim()].map((c, i) => `<span style="--i:${i}">${c}</span>`).join("") + '<em id="nedrakning"></em>';
      logo.addEventListener("pointerdown", () => {
        const nu = performance.now(); if (nu - MEL.tt > 3000) MEL.tryck = 0;
        MEL.tt = nu; if (++MEL.tryck >= 5) { MEL.tryck = 0; lyssna(true); }
      });
    } }
  // KASSETTEN: knapparna trycks, rattarna vrids (dra uppåt/nedåt), och ett tryck på kassetten byter band
  $("#stage").addEventListener("pointerdown", (e) => {
    if (S.secret !== "kassett" || !SCEN.kassett) return;
    const t = SCEN.kassett.traff(e.clientX, e.clientY); if (!t) return;
    e.preventDefault();
    if (t.typ === "knapp") kassettKnapp(t.namn);
    else if (t.typ === "kassett" && D.band) valjBand(((S.band ?? 0) + 1) % D.band.length);
    else if (t.typ === "ratt") {
      const id = KA_RATT[t.i], y0 = e.clientY, v0 = S.v[id], pid = e.pointerId;
      hemFore(id); gesture(id, true);
      const flytta = (ev) => { if (ev.pointerId !== pid) return; setParam(id, Math.max(0, Math.min(1, v0 + (y0 - ev.clientY) / 180)), true); };
      const slapp = (ev) => { if (ev.pointerId !== pid) return; gesture(id, false); removeEventListener("pointermove", flytta); removeEventListener("pointerup", slapp); removeEventListener("pointercancel", slapp); saveUi(); };
      addEventListener("pointermove", flytta); addEventListener("pointerup", slapp); addEventListener("pointercancel", slapp);
    }
  });
  // KRISTALL: tryck fem gånger på versionen uppe till höger (inom tre sekunder)
  const ver = { n: 0, t: 0 };
  $("#ver").addEventListener("pointerdown", (e) => {
    const nu = performance.now(); if (nu - ver.t > 3000) ver.n = 0;
    ver.t = nu; ver.n++;
    if (ver.n >= 5 && hemOf("kristall")) { ver.n = 0; const ny = !S.hemliga.includes("kristall"); valjHemlig("kristall"); visaHemlig("kristall", ny); }
  });
  let envSm = 0;
  $("#ver").textContent = "BRIS " + D.version;
  buildTabs();
  buildPanels();
  buildMenu();
  keys.cv = $("#keys canvas");
  buildPads();
  buildKbar();
  gripInput();
  keysInput();
  $("#menuBtn").onclick = openMenu; $("#menuClose").onclick = closeMenu; $("#menu .shade").onclick = closeMenu;
  document.addEventListener("pointerdown", () => ensureAudio(), { capture: true });

  // ---------------------------------------------------------------- multitouch
  // iOS skickar inget klick när ett annat finger redan ligger på skärmen (t.ex. på tangenterna), så knapparna
  // reagerar på sina egna pekhändelser i stället: tryck och släpp på samma knapp = klick, oavsett andra fingrar.
  // Fotknapparna (WET FREEZE LOOP DUB) och padsen slår om redan när fingret trycker ner, som på pedalen.
  const tryck = new Map();   // pointerId -> { b, x, y }
  const snabbKlick = (b) => { b._snabb = performance.now(); b.click(); };
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest && e.target.closest("button");
    if (!b || b.disabled || b.classList.contains("pad")) return;
    if (b.classList.contains("fs")) { e.preventDefault(); snabbKlick(b); return; }
    tryck.set(e.pointerId, { b, x: e.clientX, y: e.clientY });
  }, true);
  document.addEventListener("pointermove", (e) => {
    const t = tryck.get(e.pointerId);
    if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) > 12) tryck.delete(e.pointerId);   // skrollar i listan
  }, true);
  document.addEventListener("pointerup", (e) => {
    const t = tryck.get(e.pointerId); tryck.delete(e.pointerId);
    if (!t || !t.b.isConnected) return;
    const r = t.b.getBoundingClientRect();
    if (e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6) snabbKlick(t.b);
  }, true);
  document.addEventListener("pointercancel", (e) => tryck.delete(e.pointerId), true);
  // webbläsarens eget klick efter vårt (eller fördröjt) räknas inte en gång till
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("button");
    if (b && e.isTrusted && b._snabb && performance.now() - b._snabb < 1000) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  // ingen markering eller kopiera-meny när man håller kvar ett finger (utom i textfältet)
  const iText = (e) => e.target.closest && e.target.closest("input, textarea");
  document.addEventListener("selectstart", (e) => { if (!iText(e)) e.preventDefault(); });
  document.addEventListener("contextmenu", (e) => { if (!iText(e)) e.preventDefault(); });

  Bridge.on.state = (st) => {
    S.standalone = !!st.standalone; S.web = !!st.web; S.mpe = !!st.mpe;
    S.name = S.mpe ? "BRIS MPE" : "BRIS";
    $("#ver").textContent = S.name + " " + D.version; document.title = "BLONDA " + S.name;
    if (st.params) for (const id in st.params) setParam(id, st.params[id], false);
    if (st.ui) { try { const u = JSON.parse(st.ui); if (PAGES.some((p) => p.id === u.tab)) S.tab = u.tab; S.oct = u.oct || 0; if (u.glid >= 0 && u.glid < GLID.length) S.glid.m = u.glid; if (u.kz > 0) S.kz = clamp(u.kz, KZ_MIN, KZ_MAX); if (u.kh > 0) S.kh = u.kh;
      if (typeof u.motion === "boolean") S.motion = u.motion; S.eget = u.eget || null;
      // (1.10 sparade hemlig/kristall för den enda hemliga patchen)
      S.hemliga = (Array.isArray(u.hemliga) ? u.hemliga : u.hemlig ? ["kristall"] : []).filter((id) => hemOf(id));
      S.secret = u.secret !== undefined ? u.secret : u.kristall ? "kristall" : null;
      if (S.secret && !S.hemliga.includes(S.secret)) S.secret = null;
      S.fore = u.fore && typeof u.fore === "object" ? u.fore : null;
      S.band = Number.isInteger(u.band) && D.band && D.band[u.band] ? u.band : null; S.fxVal = typeof u.fxVal === "string" ? u.fxVal : u.fxTape ? "tape" : "kor";
      if (u.pads && Array.isArray(u.pads.list) && u.pads.list.length === 4) S.pads.list = u.pads.list.map((l) => (Array.isArray(l) ? l.filter((n) => n >= 0 && n <= 127).slice(0, 8) : []));
      if (u.pads) { S.pads.hold = !!u.pads.hold; S.pads.follow = !!u.pads.follow; S.pads.open = !!u.pads.open; } } catch (e) { /* */ } }
    if (typeof st.follow === "boolean") S.pads.follow = st.follow;   // pluggens sparade FOLLOW gäller
    S.pads.active = -1; S.pads.armed = -1; S.pads.rec = false;
    if (st.glid >= 0 && st.glid < GLID.length) S.glid.m = st.glid;   // pluggens sparade läge gäller
    S.preset = st.preset ?? S.preset;
    if (S.secret && S.preset !== hemOf(S.secret).ljud) lamnaHemlig();   // ljudet byttes utanför (t.ex. i Logic)
    S.egna = Array.isArray(st.user) ? st.user.filter((e) => e && e.name && e.values) : [];
    if (S.eget && !S.egna.some((e) => e.name === S.eget)) S.eget = null;
    setMotion(S.motion); buildMenu();
    buildPanels();
    onPreset(S.preset);
    buildFoot();
    buildPads(); Bridge.send({ t: "follow", on: S.pads.follow });
    buildKbar(); S.glid.sent = -1; updGlid(); if (S.mpe) Bridge.send({ t: "glid", m: S.glid.m, v: 0 }); else sendGlid(); applyKeysHeight();
    Bridge.send({ t: "play", on: false });   // rullen finns inte längre: se till att den aldrig spelar
    // layoutens mätvärden till appen (iOS skriver dem till en fil som CI läser); efter en stund och igen senare
    const diag = () => { const pr = document.createElement("div"); pr.style.cssText = "position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
      document.body.append(pr); const c = getComputedStyle(pr); const kb = $("#keys").getBoundingClientRect();
      Bridge.send({ t: "diag", s: `sida ${innerWidth}x${innerHeight} skärm ${screen.width}x${screen.height} visual ${visualViewport ? Math.round(visualViewport.height) : "-"} env ${c.paddingTop} ${c.paddingRight} ${c.paddingBottom} ${c.paddingLeft} tangenter ${Math.round(kb.top)}-${Math.round(kb.bottom)} dpr ${devicePixelRatio}` }); pr.remove(); };
    if (!S.web) { setTimeout(diag, 4000); setTimeout(diag, 20000); }
    if (Bridge.needsGesture) $("#start").classList.add("show");
    flower.signals({ cut: S.v.cut, res: S.v.res, lrate: S.v.lrate });
  };
  Bridge.on.params = (v) => { for (const id in v) setParam(id, v[id], false); if ("arp" in v) updPads(); };
  Bridge.on.preset = (i) => { if (i !== S.preset) { if (S.secret) { lamnaHemlig(); buildMenu(); } onPreset(i); } };
  Bridge.on.info = (m) => { if (m.midi) { S.midi = m.midi; buildFoot(); } };
  Bridge.on.meters = (m) => {
    S.m.env = m.env; S.m.lfo = m.lfo; S.m.pk = m.pk; S.m.pl = m.pl ?? m.pk; S.m.pr = m.pr ?? m.pk; S.m.mask = m.mask; S.m.nc = m.nc; S.m.glid = m.glid || 0;
    if (m.scope) S.m.scope = m.scope;
    S.m.fr = m.fr ?? -1; S.m.fm = m.fm || 0; S.m.an = m.an ?? -1;
    // bandspelaren (KASSETTEN): plats 0..1, fart, inspelat, sekunder, läge (+8 = paus), nivån på bandet
    S.m.bp = m.bp || 0; S.m.bf = m.bf || 0; S.m.bi = m.bi || 0; S.m.bs = m.bs || 0; S.m.bl = m.bl | 0; S.m.bvl = m.bvl || 0; S.m.bvr = m.bvr || 0;
    if (S.pads.armed >= 0 && m.keys) for (let w = 0; w < 4; w++) for (let b = 0; b < 32; b++) if ((m.keys[w] >>> b) & 1) padLagg(w * 32 + b);
    if (m.keys) S.m.keys = m.keys.slice();   // tangenterna som hålls (även från en klaviatur) lyser
    flower.signals({ env: m.env, lfo: m.lfo, pk: m.pk, mask: m.mask, nc: m.nc });
  };
  $("#start").addEventListener("click", () => { ensureAudio(); });

  function loop(now) {
    requestAnimationFrame(loop);
    envSm += (S.m.env - envSm) * 0.12;
    drawWave(now / 1000);
    drawKeys();
    for (const id in SCEN) SCEN[id].tick(S);
    sendGlid();
    updateMods();
  }
  requestAnimationFrame(loop);
  window.addEventListener("resize", () => { applyKeysHeight(); knobEls.forEach((k) => k._draw()); });
  document.fonts && document.fonts.ready.then(() => knobEls.forEach((k) => k._draw()));
  Bridge.start();
  window.__bris = { S, setParam, selectPreset, note: (n, v) => uiNot(n, v), off: (n) => uiOff(n), tab: (t) => { S.tab = t; buildPanels(); }, keys, glidMode: setGlidMode, setZoom, applyKeysHeight, flower,
    pads: { open: oppnaPads, spela: padSpela, slapp: padSlapp, follow: setFollow, namn: ackordNamn }, dev: { open: oppnaDev, close: stangDev }, ljus: () => ljus, kristall: () => SCEN.kristall || null, scen: (id) => SCEN[id] || null,
    valjHemlig, valjKristall: () => valjHemlig("kristall"), melodi: () => MEL.buf.map((e) => e.n),
    lyssnar: () => performance.now() < MEL.till, valjBand, kassettKnapp };   // för tester
})();
