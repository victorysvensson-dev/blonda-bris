// BLONDA effekt – det gemensamma gränssnittet för effekter (ljud in, ljud ut).
//
// Effekterna är samma GenExpr som i BLONDAs Max for Live-effekter (generator/effekter/, hämtade med
// generator/hamta_effekt.py) och räknar likadant som pluggarna. In3 i pluggarna är Lives taktfas
// (plugphasor~); här kommer den från effektens egen klocka i takt med setTempo(), som om transporten går.
//
//   auto fx = blonda::createEffect("frys");
//   fx->prepare(48000.0);
//   fx->setTempo(120.0);
//   fx->setParam(fx->findParam("frys"), 1.0);
//   fx->process(left, right, 512);   // i ljudtråden, på plats
#pragma once
#include <cstring>

#include "blonda/motor.h"

namespace blonda {

class Effect {
public:
    virtual ~Effect() = default;
    virtual const char* name() const = 0;            // "BLONDA FRYS"
    virtual void prepare(double sampleRate) = 0;      // nollställer också
    virtual void reset() = 0;                         // tystnad: allt tillstånd (fördröjningar, korn …) nollat
    virtual void setTempo(double bpm) = 0;            // taktklockan (in3)
    virtual void process(float* left, float* right, int frames) = 0;   // på plats, ingen allokering

    virtual int numParams() const = 0;
    virtual const ParamInfo& paramInfo(int index) const = 0;
    virtual void setParam(int index, double value) = 0;   // i parameterns egna enheter
    virtual double getParam(int index) const = 0;
    int findParam(const char* id) const {
        for (int i = 0; i < numParams(); ++i)
            if (std::strcmp(paramInfo(i).id, id) == 0) return i;
        return -1;
    }
    void setParamNormalized(int index, double v01) { const ParamInfo& p = paramInfo(index); setParam(index, p.min + (p.max - p.min) * v01); }
    double getParamNormalized(int index) const { const ParamInfo& p = paramInfo(index); return p.max > p.min ? (getParam(index) - p.min) / (p.max - p.min) : 0.0; }
};

// En genererad GenExpr-effekt (Dsp) med sin parametertabell.
template <class Dsp>
class GenEffect final : public Effect {
public:
    GenEffect(const char* name, const ParamInfo* params, int numParams) : name_(name), params_(params), n_(numParams) {
        for (int i = 0; i < n_ && i < kMax; ++i) { ptr_[i] = dsp_.param(params_[i].id); val_[i] = params_[i].def; if (ptr_[i]) *ptr_[i] = val_[i]; }
    }
    const char* name() const override { return name_; }
    void prepare(double sr) override { sr_ = sr; dsp_.samplerate = sr; reset(); }
    void reset() override { dsp_.reset(); phase_ = 0.0; }
    void setTempo(double bpm) override { bpm_ = bpm < 20.0 ? 20.0 : (bpm > 400.0 ? 400.0 : bpm); }
    int numParams() const override { return n_; }
    const ParamInfo& paramInfo(int i) const override { return params_[i]; }
    double getParam(int i) const override { return val_[i]; }
    void setParam(int i, double v) override {
        if (i < 0 || i >= n_) return;
        const ParamInfo& p = params_[i];
        if (p.max > p.min) v = v < p.min ? p.min : (v > p.max ? p.max : v);
        if (p.integer) v = (double)(long)(v + (v < 0 ? -0.5 : 0.5));
        val_[i] = v; if (ptr_[i]) *ptr_[i] = v;
    }
    void process(float* L, float* R, int n) override {
        double in[3], out[Dsp::kNumOutputs > 2 ? Dsp::kNumOutputs : 2];
        const double inc = bpm_ / 60.0 / sr_;
        for (int s = 0; s < n; ++s) {
            in[0] = L[s]; in[1] = R[s]; in[2] = phase_;
            dsp_.perform(in, out);
            L[s] = (float)out[0]; R[s] = (float)out[1];
            phase_ += inc; if (phase_ >= 1.0) phase_ -= 1.0;
        }
    }
    Dsp& dsp() { return dsp_; }

private:
    static constexpr int kMax = 64;
    Dsp dsp_;
    const char* name_; const ParamInfo* params_; int n_;
    double* ptr_[kMax]{}; double val_[kMax]{};
    double sr_ = 48000.0, bpm_ = 120.0, phase_ = 0.0;
};

}  // namespace blonda
