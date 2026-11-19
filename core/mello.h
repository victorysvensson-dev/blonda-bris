// BLONDA BRIS – MELLO: motorn i den hemliga patchen MELLOTRON. Ett bandinstrument: varje tangent spelar upp ett band
// (en inspelad ton i C) i en fart som ger tonhöjden, från början tills bandet tar slut, precis som i en mellotron
// (där varje tangent har en egen bit band som rullar när man trycker ned den och spolas tillbaka när man släpper).
//
// Alla band drivs av samma motor och capstan: svaj (wow) och fladder (flutter) är gemensamma för alla toner. Slitage
// ger brus från banden som spelar, mättnad och mindre diskant. Efter rösterna kommer BRIS ensemble och eko (samma
// räkning som FX_UT i blonda-motors generator/bris.py) och volymen, så att de delade rattarna låter likadant.
//
// Banden ägs av skalet (pluggen läser dem ur BinaryData, webben avkodar dem i webbläsaren) och motorn får bara pekare
// (16 bitar stereo). Parametrar och fabriksljud: core/mello_ljud.h (genererad av tools/mellotron.py).
// Ingen allokering, deterministisk (bruset kommer från en egen slumpgenerator).
#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>

#include "blonda/motor.h"
#include "mello_ljud.h"

namespace blonda::app::mello {

class Mello : public Motor {
public:
    static constexpr int kVoices = 12;

    Mello() { for (int i = 0; i < kNumParams; ++i) p_[i] = kParams[i].def; }

    const char* name() const override { return "MELLO"; }

    // bandet b: ramar stereo (16 bitar, LRLR...) i samplingsfrekvensen sr. Pekaren måste leva lika länge som motorn
    // (eller tills den byts). nullptr = bandet saknas (tangenterna är tysta).
    void setBand(int b, const int16_t* data, int ramar, double sr) {
        if (b < 0 || b >= kNumBand) return;
        for (auto& v : v_) if (v.band == b) v.aktiv = false;
        band_[b] = {data, data ? std::max(0, ramar) : 0, sr > 0 ? sr : kBandSr};
    }
    bool harBand(int b) const { return b >= 0 && b < kNumBand && band_[b].data && band_[b].ramar > 4; }

    void prepare(double sr) override {
        sr_ = sr > 0 ? sr : 48000.0;
        uppdatera();
        reset();
    }
    void reset() override {
        for (auto& v : v_) v = Rost{};
        sustain_ = false; bend_ = 0; hjul_ = 0; wowFas_ = 0; wowFas2_ = 0; flFas_ = 0; vibFas_ = 0; slump_ = 22222u;
        tonL_ = tonR_ = 0; slitL_ = slitR_ = 0; hogL_ = hogR_ = 0; brusLp_ = brusHp_ = 0; aktivitet_ = 0;
        for (auto& b : chb_) for (float& x : b) x = 0;
        for (auto& b : dlb_) for (float& x : b) x = 0;
        ci_ = 0; cp_[0] = cp_[1] = cp_[2] = cp_[3] = 0; sDt_ = 0.001 + p_[P_DTIME] * p_[P_DTIME] * 0.999; dw_ = 0;
        dlpL_ = dlpR_ = 0; dcxL_ = dcyL_ = dcxR_ = dcyR_ = 0; env_ = 0;
    }

    void noteOn(int note, int vel) override {
        const int b = std::max(0, std::min(kNumBand - 1, (int)std::lround(p_[P_BAND])));
        if (!harBand(b)) return;
        for (auto& v : v_) if (v.aktiv && v.not_ == note && !v.doende) { v.doende = true; v.held = false; }   // samma tangent: bandet börjar om
        Rost* r = nullptr;
        for (auto& v : v_) if (!v.aktiv) { r = &v; break; }
        if (!r) {   // alla spelar: ta den äldsta (helst en som redan släppts)
            for (auto& v : v_) if (!r || (v.held < r->held) || (v.held == r->held && v.alder > r->alder)) r = &v;
        }
        const double vn = std::max(1, std::min(127, vel)) / 127.0;
        *r = Rost{};
        r->aktiv = true; r->held = true; r->not_ = note; r->band = b; r->pos = 0;
        r->steg = std::pow(2.0, (note - kBand[b].root) / 12.0) * band_[b].sr / sr_;
        r->vg = (1.0 - p_[P_VELA]) + p_[P_VELA] * std::pow(vn, 1.5);
        r->alder = ++klocka_;
    }
    void noteOff(int note) override {
        for (auto& v : v_) if (v.aktiv && v.not_ == note && v.held) { v.held = false; v.halls = sustain_; }
    }
    void allNotesOff() override { for (auto& v : v_) { v.held = false; v.halls = false; } sustain_ = false; }
    void pitchBend(double v) override { bend_ = std::max(-1.0, std::min(1.0, v)); }
    void modWheel(double v) override { hjul_ = std::max(0.0, std::min(1.0, v)); }
    void aftertouch(double) override {}
    void sustain(bool down) override {
        sustain_ = down;
        if (!down) for (auto& v : v_) v.halls = false;
    }

    int numParams() const override { return kNumParams; }
    const ParamInfo& paramInfo(int i) const override { return kParams[std::max(0, std::min(kNumParams - 1, i))]; }
    void setParam(int i, double v) override {
        if (i < 0 || i >= kNumParams) return;
        const ParamInfo& p = kParams[i];
        v = std::max(p.min, std::min(p.max, v));
        if (p.integer) v = std::round(v);
        p_[i] = v;
        uppdatera();
    }
    double getParam(int i) const override { return i >= 0 && i < kNumParams ? p_[i] : 0.0; }

    int numPresets() const override { return kNumPresets; }
    const char* presetName(int i) const override { return kPresets[std::max(0, std::min(kNumPresets - 1, i))].name; }
    void loadPreset(int i) override {
        if (i < 0 || i >= kNumPresets) return;
        for (int j = 0; j < kNumParams; ++j) if (!kParams[j].keepOnPreset) p_[j] = kParams[j].def;
        const PresetInfo& pr = kPresets[i];
        for (int k = 0; k < pr.count; ++k) { const PresetValue& pv = kPresetValues[pr.first + k]; if (!kParams[pv.param].keepOnPreset) p_[pv.param] = pv.value; }
        uppdatera();
    }

    // mätare: starkaste tonens kurva, svajet (-1..1) och vilka röster som spelar
    double envelope() const { return env_; }
    double lfo() const { return std::sin(6.283185307179586 * wowFas_); }
    int voiceMask() const { int m = 0; for (int i = 0; i < kVoices; ++i) if (v_[i].aktiv) m |= 1 << i; return m; }
    // var bandet är för tonen (0..1 av bandets längd, -1 = spelar inte): scenen visar banden som rullar
    double bandlage(int note) const {
        double best = -1;
        for (const auto& v : v_) if (v.aktiv && !v.doende && v.not_ == note && band_[v.band].ramar > 0) best = std::max(best, v.pos / band_[v.band].ramar);
        return best;
    }

    void process(float* L, float* R, int n) override {
        constexpr double twopi = 6.283185307179586;
        const double wowDjup = p_[P_WOW];
        const double slit = p_[P_SLIT];
        const double drive = 1.0 + slit * 1.6;
        float env = 0;
        for (int s = 0; s < n; ++s) {
            // gemensamt för alla band: svaj (två långsamma) och fladder, böj, fart och vibrato från hjulet
            wowFas_ += 0.53 / sr_; if (wowFas_ >= 1) wowFas_ -= 1;
            wowFas2_ += 0.87 / sr_; if (wowFas2_ >= 1) wowFas2_ -= 1;
            flFas_ += 7.3 / sr_; if (flFas_ >= 1) flFas_ -= 1;
            vibFas_ += 5.6 / sr_; if (vibFas_ >= 1) vibFas_ -= 1;
            const double cent = wowDjup * (11.0 * std::sin(twopi * wowFas_) + 6.0 * std::sin(twopi * wowFas2_ + 1.3))
                              + wowDjup * wowDjup * 4.0 * std::sin(twopi * flFas_);
            const double semi = bend_ * p_[P_BENDR] + p_[P_FART] + hjul_ * p_[P_MWOSC] * 0.4 * std::sin(twopi * vibFas_);
            const double fakt = std::pow(2.0, (semi + cent * 0.01) / 12.0);
            double xl = 0, xr = 0, akt = 0;
            for (auto& v : v_) {
                if (!v.aktiv) continue;
                const Band& b = band_[v.band];
                // kurvan: ansatsen (aa), släppet (ar) och ett snabbt släpp när tangenten tas om eller rösten behövs
                const bool upp = v.held || v.halls;
                if (v.doende) v.env -= v.env * kDod_ + 1e-6;
                else if (upp) v.env += (1.0 - v.env) * kUpp_;
                else v.env -= v.env * kNed_ + 1e-7;
                const double re = b.ramar - 2 - v.pos;
                if (v.env <= 1e-5 && !upp) { v.aktiv = false; continue; }
                if (re <= 0) { v.aktiv = false; continue; }
                const double slutTona = std::min(1.0, re / (b.sr * 0.012));   // bandet tar slut: en kort uttoning
                const double g = v.env * v.vg * kBand[v.band].gain * slutTona;
                // läs bandet (kubisk interpolation)
                const int i = (int)v.pos; const double f = v.pos - i;
                const int16_t* d = b.data + (size_t)i * 2;
                const int16_t* dm = i > 0 ? d - 2 : d;
                const double l = herm(dm[0], d[0], d[2], d[4], f), r = herm(dm[1], d[1], d[3], d[5], f);
                xl += l * g; xr += r * g; akt += v.env * v.vg;
                v.pos += v.steg * fakt;
                env = std::max(env, (float)v.env);
            }
            xl *= (1.0 / 32768.0); xr *= (1.0 / 32768.0);
            aktivitet_ += (std::min(1.0, akt) - aktivitet_) * 0.002;
            // bredd: mitten och sidan
            const double mid = 0.5 * (xl + xr), sid = 0.5 * (xl - xr) * p_[P_BREDD];
            xl = mid + sid; xr = mid - sid;
            // slitage: brus från banden som spelar, mättnad och mindre diskant
            slump_ = slump_ * 1664525u + 1013904223u;
            const double brus = ((slump_ >> 9) * (1.0 / 4194304.0) - 1.0);
            brusLp_ += (brus - brusLp_) * kBrusLp_; brusHp_ += (brusLp_ - brusHp_) * kBrusHp_;
            const double hiss = (brusLp_ - brusHp_) * (0.002 + 0.02 * slit) * slit * aktivitet_;
            xl = std::tanh((xl + hiss) * drive) / drive; xr = std::tanh((xr - hiss * 0.7) * drive) / drive;
            slitL_ += (xl - slitL_) * kSlit_; slitR_ += (xr - slitR_) * kSlit_;
            xl = slitL_; xr = slitR_;
            // ton: under mitten ett lågpass, över mitten mer närvaro
            tonL_ += (xl - tonL_) * kTon_; tonR_ += (xr - tonR_) * kTon_;
            hogL_ += (xl - hogL_) * kHog_; hogR_ += (xr - hogR_) * kHog_;
            if (p_[P_TON] < 0.5) { xl = tonL_; xr = tonR_; }
            else { const double k = (p_[P_TON] - 0.5) * 2.0; xl += (xl - hogL_) * k; xr += (xr - hogR_) * k; }
            efter(xl, xr);
            L[s] = (float)xl; R[s] = (float)xr;
        }
        env_ = env;
    }

private:
    struct Band { const int16_t* data = nullptr; int ramar = 0; double sr = kBandSr; };
    struct Rost {
        bool aktiv = false, held = false, halls = false, doende = false;
        int not_ = 0, band = 0;
        double pos = 0, steg = 1, env = 0, vg = 1;
        unsigned alder = 0;
    };

    static double herm(double y0, double y1, double y2, double y3, double x) {
        const double c1 = 0.5 * (y2 - y0), c2 = y0 - 2.5 * y1 + 2.0 * y2 - 0.5 * y3, c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
        return ((c3 * x + c2) * x + c1) * x + y1;
    }
    static double koef(double sek, double sr) { return 1.0 - std::exp(-1.0 / (std::max(1e-4, sek) * sr)); }
    static double lp(double hz, double sr) { return 1.0 - std::exp(-6.283185307179586 * std::min(hz, sr * 0.45) / sr); }

    void uppdatera() {
        const double aa = p_[P_AA], ar = p_[P_AR];
        kUpp_ = koef(0.002 + aa * aa * 1.2, sr_);
        kNed_ = koef(0.015 + ar * ar * 1.6, sr_);
        kDod_ = koef(0.004, sr_);
        const double t = p_[P_TON];
        kTon_ = lp(t < 0.5 ? 700.0 * std::pow(28.0, t * 2.0) : 20000.0, sr_);
        kHog_ = lp(2500.0, sr_);
        kSlit_ = lp(16000.0 - p_[P_SLIT] * 10000.0, sr_);
        kBrusLp_ = lp(5000.0, sr_); kBrusHp_ = lp(250.0, sr_);
    }

    // efter rösterna: BRIS ensemble och eko, volymen och likspänningsfiltret (som FX_UT i blonda-motor/generator/bris.py)
    void efter(double& xL, double& xR) {
        constexpr double twopi = 6.283185307179586;
        const double sr = sr_, chorus = p_[P_CHORUS];
        ci_ = (ci_ + 1) & 4095;
        chb_[0][ci_] = (float)xL; chb_[1][ci_] = (float)xR;
        static constexpr double fr[4] = {0.31, 0.47, 0.39, 0.53};
        for (int k = 0; k < 4; ++k) { cp_[k] += fr[k] / sr; if (cp_[k] >= 1) cp_[k] -= 1; }
        const double cd = (0.7 + chorus * 2.2) * sr / 1000, cb = 7 * sr / 1000;
        auto tap = [&](int k, double djup, int kan) {
            double r = ci_ - (cb + std::sin(twopi * cp_[k]) * cd * djup);
            r -= std::floor(r / 4096.0) * 4096.0;
            const int i0 = (int)r; const double f = r - i0;
            return chb_[kan][i0 & 4095] * (1 - f) + chb_[kan][(i0 + 1) & 4095] * f;
        };
        const double tp0 = tap(0, 1.0, 0), tp1 = tap(1, 0.8, 1), tp2 = tap(2, 1.0, 1), tp3 = tap(3, 0.8, 0);
        const double cL = xL * (1 - chorus * 0.35) + (tp0 + tp1 * 0.6) * chorus * 0.55;
        const double cR = xR * (1 - chorus * 0.35) + (tp2 + tp3 * 0.6) * chorus * 0.55;
        const double dtime = p_[P_DTIME];
        sDt_ += ((0.001 + dtime * dtime * 0.999) - sDt_) * (1 - std::exp(-1 / (sr * 0.12)));
        dw_ = (dw_ + 1) % kDl;
        const double dd = std::max(2.0, std::min(sDt_ * sr, (double)kDl - 10));
        double rd = dw_ - dd; if (rd < 0) rd += kDl;
        const int ri = (int)rd; const double rf = rd - ri; const int ri1 = (ri + 1) % kDl;
        const double wL = dlb_[0][ri] * (1 - rf) + dlb_[0][ri1] * rf, wR = dlb_[1][ri] * (1 - rf) + dlb_[1][ri1] * rf;
        const double dg = 1 - std::exp(-twopi * 6500 / sr);
        dlpL_ += (wL - dlpL_) * dg; dlpR_ += (wR - dlpR_) * dg;
        const double fbk = p_[P_DFB] * 1.02;
        dlb_[0][dw_] = (float)std::tanh(cL + dlpL_ * fbk); dlb_[1][dw_] = (float)std::tanh(cR + dlpR_ * fbk);
        double oL = cL + dlpL_ * p_[P_DMIX], oR = cR + dlpR_ * p_[P_DMIX];
        const double gv = p_[P_VOL] * p_[P_VOL] * 1.25;
        oL = std::tanh(oL * gv); oR = std::tanh(oR * gv);
        dcyL_ = oL - dcxL_ + 0.9995 * dcyL_; dcxL_ = oL;
        dcyR_ = oR - dcxR_ + 0.9995 * dcyR_; dcxR_ = oR;
        xL = dcyL_; xR = dcyR_;
    }

    static constexpr int kDl = 52000;
    double sr_ = 48000.0;
    double p_[kNumParams]{};
    Band band_[kNumBand]{};
    Rost v_[kVoices]{};
    unsigned klocka_ = 0, slump_ = 22222u;
    bool sustain_ = false;
    double bend_ = 0, hjul_ = 0, wowFas_ = 0, wowFas2_ = 0, flFas_ = 0, vibFas_ = 0;
    double kUpp_ = 0, kNed_ = 0, kDod_ = 0, kTon_ = 0, kHog_ = 0, kSlit_ = 0, kBrusLp_ = 0, kBrusHp_ = 0;
    double tonL_ = 0, tonR_ = 0, hogL_ = 0, hogR_ = 0, slitL_ = 0, slitR_ = 0, brusLp_ = 0, brusHp_ = 0, aktivitet_ = 0;
    float chb_[2][4096]{};
    float dlb_[2][kDl]{};
    int ci_ = 0, dw_ = 0;
    double cp_[4]{}, sDt_ = 0.1, dlpL_ = 0, dlpR_ = 0, dcxL_ = 0, dcyL_ = 0, dcxR_ = 0, dcyR_ = 0;
    float env_ = 0;
};

}  // namespace blonda::app::mello
