// BLONDA BRIS – sexstämmig analog poly efter GS Music Bree6, som fristående C++-motor.
//
// Ljudet kommer från bris_gen.h (samma GenExpr som Max-pluggen). Röstfördelningen och kopplingen till det
// gemensamma Motor-gränssnittet finns i bris_motor.h (delas med BRIS MPE).
#pragma once
#include "bris_gen.h"
#include "bris_ljud.h"
#include "bris_motor.h"

namespace blonda::bris {

struct BrisTabell {
    static constexpr int kNumParams = bris::kNumParams, kNumPresets = bris::kNumPresets;
    static constexpr int kLage = P_lage, kUniint = P_uniint;
    static const ParamInfo* params() { return kParams; }
    static const PresetInfo* presets() { return kPresets; }
    static const PresetValue* presetValues() { return kPresetValues; }
};

class Bris : public BrisMotor<BrisDsp, BrisTabell> {
public:
    const char* name() const override { return "BLONDA BRIS"; }
};

}  // namespace blonda::bris
