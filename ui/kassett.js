// BLONDA BRIS – den hemliga patchen KASSETTEN: en kassettbandspelare (renderad i Blender, tools/kassett.py).
// Bilden är i lager: bak (bakom spolarna), spolarna (ritas här), fram (panelen, luckan, kassettens framsida) och
// VU-ljuset. Bandet rör sig med kassettens hastighet (4,76 cm/s), så ett fullt nav snurrar långsammare än ett tomt,
// och bandet flyttas från den vänstra spolen till den högra; vid slutet vänder det (auto-reverse). FREEZE i MOOD
// stoppar bandet mjukt (som när man trycker stopp). VU-nålarna följer vänster och höger kanal med VU-mätarens tröghet.
"use strict";
const Kassett = (() => {
  const BAND_V = 0.952;     // bandets fart i scenens enheter per sekund (1 enhet = 50 mm)
  const SIDA_S = 240;       // en sida räcker så här många sekunder (snabbare än verkligheten, så man ser spolarna ändras)
  const REF = 0.32;         // toppnivån som ger 0 VU

  function create(stage, meta, bas) {
    const cv = document.createElement("canvas"); cv.id = "kassett"; cv.className = "fl";
    stage.append(cv);
    const g = cv.getContext("2d");
    const bild = {}; let laddade = 0, aktiv = false, tFor = 0;
    for (const k of ["bak", "fram", "vu", "nav"]) {
      const im = new Image(); im.onload = () => { laddade++; skugga = null; }; im.src = bas + meta.bilder[k]; bild[k] = im;
    }
    // bandets läge
    const st = { s: 0.18, rikt: 1, fart: 1, vinkel: [0, 0], varv: 0, nal: [{ p: 0, v: 0 }, { p: 0, v: 0 }],
      band: null, nyttBand: null, byte: -1 };   // bandet som sitter i, och ett byte som pågår (tid sedan start)
    let skugga = null, ruta = null, dpr = 1;

    function mattRuta() {
      const s = stage.getBoundingClientRect(), c = cv.getBoundingClientRect();
      const sk = Math.min(s.width * 0.98 / meta.w, s.height * 0.94 / meta.h);
      const w = meta.w * sk, h = meta.h * sk;
      return { x: s.left - c.left + (s.width - w) / 2, y: s.top - c.top + (s.height - h) / 2, w, h, sk };
    }
    // bandspelarens skugga mot bakgrunden, ritad en gång per storlek
    function gorSkugga(R) {
      const c = document.createElement("canvas"); c.width = Math.round(cv.width); c.height = Math.round(cv.height);
      const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.shadowColor = "rgba(0,0,0,0.65)"; x.shadowBlur = 60 * R.sk * 2; x.shadowOffsetY = 26 * R.sk * 2;
      x.drawImage(bild.fram, R.x, R.y, R.w, R.h);
      return c;
    }
    const vuVinkel = (db) => {   // samma VU-skala som på mätarens bild (tools/kassett.py): linjär i amplitud
      const [a0, a1] = meta.vu_vinkel, v = Math.pow(10, db / 20), v0 = Math.pow(10, -20 / 20), v1 = Math.pow(10, 3 / 20);
      return a0 + (a1 - a0) * Math.max(-0.08, Math.min(1.08, (v - v0) / (v1 - v0)));
    };

    function steg(S, dt) {
      // bandbyte: spolarna stannar, luckan mörknar, kassetten byts, och bandet går igen
      if (st.byte >= 0) {
        st.byte += dt;
        if (st.nyttBand && st.byte >= 0.55) { st.band = st.nyttBand; st.nyttBand = null; }
        if (st.byte > 1.4) st.byte = -1;
      }
      // bandet: stannar mjukt vid FREEZE (och medan bandet byts), går igen när den släpps
      const mal = (S.v && S.v.mofrz > 0.5) || (st.byte >= 0 && st.byte < 0.8) ? 0 : 1;
      st.fart += (mal - st.fart) * (1 - Math.exp(-dt / (mal ? 0.25 : 0.35)));
      const [rmin, rmax] = meta.pack, A = rmax * rmax - rmin * rmin;
      const rH = Math.sqrt(rmin * rmin + st.s * A), rV = Math.sqrt(rmax * rmax - st.s * A);
      const v = BAND_V * meta.enhet * st.fart * st.rikt;   // bildpunkter per sekund
      st.vinkel[0] += v / rV * dt; st.vinkel[1] += v / rH * dt;
      st.s += st.rikt * st.fart * dt / SIDA_S;
      if (st.s >= 1) { st.s = 1; st.rikt = -1; } else if (st.s <= 0) { st.s = 0; st.rikt = 1; }
      st.varv += Math.abs(v / rH * dt) / (2 * Math.PI);
      // VU: fjäder och dämpning (stiger på ca 300 ms, liten översväng som en riktig nål)
      const niva = [S.m ? S.m.pl || 0 : 0, S.m ? S.m.pr || 0 : 0];
      for (let i = 0; i < 2; i++) {
        const db = 20 * Math.log10(Math.max(1e-4, niva[i] / REF)), malV = vuVinkel(Math.max(-24, db)), n = st.nal[i];
        const k = 90, d = 2 * 0.72 * Math.sqrt(k);
        n.v += (k * (malV - n.p) - d * n.v) * dt; n.p += n.v * dt;
      }
      return { rV, rH };
    }

    function rita(S) {
      dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); skugga = null; }
      const tnu = performance.now(), dt = Math.min(0.1, Math.max(0, (tnu - (tFor || tnu)) / 1000)); tFor = tnu;
      const { rV, rH } = steg(S, dt);
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      if (laddade < 4) return;
      const R = mattRuta();
      if (!ruta || ruta.w !== R.w || ruta.x !== R.x || ruta.y !== R.y) { ruta = R; skugga = null; }
      if (!skugga) skugga = gorSkugga(R);
      g.drawImage(skugga, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.imageSmoothingQuality = "high";
      g.drawImage(bild.bak, R.x, R.y, R.w, R.h);
      // spolarna: bandet (brunt, med svaga varv och en glans) och navet som snurrar
      const sk = R.sk;
      [rV, rH].forEach((rr, i) => {
        const [cx0, cy0] = meta.spolar[i], cx = R.x + cx0 * sk, cy = R.y + cy0 * sk, r = rr * sk, nr = meta.nav_r * sk;
        const bg = g.createRadialGradient(cx, cy, nr * 0.9, cx, cy, r);
        bg.addColorStop(0, "rgb(52,30,17)"); bg.addColorStop(0.75, "rgb(70,42,24)"); bg.addColorStop(0.97, "rgb(92,58,34)"); bg.addColorStop(1, "rgb(40,24,14)");
        g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(255,220,180,0.05)"; g.lineWidth = Math.max(0.5, sk * 1.2);
        for (let q = nr * 1.15; q < r; q += Math.max(2, sk * 9)) { g.beginPath(); g.arc(cx, cy, q, 0, Math.PI * 2); g.stroke(); }
        const gl = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);   // bandets glans
        gl.addColorStop(0, "rgba(255,230,200,0.10)"); gl.addColorStop(0.5, "rgba(255,230,200,0)"); gl.addColorStop(1, "rgba(255,230,200,0.06)");
        g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        g.save(); g.translate(cx, cy); g.rotate(st.vinkel[i]);
        g.drawImage(bild.nav, -nr * 1.05, -nr * 1.05, nr * 2.1, nr * 2.1);
        g.restore();
      });
      g.drawImage(bild.fram, R.x, R.y, R.w, R.h);
      // bandets färg på kassettens rand och namnet på etiketten (bakom luckans rökglas, därför lite dämpat)
      if (st.band && meta.rand) {
        const [ax, ay, aw, ah] = meta.rand;
        g.save(); g.globalCompositeOperation = "color"; g.fillStyle = st.band.farg; g.fillRect(R.x + ax * sk, R.y + ay * sk, aw * sk, ah * sk); g.restore();
        const [tx, ty, ts] = meta.bandtext;
        g.save(); g.globalAlpha = 0.78; g.fillStyle = "rgb(24,20,16)"; g.textAlign = "right"; g.textBaseline = "middle";
        g.font = `400 ${Math.max(6, ts * sk * 1.05)}px 'BLONDA Mono', monospace`;
        g.fillText([...st.band.etikett].join("\u2009"), R.x + tx * sk, R.y + ty * sk);
        g.restore();
      }
      // bandbytet: luckan mörknar medan kassetten byts
      if (st.byte >= 0 && meta.lucka) {
        const a = 0.7 * Math.sin(Math.min(1, st.byte / 1.1) * Math.PI), [lx, ly, lw, lh] = meta.lucka;
        g.fillStyle = `rgba(6,5,4,${a})`; g.fillRect(R.x + lx * sk, R.y + ly * sk, lw * sk, lh * sk);
      }
      // VU-ljuset (bakgrundsbelysningen) och nålarna
      g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.5 + 0.2 * Math.min(1, ((S.m && S.m.pk) || 0) / REF);
      g.drawImage(bild.vu, R.x, R.y, R.w, R.h);
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      meta.vu.forEach((m, i) => {
        const [rx, ry, rw, rh] = m.ruta, [fx, fy] = m.fast;
        g.save(); g.beginPath(); g.rect(R.x + rx * sk, R.y + ry * sk, rw * sk, rh * sk); g.clip();
        const a = st.nal[i].p * Math.PI / 180, L = m.langd * sk, px = R.x + fx * sk, py = R.y + fy * sk;
        g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 3 * sk * 2; g.shadowOffsetX = 2 * sk; g.shadowOffsetY = 2 * sk;
        g.strokeStyle = "rgb(24,20,17)"; g.lineWidth = Math.max(1, 2.6 * sk); g.lineCap = "round";
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.sin(a) * L, py - Math.cos(a) * L); g.stroke();
        g.restore();
      });
      // räkneverket: tre rullar, den sista rullar mjukt
      const [qx, qy, qw, qh] = meta.raknare, X = R.x + qx * sk, Y = R.y + qy * sk, W = qw * sk, H = qh * sk;
      g.save(); g.beginPath(); g.rect(X, Y, W, H); g.clip();
      const tal = st.varv % 1000, hel = Math.floor(tal), fr = tal - hel;
      const siffror = [Math.floor(hel / 100) % 10, Math.floor(hel / 10) % 10, hel % 10];
      const rullar = [hel % 100 === 99 ? fr : 0, hel % 10 === 9 ? fr : 0, fr];   // en rulle vrids när rullen till höger går 9 -> 0
      g.font = `400 ${Math.round(H * 0.62)}px 'BLONDA Mono', monospace`; g.textAlign = "center"; g.textBaseline = "middle";
      for (let i = 0; i < 3; i++) {
        const cw = W / 3, x = X + cw * (i + 0.5), rull = rullar[i], d0 = siffror[i];
        for (let j = 0; j < 2; j++) {
          const y = Y + H / 2 - (rull - j) * H;
          g.fillStyle = "rgba(236,226,206,0.88)"; g.fillText(String((d0 + j) % 10), x, y);
        }
        const cg = g.createLinearGradient(0, Y, 0, Y + H);   // rullens rundning
        cg.addColorStop(0, "rgba(0,0,0,0.75)"); cg.addColorStop(0.3, "rgba(0,0,0,0)"); cg.addColorStop(0.7, "rgba(0,0,0,0)"); cg.addColorStop(1, "rgba(0,0,0,0.75)");
        g.fillStyle = cg; g.fillRect(X + cw * i + 1, Y, cw - 2, H);
      }
      g.restore();
    }

    return {
      visa(pa) { aktiv = !!pa; cv.style.display = aktiv ? "block" : "none"; tFor = 0; },
      tick(S) { if (aktiv) rita(S); },
      klar() { return laddade >= 4; },
      // byta band: med en kort växling (spolarna stannar, luckan mörknar), eller direkt (när patchen väljs)
      band(b, direkt) { if (!b) return; if (direkt || !aktiv || !st.band) { st.band = b; st.nyttBand = null; st.byte = -1; } else { st.nyttBand = b; st.byte = 0; } },
      // tester: spolarnas vinklar, bandets läge, nålarnas vinklar och räkneverket
      matt() { return { vinkel: st.vinkel.slice(), s: st.s, fart: st.fart, nal: st.nal.map((n) => n.p), varv: st.varv, band: st.band ? st.band.namn : null, byte: st.byte }; },
      // träffar en punkt (skärmens koordinater) kassetten i luckan? (tryck på kassetten = nästa band)
      traff(x, y) {
        if (!ruta || !meta.kassett) return false;
        const c = cv.getBoundingClientRect(), [kx, ky, kw, kh] = meta.kassett, sk = ruta.sk;
        const X = c.left + ruta.x + kx * sk, Y = c.top + ruta.y + ky * sk;
        return x >= X && x <= X + kw * sk && y >= Y && y <= Y + kh * sk;
      },
    };
  }
  return { create };
})();
