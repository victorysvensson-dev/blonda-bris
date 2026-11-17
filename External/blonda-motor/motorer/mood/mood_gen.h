// GENERERAD FIL – ändra inte för hand.
// Källa: generator/mood.py
// Översatt med generator/genexpr2cpp.py från samma GenExpr som Max for Live-pluggen kör.
#pragma once
#include "blonda/gen_runtime.h"
#include <cstring>

namespace blonda::mood {

struct MoodDsp {
    static constexpr int kNumOutputs = 2;
    static constexpr int kNumInputs = 2;
    static constexpr int kNumGenParams = 21;
    double samplerate = 48000.0;
    gen::Noise rng;

    // Param (sätts utifrån)
    double wet = 0.0;
    double frz = 0.0;
    double wmode = 0.0;
    double time = 0.55;
    double wmod = 0.6;
    double blend = 0.5;
    double clk = 0.75;
    double loop = 0.0;
    double dub = 0.0;
    double lmode = 1.0;
    double len = 1.0;
    double lmod = 0.6875;
    double rout = 1.0;
    double sprd = 0.0;
    double tone = 0.2;
    double width = 0.75;
    double fade = 0.9;
    double half = 0.0;
    double bal = 0.5;
    double dir = 0.5;
    double smth = 0.0;

    // History (tillstånd mellan sampel)
    double m_rlast = 0.0;
    double m_fa1A = 0.0;
    double m_fa2A = 0.0;
    double m_fa3A = 0.0;
    double m_fa1B = 0.0;
    double m_fa2B = 0.0;
    double m_fa3B = 0.0;
    double m_iLA1 = 0.0;
    double m_iLA2 = 0.0;
    double m_iLB1 = 0.0;
    double m_iLB2 = 0.0;
    double m_iRA1 = 0.0;
    double m_iRA2 = 0.0;
    double m_iRB1 = 0.0;
    double m_iRB2 = 0.0;
    double m_oLA1 = 0.0;
    double m_oLA2 = 0.0;
    double m_oLB1 = 0.0;
    double m_oLB2 = 0.0;
    double m_oRA1 = 0.0;
    double m_oRA2 = 0.0;
    double m_oRB1 = 0.0;
    double m_oRB2 = 0.0;
    double m_ph = 0.0;
    double m_act = 0.0;
    double m_sts = 0.0;
    double m_pmL = 0.0;
    double m_pmR = 0.0;
    double m_cmL = 0.0;
    double m_cmR = 0.0;
    double m_wg = 0.0;
    double m_fz = 0.0;
    double m_lg = 0.0;
    double m_lpr = 0.0;
    double m_lst = 0.0;
    double m_llen = 0.0;
    double m_lr = 0.0;
    double m_lh = 0.0;
    double m_lgp = 0.0;
    double m_gs1 = 0.0;
    double m_gs2 = 0.0;
    double m_eg = 0.0;
    double m_egs = 0.0;
    double m_ef = 0.0;
    double m_eq = 0.0;
    double m_ess = 0.0;
    double m_wp = 0.0;
    double m_api = 0.0;
    double m_rl = 0.0;
    double m_rw = 0.0;
    double m_z0 = 0.0;
    double m_z1 = 0.0;
    double m_z2 = 0.0;
    double m_z3 = 0.0;
    double m_dA = 0.0;
    double m_dB = 0.0;
    double m_dxv = 0.0;
    double m_dw = 0.0;
    double m_sw = 0.0;
    double m_sq = 0.0;
    double m_so1 = 0.0;
    double m_so2 = 0.0;
    double m_sv1 = 0.0;
    double m_sv2 = 0.0;
    double m_tL = 0.0;
    double m_tR = 0.0;
    double m_mw0 = 1.0;
    double m_mw1 = 0.0;
    double m_mw2 = 0.0;
    double m_ldg = 1.0;

    // Data (minnesbuffertar)
    gen::Data lb{131072, 2};
    gen::Data db{65536, 2};
    gen::Data sb{65536, 2};
    gen::Data rv0{12000, 1};
    gen::Data ap0{1200, 1};
    gen::Data rv1{12000, 1};
    gen::Data ap1{1200, 1};
    gen::Data rv2{12000, 1};
    gen::Data ap2{1200, 1};
    gen::Data rv3{12000, 1};
    gen::Data ap3{1200, 1};

    // nollställ allt tillstånd (som när gen~ laddas)
    void reset() {
        m_rlast = 0.0;
        m_fa1A = 0.0;
        m_fa2A = 0.0;
        m_fa3A = 0.0;
        m_fa1B = 0.0;
        m_fa2B = 0.0;
        m_fa3B = 0.0;
        m_iLA1 = 0.0;
        m_iLA2 = 0.0;
        m_iLB1 = 0.0;
        m_iLB2 = 0.0;
        m_iRA1 = 0.0;
        m_iRA2 = 0.0;
        m_iRB1 = 0.0;
        m_iRB2 = 0.0;
        m_oLA1 = 0.0;
        m_oLA2 = 0.0;
        m_oLB1 = 0.0;
        m_oLB2 = 0.0;
        m_oRA1 = 0.0;
        m_oRA2 = 0.0;
        m_oRB1 = 0.0;
        m_oRB2 = 0.0;
        m_ph = 0.0;
        m_act = 0.0;
        m_sts = 0.0;
        m_pmL = 0.0;
        m_pmR = 0.0;
        m_cmL = 0.0;
        m_cmR = 0.0;
        m_wg = 0.0;
        m_fz = 0.0;
        m_lg = 0.0;
        m_lpr = 0.0;
        m_lst = 0.0;
        m_llen = 0.0;
        m_lr = 0.0;
        m_lh = 0.0;
        m_lgp = 0.0;
        m_gs1 = 0.0;
        m_gs2 = 0.0;
        m_eg = 0.0;
        m_egs = 0.0;
        m_ef = 0.0;
        m_eq = 0.0;
        m_ess = 0.0;
        m_wp = 0.0;
        m_api = 0.0;
        m_rl = 0.0;
        m_rw = 0.0;
        m_z0 = 0.0;
        m_z1 = 0.0;
        m_z2 = 0.0;
        m_z3 = 0.0;
        m_dA = 0.0;
        m_dB = 0.0;
        m_dxv = 0.0;
        m_dw = 0.0;
        m_sw = 0.0;
        m_sq = 0.0;
        m_so1 = 0.0;
        m_so2 = 0.0;
        m_sv1 = 0.0;
        m_sv2 = 0.0;
        m_tL = 0.0;
        m_tR = 0.0;
        m_mw0 = 1.0;
        m_mw1 = 0.0;
        m_mw2 = 0.0;
        m_ldg = 1.0;
        lb.clear();
        db.clear();
        sb.clear();
        rv0.clear();
        ap0.clear();
        rv1.clear();
        ap1.clear();
        rv2.clear();
        ap2.clear();
        rv3.clear();
        ap3.clear();
        rng = gen::Noise();
    }

    // pekare till en Param via namn (nullptr om den inte finns)
    double* param(const char* name) {
        if (std::strcmp(name, "wet") == 0) return &wet;
        if (std::strcmp(name, "frz") == 0) return &frz;
        if (std::strcmp(name, "wmode") == 0) return &wmode;
        if (std::strcmp(name, "time") == 0) return &time;
        if (std::strcmp(name, "wmod") == 0) return &wmod;
        if (std::strcmp(name, "blend") == 0) return &blend;
        if (std::strcmp(name, "clk") == 0) return &clk;
        if (std::strcmp(name, "loop") == 0) return &loop;
        if (std::strcmp(name, "dub") == 0) return &dub;
        if (std::strcmp(name, "lmode") == 0) return &lmode;
        if (std::strcmp(name, "len") == 0) return &len;
        if (std::strcmp(name, "lmod") == 0) return &lmod;
        if (std::strcmp(name, "rout") == 0) return &rout;
        if (std::strcmp(name, "sprd") == 0) return &sprd;
        if (std::strcmp(name, "tone") == 0) return &tone;
        if (std::strcmp(name, "width") == 0) return &width;
        if (std::strcmp(name, "fade") == 0) return &fade;
        if (std::strcmp(name, "half") == 0) return &half;
        if (std::strcmp(name, "bal") == 0) return &bal;
        if (std::strcmp(name, "dir") == 0) return &dir;
        if (std::strcmp(name, "smth") == 0) return &smth;
        return nullptr;
    }

    // ett sampel; in har kNumInputs värden, out får kNumOutputs värden
    inline void perform(const double* in, double* out) {
        double m_Le = 0.0, m_ac = 0.0, m_ad0 = 0.0, m_ad1 = 0.0, m_ad2 = 0.0, m_ad3 = 0.0, m_adk = 0.0, m_al0 = 0.0;
        double m_al1 = 0.0, m_al2 = 0.0, m_al3 = 0.0, m_aw0 = 0.0, m_aw1 = 0.0, m_aw2 = 0.0, m_aw3 = 0.0, m_bLp = 0.0;
        double m_bW = 0.0, m_byp = 0.0, m_c01 = 0.0, m_daL = 0.0, m_daR = 0.0, m_daf = 0.0, m_dai = 0.0, m_daj = 0.0;
        double m_dap = 0.0, m_ddL = 0.0, m_ddR = 0.0, m_ddf = 0.0, m_ddi = 0.0, m_ddj = 0.0, m_ddp = 0.0, m_dryG = 0.0;
        double m_dt = 0.0, m_dwL = 0.0, m_dwR = 0.0, m_dyL = 0.0, m_dyR = 0.0, m_eaL = 0.0, m_eaR = 0.0, m_eaa0 = 0.0;
        double m_eaa1 = 0.0, m_eab0 = 0.0, m_eab1 = 0.0, m_eabL = 0.0, m_eabR = 0.0, m_eaf = 0.0, m_eai = 0.0, m_ear = 0.0;
        double m_eat = 0.0, m_ebL = 0.0, m_ebR = 0.0, m_eba0 = 0.0, m_eba1 = 0.0, m_ebb0 = 0.0, m_ebb1 = 0.0, m_ebbL = 0.0;
        double m_ebbR = 0.0, m_ebf = 0.0, m_ebi = 0.0, m_ebr = 0.0, m_ebt = 0.0, m_egn = 0.0, m_esp = 0.0, m_esz = 0.0;
        double m_ev = 0.0, m_eww = 0.0, m_exs = 0.0, m_fbk = 0.0, m_fg = 0.0, m_fk = 0.0, m_fon = 0.0, m_fr = 0.0;
        double m_g1 = 0.0, m_g2 = 0.0, m_gin = 0.0, m_gsz = 0.0, m_gw1 = 0.0, m_gw2 = 0.0, m_iL = 0.0, m_iR = 0.0;
        double m_iav1 = 0.0, m_iav2 = 0.0, m_iav3 = 0.0, m_ibv1 = 0.0, m_ibv2 = 0.0, m_ibv3 = 0.0, m_icv1 = 0.0, m_icv2 = 0.0;
        double m_icv3 = 0.0, m_idv1 = 0.0, m_idv2 = 0.0, m_idv3 = 0.0, m_kq = 0.0, m_lbase = 0.0, m_ldt = 0.0, m_lfac = 0.0;
        double m_lfull = 0.0, m_loL = 0.0, m_loR = 0.0, m_lon = 0.0, m_lpan = 0.0, m_lpos = 0.0, m_mG = 0.0, m_mL = 0.0;
        double m_mR = 0.0, m_md = 0.0, m_mfL = 0.0, m_mfR = 0.0, m_moL = 0.0, m_moR = 0.0, m_oav1 = 0.0, m_oav2 = 0.0;
        double m_oav3 = 0.0, m_obv1 = 0.0, m_obv2 = 0.0, m_obv3 = 0.0, m_oc = 0.0, m_ocv1 = 0.0, m_ocv2 = 0.0, m_ocv3 = 0.0;
        double m_odL = 0.0, m_odR = 0.0, m_odv1 = 0.0, m_odv2 = 0.0, m_odv3 = 0.0, m_oi = 0.0, m_q1 = 0.0, m_q2 = 0.0;
        double m_r12 = 0.0, m_r2 = 0.0, m_ratio = 0.0, m_rdk = 0.0, m_rf0 = 0.0, m_rf1 = 0.0, m_rf2 = 0.0, m_rf3 = 0.0;
        double m_rg0 = 0.0, m_rg1 = 0.0, m_rg2 = 0.0, m_rg3 = 0.0, m_rgm = 0.0, m_rh = 0.0, m_ri0 = 0.0, m_ri1 = 0.0;
        double m_ri2 = 0.0, m_ri3 = 0.0, m_rins = 0.0, m_rm0 = 0.0, m_rm1 = 0.0, m_rm2 = 0.0, m_rm3 = 0.0, m_rn0 = 0.0;
        double m_rn1 = 0.0, m_rn2 = 0.0, m_rn3 = 0.0, m_rp0 = 0.0, m_rp1 = 0.0, m_rp2 = 0.0, m_rp3 = 0.0, m_rq = 0.0;
        double m_rs = 0.0, m_rsz = 0.0, m_rt = 0.0, m_rvL = 0.0, m_rvR = 0.0, m_ry0 = 0.0, m_ry1 = 0.0, m_ry2 = 0.0;
        double m_ry3 = 0.0, m_sL = 0.0, m_sR = 0.0, m_saL = 0.0, m_saR = 0.0, m_saa0 = 0.0, m_saa1 = 0.0, m_sab0 = 0.0;
        double m_sab1 = 0.0, m_sabL = 0.0, m_sabR = 0.0, m_saf = 0.0, m_sai = 0.0, m_sar = 0.0, m_sat = 0.0, m_sgL = 0.0;
        double m_sgR = 0.0, m_sga0 = 0.0, m_sga1 = 0.0, m_sgb0 = 0.0, m_sgb1 = 0.0, m_sgbL = 0.0, m_sgbR = 0.0, m_sgf = 0.0;
        double m_sgi = 0.0, m_sgr = 0.0, m_sgt = 0.0, m_si = 0.0, m_slL = 0.0, m_slR = 0.0, m_sln = 0.0, m_spn = 0.0;
        double m_sr = 0.0, m_srt = 0.0, m_ssp = 0.0, m_stq = 0.0, m_stt = 0.0, m_sw1 = 0.0, m_sw2 = 0.0, m_sxL = 0.0;
        double m_sxR = 0.0, m_sxf = 0.0, m_sxi = 0.0, m_sxj = 0.0, m_sxp = 0.0, m_syL = 0.0, m_syR = 0.0, m_syf = 0.0;
        double m_syi = 0.0, m_syj = 0.0, m_syp = 0.0, m_taL = 0.0, m_taR = 0.0, m_taa0 = 0.0, m_taa1 = 0.0, m_tab0 = 0.0;
        double m_tab1 = 0.0, m_tabL = 0.0, m_tabR = 0.0, m_taf = 0.0, m_tai = 0.0, m_tar = 0.0, m_tat = 0.0, m_tfc = 0.0;
        double m_thr = 0.0, m_tk = 0.0, m_tm = 0.0, m_trt = 0.0, m_tsi = 0.0, m_wmd = 0.0, m_woL = 0.0, m_woR = 0.0;
        double m_won = 0.0, m_wsd = 0.0, m_wvL = 0.0, m_wvR = 0.0, m_xL = 0.0, m_xR = 0.0, m_xq = 0.0;
        m_sr = samplerate;
        m_xL = in[0];
        m_xR = in[1];
        m_won = wet > 0.5 ? 1.0 : 0.0;
        m_lon = loop > 0.5 ? 1.0 : 0.0;
        m_act = gen::fixdenorm(m_act + (gen::max(m_won, m_lon) - m_act) * 0.0015);
        m_c01 = gen::clamp(clk, 0.0, 1.0);
        m_kq = 9.0 - std::floor(m_c01 * 9.999);
        m_oc = std::floor(m_kq / 3.0);
        m_rq = m_kq - m_oc * 3.0;
        m_stq = 0.0 - 12.0 * m_oc - (m_rq > 1.5 ? 7.0 : (m_rq > 0.5 ? 5.0 : 0.0));
        m_stt = smth > 0.5 ? (m_c01 - 1.0) * 36.0 : m_stq;
        m_sts = smth > 0.5 ? m_sts + (m_stt - m_sts) * 0.0008 : m_stt;
        m_ratio = std::pow(2.0, m_sts / 12.0);
        m_byp = m_ratio > 0.999 ? 1.0 : 0.0;
        if (std::fabs(m_ratio - m_rlast) > 0.000000001) {
            m_rlast = m_ratio;
            m_fg = std::tan(gen::kPi * gen::min(0.45 * m_ratio, 0.49));
            m_fa1A = 1.0 / (1.0 + m_fg * (m_fg + 1.847759));
            m_fa2A = m_fg * m_fa1A;
            m_fa3A = m_fg * m_fa2A;
            m_fa1B = 1.0 / (1.0 + m_fg * (m_fg + 0.765367));
            m_fa2B = m_fg * m_fa1B;
            m_fa3B = m_fg * m_fa2B;
        }
        m_iav3 = m_xL - m_iLA2;
        m_iav1 = m_fa1A * m_iLA1 + m_fa2A * m_iav3;
        m_iav2 = m_iLA2 + m_fa2A * m_iLA1 + m_fa3A * m_iav3;
        m_iLA1 = gen::fixdenorm(2.0 * m_iav1 - m_iLA1);
        m_iLA2 = gen::fixdenorm(2.0 * m_iav2 - m_iLA2);
        m_ibv3 = m_iav2 - m_iLB2;
        m_ibv1 = m_fa1B * m_iLB1 + m_fa2B * m_ibv3;
        m_ibv2 = m_iLB2 + m_fa2B * m_iLB1 + m_fa3B * m_ibv3;
        m_iLB1 = gen::fixdenorm(2.0 * m_ibv1 - m_iLB1);
        m_iLB2 = gen::fixdenorm(2.0 * m_ibv2 - m_iLB2);
        m_icv3 = m_xR - m_iRA2;
        m_icv1 = m_fa1A * m_iRA1 + m_fa2A * m_icv3;
        m_icv2 = m_iRA2 + m_fa2A * m_iRA1 + m_fa3A * m_icv3;
        m_iRA1 = gen::fixdenorm(2.0 * m_icv1 - m_iRA1);
        m_iRA2 = gen::fixdenorm(2.0 * m_icv2 - m_iRA2);
        m_idv3 = m_icv2 - m_iRB2;
        m_idv1 = m_fa1B * m_iRB1 + m_fa2B * m_idv3;
        m_idv2 = m_iRB2 + m_fa2B * m_iRB1 + m_fa3B * m_idv3;
        m_iRB1 = gen::fixdenorm(2.0 * m_idv1 - m_iRB1);
        m_iRB2 = gen::fixdenorm(2.0 * m_idv2 - m_iRB2);
        m_ph = m_ph + m_ratio;
        if (m_ph >= 1.0) {
            m_ph = m_ph - 1.0;
            m_iL = m_byp > 0.5 ? m_xL : m_ibv2;
            m_iR = m_byp > 0.5 ? m_xR : m_idv2;
            m_wg = gen::fixdenorm(m_wg + (m_won - m_wg) * 0.004);
            m_fon = (m_won > 0.5 && frz > 0.5) ? 1.0 : 0.0;
            m_fz = gen::fixdenorm(m_fz + (m_fon - m_fz) * 0.004);
            m_lg = gen::fixdenorm(m_lg + (m_lon - m_lg) * 0.02);
            m_lfull = (half > 0.5 ? 65536.0 : 131072.0) - 512.0;
            if (m_lon > 0.5 && m_lpr < 0.5) {
              m_lst = gen::wrap(m_wp - m_lfull, 0.0, 131072.0);
              m_llen = m_lfull;
              m_lr = 0.0;
              m_lh = gen::max(0.0, m_lfull - std::floor(m_sr * 0.5) - 2048.0);
              m_lgp = 0.0;
              m_gs1 = 0.0;
              m_gs2 = 0.0;
              m_eg = 0.0;
              m_egs = 0.0;
              m_eq = 0.0;
              m_ess = 0.0;
            }
            m_lpr = m_lon;
            m_lfac = (lmode > 0.5 && lmode < 1.5) ? 0.0625 + 0.9375 * gen::clamp(len, 0.0, 1.0) : 1.0;
            m_Le = gen::max(64.0, std::floor(gen::min(m_llen, m_lfull) * m_lfac));
            m_xq = gen::min(256.0, std::floor(m_Le / 4.0));
            m_lbase = gen::wrap(m_lst + gen::min(m_llen, m_lfull) - m_Le, 0.0, 131072.0);
            m_loL = 0.0;
            m_loR = 0.0;
            m_lpos = m_lr;
            if (lmode > 0.5 && lmode < 1.5) {
              m_tsi = std::floor(gen::clamp(lmod, 0.0, 1.0) * 7.999);
              m_trt = (m_tsi < 3.5 ? -1.0 : 1.0) * std::pow(2.0, std::fabs(m_tsi - 3.5) - 1.5);
              if (m_lon > 0.5) {
                m_lr = gen::wrap(m_lr + m_trt, 0.0, m_Le);
              }
            m_tar = m_lr;
            m_tai = std::floor(m_tar);
            m_taf = m_tar - m_tai;
            m_taa0 = gen::wrap(m_lbase + m_tai, 0.0, 131072.0);
            m_taa1 = gen::wrap(m_taa0 + 1.0, 0.0, 131072.0);
            m_taL = lb.peek( m_taa0, 0.0);
            m_taL = m_taL + (lb.peek( m_taa1, 0.0) - m_taL) * m_taf;
            m_taR = lb.peek( m_taa0, 1.0);
            m_taR = m_taR + (lb.peek( m_taa1, 1.0) - m_taR) * m_taf;
            m_tat = gen::clamp((m_tar - (m_Le - m_xq)) / m_xq, 0.0, 1.0);
            if (m_tat > 0.0) {
              m_tat = m_tat * m_tat * (3.0 - 2.0 * m_tat);
              m_tab0 = gen::wrap(m_taa0 - m_Le, 0.0, 131072.0);
              m_tab1 = gen::wrap(m_tab0 + 1.0, 0.0, 131072.0);
              m_tabL = lb.peek( m_tab0, 0.0);
              m_tabL = m_tabL + (lb.peek( m_tab1, 0.0) - m_tabL) * m_taf;
              m_tabR = lb.peek( m_tab0, 1.0);
              m_tabR = m_tabR + (lb.peek( m_tab1, 1.0) - m_tabR) * m_taf;
              m_taL = m_taL + (m_tabL - m_taL) * m_tat;
              m_taR = m_taR + (m_tabR - m_taR) * m_tat;
            }
              m_loL = m_taL;
              m_loR = m_taR;
              m_lpos = m_lr;
            }
            if (lmode < 0.5) {
              m_esz = gen::clamp(std::floor(m_sr * 0.015 * std::pow(100.0, gen::clamp(len, 0.0, 1.0))), 32.0, m_Le);
              m_ev = gen::max(std::fabs(m_iL), std::fabs(m_iR));
              m_ef = m_ev > m_ef ? m_ev : gen::fixdenorm(m_ef * 0.9993);
              m_thr = 0.6 * std::pow(0.004, gen::clamp(lmod, 0.0, 1.0));
              m_egn = m_eg;
              if (m_ef > m_thr && lmod >= 0.01) {
                m_egn = 1.0;
              }
              if (m_ef < m_thr * 0.5 || lmod < 0.01) {
                m_egn = 0.0;
              }
              if (m_egn > 0.5 && m_eg < 0.5) {
                m_ess = m_lr;
                m_eq = 0.0;
              }
              m_eg = m_egn;
              m_egs = gen::fixdenorm(m_egs + (m_eg - m_egs) * 0.01);
              if (m_lon > 0.5) {
                m_lr = gen::wrap(m_lr + 1.0 - m_eg, 0.0, m_Le);
                m_eq = gen::wrap(m_eq + m_eg, 0.0, m_esz);
              }
              m_esp = gen::wrap(m_ess + m_eq, 0.0, m_Le);
            m_ear = m_lr;
            m_eai = std::floor(m_ear);
            m_eaf = m_ear - m_eai;
            m_eaa0 = gen::wrap(m_lbase + m_eai, 0.0, 131072.0);
            m_eaa1 = gen::wrap(m_eaa0 + 1.0, 0.0, 131072.0);
            m_eaL = lb.peek( m_eaa0, 0.0);
            m_eaL = m_eaL + (lb.peek( m_eaa1, 0.0) - m_eaL) * m_eaf;
            m_eaR = lb.peek( m_eaa0, 1.0);
            m_eaR = m_eaR + (lb.peek( m_eaa1, 1.0) - m_eaR) * m_eaf;
            m_eat = gen::clamp((m_ear - (m_Le - m_xq)) / m_xq, 0.0, 1.0);
            if (m_eat > 0.0) {
              m_eat = m_eat * m_eat * (3.0 - 2.0 * m_eat);
              m_eab0 = gen::wrap(m_eaa0 - m_Le, 0.0, 131072.0);
              m_eab1 = gen::wrap(m_eab0 + 1.0, 0.0, 131072.0);
              m_eabL = lb.peek( m_eab0, 0.0);
              m_eabL = m_eabL + (lb.peek( m_eab1, 0.0) - m_eabL) * m_eaf;
              m_eabR = lb.peek( m_eab0, 1.0);
              m_eabR = m_eabR + (lb.peek( m_eab1, 1.0) - m_eabR) * m_eaf;
              m_eaL = m_eaL + (m_eabL - m_eaL) * m_eat;
              m_eaR = m_eaR + (m_eabR - m_eaR) * m_eat;
            }
            m_ebr = m_esp;
            m_ebi = std::floor(m_ebr);
            m_ebf = m_ebr - m_ebi;
            m_eba0 = gen::wrap(m_lbase + m_ebi, 0.0, 131072.0);
            m_eba1 = gen::wrap(m_eba0 + 1.0, 0.0, 131072.0);
            m_ebL = lb.peek( m_eba0, 0.0);
            m_ebL = m_ebL + (lb.peek( m_eba1, 0.0) - m_ebL) * m_ebf;
            m_ebR = lb.peek( m_eba0, 1.0);
            m_ebR = m_ebR + (lb.peek( m_eba1, 1.0) - m_ebR) * m_ebf;
            m_ebt = gen::clamp((m_ebr - (m_Le - m_xq)) / m_xq, 0.0, 1.0);
            if (m_ebt > 0.0) {
              m_ebt = m_ebt * m_ebt * (3.0 - 2.0 * m_ebt);
              m_ebb0 = gen::wrap(m_eba0 - m_Le, 0.0, 131072.0);
              m_ebb1 = gen::wrap(m_ebb0 + 1.0, 0.0, 131072.0);
              m_ebbL = lb.peek( m_ebb0, 0.0);
              m_ebbL = m_ebbL + (lb.peek( m_ebb1, 0.0) - m_ebbL) * m_ebf;
              m_ebbR = lb.peek( m_ebb0, 1.0);
              m_ebbR = m_ebbR + (lb.peek( m_ebb1, 1.0) - m_ebbR) * m_ebf;
              m_ebL = m_ebL + (m_ebbL - m_ebL) * m_ebt;
              m_ebR = m_ebR + (m_ebbR - m_ebR) * m_ebt;
            }
              m_exs = gen::max(8.0, std::floor(m_esz / 4.0));
              m_eww = gen::clamp(gen::min(m_eq, m_esz - m_eq) / m_exs, 0.0, 1.0);
              m_loL = m_eaL * (1.0 - m_egs) + m_ebL * m_eww * m_egs;
              m_loR = m_eaR * (1.0 - m_egs) + m_ebR * m_eww * m_egs;
              m_lpos = m_eg > 0.5 ? m_esp : m_lr;
            }
            if (lmode > 1.5) {
              m_gsz = gen::clamp(std::floor(m_sr * 0.02 * std::pow(25.0, gen::clamp(len, 0.0, 1.0))), 32.0, std::floor(m_Le / 2.0));
              m_srt = (gen::clamp(lmod, 0.0, 1.0) - 0.5) * 2.0;
              m_srt = std::fabs(m_srt) < 0.04 ? 0.0 : m_srt;
              if (m_lon > 0.5) {
                m_lh = gen::wrap(m_lh + m_srt, 0.0, m_Le);
                m_lgp = gen::wrap(m_lgp + 1.0, 0.0, m_gsz);
              }
              m_g1 = m_lgp;
              m_g2 = gen::wrap(m_lgp + std::floor(m_gsz / 2.0), 0.0, m_gsz);
              if (m_g1 < 1.0) {
                m_gs1 = m_lh;
              }
              if (m_g2 < 1.0) {
                m_gs2 = m_lh;
              }
            m_sar = gen::wrap(m_gs1 + m_g1, 0.0, m_Le);
            m_sai = std::floor(m_sar);
            m_saf = m_sar - m_sai;
            m_saa0 = gen::wrap(m_lbase + m_sai, 0.0, 131072.0);
            m_saa1 = gen::wrap(m_saa0 + 1.0, 0.0, 131072.0);
            m_saL = lb.peek( m_saa0, 0.0);
            m_saL = m_saL + (lb.peek( m_saa1, 0.0) - m_saL) * m_saf;
            m_saR = lb.peek( m_saa0, 1.0);
            m_saR = m_saR + (lb.peek( m_saa1, 1.0) - m_saR) * m_saf;
            m_sat = gen::clamp((m_sar - (m_Le - m_xq)) / m_xq, 0.0, 1.0);
            if (m_sat > 0.0) {
              m_sat = m_sat * m_sat * (3.0 - 2.0 * m_sat);
              m_sab0 = gen::wrap(m_saa0 - m_Le, 0.0, 131072.0);
              m_sab1 = gen::wrap(m_sab0 + 1.0, 0.0, 131072.0);
              m_sabL = lb.peek( m_sab0, 0.0);
              m_sabL = m_sabL + (lb.peek( m_sab1, 0.0) - m_sabL) * m_saf;
              m_sabR = lb.peek( m_sab0, 1.0);
              m_sabR = m_sabR + (lb.peek( m_sab1, 1.0) - m_sabR) * m_saf;
              m_saL = m_saL + (m_sabL - m_saL) * m_sat;
              m_saR = m_saR + (m_sabR - m_saR) * m_sat;
            }
            m_sgr = gen::wrap(m_gs2 + m_g2, 0.0, m_Le);
            m_sgi = std::floor(m_sgr);
            m_sgf = m_sgr - m_sgi;
            m_sga0 = gen::wrap(m_lbase + m_sgi, 0.0, 131072.0);
            m_sga1 = gen::wrap(m_sga0 + 1.0, 0.0, 131072.0);
            m_sgL = lb.peek( m_sga0, 0.0);
            m_sgL = m_sgL + (lb.peek( m_sga1, 0.0) - m_sgL) * m_sgf;
            m_sgR = lb.peek( m_sga0, 1.0);
            m_sgR = m_sgR + (lb.peek( m_sga1, 1.0) - m_sgR) * m_sgf;
            m_sgt = gen::clamp((m_sgr - (m_Le - m_xq)) / m_xq, 0.0, 1.0);
            if (m_sgt > 0.0) {
              m_sgt = m_sgt * m_sgt * (3.0 - 2.0 * m_sgt);
              m_sgb0 = gen::wrap(m_sga0 - m_Le, 0.0, 131072.0);
              m_sgb1 = gen::wrap(m_sgb0 + 1.0, 0.0, 131072.0);
              m_sgbL = lb.peek( m_sgb0, 0.0);
              m_sgbL = m_sgbL + (lb.peek( m_sgb1, 0.0) - m_sgbL) * m_sgf;
              m_sgbR = lb.peek( m_sgb0, 1.0);
              m_sgbR = m_sgbR + (lb.peek( m_sgb1, 1.0) - m_sgbR) * m_sgf;
              m_sgL = m_sgL + (m_sgbL - m_sgL) * m_sgt;
              m_sgR = m_sgR + (m_sgbR - m_sgR) * m_sgt;
            }
              m_gw1 = 1.0 - std::fabs(2.0 * m_g1 / m_gsz - 1.0);
              m_gw2 = 1.0 - std::fabs(2.0 * m_g2 / m_gsz - 1.0);
              m_loL = m_saL * m_gw1 + m_sgL * m_gw2;
              m_loR = m_saR * m_gw1 + m_sgR * m_gw2;
              m_lpos = m_lh;
            }
            m_lpan = sprd > 0.5 ? 0.6 * std::sin(gen::kTwoPi * m_lpos / m_Le) : 0.0;
            m_loL = m_loL * m_lg * (1.0 - m_lpan);
            m_loR = m_loR * m_lg * (1.0 + m_lpan);
            m_r12 = rout > 0.5 ? 1.0 : 0.0;
            m_r2 = rout > 1.5 ? 1.0 : 0.0;
            m_gin = m_wg * (1.0 - m_fz);
            m_sL = (m_iL * (1.0 - m_lg * m_r2) + m_loL * m_r12) * m_gin;
            m_sR = (m_iR * (1.0 - m_lg * m_r2) + m_loR * m_r12) * m_gin;
            m_mw0 = gen::fixdenorm(m_mw0 + ((wmode < 0.5 ? 1.0 : 0.0) - m_mw0) * 0.003);
            m_mw1 = gen::fixdenorm(m_mw1 + (((wmode > 0.5 && wmode < 1.5) ? 1.0 : 0.0) - m_mw1) * 0.003);
            m_mw2 = gen::fixdenorm(m_mw2 + ((wmode > 1.5 ? 1.0 : 0.0) - m_mw2) * 0.003);
            m_tm = gen::clamp(time, 0.0, 1.0);
            m_md = gen::clamp(wmod, 0.0, 1.0);
            m_rs = m_sr / 48000.0;
            m_rsz = 0.35 + 1.65 * m_tm;
            m_rt = 0.35 * std::pow(60.0, m_tm);
            m_ac = 0.7 * m_md;
            m_adk = 1.0 - std::exp(-gen::kTwoPi * 6500.0 / m_sr);
            m_rdk = m_adk + (1.0 - m_adk) * m_fz;
            m_rgm = std::pow(0.001, 1700.0 * m_rsz * m_rs / (m_rt * m_sr));
            m_rins = 1.0 * std::sqrt(1.0 - m_rgm * m_rgm);
            m_al0 = ap0.peek( gen::wrap(m_api - std::floor(142.0 * m_rs), 0.0, 1200.0), 0.0);
            m_aw0 = m_sL + m_ac * m_al0;
            m_ad0 = m_al0 - m_ac * m_aw0;
            ap0.poke( gen::fixdenorm(m_aw0), m_api, 0.0);
            m_al1 = ap1.peek( gen::wrap(m_api - std::floor(107.0 * m_rs), 0.0, 1200.0), 0.0);
            m_aw1 = m_ad0 + m_ac * m_al1;
            m_ad1 = m_al1 - m_ac * m_aw1;
            ap1.poke( gen::fixdenorm(m_aw1), m_api, 0.0);
            m_al2 = ap2.peek( gen::wrap(m_api - std::floor(379.0 * m_rs), 0.0, 1200.0), 0.0);
            m_aw2 = m_sR + m_ac * m_al2;
            m_ad2 = m_al2 - m_ac * m_aw2;
            ap2.poke( gen::fixdenorm(m_aw2), m_api, 0.0);
            m_al3 = ap3.peek( gen::wrap(m_api - std::floor(277.0 * m_rs), 0.0, 1200.0), 0.0);
            m_aw3 = m_ad2 + m_ac * m_al3;
            m_ad3 = m_al3 - m_ac * m_aw3;
            ap3.poke( gen::fixdenorm(m_aw3), m_api, 0.0);
            m_api = gen::wrap(m_api + 1.0, 0.0, 1200.0);
            m_rl = gen::wrap(m_rl + 0.5 / m_sr, 0.0, 1.0);
            m_rn0 = gen::min(11960.0, 1123.0 * m_rsz * m_rs);
            m_rm0 = (3.0 + 7.0 * m_md) * m_rs * std::sin(gen::kTwoPi * m_rl + 0.0);
            m_rp0 = gen::wrap(m_rw - m_rn0 - m_rm0 - 2.0, 0.0, 12000.0);
            m_ri0 = std::floor(m_rp0);
            m_rf0 = m_rp0 - m_ri0;
            m_ry0 = rv0.peek( m_ri0, 0.0);
            m_ry0 = m_ry0 + (rv0.peek( gen::wrap(m_ri0 + 1.0, 0.0, 12000.0), 0.0) - m_ry0) * m_rf0;
            m_rg0 = std::pow(0.001, m_rn0 / (m_rt * m_sr));
            m_rg0 = m_rg0 + (1.0 - m_rg0) * m_fz;
            m_rn1 = gen::min(11960.0, 1499.0 * m_rsz * m_rs);
            m_rm1 = (3.0 + 7.0 * m_md) * m_rs * std::sin(gen::kTwoPi * m_rl + 1.7);
            m_rp1 = gen::wrap(m_rw - m_rn1 - m_rm1 - 2.0, 0.0, 12000.0);
            m_ri1 = std::floor(m_rp1);
            m_rf1 = m_rp1 - m_ri1;
            m_ry1 = rv1.peek( m_ri1, 0.0);
            m_ry1 = m_ry1 + (rv1.peek( gen::wrap(m_ri1 + 1.0, 0.0, 12000.0), 0.0) - m_ry1) * m_rf1;
            m_rg1 = std::pow(0.001, m_rn1 / (m_rt * m_sr));
            m_rg1 = m_rg1 + (1.0 - m_rg1) * m_fz;
            m_rn2 = gen::min(11960.0, 1871.0 * m_rsz * m_rs);
            m_rm2 = (3.0 + 7.0 * m_md) * m_rs * std::sin(gen::kTwoPi * m_rl + 3.4);
            m_rp2 = gen::wrap(m_rw - m_rn2 - m_rm2 - 2.0, 0.0, 12000.0);
            m_ri2 = std::floor(m_rp2);
            m_rf2 = m_rp2 - m_ri2;
            m_ry2 = rv2.peek( m_ri2, 0.0);
            m_ry2 = m_ry2 + (rv2.peek( gen::wrap(m_ri2 + 1.0, 0.0, 12000.0), 0.0) - m_ry2) * m_rf2;
            m_rg2 = std::pow(0.001, m_rn2 / (m_rt * m_sr));
            m_rg2 = m_rg2 + (1.0 - m_rg2) * m_fz;
            m_rn3 = gen::min(11960.0, 2311.0 * m_rsz * m_rs);
            m_rm3 = (3.0 + 7.0 * m_md) * m_rs * std::sin(gen::kTwoPi * m_rl + 5.1);
            m_rp3 = gen::wrap(m_rw - m_rn3 - m_rm3 - 2.0, 0.0, 12000.0);
            m_ri3 = std::floor(m_rp3);
            m_rf3 = m_rp3 - m_ri3;
            m_ry3 = rv3.peek( m_ri3, 0.0);
            m_ry3 = m_ry3 + (rv3.peek( gen::wrap(m_ri3 + 1.0, 0.0, 12000.0), 0.0) - m_ry3) * m_rf3;
            m_rg3 = std::pow(0.001, m_rn3 / (m_rt * m_sr));
            m_rg3 = m_rg3 + (1.0 - m_rg3) * m_fz;
            m_rh = (m_ry0 + m_ry1 + m_ry2 + m_ry3) * 0.5;
            m_z0 = gen::fixdenorm(m_z0 + (m_ry0 - m_rh - m_z0) * m_rdk);
            rv0.poke( gen::fixdenorm(m_ad1 * m_rins + m_rg0 * m_z0), m_rw, 0.0);
            m_z1 = gen::fixdenorm(m_z1 + (m_ry1 - m_rh - m_z1) * m_rdk);
            rv1.poke( gen::fixdenorm(m_ad3 * m_rins + m_rg1 * m_z1), m_rw, 0.0);
            m_z2 = gen::fixdenorm(m_z2 + (m_ry2 - m_rh - m_z2) * m_rdk);
            rv2.poke( gen::fixdenorm(m_ad1 * m_rins + m_rg2 * m_z2), m_rw, 0.0);
            m_z3 = gen::fixdenorm(m_z3 + (m_ry3 - m_rh - m_z3) * m_rdk);
            rv3.poke( gen::fixdenorm(m_ad3 * m_rins + m_rg3 * m_z3), m_rw, 0.0);
            m_rw = gen::wrap(m_rw + 1.0, 0.0, 12000.0);
            m_rvL = sprd > 0.5 ? (m_ry0 - m_ry3) * 0.7 : (m_ry0 + m_ry2) * 0.5;
            m_rvR = sprd > 0.5 ? (m_ry1 - m_ry2) * 0.7 : (m_ry1 + m_ry3) * 0.5;
            m_dt = gen::clamp(std::floor(m_sr * 0.03 * std::pow(40.0, m_tm)), 4.0, 65532.0);
            if (m_dxv <= 0.0 && std::fabs(m_dt - m_dA) > 0.5) {
              m_dB = m_dt;
              m_dxv = 0.0001;
            }
            if (m_dxv > 0.0) {
              m_dxv = m_dxv + 0.001;
            }
            if (m_dxv >= 1.0) {
              m_dA = m_dB;
              m_dxv = 0.0;
            }
            m_dap = gen::wrap(m_dw - m_dA, 0.0, 65536.0);
            m_dai = std::floor(m_dap);
            m_daf = m_dap - m_dai;
            m_daj = gen::wrap(m_dai + 1.0, 0.0, 65536.0);
            m_daL = db.peek( m_dai, 0.0);
            m_daL = m_daL + (db.peek( m_daj, 0.0) - m_daL) * m_daf;
            m_daR = db.peek( m_dai, 1.0);
            m_daR = m_daR + (db.peek( m_daj, 1.0) - m_daR) * m_daf;
            m_ddp = gen::wrap(m_dw - m_dB, 0.0, 65536.0);
            m_ddi = std::floor(m_ddp);
            m_ddf = m_ddp - m_ddi;
            m_ddj = gen::wrap(m_ddi + 1.0, 0.0, 65536.0);
            m_ddL = db.peek( m_ddi, 0.0);
            m_ddL = m_ddL + (db.peek( m_ddj, 0.0) - m_ddL) * m_ddf;
            m_ddR = db.peek( m_ddi, 1.0);
            m_ddR = m_ddR + (db.peek( m_ddj, 1.0) - m_ddR) * m_ddf;
            m_dyL = m_daL + (m_ddL - m_daL) * m_dxv;
            m_dyR = m_daR + (m_ddR - m_daR) * m_dxv;
            m_fbk = m_won > 0.5 ? m_md : gen::min(m_md, 0.8);
            m_fbk = m_fbk + (1.0 - m_fbk) * m_fz;
            m_dwL = sprd > 0.5 ? (m_sL + m_sR) * 0.5 + m_fbk * m_dyR : m_sL + m_fbk * m_dyL;
            m_dwR = sprd > 0.5 ? m_fbk * m_dyL : m_sR + m_fbk * m_dyR;
            m_dwL = m_dwL / (1.0 + gen::max(0.0, std::fabs(m_dwL) - 1.2) * 0.6);
            m_dwR = m_dwR / (1.0 + gen::max(0.0, std::fabs(m_dwR) - 1.2) * 0.6);
            db.poke( gen::fixdenorm(m_dwL), m_dw, 0.0);
            db.poke( gen::fixdenorm(m_dwR), m_dw, 1.0);
            m_dw = gen::wrap(m_dw + 1.0, 0.0, 65536.0);
            m_si = std::floor(m_md * 9.999);
            m_ssp = m_si < 0.5 ? -2.0 : (m_si < 1.5 ? -1.0 : (m_si < 2.5 ? -0.5 : (m_si < 3.5 ? 0.5 : (m_si < 4.5 ? 0.66742 : (m_si < 5.5 ? 0.749154 : (m_si < 6.5 ? 1.0 : (m_si < 7.5 ? 1.33484 : (m_si < 8.5 ? 1.498307 : 2.0))))))));
            m_sln = std::floor(m_sr * 0.04 * std::pow(40.0, m_tm));
            m_sln = gen::max(64.0, gen::min(m_sln, std::floor(65000.0 / (std::fabs(m_ssp) + 1.0))));
            if (m_fz < 0.5) {
              sb.poke( m_sL, m_sw, 0.0);
              sb.poke( m_sR, m_sw, 1.0);
              m_sw = gen::wrap(m_sw + 1.0, 0.0, 65536.0);
            }
            m_sq = gen::wrap(m_sq + 1.0, 0.0, m_sln);
            m_q1 = m_sq;
            m_q2 = gen::wrap(m_sq + std::floor(m_sln / 2.0), 0.0, m_sln);
            if (m_q1 < 1.0) {
              m_so1 = m_sw - 2.0 - (m_ssp > 0.0 ? m_ssp * m_sln : 0.0);
              m_sv1 = m_ssp;
            }
            if (m_q2 < 1.0) {
              m_so2 = m_sw - 2.0 - (m_ssp > 0.0 ? m_ssp * m_sln : 0.0);
              m_sv2 = m_ssp;
            }
            m_sxp = gen::wrap(m_so1 + m_sv1 * m_q1, 0.0, 65536.0);
            m_sxi = std::floor(m_sxp);
            m_sxf = m_sxp - m_sxi;
            m_sxj = gen::wrap(m_sxi + 1.0, 0.0, 65536.0);
            m_sxL = sb.peek( m_sxi, 0.0);
            m_sxL = m_sxL + (sb.peek( m_sxj, 0.0) - m_sxL) * m_sxf;
            m_sxR = sb.peek( m_sxi, 1.0);
            m_sxR = m_sxR + (sb.peek( m_sxj, 1.0) - m_sxR) * m_sxf;
            m_syp = gen::wrap(m_so2 + m_sv2 * m_q2, 0.0, 65536.0);
            m_syi = std::floor(m_syp);
            m_syf = m_syp - m_syi;
            m_syj = gen::wrap(m_syi + 1.0, 0.0, 65536.0);
            m_syL = sb.peek( m_syi, 0.0);
            m_syL = m_syL + (sb.peek( m_syj, 0.0) - m_syL) * m_syf;
            m_syR = sb.peek( m_syi, 1.0);
            m_syR = m_syR + (sb.peek( m_syj, 1.0) - m_syR) * m_syf;
            m_sw1 = 1.0 - std::fabs(2.0 * m_q1 / m_sln - 1.0);
            m_sw2 = 1.0 - std::fabs(2.0 * m_q2 / m_sln - 1.0);
            m_spn = sprd > 0.5 ? 0.8 : 0.0;
            m_slL = m_sxL * m_sw1 * (1.0 + m_spn) + m_syL * m_sw2 * (1.0 - m_spn);
            m_slR = m_sxR * m_sw1 * (1.0 - m_spn) + m_syR * m_sw2 * (1.0 + m_spn);
            m_wvL = m_rvL * m_mw0 + m_dyL * m_mw1 + m_slL * m_mw2;
            m_wvR = m_rvR * m_mw0 + m_dyR * m_mw1 + m_slR * m_mw2;
            m_tfc = 18000.0 * std::pow(0.025, gen::clamp(tone, 0.0, 1.0));
            m_tk = gen::min(1.0, 1.0 - std::exp(-gen::kTwoPi * m_tfc / (m_sr * m_ratio)));
            m_tL = gen::fixdenorm(m_tL + (m_wvL - m_tL) * m_tk);
            m_tR = gen::fixdenorm(m_tR + (m_wvR - m_tR) * m_tk);
            m_wmd = (m_tL + m_tR) * 0.5;
            m_wsd = (m_tL - m_tR) * 0.5 * (sprd > 0.5 ? 2.0 * gen::clamp(width, 0.0, 1.0) : 1.0);
            m_woL = m_wmd + m_wsd;
            m_woR = m_wmd - m_wsd;
            m_ldt = (m_won > 0.5 && rout > 0.5) ? gen::clamp(dir, 0.0, 1.0) : 1.0;
            m_ldg = gen::fixdenorm(m_ldg + (m_ldt - m_ldg) * 0.004);
            m_bW = gen::min(1.0, 2.0 - 2.0 * bal);
            m_bLp = gen::min(1.0, 2.0 * bal);
            m_moL = m_woL * m_bW + m_loL * m_ldg * m_bLp;
            m_moR = m_woR * m_bW + m_loR * m_ldg * m_bLp;
            if (m_lon < 0.5) {
              lb.poke( m_iL + m_woL * m_wg, m_wp, 0.0);
              lb.poke( m_iR + m_woR * m_wg, m_wp, 1.0);
              m_wp = gen::wrap(m_wp + 1.0, 0.0, 131072.0);
            }
            if (m_lon > 0.5 && dub > 0.5) {
              m_oi = gen::wrap(m_lbase + std::floor(m_lpos), 0.0, 131072.0);
              m_fk = 0.6 + 0.4 * gen::clamp(fade, 0.0, 1.0);
              m_odL = lb.peek( m_oi, 0.0) * m_fk + m_iL;
              m_odR = lb.peek( m_oi, 1.0) * m_fk + m_iR;
              lb.poke( gen::fixdenorm(m_odL / (1.0 + gen::max(0.0, std::fabs(m_odL) - 1.2) * 0.6)), m_oi, 0.0);
              lb.poke( gen::fixdenorm(m_odR / (1.0 + gen::max(0.0, std::fabs(m_odR) - 1.2) * 0.6)), m_oi, 1.0);
            }
            m_pmL = m_cmL;
            m_pmR = m_cmR;
            m_cmL = m_moL;
            m_cmR = m_moR;
        }
        m_fr = m_ph;
        m_mL = m_pmL + (m_cmL - m_pmL) * m_fr;
        m_mR = m_pmR + (m_cmR - m_pmR) * m_fr;
        m_oav3 = m_mL - m_oLA2;
        m_oav1 = m_fa1A * m_oLA1 + m_fa2A * m_oav3;
        m_oav2 = m_oLA2 + m_fa2A * m_oLA1 + m_fa3A * m_oav3;
        m_oLA1 = gen::fixdenorm(2.0 * m_oav1 - m_oLA1);
        m_oLA2 = gen::fixdenorm(2.0 * m_oav2 - m_oLA2);
        m_obv3 = m_oav2 - m_oLB2;
        m_obv1 = m_fa1B * m_oLB1 + m_fa2B * m_obv3;
        m_obv2 = m_oLB2 + m_fa2B * m_oLB1 + m_fa3B * m_obv3;
        m_oLB1 = gen::fixdenorm(2.0 * m_obv1 - m_oLB1);
        m_oLB2 = gen::fixdenorm(2.0 * m_obv2 - m_oLB2);
        m_ocv3 = m_mR - m_oRA2;
        m_ocv1 = m_fa1A * m_oRA1 + m_fa2A * m_ocv3;
        m_ocv2 = m_oRA2 + m_fa2A * m_oRA1 + m_fa3A * m_ocv3;
        m_oRA1 = gen::fixdenorm(2.0 * m_ocv1 - m_oRA1);
        m_oRA2 = gen::fixdenorm(2.0 * m_ocv2 - m_oRA2);
        m_odv3 = m_ocv2 - m_oRB2;
        m_odv1 = m_fa1B * m_oRB1 + m_fa2B * m_odv3;
        m_odv2 = m_oRB2 + m_fa2B * m_oRB1 + m_fa3B * m_odv3;
        m_oRB1 = gen::fixdenorm(2.0 * m_odv1 - m_oRB1);
        m_oRB2 = gen::fixdenorm(2.0 * m_odv2 - m_oRB2);
        m_mfL = m_byp > 0.5 ? m_mL : m_obv2;
        m_mfR = m_byp > 0.5 ? m_mR : m_odv2;
        m_dryG = 1.0 - m_act * (1.0 - gen::min(1.0, 2.0 - 2.0 * blend));
        m_mG = gen::min(1.0, 2.0 * blend);
        out[0] = m_xL * m_dryG + m_mfL * m_mG;
        out[1] = m_xR * m_dryG + m_mfR * m_mG;
    }
};

}  // namespace blonda::mood
