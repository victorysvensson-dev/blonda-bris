// BLONDA ONE – BRIS möter Moog: sexstämmig analog poly med tre oscillatorer per röst, brus och en stege som går
// att driva, som fristående C++-motor.
//
// Ljudet kommer från one_gen.h (samma GenExpr som Max-pluggen, generator/one.py). Röstfördelningen är BRIS
// (bris/bris_motor.h): samma röstlägen (0 Poly Stereo, 1 Poly, 2 Mono, 3 Unison) och samma unisonintervall.
#pragma once
#include "bris/bris_motor.h"
#include "one_gen.h"
#include "one_ljud.h"

namespace blonda::one {

struct OneTabell {
    static constexpr int kNumParams = one::kNumParams, kNumPresets = one::kNumPresets;
    static constexpr int kLage = P_lage, kUniint = P_uniint;
    static const ParamInfo* params() { return kParams; }
    static const PresetInfo* presets() { return kPresets; }
    static const PresetValue* presetValues() { return kPresetValues; }
};

class One : public bris::BrisMotor<OneDsp, OneTabell> {
public:
    const char* name() const override { return "BLONDA ONE"; }
};

}  // namespace blonda::one
