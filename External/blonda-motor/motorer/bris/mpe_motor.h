// BLONDA – MPE för motorer med BRIS röstfördelning: varje ton har egen böj, egen slide och eget tryck.
//
// Gemensamt för BRIS MPE, ONE MPE och STAV MPE. DSP-klassen har Param eb0.., es0.., ep0.. (böj i halvtoner, slide
// och tryck 0..1) för varje röst; tabellen T har kBendr (böjomfånget på huvudkanalen).
//
// MPE (nedre zonen): kanal 1 är huvudkanal (böj och tryck där gäller alla toner), kanal 2-16 är tonkanaler där
// varje ton har sin egen böj (MPE:s omfång, 48 halvtoner om inget annat skickas med RPN 0), sitt eget tryck och
// sin egen slide (CC74). En vanlig klaviatur på kanal 1 spelar som förut (CC74 där blir slide för alla toner).
// Utan MIDI: noteOnCh/channelBend/channelSlide/channelPressure (t.ex. en app där varje finger får en egen kanal).
#pragma once
#include <algorithm>
#include <cstdio>

#include "bris/bris_motor.h"

namespace blonda::bris {

template <class Dsp, class T, int NV = 6>
class MpeMotor : public BrisMotor<Dsp, T, NV> {
protected:
    using Base = BrisMotor<Dsp, T, NV>;
    using Base::kVoices; using Base::vo_; using Base::g_; using Base::dsp_; using Base::mode_; using Base::curCh_;
    using Base::clock_; using Base::sustain_;
    using Voice = typename Base::Voice;

public:
    static constexpr int kChannels = 16;

    MpeMotor() {
        char nm[8];
        for (int i = 0; i < kVoices; ++i) {
            std::snprintf(nm, sizeof nm, "eb%d", i); eb_[i] = dsp_.param(nm);
            std::snprintf(nm, sizeof nm, "es%d", i); es_[i] = dsp_.param(nm);
            std::snprintf(nm, sizeof nm, "ep%d", i); ep_[i] = dsp_.param(nm);
        }
        clearExpr();
    }

    void reset() override { Base::reset(); clearExpr(); }

    // ---------------------------------------------------------------- toner med kanal
    void noteOnCh(int ch, int n, int vel) {
        curCh_ = clampCh(ch);
        Base::noteOn(n, vel);
        curCh_ = 0;
        applyExpr();
    }
    void noteOffCh(int ch, int n) {
        ch = clampCh(ch);
        if (mode_ >= 2) { Base::noteOff(n); return; }
        // bara rösten med samma ton på samma kanal (två fingrar kan spela samma ton på olika kanaler)
        for (int i = 0; i < kVoices; ++i) {
            Voice& v = vo_[i];
            if (v.on && v.note == n && v.ch == ch) { v.on = false; v.age = ++clock_; if (sustain_) v.sus = true; else *g_[i] = 0; }
        }
    }
    void noteOn(int n, int vel) override { noteOnCh(0, n, vel); }
    void noteOff(int n) override { noteOffCh(0, n); }

    // ---------------------------------------------------------------- uttryck per kanal
    void channelBend(int ch, double semitones) { chB_[clampCh(ch)] = semitones; applyExpr(); }
    void channelSlide(int ch, double v01) { chS_[clampCh(ch)] = std::min(1.0, std::max(0.0, v01)); applyExpr(); }
    void channelPressure(int ch, double v01) { chP_[clampCh(ch)] = std::min(1.0, std::max(0.0, v01)); applyExpr(); }

    // högsta slide bland tonerna som låter (för gränssnitt som visar moduleringen)
    double slideNow() const {
        double m = 0;
        for (int i = 0; i < kVoices; ++i) if (vo_[i].on || vo_[i].sus) m = std::max(m, chS_[vo_[i].ch]);
        return m;
    }

    // ---------------------------------------------------------------- MIDI med MPE
    void midi(uint8_t s, uint8_t d1, uint8_t d2) override {
        const int ty = s & 0xF0, ch = s & 0x0F;
        if (ty == 0x90 && d2 > 0) { noteOnCh(ch, d1, d2); return; }
        if (ty == 0x80 || ty == 0x90) { noteOffCh(ch, d1); return; }
        if (ty == 0xE0 && ch != 0) { channelBend(ch, ((((int)d2 << 7) | d1) - 8192) / 8192.0 * range_[ch]); return; }
        if (ty == 0xD0 && ch != 0) { channelPressure(ch, d1 / 127.0); return; }
        if (ty == 0xB0) {
            if (d1 == 74) { channelSlide(ch, d2 / 127.0); return; }
            if (d1 == 101) { rpnMsb_[ch] = d2; return; }
            if (d1 == 100) { rpnLsb_[ch] = d2; return; }
            if (d1 == 6 && rpnMsb_[ch] == 0 && rpnLsb_[ch] == 0) {   // böjomfång (RPN 0)
                if (ch == 0) { this->setParam(T::kBendr, d2); }     // huvudkanalen: motorns böjomfång
                else for (int c = 1; c < kChannels; ++c) range_[c] = std::max(1, (int)d2);   // tonkanalerna
                return;
            }
            if (d1 == 120 || d1 == 123) { Base::midi(s, d1, d2); clearExpr(); return; }
        }
        Base::midi(s, d1, d2);   // kanal 1 (böj, tryck), modhjul, sustain, polyfoniskt tryck
    }

private:
    static int clampCh(int ch) { return ch < 0 ? 0 : (ch >= kChannels ? kChannels - 1 : ch); }
    void applyExpr() {
        for (int i = 0; i < kVoices; ++i) {
            const int c = vo_[i].ch;
            *eb_[i] = chB_[c]; *es_[i] = chS_[c]; *ep_[i] = chP_[c];
        }
    }
    void clearExpr() {
        for (int c = 0; c < kChannels; ++c) { chB_[c] = 0; chS_[c] = 0; chP_[c] = 0; range_[c] = 48; rpnMsb_[c] = rpnLsb_[c] = 127; }
        for (int i = 0; i < kVoices; ++i) { *eb_[i] = 0; *es_[i] = 0; *ep_[i] = 0; }
    }

    double *eb_[kVoices], *es_[kVoices], *ep_[kVoices];
    double chB_[kChannels], chS_[kChannels], chP_[kChannels];
    int range_[kChannels], rpnMsb_[kChannels], rpnLsb_[kChannels];
};

}  // namespace blonda::bris
