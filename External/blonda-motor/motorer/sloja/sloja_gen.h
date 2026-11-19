// GENERERAD FIL – ändra inte för hand.
// Källa: generator/sloja.py
// Översatt med generator/genexpr2cpp.py från samma GenExpr som Max for Live-pluggen kör.
#pragma once
#include "blonda/gen_runtime.h"
#include <cstring>

namespace blonda::sloja {

struct SlojaDsp {
    static constexpr int kNumOutputs = 6;
    static constexpr int kNumGenParams = 46;
    double samplerate = 48000.0;
    gen::Noise rng;

    // Param (sätts utifrån)
    double ton = 0.5;
    double jamn = 0.5;
    double sken = 0.3;
    double glit = 0.3;
    double andas = 0.4;
    double form = 0.4;
    double rorl = 0.3;
    double bredd = 0.7;
    double sub = 0.2;
    double aa = 0.55;
    double ad = 0.6;
    double asus = 0.85;
    double ar = 0.6;
    double vela = 0.3;
    double lage = 0.0;
    double uniint = 0.0;
    double porta = 0.0;
    double detune = 0.2;
    double mwosc = 0.5;
    double chorus = 0.4;
    double dtime = 0.5;
    double dfb = 0.4;
    double dmix = 0.2;
    double bendr = 2.0;
    double vol = 0.7;
    double bend = 0.0;
    double mw = 0.0;
    double at = 0.0;
    double n0 = 60.0;
    double g0 = 0.0;
    double t0 = 0.0;
    double n1 = 60.0;
    double g1 = 0.0;
    double t1 = 0.0;
    double n2 = 60.0;
    double g2 = 0.0;
    double t2 = 0.0;
    double n3 = 60.0;
    double g3 = 0.0;
    double t3 = 0.0;
    double n4 = 60.0;
    double g4 = 0.0;
    double t4 = 0.0;
    double n5 = 60.0;
    double g5 = 0.0;
    double t5 = 0.0;

    // History (tillstånd mellan sampel)
    double m_lp0 = 0.0;
    double m_lp1 = 0.125;
    double m_lp2 = 0.25;
    double m_lp3 = 0.375;
    double m_lp4 = 0.5;
    double m_lp5 = 0.625;
    double m_lp6 = 0.75;
    double m_lp7 = 0.875;
    double m_vph = 0.0;
    double m_pk = 0.0;
    double m_ci = 0.0;
    double m_cp0 = 0.0;
    double m_cp1 = 0.25;
    double m_cp2 = 0.5;
    double m_cp3 = 0.75;
    double m_dw = 0.0;
    double m_sDt = 0.3;
    double m_dlpL = 0.0;
    double m_dlpR = 0.0;
    double m_dcxL = 0.0;
    double m_dcyL = 0.0;
    double m_dcxR = 0.0;
    double m_dcyR = 0.0;
    double m_v0_lt = 0.0;
    double m_v0_s2 = 0.0;
    double m_v0_e2 = 0.0;
    double m_v0_vel = 0.0;
    double m_v0_pn = 60.0;
    double m_v0_ph = 0.0;
    double m_v1_lt = 0.0;
    double m_v1_s2 = 0.0;
    double m_v1_e2 = 0.0;
    double m_v1_vel = 0.0;
    double m_v1_pn = 60.0;
    double m_v1_ph = 0.0;
    double m_v2_lt = 0.0;
    double m_v2_s2 = 0.0;
    double m_v2_e2 = 0.0;
    double m_v2_vel = 0.0;
    double m_v2_pn = 60.0;
    double m_v2_ph = 0.0;
    double m_v3_lt = 0.0;
    double m_v3_s2 = 0.0;
    double m_v3_e2 = 0.0;
    double m_v3_vel = 0.0;
    double m_v3_pn = 60.0;
    double m_v3_ph = 0.0;
    double m_v4_lt = 0.0;
    double m_v4_s2 = 0.0;
    double m_v4_e2 = 0.0;
    double m_v4_vel = 0.0;
    double m_v4_pn = 60.0;
    double m_v4_ph = 0.0;
    double m_v5_lt = 0.0;
    double m_v5_s2 = 0.0;
    double m_v5_e2 = 0.0;
    double m_v5_vel = 0.0;
    double m_v5_pn = 60.0;
    double m_v5_ph = 0.0;

    // Data (minnesbuffertar)
    gen::Data chb{4096, 2};
    gen::Data dlb{52000, 2};

    // nollställ allt tillstånd (som när gen~ laddas)
    void reset() {
        m_lp0 = 0.0;
        m_lp1 = 0.125;
        m_lp2 = 0.25;
        m_lp3 = 0.375;
        m_lp4 = 0.5;
        m_lp5 = 0.625;
        m_lp6 = 0.75;
        m_lp7 = 0.875;
        m_vph = 0.0;
        m_pk = 0.0;
        m_ci = 0.0;
        m_cp0 = 0.0;
        m_cp1 = 0.25;
        m_cp2 = 0.5;
        m_cp3 = 0.75;
        m_dw = 0.0;
        m_sDt = 0.3;
        m_dlpL = 0.0;
        m_dlpR = 0.0;
        m_dcxL = 0.0;
        m_dcyL = 0.0;
        m_dcxR = 0.0;
        m_dcyR = 0.0;
        m_v0_lt = 0.0;
        m_v0_s2 = 0.0;
        m_v0_e2 = 0.0;
        m_v0_vel = 0.0;
        m_v0_pn = 60.0;
        m_v0_ph = 0.0;
        m_v1_lt = 0.0;
        m_v1_s2 = 0.0;
        m_v1_e2 = 0.0;
        m_v1_vel = 0.0;
        m_v1_pn = 60.0;
        m_v1_ph = 0.0;
        m_v2_lt = 0.0;
        m_v2_s2 = 0.0;
        m_v2_e2 = 0.0;
        m_v2_vel = 0.0;
        m_v2_pn = 60.0;
        m_v2_ph = 0.0;
        m_v3_lt = 0.0;
        m_v3_s2 = 0.0;
        m_v3_e2 = 0.0;
        m_v3_vel = 0.0;
        m_v3_pn = 60.0;
        m_v3_ph = 0.0;
        m_v4_lt = 0.0;
        m_v4_s2 = 0.0;
        m_v4_e2 = 0.0;
        m_v4_vel = 0.0;
        m_v4_pn = 60.0;
        m_v4_ph = 0.0;
        m_v5_lt = 0.0;
        m_v5_s2 = 0.0;
        m_v5_e2 = 0.0;
        m_v5_vel = 0.0;
        m_v5_pn = 60.0;
        m_v5_ph = 0.0;
        chb.clear();
        dlb.clear();
        rng = gen::Noise();
    }

    // pekare till en Param via namn (nullptr om den inte finns)
    double* param(const char* name) {
        if (std::strcmp(name, "ton") == 0) return &ton;
        if (std::strcmp(name, "jamn") == 0) return &jamn;
        if (std::strcmp(name, "sken") == 0) return &sken;
        if (std::strcmp(name, "glit") == 0) return &glit;
        if (std::strcmp(name, "andas") == 0) return &andas;
        if (std::strcmp(name, "form") == 0) return &form;
        if (std::strcmp(name, "rorl") == 0) return &rorl;
        if (std::strcmp(name, "bredd") == 0) return &bredd;
        if (std::strcmp(name, "sub") == 0) return &sub;
        if (std::strcmp(name, "aa") == 0) return &aa;
        if (std::strcmp(name, "ad") == 0) return &ad;
        if (std::strcmp(name, "asus") == 0) return &asus;
        if (std::strcmp(name, "ar") == 0) return &ar;
        if (std::strcmp(name, "vela") == 0) return &vela;
        if (std::strcmp(name, "lage") == 0) return &lage;
        if (std::strcmp(name, "uniint") == 0) return &uniint;
        if (std::strcmp(name, "porta") == 0) return &porta;
        if (std::strcmp(name, "detune") == 0) return &detune;
        if (std::strcmp(name, "mwosc") == 0) return &mwosc;
        if (std::strcmp(name, "chorus") == 0) return &chorus;
        if (std::strcmp(name, "dtime") == 0) return &dtime;
        if (std::strcmp(name, "dfb") == 0) return &dfb;
        if (std::strcmp(name, "dmix") == 0) return &dmix;
        if (std::strcmp(name, "bendr") == 0) return &bendr;
        if (std::strcmp(name, "vol") == 0) return &vol;
        if (std::strcmp(name, "bend") == 0) return &bend;
        if (std::strcmp(name, "mw") == 0) return &mw;
        if (std::strcmp(name, "at") == 0) return &at;
        if (std::strcmp(name, "n0") == 0) return &n0;
        if (std::strcmp(name, "g0") == 0) return &g0;
        if (std::strcmp(name, "t0") == 0) return &t0;
        if (std::strcmp(name, "n1") == 0) return &n1;
        if (std::strcmp(name, "g1") == 0) return &g1;
        if (std::strcmp(name, "t1") == 0) return &t1;
        if (std::strcmp(name, "n2") == 0) return &n2;
        if (std::strcmp(name, "g2") == 0) return &g2;
        if (std::strcmp(name, "t2") == 0) return &t2;
        if (std::strcmp(name, "n3") == 0) return &n3;
        if (std::strcmp(name, "g3") == 0) return &g3;
        if (std::strcmp(name, "t3") == 0) return &t3;
        if (std::strcmp(name, "n4") == 0) return &n4;
        if (std::strcmp(name, "g4") == 0) return &g4;
        if (std::strcmp(name, "t4") == 0) return &t4;
        if (std::strcmp(name, "n5") == 0) return &n5;
        if (std::strcmp(name, "g5") == 0) return &g5;
        if (std::strcmp(name, "t5") == 0) return &t5;
        return nullptr;
    }

    // ett sampel; out får kNumOutputs värden
    inline void perform(double* out) {
        double f0 = 0.0, f1 = 0.0, f2 = 0.0, f3 = 0.0, m_B1 = 0.0, m_B10 = 0.0, m_B11 = 0.0, m_B12 = 0.0;
        double m_B13 = 0.0, m_B14 = 0.0, m_B15 = 0.0, m_B16 = 0.0, m_B2 = 0.0, m_B3 = 0.0, m_B4 = 0.0, m_B5 = 0.0;
        double m_B6 = 0.0, m_B7 = 0.0, m_B8 = 0.0, m_B9 = 0.0, m_LC0 = 0.0, m_LC1 = 0.0, m_LC2 = 0.0, m_LC3 = 0.0;
        double m_LC4 = 0.0, m_LC5 = 0.0, m_LC6 = 0.0, m_LC7 = 0.0, m_LS0 = 0.0, m_LS1 = 0.0, m_LS2 = 0.0, m_LS3 = 0.0;
        double m_LS4 = 0.0, m_LS5 = 0.0, m_LS6 = 0.0, m_LS7 = 0.0, m_aA = 0.0, m_aD = 0.0, m_aR = 0.0, m_amp = 0.0;
        double m_br = 0.0, m_bs = 0.0, m_c2 = 0.0, m_cL = 0.0, m_cR = 0.0, m_cb = 0.0, m_cd = 0.0, m_cg = 0.0;
        double m_dd = 0.0, m_dg = 0.0, m_ev = 0.0, m_fart = 0.0, m_fbk = 0.0, m_fbr = 0.0, m_fh = 0.0, m_fpos = 0.0;
        double m_gv = 0.0, m_i0 = 0.0, m_i1 = 0.0, m_i2 = 0.0, m_i3 = 0.0, m_jamna = 0.0, m_lfo = 0.0, m_mask = 0.0;
        double m_md = 0.0, m_me = 0.0, m_norm = 0.0, m_oL = 0.0, m_oR = 0.0, m_ou = 0.0, m_pl = 0.0, m_pn = 0.0;
        double m_pr = 0.0, m_r0 = 0.0, m_r1 = 0.0, m_r2 = 0.0, m_r3 = 0.0, m_rd = 0.0, m_rf = 0.0, m_ri = 0.0;
        double m_s1 = 0.0, m_s10 = 0.0, m_s11 = 0.0, m_s12 = 0.0, m_s13 = 0.0, m_s14 = 0.0, m_s15 = 0.0, m_s16 = 0.0;
        double m_s17 = 0.0, m_s18 = 0.0, m_s19 = 0.0, m_s2 = 0.0, m_s20 = 0.0, m_s21 = 0.0, m_s22 = 0.0, m_s23 = 0.0;
        double m_s24 = 0.0, m_s25 = 0.0, m_s26 = 0.0, m_s27 = 0.0, m_s28 = 0.0, m_s29 = 0.0, m_s3 = 0.0, m_s30 = 0.0;
        double m_s31 = 0.0, m_s32 = 0.0, m_s4 = 0.0, m_s5 = 0.0, m_s6 = 0.0, m_s7 = 0.0, m_s8 = 0.0, m_s9 = 0.0;
        double m_spread = 0.0, m_sr = 0.0, m_tilt = 0.0, m_tp0 = 0.0, m_tp1 = 0.0, m_tp2 = 0.0, m_tp3 = 0.0, m_udda = 0.0;
        double m_ug = 0.0, m_vib = 0.0, m_wL = 0.0, m_wR = 0.0, m_xL = 0.0, m_xR = 0.0, m_y = 0.0;
        m_sr = samplerate;
        m_md = gen::clamp(std::floor(lage + 0.5), 0.0, 3.0);
        m_aA = 0.001 * std::pow(10000.0, aa);
        m_aD = (1.0 - std::exp(-1.0 / (m_sr * 0.0012 * std::pow(10000.0, ad))));
        m_aR = (1.0 - std::exp(-1.0 / (m_sr * 0.0012 * std::pow(10000.0, ar))));
        m_cg = porta > 0.001 ? 1.0 - std::exp(-1.0 / (m_sr * 0.0015 * std::pow(1300.0, porta))) : 1.0;
        m_fart = 1.0 + rorl * rorl * 12.0;
        m_lp0 = gen::wrap(m_lp0 + 0.031 * m_fart / m_sr, 0.0, 1.0);
        m_LS0 = std::sin(gen::kTwoPi * m_lp0);
        m_LC0 = std::cos(gen::kTwoPi * m_lp0);
        m_lp1 = gen::wrap(m_lp1 + 0.047 * m_fart / m_sr, 0.0, 1.0);
        m_LS1 = std::sin(gen::kTwoPi * m_lp1);
        m_LC1 = std::cos(gen::kTwoPi * m_lp1);
        m_lp2 = gen::wrap(m_lp2 + 0.059 * m_fart / m_sr, 0.0, 1.0);
        m_LS2 = std::sin(gen::kTwoPi * m_lp2);
        m_LC2 = std::cos(gen::kTwoPi * m_lp2);
        m_lp3 = gen::wrap(m_lp3 + 0.073 * m_fart / m_sr, 0.0, 1.0);
        m_LS3 = std::sin(gen::kTwoPi * m_lp3);
        m_LC3 = std::cos(gen::kTwoPi * m_lp3);
        m_lp4 = gen::wrap(m_lp4 + 0.089 * m_fart / m_sr, 0.0, 1.0);
        m_LS4 = std::sin(gen::kTwoPi * m_lp4);
        m_LC4 = std::cos(gen::kTwoPi * m_lp4);
        m_lp5 = gen::wrap(m_lp5 + 0.107 * m_fart / m_sr, 0.0, 1.0);
        m_LS5 = std::sin(gen::kTwoPi * m_lp5);
        m_LC5 = std::cos(gen::kTwoPi * m_lp5);
        m_lp6 = gen::wrap(m_lp6 + 0.127 * m_fart / m_sr, 0.0, 1.0);
        m_LS6 = std::sin(gen::kTwoPi * m_lp6);
        m_LC6 = std::cos(gen::kTwoPi * m_lp6);
        m_lp7 = gen::wrap(m_lp7 + 0.151 * m_fart / m_sr, 0.0, 1.0);
        m_LS7 = std::sin(gen::kTwoPi * m_lp7);
        m_LC7 = std::cos(gen::kTwoPi * m_lp7);
        m_vph = gen::wrap(m_vph + 5.2 / m_sr, 0.0, 1.0);
        m_lfo = std::sin(gen::kTwoPi * m_vph);
        m_vib = (mw + at) * mwosc * 0.3 * m_lfo;
        m_bs = bend * bendr;
        m_tilt = 1.9 - 1.6 * ton;
        m_udda = gen::min(1.0, (1.0 - jamn) * 2.0);
        m_jamna = gen::min(1.0, jamn * 2.0);
        m_fpos = 2.0 + form * 10.0 + andas * 4.0 * m_LS0;
        m_fbr = 3.0 + andas * 3.0;
        m_B1 = std::exp(-m_tilt * 0.000000) * 1.0 * (1.0 + 2.2 * std::exp(-(1.0 - m_fpos) * (1.0 - m_fpos) / m_fbr));
        m_B2 = std::exp(-m_tilt * 0.693147) * m_jamna * (1.0 + 2.2 * std::exp(-(2.0 - m_fpos) * (2.0 - m_fpos) / m_fbr));
        m_B3 = std::exp(-m_tilt * 1.098612) * m_udda * (1.0 + 2.2 * std::exp(-(3.0 - m_fpos) * (3.0 - m_fpos) / m_fbr));
        m_B4 = std::exp(-m_tilt * 1.386294) * m_jamna * (1.0 + 2.2 * std::exp(-(4.0 - m_fpos) * (4.0 - m_fpos) / m_fbr));
        m_B5 = std::exp(-m_tilt * 1.609438) * m_udda * (1.0 + 2.2 * std::exp(-(5.0 - m_fpos) * (5.0 - m_fpos) / m_fbr)) * (1.0 + sken * 0.4 * (0.6 + 0.4 * m_LS5));
        m_B6 = std::exp(-m_tilt * 1.791759) * m_jamna * (1.0 + 2.2 * std::exp(-(6.0 - m_fpos) * (6.0 - m_fpos) / m_fbr)) * (1.0 + sken * 1.6 * (0.6 + 0.4 * m_LS6));
        m_B7 = std::exp(-m_tilt * 1.945910) * m_udda * (1.0 + 2.2 * std::exp(-(7.0 - m_fpos) * (7.0 - m_fpos) / m_fbr)) * (1.0 + sken * 0.4 * (0.6 + 0.4 * m_LS7));
        m_B8 = std::exp(-m_tilt * 2.079442) * m_jamna * (1.0 + 2.2 * std::exp(-(8.0 - m_fpos) * (8.0 - m_fpos) / m_fbr)) * (1.0 + sken * 1.6 * (0.6 + 0.4 * m_LS0));
        m_B9 = std::exp(-m_tilt * 2.197225) * m_udda * (1.0 + 2.2 * std::exp(-(9.0 - m_fpos) * (9.0 - m_fpos) / m_fbr)) * (1.0 + sken * 0.4 * (0.6 + 0.4 * m_LS1));
        m_B10 = std::exp(-m_tilt * 2.302585) * m_jamna * (1.0 + 2.2 * std::exp(-(10.0 - m_fpos) * (10.0 - m_fpos) / m_fbr)) * (1.0 + sken * 1.6 * (0.6 + 0.4 * m_LS2));
        m_B11 = std::exp(-m_tilt * 2.397895) * m_udda * (1.0 + 2.2 * std::exp(-(11.0 - m_fpos) * (11.0 - m_fpos) / m_fbr)) * (1.0 + sken * 0.4 * (0.6 + 0.4 * m_LS3));
        m_B12 = std::exp(-m_tilt * 2.484907) * m_jamna * (1.0 + 2.2 * std::exp(-(12.0 - m_fpos) * (12.0 - m_fpos) / m_fbr)) * (1.0 + sken * 1.6 * (0.6 + 0.4 * m_LS4));
        m_B13 = std::exp(-m_tilt * 2.564949) * m_udda * (1.0 + 2.2 * std::exp(-(13.0 - m_fpos) * (13.0 - m_fpos) / m_fbr)) * (1.0 + sken * 0.4 * (0.6 + 0.4 * m_LS5));
        m_B14 = std::exp(-m_tilt * 2.639057) * m_jamna * (1.0 + 2.2 * std::exp(-(14.0 - m_fpos) * (14.0 - m_fpos) / m_fbr)) * (1.0 + sken * 1.6 * (0.6 + 0.4 * m_LS6));
        m_B15 = std::exp(-m_tilt * 2.708050) * m_udda * (1.0 + 2.2 * std::exp(-(15.0 - m_fpos) * (15.0 - m_fpos) / m_fbr)) * (1.0 + sken * 0.4 * (0.6 + 0.4 * m_LS7));
        m_B16 = std::exp(-m_tilt * 2.772589) * m_jamna * (1.0 + 2.2 * std::exp(-(16.0 - m_fpos) * (16.0 - m_fpos) / m_fbr)) * (1.0 + sken * 1.6 * (0.6 + 0.4 * m_LS0));
        m_norm = 0.17 / std::sqrt(0.015 + m_B1 * m_B1 + m_B2 * m_B2 + m_B3 * m_B3 + m_B4 * m_B4 + m_B5 * m_B5 + m_B6 * m_B6 + m_B7 * m_B7 + m_B8 * m_B8 + m_B9 * m_B9 + m_B10 * m_B10 + m_B11 * m_B11 + m_B12 * m_B12 + m_B13 * m_B13 + m_B14 * m_B14 + m_B15 * m_B15 + m_B16 * m_B16 + sub * sub * 0.5);
        m_spread = m_md == 0.0 ? 1.0 : (m_md == 3.0 ? 0.55 : 0.0);
        m_br = bredd * 0.7 * (m_md == 1.0 ? 0.0 : 1.0);
        m_ug = m_md == 3.0 ? 0.42 : (m_md == 2.0 ? 1.5 : 1.0);
        m_xL = 0.0;
        m_xR = 0.0;
        m_mask = 0.0;
        m_me = 0.0;
        if (t0 != m_v0_lt) { m_v0_lt = t0; m_v0_s2 = 1.0; m_v0_vel = g0; }
        if (g0 <= 0.0 && m_v0_s2 > 0.0 && m_v0_s2 < 3.0) { m_v0_s2 = 3.0; }
        if (m_v0_s2 == 1.0) { m_v0_e2 = m_v0_e2 + 1.0 / (m_sr * m_aA); if (m_v0_e2 >= 1.0) { m_v0_e2 = 1.0; m_v0_s2 = 2.0; } }
        else if (m_v0_s2 == 2.0) { m_v0_e2 = m_v0_e2 + (asus - m_v0_e2) * m_aD; }
        else if (m_v0_s2 == 3.0) { m_v0_e2 = m_v0_e2 - m_v0_e2 * m_aR; if (m_v0_e2 < 0.0002) { m_v0_e2 = 0.0; m_v0_s2 = 0.0; } }
        if (m_v0_s2 > 0.0) {
          m_v0_pn = m_v0_pn + (n0 + detune * detune * 0.5 * -1.0 - m_v0_pn) * m_cg;
          m_pn = m_v0_pn + m_bs + m_vib + detune * 0.08 * (m_LS0 * 0.771578 + m_LC0 * 0.636135);
          m_fh = gen::clamp(440.0 * std::pow(2.0, (m_pn - 69.0) / 12.0), 4.0, m_sr * 0.45) * 0.5;
          m_v0_ph = gen::wrap(m_v0_ph + m_fh / m_sr, 0.0, 1.0);
          m_y = gen::kTwoPi * m_v0_ph;
          m_s1 = std::sin(m_y);
          m_c2 = 2.0 * std::cos(m_y);
          m_s2 = m_c2 * m_s1;
          m_s3 = m_c2 * m_s2 - m_s1;
          m_s4 = m_c2 * m_s3 - m_s2;
          m_s5 = m_c2 * m_s4 - m_s3;
          m_s6 = m_c2 * m_s5 - m_s4;
          m_s7 = m_c2 * m_s6 - m_s5;
          m_s8 = m_c2 * m_s7 - m_s6;
          m_s9 = m_c2 * m_s8 - m_s7;
          m_s10 = m_c2 * m_s9 - m_s8;
          m_s11 = m_c2 * m_s10 - m_s9;
          m_s12 = m_c2 * m_s11 - m_s10;
          m_s13 = m_c2 * m_s12 - m_s11;
          m_s14 = m_c2 * m_s13 - m_s12;
          m_s15 = m_c2 * m_s14 - m_s13;
          m_s16 = m_c2 * m_s15 - m_s14;
          m_s17 = m_c2 * m_s16 - m_s15;
          m_s18 = m_c2 * m_s17 - m_s16;
          m_s19 = m_c2 * m_s18 - m_s17;
          m_s20 = m_c2 * m_s19 - m_s18;
          m_s21 = m_c2 * m_s20 - m_s19;
          m_s22 = m_c2 * m_s21 - m_s20;
          m_s23 = m_c2 * m_s22 - m_s21;
          m_s24 = m_c2 * m_s23 - m_s22;
          m_s25 = m_c2 * m_s24 - m_s23;
          m_s26 = m_c2 * m_s25 - m_s24;
          m_s27 = m_c2 * m_s26 - m_s25;
          m_s28 = m_c2 * m_s27 - m_s26;
          m_s29 = m_c2 * m_s28 - m_s27;
          m_s30 = m_c2 * m_s29 - m_s28;
          m_s31 = m_c2 * m_s30 - m_s29;
          m_s32 = m_c2 * m_s31 - m_s30;
          m_ou = m_B1 * (0.55 + 0.45 * (m_LS1 * 0.711085 + m_LC1 * 0.703106)) * gen::clamp((0.42 - m_fh * 2.0 / m_sr) * 12.0, 0.0, 1.0) * m_s2 + m_B3 * (0.55 + 0.45 * (m_LS3 * -0.695037 + m_LC3 * 0.718974)) * gen::clamp((0.42 - m_fh * 6.0 / m_sr) * 12.0, 0.0, 1.0) * m_s6 + m_B5 * (0.55 + 0.45 * (m_LS5 * -0.726771 + m_LC5 * -0.686880)) * gen::clamp((0.42 - m_fh * 10.0 / m_sr) * 12.0, 0.0, 1.0) * m_s10 + m_B7 * (0.55 + 0.45 * (m_LS7 * 0.678635 + m_LC7 * -0.734476)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS7 * 0.678635 + m_LC7 * -0.734476)), 14.0)) * gen::clamp((0.42 - m_fh * 14.0 / m_sr) * 12.0, 0.0, 1.0) * m_s14 + m_B9 * (0.55 + 0.45 * (m_LS1 * 0.742087 + m_LC1 * 0.670303)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS1 * 0.742087 + m_LC1 * 0.670303)), 14.0)) * gen::clamp((0.42 - m_fh * 18.0 / m_sr) * 12.0, 0.0, 1.0) * m_s18 + m_B11 * (0.55 + 0.45 * (m_LS3 * -0.661887 + m_LC3 * 0.749604)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS3 * -0.661887 + m_LC3 * 0.749604)), 14.0)) * gen::clamp((0.42 - m_fh * 22.0 / m_sr) * 12.0, 0.0, 1.0) * m_s22 + m_B13 * (0.55 + 0.45 * (m_LS5 * -0.757025 + m_LC5 * -0.653386)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS5 * -0.757025 + m_LC5 * -0.653386)), 14.0)) * gen::clamp((0.42 - m_fh * 26.0 / m_sr) * 12.0, 0.0, 1.0) * m_s26 + m_B15 * (0.55 + 0.45 * (m_LS7 * 0.644802 + m_LC7 * -0.764350)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS7 * 0.644802 + m_LC7 * -0.764350)), 14.0)) * gen::clamp((0.42 - m_fh * 30.0 / m_sr) * 12.0, 0.0, 1.0) * m_s30;
          m_ev = m_B2 * (0.55 + 0.45 * (m_LS2 * 0.011284 + m_LC2 * 0.999936)) * gen::clamp((0.42 - m_fh * 4.0 / m_sr) * 12.0, 0.0, 1.0) * m_s4 + m_B4 * (0.55 + 0.45 * (m_LS4 * -0.999745 + m_LC4 * 0.022567)) * gen::clamp((0.42 - m_fh * 8.0 / m_sr) * 12.0, 0.0, 1.0) * m_s8 + m_B6 * (0.55 + 0.45 * (m_LS6 * -0.033847 + m_LC6 * -0.999427)) * gen::clamp((0.42 - m_fh * 12.0 / m_sr) * 12.0, 0.0, 1.0) * m_s12 + m_B8 * (0.55 + 0.45 * (m_LS0 * 0.998981 + m_LC0 * -0.045123)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS0 * 0.998981 + m_LC0 * -0.045123)), 14.0)) * gen::clamp((0.42 - m_fh * 16.0 / m_sr) * 12.0, 0.0, 1.0) * m_s16 + m_B10 * (0.55 + 0.45 * (m_LS2 * 0.056393 + m_LC2 * 0.998409)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS2 * 0.056393 + m_LC2 * 0.998409)), 14.0)) * gen::clamp((0.42 - m_fh * 20.0 / m_sr) * 12.0, 0.0, 1.0) * m_s20 + m_B12 * (0.55 + 0.45 * (m_LS4 * -0.997709 + m_LC4 * 0.067656)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS4 * -0.997709 + m_LC4 * 0.067656)), 14.0)) * gen::clamp((0.42 - m_fh * 24.0 / m_sr) * 12.0, 0.0, 1.0) * m_s24 + m_B14 * (0.55 + 0.45 * (m_LS6 * -0.078910 + m_LC6 * -0.996882)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS6 * -0.078910 + m_LC6 * -0.996882)), 14.0)) * gen::clamp((0.42 - m_fh * 28.0 / m_sr) * 12.0, 0.0, 1.0) * m_s28 + m_B16 * (0.55 + 0.45 * (m_LS0 * 0.995928 + m_LC0 * -0.090154)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS0 * 0.995928 + m_LC0 * -0.090154)), 14.0)) * gen::clamp((0.42 - m_fh * 32.0 / m_sr) * 12.0, 0.0, 1.0) * m_s32 + sub * m_s1;
          m_amp = m_v0_e2 * (1.0 - vela + vela * m_v0_vel) * m_norm * m_ug;
          m_pl = 1.0 - m_spread * 0.0;
          m_pr = 1.0 - m_spread * 0.85;
          m_xL = m_xL + (m_ou * (1.0 + m_br) + m_ev * (1.0 - m_br)) * m_amp * m_pl;
          m_xR = m_xR + (m_ou * (1.0 - m_br) + m_ev * (1.0 + m_br)) * m_amp * m_pr;
          m_me = gen::max(m_me, m_v0_e2);
          m_mask = m_mask + 1.0;
        }
        if (t1 != m_v1_lt) { m_v1_lt = t1; m_v1_s2 = 1.0; m_v1_vel = g1; }
        if (g1 <= 0.0 && m_v1_s2 > 0.0 && m_v1_s2 < 3.0) { m_v1_s2 = 3.0; }
        if (m_v1_s2 == 1.0) { m_v1_e2 = m_v1_e2 + 1.0 / (m_sr * m_aA); if (m_v1_e2 >= 1.0) { m_v1_e2 = 1.0; m_v1_s2 = 2.0; } }
        else if (m_v1_s2 == 2.0) { m_v1_e2 = m_v1_e2 + (asus - m_v1_e2) * m_aD; }
        else if (m_v1_s2 == 3.0) { m_v1_e2 = m_v1_e2 - m_v1_e2 * m_aR; if (m_v1_e2 < 0.0002) { m_v1_e2 = 0.0; m_v1_s2 = 0.0; } }
        if (m_v1_s2 > 0.0) {
          m_v1_pn = m_v1_pn + (n1 + detune * detune * 0.5 * 1.0 - m_v1_pn) * m_cg;
          m_pn = m_v1_pn + m_bs + m_vib + detune * 0.08 * (m_LS1 * -0.920163 + m_LC1 * 0.391536);
          m_fh = gen::clamp(440.0 * std::pow(2.0, (m_pn - 69.0) / 12.0), 4.0, m_sr * 0.45) * 0.5;
          m_v1_ph = gen::wrap(m_v1_ph + m_fh / m_sr, 0.0, 1.0);
          m_y = gen::kTwoPi * m_v1_ph;
          m_s1 = std::sin(m_y);
          m_c2 = 2.0 * std::cos(m_y);
          m_s2 = m_c2 * m_s1;
          m_s3 = m_c2 * m_s2 - m_s1;
          m_s4 = m_c2 * m_s3 - m_s2;
          m_s5 = m_c2 * m_s4 - m_s3;
          m_s6 = m_c2 * m_s5 - m_s4;
          m_s7 = m_c2 * m_s6 - m_s5;
          m_s8 = m_c2 * m_s7 - m_s6;
          m_s9 = m_c2 * m_s8 - m_s7;
          m_s10 = m_c2 * m_s9 - m_s8;
          m_s11 = m_c2 * m_s10 - m_s9;
          m_s12 = m_c2 * m_s11 - m_s10;
          m_s13 = m_c2 * m_s12 - m_s11;
          m_s14 = m_c2 * m_s13 - m_s12;
          m_s15 = m_c2 * m_s14 - m_s13;
          m_s16 = m_c2 * m_s15 - m_s14;
          m_s17 = m_c2 * m_s16 - m_s15;
          m_s18 = m_c2 * m_s17 - m_s16;
          m_s19 = m_c2 * m_s18 - m_s17;
          m_s20 = m_c2 * m_s19 - m_s18;
          m_s21 = m_c2 * m_s20 - m_s19;
          m_s22 = m_c2 * m_s21 - m_s20;
          m_s23 = m_c2 * m_s22 - m_s21;
          m_s24 = m_c2 * m_s23 - m_s22;
          m_s25 = m_c2 * m_s24 - m_s23;
          m_s26 = m_c2 * m_s25 - m_s24;
          m_s27 = m_c2 * m_s26 - m_s25;
          m_s28 = m_c2 * m_s27 - m_s26;
          m_s29 = m_c2 * m_s28 - m_s27;
          m_s30 = m_c2 * m_s29 - m_s28;
          m_s31 = m_c2 * m_s30 - m_s29;
          m_s32 = m_c2 * m_s31 - m_s30;
          m_ou = m_B1 * (0.55 + 0.45 * (m_LS1 * -0.951714 + m_LC1 * 0.306985)) * gen::clamp((0.42 - m_fh * 2.0 / m_sr) * 12.0, 0.0, 1.0) * m_s2 + m_B3 * (0.55 + 0.45 * (m_LS3 * -0.317705 + m_LC3 * -0.948190)) * gen::clamp((0.42 - m_fh * 6.0 / m_sr) * 12.0, 0.0, 1.0) * m_s6 + m_B5 * (0.55 + 0.45 * (m_LS5 * 0.944544 + m_LC5 * -0.328384)) * gen::clamp((0.42 - m_fh * 10.0 / m_sr) * 12.0, 0.0, 1.0) * m_s10 + m_B7 * (0.55 + 0.45 * (m_LS7 * 0.339022 + m_LC7 * 0.940779)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS7 * 0.339022 + m_LC7 * 0.940779)), 14.0)) * gen::clamp((0.42 - m_fh * 14.0 / m_sr) * 12.0, 0.0, 1.0) * m_s14 + m_B9 * (0.55 + 0.45 * (m_LS1 * -0.936893 + m_LC1 * 0.349616)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS1 * -0.936893 + m_LC1 * 0.349616)), 14.0)) * gen::clamp((0.42 - m_fh * 18.0 / m_sr) * 12.0, 0.0, 1.0) * m_s18 + m_B11 * (0.55 + 0.45 * (m_LS3 * -0.360166 + m_LC3 * -0.932888)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS3 * -0.360166 + m_LC3 * -0.932888)), 14.0)) * gen::clamp((0.42 - m_fh * 22.0 / m_sr) * 12.0, 0.0, 1.0) * m_s22 + m_B13 * (0.55 + 0.45 * (m_LS5 * 0.928765 + m_LC5 * -0.370670)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS5 * 0.928765 + m_LC5 * -0.370670)), 14.0)) * gen::clamp((0.42 - m_fh * 26.0 / m_sr) * 12.0, 0.0, 1.0) * m_s26 + m_B15 * (0.55 + 0.45 * (m_LS7 * 0.381127 + m_LC7 * 0.924523)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS7 * 0.381127 + m_LC7 * 0.924523)), 14.0)) * gen::clamp((0.42 - m_fh * 30.0 / m_sr) * 12.0, 0.0, 1.0) * m_s30;
          m_ev = m_B2 * (0.55 + 0.45 * (m_LS2 * -0.892593 + m_LC2 * -0.450864)) * gen::clamp((0.42 - m_fh * 4.0 / m_sr) * 12.0, 0.0, 1.0) * m_s4 + m_B4 * (0.55 + 0.45 * (m_LS4 * 0.440763 + m_LC4 * -0.897624)) * gen::clamp((0.42 - m_fh * 8.0 / m_sr) * 12.0, 0.0, 1.0) * m_s8 + m_B6 * (0.55 + 0.45 * (m_LS6 * 0.902540 + m_LC6 * 0.430606)) * gen::clamp((0.42 - m_fh * 12.0 / m_sr) * 12.0, 0.0, 1.0) * m_s12 + m_B8 * (0.55 + 0.45 * (m_LS0 * -0.420394 + m_LC0 * 0.907342)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS0 * -0.420394 + m_LC0 * 0.907342)), 14.0)) * gen::clamp((0.42 - m_fh * 16.0 / m_sr) * 12.0, 0.0, 1.0) * m_s16 + m_B10 * (0.55 + 0.45 * (m_LS2 * -0.912028 + m_LC2 * -0.410128)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS2 * -0.912028 + m_LC2 * -0.410128)), 14.0)) * gen::clamp((0.42 - m_fh * 20.0 / m_sr) * 12.0, 0.0, 1.0) * m_s20 + m_B12 * (0.55 + 0.45 * (m_LS4 * 0.399810 + m_LC4 * -0.916598)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS4 * 0.399810 + m_LC4 * -0.916598)), 14.0)) * gen::clamp((0.42 - m_fh * 24.0 / m_sr) * 12.0, 0.0, 1.0) * m_s24 + m_B14 * (0.55 + 0.45 * (m_LS6 * 0.921051 + m_LC6 * 0.389442)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS6 * 0.921051 + m_LC6 * 0.389442)), 14.0)) * gen::clamp((0.42 - m_fh * 28.0 / m_sr) * 12.0, 0.0, 1.0) * m_s28 + m_B16 * (0.55 + 0.45 * (m_LS0 * -0.379023 + m_LC0 * 0.925387)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS0 * -0.379023 + m_LC0 * 0.925387)), 14.0)) * gen::clamp((0.42 - m_fh * 32.0 / m_sr) * 12.0, 0.0, 1.0) * m_s32 + sub * m_s1;
          m_amp = m_v1_e2 * (1.0 - vela + vela * m_v1_vel) * m_norm * m_ug;
          m_pl = 1.0 - m_spread * 0.85;
          m_pr = 1.0 - m_spread * 0.0;
          m_xL = m_xL + (m_ou * (1.0 + m_br) + m_ev * (1.0 - m_br)) * m_amp * m_pl;
          m_xR = m_xR + (m_ou * (1.0 - m_br) + m_ev * (1.0 + m_br)) * m_amp * m_pr;
          m_me = gen::max(m_me, m_v1_e2);
          m_mask = m_mask + 2.0;
        }
        if (t2 != m_v2_lt) { m_v2_lt = t2; m_v2_s2 = 1.0; m_v2_vel = g2; }
        if (g2 <= 0.0 && m_v2_s2 > 0.0 && m_v2_s2 < 3.0) { m_v2_s2 = 3.0; }
        if (m_v2_s2 == 1.0) { m_v2_e2 = m_v2_e2 + 1.0 / (m_sr * m_aA); if (m_v2_e2 >= 1.0) { m_v2_e2 = 1.0; m_v2_s2 = 2.0; } }
        else if (m_v2_s2 == 2.0) { m_v2_e2 = m_v2_e2 + (asus - m_v2_e2) * m_aD; }
        else if (m_v2_s2 == 3.0) { m_v2_e2 = m_v2_e2 - m_v2_e2 * m_aR; if (m_v2_e2 < 0.0002) { m_v2_e2 = 0.0; m_v2_s2 = 0.0; } }
        if (m_v2_s2 > 0.0) {
          m_v2_pn = m_v2_pn + (n2 + detune * detune * 0.5 * -0.6 - m_v2_pn) * m_cg;
          m_pn = m_v2_pn + m_bs + m_vib + detune * 0.08 * (m_LS2 * 0.076642 + m_LC2 * -0.997059);
          m_fh = gen::clamp(440.0 * std::pow(2.0, (m_pn - 69.0) / 12.0), 4.0, m_sr * 0.45) * 0.5;
          m_v2_ph = gen::wrap(m_v2_ph + m_fh / m_sr, 0.0, 1.0);
          m_y = gen::kTwoPi * m_v2_ph;
          m_s1 = std::sin(m_y);
          m_c2 = 2.0 * std::cos(m_y);
          m_s2 = m_c2 * m_s1;
          m_s3 = m_c2 * m_s2 - m_s1;
          m_s4 = m_c2 * m_s3 - m_s2;
          m_s5 = m_c2 * m_s4 - m_s3;
          m_s6 = m_c2 * m_s5 - m_s4;
          m_s7 = m_c2 * m_s6 - m_s5;
          m_s8 = m_c2 * m_s7 - m_s6;
          m_s9 = m_c2 * m_s8 - m_s7;
          m_s10 = m_c2 * m_s9 - m_s8;
          m_s11 = m_c2 * m_s10 - m_s9;
          m_s12 = m_c2 * m_s11 - m_s10;
          m_s13 = m_c2 * m_s12 - m_s11;
          m_s14 = m_c2 * m_s13 - m_s12;
          m_s15 = m_c2 * m_s14 - m_s13;
          m_s16 = m_c2 * m_s15 - m_s14;
          m_s17 = m_c2 * m_s16 - m_s15;
          m_s18 = m_c2 * m_s17 - m_s16;
          m_s19 = m_c2 * m_s18 - m_s17;
          m_s20 = m_c2 * m_s19 - m_s18;
          m_s21 = m_c2 * m_s20 - m_s19;
          m_s22 = m_c2 * m_s21 - m_s20;
          m_s23 = m_c2 * m_s22 - m_s21;
          m_s24 = m_c2 * m_s23 - m_s22;
          m_s25 = m_c2 * m_s24 - m_s23;
          m_s26 = m_c2 * m_s25 - m_s24;
          m_s27 = m_c2 * m_s26 - m_s25;
          m_s28 = m_c2 * m_s27 - m_s26;
          m_s29 = m_c2 * m_s28 - m_s27;
          m_s30 = m_c2 * m_s29 - m_s28;
          m_s31 = m_c2 * m_s30 - m_s29;
          m_s32 = m_c2 * m_s31 - m_s30;
          m_ou = m_B1 * (0.55 + 0.45 * (m_LS1 * 0.166219 + m_LC1 * -0.986089)) * gen::clamp((0.42 - m_fh * 2.0 / m_sr) * 12.0, 0.0, 1.0) * m_s2 + m_B3 * (0.55 + 0.45 * (m_LS3 * 0.987902 + m_LC3 * 0.155081)) * gen::clamp((0.42 - m_fh * 6.0 / m_sr) * 12.0, 0.0, 1.0) * m_s6 + m_B5 * (0.55 + 0.45 * (m_LS5 * -0.143924 + m_LC5 * 0.989589)) * gen::clamp((0.42 - m_fh * 10.0 / m_sr) * 12.0, 0.0, 1.0) * m_s10 + m_B7 * (0.55 + 0.45 * (m_LS7 * -0.991150 + m_LC7 * -0.132748)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS7 * -0.991150 + m_LC7 * -0.132748)), 14.0)) * gen::clamp((0.42 - m_fh * 14.0 / m_sr) * 12.0, 0.0, 1.0) * m_s14 + m_B9 * (0.55 + 0.45 * (m_LS1 * 0.121555 + m_LC1 * -0.992585)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS1 * 0.121555 + m_LC1 * -0.992585)), 14.0)) * gen::clamp((0.42 - m_fh * 18.0 / m_sr) * 12.0, 0.0, 1.0) * m_s18 + m_B11 * (0.55 + 0.45 * (m_LS3 * 0.993893 + m_LC3 * 0.110346)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS3 * 0.993893 + m_LC3 * 0.110346)), 14.0)) * gen::clamp((0.42 - m_fh * 22.0 / m_sr) * 12.0, 0.0, 1.0) * m_s22 + m_B13 * (0.55 + 0.45 * (m_LS5 * -0.099124 + m_LC5 * 0.995075)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS5 * -0.099124 + m_LC5 * 0.995075)), 14.0)) * gen::clamp((0.42 - m_fh * 26.0 / m_sr) * 12.0, 0.0, 1.0) * m_s26 + m_B15 * (0.55 + 0.45 * (m_LS7 * -0.996130 + m_LC7 * -0.087889)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS7 * -0.996130 + m_LC7 * -0.087889)), 14.0)) * gen::clamp((0.42 - m_fh * 30.0 / m_sr) * 12.0, 0.0, 1.0) * m_s30;
          m_ev = m_B2 * (0.55 + 0.45 * (m_LS2 * 0.811521 + m_LC2 * -0.584323)) * gen::clamp((0.42 - m_fh * 4.0 / m_sr) * 12.0, 0.0, 1.0) * m_s4 + m_B4 * (0.55 + 0.45 * (m_LS4 * 0.593444 + m_LC4 * 0.804876)) * gen::clamp((0.42 - m_fh * 8.0 / m_sr) * 12.0, 0.0, 1.0) * m_s8 + m_B6 * (0.55 + 0.45 * (m_LS6 * -0.798128 + m_LC6 * 0.602488)) * gen::clamp((0.42 - m_fh * 12.0 / m_sr) * 12.0, 0.0, 1.0) * m_s12 + m_B8 * (0.55 + 0.45 * (m_LS0 * -0.611456 + m_LC0 * -0.791278)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS0 * -0.611456 + m_LC0 * -0.791278)), 14.0)) * gen::clamp((0.42 - m_fh * 16.0 / m_sr) * 12.0, 0.0, 1.0) * m_s16 + m_B10 * (0.55 + 0.45 * (m_LS2 * 0.784328 + m_LC2 * -0.620346)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS2 * 0.784328 + m_LC2 * -0.620346)), 14.0)) * gen::clamp((0.42 - m_fh * 20.0 / m_sr) * 12.0, 0.0, 1.0) * m_s20 + m_B12 * (0.55 + 0.45 * (m_LS4 * 0.629158 + m_LC4 * 0.777278)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS4 * 0.629158 + m_LC4 * 0.777278)), 14.0)) * gen::clamp((0.42 - m_fh * 24.0 / m_sr) * 12.0, 0.0, 1.0) * m_s24 + m_B14 * (0.55 + 0.45 * (m_LS6 * -0.770129 + m_LC6 * 0.637889)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS6 * -0.770129 + m_LC6 * 0.637889)), 14.0)) * gen::clamp((0.42 - m_fh * 28.0 / m_sr) * 12.0, 0.0, 1.0) * m_s28 + m_B16 * (0.55 + 0.45 * (m_LS0 * -0.646538 + m_LC0 * -0.762881)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS0 * -0.646538 + m_LC0 * -0.762881)), 14.0)) * gen::clamp((0.42 - m_fh * 32.0 / m_sr) * 12.0, 0.0, 1.0) * m_s32 + sub * m_s1;
          m_amp = m_v2_e2 * (1.0 - vela + vela * m_v2_vel) * m_norm * m_ug;
          m_pl = 1.0 - m_spread * 0.0;
          m_pr = 1.0 - m_spread * 0.5;
          m_xL = m_xL + (m_ou * (1.0 + m_br) + m_ev * (1.0 - m_br)) * m_amp * m_pl;
          m_xR = m_xR + (m_ou * (1.0 - m_br) + m_ev * (1.0 + m_br)) * m_amp * m_pr;
          m_me = gen::max(m_me, m_v2_e2);
          m_mask = m_mask + 4.0;
        }
        if (t3 != m_v3_lt) { m_v3_lt = t3; m_v3_s2 = 1.0; m_v3_vel = g3; }
        if (g3 <= 0.0 && m_v3_s2 > 0.0 && m_v3_s2 < 3.0) { m_v3_s2 = 3.0; }
        if (m_v3_s2 == 1.0) { m_v3_e2 = m_v3_e2 + 1.0 / (m_sr * m_aA); if (m_v3_e2 >= 1.0) { m_v3_e2 = 1.0; m_v3_s2 = 2.0; } }
        else if (m_v3_s2 == 2.0) { m_v3_e2 = m_v3_e2 + (asus - m_v3_e2) * m_aD; }
        else if (m_v3_s2 == 3.0) { m_v3_e2 = m_v3_e2 - m_v3_e2 * m_aR; if (m_v3_e2 < 0.0002) { m_v3_e2 = 0.0; m_v3_s2 = 0.0; } }
        if (m_v3_s2 > 0.0) {
          m_v3_pn = m_v3_pn + (n3 + detune * detune * 0.5 * 0.6 - m_v3_pn) * m_cg;
          m_pn = m_v3_pn + m_bs + m_vib + detune * 0.08 * (m_LS3 * 0.849513 + m_LC3 * 0.527568);
          m_fh = gen::clamp(440.0 * std::pow(2.0, (m_pn - 69.0) / 12.0), 4.0, m_sr * 0.45) * 0.5;
          m_v3_ph = gen::wrap(m_v3_ph + m_fh / m_sr, 0.0, 1.0);
          m_y = gen::kTwoPi * m_v3_ph;
          m_s1 = std::sin(m_y);
          m_c2 = 2.0 * std::cos(m_y);
          m_s2 = m_c2 * m_s1;
          m_s3 = m_c2 * m_s2 - m_s1;
          m_s4 = m_c2 * m_s3 - m_s2;
          m_s5 = m_c2 * m_s4 - m_s3;
          m_s6 = m_c2 * m_s5 - m_s4;
          m_s7 = m_c2 * m_s6 - m_s5;
          m_s8 = m_c2 * m_s7 - m_s6;
          m_s9 = m_c2 * m_s8 - m_s7;
          m_s10 = m_c2 * m_s9 - m_s8;
          m_s11 = m_c2 * m_s10 - m_s9;
          m_s12 = m_c2 * m_s11 - m_s10;
          m_s13 = m_c2 * m_s12 - m_s11;
          m_s14 = m_c2 * m_s13 - m_s12;
          m_s15 = m_c2 * m_s14 - m_s13;
          m_s16 = m_c2 * m_s15 - m_s14;
          m_s17 = m_c2 * m_s16 - m_s15;
          m_s18 = m_c2 * m_s17 - m_s16;
          m_s19 = m_c2 * m_s18 - m_s17;
          m_s20 = m_c2 * m_s19 - m_s18;
          m_s21 = m_c2 * m_s20 - m_s19;
          m_s22 = m_c2 * m_s21 - m_s20;
          m_s23 = m_c2 * m_s22 - m_s21;
          m_s24 = m_c2 * m_s23 - m_s22;
          m_s25 = m_c2 * m_s24 - m_s23;
          m_s26 = m_c2 * m_s25 - m_s24;
          m_s27 = m_c2 * m_s26 - m_s25;
          m_s28 = m_c2 * m_s27 - m_s26;
          m_s29 = m_c2 * m_s28 - m_s27;
          m_s30 = m_c2 * m_s29 - m_s28;
          m_s31 = m_c2 * m_s30 - m_s29;
          m_s32 = m_c2 * m_s31 - m_s30;
          m_ou = m_B1 * (0.55 + 0.45 * (m_LS1 * 0.798491 + m_LC1 * 0.602007)) * gen::clamp((0.42 - m_fh * 2.0 / m_sr) * 12.0, 0.0, 1.0) * m_s2 + m_B3 * (0.55 + 0.45 * (m_LS3 * -0.592958 + m_LC3 * 0.805233)) * gen::clamp((0.42 - m_fh * 6.0 / m_sr) * 12.0, 0.0, 1.0) * m_s6 + m_B5 * (0.55 + 0.45 * (m_LS5 * -0.811873 + m_LC5 * -0.583834)) * gen::clamp((0.42 - m_fh * 10.0 / m_sr) * 12.0, 0.0, 1.0) * m_s10 + m_B7 * (0.55 + 0.45 * (m_LS7 * 0.574635 + m_LC7 * -0.818410)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS7 * 0.574635 + m_LC7 * -0.818410)), 14.0)) * gen::clamp((0.42 - m_fh * 14.0 / m_sr) * 12.0, 0.0, 1.0) * m_s14 + m_B9 * (0.55 + 0.45 * (m_LS1 * 0.824842 + m_LC1 * 0.565363)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS1 * 0.824842 + m_LC1 * 0.565363)), 14.0)) * gen::clamp((0.42 - m_fh * 18.0 / m_sr) * 12.0, 0.0, 1.0) * m_s18 + m_B11 * (0.55 + 0.45 * (m_LS3 * -0.556019 + m_LC3 * 0.831169)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS3 * -0.556019 + m_LC3 * 0.831169)), 14.0)) * gen::clamp((0.42 - m_fh * 22.0 / m_sr) * 12.0, 0.0, 1.0) * m_s22 + m_B13 * (0.55 + 0.45 * (m_LS5 * -0.837391 + m_LC5 * -0.546605)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS5 * -0.837391 + m_LC5 * -0.546605)), 14.0)) * gen::clamp((0.42 - m_fh * 26.0 / m_sr) * 12.0, 0.0, 1.0) * m_s26 + m_B15 * (0.55 + 0.45 * (m_LS7 * 0.537121 + m_LC7 * -0.843505)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS7 * 0.537121 + m_LC7 * -0.843505)), 14.0)) * gen::clamp((0.42 - m_fh * 30.0 / m_sr) * 12.0, 0.0, 1.0) * m_s30;
          m_ev = m_B2 * (0.55 + 0.45 * (m_LS2 * 0.144521 + m_LC2 * 0.989502)) * gen::clamp((0.42 - m_fh * 4.0 / m_sr) * 12.0, 0.0, 1.0) * m_s4 + m_B4 * (0.55 + 0.45 * (m_LS4 * -0.987808 + m_LC4 * 0.155677)) * gen::clamp((0.42 - m_fh * 8.0 / m_sr) * 12.0, 0.0, 1.0) * m_s8 + m_B6 * (0.55 + 0.45 * (m_LS6 * -0.166814 + m_LC6 * -0.985988)) * gen::clamp((0.42 - m_fh * 12.0 / m_sr) * 12.0, 0.0, 1.0) * m_s12 + m_B8 * (0.55 + 0.45 * (m_LS0 * 0.984043 + m_LC0 * -0.177930)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS0 * 0.984043 + m_LC0 * -0.177930)), 14.0)) * gen::clamp((0.42 - m_fh * 16.0 / m_sr) * 12.0, 0.0, 1.0) * m_s16 + m_B10 * (0.55 + 0.45 * (m_LS2 * 0.189023 + m_LC2 * 0.981973)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS2 * 0.189023 + m_LC2 * 0.981973)), 14.0)) * gen::clamp((0.42 - m_fh * 20.0 / m_sr) * 12.0, 0.0, 1.0) * m_s20 + m_B12 * (0.55 + 0.45 * (m_LS4 * -0.979777 + m_LC4 * 0.200092)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS4 * -0.979777 + m_LC4 * 0.200092)), 14.0)) * gen::clamp((0.42 - m_fh * 24.0 / m_sr) * 12.0, 0.0, 1.0) * m_s24 + m_B14 * (0.55 + 0.45 * (m_LS6 * -0.211135 + m_LC6 * -0.977457)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS6 * -0.211135 + m_LC6 * -0.977457)), 14.0)) * gen::clamp((0.42 - m_fh * 28.0 / m_sr) * 12.0, 0.0, 1.0) * m_s28 + m_B16 * (0.55 + 0.45 * (m_LS0 * 0.975012 + m_LC0 * -0.222152)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS0 * 0.975012 + m_LC0 * -0.222152)), 14.0)) * gen::clamp((0.42 - m_fh * 32.0 / m_sr) * 12.0, 0.0, 1.0) * m_s32 + sub * m_s1;
          m_amp = m_v3_e2 * (1.0 - vela + vela * m_v3_vel) * m_norm * m_ug;
          m_pl = 1.0 - m_spread * 0.5;
          m_pr = 1.0 - m_spread * 0.0;
          m_xL = m_xL + (m_ou * (1.0 + m_br) + m_ev * (1.0 - m_br)) * m_amp * m_pl;
          m_xR = m_xR + (m_ou * (1.0 - m_br) + m_ev * (1.0 + m_br)) * m_amp * m_pr;
          m_me = gen::max(m_me, m_v3_e2);
          m_mask = m_mask + 8.0;
        }
        if (t4 != m_v4_lt) { m_v4_lt = t4; m_v4_s2 = 1.0; m_v4_vel = g4; }
        if (g4 <= 0.0 && m_v4_s2 > 0.0 && m_v4_s2 < 3.0) { m_v4_s2 = 3.0; }
        if (m_v4_s2 == 1.0) { m_v4_e2 = m_v4_e2 + 1.0 / (m_sr * m_aA); if (m_v4_e2 >= 1.0) { m_v4_e2 = 1.0; m_v4_s2 = 2.0; } }
        else if (m_v4_s2 == 2.0) { m_v4_e2 = m_v4_e2 + (asus - m_v4_e2) * m_aD; }
        else if (m_v4_s2 == 3.0) { m_v4_e2 = m_v4_e2 - m_v4_e2 * m_aR; if (m_v4_e2 < 0.0002) { m_v4_e2 = 0.0; m_v4_s2 = 0.0; } }
        if (m_v4_s2 > 0.0) {
          m_v4_pn = m_v4_pn + (n4 + detune * detune * 0.5 * -0.2 - m_v4_pn) * m_cg;
          m_pn = m_v4_pn + m_bs + m_vib + detune * 0.08 * (m_LS4 * -0.859736 + m_LC4 * 0.510739);
          m_fh = gen::clamp(440.0 * std::pow(2.0, (m_pn - 69.0) / 12.0), 4.0, m_sr * 0.45) * 0.5;
          m_v4_ph = gen::wrap(m_v4_ph + m_fh / m_sr, 0.0, 1.0);
          m_y = gen::kTwoPi * m_v4_ph;
          m_s1 = std::sin(m_y);
          m_c2 = 2.0 * std::cos(m_y);
          m_s2 = m_c2 * m_s1;
          m_s3 = m_c2 * m_s2 - m_s1;
          m_s4 = m_c2 * m_s3 - m_s2;
          m_s5 = m_c2 * m_s4 - m_s3;
          m_s6 = m_c2 * m_s5 - m_s4;
          m_s7 = m_c2 * m_s6 - m_s5;
          m_s8 = m_c2 * m_s7 - m_s6;
          m_s9 = m_c2 * m_s8 - m_s7;
          m_s10 = m_c2 * m_s9 - m_s8;
          m_s11 = m_c2 * m_s10 - m_s9;
          m_s12 = m_c2 * m_s11 - m_s10;
          m_s13 = m_c2 * m_s12 - m_s11;
          m_s14 = m_c2 * m_s13 - m_s12;
          m_s15 = m_c2 * m_s14 - m_s13;
          m_s16 = m_c2 * m_s15 - m_s14;
          m_s17 = m_c2 * m_s16 - m_s15;
          m_s18 = m_c2 * m_s17 - m_s16;
          m_s19 = m_c2 * m_s18 - m_s17;
          m_s20 = m_c2 * m_s19 - m_s18;
          m_s21 = m_c2 * m_s20 - m_s19;
          m_s22 = m_c2 * m_s21 - m_s20;
          m_s23 = m_c2 * m_s22 - m_s21;
          m_s24 = m_c2 * m_s23 - m_s22;
          m_s25 = m_c2 * m_s24 - m_s23;
          m_s26 = m_c2 * m_s25 - m_s24;
          m_s27 = m_c2 * m_s26 - m_s25;
          m_s28 = m_c2 * m_s27 - m_s26;
          m_s29 = m_c2 * m_s28 - m_s27;
          m_s30 = m_c2 * m_s29 - m_s28;
          m_s31 = m_c2 * m_s30 - m_s29;
          m_s32 = m_c2 * m_s31 - m_s30;
          m_ou = m_B1 * (0.55 + 0.45 * (m_LS1 * -0.902280 + m_LC1 * 0.431150)) * gen::clamp((0.42 - m_fh * 2.0 / m_sr) * 12.0, 0.0, 1.0) * m_s2 + m_B3 * (0.55 + 0.45 * (m_LS3 * -0.441304 + m_LC3 * -0.897358)) * gen::clamp((0.42 - m_fh * 6.0 / m_sr) * 12.0, 0.0, 1.0) * m_s6 + m_B5 * (0.55 + 0.45 * (m_LS5 * 0.892321 + m_LC5 * -0.451402)) * gen::clamp((0.42 - m_fh * 10.0 / m_sr) * 12.0, 0.0, 1.0) * m_s10 + m_B7 * (0.55 + 0.45 * (m_LS7 * 0.461443 + m_LC7 * 0.887170)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS7 * 0.461443 + m_LC7 * 0.887170)), 14.0)) * gen::clamp((0.42 - m_fh * 14.0 / m_sr) * 12.0, 0.0, 1.0) * m_s14 + m_B9 * (0.55 + 0.45 * (m_LS1 * -0.881906 + m_LC1 * 0.471424)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS1 * -0.881906 + m_LC1 * 0.471424)), 14.0)) * gen::clamp((0.42 - m_fh * 18.0 / m_sr) * 12.0, 0.0, 1.0) * m_s18 + m_B11 * (0.55 + 0.45 * (m_LS3 * -0.481346 + m_LC3 * -0.876531)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS3 * -0.481346 + m_LC3 * -0.876531)), 14.0)) * gen::clamp((0.42 - m_fh * 22.0 / m_sr) * 12.0, 0.0, 1.0) * m_s22 + m_B13 * (0.55 + 0.45 * (m_LS5 * 0.871043 + m_LC5 * -0.491207)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS5 * 0.871043 + m_LC5 * -0.491207)), 14.0)) * gen::clamp((0.42 - m_fh * 26.0 / m_sr) * 12.0, 0.0, 1.0) * m_s26 + m_B15 * (0.55 + 0.45 * (m_LS7 * 0.501005 + m_LC7 * 0.865445)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS7 * 0.501005 + m_LC7 * 0.865445)), 14.0)) * gen::clamp((0.42 - m_fh * 30.0 / m_sr) * 12.0, 0.0, 1.0) * m_s30;
          m_ev = m_B2 * (0.55 + 0.45 * (m_LS2 * -0.944742 + m_LC2 * -0.327814)) * gen::clamp((0.42 - m_fh * 4.0 / m_sr) * 12.0, 0.0, 1.0) * m_s4 + m_B4 * (0.55 + 0.45 * (m_LS4 * 0.317133 + m_LC4 * -0.948381)) * gen::clamp((0.42 - m_fh * 8.0 / m_sr) * 12.0, 0.0, 1.0) * m_s8 + m_B6 * (0.55 + 0.45 * (m_LS6 * 0.951899 + m_LC6 * 0.306410)) * gen::clamp((0.42 - m_fh * 12.0 / m_sr) * 12.0, 0.0, 1.0) * m_s12 + m_B8 * (0.55 + 0.45 * (m_LS0 * -0.295649 + m_LC0 * 0.955297)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS0 * -0.295649 + m_LC0 * 0.955297)), 14.0)) * gen::clamp((0.42 - m_fh * 16.0 / m_sr) * 12.0, 0.0, 1.0) * m_s16 + m_B10 * (0.55 + 0.45 * (m_LS2 * -0.958572 + m_LC2 * -0.284851)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS2 * -0.958572 + m_LC2 * -0.284851)), 14.0)) * gen::clamp((0.42 - m_fh * 20.0 / m_sr) * 12.0, 0.0, 1.0) * m_s20 + m_B12 * (0.55 + 0.45 * (m_LS4 * 0.274016 + m_LC4 * -0.961725)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS4 * 0.274016 + m_LC4 * -0.961725)), 14.0)) * gen::clamp((0.42 - m_fh * 24.0 / m_sr) * 12.0, 0.0, 1.0) * m_s24 + m_B14 * (0.55 + 0.45 * (m_LS6 * 0.964756 + m_LC6 * 0.263146)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS6 * 0.964756 + m_LC6 * 0.263146)), 14.0)) * gen::clamp((0.42 - m_fh * 28.0 / m_sr) * 12.0, 0.0, 1.0) * m_s28 + m_B16 * (0.55 + 0.45 * (m_LS0 * -0.252242 + m_LC0 * 0.967664)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS0 * -0.252242 + m_LC0 * 0.967664)), 14.0)) * gen::clamp((0.42 - m_fh * 32.0 / m_sr) * 12.0, 0.0, 1.0) * m_s32 + sub * m_s1;
          m_amp = m_v4_e2 * (1.0 - vela + vela * m_v4_vel) * m_norm * m_ug;
          m_pl = 1.0 - m_spread * 0.0;
          m_pr = 1.0 - m_spread * 0.17;
          m_xL = m_xL + (m_ou * (1.0 + m_br) + m_ev * (1.0 - m_br)) * m_amp * m_pl;
          m_xR = m_xR + (m_ou * (1.0 - m_br) + m_ev * (1.0 + m_br)) * m_amp * m_pr;
          m_me = gen::max(m_me, m_v4_e2);
          m_mask = m_mask + 16.0;
        }
        if (t5 != m_v5_lt) { m_v5_lt = t5; m_v5_s2 = 1.0; m_v5_vel = g5; }
        if (g5 <= 0.0 && m_v5_s2 > 0.0 && m_v5_s2 < 3.0) { m_v5_s2 = 3.0; }
        if (m_v5_s2 == 1.0) { m_v5_e2 = m_v5_e2 + 1.0 / (m_sr * m_aA); if (m_v5_e2 >= 1.0) { m_v5_e2 = 1.0; m_v5_s2 = 2.0; } }
        else if (m_v5_s2 == 2.0) { m_v5_e2 = m_v5_e2 + (asus - m_v5_e2) * m_aD; }
        else if (m_v5_s2 == 3.0) { m_v5_e2 = m_v5_e2 - m_v5_e2 * m_aR; if (m_v5_e2 < 0.0002) { m_v5_e2 = 0.0; m_v5_s2 = 0.0; } }
        if (m_v5_s2 > 0.0) {
          m_v5_pn = m_v5_pn + (n5 + detune * detune * 0.5 * 0.2 - m_v5_pn) * m_cg;
          m_pn = m_v5_pn + m_bs + m_vib + detune * 0.08 * (m_LS5 * -0.056995 + m_LC5 * -0.998374);
          m_fh = gen::clamp(440.0 * std::pow(2.0, (m_pn - 69.0) / 12.0), 4.0, m_sr * 0.45) * 0.5;
          m_v5_ph = gen::wrap(m_v5_ph + m_fh / m_sr, 0.0, 1.0);
          m_y = gen::kTwoPi * m_v5_ph;
          m_s1 = std::sin(m_y);
          m_c2 = 2.0 * std::cos(m_y);
          m_s2 = m_c2 * m_s1;
          m_s3 = m_c2 * m_s2 - m_s1;
          m_s4 = m_c2 * m_s3 - m_s2;
          m_s5 = m_c2 * m_s4 - m_s3;
          m_s6 = m_c2 * m_s5 - m_s4;
          m_s7 = m_c2 * m_s6 - m_s5;
          m_s8 = m_c2 * m_s7 - m_s6;
          m_s9 = m_c2 * m_s8 - m_s7;
          m_s10 = m_c2 * m_s9 - m_s8;
          m_s11 = m_c2 * m_s10 - m_s9;
          m_s12 = m_c2 * m_s11 - m_s10;
          m_s13 = m_c2 * m_s12 - m_s11;
          m_s14 = m_c2 * m_s13 - m_s12;
          m_s15 = m_c2 * m_s14 - m_s13;
          m_s16 = m_c2 * m_s15 - m_s14;
          m_s17 = m_c2 * m_s16 - m_s15;
          m_s18 = m_c2 * m_s17 - m_s16;
          m_s19 = m_c2 * m_s18 - m_s17;
          m_s20 = m_c2 * m_s19 - m_s18;
          m_s21 = m_c2 * m_s20 - m_s19;
          m_s22 = m_c2 * m_s21 - m_s20;
          m_s23 = m_c2 * m_s22 - m_s21;
          m_s24 = m_c2 * m_s23 - m_s22;
          m_s25 = m_c2 * m_s24 - m_s23;
          m_s26 = m_c2 * m_s25 - m_s24;
          m_s27 = m_c2 * m_s26 - m_s25;
          m_s28 = m_c2 * m_s27 - m_s26;
          m_s29 = m_c2 * m_s28 - m_s27;
          m_s30 = m_c2 * m_s29 - m_s28;
          m_s31 = m_c2 * m_s30 - m_s29;
          m_s32 = m_c2 * m_s31 - m_s30;
          m_ou = m_B1 * (0.55 + 0.45 * (m_LS1 * 0.033244 + m_LC1 * -0.999447)) * gen::clamp((0.42 - m_fh * 2.0 / m_sr) * 12.0, 0.0, 1.0) * m_s2 + m_B3 * (0.55 + 0.45 * (m_LS3 * 0.999759 + m_LC3 * 0.021964)) * gen::clamp((0.42 - m_fh * 6.0 / m_sr) * 12.0, 0.0, 1.0) * m_s6 + m_B5 * (0.55 + 0.45 * (m_LS5 * -0.010681 + m_LC5 * 0.999943)) * gen::clamp((0.42 - m_fh * 10.0 / m_sr) * 12.0, 0.0, 1.0) * m_s10 + m_B7 * (0.55 + 0.45 * (m_LS7 * -1.000000 + m_LC7 * 0.000603)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS7 * -1.000000 + m_LC7 * 0.000603)), 14.0)) * gen::clamp((0.42 - m_fh * 14.0 / m_sr) * 12.0, 0.0, 1.0) * m_s14 + m_B9 * (0.55 + 0.45 * (m_LS1 * -0.011888 + m_LC1 * -0.999929)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS1 * -0.011888 + m_LC1 * -0.999929)), 14.0)) * gen::clamp((0.42 - m_fh * 18.0 / m_sr) * 12.0, 0.0, 1.0) * m_s18 + m_B11 * (0.55 + 0.45 * (m_LS3 * 0.999732 + m_LC3 * -0.023170)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS3 * 0.999732 + m_LC3 * -0.023170)), 14.0)) * gen::clamp((0.42 - m_fh * 22.0 / m_sr) * 12.0, 0.0, 1.0) * m_s22 + m_B13 * (0.55 + 0.45 * (m_LS5 * 0.034450 + m_LC5 * 0.999406)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS5 * 0.034450 + m_LC5 * 0.999406)), 14.0)) * gen::clamp((0.42 - m_fh * 26.0 / m_sr) * 12.0, 0.0, 1.0) * m_s26 + m_B15 * (0.55 + 0.45 * (m_LS7 * -0.998954 + m_LC7 * 0.045726)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS7 * -0.998954 + m_LC7 * 0.045726)), 14.0)) * gen::clamp((0.42 - m_fh * 30.0 / m_sr) * 12.0, 0.0, 1.0) * m_s30;
          m_ev = m_B2 * (0.55 + 0.45 * (m_LS2 * 0.726357 + m_LC2 * -0.687318)) * gen::clamp((0.42 - m_fh * 4.0 / m_sr) * 12.0, 0.0, 1.0) * m_s4 + m_B4 * (0.55 + 0.45 * (m_LS4 * 0.695470 + m_LC4 * 0.718555)) * gen::clamp((0.42 - m_fh * 8.0 / m_sr) * 12.0, 0.0, 1.0) * m_s8 + m_B6 * (0.55 + 0.45 * (m_LS6 * -0.710661 + m_LC6 * 0.703535)) * gen::clamp((0.42 - m_fh * 12.0 / m_sr) * 12.0, 0.0, 1.0) * m_s12 + m_B8 * (0.55 + 0.45 * (m_LS0 * -0.711509 + m_LC0 * -0.702677)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS0 * -0.711509 + m_LC0 * -0.702677)), 14.0)) * gen::clamp((0.42 - m_fh * 16.0 / m_sr) * 12.0, 0.0, 1.0) * m_s16 + m_B10 * (0.55 + 0.45 * (m_LS2 * 0.694603 + m_LC2 * -0.719393)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS2 * 0.694603 + m_LC2 * -0.719393)), 14.0)) * gen::clamp((0.42 - m_fh * 20.0 / m_sr) * 12.0, 0.0, 1.0) * m_s20 + m_B12 * (0.55 + 0.45 * (m_LS4 * 0.727185 + m_LC4 * 0.686441)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS4 * 0.727185 + m_LC4 * 0.686441)), 14.0)) * gen::clamp((0.42 - m_fh * 24.0 / m_sr) * 12.0, 0.0, 1.0) * m_s24 + m_B14 * (0.55 + 0.45 * (m_LS6 * -0.678191 + m_LC6 * 0.734885)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS6 * -0.678191 + m_LC6 * 0.734885)), 14.0)) * gen::clamp((0.42 - m_fh * 28.0 / m_sr) * 12.0, 0.0, 1.0) * m_s28 + m_B16 * (0.55 + 0.45 * (m_LS0 * -0.742491 + m_LC0 * -0.669856)) * (1.0 + glit * 4.0 * std::pow(gen::max(0.0, (m_LS0 * -0.742491 + m_LC0 * -0.669856)), 14.0)) * gen::clamp((0.42 - m_fh * 32.0 / m_sr) * 12.0, 0.0, 1.0) * m_s32 + sub * m_s1;
          m_amp = m_v5_e2 * (1.0 - vela + vela * m_v5_vel) * m_norm * m_ug;
          m_pl = 1.0 - m_spread * 0.17;
          m_pr = 1.0 - m_spread * 0.0;
          m_xL = m_xL + (m_ou * (1.0 + m_br) + m_ev * (1.0 - m_br)) * m_amp * m_pl;
          m_xR = m_xR + (m_ou * (1.0 - m_br) + m_ev * (1.0 + m_br)) * m_amp * m_pr;
          m_me = gen::max(m_me, m_v5_e2);
          m_mask = m_mask + 32.0;
        }
        m_ci = gen::wrap(m_ci + 1.0, 0.0, 4096.0);
        chb.poke( m_xL, m_ci, 0.0);
        chb.poke( m_xR, m_ci, 1.0);
        m_cp0 = gen::wrap(m_cp0 + 0.31 / m_sr, 0.0, 1.0);
        m_cp1 = gen::wrap(m_cp1 + 0.47 / m_sr, 0.0, 1.0);
        m_cp2 = gen::wrap(m_cp2 + 0.39 / m_sr, 0.0, 1.0);
        m_cp3 = gen::wrap(m_cp3 + 0.53 / m_sr, 0.0, 1.0);
        m_cd = (0.7 + chorus * 2.2) * m_sr / 1000.0;
        m_cb = 7.0 * m_sr / 1000.0;
        m_r0 = gen::wrap(m_ci - (m_cb + std::sin(gen::kTwoPi * m_cp0) * m_cd), 0.0, 4096.0);
        m_r1 = gen::wrap(m_ci - (m_cb + std::sin(gen::kTwoPi * m_cp1) * m_cd * 0.8), 0.0, 4096.0);
        m_r2 = gen::wrap(m_ci - (m_cb + std::sin(gen::kTwoPi * m_cp2) * m_cd), 0.0, 4096.0);
        m_r3 = gen::wrap(m_ci - (m_cb + std::sin(gen::kTwoPi * m_cp3) * m_cd * 0.8), 0.0, 4096.0);
        m_i0 = std::floor(m_r0); f0 = m_r0 - m_i0;
        m_i1 = std::floor(m_r1); f1 = m_r1 - m_i1;
        m_i2 = std::floor(m_r2); f2 = m_r2 - m_i2;
        m_i3 = std::floor(m_r3); f3 = m_r3 - m_i3;
        m_tp0 = chb.peek( m_i0, 0.0) * (1.0 - f0) + chb.peek( gen::wrap(m_i0 + 1.0, 0.0, 4096.0), 0.0) * f0;
        m_tp1 = chb.peek( m_i1, 1.0) * (1.0 - f1) + chb.peek( gen::wrap(m_i1 + 1.0, 0.0, 4096.0), 1.0) * f1;
        m_tp2 = chb.peek( m_i2, 1.0) * (1.0 - f2) + chb.peek( gen::wrap(m_i2 + 1.0, 0.0, 4096.0), 1.0) * f2;
        m_tp3 = chb.peek( m_i3, 0.0) * (1.0 - f3) + chb.peek( gen::wrap(m_i3 + 1.0, 0.0, 4096.0), 0.0) * f3;
        m_cL = m_xL * (1.0 - chorus * 0.35) + (m_tp0 + m_tp1 * 0.6) * chorus * 0.55;
        m_cR = m_xR * (1.0 - chorus * 0.35) + (m_tp2 + m_tp3 * 0.6) * chorus * 0.55;
        m_sDt = m_sDt + ((0.001 + dtime * dtime * 0.999) - m_sDt) * (1.0 - std::exp(-1.0 / (m_sr * 0.12)));
        m_dw = gen::wrap(m_dw + 1.0, 0.0, 52000.0);
        m_dd = gen::clamp(m_sDt * m_sr, 2.0, 51990.0);
        m_rd = gen::wrap(m_dw - m_dd, 0.0, 52000.0);
        m_ri = std::floor(m_rd);
        m_rf = m_rd - m_ri;
        m_wL = dlb.peek( m_ri, 0.0) * (1.0 - m_rf) + dlb.peek( gen::wrap(m_ri + 1.0, 0.0, 52000.0), 0.0) * m_rf;
        m_wR = dlb.peek( m_ri, 1.0) * (1.0 - m_rf) + dlb.peek( gen::wrap(m_ri + 1.0, 0.0, 52000.0), 1.0) * m_rf;
        m_dg = 1.0 - std::exp(-gen::kTwoPi * 6500.0 / m_sr);
        m_dlpL = m_dlpL + (m_wL - m_dlpL) * m_dg;
        m_dlpR = m_dlpR + (m_wR - m_dlpR) * m_dg;
        m_fbk = dfb * 1.02;
        dlb.poke( std::tanh(m_cL + m_dlpL * m_fbk), m_dw, 0.0);
        dlb.poke( std::tanh(m_cR + m_dlpR * m_fbk), m_dw, 1.0);
        m_oL = m_cL + m_dlpL * dmix;
        m_oR = m_cR + m_dlpR * dmix;
        m_gv = vol * vol * 1.25;
        m_oL = std::tanh(m_oL * m_gv);
        m_oR = std::tanh(m_oR * m_gv);
        m_dcyL = m_oL - m_dcxL + 0.9995 * m_dcyL;
        m_dcxL = m_oL;
        m_dcyR = m_oR - m_dcxR + 0.9995 * m_dcyR;
        m_dcxR = m_oR;
        m_oL = m_dcyL;
        m_oR = m_dcyR;
        m_pk = gen::max(gen::max(std::fabs(m_oL), std::fabs(m_oR)), m_pk * 0.9997);
        out[0] = m_oL;
        out[1] = m_oR;
        out[2] = m_me;
        out[3] = m_mask;
        out[4] = m_pk;
        out[5] = m_lfo;
    }
};

}  // namespace blonda::sloja
