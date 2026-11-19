// Testar pluggens ljuddel (samma kod som AU/VST3/AUv3): MIDI ger ljud, alla program fungerar, tillstånd sparas
// och läses tillbaka, automation når ljudet, rullen spelar.
#include <set>
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
    p.uiFollow(true);
    p.setParamFromUi(p.findParam("motime"), 0.81);
    juce::MemoryBlock mb; p.getStateInformation(mb);
    std::unique_ptr<juce::AudioProcessor> base2(createPluginFilter());
    auto& q = *dynamic_cast<BrisProcessor*>(base2.get());
    q.setStateInformation(mb.getData(), (int)mb.getSize());
    KRAV(std::abs(q.paramValue(q.findParam("cut")) - 0.123) < 1e-3, "tillstånd: cutoff %.3f", q.paramValue(q.findParam("cut")));
    KRAV(q.currentPreset() == p.currentPreset(), "tillstånd: ljud %d", q.currentPreset());
    KRAV(q.uiState == p.uiState, "tillstånd: gränssnitt");
    KRAV(q.getGlidMode() == 3, "tillstånd: glidläget (%d)", q.getGlidMode());
    KRAV(q.supportsMPE(), "pluggen anmäler MPE till värdprogrammet");
    KRAV(q.getFollow(), "tillstånd: FOLLOW");
    KRAV(std::abs(q.paramValue(q.findParam("motime")) - 0.81) < 1e-3, "tillstånd: MOOD TIME %.3f", q.paramValue(q.findParam("motime")));
    // de hemliga patcharnas motorer: ett av motorns ljud väljer motorn (parametern motor), låter, och sparas i tillståndet
    {
        const int iMotor = p.findParam("motor");
        KRAV(iMotor >= 0 && p.findParam("ogp8") >= 0 && p.findParam("sjton") >= 0 && p.findParam("svtyp") >= 0, "motorernas parametrar finns för värdprogrammet");
        for (int m = 0; m < blonda::app::kNumMotorer; ++m) {
            const auto& mi = blonda::app::kMotorer[m];
            p.loadPreset(mi.firstPreset + 1);
            juce::MidiBuffer mm; mm.addEvent(juce::MidiMessage::noteOn(1, 60, (juce::uint8)100), 0); mm.addEvent(juce::MidiMessage::noteOn(1, 64, (juce::uint8)100), 0);
            const double r = render(p, 0.8, &mm);
            juce::MidiBuffer o; o.addEvent(juce::MidiMessage::allNotesOff(1), 0); render(p, 0.05, &o);
            KRAV((int)p.paramValue(iMotor) == m + 1 && r > 0.01, "%s: motorn väljs och låter (motor %d, rms %.3f)", mi.id, (int)p.paramValue(iMotor), r);
        }
        juce::MemoryBlock mm; p.getStateInformation(mm);
        std::unique_ptr<juce::AudioProcessor> b3(createPluginFilter());
        auto& q3 = *dynamic_cast<BrisProcessor*>(b3.get());
        q3.setStateInformation(mm.getData(), (int)mm.getSize());
        KRAV(q3.currentPreset() == p.currentPreset() && (int)q3.paramValue(iMotor) == blonda::app::kNumMotorer, "tillstånd: motorns ljud och motorn (%d, motor %d)", q3.currentPreset(), (int)q3.paramValue(iMotor));
        p.setCurrentProgram(3);
        KRAV((int)p.paramValue(iMotor) == 0, "ett BRIS-program tar tillbaka BRIS (motor %d)", (int)p.paramValue(iMotor));
    }
    // egna ljud: sparas i en fil och läses tillbaka (filen återställs efteråt)
    {
        const auto f = BrisProcessor::userPresetFile();
        const bool fanns = f.existsAsFile(); const auto gammal = fanns ? f.loadFileAsString() : juce::String();
        juce::DynamicObject::Ptr e = new juce::DynamicObject(); e->setProperty("name", "TESTLJUD"); e->setProperty("base", 12);
        juce::DynamicObject::Ptr vals = new juce::DynamicObject(); vals->setProperty("cut", 0.3); e->setProperty("values", juce::var(vals.get()));
        juce::Array<juce::var> lista; lista.add(juce::var(e.get()));
        p.saveUserPresets(lista);
        const auto tillbaka = q.loadUserPresets();
        KRAV(tillbaka.isArray() && tillbaka.size() == 1 && tillbaka[0]["name"].toString() == "TESTLJUD" && (double)tillbaka[0]["values"]["cut"] == 0.3,
             "egna ljud sparas och läses tillbaka (%s)", f.getFullPathName().toRawUTF8());
        if (fanns) f.replaceWithText(gammal); else f.deleteFile();
    }
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
    p.uiNote(false, 64, 0); render(p, 3);

    // ackordpad från gränssnittet, med ARP och FOLLOW (C-dur): pianots C# blir C eller D
    {
        p.setParamFromUi(p.findParam("cut"), 0.6); p.setParamFromUi(p.findParam("ar"), 0.2);   // glidtestet lämnade filtret stängt
        p.uiFollow(true);
        juce::Array<juce::var> ack { 48, 52, 55 };
        p.uiPad(juce::var(ack), 100); render(p, 0.1); BrisProcessor::MeterSnap s4; p.readMeters(s4);
        KRAV(s4.m.voiceMask != 0 && s4.m.followRoot == 0 && s4.m.followMask == 0xAB5, "pad spelar och ger FOLLOW-skalan (%d %03x)", s4.m.followRoot, (unsigned)s4.m.followMask);
        p.setParamFromUi(p.findParam("arp"), 1);
        std::set<int> hort;   // arpens toner, avlästa i små bitar (gaten gör att den ibland är tyst)
        for (int k = 0; k < 40; ++k) { render(p, 0.03); if (p.readMeters(s4) && s4.m.arpNote >= 0) hort.insert(s4.m.arpNote); }
        KRAV(hort == std::set<int>({48, 52, 55}), "ARP spelar padens ackord (%d toner)", (int)hort.size());
        p.uiPad(juce::var(juce::Array<juce::var>()), 100); p.setParamFromUi(p.findParam("arp"), 0); render(p, 4); p.readMeters(s4);
        KRAV(s4.m.voiceMask == 0 && s4.m.arpNote < 0, "pad och ARP tystnar (%d)", s4.m.voiceMask);
        // MOOD: freeze håller reverben efter tonen
        p.setParamFromUi(p.findParam("mowet"), 1); p.setParamFromUi(p.findParam("motime"), 0.7);
        p.uiNote(true, 60, 110); render(p, 0.5); p.setParamFromUi(p.findParam("mofrz"), 1); p.uiNote(false, 60, 0);
        render(p, 4); const double frys = render(p, 0.5);
        KRAV(frys > 0.003, "MOOD FREEZE håller ljudet (rms %.4f)", frys);
        p.setParamFromUi(p.findParam("mofrz"), 0); p.setParamFromUi(p.findParam("mowet"), 0); p.uiFollow(false);
    }

    // bandet (KASSETTEN): parametrarna finns i pluggen, ljudet går igenom med brus efter tonen, av = tyst igen
    {
        KRAV(p.findParam("tape") >= 0 && p.findParam("tamedia") >= 0 && p.findParam("tawow") >= 0, "bandets parametrar finns i pluggen");
        p.setParamFromUi(p.findParam("tape"), 1); p.setParamFromUi(p.findParam("tamedia"), 0);
        p.uiNote(true, 60, 110); const double med = render(p, 0.5); p.uiNote(false, 60, 0); render(p, 3);
        KRAV(med > 0.003 && std::isfinite(med), "bandet: ljudet går igenom (rms %.4f)", med);
        juce::MemoryBlock mb2; p.getStateInformation(mb2);
        p.setParamFromUi(p.findParam("tape"), 0); p.setStateInformation(mb2.getData(), (int)mb2.getSize());
        KRAV(p.paramValue(p.findParam("tape")) > 0.5, "bandet sparas med pluggens läge");
        // bandspelaren: spela in, spola tillbaka (stannar själv), spela upp: det inspelade hörs utan toner
        p.setParamFromUi(p.findParam("tape"), 1);
        p.uiBand(2); p.uiNote(true, 60, 110); p.uiNote(true, 64, 100); render(p, 1.0); p.uiNote(false, 60, 0); p.uiNote(false, 64, 0);
        p.uiBand(0); render(p, 3.0); const double tyst2 = render(p, 0.3);
        p.uiBand(3); render(p, 1.5);
        BrisProcessor::MeterSnap sb; p.readMeters(sb);
        KRAV(sb.m.bandLage == 0 && sb.m.bandPos < 1e-4f, "bandspelaren: REW stannar vid början (läge %d, %.4f)", sb.m.bandLage, sb.m.bandPos);
        p.uiBand(1); const double upp = render(p, 0.8); p.readMeters(sb);
        KRAV(sb.m.bandLage == 1 && upp > tyst2 * 30 && upp > 0.003, "bandspelaren: PLAY spelar upp det inspelade (rms %.4f, tyst %.5f)", upp, tyst2);
        p.uiBand(0, true); render(p, 0.5);
        p.setParamFromUi(p.findParam("tape"), 0); render(p, 0.1);
        // apparatens ljud ur BinaryData (knappar, lucka, band in) spelas i kärnan
        const double fore = render(p, 0.2); p.uiSfx(4, 1.0f, 1.0f); const double sfx = render(p, 0.5);
        KRAV(sfx > 0.003 && sfx > fore * 30, "apparatens ljud: luckan hörs (rms %.4f, före %.5f)", sfx, fore);
        render(p, 1.5);
        BrisProcessor::MeterSnap s5; p.readMeters(s5);
        KRAV(s5.m.peakL >= 0 && s5.m.peakR >= 0, "nivåmätarna för vänster och höger finns");
    }

    std::printf(fel ? "%d FEL\n" : "ALLT OK\n", fel);
    return fel ? 1 : 0;
}
