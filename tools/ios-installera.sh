#!/bin/bash
# Bygger BLONDA BRIS (app + AUv3) och lägger den på en iPad/iPhone som är kopplad till Macen med sladd.
#   curl -sL https://raw.githubusercontent.com/victorysvensson-dev/blonda-bris/main/tools/ios-installera.sh | bash
#   ... | bash -s iphone      (välj iPhone när flera enheter syns; "ipad" är standard)
#   ... | bash -s xcode       (gör bara Xcode-projektet och öppnar det i Xcode: välj enhet och tryck Kör där)
# Kräver Xcode med ditt Apple-ID inlagt (Xcode > Settings > Accounts). CMake hämtas automatiskt om det saknas.
set -e
VILL="${1:-ipad}"
MAPP="$HOME/Developer/blonda-bris"
VERKTYG="$HOME/.blonda"
steg() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
stopp() { printf '\n\033[1;31mSTOPP:\033[0m %s\n' "$1"; exit 1; }

steg "1/6 Kontrollerar Xcode"
command -v xcodebuild >/dev/null || stopp "Xcode saknas."
xcodebuild -version | head -1
if ! xcodebuild -checkFirstLaunchStatus >/dev/null 2>&1; then
  stopp "Xcode behöver göra klart sin första start. Öppna Xcode en gång, godkänn och installera det den ber om, och kör sedan raden igen."
fi

steg "2/6 CMake"
if command -v cmake >/dev/null; then CMAKE=$(command -v cmake)
elif [ -x "$VERKTYG/CMake.app/Contents/bin/cmake" ]; then CMAKE="$VERKTYG/CMake.app/Contents/bin/cmake"
else
  echo "Hämtar CMake ..."
  mkdir -p "$VERKTYG"
  curl -fsSL https://github.com/Kitware/CMake/releases/download/v3.31.6/cmake-3.31.6-macos-universal.tar.gz | tar xz -C "$VERKTYG"
  mv "$VERKTYG/cmake-3.31.6-macos-universal/CMake.app" "$VERKTYG/" && rm -rf "$VERKTYG/cmake-3.31.6-macos-universal"
  CMAKE="$VERKTYG/CMake.app/Contents/bin/cmake"
fi
"$CMAKE" --version | head -1

steg "3/6 Hämtar BLONDA BRIS"
mkdir -p "$HOME/Developer"
if [ -d "$MAPP/.git" ]; then git -C "$MAPP" pull -q --ff-only; else git clone -q https://github.com/victorysvensson-dev/blonda-bris "$MAPP"; fi
git -C "$MAPP" log -1 --format="senaste: %h %s"

steg "4/6 Ditt Apple-utvecklarteam"
TEAM="${BRIS_TEAM:-}"
if [ -z "$TEAM" ]; then
  for nyckel in IDEProvisioningTeamByIdentifier IDEProvisioningTeams; do
    # betalt team först, annars personligt (gratis)
    T=$(defaults read com.apple.dt.Xcode "$nyckel" 2>/dev/null | tr -d '\n' | grep -Eo 'isFreeProvisioningTeam = 0;[^}]*teamID = [A-Z0-9]+|teamID = [A-Z0-9]+;[^}]*isFreeProvisioningTeam = 0' | grep -Eo 'teamID = [A-Z0-9]+' | head -1 | awk '{print $3}')
    [ -z "$T" ] && T=$(defaults read com.apple.dt.Xcode "$nyckel" 2>/dev/null | grep -Eo 'teamID = [A-Z0-9]+' | head -1 | awk '{print $3}')
    [ -n "$T" ] && TEAM="$T" && break
  done
fi
[ -n "$TEAM" ] || stopp "Hittar inget Apple-ID i Xcode. Öppna Xcode > Settings > Accounts, tryck + och logga in med ditt Apple-ID. Kör sedan raden igen."
echo "team: $TEAM"

if [ "$VILL" = "xcode" ]; then
  steg "5/5 Gör Xcode-projektet och öppnar det"
  cd "$MAPP"
  "$CMAKE" -B build-ios -G Xcode -DCMAKE_SYSTEM_NAME=iOS -DBRIS_TEAM="$TEAM" \
    -DCMAKE_XCODE_ATTRIBUTE_DEVELOPMENT_TEAM="$TEAM" -DCMAKE_XCODE_ATTRIBUTE_CODE_SIGN_STYLE=Automatic >/dev/null
  # visa bara appens schema (BlondaBris_Standalone) så att Kör lägger appen på enheten; ALL_BUILD m.fl. bygger bara
  UD="build-ios/BLONDA_BRIS.xcodeproj/xcuserdata/$USER.xcuserdatad/xcschemes"
  mkdir -p "$UD"
  {
    echo '<?xml version="1.0" encoding="UTF-8"?>'
    echo '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
    echo '<plist version="1.0"><dict><key>SchemeUserState</key><dict>'
    i=1
    for S in BlondaBris_Standalone BlondaBris_AUv3 ALL_BUILD BlondaBris BlondaBris_All BrisUi install ZERO_CHECK; do
      VIS=false; [ "$S" = BlondaBris_Standalone ] && VIS=true
      echo "<key>$S.xcscheme_^#shared#^_</key><dict><key>orderHint</key><integer>$i</integer><key>isShown</key><$VIS/></dict>"
      i=$((i+1))
    done
    echo '</dict></dict></plist>'
  } > "$UD/xcschememanagement.plist"
  open build-ios/BLONDA_BRIS.xcodeproj
  cat <<'TXT'

Xcode öppnar BLONDA BRIS. Där:
  1. Uppe i mitten ska det stå "BlondaBris_Standalone" och din iPad (står det ALL_BUILD: klicka och byt).
  2. Tryck på Kör (triangeln uppe till vänster, eller Cmd+R).
Första bygget tar några minuter. Öppnas inte appen: se tipsen nedan.
  - Inställningar > Integritet och säkerhet > Utvecklarläge: slå på och starta om enheten.
  - Inställningar > Allmänt > VPN och enhetshantering: tryck på ditt Apple-ID och "Lita på".
TXT
  exit 0
fi

steg "5/6 Letar efter din iPad/iPhone"
J=$(mktemp)
xcrun devicectl list devices --json-output "$J" >/dev/null 2>&1 || true
ENHET=$(/usr/bin/python3 - "$J" "$VILL" <<'PY'
import json, sys
try: d = json.load(open(sys.argv[1]))["result"]["devices"]
except Exception: d = []
vill = sys.argv[2].lower()
def ok(x):
    hw = x.get("hardwareProperties", {}); cp = x.get("connectionProperties", {})
    return hw.get("platform") == "iOS" and cp.get("pairingState") == "paired" and cp.get("tunnelState") != "unavailable"
val = [x for x in d if ok(x)]
# önskad sort (ipad/iphone) först, sedan de som sitter i sladd
val.sort(key=lambda x: (x.get("hardwareProperties", {}).get("deviceType", "").lower() != vill,
                        x.get("connectionProperties", {}).get("transportType") != "wired"))
if val:
    x = val[0]; print(x["hardwareProperties"]["udid"] + "|" + x.get("deviceProperties", {}).get("name", "enhet"))
PY
)
[ -n "$ENHET" ] || stopp "Hittar ingen iPad/iPhone. Koppla in den med sladd, lås upp den och tryck 'Lita på' om den frågar. Kör sedan raden igen."
UDID="${ENHET%%|*}"; NAMN="${ENHET#*|}"
echo "enhet: $NAMN"

steg "6/6 Bygger och installerar (tar några minuter första gången)"
cd "$MAPP"
"$CMAKE" -B build-ios -G Xcode -DCMAKE_SYSTEM_NAME=iOS -DBRIS_TEAM="$TEAM" >/dev/null
set -o pipefail
xcodebuild -project build-ios/BLONDA_BRIS.xcodeproj -scheme BlondaBris_Standalone -configuration Release \
  -destination "platform=iOS,id=$UDID" -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
  DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_STYLE=Automatic build 2>&1 | grep -E "error:|warning: .*(sign|provision)|BUILD (SUCCEEDED|FAILED)" || true
APP=$(find build-ios -name "BLONDA BRIS.app" -path "*Release-iphoneos*" -not -path "*/PlugIns/*" | head -1)
[ -n "$APP" ] || APP=$(find build-ios -name "BLONDA BRIS.app" -path "*Standalone*" -not -path "*iphonesimulator*" | head -1)
[ -n "$APP" ] || stopp "Bygget blev inte klart (se felen ovan)."
xcrun devicectl device install app --device "$UDID" "$APP" | tail -2
xcrun devicectl device process launch --device "$UDID" se.blonda.bris >/dev/null 2>&1 \
  && echo "Klart: BLONDA BRIS är startad på $NAMN." \
  || echo "Appen är installerad på $NAMN men kunde inte startas än (se nedan)."
cat <<'TXT'

Om appen inte öppnas på enheten:
  - Inställningar > Integritet och säkerhet > Utvecklarläge: slå på och starta om enheten.
  - Inställningar > Allmänt > VPN och enhetshantering: tryck på ditt Apple-ID och "Lita på".
Som plugg: öppna GarageBand/Logic för iPad/AUM och välj AUv3-instrumentet BLONDA BRIS.
TXT
