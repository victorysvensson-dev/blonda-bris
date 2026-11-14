// GENERERAD FIL – ändra inte för hand. Källa: generator/effekter/vibe.json (BLONDA VIBE.amxd)
#pragma once
#include "blonda/motor.h"
#include "vibe_gen.h"

namespace blonda::vibe {

inline constexpr const char* kName = "BLONDA VIBE";
using Dsp = VibeDsp;
constexpr int kNumParams = 24;
inline const ParamInfo kParams[kNumParams] = {
    {"boom", "Boom", 0.0, 100.0, 0.0, false, false},
    {"boomkey", "Boom Key", 0.0, 11.0, 0.0, false, false},
    {"boomdecay", "Boom Decay", 0.0, 100.0, 35.0, false, false},
    {"boomsens", "Boom Sens", 0.0, 100.0, 50.0, false, false},
    {"punch", "Punch", -100.0, 100.0, 0.0, false, false},
    {"drive", "Drive", 0.0, 100.0, 0.0, false, false},
    {"dtype", "Drive Type", 0.0, 3.0, 0.0, false, false},
    {"crush", "Crush", 0.0, 100.0, 0.0, false, false},
    {"wobble", "Wobble", 0.0, 100.0, 0.0, false, false},
    {"tape", "Tape", 0.0, 100.0, 0.0, false, false},
    {"glue", "Glue", 0.0, 100.0, 0.0, false, false},
    {"space", "Space", 0.0, 100.0, 0.0, false, false},
    {"roomsize", "Room Size", 0.0, 100.0, 50.0, false, false},
    {"wobrate", "Wobble Rate", 0.0, 100.0, 35.0, false, false},
    {"noiseamt", "Noise", 0.0, 100.0, 0.0, false, false},
    {"ntype", "Noise Type", 0.0, 1.0, 0.0, false, false},
    {"lowcut", "Low Cut", 0.0, 100.0, 0.0, false, false},
    {"highcut", "High Cut", 0.0, 100.0, 0.0, false, false},
    {"clipamt", "Clip", 0.0, 100.0, 0.0, false, false},
    {"width", "Width", 0.0, 200.0, 100.0, false, false},
    {"magnitude", "Vibe", 0.0, 100.0, 100.0, false, false},
    {"mixp", "Mix", 0.0, 100.0, 100.0, false, false},
    {"outdb", "Output", -24.0, 12.0, 0.0, false, false},
    {"nage", "Noise Tone", -100.0, 100.0, 0.0, false, false},
};

}  // namespace blonda::vibe
