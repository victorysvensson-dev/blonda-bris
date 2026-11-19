// BLONDA BRIS MPE – BRIS där varje ton har eget uttryck (MPE): egen böj, egen slide och eget tryck.
//
// Ljudet kommer från brismpe_gen.h (generator/bris.py med mpe=True) och är BRIS sampel för sampel när inget
// uttryck används. Röstfördelningen är BRIS egen (bris/bris_motor.h).
//
// MPE (nedre zonen): kanal 1 är huvudkanal (böj och tryck där gäller alla toner, som i BRIS), kanal 2-16 är
// tonkanaler där varje ton har sin egen böj (MPE:s omfång, 48 halvtoner om inget annat skickas med RPN 0),
// sitt eget tryck och sin egen slide (CC74). Slide styr det som parametern slm väljer: FILTER, VIBRATO, TREMOLO,
// PWM eller WAH. En vanlig klaviatur på kanal 1 spelar BRIS precis som förut (CC74 där blir slide för alla toner).
// Utan MIDI: noteOnCh/channelBend/channelSlide/channelPressure (t.ex. en app där varje finger får en egen kanal).
// Själva MPE-hanteringen är gemensam med ONE MPE och STAV MPE (bris/mpe_motor.h).
#pragma once
#include <cstdio>

#include "bris/mpe_motor.h"
#include "brismpe_gen.h"
#include "brismpe_ljud.h"

namespace blonda::brismpe {

struct BrisMpeTabell {
    static constexpr int kNumParams = brismpe::kNumParams, kNumPresets = brismpe::kNumPresets;
    static constexpr int kLage = P_lage, kUniint = P_uniint, kBendr = P_bendr;
    static const ParamInfo* params() { return kParams; }
    static const PresetInfo* presets() { return kPresets; }
    static const PresetValue* presetValues() { return kPresetValues; }
};

class BrisMpe : public bris::MpeMotor<BrisMpeDsp, BrisMpeTabell> {
public:
    const char* name() const override { return "BLONDA BRIS MPE"; }
};

}  // namespace blonda::brismpe
