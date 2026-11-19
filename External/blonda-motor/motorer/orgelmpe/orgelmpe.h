// BLONDA ORGEL MPE – ORGEL där varje ton har eget uttryck (MPE): egen böj, egen slide och eget tryck.
//
// Ljudet kommer från orgelmpe_gen.h (generator/orgel.py med mpe=True) och är ORGEL sampel för sampel när inget uttryck
// används. Slide styr det som parametern slm väljer (se slideTargets i orgelmpe.json). Röstfördelningen är BRIS
// (bris/bris_motor.h), MPE-hanteringen bris/mpe_motor.h.
#pragma once
#include "bris/mpe_motor.h"
#include "orgelmpe_gen.h"
#include "orgelmpe_ljud.h"

namespace blonda::orgelmpe {

struct OrgelMpeTabell {
    static constexpr int kNumParams = orgelmpe::kNumParams, kNumPresets = orgelmpe::kNumPresets;
    static constexpr int kLage = P_lage, kUniint = P_uniint, kBendr = P_bendr;
    static const ParamInfo* params() { return kParams; }
    static const PresetInfo* presets() { return kPresets; }
    static const PresetValue* presetValues() { return kPresetValues; }
};

class OrgelMpe : public bris::MpeMotor<OrgelMpeDsp, OrgelMpeTabell, 8> {
public:
    const char* name() const override { return "BLONDA ORGEL MPE"; }
};

}  // namespace blonda::orgelmpe
