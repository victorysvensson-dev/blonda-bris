// BLONDA STAV – elpiano: FM-tonstav (tonstav, tunga eller FM), pickup, mekanik och stereotremolo, som fristående C++-motor.
//
// Ljudet kommer från stav_gen.h (generator/stav.py). Röstfördelningen är BRIS (bris/bris_motor.h) med 6 röster:
// samma röstlägen (0 Poly Stereo, 1 Poly, 2 Mono, 3 Unison) och samma unisonintervall.
#pragma once
#include "bris/bris_motor.h"
#include "stav_gen.h"
#include "stav_ljud.h"

namespace blonda::stav {

struct StavTabell {
    static constexpr int kNumParams = stav::kNumParams, kNumPresets = stav::kNumPresets;
    static constexpr int kLage = P_lage, kUniint = P_uniint;
    static const ParamInfo* params() { return kParams; }
    static const PresetInfo* presets() { return kPresets; }
    static const PresetValue* presetValues() { return kPresetValues; }
};

class Stav : public bris::BrisMotor<StavDsp, StavTabell, 6> {
public:
    const char* name() const override { return "BLONDA STAV"; }
};

}  // namespace blonda::stav
