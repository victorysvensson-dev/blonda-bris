// BLONDA BRIS – den hemliga patchens glasscen.
// Scenen är renderad i Blender (tools/kristall.py): ett grundpass och ett pass per ljusposition längs tangentbordet,
// alla i en bild (tools/kristall_bilder.py). Ljus är linjärt, så här blandas passen efter vilka toner som spelas och
// färgas per ton – glaset, regnbågsskimret, reflexerna i golvet och skuggorna stämmer då med var man spelar.
"use strict";
const Kristall = (() => {
  const VS = `attribute vec2 aP; uniform vec4 uR; uniform vec2 uView; varying vec2 vUv;
    void main() { vUv = aP; vec2 p = (uR.xy + aP * uR.zw) / uView; gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0); }`;
  const FS = `precision highp float;
    uniform sampler2D uA; uniform vec3 uT[16]; uniform vec2 uCell, uHalv; uniform float uExp, uN, uCols;
    varying vec2 vUv;
    vec3 avkoda(vec3 e) { vec3 t = min(pow(e, vec3(2.2)), vec3(0.996)); return t / (1.0 - t); }   // se kristall_bilder.py
    void main() {
      vec2 uv = clamp(vUv, uHalv, 1.0 - uHalv);
      vec3 c = vec3(0.0);
      for (int i = 0; i < 16; i++) {
        if (float(i) >= uN) break;
        if (dot(uT[i], uT[i]) < 1e-7) continue;
        vec2 o = vec2(mod(float(i), uCols), floor(float(i) / uCols)) * uCell;
        c += uT[i] * avkoda(texture2D(uA, o + uv * uCell).rgb);
      }
      c *= uExp;
      vec3 m = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);   // filmisk tonkurva (ACES, ungefär)
      m = pow(clamp(m, 0.0, 1.0), vec3(1.0 / 2.2));
      vec2 d = (vUv - vec2(0.5, 0.5)) * vec2(1.0, 1.12);
      float a = 1.0 - smoothstep(0.30, 0.52, length(d));                     // tonar ut mot sidan, in i bakgrunden
      gl_FragColor = vec4(m * a, a);
    }`;

  function create(stage, meta, bas) {
    const cv = document.createElement("canvas"); cv.id = "kristall"; cv.className = "fl";
    stage.append(cv);
    const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    const N = meta.antal + 1, T = new Float32Array(16 * 3);
    let img = null, tex = null, prog = null, u = {}, buf = null, aktiv = false, W = 0, H = 0, dpr = 1, ny = true;

    function kompilera() {
      const sh = (typ, src) => { const s = gl.createShader(typ); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      for (const n of ["uA", "uT", "uCell", "uHalv", "uExp", "uN", "uCols", "uR", "uView"]) u[n] = gl.getUniformLocation(prog, n);
      u.aP = gl.getAttribLocation(prog, "aP");
      buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    }
    if (gl) { try { kompilera(); } catch (e) { console.warn("kristall:", e.message); } }

    function ladda() {
      if (img) return;
      img = new Image();
      img.onload = () => {
        if (gl && prog) {
          tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        ny = true;
      };
      img.src = bas + meta.bild;
    }

    // scenens ruta: så stor som scenen tillåter, centrerad, lite större än blommorna (bilden tonar ut i kanten)
    function ruta() {
      const s = stage.getBoundingClientRect(), c = cv.getBoundingClientRect();
      const bw = s.width, bh = s.height, ar = meta.w / meta.h;
      let w = Math.min(bw * 1.25, bh * 1.22 * ar), h = w / ar;
      return [s.left - c.left + bw / 2 - w / 2, s.top - c.top + bh / 2 - h / 2 + bh * 0.01, w, h];
    }

    function rita() {
      dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      W = w; H = h;
      const r = ruta();
      if (gl && prog && tex) {
        gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(prog);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.uA, 0);
        gl.uniform3fv(u.uT, T);
        gl.uniform2f(u.uCell, meta.w / img.width, meta.h / img.height);
        gl.uniform2f(u.uHalv, 0.5 / meta.w, 0.5 / meta.h);
        gl.uniform1f(u.uExp, meta.exp || 1); gl.uniform1f(u.uN, N); gl.uniform1f(u.uCols, meta.kol);
        gl.uniform4f(u.uR, r[0], r[1], r[2], r[3]); gl.uniform2f(u.uView, W, H);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(u.aP); gl.vertexAttribPointer(u.aP, 2, gl.FLOAT, false, 0, 0);
        gl.disable(gl.BLEND); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else if (!gl && img && img.complete && img.naturalWidth) {   // utan WebGL: bara grundpasset (bilden är redan tonad)
        const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
        g.drawImage(img, 0, 0, meta.w, meta.h, r[0], r[1], r[2], r[3]);
      }
    }

    return {
      // ljus: [{ f: tangentens läge 0..1 över tangentbordet, v: styrka 0..1, c: [r,g,b] linjär färg }]
      ljus(lista, bas = 1) {
        T.fill(0); T[0] = T[1] = T[2] = bas;
        const K = meta.antal;
        for (const l of lista) {
          const p = Math.min(K - 1, Math.max(0, l.f * (K - 1))), k0 = Math.min(K - 2, Math.floor(p)), fr = p - k0;
          const g = l.v * (meta.styrka || 1);
          for (let j = 0; j < 3; j++) { T[(k0 + 1) * 3 + j] += l.c[j] * g * (1 - fr); T[(k0 + 2) * 3 + j] += l.c[j] * g * fr; }
        }
        ny = true;
      },
      visa(pa) {
        aktiv = !!pa; cv.style.display = aktiv ? "block" : "none";
        if (aktiv) { ladda(); ny = true; }
      },
      // anropas varje bildruta; ritar bara när något ändrats (eller storleken)
      tick() {
        if (!aktiv) return;
        const w = cv.clientWidth, h = cv.clientHeight;
        if (ny || w !== W || h !== H || (window.devicePixelRatio || 1) !== dpr) { ny = false; rita(); }
      },
      // tester: ritar nu och mäter scenens medelljus (0..255) och hur varmt den lyser (röd minus blå)
      matt() {
        rita(); if (!gl || !tex) return null;
        const w = cv.width, h = cv.height, px = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let s = 0, rb = 0, n = 0;
        for (let i = 0; i < px.length; i += 16) { s += (px[i] + px[i + 1] + px[i + 2]) / 3; rb += px[i] - px[i + 2]; n++; }
        return { ljus: s / n, varm: rb / n };
      },
      klar() { return !!img && img.complete && !!img.naturalWidth && (!gl || !!tex); },
      webgl: !!(gl && prog),
      meta,
    };
  }
  return { create };
})();
