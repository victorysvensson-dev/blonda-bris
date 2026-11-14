// GENERERAD FIL – ändra inte för hand. Källa: generator/effekter/rum.json (BLONDA RUM.amxd)
#pragma once
#include "blonda/motor.h"
#include "rum_gen.h"

namespace blonda::rum {

inline constexpr const char* kName = "BLONDA RUM";
using Dsp = RumDsp;
constexpr int kNumParams = 12;
inline const ParamInfo kParams[kNumParams] = {
    {"size", "Size", 0.0, 1.0, 0.55, false, false},
    {"decay", "Decay", 0.0, 1.0, 0.5, false, false},
    {"damp", "Damping", 0.0, 1.0, 0.45, false, false},
    {"predel", "Predelay", 0.0, 1.0, 0.15, false, false},
    {"lowc", "Low Cut", 0.0, 1.0, 0.25, false, false},
    {"modd", "Movement", 0.0, 1.0, 0.35, false, false},
    {"width", "Width", 0.0, 1.0, 1.0, false, false},
    {"wet", "Mix", 0.0, 1.0, 0.3, false, false},
    {"duck", "Duck", 0.0, 1.0, 0.0, false, false},
    {"outv", "Output", 0.0, 1.0, 0.75, false, false},
    {"shape", "Type", 0.0, 1.0, 0.0, false, false},
    {"highc", "High Cut", 0.0, 1.0, 1.0, false, false},
};

}  // namespace blonda::rum
