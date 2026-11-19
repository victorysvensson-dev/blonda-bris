// BLONDA BRIS – pluggens ljuddel.
#include "PluginProcessor.h"
#include "PluginEditor.h"
#include <BinaryData.h>

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
    loadSfx();
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

// factoryIndex: BRIS fabriksljud (0..kNumFactory-1) eller ett av de hemliga motorernas (kNumFactory..kNumAllPresets-1)
void BrisProcessor::applyProgramToHost(int factoryIndex) {
    if (factoryIndex < 0 || factoryIndex >= blonda::app::kNumAllPresets) return;
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

// apparatens ljud: ui/ljud/bris_<namn>.wav (16 bitar PCM, mono), i Ljudeffekter::Id:s ordning. Filerna är våra egna
// (tools: 48 kHz mono), så en enkel läsare av RIFF räcker (inget beroende av juce_audio_formats).
static bool lasWav(const char* d, int n, std::vector<float>& ut, double& sr) {
    auto u32 = [&](int i) { return (uint32_t)(uint8_t)d[i] | (uint32_t)(uint8_t)d[i + 1] << 8 | (uint32_t)(uint8_t)d[i + 2] << 16 | (uint32_t)(uint8_t)d[i + 3] << 24; };
    auto u16 = [&](int i) { return (int)((uint8_t)d[i] | (uint8_t)d[i + 1] << 8); };
    if (n < 44 || std::memcmp(d, "RIFF", 4) != 0 || std::memcmp(d + 8, "WAVE", 4) != 0) return false;
    int kanaler = 0, bitar = 0;
    for (int i = 12; i + 8 <= n;) {
        const int len = (int)u32(i + 4), b = i + 8;
        if (len < 0 || b + len > n) return false;
        if (std::memcmp(d + i, "fmt ", 4) == 0 && len >= 16) { if (u16(b) != 1) return false; kanaler = u16(b + 2); sr = u32(b + 4); bitar = u16(b + 14); }
        else if (std::memcmp(d + i, "data", 4) == 0 && kanaler > 0 && bitar == 16) {
            const int ramar = len / (2 * kanaler);
            ut.resize((size_t)ramar);
            for (int k = 0; k < ramar; ++k) ut[(size_t)k] = (int16_t)u16(b + k * 2 * kanaler) / 32768.0f;   // första kanalen
            return ramar > 0;
        }
        i = b + len + (len & 1);
    }
    return false;
}

void BrisProcessor::loadSfx() {
    static const char* const namn[] = {"bris_knapp.wav", "bris_kort.wav", "bris_rec.wav", "bris_upp.wav", "bris_lucka.wav", "bris_in.wav"};
    for (int id = 0; id < (int)std::size(namn); ++id) {
        for (int i = 0; i < BinaryData::namedResourceListSize; ++i) {
            if (juce::String(BinaryData::originalFilenames[i]) != namn[id]) continue;
            int size = 0;
            const char* data = BinaryData::getNamedResource(BinaryData::namedResourceList[i], size);
            double sr = 48000.0;
            if (data != nullptr && lasWav(data, size, sfxData[id], sr)) {
                sfxRate[id] = sr;
                core.setSfx(id, sfxData[id].data(), (int)sfxData[id].size(), sr);
            }
            break;
        }
    }
}

void BrisProcessor::uiBand(int cmd, bool tyst) {
    const auto w = noteFifo.write(1);
    if (w.blockSize1 > 0) noteBuf[(size_t)w.startIndex1] = { (uint8_t)5, (uint8_t)juce::jlimit(0, 5, cmd), (uint8_t)(tyst ? 1 : 0) };
}

void BrisProcessor::uiSfx(int id, float styrka, float fart) {
    const auto w = noteFifo.write(1);
    if (w.blockSize1 > 0) noteBuf[(size_t)w.startIndex1] = { (uint8_t)6, (uint8_t)juce::jlimit(0, 7, id), (uint8_t)juce::roundToInt(juce::jlimit(0.0f, 1.0f, styrka) * 255.0f), fart };
}

void BrisProcessor::uiGlid(int mode, float amount) {
#if BRIS_MPE
    (void)amount;   // mängden kommer per ton (uiSlide); läget är parametern slm (sparas och kan automatiseras)
    if (const int i = findParam("slm"); i >= 0) setParamFromUi(i, mode);
#else
    glidMode.store(mode); glidAmount.store(amount);
#endif
}

int BrisProcessor::getGlidMode() const {
#if BRIS_MPE
    const int i = findParam("slm");
    return i >= 0 ? (int)std::lround(paramValue(i)) : 0;
#else
    return glidMode.load();
#endif
}

juce::File BrisProcessor::userPresetFile() {
    return juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory)
        .getChildFile("BLONDA").getChildFile(JucePlugin_Name).getChildFile("egna-ljud.json");
}

juce::var BrisProcessor::loadUserPresets() const {
    const auto f = userPresetFile();
    if (!f.existsAsFile()) return juce::Array<juce::var>();
    const auto v = juce::JSON::parse(f.loadFileAsString());
    return v.isArray() ? v : juce::var(juce::Array<juce::var>());
}

void BrisProcessor::saveUserPresets(const juce::var& list) const {
    if (!list.isArray()) return;
    const auto f = userPresetFile();
    f.getParentDirectory().createDirectory();
    f.replaceWithText(juce::JSON::toString(list, false));
}

void BrisProcessor::uiSlide(int note, float v) {
    const auto w = noteFifo.write(1);
    if (w.blockSize1 > 0) noteBuf[(size_t)w.startIndex1] = { (uint8_t)2, (uint8_t)juce::jlimit(0, 127, note), (uint8_t)juce::roundToInt(juce::jlimit(0.0f, 1.0f, v) * 255.0f) };
}

void BrisProcessor::uiPad(const juce::var& notes, int vel) {
    // 4 = släpp padens ackord, 3 = en ton i det nya ackordet (allt läses i samma block i ljudtråden)
    const auto* arr = notes.getArray();
    const int n = arr != nullptr ? std::min(16, arr->size()) : 0;
    const auto w = noteFifo.write(1 + n);
    auto put = [&](int k, NoteEv e) { noteBuf[(size_t)(k < w.blockSize1 ? w.startIndex1 + k : w.startIndex2 + k - w.blockSize1)] = e; };
    if (w.blockSize1 + w.blockSize2 < 1 + n) return;   // kön full: hoppa över (nästa tryckning kommer fram)
    put(0, { (uint8_t)4, 0, 0 });
    for (int k = 0; k < n; ++k)
        put(1 + k, { (uint8_t)3, (uint8_t)juce::jlimit(0, 127, (int)(*arr)[k]), (uint8_t)juce::jlimit(1, 127, vel) });
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
    core.setFollow(follow.load());
#if !BRIS_MPE
    core.setGlid(glidMode.load(), glidAmount.load());   // BRIS MPE: slide-målet är en parameter, mängden per ton
#endif
    // toner från gränssnittet
    {
        const auto r = noteFifo.read(noteFifo.getNumReady());
        auto play = [this](int start, int size) {
            for (int k = 0; k < size; ++k) {
                const auto& e = noteBuf[(size_t)(start + k)];
                if (e.on == 2) core.uiSlide(e.note, e.vel / 255.0);   // slide (0..255)
                else if (e.on == 5) core.bandKommando(e.note, e.vel == 0);   // bandspelarens knappar (vel 1 = tyst)
                else if (e.on == 6) core.sfx(e.note, e.vel / 255.0, e.f > 0.0f ? e.f : 1.0);   // apparatens ljud
                else if (e.on == 3) core.padNote(e.note, e.vel);
                else if (e.on == 4) core.padClear();
                else if (e.on) core.noteOn(e.note, e.vel);
                else core.noteOff(e.note);
            }
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
    xml->setAttribute("follow", follow.load() ? 1 : 0);
    xml->setAttribute("pattern", juce::JSON::toString(patternVar, true));
    copyXmlToBinary(*xml, destData);
}

void BrisProcessor::setStateInformation(const void* data, int sizeInBytes) {
    std::unique_ptr<juce::XmlElement> xml(getXmlFromBinary(data, sizeInBytes));
    if (xml == nullptr || !xml->hasTagName(apvts.state.getType())) return;
    preset.store(juce::jlimit(0, blonda::app::kNumAllPresets - 1, xml->getIntAttribute("preset", 65)));
    uiTempo.store(xml->getDoubleAttribute("tempo", 120.0));
    uiState = xml->getStringAttribute("ui");
    glidMode.store(juce::jlimit(0, blonda::app::kNumGlid, xml->getIntAttribute("glid", 1)));
    follow.store(xml->getIntAttribute("follow", 0) != 0);   // BRIS MPE: parametern slm
    const auto pat = juce::JSON::parse(xml->getStringAttribute("pattern"));
    if (pat.isObject()) setPattern(pat);
    apvts.replaceState(juce::ValueTree::fromXml(*xml));
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new BrisProcessor(); }
