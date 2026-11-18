// BLONDA BRIS – pluggens fönster.
#include "PluginEditor.h"

#include <BinaryData.h>
#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_audio_plugin_client/Standalone/juce_StandaloneFilterWindow.h>

namespace {
const char* mimeFor(const juce::String& file) {
    const auto ext = file.fromLastOccurrenceOf(".", false, false).toLowerCase();
    if (ext == "html") return "text/html; charset=utf-8";
    if (ext == "css") return "text/css; charset=utf-8";
    if (ext == "js") return "text/javascript; charset=utf-8";
    if (ext == "woff2") return "font/woff2";
    if (ext == "svg") return "image/svg+xml";
    if (ext == "png") return "image/png";
    if (ext == "webp") return "image/webp";
    if (ext == "json") return "application/json; charset=utf-8";
    return "application/octet-stream";
}

juce::WebBrowserComponent::Options webOptions(BrisEditor* self, std::function<void(const juce::var&)> onMsg,
                                              std::function<std::optional<juce::WebBrowserComponent::Resource>(const juce::String&)> res) {
    juce::ignoreUnused(self);
    return juce::WebBrowserComponent::Options {}
        .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
        .withWinWebView2Options(juce::WebBrowserComponent::Options::WinWebView2 {}
                                    .withUserDataFolder(juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("BLONDA BRIS")))
        .withNativeIntegrationEnabled()
        .withKeepPageLoadedWhenBrowserIsHidden()
        .withEventListener("bris", [onMsg](juce::var m) { onMsg(m); })
        .withResourceProvider([res](const juce::String& url) { return res(url); });
}
}  // namespace

#if JUCE_IOS
#include "ios_webbvy.h"
#endif

BrisEditor::BrisEditor(BrisProcessor& p)
    : AudioProcessorEditor(&p), proc(p),
      web(webOptions(this, [this](const juce::var& m) { onMessage(m); }, [this](const juce::String& u) { return getResource(u); })) {
    addAndMakeVisible(web);
    web.goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
    setResizable(true, true);
    setResizeLimits(360, 300, 3000, 2000);
   #if JUCE_IOS
    setSize(1024, 700);
   #else
    setSize(1180, 700);
   #endif
    sentValues.assign((size_t)proc.numParams(), std::numeric_limits<double>::quiet_NaN());
    startTimerHz(40);
   #if ! JUCE_IOS
    // fristående app: systemets egen titelrad i stället för JUCE:s mörka, i designens ljusa färg
    if (juce::JUCEApplicationBase::isStandaloneApp())
        juce::MessageManager::callAsync([safe = juce::Component::SafePointer<BrisEditor>(this)] {
            if (safe == nullptr) return;
            if (auto* w = safe->findParentComponentOfClass<juce::DocumentWindow>()) {
                w->setUsingNativeTitleBar(true);
                w->setBackgroundColour(juce::Colour(0xfff6f1f4));
                w->setResizable(true, false);
                w->setContentComponentSize(safe->getWidth(), safe->getHeight());
            }
        });
   #endif
}

BrisEditor::~BrisEditor() { stopTimer(); }

void BrisEditor::paint(juce::Graphics& g) { g.fillAll(juce::Colour(0xfff6f1f4)); }
void BrisEditor::resized() {
    web.setBounds(getLocalBounds());
   #if JUCE_IOS
    webbvyJusterad = false;   // timern justerar webbvyn igen (iOS kan ha bytt ut den vid storleksändringen)
   #endif
}

std::optional<juce::WebBrowserComponent::Resource> BrisEditor::getResource(const juce::String& url) {
    auto path = url.fromFirstOccurrenceOf(juce::WebBrowserComponent::getResourceProviderRoot(), false, false);
    if (path.isEmpty()) path = url;
    path = path.upToFirstOccurrenceOf("?", false, false).trimCharactersAtStart("/");
    if (path.isEmpty()) path = "index.html";
    const auto file = path.fromLastOccurrenceOf("/", false, false);
    for (int i = 0; i < BinaryData::namedResourceListSize; ++i) {
        if (file == BinaryData::originalFilenames[i]) {
            int size = 0;
            if (const char* data = BinaryData::getNamedResource(BinaryData::namedResourceList[i], size)) {
                std::vector<std::byte> v((size_t)size);
                std::memcpy(v.data(), data, (size_t)size);
                return juce::WebBrowserComponent::Resource { std::move(v), juce::String(mimeFor(file)) };
            }
        }
    }
    return std::nullopt;
}

void BrisEditor::sendState() {
    auto* o = new juce::DynamicObject();
    auto* pv = new juce::DynamicObject();
    for (int i = 0; i < proc.numParams(); ++i) {
        const double v = proc.paramValue(i);
        pv->setProperty(proc.param(i)->getParameterID(), v);
        sentValues[(size_t)i] = v;
    }
    o->setProperty("t", "state");
    o->setProperty("params", juce::var(pv));
    o->setProperty("preset", proc.currentPreset());
    o->setProperty("glid", proc.getGlidMode());
    o->setProperty("follow", proc.getFollow());
    o->setProperty("mpe", (bool)BRIS_MPE);   // BRIS MPE: varje finger får egen slide
    o->setProperty("user", proc.loadUserPresets());
    o->setProperty("pattern", proc.getPattern());
    const double ht = proc.getHostTempo();
    o->setProperty("tempo", ht > 0.0 ? ht : proc.getUiTempo());
    o->setProperty("hostTempo", ht > 0.0);
    o->setProperty("playing", proc.isSeqPlaying());
    o->setProperty("ui", proc.uiState);
    o->setProperty("standalone", juce::JUCEApplicationBase::isStandaloneApp());
    o->setProperty("version", JucePlugin_VersionString);
    sentPreset = proc.currentPreset();
    send(juce::var(o));
    ready = true;
}

void BrisEditor::onMessage(const juce::var& m) {
    const auto t = m.getProperty("t", "").toString();
    if (t == "hello") { sendState(); return; }
    if (t == "diag") {
       #if JUCE_IOS
        // layoutens mätvärden (sidan + webbvyn) till appens tmp-mapp; CI läser filen i simulatorn
        juce::String txt = m.getProperty("s", "").toString() + "\n";
        if (auto* peer = getPeer()) txt << juce::String(brisWebbvyInfo(peer->getNativeHandle())) << "\n";
        txt << "editor " << getWidth() << "x" << getHeight() << ", justerad " << (webbvyJusterad ? "ja" : "nej") << "\n";
        juce::File::getSpecialLocation(juce::File::tempDirectory).getChildFile("bris-layout.txt").appendText(txt);
       #endif
        return;
    }
    if (t == "param") {
        const int i = proc.findParam(m.getProperty("id", "").toString());
        if (i >= 0) { const double v = (double)m.getProperty("v", 0.0); proc.setParamFromUi(i, v); sentValues[(size_t)i] = proc.paramValue(i); }
    } else if (t == "gesture") {
        proc.gesture(proc.findParam(m.getProperty("id", "").toString()), (bool)m.getProperty("on", false));
    } else if (t == "preset") {
        proc.loadPreset((int)m.getProperty("i", 0));
        sentPreset = proc.currentPreset();
        // de nya värdena skickas av timern (sentValues skiljer sig)
    } else if (t == "note") {
        proc.uiNote(true, (int)m.getProperty("n", 60), (int)m.getProperty("v", 100));
    } else if (t == "off") {
        proc.uiNote(false, (int)m.getProperty("n", 60), 0);
    } else if (t == "pattern") {
        proc.setPattern(m);
    } else if (t == "user") {
        proc.saveUserPresets(m.getProperty("list", {}));
    } else if (t == "slide") {
        proc.uiSlide((int)m.getProperty("n", 60), (float)(double)m.getProperty("v", 0.0));
    } else if (t == "pad") {
        proc.uiPad(m.getProperty("n", {}), (int)m.getProperty("v", 100));
    } else if (t == "follow") {
        proc.uiFollow((bool)m.getProperty("on", false));
    } else if (t == "band") {
        proc.uiBand((int)m.getProperty("k", 0), (bool)m.getProperty("tyst", false));
    } else if (t == "sfx") {
        proc.uiSfx((int)m.getProperty("i", 0), (float)(double)m.getProperty("g", 1.0), (float)(double)m.getProperty("r", 1.0));
    } else if (t == "glid") {
        proc.uiGlid((int)m.getProperty("m", 0), (float)(double)m.getProperty("v", 0.0));
    } else if (t == "play") {
        proc.setPlaying((bool)m.getProperty("on", false));
        sentPlaying = (bool)m.getProperty("on", false);
    } else if (t == "tempo") {
        proc.setUiTempo((double)m.getProperty("bpm", 120.0));
    } else if (t == "ui") {
        proc.uiState = m.getProperty("s", "").toString();
    } else if (t == "panic") {
        proc.allNotesOff();
    } else if (t == "settings") {
        sendDevices();   // gränssnittet visar en egen ruta (inte JUCE:s gråa sida, som inte gick att stänga på iPad)
    } else if (t == "setdev") {
        setDevice(m);
    }
}

// ---------------------------------------------------------------- AUDIO / MIDI i den fristående appen
// Gränssnittet ritar rutan; här läses och ändras ljudenheten och MIDI-ingångarna i appens AudioDeviceManager.
void BrisEditor::sendDevices() {
    auto* holder = juce::StandalonePluginHolder::getInstance();
    if (holder == nullptr) return;
    auto& dm = holder->deviceManager;
    auto* o = new juce::DynamicObject();
    o->setProperty("t", "devs");
    juce::Array<juce::var> midi;
    for (const auto& d : juce::MidiInput::getAvailableDevices()) {
        auto* e = new juce::DynamicObject();
        e->setProperty("id", d.identifier); e->setProperty("name", d.name); e->setProperty("on", dm.isMidiInputDeviceEnabled(d.identifier));
        midi.add(juce::var(e));
    }
    o->setProperty("midi", midi);
    o->setProperty("bt", juce::BluetoothMidiDevicePairingDialogue::isAvailable());
    const auto setup = dm.getAudioDeviceSetup();
    o->setProperty("out", setup.outputDeviceName);
    juce::Array<juce::var> outs, rates, bufs;
    if (auto* type = dm.getCurrentDeviceTypeObject())
        for (const auto& n : type->getDeviceNames(false)) outs.add(n);
    if (auto* dev = dm.getCurrentAudioDevice()) {
        for (auto r : dev->getAvailableSampleRates()) rates.add(r);
        for (auto b : dev->getAvailableBufferSizes()) bufs.add(b);
        o->setProperty("sr", dev->getCurrentSampleRate());
        o->setProperty("buf", dev->getCurrentBufferSizeSamples());
    }
    o->setProperty("outs", outs); o->setProperty("rates", rates); o->setProperty("bufs", bufs);
    send(juce::var(o));
}

void BrisEditor::setDevice(const juce::var& m) {
    auto* holder = juce::StandalonePluginHolder::getInstance();
    if (holder == nullptr) return;
    auto& dm = holder->deviceManager;
    const auto what = m.getProperty("what", "").toString();
    if (what == "midi") {
        dm.setMidiInputDeviceEnabled(m.getProperty("id", "").toString(), (bool)m.getProperty("on", false));
    } else if (what == "bt") {
        juce::BluetoothMidiDevicePairingDialogue::open();
    } else {
        auto setup = dm.getAudioDeviceSetup();
        if (what == "out") setup.outputDeviceName = m.getProperty("v", "").toString();
        else if (what == "sr") setup.sampleRate = (double)m.getProperty("v", 48000.0);
        else if (what == "buf") setup.bufferSize = (int)m.getProperty("v", 512);
        dm.setAudioDeviceSetup(setup, true);
    }
    holder->saveAudioDeviceState();
    sendDevices();
}

void BrisEditor::timerCallback() {
   #if JUCE_IOS
    if (!webbvyJusterad)
        if (auto* peer = getPeer()) webbvyJusterad = brisJusteraWebbvy(peer->getNativeHandle());
   #endif
    if (!ready) return;
    // parametrar som ändrats av värden (automation, program) eller av ett ljudbyte
    juce::DynamicObject::Ptr changed;
    for (int i = 0; i < proc.numParams(); ++i) {
        const double v = proc.paramValue(i);
        if (std::isnan(sentValues[(size_t)i]) || std::abs(v - sentValues[(size_t)i]) > 1.0e-9) {
            if (!changed) changed = new juce::DynamicObject();
            changed->setProperty(proc.param(i)->getParameterID(), v);
            sentValues[(size_t)i] = v;
        }
    }
    if (proc.currentPreset() != sentPreset) {
        sentPreset = proc.currentPreset();
        auto* o = new juce::DynamicObject(); o->setProperty("t", "preset"); o->setProperty("i", sentPreset); send(juce::var(o));
    }
    if (changed) { auto* o = new juce::DynamicObject(); o->setProperty("t", "params"); o->setProperty("v", juce::var(changed.get())); send(juce::var(o)); }

    BrisProcessor::MeterSnap s;
    if (proc.readMeters(s)) {
        auto* o = new juce::DynamicObject();
        o->setProperty("t", "m");
        o->setProperty("env", s.m.env); o->setProperty("lfo", s.m.lfo); o->setProperty("pk", std::max(s.m.peakL, s.m.peakR)); o->setProperty("pl", s.m.peakL); o->setProperty("pr", s.m.peakR);
        o->setProperty("mask", s.m.voiceMask); o->setProperty("step", s.m.step); o->setProperty("nc", (int)(s.m.noteCount % 1000000u)); o->setProperty("glid", s.m.glid);
        juce::Array<juce::var> ks; for (auto k : s.m.keys) ks.add((juce::int64)k);
        o->setProperty("keys", ks); o->setProperty("fr", s.m.followRoot); o->setProperty("fm", s.m.followMask); o->setProperty("an", s.m.arpNote);
        o->setProperty("bp", s.m.bandPos); o->setProperty("bf", s.m.bandFart); o->setProperty("bi", s.m.bandInsp); o->setProperty("bs", s.m.bandSek);
        o->setProperty("bl", s.m.bandLage); o->setProperty("bvl", s.m.bandVuL); o->setProperty("bvr", s.m.bandVuR);
        juce::Array<juce::var> sc; sc.ensureStorageAllocated(blonda::app::kScopeLen);
        for (int i = 0; i < blonda::app::kScopeLen; i += 2) sc.add(s.m.scope[i]);
        o->setProperty("scope", sc);
        const double ht = proc.getHostTempo();
        if (ht > 0.0) { o->setProperty("bpm", ht); o->setProperty("host", true); }
        send(juce::var(o));
    }
}
