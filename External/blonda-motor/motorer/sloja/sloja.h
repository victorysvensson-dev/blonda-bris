// BLONDA SLÖJA – skimrande additiv pad: 16 deltoner per röst som andas, glittrar och skimrar, som fristående C++-motor.
//
// Ljudet kommer från sloja_gen.h (generator/sloja.py). Röstfördelningen är BRIS (bris/bris_motor.h) med 6 röster:
// samma röstlägen (0 Poly Stereo, 1 Poly, 2 Mono, 3 Unison) och samma unisonintervall.
#pragma once
#include "bris/bris_motor.h"
#include "sloja_gen.h"
#include "sloja_ljud.h"

namespace blonda::sloja {

struct SlojaTabell {
    static constexpr int kNumParams = sloja::kNumParams, kNumPresets = sloja::kNumPresets;
    static constexpr int kLage = P_lage, kUniint = P_uniint;
    static const ParamInfo* params() { return kParams; }
    static const PresetInfo* presets() { return kPresets; }
    static const PresetValue* presetValues() { return kPresetValues; }
};

class Sloja : public bris::BrisMotor<SlojaDsp, SlojaTabell, 6> {
public:
    const char* name() const override { return "BLONDA SLÖJA"; }
};

}  // namespace blonda::sloja
