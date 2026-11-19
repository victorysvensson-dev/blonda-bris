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

struct ExtraParam { const char* id; const char* name; double min, max, def; bool integer; };
constexpr int kNumExtra = 99;
inline constexpr ExtraParam kExtra[kNumExtra] = {
    {"rvb", "Reverb", 0.0, 1.0, 0.2, false},
    {"rsize", "Reverb Size", 0.0, 1.0, 0.55, false},
    {"drive", "Drive", 0.0, 1.0, 0.0, false},
    {"mowet", "MOOD Wet", 0.0, 1.0, 0.0, true},
    {"mofrz", "MOOD Freeze", 0.0, 1.0, 0.0, true},
    {"mowmode", "MOOD Wet Mode", 0.0, 2.0, 0.0, true},
    {"motime", "MOOD Time", 0.0, 1.0, 0.55, false},
    {"mowmod", "MOOD Modify", 0.0, 1.0, 0.6, false},
    {"moblend", "MOOD Mix", 0.0, 1.0, 0.5, false},
    {"moclk", "MOOD Clock", 0.0, 1.0, 0.75, false},
    {"moloop", "MOOD Micro-Loop", 0.0, 1.0, 0.0, true},
    {"modub", "MOOD Overdub", 0.0, 1.0, 0.0, true},
    {"molmode", "MOOD Loop Mode", 0.0, 2.0, 1.0, true},
    {"molen", "MOOD Length", 0.0, 1.0, 1.0, false},
    {"molmod", "MOOD Loop Modify", 0.0, 1.0, 0.6875, false},
    {"morout", "MOOD Routing", 0.0, 2.0, 1.0, true},
    {"mosprd", "MOOD Spread", 0.0, 1.0, 0.0, true},
    {"motone", "MOOD Tone", 0.0, 1.0, 0.2, false},
    {"mowidth", "MOOD Stereo Width", 0.0, 1.0, 0.75, false},
    {"mofade", "MOOD Fade", 0.0, 1.0, 0.9, false},
    {"mohalf", "MOOD Loop Length", 0.0, 1.0, 0.0, true},
    {"mobal", "MOOD Level Balance", 0.0, 1.0, 0.5, false},
    {"modir", "MOOD Direct Micro-Loop", 0.0, 1.0, 0.5, false},
    {"mosmth", "MOOD Smooth Clock", 0.0, 1.0, 0.0, true},
    {"arp", "Arp", 0.0, 1.0, 0.0, true},
    {"arpm", "Arp Mode", 0.0, 3.0, 0.0, true},
    {"arpr", "Arp Rate", 0.0, 5.0, 3.0, true},
    {"arpo", "Arp Octaves", 1.0, 4.0, 1.0, true},
    {"arpg", "Arp Gate", 0.05, 1.0, 0.6, false},
    {"tape", "Tape", 0.0, 1.0, 0.0, true},
    {"tamedia", "TAPE Media", 0.0, 8.0, 0.0, true},
    {"taage", "TAPE Wear", 0.0, 1.0, 0.5, false},
    {"tawow", "TAPE Wow", 0.0, 1.0, 0.35, false},
    {"taflut", "TAPE Flutter", 0.0, 1.0, 0.3, false},
    {"tasat", "TAPE Saturation", 0.0, 1.0, 0.4, false},
    {"tabrus", "TAPE Noise", 0.0, 1.0, 0.3, false},
    {"taavbr", "TAPE Dropouts", 0.0, 1.0, 0.2, false},
    {"taton", "TAPE Tone", 0.0, 1.0, 0.5, false},
    {"tabredd", "TAPE Width", 0.0, 1.0, 1.0, false},
    {"tawet", "TAPE Mix", 0.0, 1.0, 1.0, false},
    {"taoutv", "TAPE Output", 0.0, 1.0, 0.75, false},
    {"tarec", "TAPE Rec Level", 0.0, 1.0, 0.6, false},
    {"motor", "Engine", 0.0, 3.0, 0.0, true},
    {"ogb16", "ORGEL Bourdon 16'", 0, 1, 0.4, false},
    {"ogp8", "ORGEL Principal 8'", 0, 1, 0.8, false},
    {"ogf8", "ORGEL Flute 8'", 0, 1, 0, false},
    {"ogp4", "ORGEL Octave 4'", 0, 1, 0.5, false},
    {"ogq223", "ORGEL Nasard 2 2/3'", 0, 1, 0, false},
    {"ogp2", "ORGEL Super Octave 2'", 0, 1, 0.3, false},
    {"ogt135", "ORGEL Tierce 1 3/5'", 0, 1, 0, false},
    {"ogmixt", "ORGEL Mixture IV", 0, 1, 0, false},
    {"ogtrp", "ORGEL Trumpet 8'", 0, 1, 0, false},
    {"ogcel", "ORGEL Celeste", 0, 1, 0, false},
    {"ogchf", "ORGEL Chiff", 0, 1, 0.4, false},
    {"ogvind", "ORGEL Wind", 0, 1, 0.25, false},
    {"ogton", "ORGEL Tone", 0, 1, 0.5, false},
    {"ogspk", "ORGEL Speech", 0, 1, 0.35, false},
    {"ogrel", "ORGEL Release", 0, 1, 0.35, false},
    {"ogtrem", "ORGEL Tremulant", 0, 1, 0, false},
    {"ogtrate", "ORGEL Tremulant Rate", 0, 1, 0.5, false},
    {"ogswell", "ORGEL Swell", 0, 1, 1, false},
    {"ogvela", "ORGEL Velocity > Amp", 0, 1, 0, false},
    {"oglage", "ORGEL Voice Mode", 0, 3, 0, true},
    {"oguniint", "ORGEL Unison Interval", -12, 12, 0, true},
    {"sjton", "SLÖJA Tone", 0, 1, 0.5, false},
    {"sjjamn", "SLÖJA Odd / Even", 0, 1, 0.5, false},
    {"sjsken", "SLÖJA Shimmer", 0, 1, 0.3, false},
    {"sjglit", "SLÖJA Glitter", 0, 1, 0.3, false},
    {"sjandas", "SLÖJA Breath", 0, 1, 0.4, false},
    {"sjform", "SLÖJA Formant", 0, 1, 0.4, false},
    {"sjrorl", "SLÖJA Motion", 0, 1, 0.3, false},
    {"sjbredd", "SLÖJA Width", 0, 1, 0.7, false},
    {"sjsub", "SLÖJA Sub", 0, 1, 0.2, false},
    {"sjaa", "SLÖJA Attack", 0, 1, 0.55, false},
    {"sjad", "SLÖJA Decay", 0, 1, 0.6, false},
    {"sjasus", "SLÖJA Sustain", 0, 1, 0.85, false},
    {"sjar", "SLÖJA Release", 0, 1, 0.6, false},
    {"sjvela", "SLÖJA Velocity > Amp", 0, 1, 0.3, false},
    {"sjlage", "SLÖJA Voice Mode", 0, 3, 0, true},
    {"sjuniint", "SLÖJA Unison Interval", -12, 12, 0, true},
    {"sjporta", "SLÖJA Portamento", 0, 1, 0, false},
    {"sjdetune", "SLÖJA Detune", 0, 1, 0.2, false},
    {"sjmwosc", "SLÖJA Wheel > Vibrato", 0, 1, 0.5, false},
    {"svtyp", "STAV Type", 0, 2, 0, true},
    {"svton", "STAV Tone", 0, 1, 0.5, false},
    {"svvelt", "STAV Velocity > Tone", 0, 1, 0.6, false},
    {"svbark", "STAV Bark", 0, 1, 0.3, false},
    {"svping", "STAV Ping", 0, 1, 0.3, false},
    {"svdecay", "STAV Decay", 0, 1, 0.5, false},
    {"svrel", "STAV Release", 0, 1, 0.3, false},
    {"svtrem", "STAV Tremolo", 0, 1, 0.3, false},
    {"svtrate", "STAV Tremolo Rate", 0, 1, 0.45, false},
    {"svmek", "STAV Mechanics", 0, 1, 0.2, false},
    {"svvela", "STAV Velocity > Amp", 0, 1, 0.7, false},
    {"svlage", "STAV Voice Mode", 0, 3, 0, true},
    {"svuniint", "STAV Unison Interval", -12, 12, 0, true},
    {"svporta", "STAV Portamento", 0, 1, 0, false},
    {"svdetune", "STAV Detune", 0, 1, 0.15, false},
    {"svmwosc", "STAV Wheel > Vibrato", 0, 1, 0.5, false},
};

// de hemliga patcharnas motorer (motor = index + 1); fabriksljuden har index efter BRIS
struct MotorInfo { const char* id; const char* name; const char* prefix; int firstPreset; int numPresets; };
constexpr int kNumMotorer = 3;
constexpr int kNumAllPresets = 110;
inline constexpr MotorInfo kMotorer[kNumMotorer] = {
    {"orgel", "ORGEL", "og", 90, 7},
    {"sloja", "SLÖJA", "sj", 97, 7},
    {"stav", "STAV", "sv", 104, 6},
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
