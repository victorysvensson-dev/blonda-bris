// BLONDA SLÖJA MPE – SLÖJA där varje ton har eget uttryck (MPE): egen böj, egen slide och eget tryck.
//
// Ljudet kommer från slojampe_gen.h (generator/sloja.py med mpe=True) och är SLÖJA sampel för sampel när inget uttryck
// används. Slide styr det som parametern slm väljer (se slideTargets i slojampe.json). Röstfördelningen är BRIS
// (bris/bris_motor.h), MPE-hanteringen bris/mpe_motor.h.
#pragma once
#include "bris/mpe_motor.h"
#include "slojampe_gen.h"
#include "slojampe_ljud.h"

namespace blonda::slojampe {

struct SlojaMpeTabell {
    static constexpr int kNumParams = slojampe::kNumParams, kNumPresets = slojampe::kNumPresets;
    static constexpr int kLage = P_lage, kUniint = P_uniint, kBendr = P_bendr;
    static const ParamInfo* params() { return kParams; }
    static const PresetInfo* presets() { return kPresets; }
    static const PresetValue* presetValues() { return kPresetValues; }
};

class SlojaMpe : public bris::MpeMotor<SlojaMpeDsp, SlojaMpeTabell, 6> {
public:
    const char* name() const override { return "BLONDA SLÖJA MPE"; }
};

}  // namespace blonda::slojampe
