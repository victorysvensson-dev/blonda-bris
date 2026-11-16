// BLONDA BRIS för webben: ljudkärnan som WebAssembly. Körs i en AudioWorklet (web/worklet.js).
// Byggs med wasi-sdk av web/bygg.sh.
#include <new>
#include "bris_core.h"

using blonda::app::Core;
using blonda::app::Pattern;

#define EXPORT(n) extern "C" __attribute__((export_name(#n)))

namespace {
Core* core = nullptr;
float bufL[128], bufR[128];
Pattern pend;
// mätare som worklet läser direkt ur minnet: env, lfo, peakL, peakR, voiceMask, step, noteCount, scopeWrite
float meters[9];
}

EXPORT(bris_init) void bris_init(double sr) {
    if (!core) core = new Core();
    core->prepare(sr);
}
EXPORT(bris_buf_l) float* bris_buf_l() { return bufL; }
EXPORT(bris_buf_r) float* bris_buf_r() { return bufR; }
EXPORT(bris_process) void bris_process(int n) {
    if (n > 128) n = 128;
    core->process(bufL, bufR, n);
    const auto& m = core->meters();
    meters[0] = m.env; meters[1] = m.lfo; meters[2] = m.peakL; meters[3] = m.peakR;
    meters[4] = (float)m.voiceMask; meters[5] = (float)m.step; meters[6] = (float)m.noteCount; meters[7] = (float)core->scopeWrite(); meters[8] = m.glid;
}
EXPORT(bris_meters) float* bris_meters() { return meters; }
EXPORT(bris_scope) const float* bris_scope() { return core->meters().scope; }
EXPORT(bris_scope_len) int bris_scope_len() { return blonda::app::kScopeLen; }

EXPORT(bris_note_on) void bris_note_on(int n, int v) { core->noteOn(n, v); }
EXPORT(bris_note_off) void bris_note_off(int n) { core->noteOff(n); }
EXPORT(bris_midi) void bris_midi(int s, int d1, int d2) { core->midi((uint8_t)s, (uint8_t)d1, (uint8_t)d2); }
EXPORT(bris_all_off) void bris_all_off() { core->allNotesOff(); }

EXPORT(bris_num_params) int bris_num_params() { return Core::numParams(); }
EXPORT(bris_set_param) void bris_set_param(int i, double v) { core->setParam(i, v); }
EXPORT(bris_get_param) double bris_get_param(int i) { return core->getParam(i); }
EXPORT(bris_load_preset) void bris_load_preset(int i) { core->loadPreset(i); }

EXPORT(bris_set_tempo) void bris_set_tempo(double bpm) { core->setTempo(bpm); }
EXPORT(bris_set_glid) void bris_set_glid(int mode, double amount) { core->setGlid(mode, amount); }
EXPORT(bris_set_playing) void bris_set_playing(int on) { core->setPlaying(on != 0); }
EXPORT(bris_pattern_begin) void bris_pattern_begin(int rate) { pend = Pattern{}; pend.rate = rate; }
EXPORT(bris_pattern_add) void bris_pattern_add(int step, int len, int note, int vel) {
    if (pend.count >= blonda::app::kMaxSeqNotes) return;
    pend.notes[pend.count++] = {(uint8_t)step, (uint8_t)len, (uint8_t)note, (uint8_t)vel};
}
EXPORT(bris_pattern_commit) void bris_pattern_commit() { core->setPattern(pend); }
