// BLONDA BRIS – röstfördelningen och Motor-gränssnittet, gemensamt för BRIS och BRIS MPE.
//
// Röstfördelningen är en port av Max-pluggens bris_voices.js (paritetstestet jämför). Mallen tar den genererade
// DSP-klassen och en tabell med parametrar och fabriksljud: BRIS (bris.h) och BRIS MPE (brismpe/brismpe.h).
// Röstlägen som originalet: 0 Poly Stereo, 1 Poly, 2 Mono, 3 Unison.
#pragma once
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <vector>

#include "blonda/motor.h"

namespace blonda::bris {

template <class Dsp, class T>
class BrisMotor : public Motor {
public:
    static constexpr int kVoices = 6;

    BrisMotor() {
        for (int i = 0; i < T::kNumParams; ++i) {
            ptr_[i] = dsp_.param(T::params()[i].id);
            val_[i] = T::params()[i].def;
        }
        char nm[8];
        for (int i = 0; i < kVoices; ++i) {
            std::snprintf(nm, sizeof nm, "n%d", i); n_[i] = dsp_.param(nm);
            std::snprintf(nm, sizeof nm, "g%d", i); g_[i] = dsp_.param(nm);
            std::snprintf(nm, sizeof nm, "t%d", i); t_[i] = dsp_.param(nm);
        }
        bend_ = dsp_.param("bend"); mw_ = dsp_.param("mw"); at_ = dsp_.param("at");
        stack_.reserve(128);
    }

    void prepare(double sampleRate) override { dsp_.samplerate = sampleRate; reset(); }

    void reset() override {
        dsp_.reset();
        for (int i = 0; i < kVoices; ++i) { vo_[i] = Voice(); *n_[i] = 60; *g_[i] = 0; *t_[i] = 0; }
        stack_.clear(); monoOn_ = false; sustain_ = false; clock_ = 0; tc_ = 0;
        *bend_ = 0; *mw_ = 0; *at_ = 0;
    }

    // ---------------------------------------------------------------- spela
    void noteOn(int n, int vel) override {
        double v = std::max(0.05, vel / 127.0);
        if (mode_ >= 2) {
            removeFromStack(n);
            stack_.push_back(n);
            bool retrig = !monoOn_;
            monoOn_ = true; monoVel_ = v;
            playStack(retrig);
            return;
        }
        int k = -1;
        for (int i = 0; i < kVoices; ++i) if (vo_[i].note == n && (vo_[i].on || vo_[i].sus)) { k = i; break; }
        if (k < 0) for (int i = 0; i < kVoices; ++i)
            if (!vo_[i].on && !vo_[i].sus && (k < 0 || vo_[i].age < vo_[k].age)) k = i;
        if (k < 0) { k = 0; for (int i = 1; i < kVoices; ++i) if (vo_[i].age < vo_[k].age) k = i; }
        trig(k, n, v, true);
    }

    void noteOff(int n) override {
        if (mode_ >= 2) {
            removeFromStack(n);
            if (!stack_.empty()) { playStack(false); return; }
            monoOn_ = false;
            for (int j = 0; j < kVoices; ++j) if (vo_[j].on) { vo_[j].on = false; if (sustain_) vo_[j].sus = true; else *g_[j] = 0; }
            return;
        }
        for (int i = 0; i < kVoices; ++i) {
            Voice& v = vo_[i];
            if (v.on && v.note == n) { v.on = false; v.age = ++clock_; if (sustain_) v.sus = true; else *g_[i] = 0; }
        }
    }

    void allNotesOff() override {
        stack_.clear(); monoOn_ = false;
        for (int i = 0; i < kVoices; ++i) { vo_[i].on = false; vo_[i].sus = false; *g_[i] = 0; }
    }
    void pitchBend(double v) override { *bend_ = v; }
    void modWheel(double v) override { *mw_ = v; }
    void aftertouch(double v) override { *at_ = v; }
    void sustain(bool down) override {
        sustain_ = down;
        if (!down) for (int i = 0; i < kVoices; ++i) if (vo_[i].sus) { vo_[i].sus = false; *g_[i] = 0; }
    }

    // ---------------------------------------------------------------- parametrar
    int numParams() const override { return T::kNumParams; }
    const ParamInfo& paramInfo(int i) const override { return T::params()[i]; }
    double getParam(int i) const override { return val_[i]; }
    void setParam(int i, double x) override {
        if (i < 0 || i >= T::kNumParams) return;
        const ParamInfo& p = T::params()[i];
        x = std::min(p.max, std::max(p.min, x));
        if (p.integer) x = std::round(x);
        val_[i] = x;
        *ptr_[i] = x;
        if (i == T::kLage) setMode((int)x);
        else if (i == T::kUniint) { uni_ = (int)x; if (mode_ == 3 && monoOn_) playStack(false); }
    }

    // ---------------------------------------------------------------- fabriksljud
    int numPresets() const override { return T::kNumPresets; }
    const char* presetName(int i) const override { return (i >= 0 && i < T::kNumPresets) ? T::presets()[i].name : ""; }
    // Som Max-pluggen: allt som ljudet inte nämner får standardvärdet, utom parametrar som behålls (volym, böjomfång).
    void loadPreset(int index) override {
        if (index < 0 || index >= T::kNumPresets) return;
        const PresetInfo& pr = T::presets()[index];
        double nv[T::kNumParams];
        for (int i = 0; i < T::kNumParams; ++i) nv[i] = T::params()[i].keepOnPreset ? val_[i] : T::params()[i].def;
        for (int j = 0; j < pr.count; ++j) {
            const PresetValue& v = T::presetValues()[pr.first + j];
            if (!T::params()[v.param].keepOnPreset) nv[v.param] = v.value;
        }
        for (int i = 0; i < T::kNumParams; ++i) setParam(i, nv[i]);
    }

    // ---------------------------------------------------------------- ljud
    void process(float* left, float* right, int frames) override {
        double o[Dsp::kNumOutputs];
        for (int s = 0; s < frames; ++s) {
            dsp_.perform(o);
            left[s] = (float)o[0];
            right[s] = (float)o[1];
        }
        envelope_ = o[2]; voiceMask_ = (int)o[3]; peak_ = o[4]; lfo_ = o[5];
    }

    // mätare för gränssnitt (uppdateras efter varje process)
    double envelope() const { return envelope_; }   // högsta volymhölje 0..1
    int voiceMask() const { return voiceMask_; }    // bit i = röst i låter
    double peak() const { return peak_; }
    double lfo() const { return lfo_; }             // -1..1

    Dsp& dsp() { return dsp_; }  // direktåtkomst, t.ex. för tester

protected:
    // ch = MIDI-kanalen tonen kom på (BRIS MPE ger varje kanal eget uttryck; BRIS använder den inte)
    struct Voice { int note = -1; bool on = false, sus = false; long age = 0; int ch = 0; };

    void setMode(int m) { m = std::max(0, std::min(3, m)); if (m != mode_) { allNotesOff(); mode_ = m; } }
    void trig(int i, int n, double vel, bool retrig) {
        vo_[i].note = n; vo_[i].on = true; vo_[i].sus = false; vo_[i].age = ++clock_; vo_[i].ch = curCh_;
        *n_[i] = n;
        if (retrig) { *g_[i] = vel; *t_[i] = (double)(++tc_); }
    }
    // mono och unison: senaste tonen gäller, legato utan omstart
    void playStack(bool retrig) {
        if (stack_.empty()) return;
        int n = stack_.back();
        if (mode_ == 2) { trig(0, n, monoVel_, retrig); return; }
        for (int i = 0; i < kVoices; ++i) trig(i, n + (i >= 3 ? uni_ : 0), monoVel_, retrig);
    }
    void removeFromStack(int n) { stack_.erase(std::remove(stack_.begin(), stack_.end(), n), stack_.end()); }

    Dsp dsp_;
    double* ptr_[T::kNumParams];
    double val_[T::kNumParams];
    int curCh_ = 0;   // kanalen för tonen som spelas nu (sätts av BRIS MPE före noteOn)
    double *n_[kVoices], *g_[kVoices], *t_[kVoices], *bend_, *mw_, *at_;
    Voice vo_[kVoices];
    std::vector<int> stack_;
    int mode_ = 0, uni_ = 0;
    bool monoOn_ = false, sustain_ = false;
    double monoVel_ = 0.8;
    long clock_ = 0, tc_ = 0;
    double envelope_ = 0, peak_ = 0, lfo_ = 0;
    int voiceMask_ = 0;
};

}  // namespace blonda::bris
