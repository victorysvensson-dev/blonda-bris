// BLONDA BRIS – ljudkärnan som delas av alla skal (AU/VST3/Standalone/AUv3 via JUCE, webben via WebAssembly).
//
// BRIS-motorn från blonda-motor (oförändrad) + två BLONDA-effekter efter den (VIBE för drive, RUM för reverb)
// + en liten frasspelare (rullen i gränssnittet) + mätare till växten och vågen.
//
// Kärnan är enkeltrådad: allt anropas från ljudtråden. Skalen ser till att händelser från gränssnittet
// kommer fram dit (kö / meddelanden). Ingen allokering efter konstruktorn.
#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>

#include "blonda/effekt.h"
#include "bris/bris.h"
#include "rum/rum_ljud.h"
#include "vibe/vibe_ljud.h"
#include "kategorier.h"

namespace blonda::app {

// ------------------------------------------------------------------ parametrar
// BRIS-parametrarna (utom UI_ONLY "hyll") i blonda-motors ordning, sedan kExtra.
struct CoreParams {
    static constexpr int kNumBris = bris::kNumParams;
    int count = 0;
    ParamInfo info[64]{};
    int brisIdx[64]{};
    CoreParams() {
        for (int i = 0; i < bris::kNumParams; ++i) {
            if (std::strcmp(bris::kParams[i].id, "hyll") == 0) continue;
            info[count] = bris::kParams[i]; brisIdx[count] = i; ++count;
        }
        for (int i = 0; i < kNumExtra; ++i) {
            info[count] = ParamInfo{kExtra[i].id, kExtra[i].name, kExtra[i].min, kExtra[i].max, kExtra[i].def, false, false};
            brisIdx[count] = -1; ++count;
        }
    }
    int find(const char* id) const {
        for (int i = 0; i < count; ++i) if (std::strcmp(info[i].id, id) == 0) return i;
        return -1;
    }
};
inline const CoreParams& coreParams() { static const CoreParams p; return p; }

// ------------------------------------------------------------------ frasen i rullen
constexpr int kSeqSteps = 16;
constexpr int kMaxSeqNotes = 128;
struct SeqNote { uint8_t step, len, note, vel; };
struct Pattern {
    int rate = 4;          // steg per fjärdedel: 4 = sextondelar, 2 = åttondelar
    int count = 0;
    SeqNote notes[kMaxSeqNotes]{};
};

// ------------------------------------------------------------------ mätare
constexpr int kScopeLen = 256;
struct Meters {
    float env = 0, lfo = 0, peakL = 0, peakR = 0;
    int voiceMask = 0;
    int step = -1;          // frasens steg som spelas nu (-1 = stoppad)
    uint32_t noteCount = 0; // räknas upp vid varje not på (för pollenkorn i växten)
    float scope[kScopeLen]{};
};

class Core {
public:
    Core() : rum_(rum::kName, rum::kParams, rum::kNumParams), vibe_(vibe::kName, vibe::kParams, vibe::kNumParams) {
        const CoreParams& cp = coreParams();
        for (int i = 0; i < cp.count; ++i) val_[i] = cp.info[i].def;
        // effekternas fasta inställningar
        vibe_.setParam(vibe_.findParam("dtype"), 0);
        vibe_.setParam(vibe_.findParam("mixp"), 100);
        rum_.setParam(rum_.findParam("outv"), 1.0 / 1.33);  // dry = exakt 1
        rum_.setParam(rum_.findParam("damp"), 0.5);
        rum_.setParam(rum_.findParam("predel"), 0.12);
        rum_.setParam(rum_.findParam("lowc"), 0.2);
        iWet_ = rum_.findParam("wet"); iSize_ = rum_.findParam("size"); iDecay_ = rum_.findParam("decay");
        iDrive_ = vibe_.findParam("drive"); iOut_ = vibe_.findParam("outdb");
        applyExtra();
    }

    void prepare(double sr) {
        sr_ = sr;
        synth_.prepare(sr); rum_.prepare(sr); vibe_.prepare(sr);
        for (int i = 0; i < coreParams().count; ++i) setParam(i, val_[i]);
        seqPos_ = 0; seqStep_ = -1; clearSeqNotes();
    }
    void reset() { synth_.reset(); rum_.reset(); vibe_.reset(); clearSeqNotes(); }

    // ---------------------------------------------------------------- toner / MIDI
    void noteOn(int n, int v) { synth_.noteOn(n, v); ++meters_.noteCount; }
    void noteOff(int n) { synth_.noteOff(n); }
    void allNotesOff() { synth_.allNotesOff(); clearSeqNotes(); }
    void midi(uint8_t s, uint8_t d1, uint8_t d2) {
        if ((s & 0xF0) == 0x90 && d2 > 0) ++meters_.noteCount;
        synth_.midi(s, d1, d2);
    }

    // ---------------------------------------------------------------- parametrar
    static int numParams() { return coreParams().count; }
    static const ParamInfo& paramInfo(int i) { return coreParams().info[i]; }
    double getParam(int i) const { return (i >= 0 && i < numParams()) ? val_[i] : 0.0; }
    void setParam(int i, double v) {
        const CoreParams& cp = coreParams();
        if (i < 0 || i >= cp.count) return;
        const ParamInfo& p = cp.info[i];
        v = std::min(p.max, std::max(p.min, v));
        if (p.integer) v = std::round(v);
        val_[i] = v;
        if (cp.brisIdx[i] >= 0) synth_.setParam(cp.brisIdx[i], v);
        else applyExtra();
    }

    // Räknar ut alla parametrars värden efter att fabriksljud `index` valts, utgående från `current`
    // (samma regler som Max-pluggen: allt som ljudet inte nämner får standardvärdet, utom volym/böjomfång).
    // Effekterna får växtens startvärden. Allokerar inte, men använder en egen motor: anropa inte från ljudtråden.
    static void presetValues(int index, const double* current, double* out) {
        thread_local bris::Bris scratch;   // en egen per tråd: anropas från meddelande-/gränssnittstråden
        const CoreParams& cp = coreParams();
        for (int i = 0; i < cp.count; ++i) {
            out[i] = current[i];
            if (cp.brisIdx[i] >= 0) scratch.setParam(cp.brisIdx[i], current[i]);
        }
        if (index < 0 || index >= kNumFactory) return;
        scratch.loadPreset(index);
        for (int i = 0; i < cp.count; ++i)
            if (cp.brisIdx[i] >= 0) out[i] = scratch.getParam(cp.brisIdx[i]);
        const PlantInfo& pl = kPlants[kPresetPlant[index]];
        out[cp.find("rvb")] = pl.rvb; out[cp.find("rsize")] = pl.rsize; out[cp.find("drive")] = pl.drive;
    }
    // Byt ljud direkt i ljudtråden (webben). Använder presetValues – bara där det inte finns en separat ljudtråd
    // som kan störas, eller där anroparen äger kärnan helt.
    void loadPreset(int index) {
        double cur[64], nv[64];
        for (int i = 0; i < numParams(); ++i) cur[i] = val_[i];
        presetValues(index, cur, nv);
        for (int i = 0; i < numParams(); ++i) setParam(i, nv[i]);
    }

    // ---------------------------------------------------------------- frasen
    void setPattern(const Pattern& p) {
        // toner som inte längre finns släpps vid nästa steg genom att gamla aktiva toner stängs nu
        pattern_ = p;
        pattern_.rate = pattern_.rate == 2 ? 2 : 4;
        pattern_.count = std::max(0, std::min(kMaxSeqNotes, pattern_.count));
    }
    void setTempo(double bpm) { bpm_ = std::min(300.0, std::max(30.0, bpm)); rum_.setTempo(bpm_); vibe_.setTempo(bpm_); }
    double tempo() const { return bpm_; }
    void setPlaying(bool on) {
        if (on == playing_) return;
        playing_ = on;
        if (!on) clearSeqNotes();
        seqPos_ = 0; seqStep_ = -1;
    }
    bool playing() const { return playing_; }

    // ---------------------------------------------------------------- ljud
    void process(float* L, float* R, int n) {
        int done = 0;
        while (done < n) {
            int chunk = n - done;
            if (playing_) {
                const double stepLen = sr_ * 60.0 / bpm_ / pattern_.rate;
                if (seqPos_ <= 0.0) { advanceStep(); seqPos_ += stepLen; }
                chunk = std::min(chunk, std::max(1, (int)std::ceil(seqPos_)));
                seqPos_ -= chunk;
            }
            synth_.process(L + done, R + done, chunk);
            done += chunk;
        }
        if (driveOn_) vibe_.process(L, R, n);
        if (rvbOn_) rum_.process(L, R, n);

        // mätare
        float pl = meters_.peakL * 0.9f, pr = meters_.peakR * 0.9f;
        for (int s = 0; s < n; ++s) {
            pl = std::max(pl, std::fabs(L[s])); pr = std::max(pr, std::fabs(R[s]));
            if (++scopeDec_ >= 2) { scopeDec_ = 0; meters_.scope[scopeW_] = 0.5f * (L[s] + R[s]); scopeW_ = (scopeW_ + 1) % kScopeLen; }
        }
        meters_.peakL = pl; meters_.peakR = pr;
        meters_.env = (float)synth_.envelope(); meters_.lfo = (float)synth_.lfo(); meters_.voiceMask = synth_.voiceMask();
        meters_.step = playing_ ? seqStep_ : -1;
    }

    const Meters& meters() const { return meters_; }
    int scopeWrite() const { return scopeW_; }   // var i ringbufferten nästa värde skrivs
    bris::Bris& synth() { return synth_; }

private:
    void applyExtra() {
        const CoreParams& cp = coreParams();
        double rvb = val_[cp.find("rvb")], rsize = val_[cp.find("rsize")], drive = val_[cp.find("drive")];
        rum_.setParam(iWet_, 0.55 * rvb);
        rum_.setParam(iSize_, rsize);
        rum_.setParam(iDecay_, 0.25 + 0.65 * rsize);
        vibe_.setParam(iDrive_, 100.0 * drive);
        vibe_.setParam(iOut_, -9.0 * drive);   // håller nivån ungefär när drive ökar
        if (rvb > 0.0005 && !rvbOn_) rum_.reset();
        if (drive > 0.0005 && !driveOn_) vibe_.reset();
        rvbOn_ = rvb > 0.0005; driveOn_ = drive > 0.0005;
    }

    void advanceStep() {
        seqStep_ = (seqStep_ + 1) % kSeqSteps;
        // släpp toner som slutar här
        for (int k = 0; k < nActive_;) {
            if (--active_[k].left <= 0) { synth_.noteOff(active_[k].note); active_[k] = active_[--nActive_]; }
            else ++k;
        }
        for (int i = 0; i < pattern_.count; ++i) {
            const SeqNote& sn = pattern_.notes[i];
            if (sn.step != seqStep_ || sn.len == 0) continue;
            // samma ton spelas redan av frasen: starta om
            for (int k = 0; k < nActive_; ++k)
                if (active_[k].note == sn.note) { synth_.noteOff(sn.note); active_[k] = active_[--nActive_]; break; }
            synth_.noteOn(sn.note, std::max(1, (int)sn.vel)); ++meters_.noteCount;
            if (nActive_ < kMaxSeqNotes) active_[nActive_++] = {sn.note, (int)sn.len};
        }
    }
    void clearSeqNotes() {
        for (int k = 0; k < nActive_; ++k) synth_.noteOff(active_[k].note);
        nActive_ = 0;
    }

    bris::Bris synth_;
    GenEffect<rum::Dsp> rum_;
    GenEffect<vibe::Dsp> vibe_;
    int iWet_ = -1, iSize_ = -1, iDecay_ = -1, iDrive_ = -1, iOut_ = -1;
    bool rvbOn_ = false, driveOn_ = false;
    double val_[64]{};
    double sr_ = 48000.0, bpm_ = 120.0;

    Pattern pattern_{};
    bool playing_ = false;
    double seqPos_ = 0.0;
    int seqStep_ = -1;
    struct Active { int note; int left; };
    Active active_[kMaxSeqNotes]{};
    int nActive_ = 0;

    Meters meters_{};
    int scopeW_ = 0, scopeDec_ = 0;
};

}  // namespace blonda::app
