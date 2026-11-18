// BLONDA BRIS – bandspelaren i KASSETTEN: ett riktigt band som går att spela in på, spela upp och spola.
//
// Bandet är en buffert (16 bitar stereo, ca 60 s) med ett läshuvud som rör sig med bandets fart. Motorn har
// tröghet: bandet tar fart och bromsar in (tonhöjden glider som på en riktig bandspelare), och vid spolning läses
// bandet i hög fart så att det som spelats in hörs som ett ljust tjatter. Huvudet ger svagare signal ju långsammare
// bandet går (ingen ton när bandet står still).
//
// Ingången (det man spelar) hörs alltid. REC LEVEL är hur hårt det spelas in på bandet: signalen förstärks in i en
// mjuk mättnad och dämpas sedan delvis igen, så att hög nivå låter driven och låg nivå renare och svagare. Det man
// hör är det som spelas in, och uppspelningen låter som när det spelades in.
//
// Allokerar bara i konstruktorn. Enkeltrådad: anropas från ljudtråden.
#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <memory>

namespace blonda::app {

class Bandspelare {
public:
    enum Lage { STOPP = 0, PLAY = 1, REC = 2, REW = 3, FF = 4 };
    enum Kommando { K_STOPP = 0, K_PLAY = 1, K_REC = 2, K_REW = 3, K_FF = 4, K_PAUS = 5 };
    static constexpr int kKapacitet = 48000 * 60;   // ramar: 60 s vid 48 kHz (30 s vid 96 kHz)
    static constexpr double kSpolFart = 10.0;       // REW/FF: bandet går tio gånger fortare

    Bandspelare() : buf_(new int16_t[(size_t)kKapacitet * 2]()) {}

    void prepare(double sr) {
        sr_ = sr;
        langd_ = std::min((double)kKapacitet, std::floor(sr * 60.0));
        pos_ = std::min(pos_, langd_ - 1.0);
        hp_ = std::exp(-2.0 * 3.14159265358979 * 18.0 / sr);   // likspänningsfilter på huvudet
        lpA_ = 1.0 - std::exp(-2.0 * 3.14159265358979 * 3500.0 / sr);
    }
    void reset() { fart_ = 0.0; lage_ = STOPP; paus_ = false; hpX_[0] = hpX_[1] = hpY_[0] = hpY_[1] = lp_[0] = lp_[1] = 0.0; }
    void radera() { std::fill(buf_.get(), buf_.get() + (size_t)kKapacitet * 2, (int16_t)0); pos_ = 0.0; inspelat_ = 0.0; }

    // knapparna: REC spelar in (och spelar), PLAY spelar (avbryter inspelningen), REW/FF spolar, STOP stannar,
    // PAUS håller bandet stilla i det läge det är i (trycks igen för att fortsätta)
    void kommando(int k) {
        switch (k) {
            case K_STOPP: lage_ = STOPP; paus_ = false; break;
            case K_PLAY: lage_ = PLAY; break;
            case K_REC: lage_ = REC; break;
            case K_REW: lage_ = REW; paus_ = false; break;
            case K_FF: lage_ = FF; paus_ = false; break;
            case K_PAUS: if (lage_ == PLAY || lage_ == REC || lage_ == STOPP) paus_ = !paus_; break;
            default: break;
        }
        if ((lage_ == PLAY || lage_ == REC) && pos_ >= langd_ - 2.0) pos_ = 0.0;   // vid bandets slut: börja om
    }
    void setNiva(double v) { niva_ = std::min(1.0, std::max(0.0, v)); }   // REC LEVEL 0..1

    // ingång -> ut (samma buffertar). Ingen ingång? Skicka tystnad; uppspelningen läggs till.
    void process(float* L, float* R, int n) {
        const double dB = -18.0 + 30.0 * niva_;                  // -18 .. +12 dB, 0.6 = 0 dB
        const double g = std::pow(10.0, dB / 20.0), komp = 1.0 / std::pow(g, 0.6);
        const double mal = paus_ ? 0.0 : (lage_ == PLAY || lage_ == REC) ? 1.0 : lage_ == FF ? kSpolFart : lage_ == REW ? -kSpolFart : 0.0;
        // motorn: snabb start och inbromsning vid uppspelning, spolarna tar längre tid på sig
        const bool spol = std::fabs(mal) > 1.5 || std::fabs(fart_) > 1.5;
        const double tau = spol ? (std::fabs(mal) > std::fabs(fart_) ? 0.45 : 0.25) : (mal > fart_ ? 0.09 : 0.14);
        const double k = 1.0 - std::exp(-1.0 / (sr_ * tau));
        const bool spelar = lage_ == REC && !paus_;
        float vuL = vuL_ * 0.995f, vuR = vuR_ * 0.995f;
        for (int s = 0; s < n; ++s) {
            fart_ += (mal - fart_) * k;
            if (mal == 0.0 ? std::fabs(fart_) < 0.02 : std::fabs(mal - fart_) < 1e-5) fart_ = mal;   // bromsen tar / farten är nådd
            // bandet genom REC LEVEL: drivet in i mättnaden, och lite tillbaka
            const double inL = std::tanh(L[s] * g), inR = std::tanh(R[s] * g);
            vuL = std::max(vuL, (float)std::fabs(inL)); vuR = std::max(vuR, (float)std::fabs(inR));
            const double hL = inL * komp, hR = inR * komp;   // det man hör (och det som spelas in)
            const double p0 = pos_;
            pos_ += fart_;
            if (pos_ <= 0.0) { pos_ = 0.0; if (lage_ == REW) { lage_ = STOPP; slut_ = true; } }
            if (pos_ >= langd_ - 2.0) { pos_ = langd_ - 2.0; if (lage_ != REW && lage_ != STOPP) { lage_ = STOPP; paus_ = false; slut_ = true; } }
            double uL = 0.0, uR = 0.0;
            if (spelar) {
                // inspelning: raderhuvudet skriver över det som fanns, varje ram som bandet passerar
                for (int i = (int)p0; i < (int)pos_; ++i) skriv(i, hL, hR);
                if ((int)pos_ > (int)p0) inspelat_ = std::max(inspelat_, pos_);
            } else if (fart_ != 0.0) {
                double a, b;
                las(p0, pos_, a, b);
                const double styrka = std::min(1.0, std::fabs(fart_));   // huvudet: svagare när bandet går sakta
                uL = a * styrka; uR = b * styrka;
                if (std::fabs(fart_) > 1.5) {   // spolning: dovt och lite svagare
                    lp_[0] += (uL - lp_[0]) * lpA_; lp_[1] += (uR - lp_[1]) * lpA_;
                    uL = lp_[0] * 0.55; uR = lp_[1] * 0.55;
                } else { lp_[0] = uL; lp_[1] = uR; }
            }
            // likspänningsfilter på uppspelningen
            const double yL = uL - hpX_[0] + hp_ * hpY_[0], yR = uR - hpX_[1] + hp_ * hpY_[1];
            hpX_[0] = uL; hpX_[1] = uR; hpY_[0] = yL; hpY_[1] = yR;
            L[s] = (float)(hL + yL); R[s] = (float)(hR + yR);
        }
        vuL_ = vuL; vuR_ = vuR;
    }

    int lage() const { return lage_; }
    bool paus() const { return paus_; }
    double fart() const { return fart_; }
    double position() const { return langd_ > 0.0 ? pos_ / langd_ : 0.0; }   // 0..1
    double sekunder() const { return pos_ / sr_; }
    double inspelat() const { return langd_ > 0.0 ? inspelat_ / langd_ : 0.0; }
    float vuL() const { return vuL_; }
    float vuR() const { return vuR_; }
    bool tagSlut() { const bool s = slut_; slut_ = false; return s; }   // bandet tog slut (stannade av sig själv)

private:
    void skriv(int i, double l, double r) {
        if (i < 0 || i >= (int)langd_) return;
        buf_[(size_t)i * 2] = (int16_t)std::lround(std::min(1.0, std::max(-1.0, l)) * 32767.0);
        buf_[(size_t)i * 2 + 1] = (int16_t)std::lround(std::min(1.0, std::max(-1.0, r)) * 32767.0);
    }
    double ram(int i, int c) const { return (i < 0 || i >= (int)langd_) ? 0.0 : buf_[(size_t)i * 2 + c] * (1.0 / 32767.0); }
    // läs bandet mellan två positioner: nära normal fart med interpolation, i hög fart som medelvärdet av allt
    // huvudet passerade (annars viker sig det höga tjattret ner i diskanten)
    void las(double p0, double p1, double& l, double& r) const {
        if (std::fabs(p1 - p0) <= 1.25) {
            const int i = (int)std::floor(p1); const double t = p1 - i;
            for (int c = 0; c < 2; ++c) {
                const double ym = ram(i - 1, c), y0 = ram(i, c), y1 = ram(i + 1, c), y2 = ram(i + 2, c);
                const double c1 = 0.5 * (y1 - ym), c2 = ym - 2.5 * y0 + 2.0 * y1 - 0.5 * y2, c3 = 0.5 * (y2 - ym) + 1.5 * (y0 - y1);
                (c == 0 ? l : r) = ((c3 * t + c2) * t + c1) * t + y0;
            }
            return;
        }
        const int a = (int)std::floor(std::min(p0, p1)), b = (int)std::floor(std::max(p0, p1));
        double sl = 0.0, sr = 0.0; int cnt = 0;
        for (int i = a + 1; i <= b; ++i) { sl += ram(i, 0); sr += ram(i, 1); ++cnt; }
        l = cnt ? sl / cnt : ram(b, 0); r = cnt ? sr / cnt : ram(b, 1);
    }

    std::unique_ptr<int16_t[]> buf_;
    double sr_ = 48000.0, langd_ = kKapacitet, pos_ = 0.0, fart_ = 0.0, inspelat_ = 0.0, niva_ = 0.6;
    double hp_ = 0.998, hpX_[2]{}, hpY_[2]{}, lpA_ = 0.4, lp_[2]{};
    int lage_ = STOPP;
    bool paus_ = false, slut_ = false;
    float vuL_ = 0.0f, vuR_ = 0.0f;
};

}  // namespace blonda::app
