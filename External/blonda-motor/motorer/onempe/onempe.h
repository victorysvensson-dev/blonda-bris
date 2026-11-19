// BLONDA ONE MPE – ONE (BRIS möter Moog) där varje ton har eget uttryck (MPE): egen böj, egen slide och eget tryck.
//
// Ljudet kommer från onempe_gen.h (generator/one.py med mpe=True) och är ONE sampel för sampel när inget uttryck
// används. Slide styr det som parametern slm väljer (FILTER, VIBRATO, TREMOLO, PWM, WAH), trycket ger vibrato som
// hjulet. Röstfördelningen är BRIS (bris/bris_motor.h), MPE-hanteringen bris/mpe_motor.h.
#pragma once
#include "bris/mpe_motor.h"
#include "onempe_gen.h"
#include "onempe_ljud.h"

namespace blonda::onempe {

struct OneMpeTabell {
    static constexpr int kNumParams = onempe::kNumParams, kNumPresets = onempe::kNumPresets;
    static constexpr int kLage = P_lage, kUniint = P_uniint, kBendr = P_bendr;
    static const ParamInfo* params() { return kParams; }
    static const PresetInfo* presets() { return kPresets; }
    static const PresetValue* presetValues() { return kPresetValues; }
};

class OneMpe : public bris::MpeMotor<OneMpeDsp, OneMpeTabell, 6> {
public:
    const char* name() const override { return "BLONDA ONE MPE"; }
};

}  // namespace blonda::onempe
