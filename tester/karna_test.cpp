#include <algorithm>
// Test av ljudkärnan: alla fabriksljud låter, inga NaN, nivåer rimliga, frasspelaren fungerar, CPU-tid.
#include <chrono>
#include <cstdio>
#include <string>
#include <vector>
#include "bris_core.h"
using namespace blonda::app;

static int fel = 0;
#define KRAV(c, ...) do { if (!(c)) { std::printf("FEL: " __VA_ARGS__); std::printf("\n"); ++fel; } } while (0)

// tonerna som klingar (gate > 0) i motorns sex röster, stigande
template <class C> static std::vector<int> klingar(C& c) {
    auto& d = c.synth().dsp();
    const double n[6] = {d.n0, d.n1, d.n2, d.n3, d.n4, d.n5}, g[6] = {d.g0, d.g1, d.g2, d.g3, d.g4, d.g5};
    std::vector<int> v; for (int i = 0; i < 6; ++i) if (g[i] > 0) v.push_back((int)n[i]);
    std::sort(v.begin(), v.end()); return v;
}
static std::string str(const std::vector<int>& v) { std::string s; for (int x : v) s += std::to_string(x) + " "; return s; }

int main() {
    const double sr = 48000; const int B = 256;
    std::vector<float> L(B), R(B);
    double tot = 0; double tsec = 0;
    double cur[kMaxParams], nv[kMaxParams];
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
            double before[kMaxParams]; for (int i = 0; i < Core::numParams(); ++i) before[i] = a.getParam(i);
            std::vector<float> L2(B), R2(B); double diff = 0, ea = 0, eb = 0;
            for (int k = 0; k < (int)(0.8 * sr / B); ++k) {
                a.setGlid(mode, std::min(1.0, k / 40.0)); a.uiSlide(57, std::min(1.0, k / 40.0));   // uiSlide: BRIS MPE
                a.process(L.data(), R.data(), B); b.process(L2.data(), R2.data(), B);
                for (int s = 1; s < B; ++s) { diff += std::fabs(L[s] - L2[s]); ea += std::fabs(L[s] - L[s - 1]); eb += std::fabs(L2[s] - L2[s - 1]); }
            }
            bool same = true;
            for (int i = 0; i < Core::numParams(); ++i) if (a.getParam(i) != before[i] && i != cp.find("slm")) same = false;
            a.setGlid(mode, 0.0); a.uiSlide(57, 0.0);
            for (int k = 0; k < (int)(0.5 * sr / B); ++k) a.process(L.data(), R.data(), B);
            bool back = true;
            for (int i = 0; i < Core::numParams(); ++i) if (cp.brisIdx[i] >= 0 && a.synth().getParam(cp.brisIdx[i]) != a.getParam(i)) back = false;
            a.setGlid(mode, 1.0); a.uiSlide(57, 1.0); for (int k = 0; k < 20; ++k) a.process(L.data(), R.data(), B);
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
    // MPE: slide (CC74) på tonens kanal styr glidet, släpps tonen går glidet tillbaka; vanlig MIDI på kanal 1 som förut
    {
        const CoreParams& cp = coreParams();
        Core a; a.prepare(sr); a.setParam(cp.find("cut"), 0.3); a.setGlid(1, 0.0);
        a.midi(0xB1, 74, 0); a.midi(0x91, 60, 100);
        for (int k = 0; k < 10; ++k) a.process(L.data(), R.data(), B);
        const float g0 = a.meters().glid;
        a.midi(0xB1, 74, 127);
        for (int k = 0; k < 20; ++k) a.process(L.data(), R.data(), B);
        const float g1 = a.meters().glid;
        a.midi(0x81, 60, 0);
        for (int k = 0; k < 40; ++k) a.process(L.data(), R.data(), B);
        const float g2 = a.meters().glid;
        std::printf("MPE slide: glid %.2f -> %.2f -> %.2f efter släpp\n", g0, g1, g2);
        KRAV(g0 < 0.01 && g1 > 0.95 && g2 < 0.01, "MPE slide styr inte glidet (%.2f %.2f %.2f)", g0, g1, g2);
        KRAV(std::fabs(a.getParam(cp.find("cut")) - 0.3) < 1e-12, "MPE slide ändrade cutoff-parametern");
        // vanlig MIDI på kanal 1 ger exakt samma ljud som motorn ensam (rvb/drive av)
        Core c; c.prepare(sr); c.setParam(cp.find("rvb"), 0); c.setParam(cp.find("drive"), 0);
        blonda::bris::Bris b; b.prepare(sr);
        const uint8_t ev[][3] = {{0x90, 60, 100}, {0xE0, 0, 80}, {0xB0, 1, 90}, {0xD0, 70, 0}, {0x80, 60, 0}};
        std::vector<float> L2(B), R2(B); double md = 0;
        for (int k = 0; k < 60; ++k) {
            if (k % 10 == 0 && k / 10 < 5) { c.midi(ev[k / 10][0], ev[k / 10][1], ev[k / 10][2]); b.midi(ev[k / 10][0], ev[k / 10][1], ev[k / 10][2]); }
            c.process(L.data(), R.data(), B); b.process(L2.data(), R2.data(), B);
            for (int s2 = 0; s2 < B; ++s2) md = std::max(md, (double)std::fabs(L[s2] - L2[s2]));
        }
        std::printf("vanlig MIDI på kanal 1: största skillnad mot motorn %.2e\n", md);
        KRAV(md == 0.0, "vanlig MIDI på kanal 1 låter annorlunda än motorn (%.2e)", md);
    }
#if BRIS_MPE
    // BRIS MPE: två fingrar på skärmen, bara det ena glider -> bara den tonens röst får slide
    {
        Core c; c.prepare(sr);
        c.noteOn(60, 100); c.noteOn(67, 100);
        c.uiSlide(67, 0.8);
        auto& d = c.synth().dsp();
        double n[6] = {d.n0, d.n1, d.n2, d.n3, d.n4, d.n5}, es[6] = {d.es0, d.es1, d.es2, d.es3, d.es4, d.es5};
        double s60 = -1, s67 = -1;
        for (int i = 0; i < 6; ++i) { if (n[i] == 60) s60 = es[i]; if (n[i] == 67) s67 = es[i]; }
        std::printf("BRIS MPE på skärmen: slide 60 = %.2f, 67 = %.2f\n", s60, s67);
        KRAV(s60 == 0.0 && std::fabs(s67 - 0.8) < 1e-12, "slide per finger går till fel ton (%.2f / %.2f)", s60, s67);
        c.noteOff(67); c.noteOn(67, 90);
        double es2[6] = {d.es0, d.es1, d.es2, d.es3, d.es4, d.es5}, n2[6] = {d.n0, d.n1, d.n2, d.n3, d.n4, d.n5};
        bool ny0 = false; for (int i = 0; i < 6; ++i) if (n2[i] == 67 && es2[i] == 0.0 && d.g0 + d.g1 + d.g2 > 0) ny0 = true;
        KRAV(ny0, "en ny ton börjar inte utan slide");
    }
#endif

    // ---------------------------------------------------------------- MOOD
    {
        Core c; c.prepare(sr);
        const int iw = coreParams().find("mowet"), il = coreParams().find("moloop");
        KRAV(iw >= 0 && il >= 0 && coreParams().moodIdx[iw] >= 0, "MOOD-parametrarna saknas");
        // av: exakt som utan MOOD (jämför mot samma kärna där MOOD aldrig rörs, med andra MOOD-rattar)
        Core a, b; a.prepare(sr); b.prepare(sr);
        b.setParam(coreParams().find("moclk"), 0.1); b.setParam(coreParams().find("motime"), 1.0); b.setParam(coreParams().find("moblend"), 1.0);
        std::vector<float> L2(B), R2(B); double md = 0, mw = 0;
        a.noteOn(60, 100); b.noteOn(60, 100);
        for (int k = 0; k < 400; ++k) {
            if (k == 100) { a.noteOff(60); b.noteOff(60); }
            a.process(L.data(), R.data(), B); b.process(L2.data(), R2.data(), B);
            for (int s2 = 0; s2 < B; ++s2) md = std::max(md, (double)std::fabs(L[s2] - L2[s2]));
        }
        KRAV(md == 0.0, "MOOD av ändrar ljudet (%.2e)", md);
        // reverben på: efterklang långt efter tonen; freeze håller
        b.setParam(coreParams().find("mowet"), 1); b.setParam(coreParams().find("moblend"), 0.5);
        a.noteOn(60, 100); b.noteOn(60, 100);
        double ea = 0, eb = 0;
        for (int k = 0; k < 900; ++k) {
            if (k == 100) { a.noteOff(60); b.noteOff(60); b.setParam(coreParams().find("mofrz"), 1); }
            a.process(L.data(), R.data(), B); b.process(L2.data(), R2.data(), B);
            if (k > 700) for (int s2 = 0; s2 < B; ++s2) { ea += L[s2] * L[s2]; eb += L2[s2] * L2[s2]; }
            for (int s2 = 0; s2 < B; ++s2) mw = std::max(mw, (double)std::fabs(L2[s2]));
        }
        std::printf("MOOD: torrt efter tonen %.1f dB, frusen reverb %.1f dB, topp %.2f\n", 10 * std::log10(ea + 1e-20), 10 * std::log10(eb + 1e-20), mw);
        KRAV(eb > ea * 1000 && eb > 1e-3, "MOOD FREEZE håller inte reverben");
        KRAV(mw < 2.0 && std::isfinite(mw), "MOOD blir för starkt (%.2f)", mw);
    }
    // ---------------------------------------------------------------- ackordpads, FOLLOW och ARP
    {
        Core c; c.prepare(sr); c.setTempo(120);
        auto& cp = coreParams();
        // pad: ackordet klingar, släpps med padClear
        c.padNote(57, 100); c.padNote(60, 100); c.padNote(64, 100);
        c.process(L.data(), R.data(), B);
        KRAV(str(klingar(c)) == "57 60 64 ", "padens ackord klingar inte (%s)", str(klingar(c)).c_str());
        c.noteOn(72, 100);   // pianot ovanpå
        KRAV(str(klingar(c)) == "57 60 64 72 ", "pianot spelar inte ovanpå paden (%s)", str(klingar(c)).c_str());
        c.noteOff(72); c.padClear(); c.process(L.data(), R.data(), B);
        KRAV(klingar(c).empty(), "padens ackord släpps inte (%s)", str(klingar(c)).c_str());
        // FOLLOW: A-moll -> eolisk skala på A; C# (61) blir C (60) eller D (62), F# (66) blir F (65) eller G (67)
        c.setFollow(true);
        c.noteOn(61, 100); c.noteOn(66, 100);
        const auto f = klingar(c);
        std::printf("FOLLOW i Am: 61 -> %s, grundton %d skala %03x\n", str(f).c_str(), c.meters().followRoot, (unsigned)c.meters().followMask);
        c.process(L.data(), R.data(), B);
        KRAV(c.meters().followRoot == 9 && c.meters().followMask == 0xAB5, "fel skala för Am (%d %03x)", c.meters().followRoot, (unsigned)c.meters().followMask);
        KRAV(f.size() == 2 && f[0] == 62 && f[1] == 67, "FOLLOW rättar inte tonerna (%s)", str(f).c_str());
        c.noteOff(61); c.noteOff(66); c.process(L.data(), R.data(), B);
        KRAV(klingar(c).empty(), "FOLLOW: tonerna släpps inte (%s)", str(klingar(c)).c_str());
        // dur med liten septima -> mixolydisk; tangenterna i skalan rörs inte
        c.padNote(55, 100); c.padNote(59, 100); c.padNote(62, 100); c.padNote(65, 100); c.padClear();
        c.process(L.data(), R.data(), B);
        KRAV(c.meters().followRoot == 7 && c.meters().followMask == 0xAB5, "fel skala för G7 (%d %03x)", c.meters().followRoot, (unsigned)c.meters().followMask);
        c.setFollow(false);
        // ARP: 1/16 i 120 bpm = 6000 sampel per steg, upp, en oktav, gate 0.5
        c.setParam(cp.find("arp"), 1); c.setParam(cp.find("arpr"), 3); c.setParam(cp.find("arpm"), 0); c.setParam(cp.find("arpo"), 2); c.setParam(cp.find("arpg"), 0.5);
        c.padNote(60, 100); c.padNote(64, 100); c.padNote(67, 100);
        std::vector<int> spelat; int sist = -1, tyst = 0;
        for (int k = 0; k < 48000 / 64; ++k) {
            c.process(L.data(), R.data(), 64);
            const auto v = klingar(c);
            if (v.size() > 1) KRAV(false, "arpen spelar flera toner samtidigt (%s)", str(v).c_str());
            const int nu = v.empty() ? -1 : v[0];
            if (nu != sist && nu >= 0) spelat.push_back(nu);
            if (nu < 0) ++tyst;
            sist = nu;
        }
        std::printf("ARP upp 2 okt: %s(tyst %.0f%%)\n", str(spelat).c_str(), 100.0 * tyst / 750);
        KRAV(spelat.size() >= 8 && spelat[0] == 60 && spelat[1] == 64 && spelat[2] == 67 && spelat[3] == 72 && spelat[5] == 79 && spelat[6] == 60,
             "arpen spelar fel ordning (%s)", str(spelat).c_str());
        KRAV(tyst > 300 && tyst < 450, "arpens gate stämmer inte (%d av 750 tysta)", tyst);
        // pianot spelar vanligt ovanpå padens arp
        c.noteOn(84, 100); c.process(L.data(), R.data(), 64);
        { const auto v = klingar(c); KRAV(std::find(v.begin(), v.end(), 84) != v.end(), "pianot hörs inte ovanpå arpen"); }
        c.noteOff(84); c.padClear();
        for (int k = 0; k < 200; ++k) c.process(L.data(), R.data(), 64);
        KRAV(klingar(c).empty(), "arpen tystnar inte när paden släpps (%s)", str(klingar(c)).c_str());
        // utan pad: tangenterna arpas; ARP av medan de hålls -> de klingar direkt
        c.noteOn(48, 100); c.noteOn(55, 100);
        for (int k = 0; k < 20; ++k) c.process(L.data(), R.data(), 64);
        KRAV(klingar(c).size() <= 1, "tangenterna ska arpas (%s)", str(klingar(c)).c_str());
        c.setParam(cp.find("arp"), 0); c.process(L.data(), R.data(), 64);
        KRAV(str(klingar(c)) == "48 55 ", "ARP av: tangenterna som hålls ska klinga (%s)", str(klingar(c)).c_str());
        c.noteOff(48); c.noteOff(55); c.process(L.data(), R.data(), 64);
        KRAV(klingar(c).empty(), "tangenterna släpps inte efter ARP av (%s)", str(klingar(c)).c_str());
#if !BRIS_MPE
        // MIDI från en vanlig klaviatur går samma väg (FOLLOW och ARP); BRIS MPE skickar MIDI direkt till motorn
        c.setFollow(true);
        c.midi(0x90, 61, 100); c.process(L.data(), R.data(), 64);
        KRAV(str(klingar(c)) == "60 " || str(klingar(c)) == "62 ", "MIDI följer inte skalan (%s)", str(klingar(c)).c_str());
        c.midi(0x80, 61, 0); c.process(L.data(), R.data(), 64);
        KRAV(klingar(c).empty(), "MIDI-tonen släpps inte (%s)", str(klingar(c)).c_str());
        c.setFollow(false);
#endif
    }
    std::printf("snitt cpu %.1f%% av realtid (en kärna)\n", 100 * tot / tsec);
    std::printf(fel ? "%d FEL\n" : "ALLT OK\n", fel);
    return fel ? 1 : 0;
}
