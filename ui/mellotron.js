// BLONDA BRIS – den hemliga patchen MELLOTRON: in i bandramen. Locket är öppet och man ser de 35 banden (ett per
// tangent, G2–F5 som på en riktig mellotron) hänga i en rad under valsen. När en tangent spelas trycks bandet mot
// capstan av en filtdyna och rullar nedåt: tidsmärkena på bandet glider förbi, och bandets ljusa slut kryper uppåt
// tills bandet tar slut. Släpps tangenten drar fjädern tillbaka bandet till början. Överst står bandets namn på en
// emaljskylt. Capstanaxeln snurrar hela tiden, med motorns svaj.
// Tangenterna (även från en klaviatur) och bandet kommer från appens tillstånd (S.m.keys, S.v.mlband, S.v.mlfart).
// Ett lager, halv upplösning.
"use strict";
const Mellotron = (() => {
  const LAG = 43, ANTAL = 35;   // G2 .. F5
  // band: [{namn, rot, sek}] ur data.js (motorn MELLO)
  function create(parent, band) {
    const cv = document.createElement("canvas");
    cv.className = "himmel"; cv.id = "mellotron";
    parent.prepend(cv);
    const g = cv.getContext("2d");
    let aktiv = false, w = 0, h = 0, dpr = 1, ritad = 0, axel = 0, senT = 0, senS = null;
    // varje bands läge (0 = början, 1 = slut) och om det spelar; startTid för tonen som spelar
    const lage = new Float32Array(ANTAL), spelar = new Uint8Array(ANTAL), ljus = new Float32Array(ANTAL);
    const BAND = [222, 150, 88], DYNA = [60, 48, 40];
    const rgb = (c, a, k = 1) => `rgba(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)},${a})`;
    function storlek() {
      dpr = Math.min(2, window.devicePixelRatio || 1) * 0.5;
      const nw = Math.max(2, Math.round(innerWidth * dpr)), nh = Math.max(2, Math.round(innerHeight * dpr));
      if (nw === w && nh === h) return;
      w = cv.width = nw; h = cv.height = nh;
    }
    // tangent -> band (utanför G2–F5 flyttas tonen en oktav i taget in i ramen)
    const plats = (n) => { while (n < LAG) n += 12; while (n >= LAG + ANTAL) n -= 12; return n - LAG; };
    function rita(S) {
      storlek();
      const nu = performance.now() / 1000, dt = Math.min(0.1, senT ? nu - senT : 0); senT = nu;
      const v = (S && S.v) || {}, b = band[Math.max(0, Math.min(band.length - 1, Math.round(v.mlband || 0)))] || { namn: "", rot: 60, sek: 6 };
      // tangenterna som hålls
      const halls = new Uint8Array(ANTAL), hallsTon = new Int16Array(ANTAL).fill(-1);
      const k = S && S.m && S.m.keys;
      if (k) for (let wd = 0; wd < 4; wd++) { const x = k[wd] >>> 0; if (x) for (let bit = 0; bit < 32; bit++) if ((x >>> bit) & 1) { const n = wd * 32 + bit, p = plats(n); halls[p] = 1; hallsTon[p] = n; } }
      for (let i = 0; i < ANTAL; i++) {
        if (halls[i]) {
          if (!spelar[i]) { spelar[i] = 1; lage[i] = 0; }
          const fart = Math.pow(2, (hallsTon[i] - b.rot + (v.mlfart || 0)) / 12);
          lage[i] = Math.min(1, lage[i] + (dt * fart) / Math.max(0.3, b.sek));
        } else {
          spelar[i] = 0;
          lage[i] = Math.max(0, lage[i] - dt * 3.5);   // fjädern drar tillbaka bandet
        }
        const mal = spelar[i] && lage[i] < 1 ? 1 : 0;
        ljus[i] += (mal - ljus[i]) * Math.min(1, dt * (mal ? 14 : 4));
      }
      const wow = (v.mlwow || 0) * Math.sin(nu * 2 * Math.PI * 0.53);
      axel += dt * (6 + wow * 0.6);
      // bakgrunden: skåpets insida, varm och mörk
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#120d09"); bg.addColorStop(0.5, "#0d0907"); bg.addColorStop(1, "#070504");
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      // ramen: banden fyller bredden, från valsen till nedre kanten av scenens område
      const mx = w * 0.06, bx0 = mx, bx1 = w - mx, steg = (bx1 - bx0) / ANTAL;
      // stående (telefonen): ramen slutar ovanför ljudets namn; liggande: under panelerna, ovanför tangenterna
      const stand = h > w * 1.2;
      const yTopp = h * (stand ? 0.205 : 0.2), yAxel = h * (stand ? 0.5 : 0.63), yBotten = h * (stand ? 0.585 : 0.72);
      const bw = Math.max(2, steg * 0.62);
      // valsen överst och listen under den
      const vals = g.createLinearGradient(0, yTopp - h * 0.025, 0, yTopp + h * 0.012);
      vals.addColorStop(0, "#1c1915"); vals.addColorStop(0.45, "#5e5951"); vals.addColorStop(0.6, "#33302a"); vals.addColorStop(1, "#14120f");
      // (metallen är halvgenomskinlig: panelernas text ligger ovanpå och ska gå att läsa)
      g.globalAlpha = 0.5; g.fillStyle = vals; g.fillRect(bx0 - steg * 0.6, yTopp - h * 0.018, bx1 - bx0 + steg * 1.2, h * 0.026); g.globalAlpha = 1;
      // banden
      const spar = h * 0.022;   // avståndet mellan tidsmärkena
      for (let i = 0; i < ANTAL; i++) {
        const x = bx0 + steg * (i + 0.5) - bw / 2, l = ljus[i];
        const ton = (i * 37) % 7 / 7;   // banden har lite olika färg (olika gamla)
        // vilande band är mörka (de ska inte ta över panelerna), det som spelar lyser i lampljuset
        const bas = [BAND[0] * (0.2 + 0.03 * ton), BAND[1] * (0.2 + 0.025 * ton), BAND[2] * (0.2 + 0.02 * ton)];
        const gr = g.createLinearGradient(x, 0, x + bw, 0);
        gr.addColorStop(0, rgb(bas, 1, 0.6 + 1.4 * l)); gr.addColorStop(0.35, rgb(bas, 1, 1.0 + 2.2 * l)); gr.addColorStop(1, rgb(bas, 1, 0.55 + 1.3 * l));
        g.fillStyle = gr; g.fillRect(x, yTopp, bw, yBotten - yTopp);
        // tidsmärkena glider nedåt när bandet rullar
        const forsk = (lage[i] * b.sek * 8 * spar) % spar;
        g.fillStyle = rgb([255, 225, 180], 0.04 + 0.2 * l);
        for (let y = yTopp + forsk; y < yBotten; y += spar) g.fillRect(x, y, bw, Math.max(1, dpr));
        // bandets slut: den ljusa ledaren kommer ned från valsen medan bandet tar slut (allt band ovanför är förbrukat)
        if (lage[i] > 0.001) {
          const yl = yTopp + (yAxel - yTopp) * lage[i];
          g.fillStyle = rgb([235, 222, 200], 0.16 + 0.3 * l);
          g.fillRect(x, yTopp, bw, yl - yTopp);
        }
        // glöden runt ett band som spelar
        if (l > 0.02) {
          g.fillStyle = rgb(BAND, 0.07 * l);
          g.fillRect(x - bw * 0.8, yTopp, bw * 2.6, yBotten - yTopp);
        }
      }
      // capstanaxeln: blank metall som snurrar (randerna rör sig)
      const ah = Math.max(3, h * 0.011);
      g.globalAlpha = 0.5;
      const ax = g.createLinearGradient(0, yAxel - ah, 0, yAxel + ah);
      ax.addColorStop(0, "#24221e"); ax.addColorStop(0.4, "#7d786f"); ax.addColorStop(0.55, "#4a4741"); ax.addColorStop(1, "#171512");
      g.fillStyle = ax; g.fillRect(bx0 - steg * 0.6, yAxel - ah, bx1 - bx0 + steg * 1.2, ah * 2);
      g.fillStyle = "rgba(0,0,0,0.18)";
      const rs = Math.max(4, steg * 0.5), off = (axel * rs * 3) % (rs * 2);
      for (let x = bx0 - steg * 0.6 - rs * 2 + off; x < bx1 + steg * 0.6; x += rs * 2) g.fillRect(x, yAxel - ah, rs * 0.5, ah * 2);
      g.globalAlpha = 1;
      // filtdynorna: en per band, trycks in mot axeln när tangenten spelar
      for (let i = 0; i < ANTAL; i++) {
        const x = bx0 + steg * (i + 0.5), l = ljus[i], dy = ah * (2.6 - 1.4 * l);
        g.fillStyle = rgb(DYNA, 0.45 + 0.55 * l, 0.55 + 0.9 * l);
        g.fillRect(x - bw * 0.7, yAxel + dy, bw * 1.4, ah * 1.4);
      }
      // emaljskylten med bandets namn
      const stand2 = h > w * 1.2, fs = Math.max(8, Math.round(Math.min(w, h) * (stand2 ? 0.032 : 0.028)));
      g.font = `${fs}px "BLONDA Mono", monospace`; g.textAlign = "center"; g.textBaseline = "middle";
      const text = `TAPE ${Math.round(v.mlband || 0) + 1}  ·  ${b.namn}`;
      const tw = g.measureText(text).width + fs * 2.4, th = fs * 2, ty = yTopp - h * (stand2 ? 0.05 : 0.075);
      g.fillStyle = "rgba(226,214,190,0.78)"; g.beginPath(); g.roundRect(w / 2 - tw / 2, ty - th / 2, tw, th, th * 0.18); g.fill();
      g.strokeStyle = "rgba(40,30,20,0.6)"; g.lineWidth = Math.max(1, dpr); g.beginPath(); g.roundRect(w / 2 - tw / 2 + fs * 0.3, ty - th / 2 + fs * 0.3, tw - fs * 0.6, th - fs * 0.6, th * 0.12); g.stroke();
      g.fillStyle = "#2a1f16"; g.fillText(text, w / 2, ty + fs * 0.05);
      g.textAlign = "start"; g.textBaseline = "alphabetic";
      ritad++;
      return b;
    }
    return {
      visa(pa) { aktiv = !!pa; cv.style.display = aktiv ? "block" : "none"; if (aktiv) { w = 0; senT = 0; } },
      tick(S) { senS = S; if (aktiv) rita(S); },
      // tester: hur många band som rullar, hur långt det längsta har kommit (0..1) och bandets namn på skylten
      matt() {
        const b = rita(senS);
        let n = 0, mx = 0; for (let i = 0; i < ANTAL; i++) if (spelar[i]) { n++; mx = Math.max(mx, lage[i]); }
        return { rullar: n, langst: mx, band: b.namn, ritad };
      },
      klar() { return true; },
    };
  }
  return { create };
})();
