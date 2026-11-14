// GENERERAD FIL – ändra inte för hand. Källa: generator/effekter/sliten.json (BLONDA SLITEN.amxd)
#pragma once
#include "blonda/motor.h"
#include "sliten_gen.h"

namespace blonda::sliten {

inline constexpr const char* kName = "BLONDA SLITEN";
using Dsp = SlitenDsp;
constexpr int kNumParams = 11;
inline const ParamInfo kParams[kNumParams] = {
    {"media", "Media", 0.0, 8.0, 0.0, false, false},
    {"age", "Wear", 0.0, 1.0, 0.5, false, false},
    {"wow", "Wow", 0.0, 1.0, 0.35, false, false},
    {"flut", "Flutter", 0.0, 1.0, 0.3, false, false},
    {"sat", "Saturation", 0.0, 1.0, 0.4, false, false},
    {"brus", "Noise", 0.0, 1.0, 0.3, false, false},
    {"avbr", "Dropouts", 0.0, 1.0, 0.2, false, false},
    {"ton", "Tone", 0.0, 1.0, 0.5, false, false},
    {"bredd", "Width", 0.0, 1.0, 1.0, false, false},
    {"wet", "Mix", 0.0, 1.0, 1.0, false, false},
    {"outv", "Output", 0.0, 1.0, 0.75, false, false},
};

}  // namespace blonda::sliten
