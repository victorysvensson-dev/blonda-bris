// GENERERAD FIL – ändra inte för hand. Källa: generator/sloja_ljud.py
#pragma once
#include "blonda/motor.h"

namespace blonda::sloja {

constexpr int kNumParams = 25;
enum ParamId {
    P_ton = 0,
    P_jamn = 1,
    P_sken = 2,
    P_glit = 3,
    P_andas = 4,
    P_form = 5,
    P_rorl = 6,
    P_bredd = 7,
    P_sub = 8,
    P_aa = 9,
    P_ad = 10,
    P_asus = 11,
    P_ar = 12,
    P_vela = 13,
    P_lage = 14,
    P_uniint = 15,
    P_porta = 16,
    P_detune = 17,
    P_mwosc = 18,
    P_chorus = 19,
    P_dtime = 20,
    P_dfb = 21,
    P_dmix = 22,
    P_bendr = 23,
    P_vol = 24,
};
inline const ParamInfo kParams[kNumParams] = {
    {"ton", "Tone", 0.0, 1.0, 0.5, false, false},
    {"jamn", "Odd / Even", 0.0, 1.0, 0.5, false, false},
    {"sken", "Shimmer", 0.0, 1.0, 0.3, false, false},
    {"glit", "Glitter", 0.0, 1.0, 0.3, false, false},
    {"andas", "Breath", 0.0, 1.0, 0.4, false, false},
    {"form", "Formant", 0.0, 1.0, 0.4, false, false},
    {"rorl", "Motion", 0.0, 1.0, 0.3, false, false},
    {"bredd", "Width", 0.0, 1.0, 0.7, false, false},
    {"sub", "Sub", 0.0, 1.0, 0.2, false, false},
    {"aa", "Attack", 0.0, 1.0, 0.55, false, false},
    {"ad", "Decay", 0.0, 1.0, 0.6, false, false},
    {"asus", "Sustain", 0.0, 1.0, 0.85, false, false},
    {"ar", "Release", 0.0, 1.0, 0.6, false, false},
    {"vela", "Velocity > Amp", 0.0, 1.0, 0.3, false, false},
    {"lage", "Voice Mode", 0.0, 3.0, 0.0, true, false},
    {"uniint", "Unison Interval", -12.0, 12.0, 0.0, true, false},
    {"porta", "Portamento", 0.0, 1.0, 0.0, false, false},
    {"detune", "Detune", 0.0, 1.0, 0.2, false, false},
    {"mwosc", "Wheel > Vibrato", 0.0, 1.0, 0.5, false, false},
    {"chorus", "Chorus", 0.0, 1.0, 0.4, false, false},
    {"dtime", "Delay Time", 0.0, 1.0, 0.5, false, false},
    {"dfb", "Delay Feedback", 0.0, 1.0, 0.4, false, false},
    {"dmix", "Delay Mix", 0.0, 1.0, 0.2, false, false},
    {"bendr", "Bend Range", 0.0, 12.0, 2.0, true, true},
    {"vol", "Volume", 0.0, 1.0, 0.7, false, true},
};

constexpr int kNumPresets = 7;
constexpr int kNumFactoryBank = 6;
inline const PresetValue kPresetValues[83] = {
    {0, 0.5}, {2, 0.55}, {3, 0.35}, {4, 0.5}, {5, 0.35}, {6, 0.3},
    {7, 0.85}, {8, 0.15}, {9, 0.62}, {12, 0.68}, {19, 0.5}, {22, 0.25},
    {20, 0.6}, {21, 0.45}, {0, 0.35}, {1, 0.45}, {2, 0.2}, {3, 0.1},
    {4, 0.7}, {5, 0.3}, {6, 0.22}, {8, 0.25}, {9, 0.66}, {12, 0.7},
    {19, 0.55}, {22, 0.15}, {0, 0.72}, {1, 0.6}, {2, 0.85}, {3, 0.85},
    {4, 0.3}, {5, 0.6}, {6, 0.5}, {8, 0.05}, {9, 0.5}, {12, 0.66},
    {19, 0.45}, {22, 0.35}, {20, 0.55}, {21, 0.5}, {0, 0.45}, {1, 0.4},
    {2, 0.15}, {3, 0.05}, {4, 0.85}, {5, 0.45}, {6, 0.35}, {8, 0.1},
    {9, 0.58}, {12, 0.62}, {17, 0.35}, {19, 0.7}, {22, 0.15}, {0, 0.25},
    {1, 0.3}, {2, 0.2}, {3, 0.15}, {4, 0.4}, {5, 0.2}, {6, 0.15},
    {8, 0.75}, {9, 0.65}, {12, 0.72}, {19, 0.5}, {22, 0.2}, {20, 0.7},
    {21, 0.5}, {0, 0.85}, {1, 0.15}, {2, 0.6}, {3, 0.5}, {4, 0.25},
    {5, 0.7}, {6, 0.4}, {8, 0.0}, {9, 0.35}, {10, 0.62}, {11, 0.6},
    {12, 0.62}, {19, 0.35}, {22, 0.3}, {20, 0.45}, {21, 0.45},
};
inline const PresetInfo kPresets[kNumPresets] = {
    {"init", 0, 0},
    {"polarljus", 0, 14},
    {"slöja", 14, 12},
    {"glitter", 26, 14},
    {"kör", 40, 13},
    {"djup", 53, 14},
    {"is", 67, 16},
};

}  // namespace blonda::sloja
