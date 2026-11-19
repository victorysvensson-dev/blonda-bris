// BLONDA STAV MPE – STAV (elpiano) där varje ton har eget uttryck (MPE): egen böj, egen slide och eget tryck.
//
// Ljudet kommer från stavmpe_gen.h (generator/stav.py med mpe=True) och är STAV sampel för sampel när inget uttryck
// används. Slide styr det som parametern slm väljer (FILTER, VIBRATO, TREMOLO, PWM, WAH), trycket ger vibrato som
// hjulet. Röstfördelningen är BRIS (bris/bris_motor.h), MPE-hanteringen bris/mpe_motor.h.
#pragma once
#include "bris/mpe_motor.h"
#include "stavmpe_gen.h"
#include "stavmpe_ljud.h"

namespace blonda::stavmpe {

struct StavMpeTabell {
    static constexpr int kNumParams = stavmpe::kNumParams, kNumPresets = stavmpe::kNumPresets;
    static constexpr int kLage = P_lage, kUniint = P_uniint, kBendr = P_bendr;
    static const ParamInfo* params() { return kParams; }
    static const PresetInfo* presets() { return kPresets; }
    static const PresetValue* presetValues() { return kPresetValues; }
};

class StavMpe : public bris::MpeMotor<StavMpeDsp, StavMpeTabell, 6> {
public:
    const char* name() const override { return "BLONDA STAV MPE"; }
};

}  // namespace blonda::stavmpe
