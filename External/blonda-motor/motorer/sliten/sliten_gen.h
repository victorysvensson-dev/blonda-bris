// GENERERAD FIL – ändra inte för hand.
// Källa: generator/effekter/sliten.genexpr (BLONDA SLITEN.amxd)
// Översatt med generator/genexpr2cpp.py från samma GenExpr som Max for Live-pluggen kör.
#pragma once
#include "blonda/gen_runtime.h"
#include <cstring>

namespace blonda::sliten {

struct SlitenDsp {
    static constexpr int kNumOutputs = 7;
    static constexpr int kNumInputs = 2;
    static constexpr int kNumGenParams = 11;
    double samplerate = 48000.0;
    gen::Noise rng;

    // Param (sätts utifrån)
    double media = 0.0;
    double age = 0.5;
    double wow = 0.35;
    double flut = 0.3;
    double sat = 0.4;
    double brus = 0.3;
    double avbr = 0.2;
    double ton = 0.5;
    double bredd = 1.0;
    double wet = 1.0;
    double outv = 0.75;

    // History (tillstånd mellan sampel)
    double m_wi = 0.0;
    double m_wph = 0.0;
    double m_wdr = 0.0;
    double m_wdt = 0.0;
    double m_fph = 0.0;
    double m_fn = 0.0;
    double m_dly = 0.0;
    double m_dEnv = 0.0;
    double m_dLeft = 0.0;
    double m_dDepth = 0.0;
    double m_dKind = 0.0;
    double m_frz = 0.0;
    double m_rep = 0.0;
    double m_pop = 0.0;
    double m_popv = 0.0;
    double m_lvl = 0.0;
    double m_hum = 0.0;
    double m_sWet = 1.0;
    double m_crk = 0.0;
    double m_jit = 0.0;
    double m_jitT = 0.0;
    double m_qh = 0.0;
    double m_qhL = 0.0;
    double m_qhR = 0.0;
    double m_qc = 0.0;
    double m_gsm = 0.0;
    double m_hpLs = 0.0;
    double m_hpRs = 0.0;
    double m_lpLs = 0.0;
    double m_lpRs = 0.0;
    double m_lp2Ls = 0.0;
    double m_lp2Rs = 0.0;
    double m_bmLs = 0.0;
    double m_bmRs = 0.0;
    double m_hsAs = 0.0;
    double m_hsBs = 0.0;
    double m_dlLs = 0.0;
    double m_dlRs = 0.0;
    double m_rbAs = 0.0;
    double m_rbBs = 0.0;

    // Data (minnesbuffertar)
    gen::Data buf{65536, 2};

    // nollställ allt tillstånd (som när gen~ laddas)
    void reset() {
        m_wi = 0.0;
        m_wph = 0.0;
        m_wdr = 0.0;
        m_wdt = 0.0;
        m_fph = 0.0;
        m_fn = 0.0;
        m_dly = 0.0;
        m_dEnv = 0.0;
        m_dLeft = 0.0;
        m_dDepth = 0.0;
        m_dKind = 0.0;
        m_frz = 0.0;
        m_rep = 0.0;
        m_pop = 0.0;
        m_popv = 0.0;
        m_lvl = 0.0;
        m_hum = 0.0;
        m_sWet = 1.0;
        m_crk = 0.0;
        m_jit = 0.0;
        m_jitT = 0.0;
        m_qh = 0.0;
        m_qhL = 0.0;
        m_qhR = 0.0;
        m_qc = 0.0;
        m_gsm = 0.0;
        m_hpLs = 0.0;
        m_hpRs = 0.0;
        m_lpLs = 0.0;
        m_lpRs = 0.0;
        m_lp2Ls = 0.0;
        m_lp2Rs = 0.0;
        m_bmLs = 0.0;
        m_bmRs = 0.0;
        m_hsAs = 0.0;
        m_hsBs = 0.0;
        m_dlLs = 0.0;
        m_dlRs = 0.0;
        m_rbAs = 0.0;
        m_rbBs = 0.0;
        buf.clear();
        rng = gen::Noise();
    }

    // pekare till en Param via namn (nullptr om den inte finns)
    double* param(const char* name) {
        if (std::strcmp(name, "media") == 0) return &media;
        if (std::strcmp(name, "age") == 0) return &age;
        if (std::strcmp(name, "wow") == 0) return &wow;
        if (std::strcmp(name, "flut") == 0) return &flut;
        if (std::strcmp(name, "sat") == 0) return &sat;
        if (std::strcmp(name, "brus") == 0) return &brus;
        if (std::strcmp(name, "avbr") == 0) return &avbr;
        if (std::strcmp(name, "ton") == 0) return &ton;
        if (std::strcmp(name, "bredd") == 0) return &bredd;
        if (std::strcmp(name, "wet") == 0) return &wet;
        if (std::strcmp(name, "outv") == 0) return &outv;
        return nullptr;
    }

    // ett sampel; in har kNumInputs värden, out får kNumOutputs värden
    inline void perform(const double* in, double* out) {
        double m_N = 0.0, m_ag = 0.0, m_bmLk = 0.0, m_bmLo = 0.0, m_bmRk = 0.0, m_bmRo = 0.0, m_bump = 0.0, m_burst = 0.0;
        double m_dTarget = 0.0, m_dg = 0.0, m_dig = 0.0, m_digital = 0.0, m_dr = 0.0, m_eDrop = 0.0, m_eFlut = 0.0, m_eHiss = 0.0;
        double m_eSat = 0.0, m_eWow = 0.0, m_fHz = 0.0, m_fv = 0.0, m_gsmOn = 0.0, m_hiss = 0.0, m_hpLk = 0.0, m_hpLo = 0.0;
        double m_hpRk = 0.0, m_hpRo = 0.0, m_hpf = 0.0, m_hsAk = 0.0, m_hsAo = 0.0, m_hsBk = 0.0, m_hsBo = 0.0, m_humv = 0.0;
        double m_inM = 0.0, m_isRep = 0.0, m_loopL = 0.0, m_lp2Lk = 0.0, m_lp2Lo = 0.0, m_lp2Rk = 0.0, m_lp2Ro = 0.0, m_lpBase = 0.0;
        double m_lpLk = 0.0, m_lpLo = 0.0, m_lpRk = 0.0, m_lpRo = 0.0, m_lpf = 0.0, m_mL = 0.0, m_mR = 0.0, m_md = 0.0;
        double m_mk = 0.0, m_mo = 0.0, m_nz = 0.0, m_oL = 0.0, m_oR = 0.0, m_pDrop = 0.0, m_popRate = 0.0, m_qbits = 0.0;
        double m_qn = 0.0, m_qs = 0.0, m_rIdx = 0.0, m_rbAk = 0.0, m_rbAo = 0.0, m_rbBk = 0.0, m_rbBo = 0.0, m_rdL = 0.0;
        double m_rdLa = 0.0, m_rdLb = 0.0, m_rdLc = 0.0, m_rdLc1 = 0.0, m_rdLc2 = 0.0, m_rdLc3 = 0.0, m_rdLd = 0.0, m_rdLf = 0.0;
        double m_rdLi = 0.0, m_rdR = 0.0, m_rdRa = 0.0, m_rdRb = 0.0, m_rdRc = 0.0, m_rdRc1 = 0.0, m_rdRc2 = 0.0, m_rdRc3 = 0.0;
        double m_rdRd = 0.0, m_rdRf = 0.0, m_rdRi = 0.0, m_road = 0.0, m_sL = 0.0, m_sR = 0.0, m_sr = 0.0, m_vc = 0.0;
        double m_vin = 0.0, m_wHz = 0.0, m_wn = 0.0, m_wv = 0.0, m_xL = 0.0, m_xR = 0.0, m_yL = 0.0, m_yR = 0.0;
        double m_zL = 0.0, m_zR = 0.0;
        m_sr = samplerate;
        m_N = 65536.0;
        m_md = gen::clamp(std::floor(media + 0.5), 0.0, 8.0);
        m_dig = gen::max(m_md == 2.0, m_md == 8.0) > 0.5 ? 1.0 : 0.0;
        m_vin = gen::max(m_md == 3.0, m_md == 5.0) > 0.5 ? 1.0 : 0.0;
        m_ag = gen::clamp(age, 0.0, 1.0) * 2.0;
        m_eWow = gen::clamp(wow * m_ag, 0.0, 2.0) * (m_md < 0.5 ? 1.0 : (m_md < 1.5 ? 1.3 : (m_md < 2.5 ? 0.0 : (m_md < 3.5 ? 0.8 : (m_md < 4.5 ? 0.5 : (m_md < 5.5 ? 1.1 : (m_md < 6.5 ? 1.5 : (m_md < 7.5 ? 1.3 : 0.0))))))));
        m_eFlut = gen::clamp(flut * m_ag, 0.0, 2.0) * (m_md < 0.5 ? 1.0 : (m_md < 1.5 ? 1.5 : (m_md < 2.5 ? 0.0 : (m_md < 3.5 ? 0.35 : (m_md < 4.5 ? 0.6 : (m_md < 5.5 ? 0.4 : (m_md < 6.5 ? 2.2 : (m_md < 7.5 ? 1.1 : 0.0))))))));
        m_eSat = gen::clamp(sat * m_ag, 0.0, 2.0) * (m_md < 0.5 ? 1.0 : (m_md < 1.5 ? 0.8 : (m_md < 2.5 ? 0.15 : (m_md < 3.5 ? 0.45 : (m_md < 4.5 ? 1.25 : (m_md < 5.5 ? 0.7 : (m_md < 6.5 ? 1.3 : (m_md < 7.5 ? 1.1 : 0.9))))))));
        m_eHiss = gen::clamp(brus * m_ag, 0.0, 2.0);
        m_eDrop = gen::clamp(avbr * m_ag, 0.0, 2.0);
        m_sWet = m_sWet + (wet - m_sWet) * 0.001;
        m_mo = gen::clamp((m_md < 0.5 ? 0.0 : (m_md < 1.5 ? 0.75 : (m_md < 2.5 ? 0.0 : (m_md < 3.5 ? 0.15 : (m_md < 4.5 ? 0.0 : (m_md < 5.5 ? 1.0 : (m_md < 6.5 ? 1.0 : (m_md < 7.5 ? 0.3 : 1.0)))))))) + (1.0 - bredd) * 0.5, 0.0, 1.0);
        m_inM = (in[0] + in[1]) * 0.5;
        m_xL = in[0] + (m_inM - in[0]) * m_mo;
        m_xR = in[1] + (m_inM - in[1]) * m_mo;
        m_wHz = (m_md < 0.5 ? 0.7 : (m_md < 1.5 ? 0.9 : (m_md < 2.5 ? 0.5 : (m_md < 3.5 ? 0.55 : (m_md < 4.5 ? 0.35 : (m_md < 5.5 ? 1.3 : (m_md < 6.5 ? 1.1 : (m_md < 7.5 ? 0.8 : 0.5)))))))) * (0.6 + m_wdr * 0.8);
        m_wph = gen::wrap(m_wph + m_wHz / m_sr, 0.0, 1.0);
        if (m_wph < m_wHz / m_sr) { m_wdt = std::fabs(rng.next()); }
        m_wdr = m_wdr + (m_wdt - m_wdr) * 0.00002;
        m_wv = std::sin(gen::kTwoPi * m_wph) * 0.75 + (m_wdr - 0.5) * 0.5;
        m_fHz = 7.0 + m_wdr * 4.0;
        m_fph = gen::wrap(m_fph + m_fHz / m_sr, 0.0, 1.0);
        m_fn = m_fn + (rng.next() - m_fn) * 0.002;
        m_fv = std::sin(gen::kTwoPi * m_fph) * 0.6 + m_fn * 6.0;
        m_pDrop = m_eDrop * m_eDrop * 2.2 / m_sr;
        if (m_dLeft <= 0.0 && rng.next() * 0.5 + 0.5 < m_pDrop) {
          m_dLeft = (0.025 + std::fabs(rng.next()) * 0.22) * m_sr * (m_dig > 0.0 ? 0.6 : 1.0);
          m_dDepth = 0.45 + std::fabs(rng.next()) * 0.55;
          m_dKind = m_md;
          m_frz = m_wi;
          m_rep = 0.0;
        }
        m_dTarget = m_dLeft > 0.0 ? m_dDepth : 0.0;
        m_dEnv = m_dEnv + (m_dTarget - m_dEnv) * (m_dTarget > m_dEnv ? 0.004 : 0.0015);
        m_dLeft = gen::max(0.0, m_dLeft - 1.0);
        m_jitT = m_md == 1.0 && m_dLeft > 0.0 ? rng.next() * 2.5 : 0.0;
        m_jit = m_jit + (m_jitT - m_jit) * 0.003;
        buf.poke( m_xL, m_wi, 0.0);
        buf.poke( m_xR, m_wi, 1.0);
        m_dly = (9.0 + m_wv * m_eWow * 3.2 + m_fv * m_eFlut * 0.22 + m_jit * m_dEnv) * m_sr * 0.001;
        m_rIdx = m_wi - gen::max(m_dly, 4.0);
        m_rep = m_rep + 1.0;
        m_loopL = m_sr * (m_md == 8.0 ? 0.02 : 0.045);
        m_isRep = m_dig > 0.0 && m_dLeft > 0.0 ? 1.0 : 0.0;
        m_rIdx = m_isRep > 0.0 ? m_frz - m_loopL + gen::wrap(m_rep, 0.0, m_loopL) : m_rIdx;
        m_rdLi = std::floor(m_rIdx);
        m_rdLf = (m_rIdx) - m_rdLi;
        m_rdLa = buf.peek( gen::wrap(m_rdLi - 1.0, 0.0, m_N), 0.0);
        m_rdLb = buf.peek( gen::wrap(m_rdLi, 0.0, m_N), 0.0);
        m_rdLc = buf.peek( gen::wrap(m_rdLi + 1.0, 0.0, m_N), 0.0);
        m_rdLd = buf.peek( gen::wrap(m_rdLi + 2.0, 0.0, m_N), 0.0);
        m_rdLc1 = 0.5 * (m_rdLc - m_rdLa);
        m_rdLc2 = m_rdLa - 2.5 * m_rdLb + 2.0 * m_rdLc - 0.5 * m_rdLd;
        m_rdLc3 = 0.5 * (m_rdLd - m_rdLa) + 1.5 * (m_rdLb - m_rdLc);
        m_rdL = ((m_rdLc3 * m_rdLf + m_rdLc2) * m_rdLf + m_rdLc1) * m_rdLf + m_rdLb;
        m_rdRi = std::floor(m_rIdx);
        m_rdRf = (m_rIdx) - m_rdRi;
        m_rdRa = buf.peek( gen::wrap(m_rdRi - 1.0, 0.0, m_N), 1.0);
        m_rdRb = buf.peek( gen::wrap(m_rdRi, 0.0, m_N), 1.0);
        m_rdRc = buf.peek( gen::wrap(m_rdRi + 1.0, 0.0, m_N), 1.0);
        m_rdRd = buf.peek( gen::wrap(m_rdRi + 2.0, 0.0, m_N), 1.0);
        m_rdRc1 = 0.5 * (m_rdRc - m_rdRa);
        m_rdRc2 = m_rdRa - 2.5 * m_rdRb + 2.0 * m_rdRc - 0.5 * m_rdRd;
        m_rdRc3 = 0.5 * (m_rdRd - m_rdRa) + 1.5 * (m_rdRb - m_rdRc);
        m_rdR = ((m_rdRc3 * m_rdRf + m_rdRc2) * m_rdRf + m_rdRc1) * m_rdRf + m_rdRb;
        m_wi = gen::wrap(m_wi + 1.0, 0.0, m_N);
        m_yL = m_rdL;
        m_yR = m_rdR;
        m_dr = 1.0 + m_eSat * 3.5;
        m_digital = m_dig;
        m_sL = m_digital > 0.0 ? gen::clamp(m_yL * m_dr, -1.0, 1.0) / m_dr : (std::tanh(m_yL * m_dr + 0.08 * m_eSat) - std::tanh(0.08 * m_eSat)) / m_dr * (1.0 + m_eSat * 0.35);
        m_sR = m_digital > 0.0 ? gen::clamp(m_yR * m_dr, -1.0, 1.0) / m_dr : (std::tanh(m_yR * m_dr + 0.08 * m_eSat) - std::tanh(0.08 * m_eSat)) / m_dr * (1.0 + m_eSat * 0.35);
        m_qc = m_qc + 1.0;
        m_qn = m_md == 8.0 ? gen::max(1.0, std::floor(m_sr / 8000.0 + 0.5)) : (m_md == 2.0 ? gen::max(1.0, std::floor(1.0 + m_ag * m_ag * 1.2)) : 1.0);
        if (m_qc >= m_qn) { m_qc = 0.0; m_qhL = m_sL; m_qhR = m_sR; }
        m_qbits = m_md == 8.0 ? 11.0 - m_ag * 2.0 : 16.0 - (m_md == 2.0 ? m_ag * m_ag * 2.5 : 0.0);
        m_qs = std::pow(2.0, m_qbits - 1.0);
        m_sL = m_dig > 0.0 ? std::floor(m_qhL * m_qs + 0.5) / m_qs : m_sL;
        m_sR = m_dig > 0.0 ? std::floor(m_qhR * m_qs + 0.5) / m_qs : m_sR;
        m_lpBase = (m_md < 0.5 ? 9000.0 : (m_md < 1.5 ? 6500.0 : (m_md < 2.5 ? 15000.0 : (m_md < 3.5 ? 12000.0 : (m_md < 4.5 ? 16000.0 : (m_md < 5.5 ? 4800.0 : (m_md < 6.5 ? 4200.0 : (m_md < 7.5 ? 7000.0 : 3400.0))))))));
        m_lpf = gen::clamp(m_lpBase * std::pow(4.0, (ton - 0.5) * 2.0) * std::pow(0.55, m_ag * 0.5) * (1.0 - m_dEnv * 0.75 * (gen::max(m_dig, m_vin) > 0.5 ? 0.0 : 1.0)), 300.0, m_sr * 0.45);
        m_hpf = (m_md < 0.5 ? 45.0 : (m_md < 1.5 ? 90.0 : (m_md < 2.5 ? 20.0 : (m_md < 3.5 ? 30.0 : (m_md < 4.5 ? 28.0 : (m_md < 5.5 ? 160.0 : (m_md < 6.5 ? 260.0 : (m_md < 7.5 ? 75.0 : 300.0)))))))) * (1.0 + m_ag * 0.6);
        m_hpLk = 1.0 - std::exp(-gen::kTwoPi * (m_hpf) / m_sr);
        m_hpLs = m_hpLs + ((m_sL) - m_hpLs) * m_hpLk;
        m_hpLo = (m_sL) - m_hpLs;
        m_hpRk = 1.0 - std::exp(-gen::kTwoPi * (m_hpf) / m_sr);
        m_hpRs = m_hpRs + ((m_sR) - m_hpRs) * m_hpRk;
        m_hpRo = (m_sR) - m_hpRs;
        m_lpLk = 1.0 - std::exp(-gen::kTwoPi * (m_lpf) / m_sr);
        m_lpLs = m_lpLs + ((m_hpLo) - m_lpLs) * m_lpLk;
        m_lpLo = m_lpLs;
        m_lpRk = 1.0 - std::exp(-gen::kTwoPi * (m_lpf) / m_sr);
        m_lpRs = m_lpRs + ((m_hpRo) - m_lpRs) * m_lpRk;
        m_lpRo = m_lpRs;
        m_lp2Lk = 1.0 - std::exp(-gen::kTwoPi * (m_lpf * 1.3) / m_sr);
        m_lp2Ls = m_lp2Ls + ((m_lpLo) - m_lp2Ls) * m_lp2Lk;
        m_lp2Lo = m_lp2Ls;
        m_lp2Rk = 1.0 - std::exp(-gen::kTwoPi * (m_lpf * 1.3) / m_sr);
        m_lp2Rs = m_lp2Rs + ((m_lpRo) - m_lp2Rs) * m_lp2Rk;
        m_lp2Ro = m_lp2Rs;
        m_bump = m_md == 7.0 ? 0.9 : (gen::max(gen::max(m_md == 0.0, m_md == 4.0), m_md == 6.0) > 0.5 ? 0.35 * (0.4 + m_eSat * 0.3) : 0.0);
        m_bmLk = 1.0 - std::exp(-gen::kTwoPi * (90.0) / m_sr);
        m_bmLs = m_bmLs + ((m_lp2Lo) - m_bmLs) * m_bmLk;
        m_bmLo = m_bmLs;
        m_bmRk = 1.0 - std::exp(-gen::kTwoPi * (90.0) / m_sr);
        m_bmRs = m_bmRs + ((m_lp2Ro) - m_bmRs) * m_bmRk;
        m_bmRo = m_bmRs;
        m_mk = (m_md < 0.5 ? 1.1 : (m_md < 1.5 ? 1.3 : (m_md < 2.5 ? 1.0 : (m_md < 3.5 ? 1.1 : (m_md < 4.5 ? 1.1 : (m_md < 5.5 ? 1.6 : (m_md < 6.5 ? 2.0 : (m_md < 7.5 ? 1.15 : 2.4))))))));
        m_zL = (m_lp2Lo + m_bmLo * m_bump) * m_mk;
        m_zR = (m_lp2Ro + m_bmRo * m_bump) * m_mk;
        m_wn = rng.next();
        m_hsAk = 1.0 - std::exp(-gen::kTwoPi * (m_lpf * 0.9) / m_sr);
        m_hsAs = m_hsAs + ((m_wn) - m_hsAs) * m_hsAk;
        m_hsAo = m_hsAs;
        m_hsBk = 1.0 - std::exp(-gen::kTwoPi * (800.0) / m_sr);
        m_hsBs = m_hsBs + ((m_hsAo) - m_hsBs) * m_hsBk;
        m_hsBo = (m_hsAo) - m_hsBs;
        m_hiss = m_hsBo * m_eHiss * (m_md < 0.5 ? 1.0 : (m_md < 1.5 ? 1.2 : (m_md < 2.5 ? 0.0 : (m_md < 3.5 ? 0.35 : (m_md < 4.5 ? 0.65 : (m_md < 5.5 ? 0.6 : (m_md < 6.5 ? 1.7 : (m_md < 7.5 ? 0.9 : 0.35)))))))) * 0.011;
        m_hum = gen::wrap(m_hum + 60.0 / m_sr, 0.0, 1.0);
        m_humv = m_md == 1.0 ? (std::sin(gen::kTwoPi * m_hum) * 0.6 + std::sin(gen::kTwoPi * m_hum * 3.0) * 0.3 + std::sin(gen::kTwoPi * m_hum * 5.0) * 0.15) * m_eHiss * 0.0012 : 0.0;
        m_popRate = m_vin > 0.0 ? (m_eHiss * 6.0 + m_eDrop * 14.0) * (m_md == 5.0 ? 2.5 : 1.0) / m_sr : 0.0;
        if (rng.next() * 0.5 + 0.5 < m_popRate) { m_popv = rng.next() * (0.07 + m_eDrop * 0.12); m_pop = 1.0; }
        m_crk = m_crk * 0.82;
        m_crk = m_pop > 0.5 ? m_popv : m_crk;
        m_pop = 0.0;
        m_vc = m_vin > 0.0 ? m_crk + (rng.next() * 0.5 + 0.5 < m_eHiss * (m_md == 5.0 ? 0.012 : 0.002) ? rng.next() * 0.02 : 0.0) : 0.0;
        m_rbAk = 1.0 - std::exp(-gen::kTwoPi * (70.0) / m_sr);
        m_rbAs = m_rbAs + ((m_wn) - m_rbAs) * m_rbAk;
        m_rbAo = m_rbAs;
        m_rbBk = 1.0 - std::exp(-gen::kTwoPi * (140.0) / m_sr);
        m_rbBs = m_rbBs + ((m_rbAo) - m_rbBs) * m_rbBk;
        m_rbBo = m_rbBs;
        m_road = m_md == 7.0 ? m_rbBo * m_eHiss * 0.06 : 0.0;
        m_gsm = gen::wrap(m_gsm + 217.0 / m_sr, 0.0, 1.0);
        m_gsmOn = m_md == 8.0 ? (std::sin(gen::kTwoPi * m_wph * 6.0) > 0.3 ? 1.0 : 0.0) * (m_gsm < 0.12 ? 1.0 : -0.15) * m_eHiss * 0.006 * (0.3 + m_dEnv * 3.0) : 0.0;
        m_burst = m_md == 1.0 ? m_wn * m_dEnv * 0.025 : 0.0;
        m_nz = m_hiss + m_humv + m_vc + m_burst + m_road + m_gsmOn;
        m_dg = gen::max(m_dig, m_vin) > 0.5 ? 1.0 : 1.0 - m_dEnv;
        m_oL = (m_zL * m_dg + m_nz) ;
        m_oR = (m_zR * m_dg + m_nz * (m_md == 1.0 ? 1.0 : 0.85) + (gen::max(m_md == 0.0, m_md == 4.0) > 0.5 ? m_hiss * 0.4 : 0.0));
        m_mL = in[0] + (m_oL - in[0]) * m_sWet;
        m_mR = in[1] + (m_oR - in[1]) * m_sWet;
        m_mL = std::tanh(m_mL * outv * 1.33 * 0.95) / 0.95;
        m_mR = std::tanh(m_mR * outv * 1.33 * 0.95) / 0.95;
        m_lvl = gen::max(std::fabs(m_mL) + std::fabs(m_mR), m_lvl * 0.9995);
        out[0] = m_mL;
        out[1] = m_mR;
        out[2] = m_wv * gen::clamp(m_eWow, 0.0, 1.0);
        out[3] = m_fv * gen::clamp(m_eFlut, 0.0, 1.0);
        out[4] = m_dEnv;
        out[5] = m_lvl * 0.5;
        out[6] = std::fabs(m_crk) * 4.0 + (m_isRep > 0.0 ? 1.0 : 0.0);
    }
};

}  // namespace blonda::sliten
