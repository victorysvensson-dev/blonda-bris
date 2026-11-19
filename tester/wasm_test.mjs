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
// parametrarnas ordning = kärnans (ui/data.js)
const dataJs = fs.readFileSync(new URL("../ui/data.js", import.meta.url), "utf8");
const PARAMS = JSON.parse(dataJs.slice(dataJs.indexOf("{"), dataJs.lastIndexOf("}") + 1)).params.map((p) => p.id);
const sp = (id, v) => e.bris_set_param(PARAMS.indexOf(id), v);
// BRIS ljud, och de hemliga patcharnas motorer (ORGEL, SLÖJA, STAV: index efter BRIS 90, efter BRIS ljud 0 som i dump)
for (const p of [0, 1, 5, 20, 36, 58, 83, 89, 91, 98, 105, 112, 127]) {
  e.bris_init(48000);
  e.bris_all_off();
  if (p >= 90) e.bris_load_preset(0);
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
// MOOD (delay, mikrolooper) och ARP som spelar en pad, med en ton ovanpå
for (const p of [4, 53]) {
  e.bris_init(48000); e.bris_all_off(); e.bris_load_preset(p);
  e.bris_set_tempo(120); sp("mowet", 1); sp("mowmode", 1); sp("arp", 1); sp("arpm", 2); sp("arpo", 2);
  e.bris_pad_note(57, 100); e.bris_pad_note(60, 90); e.bris_pad_note(64, 80);
  const ref = new Float32Array(execFileSync(dumpBin, [String(p), "extra"], { maxBuffer: 1 << 26 }).buffer.slice(0));
  let md = 0, k = 0, pk = 0;
  for (let b = 0; b < 750; b++) {
    if (b === 500) e.bris_all_off();
    if (b === 300) sp("moloop", 1);
    if (b === 200) e.bris_note_on(72, 100);
    e.bris_process(128);
    const L = new Float32Array(e.memory.buffer, e.bris_buf_l(), 128), R = new Float32Array(e.memory.buffer, e.bris_buf_r(), 128);
    for (let s = 0; s < 128; s++) { md = Math.max(md, Math.abs(L[s] - ref[k++]), Math.abs(R[s] - ref[k++])); pk = Math.max(pk, Math.abs(L[s])); }
  }
  console.log(`ljud ${p} med MOOD och ARP: största skillnad wasm mot C++ ${md.toExponential(2)} (topp ${pk.toFixed(2)})`);
  if (!(md < 1e-4) || !(pk > 0.01)) fel++;
}
// bandet (SLITEN, kassett) på: wow, flutter, brus och avbrott räknas likadant
{
  const p = 79;
  e.bris_init(48000); e.bris_all_off(); e.bris_load_preset(p);
  sp("mowet", 0); sp("moloop", 0); sp("arp", 0);   // kärnan återanvänds: stäng av det förra fallets MOOD och arp
  sp("tape", 1); sp("tamedia", 0); sp("tawow", 0.8); sp("tarec", 0.8); e.bris_band(2, 0);
  e.bris_note_on(60, 100); e.bris_note_on(64, 90); e.bris_note_on(67, 80);
  const ref = new Float32Array(execFileSync(dumpBin, [String(p), "band"], { maxBuffer: 1 << 26 }).buffer.slice(0));
  let md = 0, k = 0, pk = 0;
  for (let b = 0; b < 750; b++) {
    if (b === 500) e.bris_all_off();
    if (b === 250) e.bris_band(3, 0);   // bandspelaren: spela in, spola tillbaka, spela upp
    if (b === 330) e.bris_band(1, 0);
    e.bris_process(128);
    const L = new Float32Array(e.memory.buffer, e.bris_buf_l(), 128), R = new Float32Array(e.memory.buffer, e.bris_buf_r(), 128);
    for (let s = 0; s < 128; s++) { md = Math.max(md, Math.abs(L[s] - ref[k++]), Math.abs(R[s] - ref[k++])); pk = Math.max(pk, Math.abs(L[s])); }
  }
  const mt = new Float32Array(e.memory.buffer, e.bris_meters(), 27);
  console.log(`bandspelaren i wasm: läge ${mt[24]}, ${mt[23].toFixed(2)} s, fart ${mt[21].toFixed(2)}`);
  if (!(mt[24] === 1 && mt[21] > 0.99)) fel++;
  e.bris_band(0, 1); sp("tape", 0);
  console.log(`ljud ${p} med bandet: största skillnad wasm mot C++ ${md.toExponential(2)} (topp ${pk.toFixed(2)})`);
  if (!(md < 1e-4) || !(pk > 0.01)) fel++;
}
console.log(fel ? `${fel} FEL` : "wasm = C++: OK");
process.exit(fel ? 1 : 0);
