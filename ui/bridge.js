// BLONDA BRIS – bryggan mellan gränssnittet och ljudet.
//  * I pluggen/appen (JUCE): meddelanden till och från C++ via window.__JUCE__.backend.
//  * På webben: ljudkärnan som WebAssembly i en AudioWorklet (worklet.js + bris.wasm).
// Gränssnittet (app.js) pratar bara med Bridge.send(...) och Bridge.on.*.
"use strict";

const Bridge = (() => {
  const D = window.BRIS_DATA;
  const idx = {};
  D.params.forEach((p, i) => (idx[p.id] = i));
  const on = { state: null, params: null, meters: null, preset: null, info: null, devs: null };
  const juce = !!(window.__JUCE__ && window.__JUCE__.backend);

  // ------------------------------------------------------------------ JUCE
  if (juce) {
    const be = window.__JUCE__.backend;
    be.addEventListener("bris", (m) => {
      if (!m || !m.t) return;
      if (m.t === "state") on.state && on.state(m);
      else if (m.t === "params") on.params && on.params(m.v);
      else if (m.t === "preset") on.preset && on.preset(m.i);
      else if (m.t === "m") on.meters && on.meters(m);
      else if (m.t === "info") on.info && on.info(m);
      else if (m.t === "devs") on.devs && on.devs(m);
    });
    return {
      mode: "juce", on,
      send(m) { be.emitEvent("bris", m); },
      start() { be.emitEvent("bris", { t: "hello" }); },
      needsGesture: false,
    };
  }

  // ------------------------------------------------------------------ webben
  const SPAR = "blonda-bris-v1";
  let ctx = null, node = null, calc = null, wasmBytes = null;
  let st = null;            // gränssnittets tillstånd som sparas
  const pending = [];       // meddelanden innan ljudet startat
  let saveT = 0;

  const vals = () => { const o = {}; D.params.forEach((p) => (o[p.id] = st.params[p.id] ?? p.def)); return o; };
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(SPAR, JSON.stringify(st)); } catch (e) { /* privat läge */ } }, 400);
  }
  function egna() { try { const v = JSON.parse(localStorage.getItem(SPAR + "-egna") || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function post(m) { if (node) node.port.postMessage(m); else pending.push(m); }
  function postAllParams() { D.params.forEach((p, i) => post({ t: "param", i, v: st.params[p.id] ?? p.def })); }

  function presetValues(i) {
    const e = calc.exports;
    D.params.forEach((p, k) => e.bris_set_param(k, st.params[p.id] ?? p.def));
    e.bris_load_preset(i);
    const o = {};
    D.params.forEach((p, k) => (o[p.id] = e.bris_get_param(k)));
    return o;
  }

  async function load() {
    const r = await fetch("bris.wasm");
    wasmBytes = await r.arrayBuffer();
    const noop = () => 0;
    const { instance } = await WebAssembly.instantiate(wasmBytes, { wasi_snapshot_preview1: { fd_close: noop, fd_seek: noop, fd_write: noop } });
    calc = instance; calc.exports._initialize(); calc.exports.bris_init(48000);
  }

  async function startAudio() {
    if (ctx) { if (ctx.state !== "running") await ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
    const p = ctx.resume();   // måste ske i själva trycket (iOS)
    await ctx.audioWorklet.addModule("worklet.js");
    node = new AudioWorkletNode(ctx, "bris", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { wasm: wasmBytes, sr: ctx.sampleRate } });
    node.connect(ctx.destination);
    node.port.onmessage = (ev) => { const m = ev.data; if (m.t === "m") on.meters && on.meters(m); };
    postAllParams();
    pending.splice(0).forEach((m) => node.port.postMessage(m));
    await p;
    midi();
    // apparatens ljud (knappar, lucka, band, knappsatsens klick, fel och rätt kod): avkodas här och skickas till kärnan
    ["knapp", "kort", "rec", "upp", "lucka", "in", "klick0", "klick1", "klick2", "klick3", "klick4", "klick5", "klick6", "klick7",
     "fel0", "fel1", "ratt"].forEach(async (n, i) => {
      try {
        const b = await ctx.decodeAudioData(await (await fetch(`ljud/bris_${n}.wav`)).arrayBuffer());
        const d = new Float32Array(b.getChannelData(0));
        node.port.postMessage({ t: "sfxdata", i, d, sr: b.sampleRate }, [d.buffer]);
      } catch (e) { /* utan ljudet: knapparna är tysta */ }
    });
  }

  async function midi() {
    if (!navigator.requestMIDIAccess) return;
    try {
      const acc = await navigator.requestMIDIAccess();
      const hook = () => {
        const names = [];
        acc.inputs.forEach((inp) => { names.push(inp.name); inp.onmidimessage = (e) => { const d = e.data; if (d.length >= 2 && d[0] < 0xf0) post({ t: "midi", s: d[0], a: d[1], b: d.length > 2 ? d[2] : 0 }); }; });
        on.info && on.info({ midi: names });
      };
      acc.onstatechange = hook; hook();
    } catch (e) { /* ingen MIDI-behörighet */ }
  }

  function send(m) {
    switch (m.t) {
      case "hello": break;
      case "param": st.params[m.id] = m.v; post({ t: "param", i: idx[m.id], v: m.v }); save(); break;
      case "gesture": break;
      case "preset": {
        const v = presetValues(m.i);
        st.params = v; st.preset = m.i; save();
        postAllParams();
        on.params && on.params(v); on.preset && on.preset(m.i);
        break;
      }
      case "note": post({ t: "note", n: m.n, v: m.v }); break;
      case "off": post({ t: "off", n: m.n }); break;
      case "pattern": st.pattern = { rate: m.rate, low: m.low, rows: m.rows, notes: m.notes, plant: m.plant, edited: m.edited }; post({ t: "pattern", rate: m.rate, notes: m.notes }); save(); break;
      case "play": post({ t: "play", on: m.on }); break;
      case "tempo": st.tempo = m.bpm; post({ t: "tempo", bpm: m.bpm }); save(); break;
      case "glid": post({ t: "glid", m: m.m, v: m.v }); break;
      case "pad": post({ t: "pad", n: m.n || [], v: m.v || 100 }); break;
      case "follow": st.follow = !!m.on; post({ t: "follow", on: !!m.on }); save(); break;
      case "band": post({ t: "band", k: m.k | 0, tyst: !!m.tyst }); break;
      case "sfx": post({ t: "sfx", i: m.i | 0, g: m.g == null ? 1 : m.g, r: m.r || 1 }); break;
      case "ui": st.ui = m.s; save(); break;
      case "user": try { localStorage.setItem(SPAR + "-egna", JSON.stringify(m.list || [])); } catch (e) { /* privat läge */ } break;
      case "panic": post({ t: "alloff" }); break;
    }
  }

  async function start() {
    try { st = JSON.parse(localStorage.getItem(SPAR) || "null"); } catch (e) { st = null; }
    await load();
    const fresh = !st || !st.params;
    if (fresh) st = { params: {}, preset: 65, tempo: 120, pattern: null, ui: null };
    if (fresh) st.params = presetValues(st.preset);
    post({ t: "tempo", bpm: st.tempo || 120 });
    if (st.pattern) post({ t: "pattern", rate: st.pattern.rate, notes: st.pattern.notes });
    post({ t: "follow", on: !!st.follow });
    on.state && on.state({ t: "state", params: vals(), preset: st.preset, pattern: st.pattern, tempo: st.tempo || 120, hostTempo: false, playing: false, ui: st.ui, standalone: false, web: true, user: egna(), follow: !!st.follow });
  }

  return { mode: "web", on, send, start, startAudio, needsGesture: true, get running() { return !!(ctx && ctx.state === "running"); } };
})();
