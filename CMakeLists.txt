# BLONDA BRIS – plugg och app för Mac (AU, VST3, Standalone) och iPad/iPhone (AUv3 + app). Byggs med JUCE.
#   cmake -B build -G Xcode && cmake --build build --config Release                       (Mac)
#   cmake -B build-ios -G Xcode -DCMAKE_SYSTEM_NAME=iOS && cmake --build build-ios ...      (iOS)
# Webbversionen byggs separat: web/bygg.sh
cmake_minimum_required(VERSION 3.22)

file(READ "${CMAKE_CURRENT_SOURCE_DIR}/VERSION" BRIS_VERSION)
string(STRIP "${BRIS_VERSION}" BRIS_VERSION)

if(CMAKE_SYSTEM_NAME STREQUAL "iOS")
    set(CMAKE_OSX_DEPLOYMENT_TARGET "15.0" CACHE STRING "")
else()
    set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "")
    set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64" CACHE STRING "")
endif()

project(BLONDA_BRIS VERSION ${BRIS_VERSION} LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 17)

include(FetchContent)
set(FETCHCONTENT_QUIET OFF)
FetchContent_Declare(JUCE GIT_REPOSITORY https://github.com/juce-framework/JUCE.git GIT_TAG 8.0.12 GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(JUCE)

if(CMAKE_SYSTEM_NAME STREQUAL "iOS")
    set(BRIS_FORMATS AUv3 Standalone)
elseif(APPLE)
    set(BRIS_FORMATS AU VST3 Standalone)
else()
    set(BRIS_FORMATS VST3 Standalone)
endif()

set(BRIS_TEAM "" CACHE STRING "Apples utvecklar-team-id för signering (tomt = osignerat)")

# BLONDA BRIS MPE: samma projekt och gränssnitt, motorn BRIS MPE (egen böj, slide och tryck per ton).
# En egen app/plugg bredvid BRIS (eget namn, bundle-id och pluggkod).   cmake -B build-mpe -DBRIS_MPE=ON ...
option(BRIS_MPE "Bygg BLONDA BRIS MPE" OFF)
if(BRIS_MPE)
    set(BRIS_NAMN "BLONDA BRIS MPE")
    set(BRIS_BUNDLE "se.blonda.brismpe")
    set(BRIS_KOD Brmp)
    set(BRIS_BESKRIVNING "BLONDA BRIS MPE - analog poly synth with per-note expression")
else()
    set(BRIS_NAMN "BLONDA BRIS")
    set(BRIS_BUNDLE "se.blonda.bris")
    set(BRIS_KOD Bris)
    set(BRIS_BESKRIVNING "BLONDA BRIS - analog poly synth")
endif()

juce_add_plugin(BlondaBris
    PRODUCT_NAME "${BRIS_NAMN}"
    COMPANY_NAME "BLONDA"
    COMPANY_WEBSITE "https://blonda.studio"
    BUNDLE_ID "${BRIS_BUNDLE}"
    PLUGIN_MANUFACTURER_CODE Blnd
    PLUGIN_CODE ${BRIS_KOD}
    DESCRIPTION "${BRIS_BESKRIVNING}"
    FORMATS ${BRIS_FORMATS}
    IS_SYNTH TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    NEEDS_WEB_BROWSER TRUE
    AU_MAIN_TYPE kAudioUnitType_MusicDevice
    AU_SANDBOX_SAFE TRUE
    VST3_CATEGORIES Instrument Synth
    ICON_BIG "${CMAKE_CURRENT_SOURCE_DIR}/resurser/ikon.png"
    BACKGROUND_AUDIO_ENABLED TRUE
    STATUS_BAR_HIDDEN TRUE
    REQUIRES_FULL_SCREEN FALSE
    IPHONE_SCREEN_ORIENTATIONS UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight
    IPAD_SCREEN_ORIENTATIONS UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight
    TARGETED_DEVICE_FAMILY "1,2"
    DEVELOPMENT_TEAM_ID "${BRIS_TEAM}"
    COPY_PLUGIN_AFTER_BUILD FALSE)

target_sources(BlondaBris PRIVATE plugin/PluginProcessor.cpp plugin/PluginEditor.cpp)
if(CMAKE_SYSTEM_NAME STREQUAL "iOS")
    enable_language(OBJCXX)
    target_sources(BlondaBris PRIVATE plugin/ios_webbvy.mm)
endif()

juce_add_binary_data(BrisUi SOURCES
    ui/index.html ui/style.css ui/app.js ui/bridge.js ui/blommor.js ui/data.js ui/kristall.js ui/kristall/kristall.webp ui/sjon.js ui/kassett.js ui/kassett/kassett_fack.webp ui/kassett/kassett_bak.webp ui/kassett/kassett_fram.webp ui/kassett/kassett_vhs_bak.webp ui/kassett/kassett_vhs_fram.webp ui/kassett/kassett_panel.webp ui/kassett/kassett_nere.webp ui/kassett/kassett_lucka.webp ui/kassett/kassett_vu.webp ui/kassett/kassett_nav.webp
    ui/fonts/blonda-mono.woff2 ui/fonts/blonda-grotesk.woff2
    ui/blommor/iris.webp ui/blommor/strelitzia.webp ui/blommor/lilja.webp ui/blommor/eukalyptus.webp ui/blommor/silke.webp
    ui/blommor/lavendel.webp ui/blommor/kanna.webp
    ui/blommor/lavendel_fram.webp ui/blommor/iris_fram.webp ui/blommor/kanna_fram.webp
    ui/blommor/strelitzia_fram.webp ui/blommor/lilja_fram.webp ui/blommor/eukalyptus_fram.webp ui/blommor/silke_fram.webp
    ui/blommor/smaragd.webp ui/blommor/guld.webp ui/blommor/blaiiris.webp ui/blommor/magenta.webp
    ui/blommor/smaragd_fram.webp ui/blommor/guld_fram.webp ui/blommor/blaiiris_fram.webp ui/blommor/magenta_fram.webp)
set_target_properties(BrisUi PROPERTIES POSITION_INDEPENDENT_CODE ON)

target_include_directories(BlondaBris SYSTEM PRIVATE External/blonda-motor/include External/blonda-motor/motorer)
target_include_directories(BlondaBris PRIVATE core)
target_compile_definitions(BlondaBris PUBLIC
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=0
    BRIS_MPE=$<BOOL:${BRIS_MPE}>)
target_link_libraries(BlondaBris
    PRIVATE BrisUi juce::juce_audio_utils juce::juce_gui_extra
    PUBLIC juce::juce_recommended_config_flags juce::juce_recommended_lto_flags juce::juce_recommended_warning_flags)

# ljudet måste vara optimerat även i Debug, annars hinner inte ljudtråden
if(NOT MSVC)
    set_source_files_properties(plugin/PluginProcessor.cpp PROPERTIES COMPILE_OPTIONS "-O3")
endif()

# tester av pluggens ljuddel (cmake -DBRIS_TESTER=ON)
option(BRIS_TESTER "Bygg tester" OFF)
if(BRIS_TESTER)
    add_executable(bris-plugin-test tester/plugin_test.cpp)
    target_link_libraries(bris-plugin-test PRIVATE BlondaBris)
    target_include_directories(bris-plugin-test PRIVATE core plugin "$<TARGET_PROPERTY:BlondaBris,INCLUDE_DIRECTORIES>")
    target_compile_definitions(bris-plugin-test PRIVATE "$<TARGET_PROPERTY:BlondaBris,COMPILE_DEFINITIONS>")
endif()
