// Jämför webbversionens kärna (bris.wasm) med C++-kärnan sampel för sampel.  node tester/wasm_test.mjs dist/web/bris.wasm /tmp/dump
import fs from "fs";
import { execFileSync } from "child_process";
const [wasmPath, dumpBin] = process.argv.slice(2);
const noop = () => 0;
const { instance } = await WebAssembly.instantiate(fs.readFileSync(wasmPath), {
  wasi_snapshot_preview1: { fd_close: noop, fd_seek: noop, fd_write: noop },
});
const e = instance.exports;
e._initialize();
let fel = 0;
for (const p of [0, 1, 5, 20, 36, 58, 83, 89]) {
  e.bris_init(48000);
  e.bris_all_off();
  e.bris_load_preset(p);
  e.bris_note_on(60, 100); e.bris_note_on(64, 90); e.bris_note_on(67, 80);
  const ref = new Float32Array(execFileSync(dumpBin, [String(p)], { maxBuffer: 1 << 26 }).buffer.slice(0));
  let md = 0, k = 0;
  for (let b = 0; b < 750; b++) {
    if (b === 500) e.bris_all_off();
    e.bris_process(128);
    const L = new Float32Array(e.memory.buffer, e.bris_buf_l(), 128), R = new Float32Array(e.memory.buffer, e.bris_buf_r(), 128);
    for (let s = 0; s < 128; s++) { md = Math.max(md, Math.abs(L[s] - ref[k++]), Math.abs(R[s] - ref[k++])); }
  }
  console.log(`ljud ${p}: största skillnad wasm mot C++ ${md.toExponential(2)}`);
  if (!(md < 1e-4)) fel++;
}
console.log(fel ? `${fel} FEL` : "wasm = C++: OK");
process.exit(fel ? 1 : 0);
