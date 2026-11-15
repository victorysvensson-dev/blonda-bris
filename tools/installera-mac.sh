#!/bin/sh
# Installerar senaste BLONDA BRIS på Macen: AU (Logic), VST3 (Ableton m.fl.) och appen.
#   curl -sL https://raw.githubusercontent.com/victorysvensson-dev/blonda-bris/main/tools/installera-mac.sh | sh
set -e
URL=https://github.com/victorysvensson-dev/blonda-bris/releases/download/senaste
T=$(mktemp -d)
echo "Hämtar BLONDA BRIS ..."
curl -fsSL "$URL/BLONDA-BRIS-AU-mac.zip" -o "$T/au.zip"
curl -fsSL "$URL/BLONDA-BRIS-VST3-mac.zip" -o "$T/vst3.zip"
curl -fsSL "$URL/BLONDA-BRIS-app-mac.zip" -o "$T/app.zip"
mkdir -p ~/Library/Audio/Plug-Ins/Components ~/Library/Audio/Plug-Ins/VST3
rm -rf ~/Library/Audio/Plug-Ins/Components/"BLONDA BRIS.component" ~/Library/Audio/Plug-Ins/VST3/"BLONDA BRIS.vst3" /Applications/"BLONDA BRIS.app"
ditto -x -k "$T/au.zip" ~/Library/Audio/Plug-Ins/Components/
ditto -x -k "$T/vst3.zip" ~/Library/Audio/Plug-Ins/VST3/
ditto -x -k "$T/app.zip" /Applications/
xattr -dr com.apple.quarantine ~/Library/Audio/Plug-Ins/Components/"BLONDA BRIS.component" ~/Library/Audio/Plug-Ins/VST3/"BLONDA BRIS.vst3" /Applications/"BLONDA BRIS.app" 2>/dev/null || true
killall -9 AudioComponentRegistrar 2>/dev/null || true
rm -rf "$T"
echo "Kontrollerar AU-pluggen (som Logic gör) ..."
if auval -v aumu Bris Blnd 2>&1 | grep -q "AU VALIDATION SUCCEEDED"; then echo "Klart: BLONDA BRIS finns i Logic (Instrument > AU Instruments > BLONDA), som VST3 och i Program."; else echo "AU-kontrollen gick inte igenom – kör: auval -v aumu Bris Blnd"; fi
