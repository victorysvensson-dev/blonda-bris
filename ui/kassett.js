// BLONDA BRIS – den hemliga patchen KASSETTEN: en kassettbandspelare (renderad i Blender, tools/kassett.py).
// Bilden är i lager, bakifrån: bandspelarens insida (syns när fronten fälls ut), VHS-bandet (lika stort som hela
// bandspelaren, bakom fronten), och fronten: luckans insida (fack) med kassetten (bak, spolarna som ritas här, fram),
// panelen, de nedtryckta knapparna (ur ett eget pass), luckans rökglas, VU-ljuset, nålarna, räkneverket, rattarnas
// streck och REC-lampan.
// Allt som rör sig följer bandspelaren i ljudkärnan (mätarna S.m.b*): bandets plats (spolarna fylls och töms),
// farten (spolarna snurrar, fortare när navet är tomt), läget (vilka knappar som är nere) och nivån på bandet (VU).
// Knapparna (REC REW PLAY FF STOP PAUSE) och rattarna (REC LEVEL, OUTPUT) går att trycka och vrida: scenen säger var
// man träffar (traff), appen skickar knapparna till kärnan. Bandbyte: luckan öppnas, bandet åker ut nedåt och det
// nya in underifrån. Till och från VHS fälls hela fronten ut och VHS-bandet åker in bakom den.
"use strict";
const Kassett = (() => {
  const BAND_V = 0.952;     // bandets fart i scenens enheter per sekund vid PLAY (1 enhet = 50 mm)
  const REF = 0.5;          // nivån på bandet som ger 0 VU
  const RAKNA = 3;          // räkneverket: steg per sekund band
  // bandbytets tider (sekunder). Luckans ljud: ett tryck och sedan en smäll när luckan slår upp (ca 1 s in).
  const LUCKA = { oppna0: 0.5, oppna: 1.0, ut: 1.4, in: 1.95, stang0: 2.0, stang: 2.3 };
  const FRONT = { oppna0: 0.5, oppna: 1.05, ut: 1.5, in: 2.15, stang0: 2.2, stang: 2.65, vinkel: 80 };
  const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const fas = (t, a, b) => ease((t - a) / (b - a));

  function create(stage, meta, bas, ljud) {
    const cv = document.createElement("canvas"); cv.id = "kassett"; cv.className = "fl";
    stage.append(cv);
    const g = cv.getContext("2d");
    const bild = {}; let laddade = 0, aktiv = false, tFor = 0;
    const LAGER = ["bak", "kassett_bak", "kassett_fram", "vhs_bak", "vhs_fram", "inre", "panel", "nere", "lucka", "vu", "nav"];
    for (const k of LAGER) {
      const im = new Image(); im.onload = () => { laddade++; skugga = null; }; im.src = bas + meta.bilder[k]; bild[k] = im;
    }
    const st = {
      vinkel: [0, 0], nal: [{ p: 0, v: 0 }, { p: 0, v: 0 }], fart: 0, pos: 0, sek: 0,
      band: null, modell: "kassett",            // bandet som sitter i (namn, etikett, färg) och om det är kassett eller VHS
      nytt: null, byte: -1, typ: "lucka", fran: "kassett", till: "kassett", ljudIn: false,   // ett bandbyte som pågår
      tryck: null,                              // en knapp som just trycktes (syns nere en kort stund, även STOP)
    };
    let skugga = null, ruta = null, dpr = 1, front = null;

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
    const spolarFor = (m) => (m === "vhs" ? meta.vhs : meta);   // spolarnas plats och storlek i det som sitter i

    // bandbytets läge: luckans vinkel 0..1, kassettens förskjutning nedåt 0..1 (ute), frontens vinkel 0..1 (utfälld)
    // och VHS-bandets förskjutning nedåt 0..1 (ute)
    function bytesLage() {
      const t = st.byte, L = { lucka: 0, ut: 0, front: 0, vhsUt: st.modell === "vhs" ? 0 : 1 };
      if (t < 0) return L;
      if (st.typ === "lucka") {
        L.lucka = t < LUCKA.in ? fas(t, LUCKA.oppna0, LUCKA.oppna) : 1 - fas(t, LUCKA.stang0, LUCKA.stang);
        L.ut = t < LUCKA.ut ? fas(t, LUCKA.oppna, LUCKA.ut) : 1 - fas(t, LUCKA.ut, LUCKA.in);
      } else {
        L.front = t < FRONT.stang0 ? fas(t, FRONT.oppna0, FRONT.oppna) : 1 - fas(t, FRONT.stang0, FRONT.stang);
        if (t < FRONT.ut) L.vhsUt = st.fran === "vhs" ? fas(t, FRONT.oppna, FRONT.ut) : 1;
        else L.vhsUt = st.till === "vhs" ? 1 - fas(t, FRONT.ut, FRONT.in) : 1;
      }
      return L;
    }

    function steg(S, dt) {
      if (st.byte >= 0) {
        st.byte += dt;
        const T = st.typ === "lucka" ? LUCKA : FRONT;
        if (st.nytt && st.byte >= T.ut) { st.band = st.nytt; st.modell = st.till; st.nytt = null; }
        if (!st.ljudIn && st.byte >= T.ut) { st.ljudIn = true; ljud && ljud(5, 1, st.till === "vhs" ? 1 : 1.12); }   // bandet sätts i
        if (st.byte > T.stang) st.byte = -1;
      }
      if (st.tryck) { st.tryck.t += dt; if (st.tryck.t > 0.2) st.tryck = null; }
      // bandspelaren i kärnan: plats, fart och nivå
      const m = S.m || {};
      st.fart = st.byte >= 0 ? 0 : (m.bf || 0); st.pos = m.bp || 0; st.sek = m.bs || 0;
      const sp = spolarFor(st.modell), [rmin, rmax] = sp.pack, A = rmax * rmax - rmin * rmin;
      const s = Math.max(0, Math.min(1, st.pos));
      const rH = Math.sqrt(rmin * rmin + s * A), rV = Math.sqrt(rmax * rmax - s * A);   // vänster = matarspolen
      const v = BAND_V * meta.enhet * (st.modell === "vhs" ? 0.5 : 1) * st.fart;     // bildpunkter per sekund
      st.vinkel[0] += v / rV * dt; st.vinkel[1] += v / rH * dt;
      // VU: nivån på bandet (det som spelas in, och det som spelas upp), fjäder och dämpning som en riktig nål
      const upp = (m.bl & 7) === 1 ? 1 : 0;
      const niva = [Math.max(m.bvl || 0, upp * (m.pl || 0)), Math.max(m.bvr || 0, upp * (m.pr || 0))];
      for (let i = 0; i < 2; i++) {
        const db = 20 * Math.log10(Math.max(1e-4, niva[i] / REF)), malV = vuVinkel(Math.max(-24, db)), n = st.nal[i];
        const k = 90, d = 2 * 0.72 * Math.sqrt(k);
        n.v += (k * (malV - n.p) - d * n.v) * dt; n.p += n.v * dt;
      }
      return { rV, rH };
    }

    function ritaSpole(x, cx, cy, r, nr, vinkel) {   // bandet (brunt, med svaga varv och en glans) och navet som snurrar
      const bg = x.createRadialGradient(cx, cy, nr * 0.9, cx, cy, r);
      bg.addColorStop(0, "rgb(52,30,17)"); bg.addColorStop(0.75, "rgb(70,42,24)"); bg.addColorStop(0.97, "rgb(92,58,34)"); bg.addColorStop(1, "rgb(40,24,14)");
      x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
      x.strokeStyle = "rgba(255,220,180,0.05)"; x.lineWidth = Math.max(0.5, nr * 0.03);
      for (let q = nr * 1.15; q < r; q += Math.max(2, nr * 0.22)) { x.beginPath(); x.arc(cx, cy, q, 0, Math.PI * 2); x.stroke(); }
      const gl = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      gl.addColorStop(0, "rgba(255,230,200,0.10)"); gl.addColorStop(0.5, "rgba(255,230,200,0)"); gl.addColorStop(1, "rgba(255,230,200,0.06)");
      x.fillStyle = gl; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
      x.save(); x.translate(cx, cy); x.rotate(vinkel);
      x.drawImage(bild.nav, -nr * 1.05, -nr * 1.05, nr * 2.1, nr * 2.1);
      x.restore();
    }

    // fronten med allt som sitter i den (kassetten i luckan), i bildens koordinater på ritytan x
    function ritaFront(x, R, S, B, rV, rH) {
      const sk = R.sk, X = (v) => R.x + v * sk, Y = (v) => R.y + v * sk;
      const [lx, ly, lw, lh] = meta.lucka;
      if (st.modell === "kassett") {
        x.drawImage(bild.bak, R.x, R.y, R.w, R.h);
        // kassetten i luckan: åker ut nedåt och in underifrån vid bandbyte (klipps vid luckans öppning)
        x.save(); x.beginPath(); x.rect(X(lx), Y(ly), lw * sk, lh * sk); x.clip(); x.translate(0, B.ut * lh * 1.02 * sk);
        x.drawImage(bild.kassett_bak, R.x, R.y, R.w, R.h);
        [rV, rH].forEach((rr, i) => { const [cx0, cy0] = meta.spolar[i]; ritaSpole(x, X(cx0), Y(cy0), rr * sk, meta.nav_r * sk, st.vinkel[i]); });
        x.drawImage(bild.kassett_fram, R.x, R.y, R.w, R.h);
        if (st.band && meta.rand) {   // bandets färg på kassettens rand och namnet på etiketten
          const [ax, ay, aw, ah] = meta.rand;
          x.save(); x.globalCompositeOperation = "color"; x.fillStyle = st.band.farg; x.fillRect(X(ax), Y(ay), aw * sk, ah * sk); x.restore();
          const [tx, ty, ts] = meta.bandtext;
          x.fillStyle = "rgba(24,20,16,0.82)"; x.textAlign = "right"; x.textBaseline = "middle";
          x.font = `400 ${Math.max(6, ts * sk * 1.05)}px 'BLONDA Mono', monospace`;
          x.fillText([...st.band.etikett].join(" "), X(tx), Y(ty));
        }
        x.restore();
      }
      x.drawImage(bild.panel, R.x, R.y, R.w, R.h);
      // de nedtryckta knapparna (klipps ur passet där alla är nere). REC och PLAY är båda nere när man spelar in.
      const lage = (S.m && S.m.bl) || 0, l7 = lage & 7, tk = st.tryck && st.tryck.namn;
      const nere = { rec: l7 === 2, play: l7 === 1 || l7 === 2, rew: l7 === 3, ff: l7 === 4, stop: tk === "stop", paus: (lage & 8) !== 0 };
      if (tk && tk !== "stop" && tk !== "paus") nere[tk] = true;
      // En nedtryckt knapp sitter längre in i panelen: rakt framifrån syns det som att den hamnar i skugga upptill
      // (panelens kant skymmer ljuset), blir lite mörkare och får en smal ljus kant nertill.
      for (const k of meta.knappar) if (nere[k.namn]) {
        const [kx, ky, kw, kh] = k.ruta, f = bild.nere.naturalWidth / meta.w, px = X(kx), py = Y(ky), w = kw * sk, h = kh * sk;
        x.drawImage(bild.nere, kx * f, ky * f, kw * f, kh * f, px, py, w, h);
        const m = 0.09 * h;   // knappens yta inom rutan (rutan har en marginal runt knappen)
        const sg = x.createLinearGradient(0, py + m, 0, py + h * 0.62);
        sg.addColorStop(0, "rgba(0,0,0,0.5)"); sg.addColorStop(1, "rgba(0,0,0,0.08)");
        x.fillStyle = sg; x.fillRect(px + m, py + m, w - 2 * m, h - 2 * m);
        x.fillStyle = "rgba(255,240,220,0.18)"; x.fillRect(px + m, py + h - m - Math.max(1, 1.2 * sk), w - 2 * m, Math.max(1, 1.2 * sk));
      }
      // luckans rökglas: fälls ut kring nederkanten när luckan öppnas (blir kortare och får en ljus kant upptill)
      if (B.lucka <= 0) x.drawImage(bild.lucka, R.x, R.y, R.w, R.h);
      else {
        const f = bild.lucka.naturalWidth / meta.w, c = Math.cos(B.lucka * 0.75), hh = lh * sk * c;
        x.drawImage(bild.lucka, lx * f, ly * f, lw * f, lh * f, X(lx), Y(ly) + lh * sk - hh, lw * sk, hh);
        x.fillStyle = `rgba(255,236,210,${0.18 * B.lucka})`; x.fillRect(X(lx), Y(ly) + lh * sk - hh, lw * sk, Math.max(1, 3 * sk));
      }
      // VU-ljuset (bakgrundsbelysningen) och nålarna
      x.globalCompositeOperation = "lighter"; x.globalAlpha = 0.5 + 0.2 * Math.min(1, ((S.m && S.m.pk) || 0) / 0.32);
      x.drawImage(bild.vu, R.x, R.y, R.w, R.h);
      x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
      meta.vu.forEach((m, i) => {
        const [rx, ry, rw, rh] = m.ruta, [fx, fy] = m.fast;
        x.save(); x.beginPath(); x.rect(X(rx), Y(ry), rw * sk, rh * sk); x.clip();
        const a = st.nal[i].p * Math.PI / 180, L = m.langd * sk, px = X(fx), py = Y(fy);
        x.shadowColor = "rgba(0,0,0,0.35)"; x.shadowBlur = 3 * sk * 2; x.shadowOffsetX = 2 * sk; x.shadowOffsetY = 2 * sk;
        x.strokeStyle = "rgb(24,20,17)"; x.lineWidth = Math.max(1, 2.6 * sk); x.lineCap = "round";
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.sin(a) * L, py - Math.cos(a) * L); x.stroke();
        x.restore();
      });
      // rattarnas streck (REC LEVEL = hur hårt bandet spelas in på, OUTPUT = bandets utnivå), -135..+135 grader
      const vr = [S.v ? S.v.tarec : 0.6, S.v ? S.v.taoutv : 0.75];
      meta.rattar.forEach((rt, i) => {
        const [cx, cy] = rt.mitt, r = rt.r * sk, a = (-135 + 270 * Math.max(0, Math.min(1, vr[i] ?? 0.5))) * Math.PI / 180;
        x.strokeStyle = "rgb(18,16,14)"; x.lineWidth = Math.max(1.2, r * 0.07); x.lineCap = "round";
        x.beginPath(); x.moveTo(X(cx) + Math.sin(a) * r * 0.42, Y(cy) - Math.cos(a) * r * 0.42); x.lineTo(X(cx) + Math.sin(a) * r * 0.88, Y(cy) - Math.cos(a) * r * 0.88); x.stroke();
      });
      // REC-lampan lyser när bandet spelar in (blinkar i paus)
      if (l7 === 2 && meta.led && (!(lage & 8) || (performance.now() % 900) < 450)) {
        const [ex, ey, er] = meta.led, rr = er * sk * 5, gl = x.createRadialGradient(X(ex), Y(ey), 0, X(ex), Y(ey), rr);
        gl.addColorStop(0, "rgba(255,90,60,0.95)"); gl.addColorStop(0.25, "rgba(255,60,30,0.45)"); gl.addColorStop(1, "rgba(255,40,20,0)");
        x.globalCompositeOperation = "lighter"; x.fillStyle = gl; x.fillRect(X(ex) - rr, Y(ey) - rr, rr * 2, rr * 2); x.globalCompositeOperation = "source-over";
      }
      // räkneverket: tre rullar, en rulle vrids när rullen till höger går 9 -> 0
      const [qx, qy, qw, qh] = meta.raknare, QX = X(qx), QY = Y(qy), QW = qw * sk, QH = qh * sk;
      x.save(); x.beginPath(); x.rect(QX, QY, QW, QH); x.clip();
      const tal = Math.max(0, st.sek * RAKNA), hel = Math.floor(tal), fr = tal - hel;
      const siffror = [Math.floor(hel / 100) % 10, Math.floor(hel / 10) % 10, hel % 10];
      const rullar = [hel % 100 === 99 ? fr : 0, hel % 10 === 9 ? fr : 0, fr];
      x.font = `400 ${Math.round(QH * 0.62)}px 'BLONDA Mono', monospace`; x.textAlign = "center"; x.textBaseline = "middle";
      for (let i = 0; i < 3; i++) {
        const cw = QW / 3, px = QX + cw * (i + 0.5);
        for (let j = 0; j < 2; j++) { x.fillStyle = "rgba(236,226,206,0.88)"; x.fillText(String((siffror[i] + j) % 10), px, QY + QH / 2 - (rullar[i] - j) * QH); }
        const cg = x.createLinearGradient(0, QY, 0, QY + QH);
        cg.addColorStop(0, "rgba(0,0,0,0.75)"); cg.addColorStop(0.3, "rgba(0,0,0,0)"); cg.addColorStop(0.7, "rgba(0,0,0,0)"); cg.addColorStop(1, "rgba(0,0,0,0.75)");
        x.fillStyle = cg; x.fillRect(QX + cw * i + 1, QY, cw - 2, QH);
      }
      x.restore();
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
      const B = bytesLage(), [fx, fy, fw, fh] = meta.front;
      // insidan (när fronten är utfälld) och VHS-bandet bakom fronten (åker in och ut underifrån)
      if (B.front > 0) g.drawImage(bild.inre, R.x, R.y, R.w, R.h);
      if (B.vhsUt < 1) {
        const vs = meta.vhs;
        g.save(); g.beginPath(); g.rect(X(fx), Y(fy), fw * sk, fh * sk); g.clip(); g.translate(0, B.vhsUt * fh * 1.02 * sk);
        g.drawImage(bild.vhs_bak, R.x, R.y, R.w, R.h);
        const [rmin, rmax] = vs.pack, A = rmax * rmax - rmin * rmin, s = Math.max(0, Math.min(1, st.pos));
        const r2 = [Math.sqrt(rmax * rmax - s * A), Math.sqrt(rmin * rmin + s * A)];
        r2.forEach((rr, i) => { const [cx0, cy0] = vs.spolar[i]; ritaSpole(g, X(cx0), Y(cy0), rr * sk, vs.nav_r * sk, st.vinkel[i]); });
        g.drawImage(bild.vhs_fram, R.x, R.y, R.w, R.h);
        g.restore();
      }
      if (B.front <= 0) { ritaFront(g, R, S, B, rV, rH); return; }
      // fronten fälls ut kring nederkanten: ritas för sig, blir mörkare (vänds bort från ljuset) och kortare
      if (!front || front.width !== cv.width || front.height !== cv.height) { front = document.createElement("canvas"); front.width = cv.width; front.height = cv.height; }
      const fg = front.getContext("2d");
      fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, front.width, front.height); fg.setTransform(dpr, 0, 0, dpr, 0, 0); fg.imageSmoothingQuality = "high";
      ritaFront(fg, R, S, B, rV, rH);
      const vin = B.front * FRONT.vinkel * Math.PI / 180, c = Math.cos(vin);
      fg.globalCompositeOperation = "source-atop"; fg.fillStyle = `rgba(0,0,0,${0.55 * Math.sin(vin)})`; fg.fillRect(X(fx), Y(fy), fw * sk, fh * sk);
      fg.globalCompositeOperation = "source-over";
      const gang = Y(fy + fh);   // gångjärnet: frontens nederkant
      g.setTransform(1, 0, 0, c, 0, gang * dpr * (1 - c));   // y -> gångjärnet + (y - gångjärnet) * cos(vinkeln)
      g.drawImage(front, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = `rgba(255,238,214,${0.35 * Math.sin(vin)})`;   // frontens överkant fångar ljuset
      g.fillRect(X(fx), gang - fh * sk * c, fw * sk, Math.max(1, 2.5 * sk));
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
      // byta band: med luckan (kassett till kassett) eller hela fronten (till och från VHS), eller direkt
      band(b, direkt) {
        if (!b) return;
        const ny = b.namn === "VHS" ? "vhs" : "kassett";
        if (direkt || !aktiv || !st.band) { st.band = b; st.modell = ny; st.nytt = null; st.byte = -1; return; }
        if (st.byte >= 0 && st.nytt) { st.nytt = b; st.till = ny; return; }   // byter igen innan det nya satts i
        if (ny === "vhs" && st.modell === "vhs" && st.byte < 0) { st.band = b; return; }
        st.fran = st.modell; st.till = ny; st.nytt = b; st.byte = 0; st.ljudIn = false;
        st.typ = st.fran === "vhs" || ny === "vhs" ? "front" : "lucka";
        ljud && ljud(4, 1, 1);   // luckan (eller fronten) öppnas
      },
      // en knapp trycktes (syns nere direkt, innan kärnans läge kommer tillbaka; STOP fjädrar tillbaka)
      tryck(namn) { st.tryck = { namn, t: 0 }; },
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
      matt() { const B = bytesLage(); return { vinkel: st.vinkel.slice(), pos: st.pos, fart: st.fart, sek: st.sek, nal: st.nal.map((n) => n.p), band: st.band ? st.band.namn : null,
        modell: st.modell, byte: st.byte, typ: st.typ, lucka: B.lucka, ut: B.ut, front: B.front, vhsUt: B.vhsUt }; },
    };
  }
  return { create };
})();
