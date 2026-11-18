// Spelar en kort fras genom hela BRIS-kärnan (synth, drive, rum, band, MOOD) och skriver en wav – för att lyssna
// på och mäta ett ljud innan det används (t.ex. de hemliga patcharnas egna ljud).
//   lyssna ut.wav [ljud=nr] [id=värde ...] [fras=ackord|tangenter|droppar]
// Skriver också nivå (topp, rms), klangens tyngdpunkt och efterklang till stdout.
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>
#include "bris_core.h"
using namespace blonda::app;

int main(int argc, char** argv) {
    if (argc < 2) { std::fprintf(stderr, "lyssna ut.wav [ljud=nr] [id=värde ...] [fras=ackord|tangenter|droppar]\n"); return 1; }
    const double sr = 48000;
    Core c; c.prepare(sr); c.setTempo(96);
    std::string fras = "ackord";
    for (int i = 2; i < argc; ++i) {
        std::string a = argv[i]; auto eq = a.find('='); if (eq == std::string::npos) continue;
        std::string k = a.substr(0, eq), v = a.substr(eq + 1);
        if (k == "ljud") { c.loadPreset(std::atoi(v.c_str())); continue; }
        if (k == "fras") { fras = v; continue; }
        const int id = coreParams().find(k.c_str());
        if (id < 0) { std::fprintf(stderr, "okänd parameter %s\n", k.c_str()); return 1; }
        c.setParam(id, std::atof(v.c_str()));
    }
    // frasen: (start i sekunder, längd, ton, styrka)
    struct N { double t, l; int n, v; };
    std::vector<N> f;
    if (fras == "ackord") {          // två ackord som ligger, sedan en kort melodi
        for (int n : {48, 55, 60, 64, 67}) f.push_back({0.0, 1.6, n, 96});
        for (int n : {45, 52, 57, 60, 64}) f.push_back({2.0, 1.6, n, 92});
        int m[] = {72, 71, 67, 64, 67, 69}; for (int i = 0; i < 6; ++i) f.push_back({4.0 + i * 0.3, 0.25, m[i], 100});
    } else if (fras == "tangenter") { // spelat som keys: ackord i takt
        int ack[4][4] = {{48, 55, 60, 64}, {45, 52, 57, 60}, {41, 48, 53, 57}, {43, 50, 55, 59}};
        for (int a = 0; a < 4; ++a) for (int r = 0; r < 2; ++r) for (int n : ack[a]) f.push_back({a * 1.25 + r * 0.625, 0.5, n, 90 + 10 * (r == 0)});
    } else {                          // droppar: enstaka toner med luft emellan
        int m[] = {76, 69, 72, 64, 79, 67}; for (int i = 0; i < 6; ++i) f.push_back({i * 0.7, 0.18, m[i], 100});
    }
    const double len = 9.0; const int N = (int)(len * sr), B = 64;
    std::vector<float> L(N), R(N); std::vector<char> pa(f.size(), 0);
    for (int s = 0; s < N; s += B) {
        const double t = s / sr;
        for (size_t i = 0; i < f.size(); ++i) {
            if (pa[i] == 0 && t >= f[i].t) { c.noteOn(f[i].n, f[i].v); pa[i] = 1; }
            if (pa[i] == 1 && t >= f[i].t + f[i].l) { c.noteOff(f[i].n); pa[i] = 2; }
        }
        c.process(&L[s], &R[s], std::min(B, N - s));
    }
    // mätning
    double pk = 0, e = 0, eSvans = 0; int nS = 0;
    for (int s = 0; s < N; ++s) { pk = std::max(pk, (double)std::max(std::fabs(L[s]), std::fabs(R[s]))); e += L[s] * L[s] + R[s] * R[s]; }
    for (int s = (int)(7.0 * sr); s < N; ++s) { eSvans += L[s] * L[s]; ++nS; }
    // tyngdpunkt (nollgenomgångar som grovt mått på hur ljust det är) under första ackordet
    int zc = 0; for (int s = (int)(0.2 * sr); s < (int)(1.4 * sr); ++s) if ((L[s - 1] < 0) != (L[s] < 0)) ++zc;
    std::printf("topp %.2f  rms %.3f  ljushet ~%d Hz  svans (7-9 s) %.1f dB\n", pk, std::sqrt(e / (2.0 * N)), (int)(zc / 1.2 / 2), 10 * std::log10(eSvans / std::max(1, nS) + 1e-20));
    // wav (16 bitar, stereo)
    FILE* w = std::fopen(argv[1], "wb"); if (!w) return 1;
    auto u32 = [&](uint32_t v) { std::fwrite(&v, 4, 1, w); }; auto u16 = [&](uint16_t v) { std::fwrite(&v, 2, 1, w); };
    std::fwrite("RIFF", 1, 4, w); u32(36 + N * 4); std::fwrite("WAVEfmt ", 1, 8, w); u32(16); u16(1); u16(2); u32((uint32_t)sr); u32((uint32_t)sr * 4); u16(4); u16(16);
    std::fwrite("data", 1, 4, w); u32(N * 4);
    for (int s = 0; s < N; ++s) for (float x : {L[s], R[s]}) { int16_t q = (int16_t)std::lround(std::max(-1.0f, std::min(1.0f, x)) * 32767.0f); std::fwrite(&q, 2, 1, w); }
    std::fclose(w);
    return 0;
}
