#!/bin/sh
# Bygger webbversionen av BLONDA BRIS:  web/bygg.sh  ->  dist/web/
#   kärnan till WebAssembly med wasi-sdk (WASI_SDK pekar på den, standard /opt/wasi-sdk)
#   + gränssnittet i ui/ + worklet.js
set -e
cd "$(dirname "$0")/.."
: "${WASI_SDK:=/opt/wasi-sdk}"
OUT=dist/web
rm -rf "$OUT"; mkdir -p "$OUT"
"$WASI_SDK/bin/clang++" --target=wasm32-wasip1 -mexec-model=reactor -O3 -std=c++17 -fno-exceptions -fno-rtti \
    -Icore -IExternal/blonda-motor/include -IExternal/blonda-motor/motorer \
    -Wl,--strip-all -Wl,-z,stack-size=262144 \
    -o "$OUT/bris.wasm" web/bris_wasm.cpp
cp -r ui/* "$OUT/"
cp web/worklet.js "$OUT/"
python3 - "$OUT" <<'PY'
import sys, os
out = sys.argv[1]
print("dist/web:", ", ".join(f"{f} ({os.path.getsize(os.path.join(out, f)) // 1024} KB)" for f in sorted(os.listdir(out)) if os.path.isfile(os.path.join(out, f))))
PY
