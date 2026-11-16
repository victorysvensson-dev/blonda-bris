// Testar pluggens ljuddel (samma kod som AU/VST3/AUv3): MIDI ger ljud, alla program fungerar, tillstånd sparas
// och läses tillbaka, automation når ljudet, rullen spelar.
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_events/juce_events.h>
#include "../plugin/PluginProcessor.h"

static int fel = 0;
#define KRAV(c, ...) do { std::printf((c) ? "OK   " : "FEL  "); std::printf(__VA_ARGS__); std::printf("\n"); if (!(c)) ++fel; } while (0)

static double render(BrisProcessor& p, double sec, juce::MidiBuffer* first = nullptr) {
    juce::AudioBuffer<float> buf(2, 512);
    double acc = 0; long n = 0;
    for (int b = 0; b < (int)(sec * 48000 / 512); ++b) {
        juce::MidiBuffer m; if (b == 0 && first) m = *first;
        buf.clear(); p.processBlock(buf, m);
        for (int ch = 0; ch < 2; ++ch) for (int s = 0; s < 512; ++s) { const float x = buf.getSample(ch, s); if (!std::isfinite(x)) return -1; acc += x * x; ++n; }
    }
    return std::sqrt(acc / n);
}

int main() {
    juce::ScopedJuceInitialiser_GUI init;
    std::unique_ptr<juce::AudioProcessor> base(createPluginFilter());
    auto& p = *dynamic_cast<BrisProcessor*>(base.get());
    p.setPlayConfigDetails(0, 2, 48000, 512);
    p.prepareToPlay(48000, 512);
    KRAV(p.getNumPrograms() == 90, "90 program (%d)", p.getNumPrograms());
    KRAV(p.getProgramName(0).startsWith("PAD"), "program 0 heter %s", p.getProgramName(0).toRawUTF8());

    juce::MidiBuffer on; on.addEvent(juce::MidiMessage::noteOn(1, 60, (juce::uint8)100), 10); on.addEvent(juce::MidiMessage::noteOn(1, 67, (juce::uint8)90), 200);
    const double r0 = render(p, 1.0, &on);
    KRAV(r0 > 0.01, "MIDI ger ljud (rms %.3f)", r0);
    juce::MidiBuffer off; off.addEvent(juce::MidiMessage::allNotesOff(1), 0);
    render(p, 6.0, &off);
    const double tyst = render(p, 0.5);
    KRAV(tyst < 1e-4, "tystnad efter noter av (rms %.6f)", tyst);

    int tysta = 0;
    for (int i = 0; i < p.getNumPrograms(); ++i) {
        p.setCurrentProgram(i);
        juce::MidiBuffer m; m.addEvent(juce::MidiMessage::noteOn(1, juce::String(p.getProgramName(i)).startsWith("BASS") ? 36 : 60, (juce::uint8)100), 0);
        const double r = render(p, 0.7, &m);
        if (!(r > 0.002)) { ++tysta; std::printf("     tyst/fel: %s (%.4f)\n", p.getProgramName(i).toRawUTF8(), r); }
        juce::MidiBuffer o; o.addEvent(juce::MidiMessage::allNotesOff(1), 0); render(p, 0.05, &o);
    }
    KRAV(tysta == 0, "alla 90 program låter (%d tysta)", tysta);
    p.setCurrentProgram(3);
    KRAV(p.getCurrentProgram() == 3, "aktuellt program följer (%d)", p.getCurrentProgram());

    // tillstånd
    const int iCut = p.findParam("cut");
    p.setParamFromUi(iCut, 0.123);
    juce::DynamicObject::Ptr pat = new juce::DynamicObject(); pat->setProperty("rate", 4);
    juce::Array<juce::var> notes; for (int s = 0; s < 16; s += 4) notes.add(juce::Array<juce::var> { s, 2, 60 + s, 100 });
    pat->setProperty("notes", notes); pat->setProperty("plant", "iris");
    p.setPattern(juce::var(pat.get()));
    p.uiState = "{\"tab\":\"fx\"}";
    p.uiGlid(3, 0.0f);
    juce::MemoryBlock mb; p.getStateInformation(mb);
    std::unique_ptr<juce::AudioProcessor> base2(createPluginFilter());
    auto& q = *dynamic_cast<BrisProcessor*>(base2.get());
    q.setStateInformation(mb.getData(), (int)mb.getSize());
    KRAV(std::abs(q.paramValue(q.findParam("cut")) - 0.123) < 1e-3, "tillstånd: cutoff %.3f", q.paramValue(q.findParam("cut")));
    KRAV(q.currentPreset() == p.currentPreset(), "tillstånd: ljud %d", q.currentPreset());
    KRAV(q.uiState == p.uiState, "tillstånd: gränssnitt");
    KRAV(q.getGlidMode() == 3, "tillstånd: glidläget (%d)", q.getGlidMode());
    KRAV(q.supportsMPE(), "pluggen anmäler MPE till värdprogrammet");
    p.uiGlid(1, 0.0f);
    KRAV(q.getPattern().getProperty("notes", {}).size() == 4, "tillstånd: rullen (%d toner)", q.getPattern().getProperty("notes", {}).size());

    // automation når ljudet: mörkare med låg cutoff
    p.setCurrentProgram(0);
    auto rmsAt = [&](double cut) { p.setParamFromUi(iCut, cut); juce::MidiBuffer m; m.addEvent(juce::MidiMessage::noteOn(1, 48, (juce::uint8)100), 0);
        const double r = render(p, 0.6, &m); juce::MidiBuffer o; o.addEvent(juce::MidiMessage::allNotesOff(1), 0); render(p, 3, &o); return r; };
    const double lo = rmsAt(0.05), hi = rmsAt(0.95);
    KRAV(hi > lo * 1.3, "automation når ljudet (cutoff 0.05: %.3f, 0.95: %.3f)", lo, hi);
    // glid på tangenterna (gränssnittets meddelande) når ljudet utan att ändra parametern
    {
#if BRIS_MPE
        // BRIS MPE: fingrets slide på sin ton (tangenterna på skärmen)
        auto rmsGlid = [&](float v) { p.setParamFromUi(iCut, 0.05); p.uiGlid(1, 0.0f); p.uiNote(true, 48, 100);
            render(p, 0.2); p.uiSlide(48, v); const double r = render(p, 0.5); p.uiNote(false, 48, 0); render(p, 3); return r; };
#else
        auto rmsGlid = [&](float v) { p.setParamFromUi(iCut, 0.05); p.uiGlid(1, v); juce::MidiBuffer m; m.addEvent(juce::MidiMessage::noteOn(1, 48, (juce::uint8)100), 0);
            render(p, 0.2, &m); const double r = render(p, 0.5); juce::MidiBuffer o; o.addEvent(juce::MidiMessage::allNotesOff(1), 0); p.uiGlid(1, 0.0f); render(p, 3, &o); return r; };
#endif
        const double g0 = rmsGlid(0.0f), g1 = rmsGlid(1.0f);
        KRAV(g1 > g0 * 1.3, "glid FILTER når ljudet (%.3f -> %.3f)", g0, g1);
        KRAV(std::abs(p.paramValue(iCut) - 0.05) < 1e-6, "glidet ändrar inte cutoff-parametern (%.3f)", p.paramValue(iCut));
        p.uiGlid(0, 0.0f);
    }

    // rullen
    p.setPattern(juce::var(pat.get())); p.setUiTempo(120); p.setPlaying(true);
    BrisProcessor::MeterSnap s0; render(p, 0.02); p.readMeters(s0);
    render(p, 2.1);
    BrisProcessor::MeterSnap s1; p.readMeters(s1);
    KRAV(s1.m.noteCount - s0.m.noteCount >= 4, "rullen spelar (%u toner)", s1.m.noteCount - s0.m.noteCount);
    p.setPlaying(false); render(p, 4);
    BrisProcessor::MeterSnap s2; p.readMeters(s2);
    KRAV(s2.m.voiceMask == 0, "rullen stoppar och släpper tonerna");

    // gränssnittets tangenter
    p.uiNote(true, 64, 100); render(p, 0.1); BrisProcessor::MeterSnap s3; p.readMeters(s3);
    KRAV(s3.m.voiceMask != 0, "tangent i gränssnittet spelar");
    p.uiNote(false, 64, 0);

    std::printf(fel ? "%d FEL\n" : "ALLT OK\n", fel);
    return fel ? 1 : 0;
}
