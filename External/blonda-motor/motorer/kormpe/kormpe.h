// BLONDA KÖR MPE – KÖR där varje ton har eget uttryck (MPE): egen böj, egen slide och eget tryck.
//
// Ljudet kommer från kormpe_gen.h (generator/kor.py med mpe=True) och är KÖR sampel för sampel när inget uttryck
// används. Slide styr det som parametern slm väljer (se slideTargets i kormpe.json). Röstfördelningen är BRIS
// (bris/bris_motor.h), MPE-hanteringen bris/mpe_motor.h.
#pragma once
#include "bris/mpe_motor.h"
#include "kormpe_gen.h"
#include "kormpe_ljud.h"

namespace blonda::kormpe {

struct KorMpeTabell {
    static constexpr int kNumParams = kormpe::kNumParams, kNumPresets = kormpe::kNumPresets;
    static constexpr int kLage = P_lage, kUniint = P_uniint, kBendr = P_bendr;
    static const ParamInfo* params() { return kParams; }
    static const PresetInfo* presets() { return kPresets; }
    static const PresetValue* presetValues() { return kPresetValues; }
};

class KorMpe : public bris::MpeMotor<KorMpeDsp, KorMpeTabell, 6> {
public:
    const char* name() const override { return "BLONDA KÖR MPE"; }
};

}  // namespace blonda::kormpe
