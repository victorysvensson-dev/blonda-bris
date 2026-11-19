// BLONDA BRIS – den hemliga patchen ANALOG: ett gammalt oscilloskop som visar ljudet från motorn ONE (BRIS möter
// Moog). Hela skärmen är bildröret: ett rutnät med tio gånger åtta rutor och en stråle i bärnstensfärgad fosfor som
// ritar vågformen precis som den låter, triggad på stigande nollgenomgång så att den står still. Strålen efterlyser
// (gamla bilder bleknar bort), och en ton gör strålen ljusare en stund. Över strålen står inställningarna, tonen och
// frekvensen.
// Två lager: rutnätet (ritas om bara när storleken ändras) och strålen. Halv upplösning.
"use strict";
const Analog = (() => {
  const NOTNAMN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  // hamta: () => den senaste ljudbilden (mono, äldst först), som appen får från ljudmotorn
  function create(parent, hamta) {
    const rut = document.createElement("canvas"), cv = document.createElement("canvas");
    rut.className = cv.className = "himmel"; rut.id = "analog"; cv.id = "analog_strale";
    parent.prepend(cv); parent.prepend(rut);
    const g = rut.getContext("2d"), c = cv.getContext("2d");
    let aktiv = false, w = 0, h = 0, dpr = 1, ljus = 0, senast = null, amp = 0, ritad = 0, styrkaNu = 0;
    const FOSFOR = [255, 168, 72];
    const rgba = (a, k = 1) => `rgba(${Math.round(FOSFOR[0] * k)},${Math.round(FOSFOR[1] * k)},${Math.round(FOSFOR[2] * k)},${a})`;
    // bildrörets ruta: nästan hela skärmen, med rundade hörn
    const ruta = () => { const m = Math.round(Math.min(w, h) * 0.04); return { x: m, y: m, w: w - 2 * m, h: h - 2 * m }; };
    function storlek() {
      dpr = Math.min(2, window.devicePixelRatio || 1) * 0.5;
      const nw = Math.max(2, Math.round(innerWidth * dpr)), nh = Math.max(2, Math.round(innerHeight * dpr));
      if (nw === w && nh === h) return false;
      w = rut.width = cv.width = nw; h = rut.height = cv.height = nh;
      rutnat(); return true;
    }
    function rutnat() {
      const r = ruta();
      g.clearRect(0, 0, w, h);
      // glaset: svagt ljusare i mitten, mörkare mot kanterna (bildrörets välvning)
      const gl = g.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.max(w, h) * 0.7);
      gl.addColorStop(0, "rgba(40,26,14,1)"); gl.addColorStop(0.6, "rgba(16,11,7,1)"); gl.addColorStop(1, "rgba(5,4,3,1)");
      g.fillStyle = gl; g.fillRect(0, 0, w, h);
      // rutnätet: tio gånger åtta rutor, finare streck på mittlinjerna
      g.save(); g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, Math.min(w, h) * 0.03); g.clip();
      g.strokeStyle = rgba(0.13); g.lineWidth = Math.max(1, dpr);
      g.beginPath();
      for (let i = 0; i <= 10; i++) { const x = r.x + (r.w * i) / 10; g.moveTo(x, r.y); g.lineTo(x, r.y + r.h); }
      for (let j = 0; j <= 8; j++) { const y = r.y + (r.h * j) / 8; g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); }
      g.stroke();
      g.strokeStyle = rgba(0.2); g.beginPath();
      const mx = r.x + r.w / 2, my = r.y + r.h / 2, t = Math.min(w, h) * 0.006;
      for (let i = 0; i <= 50; i++) { const x = r.x + (r.w * i) / 50; g.moveTo(x, my - t); g.lineTo(x, my + t); }
      for (let j = 0; j <= 40; j++) { const y = r.y + (r.h * j) / 40; g.moveTo(mx - t, y); g.lineTo(mx + t, y); }
      g.stroke();
      // svepande rader, som i ett bildrör
      g.fillStyle = "rgba(0,0,0,0.12)";
      for (let y = r.y; y < r.y + r.h; y += Math.max(2, 3 * dpr)) g.fillRect(r.x, y, r.w, Math.max(1, dpr));
      g.restore();
      // ramen runt glaset
      g.strokeStyle = "rgba(0,0,0,0.6)"; g.lineWidth = Math.min(w, h) * 0.012;
      g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, Math.min(w, h) * 0.03); g.stroke();
      c.clearRect(0, 0, w, h);
    }
    // stigande nollgenomgång i första halvan, så att bilden står still
    function trigga(s) {
      const n = s.length;
      for (let i = 2; i < n * 0.5; i++) if (s[i - 1] < 0 && s[i] >= 0) return i;
      return 0;
    }
    function rita() {
      storlek();
      const r = ruta(), s = hamta && hamta();
      // efterlysningen: det gamla bleknar
      c.globalCompositeOperation = "destination-out"; c.fillStyle = "rgba(0,0,0,0.38)"; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "lighter";
      const my = r.y + r.h / 2, ah = r.h * 0.34;
      let pts = null, pk = 0;
      if (s && s.length > 16) {
        const i0 = trigga(s), n = Math.floor(s.length * 0.5);
        pts = [];
        for (let k = 0; k < n; k++) { const v = s[i0 + k] || 0; pk = Math.max(pk, Math.abs(v)); pts.push([r.x + (r.w * k) / (n - 1), my - Math.tanh(v * 2.4) * ah]); }
      }
      amp = amp * 0.9 + pk * 0.1;
      ljus = Math.max(0, ljus - 0.04);
      const styrka = 0.55 + 0.45 * Math.min(1, ljus + amp * 2); styrkaNu = styrka;
      const linje = (bredd, a, blur, k) => {
        c.lineWidth = bredd; c.strokeStyle = rgba(a, k); c.shadowColor = rgba(0.9); c.shadowBlur = blur;
        c.beginPath();
        if (pts) pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        else { c.moveTo(r.x, my); c.lineTo(r.x + r.w, my); }
        c.stroke();
      };
      c.save(); c.beginPath(); c.roundRect(r.x, r.y, r.w, r.h, Math.min(w, h) * 0.03); c.clip();
      linje(Math.max(2, 4 * dpr), 0.22 * styrka, 22 * dpr, 1);       // glöden runt strålen
      linje(Math.max(1, 1.6 * dpr), 0.9 * styrka, 6 * dpr, 1.15);    // strålen
      c.shadowBlur = 0; c.restore();
      c.globalCompositeOperation = "source-over";
      // inställningarna och tonen, som på ett riktigt oscilloskop: en rad mitt över strålens område (där panelerna
      // inte ligger), svag så att den inte tar över
      c.font = `${Math.round(10 * dpr * 2) / 2}px "BLONDA Mono", monospace`; c.textAlign = "center";
      c.fillStyle = rgba(0.32 + 0.4 * ljus);
      c.fillText("CH1  ·  0.5 MS/DIV  ·  TRIG +" + (senast ? "  ·  " + senast : ""), w / 2, my - ah * 1.12);
      c.textAlign = "start";
      ritad++;
    }
    return {
      visa(pa) { aktiv = !!pa; rut.style.display = cv.style.display = aktiv ? "block" : "none"; if (aktiv) { w = 0; storlek(); } },
      // en ton: strålen lyser upp, och tonen och dess frekvens står i hörnet
      anslag(nt) {
        ljus = 1;
        const f = 440 * Math.pow(2, (nt - 69) / 12);
        senast = `${NOTNAMN[((nt % 12) + 12) % 12]}${Math.floor(nt / 12) - 1}  ·  ${f.toFixed(1)} HZ`;
      },
      tick() { if (aktiv) rita(); },
      // tester: hur stort utslag strålen har (0..1), hur starkt den lyser (0,55..1) och vilken ton som står i hörnet
      // (utan att läsa tillbaka bilden: det gör ritandet långsammare)
      matt() { rita(); return { utslag: amp, styrka: styrkaNu, ton: senast, ritad }; },
      klar() { return true; },
    };
  }
  return { create };
})();
