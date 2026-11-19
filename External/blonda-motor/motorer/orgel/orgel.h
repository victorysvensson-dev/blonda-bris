// BLONDA ORGEL – piporgel: stämmor 16'–1', blandning, tungstämma, svävning, luft och chiff, tremulant och svällare, som fristående C++-motor.
//
// Ljudet kommer från orgel_gen.h (generator/orgel.py). Röstfördelningen är BRIS (bris/bris_motor.h) med 8 röster:
// samma röstlägen (0 Poly Stereo, 1 Poly, 2 Mono, 3 Unison) och samma unisonintervall.
#pragma once
#include "bris/bris_motor.h"
#include "orgel_gen.h"
#include "orgel_ljud.h"

namespace blonda::orgel {

struct OrgelTabell {
    static constexpr int kNumParams = orgel::kNumParams, kNumPresets = orgel::kNumPresets;
    static constexpr int kLage = P_lage, kUniint = P_uniint;
    static const ParamInfo* params() { return kParams; }
    static const PresetInfo* presets() { return kPresets; }
    static const PresetValue* presetValues() { return kPresetValues; }
};

class Orgel : public bris::BrisMotor<OrgelDsp, OrgelTabell, 8> {
public:
    const char* name() const override { return "BLONDA ORGEL"; }
};

}  // namespace blonda::orgel
