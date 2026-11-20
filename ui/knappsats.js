// BLONDA BRIS – KNAPPSATSEN: en retro sifferknappsats (renderad i Blender, tools/knappsats.py) som trummaskin.
// Bilden har alla tangenter uppe; en nedtryckt tangent klipps ur bilden där alla är nere, med tangentens egen mask
// (indexbilden), så att den sjunker ner med rätt skugga. Appen ritar också texten i LCD-fönstret (mörka segment på
// grågrönt, som en gammal räknare) och NUM-lampan. Vad tangenterna gör bestämmer app.js; här ritas och träffas de.
"use strict";
const Knappsats = (() => {
  function create(stage, meta, bas, id = "knappsatsen") {
    const cv = document.createElement("canvas"); cv.id = id; cv.className = "fl";
    stage.append(cv);
    const g = cv.getContext("2d");
    const bild = {}; let laddade = 0, aktiv = false, ny = true, dpr = 1, W = 0, H = 0;
    const N = meta.tangenter.length;
    let idx = null;                 // tangentens nummer (1..N) i varje bildpunkt
    const sprite = new Array(N + 1).fill(null);   // varje tangent nedtryckt, klippt med sin mask
    const nere = new Map();         // tangent -> när den släpps (performance.now(), Infinity = hålls)
    let lcd = ["", ""], lampa = false, skak = 0;

    function ladda() {
      if (bild.uppe) return;
      for (const k of ["uppe", "nere", "index"]) {
        const im = new Image(); im.onload = () => { laddade++; if (laddade === 3) forbered(); ny = true; }; im.src = bas + meta.bilder[k]; bild[k] = im;
      }
    }
    // indexbilden till en tabell, och en bild per tangent: den nedtryckta tangenten inom sin mask
    function forbered() {
      const c = document.createElement("canvas"); c.width = meta.w; c.height = meta.h;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(bild.index, 0, 0);
      const px = x.getImageData(0, 0, meta.w, meta.h).data; idx = new Uint8Array(meta.w * meta.h);
      for (let i = 0; i < idx.length; i++) idx[i] = px[i * 4];
      meta.tangenter.forEach((namn, k) => {
        const [rx, ry, rw, rh] = meta.rutor[namn], s = document.createElement("canvas"); s.width = rw; s.height = rh;
        const sx = s.getContext("2d"); sx.drawImage(bild.nere, rx, ry, rw, rh, 0, 0, rw, rh);
        const d = sx.getImageData(0, 0, rw, rh);
        for (let yy = 0; yy < rh; yy++) for (let xx = 0; xx < rw; xx++) if (idx[(ry + yy) * meta.w + rx + xx] !== k + 1) d.data[(yy * rw + xx) * 4 + 3] = 0;
        sx.putImageData(d, 0, 0); sprite[k + 1] = s;
      });
    }

    // bildens ruta på skärmen: så stor som scenen tillåter, centrerad (bilden tonar ut i kanten, in i bakgrunden)
    function ruta() {
      const s = stage.getBoundingClientRect(), c = cv.getBoundingClientRect();
      const ar = meta.w / meta.h, w = Math.min(s.width * 1.3, s.height * 1.28 * ar), h = w / ar;
      return { x: s.left - c.left + s.width / 2 - w / 2, y: s.top - c.top + s.height / 2 - h / 2 + s.height * 0.02, w, h, sk: w / meta.w };
    }

    function rita() {
      dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      W = w; H = h;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      if (laddade < 3) return;
      const R = ruta(), t = performance.now();
      // fel kod: knappsatsen skakar till (kort, avklingande)
      const sx = skak > t ? Math.sin((skak - t) * 0.09) * 6 * ((skak - t) / 420) : 0;
      g.save(); g.translate(sx, 0);
      g.drawImage(bild.uppe, R.x, R.y, R.w, R.h);
      for (const [k] of nere) {
        const s = sprite[k]; if (!s) continue;
        const [rx, ry, rw, rh] = meta.rutor[meta.tangenter[k - 1]];
        g.drawImage(s, R.x + rx * R.sk, R.y + ry * R.sk, rw * R.sk, rh * R.sk);
      }
      // LCD: hörnen bak vänster (a), bak höger (b), fram vänster (d) ger en parallellogram (ortografisk kamera)
      const [a, b, , d] = meta.lcd, P = (p) => [R.x + p[0] * R.sk, R.y + p[1] * R.sk];
      const A = P(a), B = P(b), D = P(d), LW = 400, LH = 100;
      g.save();
      g.transform((B[0] - A[0]) / LW, (B[1] - A[1]) / LW, (D[0] - A[0]) / LH, (D[1] - A[1]) / LH, A[0], A[1]);
      g.textBaseline = "middle"; g.font = "400 36px 'BLONDA Mono', monospace";
      const radY = [32, 74];
      for (let i = 0; i < 2; i++) {
        g.fillStyle = "rgba(20,26,16,0.07)"; g.fillText("8".repeat(16), 20, radY[i]);   // de släckta segmenten
        g.fillStyle = "rgba(18,24,14,0.86)"; g.fillText((lcd[i] || "").slice(0, 16), 20, radY[i]);
      }
      g.restore();
      // NUM-lampan: röd glöd när den lyser
      if (lampa) {
        const [lx, ly] = P(meta.lampa), r = meta.lampa_r * R.sk;
        const gr = g.createRadialGradient(lx, ly, 0, lx, ly, r * 3.2);
        gr.addColorStop(0, "rgba(255,120,90,0.95)"); gr.addColorStop(0.3, "rgba(255,60,30,0.55)"); gr.addColorStop(1, "rgba(255,40,20,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(lx, ly, r * 3.2, 0, Math.PI * 2); g.fill();
      }
      g.restore();
      // tonar ut mot kanterna, in i bakgrunden (en ellips som når noll vid bildens kant: ingen kant syns)
      g.globalCompositeOperation = "destination-in";
      g.save(); g.translate(R.x + R.w / 2, R.y + R.h / 2); g.scale(R.w / 2, R.h / 2);
      const m = g.createRadialGradient(0, 0, 0.45, 0, 0, 1);
      m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = m; g.fillRect(-1, -1, 2, 2); g.restore();
      g.fillStyle = "rgba(0,0,0,0)";
      g.globalCompositeOperation = "source-over";
    }

    // bildpunkt på skärmen -> tangentens namn (eller null)
    function traff(px, py) {
      if (!aktiv || !idx) return null;
      const R = ruta(), c = cv.getBoundingClientRect();
      const ix = Math.floor((px - c.left - R.x) / R.sk), iy = Math.floor((py - c.top - R.y) / R.sk);
      if (ix < 0 || iy < 0 || ix >= meta.w || iy >= meta.h) return null;
      const k = idx[iy * meta.w + ix];
      return k > 0 ? meta.tangenter[k - 1] : null;
    }
    const nr = (namn) => meta.tangenter.indexOf(namn) + 1;

    return {
      visa(pa) { aktiv = !!pa; cv.style.display = aktiv ? "block" : "none"; if (aktiv) { ladda(); ny = true; } },
      tick() {
        if (!aktiv) return;
        const t = performance.now();
        for (const [k, till] of nere) if (till <= t) { nere.delete(k); ny = true; }
        const w = cv.clientWidth, h = cv.clientHeight;
        if (ny || skak > t || w !== W || h !== H || (window.devicePixelRatio || 1) !== dpr) { ny = false; rita(); }
      },
      traff,
      // tangenten trycks ner: ms = hur länge (Infinity = tills den släpps med slapp)
      tryck(namn, ms = Infinity) { const k = nr(namn); if (k > 0) { nere.set(k, ms === Infinity ? Infinity : performance.now() + ms); ny = true; } },
      slapp(namn) { const k = nr(namn); if (nere.has(k)) { nere.delete(k); ny = true; } },
      lcd(rad1, rad2 = "") { if (rad1 !== lcd[0] || rad2 !== lcd[1]) { lcd = [rad1, rad2]; ny = true; } },
      lampa(pa) { if (!!pa !== lampa) { lampa = !!pa; ny = true; } },
      skaka() { skak = performance.now() + 420; },
      klar() { return laddade === 3 && !!idx; },
      // tester: var en tangent ligger på skärmen, och vad som visas
      punkt(namn) {
        const R = ruta(), c = cv.getBoundingClientRect(), [rx, ry, rw, rh] = meta.rutor[namn];
        // mitt på tangentens ovansida (rutan omfattar också tangentens sida nertill)
        return [c.left + R.x + (rx + rw / 2) * R.sk, c.top + R.y + (ry + rh * 0.4) * R.sk];
      },
      lage() { return { lcd: lcd.slice(), lampa, nere: [...nere.keys()].map((k) => meta.tangenter[k - 1]) }; },
      meta,
    };
  }
  return { create };
})();
