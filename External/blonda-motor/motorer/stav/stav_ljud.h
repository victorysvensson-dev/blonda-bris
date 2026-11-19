// GENERERAD FIL – ändra inte för hand. Källa: generator/stav_ljud.py
#pragma once
#include "blonda/motor.h"

namespace blonda::stav {

constexpr int kNumParams = 22;
enum ParamId {
    P_typ = 0,
    P_ton = 1,
    P_velt = 2,
    P_bark = 3,
    P_ping = 4,
    P_decay = 5,
    P_rel = 6,
    P_trem = 7,
    P_trate = 8,
    P_mek = 9,
    P_vela = 10,
    P_lage = 11,
    P_uniint = 12,
    P_porta = 13,
    P_detune = 14,
    P_mwosc = 15,
    P_chorus = 16,
    P_dtime = 17,
    P_dfb = 18,
    P_dmix = 19,
    P_bendr = 20,
    P_vol = 21,
};
inline const ParamInfo kParams[kNumParams] = {
    {"typ", "Type", 0.0, 2.0, 0.0, true, false},
    {"ton", "Tone", 0.0, 1.0, 0.5, false, false},
    {"velt", "Velocity > Tone", 0.0, 1.0, 0.6, false, false},
    {"bark", "Bark", 0.0, 1.0, 0.3, false, false},
    {"ping", "Ping", 0.0, 1.0, 0.3, false, false},
    {"decay", "Decay", 0.0, 1.0, 0.5, false, false},
    {"rel", "Release", 0.0, 1.0, 0.3, false, false},
    {"trem", "Tremolo", 0.0, 1.0, 0.3, false, false},
    {"trate", "Tremolo Rate", 0.0, 1.0, 0.45, false, false},
    {"mek", "Mechanics", 0.0, 1.0, 0.2, false, false},
    {"vela", "Velocity > Amp", 0.0, 1.0, 0.7, false, false},
    {"lage", "Voice Mode", 0.0, 3.0, 0.0, true, false},
    {"uniint", "Unison Interval", -12.0, 12.0, 0.0, true, false},
    {"porta", "Portamento", 0.0, 1.0, 0.0, false, false},
    {"detune", "Detune", 0.0, 1.0, 0.15, false, false},
    {"mwosc", "Wheel > Vibrato", 0.0, 1.0, 0.5, false, false},
    {"chorus", "Chorus", 0.0, 1.0, 0.2, false, false},
    {"dtime", "Delay Time", 0.0, 1.0, 0.4, false, false},
    {"dfb", "Delay Feedback", 0.0, 1.0, 0.3, false, false},
    {"dmix", "Delay Mix", 0.0, 1.0, 0.0, false, false},
    {"bendr", "Bend Range", 0.0, 12.0, 2.0, true, true},
    {"vol", "Volume", 0.0, 1.0, 0.7, false, true},
};

constexpr int kNumPresets = 6;
constexpr int kNumFactoryBank = 5;
inline const PresetValue kPresetValues[59] = {
    {0, 0.0}, {1, 0.42}, {3, 0.35}, {4, 0.25}, {5, 0.55}, {6, 0.32},
    {7, 0.45}, {8, 0.38}, {9, 0.25}, {16, 0.25}, {19, 0.15}, {17, 0.45},
    {0, 0.0}, {1, 0.22}, {2, 0.4}, {3, 0.1}, {4, 0.12}, {5, 0.62},
    {6, 0.45}, {7, 0.25}, {8, 0.3}, {9, 0.15}, {16, 0.4}, {19, 0.12},
    {17, 0.5}, {0, 1.0}, {1, 0.5}, {2, 0.7}, {3, 0.45}, {4, 0.2},
    {5, 0.5}, {6, 0.25}, {7, 0.35}, {8, 0.55}, {9, 0.3}, {16, 0.1},
    {0, 2.0}, {1, 0.5}, {2, 0.5}, {3, 0.05}, {4, 0.55}, {5, 0.6},
    {6, 0.4}, {7, 0.0}, {9, 0.05}, {16, 0.55}, {19, 0.25}, {17, 0.5},
    {18, 0.4}, {0, 0.0}, {1, 0.7}, {2, 0.75}, {3, 0.7}, {4, 0.35},
    {5, 0.45}, {6, 0.25}, {7, 0.0}, {9, 0.35}, {16, 0.1},
};
inline const PresetInfo kPresets[kNumPresets] = {
    {"init", 0, 0},
    {"nattåg", 0, 12},
    {"sovvagn", 12, 13},
    {"tunga", 25, 11},
    {"glaspiano", 36, 13},
    {"perrong", 49, 10},
};

}  // namespace blonda::stav
