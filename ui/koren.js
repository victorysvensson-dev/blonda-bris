// BLONDA BRIS – den hemliga patchen KÖREN: en kör i ett mörkt kyrkorum, tre rader sångare i vita kåpor med var sitt
// ljus i händerna (som ett luciatåg). Varje ton man spelar får tre sångare att sjunga (som i motorn KÖR, där varje
// ton sjungs av tre röster): deras ljus flammar upp och lyser upp ansiktena, munnarna öppnar sig i vokalens form
// (U rund och liten, A hög och öppen, I bred och smal) och de gungar lite i takt med sången. Låga toner sjungs till
// vänster, höga till höger. Övriga ljus fladdrar svagt. Högt upp syns kyrkfönstrens valv i månljus.
// Tangenterna (även från en klaviatur) och vokalen kommer från appens tillstånd (S.m.keys, S.v.krvok).
// Ett lager, halv upplösning.
"use strict";
const Koren = (() => {
  const KOL = 9, RAD = 3;
  function create(parent) {
    const cv = document.createElement("canvas");
    cv.className = "himmel"; cv.id = "koren";
    parent.prepend(cv);
    const g = cv.getContext("2d");
    let aktiv = false, w = 0, h = 0, dpr = 1, ritad = 0, senT = 0, senS = null, tid = 0;
    const sjung = new Float32Array(KOL * RAD);   // hur mycket varje sångare sjunger (0..1), mjukt
    const fas = new Float32Array(KOL * RAD).map((_, i) => (i * 2.399) % (Math.PI * 2));
    // varje sångare är lite olika: längd, huvudets storlek, håret (kort eller långt) och kåpans ton
    const lang = new Float32Array(KOL * RAD).map((_, i) => 0.92 + 0.16 * ((i * 0.618034 * 7) % 1));
    const har = new Uint8Array(KOL * RAD).map((_, i) => ((i * 5 + 3) % 7) < 3 ? 1 : 0);
    const ton = new Float32Array(KOL * RAD).map((_, i) => (i * 0.381966 * 11) % 1);
    function storlek() {
      dpr = Math.min(2, window.devicePixelRatio || 1) * 0.5;
      const nw = Math.max(2, Math.round(innerWidth * dpr)), nh = Math.max(2, Math.round(innerHeight * dpr));
      if (nw === w && nh === h) return;
      w = cv.width = nw; h = cv.height = nh;
    }
    // ton -> kolumn (låga till vänster)
    const kolumn = (n) => Math.round(Math.max(0, Math.min(1, (n - 40) / 44)) * (KOL - 1));
    function ellips(x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2); }
    function rita(S) {
      storlek();
      const nu = performance.now() / 1000, dt = Math.min(0.1, senT ? nu - senT : 0); senT = nu; tid += dt;
      const v = (S && S.v) || {}, vok = v.krvok == null ? 0.5 : v.krvok;
      // vilka kolumner som sjunger
      const mal = new Float32Array(KOL);
      const k = S && S.m && S.m.keys;
      if (k) for (let wd = 0; wd < 4; wd++) { const x = k[wd] >>> 0; if (x) for (let b = 0; b < 32; b++) if ((x >>> b) & 1) mal[kolumn(wd * 32 + b)] = 1; }
      for (let i = 0; i < KOL * RAD; i++) {
        const m = mal[i % KOL];
        sjung[i] += (m - sjung[i]) * Math.min(1, dt * (m > sjung[i] ? 7 : 1.6));
      }
      const stand = h > w * 1.2;
      // rummet: mörkt, lite kallt upptill (månljus genom fönstren), varmare nedtill där ljusen är
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#070a12"); bg.addColorStop(0.55, "#0a0a0e"); bg.addColorStop(1, "#0d0906");
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      // kyrkfönstren: höga spetsbågar med svagt månljus
      const nf = stand ? 3 : 5, fb = w / (nf * 2.4), fh = h * (stand ? 0.2 : 0.3), fy = h * 0.06;
      for (let f = 0; f < nf; f++) {
        const fx = w * (f + 0.5) / nf - fb / 2;
        const gl = g.createLinearGradient(0, fy, 0, fy + fh);
        gl.addColorStop(0, "rgba(120,140,190,0.10)"); gl.addColorStop(1, "rgba(80,95,140,0.02)");
        g.fillStyle = gl; g.beginPath();
        g.moveTo(fx, fy + fh); g.lineTo(fx, fy + fb * 0.6);
        g.quadraticCurveTo(fx, fy, fx + fb / 2, fy - fb * 0.15); g.quadraticCurveTo(fx + fb, fy, fx + fb, fy + fb * 0.6);
        g.lineTo(fx + fb, fy + fh); g.closePath(); g.fill();
        g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(fx + fb / 2 - Math.max(1, fb * 0.03), fy, Math.max(1, fb * 0.06), fh);
      }
      // sångarna: bakre raden först (mindre och högre upp)
      const yBas = h * (stand ? 0.6 : 0.72), sk0 = Math.min(w / (KOL + 1), h * (stand ? 0.075 : 0.11));
      const munForm = { rx: 0.35 + 0.65 * Math.max(0, (vok - 0.5) * 2), ry: 0.4 + 0.6 * Math.max(0, 1 - Math.abs(vok - 0.5) * 2) };
      let summa = 0, sjunger = 0;
      for (let r = RAD - 1; r >= 0; r--) {
        const sk = sk0 * (1 - r * 0.16), yfot = yBas - r * sk0 * 1.05, ljusRad = 1 - r * 0.25;
        for (let c = 0; c < KOL; c++) {
          const i = r * KOL + c, s = sjung[i];
          summa += s; if (s > 0.5) sjunger++;
          const gung = Math.sin(tid * 2.1 + fas[i]) * sk * 0.04 * s;
          const x = w * (c + 0.5 + (r % 2 ? 0.5 : 0) - (r === 2 ? 0.25 : 0)) / (KOL + (r % 2 ? 0.5 : 0)) + gung;
          if (x < -sk || x > w + sk) continue;
          const fl = 0.75 + 0.25 * Math.sin(tid * 9 + fas[i] * 3) * Math.sin(tid * 5.3 + fas[i]);   // ljuset fladdrar
          const lj = (0.12 + 0.88 * s) * fl * ljusRad;
          const bw = sk * 0.62, bh = sk * 1.35 * lang[i], hy = yfot - bh - sk * 0.2, tn = ton[i] * 14;
          // kåpan: vit, upplyst underifrån av ljuset
          const kg = g.createLinearGradient(0, hy, 0, yfot);
          kg.addColorStop(0, `rgba(${Math.round(34 + tn + 160 * lj)},${Math.round(33 + tn + 140 * lj)},${Math.round(40 + tn + 105 * lj)},1)`);
          kg.addColorStop(1, `rgba(${Math.round(16 + 50 * lj)},${Math.round(15 + 42 * lj)},${Math.round(20 + 30 * lj)},1)`);
          g.fillStyle = kg; g.beginPath();
          g.moveTo(x - bw * 0.42, hy + sk * 0.25); g.quadraticCurveTo(x, hy + sk * 0.05, x + bw * 0.42, hy + sk * 0.25);
          g.lineTo(x + bw * 0.62, yfot); g.lineTo(x - bw * 0.62, yfot); g.closePath(); g.fill();
          // huvudet, och ansiktet som lyser upp när sångaren sjunger
          const hr = sk * (0.18 + 0.04 * ton[i]), hyy = hy + sk * 0.02;
          const ag = g.createRadialGradient(x, hyy + hr * 0.5, 0, x, hyy, hr * 1.2);
          ag.addColorStop(0, `rgba(${Math.round(60 + 170 * lj)},${Math.round(42 + 120 * lj)},${Math.round(30 + 75 * lj)},1)`);
          ag.addColorStop(1, `rgba(${Math.round(20 + 50 * lj)},${Math.round(15 + 35 * lj)},${Math.round(12 + 22 * lj)},1)`);
          g.fillStyle = ag; ellips(x, hyy, hr * 0.85, hr); g.fill();
          // håret: mörkt ovanpå
          g.fillStyle = "rgba(14,10,8,0.9)"; g.beginPath(); g.ellipse(x, hyy - hr * 0.35, hr * 0.9, hr * 0.68, 0, Math.PI, Math.PI * 2); g.fill();
          if (har[i]) { g.fillRect(x - hr * 0.95, hyy - hr * 0.35, hr * 0.28, hr * 1.5); g.fillRect(x + hr * 0.67, hyy - hr * 0.35, hr * 0.28, hr * 1.5); }
          // munnen: i vokalens form när sångaren sjunger
          if (s > 0.05) { g.fillStyle = `rgba(20,8,6,${0.85 * s})`; ellips(x, hyy + hr * 0.45, hr * 0.22 * munForm.rx * s, hr * 0.2 * munForm.ry * s); g.fill(); }
          // ljuset i händerna
          const lx = x + sk * 0.05, ly = hy + bh * 0.42;
          g.fillStyle = "rgba(235,228,210,0.9)"; g.fillRect(lx - sk * 0.025, ly, sk * 0.05, sk * 0.32);
          const glow = g.createRadialGradient(lx, ly - sk * 0.06, 0, lx, ly - sk * 0.06, sk * (0.5 + 1.1 * s));
          glow.addColorStop(0, `rgba(255,190,110,${0.34 * lj})`); glow.addColorStop(1, "rgba(255,170,90,0)");
          g.fillStyle = glow; g.beginPath(); g.arc(lx, ly - sk * 0.06, sk * (0.5 + 1.1 * s), 0, Math.PI * 2); g.fill();
          const fh2 = sk * (0.09 + 0.08 * s) * (0.85 + 0.3 * fl);
          g.fillStyle = `rgba(255,${Math.round(200 + 40 * s)},${Math.round(120 + 70 * s)},${0.6 + 0.4 * lj})`;
          g.beginPath(); g.moveTo(lx, ly - fh2 * 1.6); g.quadraticCurveTo(lx + sk * 0.04, ly - fh2 * 0.4, lx, ly);
          g.quadraticCurveTo(lx - sk * 0.04, ly - fh2 * 0.4, lx, ly - fh2 * 1.6); g.fill();
        }
      }
      ritad++;
      return { sjunger, ljus: summa / (KOL * RAD) };
    }
    return {
      visa(pa) { aktiv = !!pa; cv.style.display = aktiv ? "block" : "none"; if (aktiv) { w = 0; senT = 0; } },
      tick(S) { senS = S; if (aktiv) rita(S); },
      // tester: hur många sångare som sjunger och hur mycket kören sjunger i snitt (0..1)
      matt() { const r = rita(senS); return { sjunger: r.sjunger, ljus: r.ljus, ritad }; },
      klar() { return true; },
    };
  }
  return { create };
})();
