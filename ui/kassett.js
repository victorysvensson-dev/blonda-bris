// BLONDA BRIS – den hemliga patchen KASSETTEN: en kassettbandspelare (renderad i Blender, tools/kassett.py).
// Bilden är i lager, bakifrån: luckans insida (fack), bandet i luckan (kassetten eller VHS:en: bak, spolarna som
// ritas här, fram), panelen, de nedtryckta knapparna (ur ett eget pass), luckans rökglas, VU-ljuset, nålarna,
// räkneverket och rattarnas streck.
// Bandet rör sig med kassettens hastighet (4,76 cm/s), så ett fullt nav snurrar långsammare än ett tomt, och bandet
// flyttas från den vänstra spolen till den högra och vänder vid slutet. Knapparna (REC REW PLAY FF STOP PAUSE) och
// rattarna (REC LEVEL, OUTPUT) går att trycka och vrida: scenen säger var man träffar (traff), appen bestämmer vad
// det gör med ljudet och berättar läget (transport). Vid bandbyte öppnas luckan, bandet åker ut nedåt, det nya
// åker in underifrån (en VHS för bandet VHS) och luckan stängs.
"use strict";
const Kassett = (() => {
  const BAND_V = 0.952;     // bandets fart i scenens enheter per sekund (1 enhet = 50 mm)
  const SIDA_S = 240;       // en sida räcker så här många sekunder (snabbare än verkligheten, så man ser spolarna ändras)
  const REF = 0.32;         // toppnivån som ger 0 VU
  const BYTE = { oppna: 0.35, ut: 0.85, in: 1.45, stang: 1.85 };   // bandbytets tider (sekunder)
  const ease = (t) => t * t * (3 - 2 * t);

  function create(stage, meta, bas) {
    const cv = document.createElement("canvas"); cv.id = "kassett"; cv.className = "fl";
    stage.append(cv);
    const g = cv.getContext("2d");
    const bild = {}; let laddade = 0, aktiv = false, tFor = 0;
    const LAGER = ["bak", "kassett_bak", "kassett_fram", "vhs_bak", "vhs_fram", "panel", "nere", "lucka", "vu", "nav"];
    for (const k of LAGER) {
      const im = new Image(); im.onload = () => { laddade++; skugga = null; }; im.src = bas + meta.bilder[k]; bild[k] = im;
    }
    const st = {
      s: 0.18, rikt: 1, fart: 1, vinkel: [0, 0], varv: 0, nal: [{ p: 0, v: 0 }, { p: 0, v: 0 }],
      band: null, modell: "kassett",            // bandet som sitter i (namn, etikett, färg) och om det är kassett eller VHS
      nytt: null, byte: -1,                     // ett bandbyte som pågår: det nya bandet och tiden sedan start
      tr: { lage: "play", rec: false, paus: false, loop: false }, stopp: -1,   // knapparna (från appen); STOP fjädrar tillbaka
    };
    let skugga = null, ruta = null, dpr = 1;

    function mattRuta() {
      const s = stage.getBoundingClientRect(), c = cv.getBoundingClientRect();
      const sk = Math.min(s.width * 0.98 / meta.w, s.height * 0.94 / meta.h);
      const w = meta.w * sk, h = meta.h * sk;
      return { x: s.left - c.left + (s.width - w) / 2, y: s.top - c.top + (s.height - h) / 2, w, h, sk };
    }
    function gorSkugga(R) {   // bandspelarens skugga mot bakgrunden, ritad en gång per storlek
      const c = document.createElement("canvas"); c.width = Math.round(cv.width); c.height = Math.round(cv.height);
      const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.shadowColor = "rgba(0,0,0,0.65)"; x.shadowBlur = 60 * R.sk * 2; x.shadowOffsetY = 26 * R.sk * 2;
      x.drawImage(bild.panel, R.x, R.y, R.w, R.h);
      return c;
    }
    const vuVinkel = (db) => {   // samma VU-skala som på mätarens bild (tools/kassett.py): linjär i amplitud
      const [a0, a1] = meta.vu_vinkel, v = Math.pow(10, db / 20), v0 = Math.pow(10, -20 / 20), v1 = Math.pow(10, 3 / 20);
      return a0 + (a1 - a0) * Math.max(-0.08, Math.min(1.08, (v - v0) / (v1 - v0)));
    };
    const spolar = () => (st.modell === "vhs" ? meta.vhs : meta);   // spolarnas plats och storlek i det som sitter i

    // bandbytets läge: luckans vinkel (0..1 = stängd..öppen) och bandets förskjutning nedåt (0..1 = på plats..ute)
    function bytesLage() {
      const t = st.byte; if (t < 0) return { lucka: 0, ut: 0 };
      const lucka = t < BYTE.oppna ? ease(t / BYTE.oppna) : t < BYTE.in ? 1 : t < BYTE.stang ? 1 - ease((t - BYTE.in) / (BYTE.stang - BYTE.in)) : 0;
      const ut = t < BYTE.oppna ? 0 : t < BYTE.ut ? ease((t - BYTE.oppna) / (BYTE.ut - BYTE.oppna)) : t < BYTE.in ? 1 - ease((t - BYTE.ut) / (BYTE.in - BYTE.ut)) : 0;
      return { lucka, ut };
    }

    function steg(S, dt) {
      if (st.byte >= 0) {
        st.byte += dt;
        if (st.nytt && st.byte >= BYTE.ut) { st.band = st.nytt; st.modell = st.nytt.namn === "VHS" ? "vhs" : "kassett"; st.nytt = null; }
        if (st.byte > BYTE.stang) st.byte = -1;
      }
      if (st.stopp >= 0) { st.stopp += dt; if (st.stopp > 0.22) st.stopp = -1; }
      // spolarnas fart: PLAY 1, STOP stilla, REW/FF snabbt (med loopen: dess fart), PAUSE och FREEZE stilla, och
      // stilla medan bandet byts
      const T = st.tr;
      let mal = T.lage === "stop" ? 0 : T.lage === "rew" ? (T.loop ? -1 : -3.2) : T.lage === "ff" ? (T.loop ? 2 : 3.2) : 1;
      if (T.paus || (S.v && S.v.mofrz > 0.5) || st.byte >= 0) mal = 0;
      st.fart += (mal - st.fart) * (1 - Math.exp(-dt / (Math.abs(mal) > Math.abs(st.fart) ? 0.25 : 0.35)));
      const sp = spolar(), [rmin, rmax] = sp.pack, A = rmax * rmax - rmin * rmin;
      const rH = Math.sqrt(rmin * rmin + st.s * A), rV = Math.sqrt(rmax * rmax - st.s * A);
      const v = BAND_V * meta.enhet * st.fart * st.rikt;   // bildpunkter per sekund
      st.vinkel[0] += v / rV * dt; st.vinkel[1] += v / rH * dt;
      st.s += st.rikt * st.fart * dt / SIDA_S;
      if (st.s >= 1) { st.s = 1; st.rikt = -1; } else if (st.s <= 0) { st.s = 0; st.rikt = 1; }
      st.varv = (st.varv + (v / rH * dt) / (2 * Math.PI) * st.rikt + 1000) % 1000;
      // VU: fjäder och dämpning (stiger på ca 300 ms, liten översväng som en riktig nål)
      const niva = [S.m ? S.m.pl || 0 : 0, S.m ? S.m.pr || 0 : 0];
      for (let i = 0; i < 2; i++) {
        const db = 20 * Math.log10(Math.max(1e-4, niva[i] / REF)), malV = vuVinkel(Math.max(-24, db)), n = st.nal[i];
        const k = 90, d = 2 * 0.72 * Math.sqrt(k);
        n.v += (k * (malV - n.p) - d * n.v) * dt; n.p += n.v * dt;
      }
      return { rV, rH };
    }

    function ritaSpole(cx, cy, r, nr, vinkel) {   // bandet (brunt, med svaga varv och en glans) och navet som snurrar
      const bg = g.createRadialGradient(cx, cy, nr * 0.9, cx, cy, r);
      bg.addColorStop(0, "rgb(52,30,17)"); bg.addColorStop(0.75, "rgb(70,42,24)"); bg.addColorStop(0.97, "rgb(92,58,34)"); bg.addColorStop(1, "rgb(40,24,14)");
      g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(255,220,180,0.05)"; g.lineWidth = Math.max(0.5, nr * 0.03);
      for (let q = nr * 1.15; q < r; q += Math.max(2, nr * 0.22)) { g.beginPath(); g.arc(cx, cy, q, 0, Math.PI * 2); g.stroke(); }
      const gl = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      gl.addColorStop(0, "rgba(255,230,200,0.10)"); gl.addColorStop(0.5, "rgba(255,230,200,0)"); gl.addColorStop(1, "rgba(255,230,200,0.06)");
      g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(cx, cy); g.rotate(vinkel);
      g.drawImage(bild.nav, -nr * 1.05, -nr * 1.05, nr * 2.1, nr * 2.1);
      g.restore();
    }

    function rita(S) {
      dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); skugga = null; }
      const tnu = performance.now(), dt = Math.min(0.1, Math.max(0, (tnu - (tFor || tnu)) / 1000)); tFor = tnu;
      const { rV, rH } = steg(S, dt);
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      if (laddade < LAGER.length) return;
      const R = mattRuta();
      if (!ruta || ruta.w !== R.w || ruta.x !== R.x || ruta.y !== R.y) { ruta = R; skugga = null; }
      if (!skugga) skugga = gorSkugga(R);
      g.drawImage(skugga, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.imageSmoothingQuality = "high";
      const sk = R.sk, X = (v) => R.x + v * sk, Y = (v) => R.y + v * sk;
      g.drawImage(bild.bak, R.x, R.y, R.w, R.h);
      // bandet i luckan: åker ut nedåt och in underifrån vid bandbyte (klipps vid luckans öppning)
      const B = bytesLage(), [lx, ly, lw, lh] = meta.lucka;
      const dy = B.ut * lh * 1.02 * sk;
      g.save(); g.beginPath(); g.rect(X(lx), Y(ly), lw * sk, lh * sk); g.clip(); g.translate(0, dy);
      const vhs = st.modell === "vhs", sp = spolar();
      g.drawImage(vhs ? bild.vhs_bak : bild.kassett_bak, R.x, R.y, R.w, R.h);
      [rV, rH].forEach((rr, i) => { const [cx0, cy0] = sp.spolar[i]; ritaSpole(X(cx0), Y(cy0), rr * sk, sp.nav_r * sk, st.vinkel[i]); });
      g.drawImage(vhs ? bild.vhs_fram : bild.kassett_fram, R.x, R.y, R.w, R.h);
      if (!vhs && st.band && meta.rand) {   // bandets färg på kassettens rand och namnet på etiketten
        const [ax, ay, aw, ah] = meta.rand;
        g.save(); g.globalCompositeOperation = "color"; g.fillStyle = st.band.farg; g.fillRect(X(ax), Y(ay), aw * sk, ah * sk); g.restore();
        const [tx, ty, ts] = meta.bandtext;
        g.fillStyle = "rgba(24,20,16,0.82)"; g.textAlign = "right"; g.textBaseline = "middle";
        g.font = `400 ${Math.max(6, ts * sk * 1.05)}px 'BLONDA Mono', monospace`;
        g.fillText([...st.band.etikett].join(" "), X(tx), Y(ty));
      }
      g.restore();
      g.drawImage(bild.panel, R.x, R.y, R.w, R.h);
      // de nedtryckta knapparna (klipps ur passet där alla är nere)
      const T = st.tr, nere = { rec: T.rec, play: T.lage === "play", rew: T.lage === "rew", ff: T.lage === "ff", stop: st.stopp >= 0, paus: T.paus };
      // En nedtryckt knapp sitter längre in i panelen: rakt framifrån syns det som att den hamnar i skugga upptill
      // (panelens kant skymmer ljuset), blir lite mörkare och får en smal ljus kant nertill.
      for (const k of meta.knappar) if (nere[k.namn]) {
        const [kx, ky, kw, kh] = k.ruta, f = bild.nere.naturalWidth / meta.w, x = X(kx), y = Y(ky), w = kw * sk, h = kh * sk;
        g.drawImage(bild.nere, kx * f, ky * f, kw * f, kh * f, x, y, w, h);
        const m = 0.09 * h;   // knappens yta inom rutan (rutan har en marginal runt knappen)
        const sg = g.createLinearGradient(0, y + m, 0, y + h * 0.62);
        sg.addColorStop(0, "rgba(0,0,0,0.5)"); sg.addColorStop(1, "rgba(0,0,0,0.08)");
        g.fillStyle = sg; g.fillRect(x + m, y + m, w - 2 * m, h - 2 * m);
        g.fillStyle = "rgba(255,240,220,0.18)"; g.fillRect(x + m, y + h - m - Math.max(1, 1.2 * sk), w - 2 * m, Math.max(1, 1.2 * sk));
      }
      // luckans rökglas: fälls ut kring nederkanten när luckan öppnas (blir kortare och får en ljus kant upptill)
      if (B.lucka <= 0) g.drawImage(bild.lucka, R.x, R.y, R.w, R.h);
      else {
        const f = bild.lucka.naturalWidth / meta.w, c = Math.cos(B.lucka * 0.75), hh = lh * sk * c;
        g.drawImage(bild.lucka, lx * f, ly * f, lw * f, lh * f, X(lx), Y(ly) + lh * sk - hh, lw * sk, hh);
        g.fillStyle = `rgba(255,236,210,${0.18 * B.lucka})`; g.fillRect(X(lx), Y(ly) + lh * sk - hh, lw * sk, Math.max(1, 3 * sk));
      }
      // VU-ljuset (bakgrundsbelysningen) och nålarna
      g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.5 + 0.2 * Math.min(1, ((S.m && S.m.pk) || 0) / REF);
      g.drawImage(bild.vu, R.x, R.y, R.w, R.h);
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      meta.vu.forEach((m, i) => {
        const [rx, ry, rw, rh] = m.ruta, [fx, fy] = m.fast;
        g.save(); g.beginPath(); g.rect(X(rx), Y(ry), rw * sk, rh * sk); g.clip();
        const a = st.nal[i].p * Math.PI / 180, L = m.langd * sk, px = X(fx), py = Y(fy);
        g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 3 * sk * 2; g.shadowOffsetX = 2 * sk; g.shadowOffsetY = 2 * sk;
        g.strokeStyle = "rgb(24,20,17)"; g.lineWidth = Math.max(1, 2.6 * sk); g.lineCap = "round";
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.sin(a) * L, py - Math.cos(a) * L); g.stroke();
        g.restore();
      });
      // rattarnas streck (REC LEVEL = bandets mättnad, OUTPUT = bandets utnivå), -135..+135 grader
      const vr = [S.v ? S.v.tasat : 0.5, S.v ? S.v.taoutv : 0.75];
      meta.rattar.forEach((rt, i) => {
        const [cx, cy] = rt.mitt, r = rt.r * sk, a = (-135 + 270 * Math.max(0, Math.min(1, vr[i] ?? 0.5))) * Math.PI / 180;
        g.strokeStyle = "rgb(18,16,14)"; g.lineWidth = Math.max(1.2, r * 0.07); g.lineCap = "round";
        g.beginPath(); g.moveTo(X(cx) + Math.sin(a) * r * 0.42, Y(cy) - Math.cos(a) * r * 0.42); g.lineTo(X(cx) + Math.sin(a) * r * 0.88, Y(cy) - Math.cos(a) * r * 0.88); g.stroke();
      });
      // REC-lampan lyser när loopen spelar in (REC är nere)
      if (T.rec && meta.led) {
        const [ex, ey, er] = meta.led, rr = er * sk * 5, gl = g.createRadialGradient(X(ex), Y(ey), 0, X(ex), Y(ey), rr);
        gl.addColorStop(0, "rgba(255,90,60,0.95)"); gl.addColorStop(0.25, "rgba(255,60,30,0.45)"); gl.addColorStop(1, "rgba(255,40,20,0)");
        g.globalCompositeOperation = "lighter"; g.fillStyle = gl; g.fillRect(X(ex) - rr, Y(ey) - rr, rr * 2, rr * 2); g.globalCompositeOperation = "source-over";
      }
      // räkneverket: tre rullar, en rulle vrids när rullen till höger går 9 -> 0
      const [qx, qy, qw, qh] = meta.raknare, QX = X(qx), QY = Y(qy), QW = qw * sk, QH = qh * sk;
      g.save(); g.beginPath(); g.rect(QX, QY, QW, QH); g.clip();
      const tal = st.varv, hel = Math.floor(tal), fr = tal - hel;
      const siffror = [Math.floor(hel / 100) % 10, Math.floor(hel / 10) % 10, hel % 10];
      const rullar = [hel % 100 === 99 ? fr : 0, hel % 10 === 9 ? fr : 0, fr];
      g.font = `400 ${Math.round(QH * 0.62)}px 'BLONDA Mono', monospace`; g.textAlign = "center"; g.textBaseline = "middle";
      for (let i = 0; i < 3; i++) {
        const cw = QW / 3, x = QX + cw * (i + 0.5);
        for (let j = 0; j < 2; j++) { g.fillStyle = "rgba(236,226,206,0.88)"; g.fillText(String((siffror[i] + j) % 10), x, QY + QH / 2 - (rullar[i] - j) * QH); }
        const cg = g.createLinearGradient(0, QY, 0, QY + QH);
        cg.addColorStop(0, "rgba(0,0,0,0.75)"); cg.addColorStop(0.3, "rgba(0,0,0,0)"); cg.addColorStop(0.7, "rgba(0,0,0,0)"); cg.addColorStop(1, "rgba(0,0,0,0.75)");
        g.fillStyle = cg; g.fillRect(QX + cw * i + 1, QY, cw - 2, QH);
      }
      g.restore();
    }

    // en punkt på skärmen -> bildens koordinater (null om scenen inte är ritad)
    function bildPunkt(x, y) {
      if (!ruta) return null;
      const c = cv.getBoundingClientRect();
      return [(x - c.left - ruta.x) / ruta.sk, (y - c.top - ruta.y) / ruta.sk];
    }
    const inne = (p, [x, y, w, h], m = 0) => p[0] >= x - m && p[0] <= x + w + m && p[1] >= y - m && p[1] <= y + h + m;

    return {
      visa(pa) { aktiv = !!pa; cv.style.display = aktiv ? "block" : "none"; tFor = 0; },
      tick(S) { if (aktiv) rita(S); },
      klar() { return laddade >= LAGER.length; },
      // byta band: med luckan och bandet som åker ut och in, eller direkt (när patchen väljs)
      band(b, direkt) {
        if (!b) return;
        if (direkt || !aktiv || !st.band) { st.band = b; st.modell = b.namn === "VHS" ? "vhs" : "kassett"; st.nytt = null; st.byte = -1; }
        else { st.nytt = b; st.byte = 0; }
      },
      // knapparnas läge från appen: lage = play | stop | rew | ff, rec, paus, loop (loopen spelar)
      transport(t) { if (t.lage === "stop") st.stopp = 0; st.tr = { ...st.tr, ...t }; },
      // vad som finns under en punkt på skärmen: { typ: "knapp", namn } | { typ: "ratt", i } | { typ: "kassett" } | null
      traff(x, y) {
        const p = bildPunkt(x, y); if (!p) return null;
        for (const k of meta.knappar) if (inne(p, k.ruta)) return { typ: "knapp", namn: k.namn };
        for (let i = 0; i < meta.rattar.length; i++) { const r = meta.rattar[i]; if (Math.hypot(p[0] - r.mitt[0], p[1] - r.mitt[1]) <= r.r * 1.35) return { typ: "ratt", i }; }
        if (inne(p, meta.lucka)) return { typ: "kassett" };
        return null;
      },
      // tester: var saker ligger på skärmen (knappar, rattar, luckan) och scenens läge
      plats(typ, i) {
        if (!ruta) return null;
        const c = cv.getBoundingClientRect(), P = (x, y) => [c.left + ruta.x + x * ruta.sk, c.top + ruta.y + y * ruta.sk];
        if (typ === "knapp") { const k = meta.knappar.find((q) => q.namn === i).ruta; return P(k[0] + k[2] / 2, k[1] + k[3] / 2); }
        if (typ === "ratt") return P(...meta.rattar[i].mitt);
        if (typ === "lucka") { const l = meta.lucka; return P(l[0] + l[2] / 2, l[1] + l[3] / 2); }
        return null;
      },
      skala() { return ruta ? ruta.sk : 1; },
      matt() { const B = bytesLage(); return { vinkel: st.vinkel.slice(), s: st.s, fart: st.fart, nal: st.nal.map((n) => n.p), varv: st.varv, band: st.band ? st.band.namn : null,
        modell: st.modell, byte: st.byte, lucka: B.lucka, ut: B.ut, tr: { ...st.tr } }; },
    };
  }
  return { create };
})();
