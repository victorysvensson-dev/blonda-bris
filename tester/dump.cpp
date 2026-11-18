// skriver 2 s av ett fabriksljud som float32 (stereo, växelvis) till stdout – för jämförelse med wasm
#include <cstdio>
#include <cstdlib>
#include "bris_core.h"
int main(int argc, char** argv) {
    int p = argc > 1 ? std::atoi(argv[1]) : 1;
    const bool band = argc > 2 && argv[2][0] == 'b';   // bandet (SLITEN, kassett) på, ackord
    const bool extra = argc > 2 && !band;   // MOOD (delay + loop) och ARP med en pad
    blonda::app::Core c; c.prepare(48000); c.loadPreset(p);
    auto sp = [&](const char* id, double v) { c.setParam(blonda::app::coreParams().find(id), v); };
    if (extra) { c.setTempo(120); sp("mowet", 1); sp("mowmode", 1); sp("arp", 1); sp("arpm", 2); sp("arpo", 2); c.padNote(57, 100); c.padNote(60, 90); c.padNote(64, 80); }
    else { if (band) { sp("tape", 1); sp("tamedia", 0); sp("tawow", 0.8); sp("tarec", 0.8); c.bandKommando(2); } c.noteOn(60, 100); c.noteOn(64, 90); c.noteOn(67, 80); }
    float L[128], R[128];
    for (int b = 0; b < 750; ++b) { if (b == 500) c.allNotesOff();
        if (band && b == 250) c.bandKommando(3);   // bandspelaren: spela in, spola tillbaka, spela upp
        if (band && b == 330) c.bandKommando(1); if (extra && b == 300) sp("moloop", 1); if (extra && b == 200) c.noteOn(72, 100); c.process(L, R, 128);
        for (int s = 0; s < 128; ++s) { std::fwrite(&L[s], 4, 1, stdout); std::fwrite(&R[s], 4, 1, stdout); } }
}
