// GENERERAD av tools/kategorier.py – ändra inte för hand.
#pragma once

namespace blonda::app {

constexpr int kNumPlants = 11;
constexpr int kNumFactory = 90;

struct PlantInfo { const char* id; const char* category; const char* name; float rvb, rsize, drive; };
inline constexpr PlantInfo kPlants[kNumPlants] = {
    {"iris", "PAD", "IRIS", 0.350f, 0.750f, 0.000f},
    {"gladiolus", "STRINGS", "GLADIOLUS", 0.300f, 0.650f, 0.000f},
    {"skaggiris", "POLY", "SKÄGGIRIS", 0.200f, 0.550f, 0.000f},
    {"kanna", "BRASS", "KANNA", 0.200f, 0.550f, 0.050f},
    {"strelitzia", "LEAD", "STRELITZIA", 0.180f, 0.500f, 0.100f},
    {"eukalyptus", "BASS", "EUKALYPTUS", 0.000f, 0.400f, 0.150f},
    {"solfjader", "PLUCK", "SOLFJÄDER", 0.220f, 0.500f, 0.000f},
    {"lilja", "BELL", "LILJA", 0.300f, 0.600f, 0.000f},
    {"amaryllis", "ARP", "AMARYLLIS", 0.180f, 0.500f, 0.000f},
    {"nattviol", "FX", "NATTVIOL", 0.400f, 0.850f, 0.000f},
    {"vitiris", "INIT", "VIT IRIS", 0.200f, 0.550f, 0.000f},
};

// växt för varje fabriksljud (index som i blonda-motor)
inline constexpr unsigned char kPresetPlant[kNumFactory] = {
    10, 2, 8, 8, 0, 5, 7, 1, 3, 6, 4, 6, 4, 4, 3, 5, 2, 9, 1, 8, 0, 2, 5, 9, 2, 5, 4, 9, 1, 1, 8, 7, 9, 7, 5, 0, 4, 3, 0, 8, 9, 2, 2, 5, 2, 4, 0, 0, 2, 5, 6, 2, 8, 0, 9, 5, 2, 1, 4, 6, 4, 8, 5, 0, 4, 0, 0, 1, 3, 3, 5, 5, 5, 5, 4, 4, 4, 6, 6, 2, 2, 9, 9, 7, 4, 4, 1, 0, 8, 7
};

// ljudlistans ordning (växt för växt)
inline constexpr unsigned char kBrowseOrder[kNumFactory] = {
    4, 20, 35, 38, 46, 47, 53, 63, 65, 66, 87, 7, 18, 28, 29, 57, 67, 86, 1, 16, 21, 24, 41, 42, 44, 48, 51, 56, 79, 80, 8, 14, 37, 68, 69, 10, 12, 13, 26, 36, 45, 58, 60, 64, 74, 75, 76, 84, 85, 5, 15, 22, 25, 34, 43, 49, 55, 62, 70, 71, 72, 73, 9, 11, 50, 59, 77, 78, 6, 31, 33, 83, 89, 2, 3, 19, 30, 39, 52, 61, 88, 17, 23, 27, 32, 40, 54, 81, 82, 0
};

struct ExtraParam { const char* id; const char* name; double min, max, def; };
constexpr int kNumExtra = 3;
inline constexpr ExtraParam kExtra[kNumExtra] = {
    {"rvb", "Reverb", 0.0, 1.0, 0.2},
    {"rsize", "Reverb Size", 0.0, 1.0, 0.55},
    {"drive", "Drive", 0.0, 1.0, 0.0},
};

// glid på tangenterna / MPE-slide (läge = index + 1)
struct GlidInfo { const char* id; const char* name; const char* param; double depth; bool rate; };
constexpr int kNumGlid = 5;
constexpr double kGlidRate = 0.6;
inline constexpr GlidInfo kGlid[kNumGlid] = {
    {"filter", "FILTER", "cut", 0.42, false},
    {"vibrato", "VIBRATO", "lfoosc", 0.28, true},
    {"tremolo", "TREMOLO", "lfoamp", 0.7, true},
    {"pwm", "PWM", "lfopwm", 0.8, false},
    {"wah", "WAH", "lfocut", 0.6, false},
};

}  // namespace blonda::app
