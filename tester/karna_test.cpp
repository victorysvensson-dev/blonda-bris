// Test av ljudkärnan: alla fabriksljud låter, inga NaN, nivåer rimliga, frasspelaren fungerar, CPU-tid.
#include <chrono>
#include <cstdio>
#include <string>
#include <vector>
#include "bris_core.h"
using namespace blonda::app;

static int fel = 0;
#define KRAV(c, ...) do { if (!(c)) { std::printf("FEL: " __VA_ARGS__); std::printf("\n"); ++fel; } } while (0)

int main() {
    const double sr = 48000; const int B = 256;
    std::vector<float> L(B), R(B);
    double tot = 0; double tsec = 0;
    double cur[64], nv[64];
    for (int p = 0; p < kNumFactory; ++p) {
        Core c; c.prepare(sr);
        for (int i = 0; i < Core::numParams(); ++i) cur[i] = c.getParam(i);
        Core::presetValues(p, cur, nv);
        for (int i = 0; i < Core::numParams(); ++i) c.setParam(i, nv[i]);
        const PlantInfo& pl = kPlants[kPresetPlant[p]];
        int base = std::string(pl.category) == "BASS" ? 36 : 60;
        c.noteOn(base, 100); c.noteOn(base + 7, 90); c.noteOn(base + 12, 80);
        double peak = 0, rms = 0; long n = 0; bool nan = false;
        auto t0 = std::chrono::steady_clock::now();
        for (int b = 0; b < (int)(2.0 * sr / B); ++b) {
            if (b == (int)(1.5 * sr / B)) c.allNotesOff();
            c.process(L.data(), R.data(), B);
            for (int s = 0; s < B; ++s) { double x = L[s], y = R[s]; if (!std::isfinite(x) || !std::isfinite(y)) nan = true;
                peak = std::max(peak, std::max(std::fabs(x), std::fabs(y))); rms += x * x + y * y; ++n; }
        }
        double dt = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
        tot += dt; tsec += 2.0;
        rms = std::sqrt(rms / (2 * n));
        std::printf("%2d %-20s %-8s peak %.3f rms %.3f  %.1f%% cpu\n", p, blonda::bris::kPresets[p].name, pl.category, peak, rms, 100 * dt / 2.0);
        KRAV(!nan, "%s: NaN", blonda::bris::kPresets[p].name);
        KRAV(rms > 0.003, "%s: tyst (rms %.4f)", blonda::bris::kPresets[p].name, rms);
        KRAV(peak < 4.0, "%s: för starkt (peak %.2f)", blonda::bris::kPresets[p].name, peak);
    }
    // frasspelaren: 120 bpm, sextondelar, en ton per fjärdedel -> 2 noter per sekund; 2,1 s = 5 noter (takten börjar om)
    {
        Core c; c.prepare(sr); c.setTempo(120);
        Pattern pt; pt.rate = 4; pt.count = 4;
        for (int i = 0; i < 4; ++i) pt.notes[i] = {(uint8_t)(i * 4), 2, (uint8_t)(60 + i), 100};
        c.setPattern(pt); c.setPlaying(true);
        uint32_t n0 = c.meters().noteCount;
        for (int b = 0; b < (int)(2.1 * sr / B); ++b) c.process(L.data(), R.data(), B);
        uint32_t nn = c.meters().noteCount - n0;
        std::printf("frasen: %u noter på 2,1 s (väntat 5)\n", nn);
        KRAV(nn == 5, "frasen spelade %u noter, väntat 5", nn);
        c.setPlaying(false);
        for (int b = 0; b < (int)(1.5 * sr / B); ++b) c.process(L.data(), R.data(), B);
        KRAV(c.meters().voiceMask == 0, "röster låter kvar efter stopp (mask %d)", c.meters().voiceMask);
    }
    // effekterna: rvb 0 och drive 0 ändrar inte ljudet jämfört med motorn ensam
    {
        Core c; c.prepare(sr); c.setParam(coreParams().find("rvb"), 0); c.setParam(coreParams().find("drive"), 0);
        blonda::bris::Bris b; b.prepare(sr);
        c.noteOn(60, 100); b.noteOn(60, 100);
        std::vector<float> L2(B), R2(B); double md = 0;
        for (int k = 0; k < 100; ++k) { c.process(L.data(), R.data(), B); b.process(L2.data(), R2.data(), B);
            for (int s = 0; s < B; ++s) md = std::max(md, (double)std::fabs(L[s] - L2[s])); }
        std::printf("utan effekter: största skillnad mot motorn %.2e\n", md);
        KRAV(md == 0.0, "kärnan utan effekter skiljer sig från motorn (%.2e)", md);
    }
    // effekterna på fullt: nivån håller sig rimlig
    for (int fx = 0; fx < 3; ++fx) {
        double rr[2];
        for (int on = 0; on < 2; ++on) {
            Core c; c.prepare(sr);
            c.setParam(coreParams().find("rvb"), (on && fx != 1) ? 1.0 : 0.0);
            c.setParam(coreParams().find("drive"), (on && fx != 0) ? 1.0 : 0.0);
            c.noteOn(48, 110); c.noteOn(55, 100);
            double rms = 0, pk = 0; long n = 0;
            for (int b = 0; b < (int)(1.0 * sr / B); ++b) { c.process(L.data(), R.data(), B);
                for (int s = 0; s < B; ++s) { rms += L[s] * L[s]; pk = std::max(pk, (double)std::fabs(L[s])); ++n; } }
            rr[on] = std::sqrt(rms / n);
            if (on) { std::printf("effekt %s: rms %.3f -> %.3f, peak %.2f\n", fx == 0 ? "reverb" : fx == 1 ? "drive" : "båda", rr[0], rr[1], pk);
                KRAV(rr[1] / rr[0] > 0.5 && rr[1] / rr[0] < 2.5 && pk < 2.0, "effektnivå orimlig"); }
        }
    }
    // glid på tangenterna: varje mål ändrar ljudet, men parametrarnas värden är oförändrade och motorn
    // får tillbaka exakt sina värden när glidet släpps eller målet byts
    {
        const char* namn[] = {"FILTER", "VIBRATO", "TREMOLO", "PWM", "WAH"};
        const CoreParams& cp = coreParams();
        for (int mode = 1; mode <= 5; ++mode) {
            Core a, b;
            for (Core* c : {&a, &b}) { c->prepare(sr); c->setParam(cp.find("rvb"), 0); c->setParam(cp.find("drive"), 0);
                c->setParam(cp.find("cut"), 0.35); c->setParam(cp.find("vform"), 1); c->noteOn(57, 100); }
            double before[64]; for (int i = 0; i < Core::numParams(); ++i) before[i] = a.getParam(i);
            std::vector<float> L2(B), R2(B); double diff = 0, ea = 0, eb = 0;
            for (int k = 0; k < (int)(0.8 * sr / B); ++k) {
                a.setGlid(mode, std::min(1.0, k / 40.0));
                a.process(L.data(), R.data(), B); b.process(L2.data(), R2.data(), B);
                for (int s = 1; s < B; ++s) { diff += std::fabs(L[s] - L2[s]); ea += std::fabs(L[s] - L[s - 1]); eb += std::fabs(L2[s] - L2[s - 1]); }
            }
            bool same = true;
            for (int i = 0; i < Core::numParams(); ++i) if (a.getParam(i) != before[i]) same = false;
            a.setGlid(mode, 0.0);
            for (int k = 0; k < (int)(0.5 * sr / B); ++k) a.process(L.data(), R.data(), B);
            bool back = true;
            for (int i = 0; i < Core::numParams(); ++i) if (cp.brisIdx[i] >= 0 && a.synth().getParam(cp.brisIdx[i]) != a.getParam(i)) back = false;
            a.setGlid(mode, 1.0); for (int k = 0; k < 20; ++k) a.process(L.data(), R.data(), B);
            a.setGlid(0, 0.0); a.process(L.data(), R.data(), B);
            bool off = true;
            for (int i = 0; i < Core::numParams(); ++i) if (cp.brisIdx[i] >= 0 && a.synth().getParam(cp.brisIdx[i]) != a.getParam(i)) off = false;
            std::printf("glid %-8s skillnad %.1f, ljusare %.2fx\n", namn[mode - 1], diff, ea / eb);
            KRAV(diff > 50.0, "glid %s ändrar inte ljudet", namn[mode - 1]);
            KRAV(same, "glid %s ändrade parametrarnas värden", namn[mode - 1]);
            KRAV(back, "glid %s: motorn fick inte tillbaka sina värden när glidet släpptes", namn[mode - 1]);
            KRAV(off, "glid %s: motorn fick inte tillbaka sina värden när glidet stängdes av", namn[mode - 1]);
            if (mode == 1) KRAV(ea / eb > 1.3, "glid FILTER öppnar inte filtret (%.2fx)", ea / eb);
        }
    }
    std::printf("snitt cpu %.1f%% av realtid (en kärna)\n", 100 * tot / tsec);
    std::printf(fel ? "%d FEL\n" : "ALLT OK\n", fel);
    return fel ? 1 : 0;
}
