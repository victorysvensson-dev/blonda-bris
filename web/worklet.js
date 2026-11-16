// BLONDA BRIS – AudioWorklet för webben. Kör ljudkärnan (bris.wasm) i ljudtråden.
"use strict";

class BrisProcessor extends AudioWorkletProcessor {
  constructor(opt) {
    super();
    const noop = () => 0;
    const mod = new WebAssembly.Module(opt.processorOptions.wasm);
    this.inst = new WebAssembly.Instance(mod, { wasi_snapshot_preview1: { fd_close: noop, fd_seek: noop, fd_write: noop } });
    const e = (this.e = this.inst.exports);
    e._initialize();
    e.bris_init(opt.processorOptions.sr || sampleRate);
    this.n = 0;
    this.scopeLen = e.bris_scope_len();
    this.port.onmessage = (ev) => this.msg(ev.data);
  }

  msg(m) {
    const e = this.e;
    switch (m.t) {
      case "param": e.bris_set_param(m.i, m.v); break;
      case "note": e.bris_note_on(m.n, m.v); break;
      case "off": e.bris_note_off(m.n); break;
      case "midi": e.bris_midi(m.s, m.a, m.b); break;
      case "alloff": e.bris_all_off(); break;
      case "tempo": e.bris_set_tempo(m.bpm); break;
      case "play": e.bris_set_playing(m.on ? 1 : 0); break;
      case "glid": e.bris_set_glid(m.m | 0, +m.v || 0); break;
      case "pattern":
        e.bris_pattern_begin(m.rate);
        for (const n of m.notes) e.bris_pattern_add(n[0], n[1], n[2], n[3]);
        e.bris_pattern_commit();
        break;
    }
  }

  process(inputs, outputs) {
    const out = outputs[0];
    const L = out[0], R = out[1] || out[0];
    const e = this.e;
    const n = L.length;
    e.bris_process(n);
    const mem = e.memory.buffer;
    L.set(new Float32Array(mem, e.bris_buf_l(), n));
    if (out[1]) R.set(new Float32Array(mem, e.bris_buf_r(), n));
    if (++this.n >= 6) {
      this.n = 0;
      const m = new Float32Array(mem, e.bris_meters(), 8);
      const sc = new Float32Array(mem, e.bris_scope(), this.scopeLen);
      const w = m[7] | 0;
      const scope = new Float32Array(this.scopeLen);
      scope.set(sc.subarray(w)); scope.set(sc.subarray(0, w), this.scopeLen - w);   // äldst först
      this.port.postMessage({ t: "m", env: m[0], lfo: m[1], pk: Math.max(m[2], m[3]), mask: m[4] | 0, step: m[5] | 0, nc: m[6] | 0, scope });
    }
    return true;
  }
}
registerProcessor("bris", BrisProcessor);
