// GENERERAD FIL – ändra inte för hand. Källa: generator/orgel_ljud.py
#pragma once
#include "blonda/motor.h"

namespace blonda::orgel {

constexpr int kNumParams = 27;
enum ParamId {
    P_b16 = 0,
    P_p8 = 1,
    P_f8 = 2,
    P_p4 = 3,
    P_q223 = 4,
    P_p2 = 5,
    P_t135 = 6,
    P_mixt = 7,
    P_trp = 8,
    P_cel = 9,
    P_chf = 10,
    P_vind = 11,
    P_ton = 12,
    P_spk = 13,
    P_rel = 14,
    P_trem = 15,
    P_trate = 16,
    P_swell = 17,
    P_vela = 18,
    P_lage = 19,
    P_uniint = 20,
    P_chorus = 21,
    P_dtime = 22,
    P_dfb = 23,
    P_dmix = 24,
    P_bendr = 25,
    P_vol = 26,
};
inline const ParamInfo kParams[kNumParams] = {
    {"b16", "Bourdon 16'", 0.0, 1.0, 0.4, false, false},
    {"p8", "Principal 8'", 0.0, 1.0, 0.8, false, false},
    {"f8", "Flute 8'", 0.0, 1.0, 0.0, false, false},
    {"p4", "Octave 4'", 0.0, 1.0, 0.5, false, false},
    {"q223", "Nasard 2 2/3'", 0.0, 1.0, 0.0, false, false},
    {"p2", "Super Octave 2'", 0.0, 1.0, 0.3, false, false},
    {"t135", "Tierce 1 3/5'", 0.0, 1.0, 0.0, false, false},
    {"mixt", "Mixture IV", 0.0, 1.0, 0.0, false, false},
    {"trp", "Trumpet 8'", 0.0, 1.0, 0.0, false, false},
    {"cel", "Celeste", 0.0, 1.0, 0.0, false, false},
    {"chf", "Chiff", 0.0, 1.0, 0.4, false, false},
    {"vind", "Wind", 0.0, 1.0, 0.25, false, false},
    {"ton", "Tone", 0.0, 1.0, 0.5, false, false},
    {"spk", "Speech", 0.0, 1.0, 0.35, false, false},
    {"rel", "Release", 0.0, 1.0, 0.35, false, false},
    {"trem", "Tremulant", 0.0, 1.0, 0.0, false, false},
    {"trate", "Tremulant Rate", 0.0, 1.0, 0.5, false, false},
    {"swell", "Swell", 0.0, 1.0, 1.0, false, false},
    {"vela", "Velocity > Amp", 0.0, 1.0, 0.0, false, false},
    {"lage", "Voice Mode", 0.0, 3.0, 0.0, true, false},
    {"uniint", "Unison Interval", -12.0, 12.0, 0.0, true, false},
    {"chorus", "Chorus", 0.0, 1.0, 0.0, false, false},
    {"dtime", "Delay Time", 0.0, 1.0, 0.35, false, false},
    {"dfb", "Delay Feedback", 0.0, 1.0, 0.3, false, false},
    {"dmix", "Delay Mix", 0.0, 1.0, 0.0, false, false},
    {"bendr", "Bend Range", 0.0, 12.0, 2.0, true, true},
    {"vol", "Volume", 0.0, 1.0, 0.7, false, true},
};

constexpr int kNumPresets = 7;
constexpr int kNumFactoryBank = 6;
inline const PresetValue kPresetValues[67] = {
    {0, 0.55}, {1, 1.0}, {3, 0.8}, {5, 0.6}, {7, 0.7}, {8, 0.25},
    {10, 0.35}, {11, 0.2}, {12, 0.55}, {13, 0.4}, {14, 0.45}, {0, 0.0},
    {1, 0.0}, {2, 1.0}, {3, 0.35}, {5, 0.0}, {10, 0.6}, {11, 0.45},
    {12, 0.35}, {13, 0.3}, {15, 0.45}, {16, 0.45}, {17, 0.9}, {0, 0.0},
    {1, 1.0}, {3, 0.6}, {5, 0.0}, {10, 0.45}, {11, 0.25}, {12, 0.5},
    {0, 0.3}, {1, 0.8}, {2, 0.4}, {3, 0.6}, {4, 0.7}, {5, 0.5},
    {6, 0.6}, {10, 0.4}, {12, 0.6}, {0, 0.7}, {1, 1.0}, {2, 0.4},
    {3, 0.9}, {4, 0.4}, {5, 0.8}, {7, 0.9}, {8, 0.8}, {10, 0.3},
    {11, 0.15}, {12, 0.65}, {13, 0.45}, {14, 0.5}, {0, 0.0}, {1, 0.0},
    {2, 1.0}, {3, 0.0}, {5, 0.0}, {8, 0.55}, {9, 0.7}, {10, 0.15},
    {11, 0.3}, {12, 0.3}, {13, 0.5}, {14, 0.5}, {15, 0.6}, {16, 0.55},
    {17, 0.85},
};
inline const PresetInfo kPresets[kNumPresets] = {
    {"init", 0, 0},
    {"katedral", 0, 11},
    {"flöjt", 11, 12},
    {"principal", 23, 7},
    {"kornett", 30, 9},
    {"tutti", 39, 13},
    {"vox", 52, 15},
};

}  // namespace blonda::orgel
