// BLONDA BRIS – KNAPPSATSEN: en retro sifferknappsats (renderad i Blender, tools/knappsats.py) som trummaskin.
// Bilden har alla tangenter uppe; en nedtryckt tangent klipps ur bilden där alla är nere, med tangentens egen mask
// (indexbilden), så att den sjunker ner med rätt skugga. Appen ritar också texten i LCD-fönstret (mörka segment på
// grågrönt, som en gammal räknare), den gröna lampan (PLAY, blinkar vid rätt kod) och REC-lampan (röd). Vad tangenterna gör bestämmer app.js; här ritas och träffas de.
"use strict";
const Knappsats = (() => {
  function create(stage, meta, bas, id = "knappsatsen") {
    const cv = document.createElement("canvas"); cv.id = id; cv.className = "fl";
    stage.append(cv);
    const g = cv.getContext("2d");
    const bild = {}; let laddade = 0, aktiv = false, ny = true, dpr = 1, W = 0, H = 0;
    const N = meta.tangenter.length;
    let idx = null;                 // tangentens nummer (1..N) i varje bildpunkt
    const sprite = new Array(N + 1).fill(null);   // varje tangent nedtryckt: [x, y i bilden med nedtryckta, x, y, b, h i hela bilden]
    const nere = new Map();         // tangent -> när den släpps (performance.now(), Infinity = hålls)
    let lcd = ["", ""], lampa = false, rec = false, skak = 0, blink = 0;
    const lcdBild = document.createElement("canvas"); lcdBild.width = 400; lcdBild.height = 100;   // LCD-texten innan den läggs i fönstret

    function ladda() {
      if (bild.uppe) return;
      for (const k of ["uppe", "nere", "index"]) {
        const im = new Image(); im.onload = () => { laddade++; if (laddade === 3) forbered(); ny = true; }; im.src = bas + meta.bilder[k]; bild[k] = im;
      }
    }
    // indexbilden till en tabell (vilken tangent som träffas); de nedtryckta tangenterna ligger färdiga i en bild
    // (tools/knappsats_bilder.py: meta.nere = läge i den bilden och i hela bilden, med en kant runt om)
    function forbered() {
      const c = document.createElement("canvas"); c.width = meta.w; c.height = meta.h;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(bild.index, 0, 0);
      const px = x.getImageData(0, 0, meta.w, meta.h).data; idx = new Uint8Array(meta.w * meta.h);
      for (let i = 0; i < idx.length; i++) idx[i] = px[i * 4];
      meta.tangenter.forEach((namn, k) => { sprite[k + 1] = meta.nere[namn]; });
    }

    // bildens ruta på skärmen: så stor som scenen tillåter, centrerad (bilden tonar ut i kanten, in i bakgrunden)
    function ruta() {
      // (aldrig större än duken: bilden tonar ut mot sina egna kanter, så den får inte klippas av dukens kant)
      const s = stage.getBoundingClientRect(), c = cv.getBoundingClientRect();
      const ar = meta.w / meta.h, w = Math.min(s.width * 1.3, s.height * 1.2 * ar, c.width, c.height * ar), h = w / ar;
      const x = Math.max(0, Math.min(c.width - w, s.left - c.left + s.width / 2 - w / 2));
      const y = Math.max(0, Math.min(c.height - h, s.top - c.top + s.height / 2 - h / 2 - s.height * 0.01));
      return { x, y, w, h, sk: w / meta.w };
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
        const [ax, ay, x0, y0, w0, h0] = s;
        g.drawImage(bild.nere, ax, ay, w0, h0, R.x + x0 * R.sk, R.y + y0 * R.sk, w0 * R.sk, h0 * R.sk);
      }
      // LCD: texten ritas rakt i en egen bild och läggs sedan i fönstret, vars hörn (bak vänster a, bak höger b,
      // fram höger c, fram vänster d) bildar en trapets (perspektiv: bakkanten är kortare). Bilden läggs i tunna
      // vågräta remsor, var och en mellan fönstrets vänstra och högra kant på sin höjd.
      const [a, b, c2, d] = meta.lcd, P = (p) => [R.x + p[0] * R.sk, R.y + p[1] * R.sk];
      const A = P(a), B = P(b), C = P(c2), D = P(d), LW = lcdBild.width, LH = lcdBild.height;
      const lg = lcdBild.getContext("2d"); lg.clearRect(0, 0, LW, LH);
      lg.textBaseline = "middle"; lg.font = "400 36px 'BLONDA Mono', monospace";
      const radY = [32, 74];
      for (let i = 0; i < 2; i++) {
        lg.fillStyle = "rgba(20,26,16,0.045)"; lg.fillText("8".repeat(16), 20, radY[i]);   // de släckta segmenten
        lg.fillStyle = "rgba(18,24,14,0.86)"; lg.fillText((lcd[i] || "").slice(0, 16), 20, radY[i]);
      }
      const REM = 25, mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      for (let k = 0; k < REM; k++) {
        const t0 = k / REM, t1 = (k + 1) / REM;
        const V0 = mix(A, D, t0), H0 = mix(B, C, t0), V1 = mix(A, D, t1);
        g.save();
        // remsans överkant går från V0 till H0, nedåt mot V1 (en liten överlappning döljer skarvarna)
        g.transform((H0[0] - V0[0]) / LW, (H0[1] - V0[1]) / LW, (V1[0] - V0[0]) / (LH / REM), (V1[1] - V0[1]) / (LH / REM), V0[0], V0[1]);
        g.drawImage(lcdBild, 0, t0 * LH, LW, LH / REM + 0.6, 0, 0, LW, LH / REM + 0.6);
        g.restore();
      }
      // lamporna: NUM lyser grönt (kodläget), REC rött (inspelning)
      const glod = (pt, f) => {
        const [lx, ly] = P(pt), r = meta.lampa_r * R.sk;
        const gr = g.createRadialGradient(lx, ly, 0, lx, ly, r * 3.2);
        gr.addColorStop(0, `rgba(${f[0]},0.95)`); gr.addColorStop(0.3, `rgba(${f[1]},0.55)`); gr.addColorStop(1, `rgba(${f[1]},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(lx, ly, r * 3.2, 0, Math.PI * 2); g.fill();
      };
      // (blinkar: fyra korta blink efter rätt kod)
      const bl = blink > t && Math.floor((blink - t) / 140) % 2 === 0;
      if (lampa || bl) glod(meta.lampa, ["170,255,150", "60,220,70"]);
      if (rec && meta.rec) glod(meta.rec, ["255,120,90", "255,50,25"]);
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
        if (ny || skak > t || blink > t - 200 || w !== W || h !== H || (window.devicePixelRatio || 1) !== dpr) { ny = false; rita(); }
      },
      traff,
      // tangenten trycks ner: ms = hur länge (Infinity = tills den släpps med slapp)
      tryck(namn, ms = Infinity) { const k = nr(namn); if (k > 0) { nere.set(k, ms === Infinity ? Infinity : performance.now() + ms); ny = true; } },
      slapp(namn) { const k = nr(namn); if (nere.has(k)) { nere.delete(k); ny = true; } },
      lcd(rad1, rad2 = "") { if (rad1 !== lcd[0] || rad2 !== lcd[1]) { lcd = [rad1, rad2]; ny = true; } },
      lampa(pa) { if (!!pa !== lampa) { lampa = !!pa; ny = true; } },
      rec(pa) { if (!!pa !== rec) { rec = !!pa; ny = true; } },
      blinka() { blink = performance.now() + 1400; ny = true; },
      skaka() { skak = performance.now() + 420; },
      klar() { return laddade === 3 && !!idx; },
      // tester: var en tangent ligger på skärmen, och vad som visas
      punkt(namn) {
        const R = ruta(), c = cv.getBoundingClientRect(), [rx, ry, rw, rh] = meta.rutor[namn];
        // mitt på tangentens ovansida (rutan omfattar också tangentens sida nertill)
        return [c.left + R.x + (rx + rw / 2) * R.sk, c.top + R.y + (ry + rh * 0.4) * R.sk];
      },
      lage() { return { lcd: lcd.slice(), lampa, rec, blink: blink > performance.now(), nere: [...nere.keys()].map((k) => meta.tangenter[k - 1]) }; },
      meta,
    };
  }
  return { create };
})();
