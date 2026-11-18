// BLONDA BRIS – korta ljud från själva apparaten (knapparna på bandspelaren, luckan, bandet som sätts i).
// Ljuden ägs av skalet (pluggen läser dem ur BinaryData, webben avkodar dem i webbläsaren) och kärnan får bara
// pekare till dem. De blandas in sist, torrt (inte genom bandet eller rummet). Ingen allokering.
#pragma once
#include <algorithm>
#include <cmath>

namespace blonda::app {

class Ljudeffekter {
public:
    enum Id { KNAPP = 0, KORT = 1, REC = 2, UPP = 3, LUCKA = 4, IN = 5 };
    static constexpr int kAntal = 8, kRoster = 6;

    void prepare(double sr) { sr_ = sr; }
    void reset() { for (auto& r : roster_) r.aktiv = false; }
    // ljudet `id`: n sampel mono i samplingsfrekvensen sr (pekaren måste leva lika länge som kärnan)
    void satt(int id, const float* d, int n, double sr) {
        if (id < 0 || id >= kAntal) return;
        for (auto& r : roster_) if (r.id == id) r.aktiv = false;
        ljud_[id] = {d, std::max(0, n), sr > 0.0 ? sr : 48000.0};
    }
    bool finns(int id) const { return id >= 0 && id < kAntal && ljud_[id].d && ljud_[id].n > 0; }
    // spela ljudet: styrka 0..1, fart 1 = som inspelat (högre = snabbare och ljusare)
    void spela(int id, double styrka = 1.0, double fart = 1.0) {
        if (!finns(id)) return;
        Rost* r = &roster_[0];
        for (auto& x : roster_) if (!x.aktiv) { r = &x; break; } else if (x.pos > r->pos) r = &x;   // full: ta över den äldsta
        *r = {true, id, 0.0, fart * ljud_[id].sr / sr_, std::min(1.0, std::max(0.0, styrka)) * kNiva};
    }
    void process(float* L, float* R, int n) {
        for (auto& r : roster_) {
            if (!r.aktiv) continue;
            const Ljud& l = ljud_[r.id];
            for (int s = 0; s < n; ++s) {
                const int i = (int)r.pos;
                if (i + 1 >= l.n) { r.aktiv = false; break; }
                const double t = r.pos - i, v = (l.d[i] + (l.d[i + 1] - l.d[i]) * t) * r.g;
                L[s] += (float)v; R[s] += (float)v;
                r.pos += r.steg;
            }
        }
    }

private:
    static constexpr double kNiva = 0.45;   // filerna är normaliserade till -3 dBFS
    struct Ljud { const float* d = nullptr; int n = 0; double sr = 48000.0; };
    struct Rost { bool aktiv = false; int id = 0; double pos = 0.0, steg = 1.0, g = 0.0; };
    Ljud ljud_[kAntal]{};
    Rost roster_[kRoster]{};
    double sr_ = 48000.0;
};

}  // namespace blonda::app
