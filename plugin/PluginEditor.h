// BLONDA BRIS – pluggens fönster: samma HTML-gränssnitt som webben (ui/), i en WebView.
#pragma once
#include "PluginProcessor.h"

class BrisEditor : public juce::AudioProcessorEditor, private juce::Timer {
public:
    explicit BrisEditor(BrisProcessor&);
    ~BrisEditor() override;
    void resized() override;
    void paint(juce::Graphics& g) override;

private:
    void timerCallback() override;
    void onMessage(const juce::var& m);
    void send(const juce::var& m) { web.emitEventIfBrowserIsVisible("bris", m); }
    void sendState();
    void sendDevices();                       // AUDIO / MIDI-rutan (fristående appen)
    void setDevice(const juce::var& m);
    std::optional<juce::WebBrowserComponent::Resource> getResource(const juce::String& url);

    BrisProcessor& proc;
    juce::WebBrowserComponent web;
    std::vector<double> sentValues;
    int sentPreset = -1;
    bool ready = false;
    uint32_t lastNc = 0;
    double sentHostTempo = -1.0;
    bool sentPlaying = false;
   #if JUCE_IOS
    bool webbvyJusterad = false;   // WKWebView justerad så att den täcker hela skärmen
   #endif

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(BrisEditor)
};
