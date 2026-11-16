// BLONDA BRIS – pluggens ljuddel.
#include "PluginProcessor.h"
#include "PluginEditor.h"

using namespace blonda::app;

namespace {
const char* const kVform[] = {"Saw", "Pulse", "Saw + Pulse"};
const char* const kLage[] = {"Poly Stereo", "Poly", "Mono", "Unison"};
const char* const kLwave[] = {"Triangle", "Ramp Up", "Ramp Down", "Square", "Random"};

juce::String valueText(const juce::String& id, float v) {
    const int iv = juce::roundToInt(v);
    if (id == "vform") return kVform[juce::jlimit(0, 2, iv)];
    if (id == "lage") return kLage[juce::jlimit(0, 3, iv)];
    if (id == "lwave") return kLwave[juce::jlimit(0, 4, iv)];
    if (id == "uniint") return (iv > 0 ? "+" : "") + juce::String(iv) + " st";
    if (id == "bendr") return juce::String(iv) + " st";
    if (id == "kbda") return (v > 0 ? "+" : "") + juce::String(juce::roundToInt(v * 100.0f));
    return juce::String(juce::roundToInt(v * 100.0f)) + " %";
}

juce::AudioProcessorValueTreeState::ParameterLayout makeLayout() {
    juce::AudioProcessorValueTreeState::ParameterLayout layout;
    for (int i = 0; i < Core::numParams(); ++i) {
        const auto& p = Core::paramInfo(i);
        const juce::String id(p.id);
        juce::NormalisableRange<float> range((float)p.min, (float)p.max, p.integer ? 1.0f : 0.0f);
        auto attr = juce::AudioParameterFloatAttributes()
                        .withStringFromValueFunction([id](float v, int) { return valueText(id, v); });
        layout.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID { id, 1 }, juce::String(p.name), range, (float)p.def, attr));
    }
    return layout;
}
}  // namespace

BrisProcessor::BrisProcessor()
    : AudioProcessor(BusesProperties().withOutput("Output", juce::AudioChannelSet::stereo(), true)),
      apvts(*this, nullptr, "BRIS", makeLayout()) {
    for (int i = 0; i < Core::numParams(); ++i) params.push_back(apvts.getParameter(Core::paramInfo(i).id));
    applied.assign(params.size(), std::numeric_limits<double>::quiet_NaN());
    // startljud: "bris" (index 65, en PAD/iris) om inget sparat tillstånd läses in
    applyProgramToHost(preset.load());
}

bool BrisProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const {
    if (!layouts.getMainInputChannelSet().isDisabled()) return false;
    const auto out = layouts.getMainOutputChannelSet();
    return out == juce::AudioChannelSet::stereo() || out == juce::AudioChannelSet::mono();
}

void BrisProcessor::prepareToPlay(double sampleRate, int) {
    core.prepare(sampleRate);
    std::fill(applied.begin(), applied.end(), std::numeric_limits<double>::quiet_NaN());
}

int BrisProcessor::findParam(const juce::String& id) const {
    for (int i = 0; i < (int)params.size(); ++i) if (params[(size_t)i]->getParameterID() == id) return i;
    return -1;
}

void BrisProcessor::setParamFromUi(int i, double v) {
    if (i < 0 || i >= numParams()) return;
    auto* p = params[(size_t)i];
    p->setValueNotifyingHost(p->convertTo0to1((float)v));
}

void BrisProcessor::gesture(int i, bool begin) {
    if (i < 0 || i >= numParams()) return;
    if (begin) params[(size_t)i]->beginChangeGesture(); else params[(size_t)i]->endChangeGesture();
}

void BrisProcessor::applyProgramToHost(int factoryIndex) {
    if (factoryIndex < 0 || factoryIndex >= kNumFactory) return;
    std::vector<double> cur(params.size()), nv(params.size());
    for (int i = 0; i < numParams(); ++i) cur[(size_t)i] = paramValue(i);
    Core::presetValues(factoryIndex, cur.data(), nv.data());
    for (int i = 0; i < numParams(); ++i) {
        auto* p = params[(size_t)i];
        const float n01 = p->convertTo0to1((float)nv[(size_t)i]);
        if (std::abs(n01 - p->getValue()) > 1.0e-7f) {
            p->beginChangeGesture(); p->setValueNotifyingHost(n01); p->endChangeGesture();
        }
    }
    preset.store(factoryIndex);
}

void BrisProcessor::loadPreset(int factoryIndex) { applyProgramToHost(factoryIndex); updateHostDisplay(ChangeDetails().withProgramChanged(true)); }

int BrisProcessor::getCurrentProgram() {
    const int p = preset.load();
    for (int i = 0; i < kNumFactory; ++i) if (kBrowseOrder[i] == p) return i;
    return 0;
}
void BrisProcessor::setCurrentProgram(int index) {
    if (index < 0 || index >= kNumFactory) return;
    applyProgramToHost(kBrowseOrder[index]);
}
const juce::String BrisProcessor::getProgramName(int index) {
    if (index < 0 || index >= kNumFactory) return {};
    const int f = kBrowseOrder[index];
    return juce::String(kPlants[kPresetPlant[f]].category) + " - " + juce::String::fromUTF8(blonda::bris::kPresets[f].name);
}

void BrisProcessor::uiNote(bool on, int note, int vel) {
    const auto w = noteFifo.write(1);
    if (w.blockSize1 > 0) noteBuf[(size_t)w.startIndex1] = { (uint8_t)(on ? 1 : 0), (uint8_t)juce::jlimit(0, 127, note), (uint8_t)juce::jlimit(1, 127, vel) };
}

void BrisProcessor::setPattern(const juce::var& pv) {
    patternVar = pv;
    Pattern p;
    p.rate = (int)pv.getProperty("rate", 4);
    if (auto* arr = pv.getProperty("notes", {}).getArray()) {
        for (const auto& n : *arr) {
            if (p.count >= kMaxSeqNotes) break;
            if (auto* a = n.getArray(); a != nullptr && a->size() >= 4)
                p.notes[p.count++] = { (uint8_t)juce::jlimit(0, 15, (int)(*a)[0]), (uint8_t)juce::jlimit(0, 16, (int)(*a)[1]),
                                       (uint8_t)juce::jlimit(0, 127, (int)(*a)[2]), (uint8_t)juce::jlimit(1, 127, (int)(*a)[3]) };
        }
    }
    const juce::SpinLock::ScopedLockType sl(patLock);
    patPending = p; patDirty = true;
}

bool BrisProcessor::readMeters(MeterSnap& out) {
    const juce::SpinLock::ScopedLockType sl(meterLock);
    if (!meterNew) return false;
    out = meterSnap; meterNew = false;
    return true;
}

void BrisProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) {
    juce::ScopedNoDenormals noDenormals;
    const int n = buffer.getNumSamples();

    // parametrar som ändrats (värden, automation, gränssnitt)
    for (int i = 0; i < numParams(); ++i) {
        const double v = paramValue(i);
        if (!juce::exactlyEqual(v, applied[(size_t)i])) {   // NaN i början = alltid skicka
            core.setParam(i, v); applied[(size_t)i] = v; }
    }
    // tempo: värdprogrammets om det finns, annars gränssnittets
    double bpm = 0.0;
    if (auto* ph = getPlayHead()) if (auto pos = ph->getPosition()) if (auto b = pos->getBpm()) bpm = *b;
    hostTempo.store(bpm);
    core.setTempo(bpm > 0.0 ? bpm : uiTempo.load());
    // rullen
    if (const juce::SpinLock::ScopedTryLockType tl(patLock); tl.isLocked() && patDirty) { core.setPattern(patPending); patDirty = false; }
    if (const int pr = playReq.exchange(-1); pr >= 0) core.setPlaying(pr == 1);
    seqPlaying.store(core.playing());
    if (panic.exchange(false)) core.allNotesOff();
    core.setGlid(glidMode.load(), glidAmount.load());
    // toner från gränssnittet
    {
        const auto r = noteFifo.read(noteFifo.getNumReady());
        auto play = [this](int start, int size) {
            for (int k = 0; k < size; ++k) { const auto& e = noteBuf[(size_t)(start + k)]; if (e.on) core.noteOn(e.note, e.vel); else core.noteOff(e.note); }
        };
        play(r.startIndex1, r.blockSize1); play(r.startIndex2, r.blockSize2);
    }

    // ljud, med MIDI på rätt sampel
    float* L = buffer.getWritePointer(0);
    float* R = buffer.getNumChannels() > 1 ? buffer.getWritePointer(1) : nullptr;
    float monoTmp[512];
    int pos = 0;
    auto render = [&](int upto) {
        while (pos < upto) {
            const int len = std::min(upto - pos, 512);
            if (R) core.process(L + pos, R + pos, len);
            else { core.process(L + pos, monoTmp, len); for (int s = 0; s < len; ++s) L[pos + s] = 0.5f * (L[pos + s] + monoTmp[s]); }
            pos += len;
        }
    };
    for (const auto meta : midi) {
        const int at = juce::jlimit(0, n, meta.samplePosition);
        render(at);
        const auto msg = meta.getMessage();
        const auto* raw = msg.getRawData();
        if (msg.getRawDataSize() >= 2 && raw[0] < 0xF0)
            core.midi(raw[0], raw[1], msg.getRawDataSize() > 2 ? raw[2] : 0);
    }
    render(n);
    for (int ch = 2; ch < buffer.getNumChannels(); ++ch) buffer.clear(ch, 0, n);
    midi.clear();

    if (const juce::SpinLock::ScopedTryLockType tl(meterLock); tl.isLocked()) {
        meterSnap.m = core.meters();
        // ringbufferten i tidsordning (äldst först)
        const int w = core.scopeWrite();
        for (int i = 0; i < kScopeLen; ++i) meterSnap.m.scope[i] = core.meters().scope[(w + i) % kScopeLen];
        meterNew = true;
    }
}

juce::AudioProcessorEditor* BrisProcessor::createEditor() { return new BrisEditor(*this); }

// ---------------------------------------------------------------- tillstånd
void BrisProcessor::getStateInformation(juce::MemoryBlock& destData) {
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    xml->setAttribute("brisVersion", JucePlugin_VersionString);
    xml->setAttribute("preset", preset.load());
    xml->setAttribute("tempo", uiTempo.load());
    xml->setAttribute("ui", uiState);
    xml->setAttribute("glid", glidMode.load());
    xml->setAttribute("pattern", juce::JSON::toString(patternVar, true));
    copyXmlToBinary(*xml, destData);
}

void BrisProcessor::setStateInformation(const void* data, int sizeInBytes) {
    std::unique_ptr<juce::XmlElement> xml(getXmlFromBinary(data, sizeInBytes));
    if (xml == nullptr || !xml->hasTagName(apvts.state.getType())) return;
    preset.store(juce::jlimit(0, kNumFactory - 1, xml->getIntAttribute("preset", 65)));
    uiTempo.store(xml->getDoubleAttribute("tempo", 120.0));
    uiState = xml->getStringAttribute("ui");
    glidMode.store(juce::jlimit(0, blonda::app::kNumGlid, xml->getIntAttribute("glid", 1)));
    const auto pat = juce::JSON::parse(xml->getStringAttribute("pattern"));
    if (pat.isObject()) setPattern(pat);
    apvts.replaceState(juce::ValueTree::fromXml(*xml));
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new BrisProcessor(); }
