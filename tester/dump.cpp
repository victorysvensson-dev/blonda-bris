// skriver 2 s av ett fabriksljud som float32 (stereo, växelvis) till stdout – för jämförelse med wasm
#include <cstdio>
#include <cstdlib>
#include "bris_core.h"
int main(int argc, char** argv) {
    int p = argc > 1 ? std::atoi(argv[1]) : 1;
    blonda::app::Core c; c.prepare(48000); c.loadPreset(p);
    c.noteOn(60, 100); c.noteOn(64, 90); c.noteOn(67, 80);
    float L[128], R[128];
    for (int b = 0; b < 750; ++b) { if (b == 500) c.allNotesOff(); c.process(L, R, 128);
        for (int s = 0; s < 128; ++s) { std::fwrite(&L[s], 4, 1, stdout); std::fwrite(&R[s], 4, 1, stdout); } }
}
