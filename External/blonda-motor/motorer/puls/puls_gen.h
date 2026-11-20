// GENERERAD FIL – ändra inte för hand.
// Källa: generator/puls.py
// Översatt med generator/genexpr2cpp.py från samma GenExpr som Max for Live-pluggen kör.
#pragma once
#include "blonda/gen_runtime.h"
#include <cstring>

namespace blonda::puls {

struct PulsDsp {
    static constexpr int kNumOutputs = 4;
    static constexpr int kNumGenParams = 51;
    double samplerate = 48000.0;
    gen::Noise rng;

    // Param (sätts utifrån)
    double bdlev = 0.85;
    double bdtun = 0.35;
    double bddec = 0.45;
    double bdton = 0.35;
    double sdlev = 0.7;
    double sdtun = 0.5;
    double sddec = 0.4;
    double sdton = 0.5;
    double rslev = 0.55;
    double rstun = 0.5;
    double rsdec = 0.3;
    double rston = 0.4;
    double cplev = 0.65;
    double cptun = 0.5;
    double cpdec = 0.4;
    double cpton = 0.4;
    double chlev = 0.5;
    double chtun = 0.5;
    double chdec = 0.3;
    double chton = 0.3;
    double ohlev = 0.45;
    double ohtun = 0.5;
    double ohdec = 0.45;
    double ohton = 0.3;
    double tmlev = 0.65;
    double tmtun = 0.4;
    double tmdec = 0.45;
    double tmton = 0.4;
    double cblev = 0.45;
    double cbtun = 0.5;
    double cbdec = 0.35;
    double cbton = 0.5;
    double vol = 0.75;
    double drv = 0.0;
    double g0 = 0.0;
    double t0 = 0.0;
    double g1 = 0.0;
    double t1 = 0.0;
    double g2 = 0.0;
    double t2 = 0.0;
    double g3 = 0.0;
    double t3 = 0.0;
    double g4 = 0.0;
    double t4 = 0.0;
    double g5 = 0.0;
    double t5 = 0.0;
    double g6 = 0.0;
    double t6 = 0.0;
    double g7 = 0.0;
    double t7 = 0.0;
    double n6 = 0.0;

    // History (tillstånd mellan sampel)
    double m_pk = 0.0;
    double m_oh_ck = 0.0;
    double m_dcxL = 0.0;
    double m_dcyL = 0.0;
    double m_dcxR = 0.0;
    double m_dcyR = 0.0;
    double m_bd_lt = 0.0;
    double m_bd_on = 0.0;
    double m_bd_vel = 0.0;
    double m_bd_ae = 0.0;
    double m_bd_pe = 0.0;
    double m_bd_ce = 0.0;
    double m_bd_ph = 0.0;
    double m_sd_lt = 0.0;
    double m_sd_on = 0.0;
    double m_sd_vel = 0.0;
    double m_sd_be = 0.0;
    double m_sd_ne = 0.0;
    double m_sd_p1 = 0.0;
    double m_sd_p2 = 0.0;
    double m_sdf_a = 0.0;
    double m_sdf_b = 0.0;
    double m_rs_lt = 0.0;
    double m_rs_on = 0.0;
    double m_rs_vel = 0.0;
    double m_rs_e = 0.0;
    double m_rs_ce = 0.0;
    double m_rs_p1 = 0.0;
    double m_rs_p2 = 0.0;
    double m_cp_lt = 0.0;
    double m_cp_on = 0.0;
    double m_cp_vel = 0.0;
    double m_cp_c = 0.0;
    double m_cp_n = 0.0;
    double m_cp_be = 0.0;
    double m_cp_te = 0.0;
    double m_cpf_a = 0.0;
    double m_cpf_b = 0.0;
    double m_ch_lt = 0.0;
    double m_ch_on = 0.0;
    double m_ch_vel = 0.0;
    double m_ch_e = 0.0;
    double m_chf_a = 0.0;
    double m_chf_b = 0.0;
    double m_ch_q0 = 0.0;
    double m_ch_q1 = 0.137;
    double m_ch_q2 = 0.274;
    double m_ch_q3 = 0.411;
    double m_ch_q4 = 0.548;
    double m_ch_q5 = 0.685;
    double m_oh_lt = 0.0;
    double m_oh_on = 0.0;
    double m_oh_vel = 0.0;
    double m_oh_e = 0.0;
    double m_ohf_a = 0.0;
    double m_ohf_b = 0.0;
    double m_oh_q0 = 0.0;
    double m_oh_q1 = 0.137;
    double m_oh_q2 = 0.274;
    double m_oh_q3 = 0.411;
    double m_oh_q4 = 0.548;
    double m_oh_q5 = 0.685;
    double m_tm_lt = 0.0;
    double m_tm_on = 0.0;
    double m_tm_vel = 0.0;
    double m_tm_ae = 0.0;
    double m_tm_pe = 0.0;
    double m_tm_ce = 0.0;
    double m_tm_ph = 0.0;
    double m_cb_lt = 0.0;
    double m_cb_on = 0.0;
    double m_cb_vel = 0.0;
    double m_cb_e1 = 0.0;
    double m_cb_e2 = 0.0;
    double m_cb_q1 = 0.0;
    double m_cb_q2 = 0.0;
    double m_cbf_a = 0.0;
    double m_cbf_b = 0.0;

    // Data (minnesbuffertar)

    // nollställ allt tillstånd (som när gen~ laddas)
    void reset() {
        m_pk = 0.0;
        m_oh_ck = 0.0;
        m_dcxL = 0.0;
        m_dcyL = 0.0;
        m_dcxR = 0.0;
        m_dcyR = 0.0;
        m_bd_lt = 0.0;
        m_bd_on = 0.0;
        m_bd_vel = 0.0;
        m_bd_ae = 0.0;
        m_bd_pe = 0.0;
        m_bd_ce = 0.0;
        m_bd_ph = 0.0;
        m_sd_lt = 0.0;
        m_sd_on = 0.0;
        m_sd_vel = 0.0;
        m_sd_be = 0.0;
        m_sd_ne = 0.0;
        m_sd_p1 = 0.0;
        m_sd_p2 = 0.0;
        m_sdf_a = 0.0;
        m_sdf_b = 0.0;
        m_rs_lt = 0.0;
        m_rs_on = 0.0;
        m_rs_vel = 0.0;
        m_rs_e = 0.0;
        m_rs_ce = 0.0;
        m_rs_p1 = 0.0;
        m_rs_p2 = 0.0;
        m_cp_lt = 0.0;
        m_cp_on = 0.0;
        m_cp_vel = 0.0;
        m_cp_c = 0.0;
        m_cp_n = 0.0;
        m_cp_be = 0.0;
        m_cp_te = 0.0;
        m_cpf_a = 0.0;
        m_cpf_b = 0.0;
        m_ch_lt = 0.0;
        m_ch_on = 0.0;
        m_ch_vel = 0.0;
        m_ch_e = 0.0;
        m_chf_a = 0.0;
        m_chf_b = 0.0;
        m_ch_q0 = 0.0;
        m_ch_q1 = 0.137;
        m_ch_q2 = 0.274;
        m_ch_q3 = 0.411;
        m_ch_q4 = 0.548;
        m_ch_q5 = 0.685;
        m_oh_lt = 0.0;
        m_oh_on = 0.0;
        m_oh_vel = 0.0;
        m_oh_e = 0.0;
        m_ohf_a = 0.0;
        m_ohf_b = 0.0;
        m_oh_q0 = 0.0;
        m_oh_q1 = 0.137;
        m_oh_q2 = 0.274;
        m_oh_q3 = 0.411;
        m_oh_q4 = 0.548;
        m_oh_q5 = 0.685;
        m_tm_lt = 0.0;
        m_tm_on = 0.0;
        m_tm_vel = 0.0;
        m_tm_ae = 0.0;
        m_tm_pe = 0.0;
        m_tm_ce = 0.0;
        m_tm_ph = 0.0;
        m_cb_lt = 0.0;
        m_cb_on = 0.0;
        m_cb_vel = 0.0;
        m_cb_e1 = 0.0;
        m_cb_e2 = 0.0;
        m_cb_q1 = 0.0;
        m_cb_q2 = 0.0;
        m_cbf_a = 0.0;
        m_cbf_b = 0.0;
        rng = gen::Noise();
    }

    // pekare till en Param via namn (nullptr om den inte finns)
    double* param(const char* name) {
        if (std::strcmp(name, "bdlev") == 0) return &bdlev;
        if (std::strcmp(name, "bdtun") == 0) return &bdtun;
        if (std::strcmp(name, "bddec") == 0) return &bddec;
        if (std::strcmp(name, "bdton") == 0) return &bdton;
        if (std::strcmp(name, "sdlev") == 0) return &sdlev;
        if (std::strcmp(name, "sdtun") == 0) return &sdtun;
        if (std::strcmp(name, "sddec") == 0) return &sddec;
        if (std::strcmp(name, "sdton") == 0) return &sdton;
        if (std::strcmp(name, "rslev") == 0) return &rslev;
        if (std::strcmp(name, "rstun") == 0) return &rstun;
        if (std::strcmp(name, "rsdec") == 0) return &rsdec;
        if (std::strcmp(name, "rston") == 0) return &rston;
        if (std::strcmp(name, "cplev") == 0) return &cplev;
        if (std::strcmp(name, "cptun") == 0) return &cptun;
        if (std::strcmp(name, "cpdec") == 0) return &cpdec;
        if (std::strcmp(name, "cpton") == 0) return &cpton;
        if (std::strcmp(name, "chlev") == 0) return &chlev;
        if (std::strcmp(name, "chtun") == 0) return &chtun;
        if (std::strcmp(name, "chdec") == 0) return &chdec;
        if (std::strcmp(name, "chton") == 0) return &chton;
        if (std::strcmp(name, "ohlev") == 0) return &ohlev;
        if (std::strcmp(name, "ohtun") == 0) return &ohtun;
        if (std::strcmp(name, "ohdec") == 0) return &ohdec;
        if (std::strcmp(name, "ohton") == 0) return &ohton;
        if (std::strcmp(name, "tmlev") == 0) return &tmlev;
        if (std::strcmp(name, "tmtun") == 0) return &tmtun;
        if (std::strcmp(name, "tmdec") == 0) return &tmdec;
        if (std::strcmp(name, "tmton") == 0) return &tmton;
        if (std::strcmp(name, "cblev") == 0) return &cblev;
        if (std::strcmp(name, "cbtun") == 0) return &cbtun;
        if (std::strcmp(name, "cbdec") == 0) return &cbdec;
        if (std::strcmp(name, "cbton") == 0) return &cbton;
        if (std::strcmp(name, "vol") == 0) return &vol;
        if (std::strcmp(name, "drv") == 0) return &drv;
        if (std::strcmp(name, "g0") == 0) return &g0;
        if (std::strcmp(name, "t0") == 0) return &t0;
        if (std::strcmp(name, "g1") == 0) return &g1;
        if (std::strcmp(name, "t1") == 0) return &t1;
        if (std::strcmp(name, "g2") == 0) return &g2;
        if (std::strcmp(name, "t2") == 0) return &t2;
        if (std::strcmp(name, "g3") == 0) return &g3;
        if (std::strcmp(name, "t3") == 0) return &t3;
        if (std::strcmp(name, "g4") == 0) return &g4;
        if (std::strcmp(name, "t4") == 0) return &t4;
        if (std::strcmp(name, "g5") == 0) return &g5;
        if (std::strcmp(name, "t5") == 0) return &t5;
        if (std::strcmp(name, "g6") == 0) return &g6;
        if (std::strcmp(name, "t6") == 0) return &t6;
        if (std::strcmp(name, "g7") == 0) return &g7;
        if (std::strcmp(name, "t7") == 0) return &t7;
        if (std::strcmp(name, "n6") == 0) return &n6;
        return nullptr;
    }

    // ett sampel; out får kNumOutputs värden
    inline void perform(double* out) {
        double m_bd = 0.0, m_bfq = 0.0, m_bs = 0.0, m_cb = 0.0, m_cb1 = 0.0, m_cb1h = 0.0, m_cb2 = 0.0, m_cb2h = 0.0;
        double m_cbb = 0.0, m_cbf1 = 0.0, m_cbfg = 0.0, m_cbfv1 = 0.0, m_cbfv2 = 0.0, m_cbfv3 = 0.0, m_cbfx = 0.0, m_cbpo = 0.0;
        double m_cd1 = 0.0, m_cd2 = 0.0, m_cfs = 0.0, m_ch = 0.0, m_chf1 = 0.0, m_chfg = 0.0, m_chfs = 0.0, m_chfv1 = 0.0;
        double m_chfv2 = 0.0, m_chfv3 = 0.0, m_chfx = 0.0, m_chhp = 0.0, m_chm = 0.0, m_chsrc = 0.0, m_cp = 0.0, m_cpf1 = 0.0;
        double m_cpfg = 0.0, m_cpfv1 = 0.0, m_cpfv2 = 0.0, m_cpfv3 = 0.0, m_cpfx = 0.0, m_cq1 = 0.0, m_cq1h = 0.0, m_cq2 = 0.0;
        double m_cq2h = 0.0, m_csp = 0.0, m_csq = 0.0, m_gl = 0.0, m_mask = 0.0, m_nz = 0.0, m_oL = 0.0, m_oR = 0.0;
        double m_oh = 0.0, m_ohf1 = 0.0, m_ohfg = 0.0, m_ohfs = 0.0, m_ohfv1 = 0.0, m_ohfv2 = 0.0, m_ohfv3 = 0.0, m_ohfx = 0.0;
        double m_ohhp = 0.0, m_ohm = 0.0, m_ohsrc = 0.0, m_rfq = 0.0, m_rs = 0.0, m_rsx = 0.0, m_sbody = 0.0, m_sbp = 0.0;
        double m_sd = 0.0, m_sdf1 = 0.0, m_sdfg = 0.0, m_sdfv1 = 0.0, m_sdfv2 = 0.0, m_sdfv3 = 0.0, m_sdfx = 0.0, m_sfq = 0.0;
        double m_sr = 0.0, m_tfq = 0.0, m_tm = 0.0, m_tmx = 0.0, m_xL = 0.0, m_xR = 0.0;
        m_sr = samplerate;
        m_mask = 0.0;
        m_nz = rng.next();
        if (t0 != m_bd_lt) { m_bd_lt = t0; m_bd_on = 1.0; m_bd_vel = g0; m_bd_ae = 1.0; m_bd_pe = 1.0; m_bd_ce = 1.0; m_bd_ph = 0.0; }
        m_bd = 0.0;
        if (m_bd_on > 0.0) {
          m_bfq = 30.0 * std::pow(4.0, bdtun) * (1.0 + m_bd_pe * (1.2 + bdton * 4.5));
          m_bd_ph = m_bd_ph + m_bfq / m_sr;
          if (m_bd_ph >= 1.0) { m_bd_ph = m_bd_ph - 1.0; }
          m_bd_pe = m_bd_pe * std::exp(-1.0 / (m_sr * (0.007 + 0.025 * bdton)));
          m_bd_ae = m_bd_ae * std::exp(-1.0 / (m_sr * (0.05 * std::pow(30.0, bddec))));
          m_bd_ce = m_bd_ce * std::exp(-1.0 / (m_sr * (0.0012)));
          m_bs = std::sin(gen::kTwoPi * m_bd_ph) + m_nz * m_bd_ce * bdton * 0.7;
          m_bd = std::tanh(m_bs * (1.0 + bdton * 2.5)) * m_bd_ae * m_bd_vel * bdlev;
          if (m_bd_ae < 0.0001) { m_bd_on = 0.0; }
          m_mask = m_mask + 1.0;
        }
        if (t1 != m_sd_lt) { m_sd_lt = t1; m_sd_on = 1.0; m_sd_vel = g1; m_sd_be = 1.0; m_sd_ne = 1.0; m_sd_p1 = 0.0; m_sd_p2 = 0.0; m_sdf_a = 0.0; m_sdf_b = 0.0; }
        m_sd = 0.0;
        if (m_sd_on > 0.0) {
          m_sfq = 160.0 * std::pow(2.0, (sdtun - 0.5) * 2.0) * (1.0 + m_sd_be * m_sd_be * 0.4);
          m_sd_p1 = m_sd_p1 + m_sfq / m_sr;
          if (m_sd_p1 >= 1.0) { m_sd_p1 = m_sd_p1 - 1.0; }
          m_sd_p2 = m_sd_p2 + m_sfq * 1.63 / m_sr;
          if (m_sd_p2 >= 1.0) { m_sd_p2 = m_sd_p2 - 1.0; }
          m_sd_be = m_sd_be * std::exp(-1.0 / (m_sr * (0.035 + 0.12 * sddec)));
          m_sd_ne = m_sd_ne * std::exp(-1.0 / (m_sr * (0.04 + 0.32 * sddec)));
          m_sbody = (std::sin(gen::kTwoPi * m_sd_p1) * 0.65 + std::sin(gen::kTwoPi * m_sd_p2) * 0.35) * m_sd_be;
        m_sdfg = std::tan(gen::kPi * gen::clamp(2600.0 * std::pow(2.0, sdtun - 0.5), 10.0, m_sr * 0.45) / m_sr);
        m_sdfx = m_nz;
        m_sdf1 = 1.0 / (1.0 + m_sdfg * (m_sdfg + (1.3)));
        m_sdfv3 = m_sdfx - m_sdf_b;
        m_sdfv1 = m_sdf1 * m_sdf_a + m_sdfg * m_sdf1 * m_sdfv3;
        m_sdfv2 = m_sdf_b + m_sdfg * m_sdfv1;
        m_sdf_a = 2.0 * m_sdfv1 - m_sdf_a;
        m_sdf_b = 2.0 * m_sdfv2 - m_sdf_b;
        m_sbp = m_sdfv1;
          m_sd = (m_sbody * (1.1 - 0.7 * sdton) + m_sbp * m_sd_ne * (0.5 + 1.6 * sdton)) * m_sd_vel * sdlev;
          if (m_sd_ne < 0.0001 && m_sd_be < 0.0001) { m_sd_on = 0.0; }
          m_mask = m_mask + 2.0;
        }
        if (t2 != m_rs_lt) { m_rs_lt = t2; m_rs_on = 1.0; m_rs_vel = g2; m_rs_e = 1.0; m_rs_ce = 1.0; m_rs_p1 = 0.0; m_rs_p2 = 0.0; }
        m_rs = 0.0;
        if (m_rs_on > 0.0) {
          m_rfq = 1650.0 * std::pow(2.0, (rstun - 0.5) * 1.5);
          m_rs_p1 = m_rs_p1 + m_rfq / m_sr;
          if (m_rs_p1 >= 1.0) { m_rs_p1 = m_rs_p1 - 1.0; }
          m_rs_p2 = m_rs_p2 + m_rfq * 0.29 / m_sr;
          if (m_rs_p2 >= 1.0) { m_rs_p2 = m_rs_p2 - 1.0; }
          m_rs_e = m_rs_e * std::exp(-1.0 / (m_sr * (0.005 + 0.045 * rsdec)));
          m_rs_ce = m_rs_ce * std::exp(-1.0 / (m_sr * (0.0007)));
          m_rsx = std::sin(gen::kTwoPi * m_rs_p1) * 0.7 + std::sin(gen::kTwoPi * m_rs_p2) * 0.6 + m_nz * m_rs_ce * rston * 1.5;
          m_rs = std::tanh(m_rsx * (1.5 + rston * 3.0)) * m_rs_e * m_rs_vel * rslev;
          if (m_rs_e < 0.0001) { m_rs_on = 0.0; }
          m_mask = m_mask + 4.0;
        }
        if (t3 != m_cp_lt) { m_cp_lt = t3; m_cp_on = 1.0; m_cp_vel = g3; m_cp_c = 0.0; m_cp_n = 0.0; m_cp_be = 0.0; m_cp_te = 0.0; m_cpf_a = 0.0; m_cpf_b = 0.0; }
        m_cp = 0.0;
        if (m_cp_on > 0.0) {
          m_csp = (0.006 + cpton * 0.012) * m_sr;
          if (m_cp_n < 4.0 && m_cp_c >= m_cp_n * m_csp) { m_cp_be = 1.0; m_cp_n = m_cp_n + 1.0; if (m_cp_n > 3.0) { m_cp_te = 1.0; } }
          m_cp_c = m_cp_c + 1.0;
          m_cp_be = m_cp_be * std::exp(-1.0 / (m_sr * (0.0035)));
          m_cp_te = m_cp_te * std::exp(-1.0 / (m_sr * (0.03 + 0.35 * cpdec)));
        m_cpfg = std::tan(gen::kPi * gen::clamp(1000.0 * std::pow(2.0, (cptun - 0.5) * 2.0), 10.0, m_sr * 0.45) / m_sr);
        m_cpfx = m_nz;
        m_cpf1 = 1.0 / (1.0 + m_cpfg * (m_cpfg + (0.55)));
        m_cpfv3 = m_cpfx - m_cpf_b;
        m_cpfv1 = m_cpf1 * m_cpf_a + m_cpfg * m_cpf1 * m_cpfv3;
        m_cpfv2 = m_cpf_b + m_cpfg * m_cpfv1;
        m_cpf_a = 2.0 * m_cpfv1 - m_cpf_a;
        m_cpf_b = 2.0 * m_cpfv2 - m_cpf_b;
        m_cbpo = m_cpfv1;
          m_cp = m_cbpo * gen::max(m_cp_be, m_cp_te * 0.7) * 2.2 * m_cp_vel * cplev;
          if (m_cp_n > 3.0 && m_cp_te < 0.0001 && m_cp_be < 0.0001) { m_cp_on = 0.0; }
          m_mask = m_mask + 8.0;
        }
        if (t4 != m_ch_lt) { m_ch_lt = t4; m_ch_on = 1.0; m_ch_vel = g4; m_ch_e = 1.0; m_chf_a = 0.0; m_chf_b = 0.0; m_oh_ck = 1.0; }
        m_chfs = std::pow(2.0, (chtun - 0.5) * 1.5);
        m_ch_q0 = m_ch_q0 + 205.3 * m_chfs / m_sr;
        if (m_ch_q0 >= 1.0) { m_ch_q0 = m_ch_q0 - 1.0; }
        m_ch_q1 = m_ch_q1 + 304.4 * m_chfs / m_sr;
        if (m_ch_q1 >= 1.0) { m_ch_q1 = m_ch_q1 - 1.0; }
        m_ch_q2 = m_ch_q2 + 369.6 * m_chfs / m_sr;
        if (m_ch_q2 >= 1.0) { m_ch_q2 = m_ch_q2 - 1.0; }
        m_ch_q3 = m_ch_q3 + 522.7 * m_chfs / m_sr;
        if (m_ch_q3 >= 1.0) { m_ch_q3 = m_ch_q3 - 1.0; }
        m_ch_q4 = m_ch_q4 + 540.0 * m_chfs / m_sr;
        if (m_ch_q4 >= 1.0) { m_ch_q4 = m_ch_q4 - 1.0; }
        m_ch_q5 = m_ch_q5 + 800.0 * m_chfs / m_sr;
        if (m_ch_q5 >= 1.0) { m_ch_q5 = m_ch_q5 - 1.0; }
        m_ch = 0.0;
        if (m_ch_on > 0.0) {
          m_chm = ((m_ch_q0 < 0.5 ? 1.0 : -1.0) + (m_ch_q1 < 0.5 ? 1.0 : -1.0) + (m_ch_q2 < 0.5 ? 1.0 : -1.0) + (m_ch_q3 < 0.5 ? 1.0 : -1.0) + (m_ch_q4 < 0.5 ? 1.0 : -1.0) + (m_ch_q5 < 0.5 ? 1.0 : -1.0)) * 0.33;
          m_chsrc = m_chm * (1.0 - chton) + m_nz * chton * 1.2;
        m_chfg = std::tan(gen::kPi * gen::clamp(7200.0 * m_chfs, 10.0, m_sr * 0.45) / m_sr);
        m_chfx = m_chsrc;
        m_chf1 = 1.0 / (1.0 + m_chfg * (m_chfg + (1.1)));
        m_chfv3 = m_chfx - m_chf_b;
        m_chfv1 = m_chf1 * m_chf_a + m_chfg * m_chf1 * m_chfv3;
        m_chfv2 = m_chf_b + m_chfg * m_chfv1;
        m_chf_a = 2.0 * m_chfv1 - m_chf_a;
        m_chf_b = 2.0 * m_chfv2 - m_chf_b;
        m_chhp = m_chfx - (1.1) * m_chfv1 - m_chfv2;
          m_ch_e = m_ch_e * std::exp(-1.0 / (m_sr * (0.008 * std::pow(18.0, chdec))));
          m_ch = m_chhp * m_ch_e * m_ch_vel * chlev * 1.8;
          if (m_ch_e < 0.0001) { m_ch_on = 0.0; }
          m_mask = m_mask + 16.0;
        }
        if (t5 != m_oh_lt) { m_oh_lt = t5; m_oh_on = 1.0; m_oh_vel = g5; m_oh_e = 1.0; m_ohf_a = 0.0; m_ohf_b = 0.0; m_oh_ck = 0.0; }
        m_ohfs = std::pow(2.0, (ohtun - 0.5) * 1.5);
        m_oh_q0 = m_oh_q0 + 205.3 * m_ohfs / m_sr;
        if (m_oh_q0 >= 1.0) { m_oh_q0 = m_oh_q0 - 1.0; }
        m_oh_q1 = m_oh_q1 + 304.4 * m_ohfs / m_sr;
        if (m_oh_q1 >= 1.0) { m_oh_q1 = m_oh_q1 - 1.0; }
        m_oh_q2 = m_oh_q2 + 369.6 * m_ohfs / m_sr;
        if (m_oh_q2 >= 1.0) { m_oh_q2 = m_oh_q2 - 1.0; }
        m_oh_q3 = m_oh_q3 + 522.7 * m_ohfs / m_sr;
        if (m_oh_q3 >= 1.0) { m_oh_q3 = m_oh_q3 - 1.0; }
        m_oh_q4 = m_oh_q4 + 540.0 * m_ohfs / m_sr;
        if (m_oh_q4 >= 1.0) { m_oh_q4 = m_oh_q4 - 1.0; }
        m_oh_q5 = m_oh_q5 + 800.0 * m_ohfs / m_sr;
        if (m_oh_q5 >= 1.0) { m_oh_q5 = m_oh_q5 - 1.0; }
        m_oh = 0.0;
        if (m_oh_on > 0.0) {
          m_ohm = ((m_oh_q0 < 0.5 ? 1.0 : -1.0) + (m_oh_q1 < 0.5 ? 1.0 : -1.0) + (m_oh_q2 < 0.5 ? 1.0 : -1.0) + (m_oh_q3 < 0.5 ? 1.0 : -1.0) + (m_oh_q4 < 0.5 ? 1.0 : -1.0) + (m_oh_q5 < 0.5 ? 1.0 : -1.0)) * 0.33;
          m_ohsrc = m_ohm * (1.0 - ohton) + m_nz * ohton * 1.2;
        m_ohfg = std::tan(gen::kPi * gen::clamp(7200.0 * m_ohfs, 10.0, m_sr * 0.45) / m_sr);
        m_ohfx = m_ohsrc;
        m_ohf1 = 1.0 / (1.0 + m_ohfg * (m_ohfg + (1.1)));
        m_ohfv3 = m_ohfx - m_ohf_b;
        m_ohfv1 = m_ohf1 * m_ohf_a + m_ohfg * m_ohf1 * m_ohfv3;
        m_ohfv2 = m_ohf_b + m_ohfg * m_ohfv1;
        m_ohf_a = 2.0 * m_ohfv1 - m_ohf_a;
        m_ohf_b = 2.0 * m_ohfv2 - m_ohf_b;
        m_ohhp = m_ohfx - (1.1) * m_ohfv1 - m_ohfv2;
          m_oh_e = m_oh_e * (m_oh_ck > 0.0 ? std::exp(-1.0 / (m_sr * (0.006))) : std::exp(-1.0 / (m_sr * (0.06 * std::pow(22.0, ohdec)))));
          m_oh = m_ohhp * m_oh_e * m_oh_vel * ohlev * 1.8;
          if (m_oh_e < 0.0001) { m_oh_on = 0.0; }
          m_mask = m_mask + 32.0;
        }
        if (t6 != m_tm_lt) { m_tm_lt = t6; m_tm_on = 1.0; m_tm_vel = g6; m_tm_ae = 1.0; m_tm_pe = 1.0; m_tm_ce = 1.0; m_tm_ph = 0.0; }
        m_tm = 0.0;
        if (m_tm_on > 0.0) {
          m_tfq = 70.0 * std::pow(4.0, tmtun) * std::pow(2.0, n6 / 12.0) * (1.0 + m_tm_pe * (0.1 + tmton * 1.2));
          m_tm_ph = m_tm_ph + m_tfq / m_sr;
          if (m_tm_ph >= 1.0) { m_tm_ph = m_tm_ph - 1.0; }
          m_tm_pe = m_tm_pe * std::exp(-1.0 / (m_sr * (0.045)));
          m_tm_ae = m_tm_ae * std::exp(-1.0 / (m_sr * (0.07 * std::pow(12.0, tmdec))));
          m_tm_ce = m_tm_ce * std::exp(-1.0 / (m_sr * (0.002)));
          m_tmx = std::sin(gen::kTwoPi * m_tm_ph) + m_nz * m_tm_ce * 0.35;
          m_tm = std::tanh(m_tmx * 1.3) * m_tm_ae * m_tm_vel * tmlev;
          if (m_tm_ae < 0.0001) { m_tm_on = 0.0; }
          m_mask = m_mask + 64.0;
        }
        if (t7 != m_cb_lt) { m_cb_lt = t7; m_cb_on = 1.0; m_cb_vel = g7; m_cb_e1 = 1.0; m_cb_e2 = 1.0; m_cbf_a = 0.0; m_cbf_b = 0.0; }
        m_cfs = std::pow(2.0, (cbtun - 0.5) * 1.5);
        m_cd1 = 540.0 * m_cfs / m_sr;
        m_cd2 = 800.0 * m_cfs / m_sr;
        m_cb_q1 = m_cb_q1 + m_cd1;
        if (m_cb_q1 >= 1.0) { m_cb_q1 = m_cb_q1 - 1.0; }
        m_cb_q2 = m_cb_q2 + m_cd2;
        if (m_cb_q2 >= 1.0) { m_cb_q2 = m_cb_q2 - 1.0; }
        m_cb = 0.0;
        if (m_cb_on > 0.0) {
          m_cq1 = m_cb_q1;
        m_cb1 = m_cq1 < m_cd1 ? (m_cq1 / m_cd1) * 2.0 - (m_cq1 / m_cd1) * (m_cq1 / m_cd1) - 1.0 : (m_cq1 > 1.0 - m_cd1 ? ((m_cq1 - 1.0) / m_cd1) * ((m_cq1 - 1.0) / m_cd1) + ((m_cq1 - 1.0) / m_cd1) * 2.0 + 1.0 : 0.0);
          m_cq1h = m_cq1 + 0.5;
          m_cq1h = m_cq1h - std::floor(m_cq1h);
        m_cb1h = m_cq1h < m_cd1 ? (m_cq1h / m_cd1) * 2.0 - (m_cq1h / m_cd1) * (m_cq1h / m_cd1) - 1.0 : (m_cq1h > 1.0 - m_cd1 ? ((m_cq1h - 1.0) / m_cd1) * ((m_cq1h - 1.0) / m_cd1) + ((m_cq1h - 1.0) / m_cd1) * 2.0 + 1.0 : 0.0);
          m_cq2 = m_cb_q2;
        m_cb2 = m_cq2 < m_cd2 ? (m_cq2 / m_cd2) * 2.0 - (m_cq2 / m_cd2) * (m_cq2 / m_cd2) - 1.0 : (m_cq2 > 1.0 - m_cd2 ? ((m_cq2 - 1.0) / m_cd2) * ((m_cq2 - 1.0) / m_cd2) + ((m_cq2 - 1.0) / m_cd2) * 2.0 + 1.0 : 0.0);
          m_cq2h = m_cq2 + 0.5;
          m_cq2h = m_cq2h - std::floor(m_cq2h);
        m_cb2h = m_cq2h < m_cd2 ? (m_cq2h / m_cd2) * 2.0 - (m_cq2h / m_cd2) * (m_cq2h / m_cd2) - 1.0 : (m_cq2h > 1.0 - m_cd2 ? ((m_cq2h - 1.0) / m_cd2) * ((m_cq2h - 1.0) / m_cd2) + ((m_cq2h - 1.0) / m_cd2) * 2.0 + 1.0 : 0.0);
          m_csq = (m_cq1 < 0.5 ? 1.0 : -1.0) + m_cb1 - m_cb1h + (m_cq2 < 0.5 ? 1.0 : -1.0) + m_cb2 - m_cb2h;
        m_cbfg = std::tan(gen::kPi * gen::clamp(2640.0 * m_cfs * std::pow(2.0, cbton - 0.5), 10.0, m_sr * 0.45) / m_sr);
        m_cbfx = m_csq;
        m_cbf1 = 1.0 / (1.0 + m_cbfg * (m_cbfg + (0.7)));
        m_cbfv3 = m_cbfx - m_cbf_b;
        m_cbfv1 = m_cbf1 * m_cbf_a + m_cbfg * m_cbf1 * m_cbfv3;
        m_cbfv2 = m_cbf_b + m_cbfg * m_cbfv1;
        m_cbf_a = 2.0 * m_cbfv1 - m_cbf_a;
        m_cbf_b = 2.0 * m_cbfv2 - m_cbf_b;
        m_cbb = m_cbfv1;
          m_cb_e1 = m_cb_e1 * std::exp(-1.0 / (m_sr * (0.009)));
          m_cb_e2 = m_cb_e2 * std::exp(-1.0 / (m_sr * (0.04 * std::pow(12.0, cbdec))));
          m_cb = m_cbb * (m_cb_e1 * 0.55 + m_cb_e2 * 0.45) * 0.8 * m_cb_vel * cblev;
          if (m_cb_e2 < 0.0001) { m_cb_on = 0.0; }
          m_mask = m_mask + 128.0;
        }
        m_xL = m_bd * 1.0 + m_sd * 0.95 + m_rs * 1.0 + m_cp * 0.85 + m_ch * 0.65 + m_oh * 0.6 + m_tm * 1.0 + m_cb * 1.0;
        m_xR = m_bd * 1.0 + m_sd * 1.0 + m_rs * 0.7 + m_cp * 1.0 + m_ch * 1.0 + m_oh * 1.0 + m_tm * 0.75 + m_cb * 0.6;
        m_gl = vol * vol * (1.1 + drv * 5.0);
        m_oL = std::tanh(m_xL * m_gl) * (1.0 - drv * 0.3);
        m_oR = std::tanh(m_xR * m_gl) * (1.0 - drv * 0.3);
        m_dcyL = m_oL - m_dcxL + 0.9995 * m_dcyL;
        m_dcxL = m_oL;
        m_dcyR = m_oR - m_dcxR + 0.9995 * m_dcyR;
        m_dcxR = m_oR;
        m_pk = gen::max(gen::max(std::fabs(m_dcyL), std::fabs(m_dcyR)), m_pk * 0.9997);
        out[0] = m_dcyL;
        out[1] = m_dcyR;
        out[2] = m_mask;
        out[3] = m_pk;
    }
};

}  // namespace blonda::puls
