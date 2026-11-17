// GENERERAD FIL – ändra inte för hand. Källa: generator/mood.py
#pragma once
#include "blonda/motor.h"
#include "mood_gen.h"

namespace blonda::mood {

inline constexpr const char* kName = "BLONDA MOOD";
using Dsp = MoodDsp;
constexpr int kNumParams = 21;
inline const ParamInfo kParams[kNumParams] = {
    {"wet", "Wet", 0.0, 1.0, 0.0, true, false},
    {"frz", "Freeze", 0.0, 1.0, 0.0, true, false},
    {"wmode", "Wet Mode", 0.0, 2.0, 0.0, true, false},
    {"time", "Time", 0.0, 1.0, 0.55, false, false},
    {"wmod", "Modify", 0.0, 1.0, 0.6, false, false},
    {"blend", "Mix", 0.0, 1.0, 0.5, false, false},
    {"clk", "Clock", 0.0, 1.0, 0.75, false, false},
    {"loop", "Micro-Loop", 0.0, 1.0, 0.0, true, false},
    {"dub", "Overdub", 0.0, 1.0, 0.0, true, false},
    {"lmode", "Loop Mode", 0.0, 2.0, 1.0, true, false},
    {"len", "Length", 0.0, 1.0, 1.0, false, false},
    {"lmod", "Loop Modify", 0.0, 1.0, 0.6875, false, false},
    {"rout", "Routing", 0.0, 2.0, 1.0, true, false},
    {"sprd", "Spread", 0.0, 1.0, 0.0, true, false},
    {"tone", "Tone", 0.0, 1.0, 0.2, false, false},
    {"width", "Stereo Width", 0.0, 1.0, 0.75, false, false},
    {"fade", "Fade", 0.0, 1.0, 0.9, false, false},
    {"half", "Loop Length", 0.0, 1.0, 0.0, true, false},
    {"bal", "Level Balance", 0.0, 1.0, 0.5, false, false},
    {"dir", "Direct Micro-Loop", 0.0, 1.0, 0.5, false, false},
    {"smth", "Smooth Clock", 0.0, 1.0, 0.0, true, false},
};

}  // namespace blonda::mood
