// BLONDA BRIS – pluggens ljuddel (AU, VST3, AUv3, Standalone). Ljudet kommer från core/bris_core.h.
#pragma once
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>

#include <array>
#include <atomic>

#include "bris_core.h"

class BrisProcessor : public juce::AudioProcessor {
public:
    BrisProcessor();
    ~BrisProcessor() override = default;

    // ---- AudioProcessor
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;
    using AudioProcessor::processBlock;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "BLONDA BRIS"; }
    bool acceptsMidi() const override { return true; }
    bool supportsMPE() const override { return true; }   // MPE-klaviaturer: slide, tryck och böj per ton (se Core::midi)
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 4.0; }

    // fabriksljuden som program (i ljudlistans ordning, växt för växt)
    int getNumPrograms() override { return blonda::app::kNumFactory; }
    int getCurrentProgram() override;
    void setCurrentProgram(int index) override;
    const juce::String getProgramName(int index) override;
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    // ---- för gränssnittet (meddelandetråden)
    int numParams() const { return (int)params.size(); }
    juce::RangedAudioParameter* param(int i) const { return params[(size_t)i]; }
    int findParam(const juce::String& id) const;
    double paramValue(int i) const { return params[(size_t)i]->convertFrom0to1(params[(size_t)i]->getValue()); }
    void setParamFromUi(int i, double v);
    void gesture(int i, bool begin);
    void loadPreset(int factoryIndex);            // fabriksljud (blonda-motors index)
    int currentPreset() const { return preset.load(); }

    void uiNote(bool on, int note, int vel);      // tangenter i gränssnittet -> ljudtråden
    void uiGlid(int mode, float amount);   // glidets läge (och i BRIS mängden från skärmens tangenter)
    int getGlidMode() const;               // BRIS MPE: motorns slide-mål (parametern slm)
    // egna ljud: sparas i en fil per produkt (BLONDA BRIS / BLONDA BRIS MPE), gemensam för alla projekt
    static juce::File userPresetFile();
    juce::var loadUserPresets() const;
    void saveUserPresets(const juce::var& list) const;
    void uiSlide(int note, float v);       // BRIS MPE: ett fingers slide på sin ton (gränssnittet -> ljudtråden)
    void uiPad(const juce::var& notes, int vel);   // ackordpad: tonerna (tom = släpp)
    void uiFollow(bool on) { follow.store(on); }    // FOLLOW: tangenterna följer padens skala
    void uiBand(int cmd, bool tyst = false);        // KASSETTEN: bandspelarens knappar (Bandspelare::Kommando)
    void uiSfx(int id, float styrka, float fart);   // apparatens ljud (lucka, band in), tajmade av gränssnittet
    bool getFollow() const { return follow.load(); }
    void allNotesOff() { panic.store(true); }
    void setPattern(const juce::var& pattern);    // rullen
    juce::var getPattern() const { return patternVar; }
    void setPlaying(bool on) { playReq.store(on ? 1 : 0); }
    bool isSeqPlaying() const { return seqPlaying.load(); }
    void setUiTempo(double bpm) { uiTempo.store(juce::jlimit(30.0, 300.0, bpm)); }
    double getUiTempo() const { return uiTempo.load(); }
    double getHostTempo() const { return hostTempo.load(); }   // 0 = värden anger inget tempo
    juce::String uiState;

    struct MeterSnap { blonda::app::Meters m; };
    bool readMeters(MeterSnap& out);   // false om inget nytt

private:
    void applyProgramToHost(int factoryIndex);

    juce::AudioProcessorValueTreeState apvts;
    std::vector<juce::RangedAudioParameter*> params;
    std::vector<double> applied;
    blonda::app::Core core;

    std::atomic<int> preset { 65 };

    // gränssnittets toner -> ljudtråden (en skrivare, en läsare)
    struct NoteEv { uint8_t on, note, vel; float f = 0.0f; };
    juce::AbstractFifo noteFifo { 256 };
    std::array<NoteEv, 256> noteBuf {};
    std::atomic<bool> panic { false };
    std::atomic<bool> follow { false };          // sparas i projektet
    std::atomic<int> glidMode { 1 };            // 1 = FILTER (som gränssnittets standard); sparas i projektet          // glid på tangenterna (gränssnittet -> ljudtråden)
    std::atomic<float> glidAmount { 0.0f };

    // apparatens ljud (knappar, lucka, band), avkodade ur BinaryData i konstruktorn; kärnan får pekare
    std::vector<float> sfxData[blonda::app::Ljudeffekter::kAntal];
    double sfxRate[blonda::app::Ljudeffekter::kAntal] {};
    std::vector<int16_t> melloData[blonda::app::mello::kNumBand];   // MELLOTRONs band (16 bitar stereo)
    void loadSfx();
    void loadMello();

    // rullen
    juce::SpinLock patLock;
    blonda::app::Pattern patPending {};
    bool patDirty = false;
    juce::var patternVar;
    std::atomic<int> playReq { -1 };
    std::atomic<bool> seqPlaying { false };
    std::atomic<double> uiTempo { 120.0 }, hostTempo { 0.0 };

    // mätare
    juce::SpinLock meterLock;
    MeterSnap meterSnap;
    bool meterNew = false;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(BrisProcessor)
};
