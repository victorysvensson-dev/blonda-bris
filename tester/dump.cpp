// skriver 2 s av ett fabriksljud som float32 (stereo, växelvis) till stdout – för jämförelse med wasm
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>
#include "bris_core.h"
// MELLOTRONs band ur ui/mellotron/band_<n>.wav (16 bitar stereo), som skalen läser dem
static std::vector<int16_t> band_[blonda::app::mello::kNumBand];
static void laddaMello(blonda::app::Core& c) {
    for (int b = 0; b < blonda::app::mello::kNumBand; ++b) {
        FILE* f = std::fopen(("ui/mellotron/band_" + std::to_string(b + 1) + ".wav").c_str(), "rb"); if (!f) continue;
        std::vector<uint8_t> d; uint8_t buf[65536]; size_t k;
        while ((k = std::fread(buf, 1, sizeof buf, f)) > 0) d.insert(d.end(), buf, buf + k);
        std::fclose(f);
        auto u32 = [&](size_t i) { return (uint32_t)d[i] | (uint32_t)d[i + 1] << 8 | (uint32_t)d[i + 2] << 16 | (uint32_t)d[i + 3] << 24; };
        double sr = 32000;
        for (size_t i = 12; i + 8 <= d.size();) {
            const size_t len = u32(i + 4), bb = i + 8;
            if (std::memcmp(&d[i], "fmt ", 4) == 0) sr = u32(bb + 4);
            if (std::memcmp(&d[i], "data", 4) == 0) { band_[b].resize(len / 2); std::memcpy(band_[b].data(), &d[bb], len / 2 * 2); break; }
            i = bb + len + (len & 1);
        }
        c.setMelloBand(b, band_[b].data(), (int)band_[b].size() / 2, sr);
    }
}
int main(int argc, char** argv) {
    int p = argc > 1 ? std::atoi(argv[1]) : 1;
    const bool band = argc > 2 && argv[2][0] == 'b';   // bandet (SLITEN, kassett) på, ackord
    const bool mello = argc > 2 && argv[2][0] == 'm';  // MELLOTRONs band laddade (ackordet som vanligt)
    const bool extra = argc > 2 && !band && !mello;   // MOOD (delay + loop) och ARP med en pad
    blonda::app::Core c; c.prepare(48000);
    if (mello) laddaMello(c);
    if (p >= blonda::app::kNumFactory) c.loadPreset(0);   // en motors ljud: efter BRIS ljud 0 (effekterna därifrån)
    c.loadPreset(p);
    auto sp = [&](const char* id, double v) { c.setParam(blonda::app::coreParams().find(id), v); };
    if (extra) { c.setTempo(120); sp("mowet", 1); sp("mowmode", 1); sp("arp", 1); sp("arpm", 2); sp("arpo", 2); c.padNote(57, 100); c.padNote(60, 90); c.padNote(64, 80); }
    else { if (band) { sp("tape", 1); sp("tamedia", 0); sp("tawow", 0.8); sp("tarec", 0.8); c.bandKommando(2); } c.noteOn(60, 100); c.noteOn(64, 90); c.noteOn(67, 80); }
    float L[128], R[128];
    for (int b = 0; b < 750; ++b) { if (b == 500) c.allNotesOff();
        if (band && b == 250) c.bandKommando(3);   // bandspelaren: spela in, spola tillbaka, spela upp
        if (band && b == 330) c.bandKommando(1); if (extra && b == 300) sp("moloop", 1); if (extra && b == 200) c.noteOn(72, 100); c.process(L, R, 128);
        for (int s = 0; s < 128; ++s) { std::fwrite(&L[s], 4, 1, stdout); std::fwrite(&R[s], 4, 1, stdout); } }
}
