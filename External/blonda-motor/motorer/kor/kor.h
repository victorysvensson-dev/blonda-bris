// BLONDA KÖR – mänskliga röster: sex toner med tre sångare var, vokaler, vibrato och andning, som fristående C++-motor.
//
// Ljudet kommer från kor_gen.h (generator/kor.py). Röstfördelningen är BRIS (bris/bris_motor.h) med 6 röster:
// samma röstlägen (0 Poly Stereo, 1 Poly, 2 Mono, 3 Unison) och samma unisonintervall.
#pragma once
#include "bris/bris_motor.h"
#include "kor_gen.h"
#include "kor_ljud.h"

namespace blonda::kor {

struct KorTabell {
    static constexpr int kNumParams = kor::kNumParams, kNumPresets = kor::kNumPresets;
    static constexpr int kLage = P_lage, kUniint = P_uniint;
    static const ParamInfo* params() { return kParams; }
    static const PresetInfo* presets() { return kPresets; }
    static const PresetValue* presetValues() { return kPresetValues; }
};

class Kor : public bris::BrisMotor<KorDsp, KorTabell, 6> {
public:
    const char* name() const override { return "BLONDA KÖR"; }
};

}  // namespace blonda::kor
