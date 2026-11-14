// BLONDA BRIS – blommorna. Varje kategori av ljud har sin blomma ur designen (ui/blommor/*.webp, utklippta med
// tools/blommor.py). Blomman lever med ljudet: den vajar runt sin fot med LFO:n, andas med volymhöljet, öppnar sig
// med filtret, fladdrar lätt i kronbladen och släpper pollen när toner spelas. Ritas med WebGL (böjning av bilden);
// utan WebGL med vanlig 2D-canvas.
"use strict";

const Blommor = (() => {
  const TAU = Math.PI * 2;
  function rng(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const cache = {};
  function load(name) {
    if (cache[name]) return cache[name];
    const img = new Image();
    const p = new Promise((res, rej) => { img.onload = () => res(img); img.onerror = rej; });
    img.src = "blommor/" + name + ".webp";
    cache[name] = { img, p };
    return cache[name];
  }

  const VS = `
attribute vec2 aUv;
uniform vec2 uView;      // canvasens storlek (px)
uniform vec4 uRect;      // bildens plats: x, y, b, h (px)
uniform vec2 uFoot;      // foten i bildens uv
uniform float uT, uSway, uBreath, uOpen, uFlip, uRot, uFlut;
varying vec2 vUv;
void main() {
  vec2 uv = aUv;
  vUv = vec2(uFlip > 0.5 ? 1.0 - uv.x : uv.x, uv.y);
  vec2 foot = uFoot;
  vec2 p = uRect.xy + uv * uRect.zw;
  vec2 f = uRect.xy + foot * uRect.zw;
  vec2 d = p - f;
  float hgt = clamp(-d.y / uRect.w, 0.0, 1.2);
  // öppning: kronbladen breder ut sig från fotens axel, mest upptill
  d.x *= 1.0 + uOpen * hgt;
  // andning kring blommans mitt
  vec2 c = vec2(0.0, -0.45 * uRect.w);
  d = c + (d - c) * (1.0 + uBreath);
  // böjning: vinkeln växer med höjden
  float a = uRot + uSway * pow(hgt, 1.15);
  float ca = cos(a), sa = sin(a);
  d = vec2(ca * d.x - sa * d.y, sa * d.x + ca * d.y);
  // fladder i kronbladen
  d += vec2(sin(uT * 1.9 + uv.y * 11.0 + uv.x * 3.0), cos(uT * 1.5 + uv.x * 9.0)) * uFlut * hgt * uRect.w;
  p = f + d;
  vec2 clip = p / uView * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;
  const FS = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uHue, uSat, uLift;
vec3 hue(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a);
  return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}
void main() {
  vec4 t = texture2D(uTex, vUv);
  vec3 c = t.a > 0.0 ? t.rgb / t.a : vec3(0.0);
  if (uHue != 0.0) c = hue(c, uHue);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, uSat);
  c = c + (1.0 - c) * uLift;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0) * t.a, t.a);
}`;

  function create(back, glCv, front, info) {
    const bctx = back.getContext("2d"), fctx = front.getContext("2d");
    let gl = null;
    try { gl = glCv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true }); } catch (e) { gl = null; }
    let prog, buf, nIdx, tex = null, u = {};
    const G = 28;
    if (gl) {
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      try {
        prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        const v = [], idx = [];
        for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) v.push(i / G, j / G);
        for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const a = j * (G + 1) + i, b = a + 1, c = a + G + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
        buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
        const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
        nIdx = idx.length;
        ["uView", "uRect", "uFoot", "uT", "uSway", "uBreath", "uOpen", "uFlip", "uRot", "uFlut", "uTex", "uHue", "uSat", "uLift"].forEach((n) => (u[n] = gl.getUniformLocation(prog, n)));
        u.aUv = gl.getAttribLocation(prog, "aUv");
      } catch (e) { console.warn("WebGL: " + e.message); gl = null; }
    }

    let W = 0, H = 0, dpr = 1;
    let cur = null, want = null, curImg = null, fade = 1, prevImg = null, prevCfg = null;
    let accent = "#7a4bd4", acc = [122, 75, 212];
    const sig = { env: 0, lfo: 0, pk: 0, mask: 0, step: -1, nc: 0, cut: 0.5, res: 0.1, lrate: 0.45 };
    let envS = 0, pkS = 0, lph = 0, lastNc = -1, t0 = performance.now(), last = t0;
    const pollen = [];

    function resize() {
      const r = glCv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(r.width), h = Math.round(r.height);
      if (w === W && h === H && back.width === Math.round(w * dpr)) return;
      W = w; H = h;
      for (const c of [back, glCv, front]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    }

    function upload(img) {
      if (!gl) return;
      if (!tex) tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // blommans ruta i canvasen: så stor som möjligt, centrerad (som i designen)
    function rect(cfg, img) {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      // canvasen är scenen + 70 px åt sidorna (blomman får gå lite utanför), men panelerna ska aldrig täckas
      const sw = Math.max(100, W - 175), sh = Math.max(100, H - 40);
      const sc = Math.min((sw * 1.0) / iw, (sh * 0.95) / ih) * cfg.scale;
      const w = iw * sc, h = ih * sc;
      return [W / 2 - w / 2 + cfg.dx * W, H * 0.5 - h / 2, w, h];
    }

    function drawGL(cfg, img, t, alpha) {
      const r = rect(cfg, img);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(u.aUv); gl.vertexAttribPointer(u.aUv, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(u.uView, W, H);
      gl.uniform4f(u.uRect, r[0], r[1], r[2], r[3]);
      const fx = cfg.flip ? 1 - cfg.foot[0] : cfg.foot[0];
      gl.uniform2f(u.uFoot, fx, cfg.foot[1]);
      gl.uniform1f(u.uT, t);
      const sway = (Math.sin(t * 0.62 + cfg.ph) * 0.022 + Math.sin(t * 1.13) * 0.008 + sig.lfo * 0.02) * (0.7 + envS * 0.6);
      gl.uniform1f(u.uSway, cfg.flip ? -sway : sway);
      gl.uniform1f(u.uBreath, envS * 0.035 + pkS * 0.01);
      gl.uniform1f(u.uOpen, (sig.cut - 0.5) * 0.06 + envS * 0.05);
      gl.uniform1f(u.uFlip, cfg.flip ? 1 : 0);
      gl.uniform1f(u.uRot, cfg.rot);
      gl.uniform1f(u.uFlut, 0.0016 + envS * 0.0024);
      gl.uniform1f(u.uHue, cfg.hue);
      gl.uniform1f(u.uSat, cfg.sat);
      gl.uniform1f(u.uLift, envS * 0.05);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.uTex, 0);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawElements(gl.TRIANGLES, nIdx, gl.UNSIGNED_SHORT, 0);
    }
    function draw2D(ctx, cfg, img, t, alpha) {
      const r = rect(cfg, img);
      const fx = r[0] + cfg.foot[0] * r[2], fy = r[1] + cfg.foot[1] * r[3];
      const sway = Math.sin(t * 0.62 + cfg.ph) * 0.02 + sig.lfo * 0.015;
      const b = 1 + envS * 0.03;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(fx, fy); ctx.rotate(cfg.rot + sway * 0.5); ctx.scale(cfg.flip ? -b : b, b); ctx.translate(-fx, -fy);
      const f = (cfg.hue ? `hue-rotate(${(cfg.hue * 180 / Math.PI).toFixed(1)}deg) ` : "") + (cfg.sat !== 1 ? `saturate(${cfg.sat})` : "");
      ctx.filter = f || "none";
      ctx.drawImage(img, r[0], r[1], r[2], r[3]);
      ctx.restore();
    }

    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000;
      resize();
      if (!W) return;
      if (want && want !== cur) {
        const w = want; const L = load(w.photo);
        if (L.img.complete && L.img.naturalWidth) {
          if (cur && curImg) { prevImg = curImg; prevCfg = cur; fade = 0; }
          cur = w; curImg = L.img; upload(curImg);
        } else L.p.then(() => { if (want === w) last = performance.now(); }).catch(() => {});
      }
      envS += (sig.env - envS) * (sig.env > envS ? 0.25 : 0.06);
      pkS += (sig.pk - pkS) * 0.15;
      lph = (lph + Math.min(1.2, 0.1 * Math.pow(1000, sig.lrate)) * dt) % 1;
      fade = Math.min(1, fade + dt * 2.4);

      // bakom: glöd och ring med LFO-punkt
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0); bctx.clearRect(0, 0, W, H);
      const R = Math.min(W * 0.36, H * 0.46), cx = W / 2, cy = H * 0.5;
      const g = bctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
      g.addColorStop(0, `rgba(255,255,255,${0.35 + envS * 0.25})`);
      g.addColorStop(0.55, `rgba(${acc[0]},${acc[1]},${acc[2]},${0.03 + envS * 0.08 + pkS * 0.04})`);
      g.addColorStop(1, `rgba(${acc[0]},${acc[1]},${acc[2]},0)`);
      bctx.fillStyle = g; bctx.fillRect(0, 0, W, H);
      bctx.strokeStyle = "rgba(43,37,33,0.12)"; bctx.lineWidth = 1;
      bctx.beginPath(); bctx.arc(cx, cy, R, 0, TAU); bctx.stroke();
      const oa = lph * TAU - Math.PI / 2;
      bctx.fillStyle = accent; bctx.beginPath(); bctx.arc(cx + Math.cos(oa) * R, cy + Math.sin(oa) * R, 4, 0, TAU); bctx.fill();

      // blomman
      if (gl) {
        gl.viewport(0, 0, glCv.width, glCv.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        if (curImg) drawGL(cur, curImg, t, 1);
      } else {
        fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clearRect(0, 0, W, H);
        if (curImg) draw2D(fctx, cur, curImg, t, fade);
      }
      if (gl) { fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clearRect(0, 0, W, H); }
      glCv.style.opacity = gl ? String(0.15 + 0.85 * fade) : "1";

      // pollen när toner spelas
      if (lastNc < 0) lastNc = sig.nc;
      if (sig.nc !== lastNc) {
        const n = Math.min(6, Math.abs(sig.nc - lastNc));
        for (let k = 0; k < n * 3; k++) {
          const a = Math.random() * TAU, sp = 0.05 + Math.random() * 0.16;
          pollen.push({ x: (Math.random() - 0.5) * 0.35, y: (Math.random() - 0.65) * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.1, life: 1, r: 1 + Math.random() * 2 });
        }
        lastNc = sig.nc;
      }
      fctx.fillStyle = accent;
      for (let i = pollen.length - 1; i >= 0; i--) {
        const p = pollen[i];
        p.life -= dt * 0.55; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 0.02 * dt;
        if (p.life <= 0) { pollen.splice(i, 1); continue; }
        fctx.globalAlpha = p.life * 0.7;
        fctx.beginPath(); fctx.arc(cx + p.x * R, cy + p.y * R, p.r, 0, TAU); fctx.fill();
      }
      fctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);

    return {
      webgl: !!gl,
      // plant: { photo, hue (grader), sat }, preset: ljudets nummer (ger variant), nr: nummer inom växten
      set(plant, preset, nr, col) {
        const rnd = rng(preset * 2654435761 + 7);
        const meta = (info && info[plant.photo]) || { fot: [0.5, 1] };
        want = {
          key: plant.id + ":" + preset, photo: plant.photo, foot: meta.fot,
          hue: ((plant.hue || 0) + (nr > 1 ? (rnd() - 0.5) * 12 : 0)) * Math.PI / 180,
          sat: plant.sat ?? 1, flip: nr % 2 === 0, rot: nr > 1 ? (rnd() - 0.5) * 0.06 : 0,
          scale: nr > 1 ? 0.96 + rnd() * 0.06 : 1, dx: 0, ph: rnd() * TAU,
        };
        if (cur && cur.key === want.key) want = cur;
        accent = col; acc = hexRgb(col);
        load(plant.photo);
      },
      signals(s) { Object.assign(sig, s); },
      preload(list) { list.forEach((p) => load(p)); },
    };
  }
  return { create };
})();
