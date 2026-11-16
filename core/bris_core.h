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
#ifndef BRIS_MPE
#define BRIS_MPE 0   // 1 = BLONDA BRIS MPE (motorn brismpe: egen böj, slide och tryck per ton)
#endif
#if BRIS_MPE
#include "brismpe/brismpe.h"
#endif
#include "rum/rum_ljud.h"
#include "vibe/vibe_ljud.h"
#include "kategorier.h"

namespace blonda::app {

#if BRIS_MPE
namespace syn = blonda::brismpe;
using Synth = brismpe::BrisMpe;
#else
namespace syn = blonda::bris;
using Synth = bris::Bris;
#endif

// ------------------------------------------------------------------ parametrar
// BRIS-parametrarna (utom UI_ONLY "hyll") i blonda-motors ordning, sedan kExtra.
struct CoreParams {
    static constexpr int kNumBris = syn::kNumParams;
    int count = 0;
    ParamInfo info[64]{};
    int brisIdx[64]{};
    CoreParams() {
        for (int i = 0; i < syn::kNumParams; ++i) {
            if (std::strcmp(syn::kParams[i].id, "hyll") == 0) continue;
            info[count] = syn::kParams[i]; brisIdx[count] = i; ++count;
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
    float glid = 0;         // glidets värde just nu 0..1 (tangenterna eller MPE-slide), för reglagen som följer med
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
        for (int k = 0; k < kNumGlid; ++k) glidIdx_[k] = cp.find(kGlid[k].param);
        iRate_ = cp.find("lrate"); iBendr_ = cp.find("bendr"); iSlm_ = cp.find("slm");
        applyExtra();
    }

    void prepare(double sr) {
        sr_ = sr;
        synth_.prepare(sr); rum_.prepare(sr); vibe_.prepare(sr);
        for (int i = 0; i < coreParams().count; ++i) setParam(i, val_[i]);
        seqPos_ = 0; seqStep_ = -1; clearSeqNotes();
    }
    void reset() { allNotesOff(); synth_.reset(); rum_.reset(); vibe_.reset(); }

    // ---------------------------------------------------------------- toner / MIDI
#if BRIS_MPE
    // Tangenterna på skärmen i BRIS MPE: varje ton får en egen MPE-kanal (2-16), så att fingrets slide (uiSlide)
    // bara påverkar den tonen.
    void noteOn(int n, int v) {
        if (n < 0 || n > 127) return;
        if (uiCh_[n] > 0) synth_.noteOffCh(uiCh_[n], n);
        int ch = -1;
        for (int k = 0; k < 15 && ch < 0; ++k) { const int c = 1 + (uiNext_ + k) % 15; if (uiUsed_[c] == 0) ch = c; }
        if (ch < 0) ch = 1 + uiNext_ % 15;
        uiNext_ = ch % 15;
        uiCh_[n] = ch; ++uiUsed_[ch];
        synth_.channelBend(ch, 0); synth_.channelSlide(ch, 0); synth_.channelPressure(ch, 0);
        synth_.noteOnCh(ch, n, v); ++meters_.noteCount;
    }
    void noteOff(int n) {
        if (n < 0 || n > 127 || uiCh_[n] <= 0) return;
        synth_.noteOffCh(uiCh_[n], n); --uiUsed_[uiCh_[n]]; uiCh_[n] = 0;
    }
    void uiSlide(int n, double v) { if (n >= 0 && n <= 127 && uiCh_[n] > 0) synth_.channelSlide(uiCh_[n], v); }
#else
    void noteOn(int n, int v) { synth_.noteOn(n, v); ++meters_.noteCount; }
    void noteOff(int n) { synth_.noteOff(n); }
    void uiSlide(int, double) {}   // bara BRIS MPE har slide per ton
#endif
    void allNotesOff() {
        synth_.allNotesOff(); clearSeqNotes(); clearExpr();
#if BRIS_MPE
        for (int n = 0; n < 128; ++n) uiCh_[n] = 0;
        for (int c = 0; c < 16; ++c) uiUsed_[c] = 0;
#endif
    }
    // MIDI, med MPE: varje ton på en egen kanal (2-16, kanal 1 = huvudkanal). Motorn har ett filter och en böj för
    // alla röster, så uttrycket per ton slås ihop: slide (CC74) styr glidet (högsta slide bland tonerna som hålls),
    // tryck blir aftertouch (högsta trycket), och böj på tonkanalerna följer den senast spelade tonen
    // (MPE:s böjomfång, 48 halvtoner om inget annat skickas med RPN 0). Vanliga klaviaturer på kanal 1 som förut.
    void midi(uint8_t s, uint8_t d1, uint8_t d2) {
        const int ch = s & 15, ty = s & 0xF0;
#if BRIS_MPE
        // BRIS MPE tolkar MPE själv, per ton (brismpe.h)
        if (ty == 0x90 && d2 > 0) ++meters_.noteCount;
        (void)ch;
        synth_.midi(s, d1, d2);
        return;
#endif
        if (ty == 0x90 && d2 > 0) {
            ++meters_.noteCount; ++chNotes_[ch]; lastCh_ = ch;
            if (ch != 0) { mpe_ = true; applyBend(ch); }   // MPE skickar tonens böj före tonen: använd den
        } else if (ty == 0x80 || ty == 0x90) {
            if (chNotes_[ch] > 0 && --chNotes_[ch] == 0) { slide_[ch] = 0; press_[ch] = 0; }
            updExpr();
        } else if (ty == 0xB0 && d1 == 74) {          // MPE slide (eller ljushet på vanliga klaviaturer)
            slide_[ch] = d2 / 127.0; updExpr(); return;
        } else if (ty == 0xB0 && (d1 == 101 || d1 == 100)) {
            (d1 == 101 ? rpnMsb_ : rpnLsb_)[ch] = d2; return;
        } else if (ty == 0xB0 && d1 == 6 && rpnMsb_[ch] == 0 && rpnLsb_[ch] == 0) {
            bendRange_[ch] = std::max(1, (int)d2);
            if (ch != 0) mpe_ = true;
            return;
        } else if (ty == 0xD0 && mpe_ && ch != 0) {   // tryck per ton (MPE); på kanal 1 som vanlig aftertouch
            press_[ch] = d1 / 127.0; updExpr(); return;
        } else if (ty == 0xE0 && mpe_ && ch != 0) {
            bend_[ch] = ((((int)d2 << 7) | d1) - 8192) / 8192.0;
            if (ch == lastCh_) applyBend(ch);
            return;
        } else if (ty == 0xB0 && (d1 == 120 || d1 == 123)) {
            clearExpr();
        }
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
        if (glidMode_ > 0 && glidApplied_ > 0.0) applyGlid();   // parametern som glider får glidet ovanpå
    }

    // ---------------------------------------------------------------- glid på tangenterna
    // Fingret glider uppåt på en tangent som hålls -> amount 0..1. Läggs ovanpå målparametern i ljudtråden,
    // utan att ändra parameterns sparade värde (getParam, automation och ljudets värden är oförändrade).
    // mode: 0 av, 1 FILTER, 2 VIBRATO, 3 TREMOLO, 4 PWM, 5 WAH
    void setGlid(int mode, double amount) {
        mode = std::max(0, std::min(kNumGlid, mode));
#if BRIS_MPE
        // BRIS MPE: läget är motorns slide-mål (parametern slm), mängden kommer per ton (uiSlide / MPE)
        (void)amount;
        if (iSlm_ >= 0 && (int)val_[iSlm_] != mode) setParam(iSlm_, mode);
        return;
#endif
        if (mode != glidMode_) { glidRestore(); glidMode_ = mode; glidApplied_ = 0.0; glidSm_ = 0.0; }
        glidTarget_ = mode > 0 ? std::min(1.0, std::max(0.0, amount)) : 0.0;
    }
#if BRIS_MPE
    int glidMode() const { return iSlm_ >= 0 ? (int)val_[iSlm_] : 0; }
#else
    int glidMode() const { return glidMode_; }
#endif

    // Räknar ut alla parametrars värden efter att fabriksljud `index` valts, utgående från `current`
    // (samma regler som Max-pluggen: allt som ljudet inte nämner får standardvärdet, utom volym/böjomfång).
    // Effekterna får växtens startvärden. Allokerar inte, men använder en egen motor: anropa inte från ljudtråden.
    static void presetValues(int index, const double* current, double* out) {
#if defined(__wasm__)
        static Synth scratch;               // webben: en enda tråd
#else
        thread_local Synth scratch;         // en egen per tråd: anropas från meddelande-/gränssnittstråden
#endif
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
            // glidet utjämnas och läggs på i bitar om 32 sampel (ingen hackig filtersvepning)
            const double tgt = glidMode_ > 0 ? std::max(glidTarget_, midiSlide_) : 0.0;
            const bool glid = glidMode_ > 0 && (glidSm_ > 1e-5 || tgt > 0.0);
            if (glid) {
                chunk = std::min(chunk, 32);
                glidSm_ += (tgt - glidSm_) * (1.0 - std::exp(-chunk / (sr_ * 0.025)));
                if (tgt <= 0.0 && glidSm_ < 1e-4) glidSm_ = 0.0;
                applyGlid();
            }
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
#if BRIS_MPE
        meters_.glid = (float)synth_.slideNow();
#else
        meters_.glid = (float)glidSm_;
#endif
    }

    const Meters& meters() const { return meters_; }
    int scopeWrite() const { return scopeW_; }   // var i ringbufferten nästa värde skrivs
    Synth& synth() { return synth_; }

private:
    void updExpr() {
        double sl = 0, pr = 0;
        for (int c = 0; c < 16; ++c) if (chNotes_[c] > 0) { sl = std::max(sl, slide_[c]); if (c != 0) pr = std::max(pr, press_[c]); }
        midiSlide_ = sl;
        if (mpe_ && std::fabs(pr - pressOut_) > 1e-9) { pressOut_ = pr; synth_.aftertouch(pr); }
    }
    void clearExpr() {
        for (int c = 0; c < 16; ++c) { chNotes_[c] = 0; slide_[c] = 0; press_[c] = 0; }
        midiSlide_ = 0; if (pressOut_ > 0.0) { pressOut_ = 0; synth_.aftertouch(0); }
    }
    void applyBend(int ch) {
        const double semis = bend_[ch] * bendRange_[ch];
        const double br = std::max(1.0, iBendr_ >= 0 ? val_[iBendr_] : 2.0);
        synth_.pitchBend(std::min(1.0, std::max(-1.0, semis / br)));
    }

    void applyGlid() {
        const CoreParams& cp = coreParams();
        const GlidInfo& g = kGlid[glidMode_ - 1];
        const int i = glidIdx_[glidMode_ - 1];
        if (i < 0) return;
        const ParamInfo& p = cp.info[i];
        synth_.setParam(cp.brisIdx[i], std::min(p.max, std::max(p.min, val_[i] + glidSm_ * g.depth * (p.max - p.min))));
        if (g.rate && iRate_ >= 0) {
            const double base = val_[iRate_], to = std::max(base, kGlidRate);
            synth_.setParam(cp.brisIdx[iRate_], base + (to - base) * std::min(1.0, glidSm_ * 4.0));
        }
        glidApplied_ = glidSm_;
    }
    void glidRestore() {
        if (glidMode_ <= 0) return;
        const CoreParams& cp = coreParams();
        const int i = glidIdx_[glidMode_ - 1];
        if (i >= 0) synth_.setParam(cp.brisIdx[i], val_[i]);
        if (iRate_ >= 0) synth_.setParam(cp.brisIdx[iRate_], val_[iRate_]);
    }

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

    Synth synth_;
    GenEffect<rum::Dsp> rum_;
    GenEffect<vibe::Dsp> vibe_;
    int iWet_ = -1, iSize_ = -1, iDecay_ = -1, iDrive_ = -1, iOut_ = -1;
    int glidIdx_[kNumGlid]{}, iRate_ = -1, glidMode_ = 0;
    double glidTarget_ = 0.0, glidSm_ = 0.0, glidApplied_ = 0.0;
    // MPE / uttryck per kanal
    int chNotes_[16]{}, rpnMsb_[16]{127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127},
        rpnLsb_[16]{127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127},
        bendRange_[16]{2, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48}, lastCh_ = 0, iBendr_ = -1;
    double slide_[16]{}, press_[16]{}, bend_[16]{}, midiSlide_ = 0.0, pressOut_ = 0.0;
    bool mpe_ = false;
    int iSlm_ = -1;   // BRIS MPE: slide-målet
#if BRIS_MPE
    int uiCh_[128]{}, uiUsed_[16]{}, uiNext_ = 0;   // tangenterna på skärmen: kanal per ton
#endif
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
