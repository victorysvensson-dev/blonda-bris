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
}

BrisEditor::~BrisEditor() { stopTimer(); }

void BrisEditor::paint(juce::Graphics& g) { g.fillAll(juce::Colour(0xfff6f1f4)); }
void BrisEditor::resized() { web.setBounds(getLocalBounds()); }

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
        if (auto* holder = juce::StandalonePluginHolder::getInstance())
            juce::MessageManager::callAsync([holder] { holder->showAudioSettingsDialog(); });
    }
}

void BrisEditor::timerCallback() {
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
        o->setProperty("env", s.m.env); o->setProperty("lfo", s.m.lfo); o->setProperty("pk", std::max(s.m.peakL, s.m.peakR));
        o->setProperty("mask", s.m.voiceMask); o->setProperty("step", s.m.step); o->setProperty("nc", (int)(s.m.noteCount % 1000000u));
        juce::Array<juce::var> sc; sc.ensureStorageAllocated(blonda::app::kScopeLen);
        for (int i = 0; i < blonda::app::kScopeLen; i += 2) sc.add(s.m.scope[i]);
        o->setProperty("scope", sc);
        const double ht = proc.getHostTempo();
        if (ht > 0.0) { o->setProperty("bpm", ht); o->setProperty("host", true); }
        send(juce::var(o));
    }
}
