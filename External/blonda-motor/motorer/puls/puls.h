// BLONDA PULS – trummaskin med åtta syntade trumljud, som fristående C++-motor.
//
// Ljudet kommer från puls_gen.h (genererat ur generator/puls.py). Här finns bara kopplingen
// tonnummer -> trumljud och det gemensamma Motor-gränssnittet. Inget här påverkar ljudet.
//
// Toner (tonnummer % 12, så alla oktaver fungerar; C1 = 36 följer General MIDI för de vanligaste):
//   C  BD   C# RS   D  SD   D# CP   E  SD   F  TOM (låg)   F# CH   G  TOM
//   G# CB   A  TOM  A# OH   B  TOM (hög)
#pragma once
#include <algorithm>
#include <cmath>
#include <cstdio>

#include "blonda/motor.h"
#include "puls_gen.h"
#include "puls_ljud.h"

namespace blonda::puls {

enum Voice { BD = 0, SD, RS, CP, CH, OH, TOM, CB, kVoices };

// tonnummer % 12 -> röst, och halvtoner för pukorna
inline constexpr int kNoteVoice[12] = {BD, RS, SD, CP, SD, TOM, CH, TOM, CB, TOM, OH, TOM};
inline constexpr int kTomSemi[12] = {0, 0, 0, 0, 0, -5, 0, -2, 0, 2, 0, 5};
inline constexpr const char* kVoiceNames[kVoices] = {"BD", "SD", "RS", "CP", "CH", "OH", "TOM", "CB"};

class Puls : public Motor {
public:
    Puls() {
        for (int i = 0; i < kNumParams; ++i) {
            ptr_[i] = dsp_.param(kParams[i].id);
            val_[i] = kParams[i].def;
        }
        char nm[8];
        for (int i = 0; i < kVoices; ++i) {
            std::snprintf(nm, sizeof nm, "g%d", i); g_[i] = dsp_.param(nm);
            std::snprintf(nm, sizeof nm, "t%d", i); t_[i] = dsp_.param(nm);
        }
        tomSemi_ = dsp_.param("n6");
    }

    const char* name() const override { return "BLONDA PULS"; }

    void prepare(double sampleRate) override { dsp_.samplerate = sampleRate; reset(); }

    void reset() override {
        dsp_.reset();
        for (int i = 0; i < kVoices; ++i) { *g_[i] = 0; *t_[i] = 0; }
        *tomSemi_ = 0; tc_ = 0;
    }

    // ---------------------------------------------------------------- spela
    // slå an ett trumljud direkt (röst 0..7), styrka 0..1
    void hit(int voice, double vel) {
        if (voice < 0 || voice >= kVoices) return;
        *g_[voice] = std::max(0.05, std::min(1.0, vel));
        *t_[voice] = (double)(++tc_);
    }
    void noteOn(int n, int vel) override {
        if (vel <= 0) return;
        const int k = ((n % 12) + 12) % 12;
        const int v = kNoteVoice[k];
        if (v == TOM) *tomSemi_ = kTomSemi[k];
        hit(v, vel / 127.0);
    }
    void noteOff(int) override {}       // trumljuden klingar ut av sig själva
    void allNotesOff() override {}
    void pitchBend(double) override {}
    void modWheel(double) override {}
    void aftertouch(double) override {}
    void sustain(bool) override {}

    // ---------------------------------------------------------------- parametrar
    int numParams() const override { return kNumParams; }
    const ParamInfo& paramInfo(int i) const override { return kParams[i]; }
    double getParam(int i) const override { return val_[i]; }
    void setParam(int i, double x) override {
        if (i < 0 || i >= kNumParams) return;
        const ParamInfo& p = kParams[i];
        x = std::min(p.max, std::max(p.min, x));
        if (p.integer) x = std::round(x);
        val_[i] = x;
        *ptr_[i] = x;
    }

    // ---------------------------------------------------------------- fabriksljud
    int numPresets() const override { return kNumPresets; }
    const char* presetName(int i) const override { return (i >= 0 && i < kNumPresets) ? kPresets[i].name : ""; }
    void loadPreset(int index) override {
        if (index < 0 || index >= kNumPresets) return;
        const PresetInfo& pr = kPresets[index];
        double nv[kNumParams];
        for (int i = 0; i < kNumParams; ++i) nv[i] = kParams[i].keepOnPreset ? val_[i] : kParams[i].def;
        for (int j = 0; j < pr.count; ++j) {
            const PresetValue& v = kPresetValues[pr.first + j];
            if (!kParams[v.param].keepOnPreset) nv[v.param] = v.value;
        }
        for (int i = 0; i < kNumParams; ++i) setParam(i, nv[i]);
    }

    // ---------------------------------------------------------------- ljud
    void process(float* left, float* right, int frames) override {
        double o[PulsDsp::kNumOutputs] = {0, 0, 0, 0};
        for (int s = 0; s < frames; ++s) {
            dsp_.perform(o);
            left[s] = (float)o[0];
            right[s] = (float)o[1];
        }
        voiceMask_ = (int)o[2]; peak_ = o[3];
    }

    int voiceMask() const { return voiceMask_; }   // bit i = trumljud i klingar
    double peak() const { return peak_; }
    PulsDsp& dsp() { return dsp_; }

private:
    PulsDsp dsp_;
    double* ptr_[kNumParams];
    double val_[kNumParams];
    double *g_[kVoices], *t_[kVoices], *tomSemi_;
    long tc_ = 0;
    double peak_ = 0;
    int voiceMask_ = 0;
};

}  // namespace blonda::puls
