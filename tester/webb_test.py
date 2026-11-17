#!/usr/bin/env python3
"""Testar webbversionen i Chrome (Playwright): inga fel i konsolen, ljudet startar, frasen spelar och växten reagerar,
alla växter går att välja. Skärmdumpar till dist/skärmdumpar/.   python3 tester/webb_test.py [dist/web]"""
import http.server, os, socketserver, sys, threading, json
from playwright.sync_api import sync_playwright
import io
import numpy as np
from PIL import Image

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROT, "dist/web"))
UT = os.path.join(ROT, "dist/skärmdumpar"); os.makedirs(UT, exist_ok=True)
D = json.loads(open(os.path.join(WEB, "data.js"), encoding="utf-8").read().split("=", 1)[1].rstrip().rstrip(";"))

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=WEB, **k)
    def log_message(s, *a): pass
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".wasm": "application/wasm", ".js": "text/javascript"}
srv = socketserver.TCPServer(("127.0.0.1", 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{port}/index.html"

fel = []
def krav(c, msg):
    print(("OK   " if c else "FEL  ") + msg)
    if not c: fel.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
    for namn, vp, mobil in [("dator", (1670, 940), False), ("ipad_staende", (820, 1180), True), ("ipad13_staende", (1032, 1376), True), ("ipad_liggande", (1180, 820), True), ("iphone", (393, 852), True), ("iphone_se", (375, 667), True), ("iphone_liggande", (852, 393), True), ("auv3_lag", (1024, 360), False)]:
        ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, device_scale_factor=2, has_touch=mobil)
        pg = ctx.new_page()
        logs = []
        pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") and "GL Driver Message" not in m.text else None)
        pg.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
        pg.goto(URL); pg.wait_for_timeout(1200)
        pg.click("#start"); pg.wait_for_timeout(600)
        if namn == "dator":
            krav(pg.evaluate("Bridge.running"), "ljudet startar efter tryck")
            pg.evaluate("__bris.note(60, 100); __bris.note(67, 90)"); pg.wait_for_timeout(2000)
            s = pg.evaluate("__bris.S.m")
            krav(s["nc"] > 0, f"toner räknas ({s['nc']})")
            krav(pg.evaluate("document.querySelector('#roll') === null && document.querySelector('#play') === null"), "rullen och transporten är borta")
            krav(pg.evaluate("document.querySelector('#ver').textContent").startswith("BRIS "), "versionen syns")
            krav(s["env"] > 0.01 or s["pk"] > 0.01, f"ljud kommer ut (env {s['env']:.3f}, peak {s['pk']:.3f})")
            pg.screenshot(path=f"{UT}/{namn}_spelar.png")
            pg.evaluate("__bris.off(60); __bris.off(67)")
            # alla växter
            for pi, pl in enumerate(D["plants"]):
                first = next(i for i in D["order"] if D["presets"][i]["plant"] == pi)
                pg.evaluate(f"__bris.selectPreset({first})"); pg.wait_for_timeout(250)
                pg.evaluate("__bris.note(60, 100)"); pg.wait_for_timeout(1300)
                pg.screenshot(path=f"{UT}/vaxt_{pi:02d}_{pl['id']}.png")
                pg.evaluate("__bris.off(60)")
                acc = pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--a').trim()")
                krav(acc.lower() == pl["color"].lower(), f"växt {pl['id']}: färg {acc}")
            # flikarna
            for t in ["osc", "filter", "amp", "mod", "fx", "mood", "arp"]:
                pg.click(f"#tabs button[data-tab={t}]"); pg.wait_for_timeout(300)
                pg.screenshot(path=f"{UT}/flik_{t}.png")
            # MOOD: fotknapparna slår på WET och LOOP, HIDDEN visar de dolda rattarna
            pg.click("#tabs button[data-tab=mood]"); pg.wait_for_timeout(200)
            pg.click("#fsw .fs[data-id=mowet]"); pg.click("#fsw .fs[data-id=moloop]"); pg.wait_for_timeout(200)
            v = pg.evaluate("({ w: __bris.S.v.mowet, l: __bris.S.v.moloop, on: document.querySelectorAll('#fsw .fs.on').length })")
            krav(v["w"] == 1 and v["l"] == 1 and v["on"] == 2, f"MOOD: WET och LOOP slås på med fotknapparna ({v})")
            pg.evaluate("__bris.note(57, 100); __bris.note(64, 90)"); pg.wait_for_timeout(1200); pg.evaluate("__bris.off(57); __bris.off(64)")
            pg.screenshot(path=f"{UT}/mood_pa.png")
            pg.click("#right .hidb"); pg.wait_for_timeout(200)
            krav(pg.evaluate("[...document.querySelectorAll('#left .knob .lab')].map(e => e.textContent).join(',')") == "FADE,WIDTH,BALANCE,DIRECT", "MOOD: HIDDEN visar de dolda rattarna")
            pg.click("#right .tog .opt[data-id=mosprd]"); krav(pg.evaluate("__bris.S.v.mosprd") == 1, "MOOD: SPREAD slås på")
            pg.screenshot(path=f"{UT}/mood_hidden.png")
            pg.click("#right .hidb"); pg.click("#fsw .fs[data-id=mowet]"); pg.click("#fsw .fs[data-id=moloop]"); pg.click("#right .tog .opt[data-id=mosprd]") if pg.locator("#right .tog .opt[data-id=mosprd]").count() else None
            pg.evaluate("__bris.setParam('mosprd', 0, true)")
            krav(pg.evaluate("__bris.S.v.mowet + __bris.S.v.moloop") == 0, "MOOD: av igen")
            # ARP-sidan
            pg.click("#tabs button[data-tab=arp]"); pg.wait_for_timeout(200)
            pg.click("#left .tog .opt[data-id=arp]"); pg.click("#right .choice .opt:has-text('1/8T')")
            krav(pg.evaluate("__bris.S.v.arp") == 1 and pg.evaluate("__bris.S.v.arpr") == 2, "ARP slås på och takten väljs")
            pg.click("#right .choice .opt:has-text('3 OCT')"); krav(pg.evaluate("__bris.S.v.arpo") == 3, "ARP: oktaver (värdet börjar på 1)")
            # ackordpads: öppna, spela, HOLD, FOLLOW, spela in ett ackord från tangenterna
            pg.click("#kbar .padsb"); pg.wait_for_timeout(400)
            krav(pg.evaluate("getComputedStyle(document.querySelector('#pads')).display") == "flex", "PADS öppnas över skärmen")
            aknamn = pg.evaluate("[...document.querySelectorAll('#pads .pad .ak')].map(e => e.textContent)")
            krav(aknamn == ["Am7", "Fmaj7", "C", "G"], f"padsens ackordnamn ({aknamn})")
            pad0 = pg.locator("#pads .pad").first.bounding_box()
            pg.mouse.move(pad0["x"] + pad0["width"] / 2, pad0["y"] + pad0["height"] / 2); pg.mouse.down(); pg.wait_for_timeout(400)
            hort = set()   # arpens toner, avlästa flera gånger (gaten gör den tyst en del av varje steg)
            for _ in range(30): pg.wait_for_timeout(40); hort.add(pg.evaluate("__bris.S.m.an"))
            pg.screenshot(path=f"{UT}/pads_arp.png")
            spelade = hort - {-1}
            krav(spelade and spelade <= {57, 60, 64, 67, 69, 72, 76, 79, 81, 84, 88, 91}, f"arpen spelar padens ackord ({sorted(hort)})")
            pg.mouse.up(); pg.wait_for_timeout(500)
            krav(pg.evaluate("__bris.S.m.an") == -1 and pg.evaluate("__bris.S.pads.active") == -1, "paden släpps när fingret lyfts (utan HOLD)")
            pg.click("#pads .pbar .arpb"); krav(pg.evaluate("__bris.S.v.arp") == 0, "ARP av i padsens rad")
            pg.click("#pads .pbar .hold"); pg.click("#pads .pad >> nth=1"); pg.wait_for_timeout(500)
            krav(pg.evaluate("__bris.S.pads.active") == 1 and pg.evaluate("__bris.S.m.mask") != 0, "HOLD: paden ligger kvar efter tryck")
            pg.click("#pads .pad >> nth=2"); pg.wait_for_timeout(200)
            krav(pg.evaluate("__bris.S.pads.active") == 2, "HOLD: en annan pad byter ackord")
            pg.click("#pads .pbar .follow"); pg.wait_for_timeout(500)
            fm = pg.evaluate("({ fr: __bris.S.m.fr, fm: __bris.S.m.fm })")
            krav(fm["fr"] == 0 and fm["fm"] == 0xAB5, f"FOLLOW: C-dur efter C-paden ({fm})")
            pg.screenshot(path=f"{UT}/pads_hold_follow.png")
            pg.click("#pads .pad >> nth=2"); pg.wait_for_timeout(300)
            krav(pg.evaluate("__bris.S.pads.active") == -1, "HOLD: samma pad igen släpper")
            # REC: tryck REC, välj pad 4, spela D-moll på tangenterna, tryck paden igen
            pg.click("#pads .pbar .follow"); pg.click("#pads .pbar .rec"); pg.click("#pads .pad >> nth=3")
            for n in (62, 65, 69): pg.evaluate(f"__bris.note({n}, 100)"); pg.wait_for_timeout(120); pg.evaluate(f"__bris.off({n})")
            pg.wait_for_timeout(200); pg.screenshot(path=f"{UT}/pads_rec.png")
            pg.click("#pads .pad >> nth=3"); pg.wait_for_timeout(200)
            rec = pg.evaluate("({ l: __bris.S.pads.list[3], rec: __bris.S.pads.rec, namn: document.querySelectorAll('#pads .pad .ak')[3].textContent })")
            krav(rec["l"] == [62, 65, 69] and not rec["rec"] and rec["namn"] == "Dm", f"REC spelar in ackordet från tangenterna ({rec})")
            pg.click("#pads .pbar .hold"); pg.click("#pads .pbar .stang"); pg.wait_for_timeout(300)
            krav(pg.evaluate("getComputedStyle(document.querySelector('#pads')).display") == "none", "PADS stängs")
            pg.evaluate("__bris.setParam('arpr', 3, true); __bris.setParam('arpo', 1, true)")
            # PLAY: CUTOFF, CHORUS och REVERB till höger
            pg.click("#tabs button[data-tab=play]"); pg.wait_for_timeout(200)
            lab = pg.evaluate("[...document.querySelectorAll('#right .slider .lab')].map(e => e.textContent).join(',')")
            krav(lab.startswith("CUTOFF") and "CHORUS" in lab and "REVERB" in lab and "RESONANCE" not in lab, f"PLAY: CUTOFF, CHORUS, REVERB ({lab})")
            # ljuset: en tangent som spelas lyser upp (varm kägla ur tangentbordet), av med LIGHT OFF
            kb = pg.locator("#keys canvas").bounding_box()
            pg.mouse.move(kb["x"] + kb["width"] * 0.47, kb["y"] + kb["height"] * 0.85); pg.mouse.down(); pg.wait_for_timeout(400)
            def ljusbild():   # ljusets duk som bild (toDataURL, så att sidan inte varnar för upprepade läsningar)
                import base64
                u = pg.evaluate("document.querySelector('#ljus').toDataURL('image/png')")
                return np.asarray(Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert("RGBA"), np.int16)
            lb = ljusbild()
            ljus = dict(n=int((lb[..., 3] > 8).sum()), varm=int(((lb[..., 3] > 8) & (lb[..., 0] > lb[..., 2] + 20)).sum()), tot=int(lb.shape[0] * lb.shape[1]))
            pg.screenshot(path=f"{UT}/ljus.png")
            pg.mouse.up()
            krav(ljus["n"] > ljus["tot"] * 0.5 and ljus["varm"] > 1000, f"ljuset lyser när man spelar ({ljus})")
            pg.wait_for_timeout(2500)
            diag = pg.evaluate("({ v: [...__bris.ljus().v], keys: [...(__bris.S.m.keys || [])], an: __bris.S.m.an, lit: [...__bris.keys.lit], lvl: [...__bris.keys.lvl] })")
            krav(int(ljusbild()[..., 3].max()) == 0, f"ljuset klingar av när man släppt ({diag})")
            # AUDIO / MIDI-rutan (fristående appen): egen ruta som går att stänga
            pg.evaluate("__bris.dev.open()"); pg.wait_for_timeout(200)
            pg.evaluate("""Bridge.on.devs({ t: 'devs', midi: [{ id: 'a', name: 'KeyStep 37', on: true }, { id: 'b', name: 'Bluetooth: Roli', on: false }], bt: true,
                out: 'iPad', outs: ['iPad'], rates: [44100, 48000], sr: 48000, bufs: [64, 128, 256, 512], buf: 256 })"""); pg.wait_for_timeout(300)
            dv = pg.evaluate("({ vis: getComputedStyle(document.querySelector('#dev')).display, rad: document.querySelectorAll('#dev .rad').length, on: document.querySelectorAll('#dev .rad.on').length, sr: document.querySelector('#dev .choice .opt.on').textContent })")
            krav(dv["vis"] == "flex" and dv["rad"] == 3 and dv["on"] == 1 and "48" in dv["sr"], f"AUDIO / MIDI-rutan visar enheterna ({dv})")
            pg.screenshot(path=f"{UT}/audio_midi.png")
            pg.click("#dev .stang"); pg.wait_for_timeout(200)
            krav(pg.evaluate("getComputedStyle(document.querySelector('#dev')).display") == "none", "AUDIO / MIDI stängs med krysset")
            pg.evaluate("__bris.dev.open()"); pg.wait_for_timeout(200); pg.mouse.click(8, 300); pg.wait_for_timeout(200)
            krav(pg.evaluate("getComputedStyle(document.querySelector('#dev')).display") == "none", "AUDIO / MIDI stängs med tryck utanför")
            pg.click("#tabs button[data-tab=play]")
            # ratt: dra cutoff
            before = pg.evaluate("__bris.S.v.cut")
            box = pg.locator(".slider").first.locator(".tr").bounding_box()
            pg.mouse.move(box["x"] + box["width"] * 0.2, box["y"] + box["height"] / 2); pg.mouse.down(); pg.mouse.move(box["x"] + box["width"] * 0.9, box["y"] + box["height"] / 2, steps=5); pg.mouse.up()
            after = pg.evaluate("__bris.S.v.cut")
            krav(after > before + 0.1 or after > 0.85, f"reglaget ändrar cutoff ({before:.2f} -> {after:.2f})")
            # menyn
            pg.click("#menuBtn"); pg.wait_for_timeout(500); pg.screenshot(path=f"{UT}/meny.png"); pg.click("#menuClose")
            # tangenterna
            kb = pg.locator("#keys canvas").bounding_box()
            pg.mouse.move(kb["x"] + 90, kb["y"] + kb["height"] * 0.8); pg.mouse.down(); pg.wait_for_timeout(500)
            s = pg.evaluate("__bris.S.m"); pg.screenshot(path=f"{UT}/tangenter.png"); pg.mouse.up()
            krav(s["mask"] != 0, f"tangent spelar en röst (mask {s['mask']})")
            # glid: håll en vit tangent nertill och dra rakt upp (förbi de svarta tangenterna) -> samma ton, glidet stiger
            pg.evaluate("__bris.glidMode(1)")
            gx = kb["x"] + 34 + (kb["width"] - 34) / round((kb["width"] - 34) / 56) * 1.5   # mitt på andra vita tangenten (D)
            pg.mouse.move(gx, kb["y"] + kb["height"] * 0.9); pg.mouse.down(); pg.wait_for_timeout(150)
            n0 = pg.evaluate("[...__bris.keys.down.values()][0].n")
            for f in range(1, 11): pg.mouse.move(gx, kb["y"] + kb["height"] * (0.9 - 0.08 * f)); pg.wait_for_timeout(30)
            pg.wait_for_timeout(300)
            g = pg.evaluate("({ n: [...__bris.keys.down.values()][0].n, v: __bris.S.glid.v, sent: __bris.S.glid.sent })")
            pg.screenshot(path=f"{UT}/glid.png")
            krav(g["n"] == n0, f"tonen ligger kvar när fingret glider upp bland de svarta tangenterna ({n0} -> {g['n']})")
            krav(g["v"] > 0.9 and abs(g["sent"] - g["v"]) < 0.01, f"glidet stiger och skickas ({g})")
            pg.wait_for_timeout(400)
            mg = pg.evaluate("({ glid: __bris.S.m.glid, mod: __bris.S.mod.cut, base: __bris.S.v.cut, dot: getComputedStyle(document.querySelector('#right .slider .mdot')).display })")
            krav(mg["glid"] > 0.8 and mg["mod"] is not None and mg["mod"] > mg["base"] and mg["dot"] == "block", f"CUTOFF under TONE följer glidet ({mg})")
            pg.mouse.up(); pg.wait_for_timeout(100)
            krav(pg.evaluate("__bris.S.glid.v") == 0 and pg.evaluate("__bris.S.glid.sent") == 0, "glidet går tillbaka när tangenten släpps")
            pg.wait_for_timeout(400)
            krav(pg.evaluate("Object.keys(__bris.S.mod).length") == 0, "reglagen går tillbaka när glidet släpps")
            # zoom och höjd
            nw = lambda: pg.evaluate("(() => { const w = document.querySelector('#keys canvas').clientWidth - 34; return Math.round(w / (56 * __bris.S.kz)); })()")
            n0 = nw(); pg.click("#kbar .zoom button[aria-label='Större tangenter']"); pg.click("#kbar .zoom button[aria-label='Större tangenter']")
            krav(nw() < n0, f"zoom in ger färre tangenter ({n0} -> {nw()})")
            pg.click("#kbar .zoom button[aria-label='Fler tangenter']"); pg.click("#kbar .zoom button[aria-label='Fler tangenter']"); pg.click("#kbar .zoom button[aria-label='Fler tangenter']")
            krav(nw() > n0, f"zoom ut ger fler tangenter ({nw()})")
            gb = pg.locator("#kgrip").bounding_box(); h0 = pg.locator("#keys").bounding_box()["height"]
            pg.mouse.move(gb["x"] + gb["width"] / 2, gb["y"] + 8); pg.mouse.down(); pg.mouse.move(gb["x"] + gb["width"] / 2, gb["y"] - 400, steps=8); pg.mouse.up()
            h1 = pg.locator("#keys").bounding_box()["height"]; st = pg.locator("#stage").bounding_box()["height"]
            krav(h1 > h0 + 40 and st >= 150, f"tangenterna blir högre när man drar i strecket ({h0:.0f} -> {h1:.0f}, blomman {st:.0f})")
            pg.screenshot(path=f"{UT}/tangenter_hoga.png")
            pg.locator("#kgrip").dblclick(); pg.evaluate("__bris.setZoom(1)")
            # BRIS MPE-läget (som i MPE-appen): varje finger skickar sin egen slide för sin ton, inget gemensamt glid
            pg.evaluate("""(() => { window.__skickat = []; const o = Bridge.send; Bridge.send = (m) => { window.__skickat.push(m); o(m); };
                __bris.S.mpe = true; })()""")
            x1 = kb["x"] + 34 + (kb["width"] - 34) / round((kb["width"] - 34) / 56) * 0.5
            pg.mouse.move(x1, kb["y"] + kb["height"] * 0.9); pg.mouse.down(); pg.wait_for_timeout(100)
            for f in range(1, 6): pg.mouse.move(x1, kb["y"] + kb["height"] * (0.9 - 0.1 * f)); pg.wait_for_timeout(40)
            pg.wait_for_timeout(200)
            sk = pg.evaluate("window.__skickat.filter((m) => m.t === 'slide' || m.t === 'glid')")
            nt = pg.evaluate("[...__bris.keys.down.values()][0].n")
            pg.mouse.up()
            krav(any(m["t"] == "slide" and m["n"] == nt and m["v"] > 0.5 for m in sk) and not any(m["t"] == "glid" for m in sk),
                 f"MPE-läget: fingret skickar slide för sin ton ({len(sk)} meddelanden)")
            pg.evaluate("__bris.S.mpe = false")
            pg.click("#kbar .opt[data-m='2']")
            krav(pg.evaluate("__bris.S.glid.m") == 2, "välja VIBRATO i raden ovanför tangenterna")
            o0 = pg.evaluate("__bris.S.oct"); pg.mouse.click(kb["x"] + 10, kb["y"] + kb["height"] * 0.12)
            krav(pg.evaluate("__bris.S.oct") == o0 + 1, "oktav upp med + vid tangenterna")
        else:
            pg.evaluate("__bris.note(60, 100)"); pg.wait_for_timeout(1500)
            pg.screenshot(path=f"{UT}/{namn}.png", full_page=False)
            # allt syns utan att skrolla, på alla flikar
            for t in ["play", "osc", "filter", "amp", "mod", "fx", "mood", "arp"]:
                pg.evaluate(f"__bris.tab('{t}')"); pg.wait_for_timeout(150)
                ut = pg.evaluate("""(() => { const H = innerHeight, W = innerWidth; const bad = [];
                    for (const e of document.querySelectorAll('#app header, #tabs2, .panel *, #keys, #kbar *')) { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
                      const r = e.getBoundingClientRect(); if (r.width && r.height && (r.bottom > H + 1 || r.right > W + 1 || r.top < -1)) bad.push((e.className || e.id || e.tagName) + ':' + Math.round(r.bottom)); }
                    const st = document.querySelector('#stage').getBoundingClientRect();
                    return { bad: bad.slice(0, 4), stage: Math.round(st.height) }; })()""")
                krav(not ut["bad"], f"{namn} {t}: allt syns ({ut['bad']})")
                krav(ut["stage"] >= (180 if t == "play" else 60) or namn == "auv3_lag", f"{namn} {t}: blomman får plats ({ut['stage']} px)")
                if t in ("play", "mod", "mood", "arp"): pg.screenshot(path=f"{UT}/{namn}_{t}.png")
            # padsen över skärmen: alla fyra syns och är stora nog att träffa
            pg.evaluate("__bris.tab('play'); __bris.pads.open(true)"); pg.wait_for_timeout(400)
            pb = pg.evaluate("""[...document.querySelectorAll('#pads .pad, #pads .pbar')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom), Math.round(r.width)]; })""")
            kh = pg.evaluate("document.querySelector('#keys').getBoundingClientRect().top")
            ok = all(r[0] >= 0 and r[2] <= vp[0] + 1 and r[1] >= 0 and r[3] <= kh + 1 for r in pb) and min(r[4] for r in pb[:4]) >= 60
            krav(ok, f"{namn}: padsen syns ovanför tangenterna och är stora nog ({pb})")
            pg.screenshot(path=f"{UT}/{namn}_pads.png")
            pg.evaluate("__bris.pads.open(false)")
            pg.evaluate("__bris.off(60)")
        krav(not logs, f"{namn}: inga fel i konsolen" + ("" if not logs else ": " + " | ".join(logs[:5])))
        ctx.close()
    # Multitouch (iPhone): ett finger håller en ton medan andra fingrar trycker FREEZE, WET och andra knappar
    ctx = b.new_context(viewport={"width": 393, "height": 852}, device_scale_factor=3, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); cdp = ctx.new_cdp_session(pg)
    pg.goto(URL); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(900); pg.tap("#start"); pg.wait_for_timeout(400)
    def touch(typ, pts): cdp.send("Input.dispatchTouchEvent", {"type": typ, "touchPoints": [{"x": x, "y": y, "id": i} for i, x, y in pts]})
    def mitt(sel):
        r = pg.locator(sel).first.bounding_box(); return r["x"] + r["width"] / 2, r["y"] + r["height"] / 2
    pg.evaluate("__bris.tab('mood')"); pg.wait_for_timeout(300)
    kr = pg.locator("#keys canvas").bounding_box(); kx, ky = kr["x"] + kr["width"] * 0.3, kr["y"] + kr["height"] * 0.85
    touch("touchStart", [(1, kx, ky)]); pg.wait_for_timeout(150)
    krav(pg.evaluate("[...__bris.keys.lit].length") == 1, "multitouch: första fingret spelar en ton")
    fx, fy = mitt("#fsw .fs[data-id=mofrz]"); wx, wy = mitt("#fsw .fs[data-id=mowet]")
    # (CDP: touchStart anger alla aktiva fingrar, touchEnd det finger som lyfts)
    touch("touchStart", [(1, kx, ky), (2, wx, wy)]); touch("touchEnd", [(2, wx, wy)])
    touch("touchStart", [(1, kx, ky), (3, fx, fy)]); touch("touchEnd", [(3, fx, fy)])
    pg.wait_for_timeout(200)
    v = pg.evaluate("({ wet: __bris.S.v.mowet, frz: __bris.S.v.mofrz, lit: [...__bris.keys.lit].length })")
    krav(v["wet"] == 1 and v["frz"] == 1 and v["lit"] == 1, f"multitouch: WET och FREEZE trycks medan en ton hålls ({v})")
    cx, cy = mitt("#left .choice .opt >> nth=1")   # DELAY med ett annat finger
    touch("touchStart", [(1, kx, ky), (4, cx, cy)]); touch("touchEnd", [(4, cx, cy)]); pg.wait_for_timeout(150)
    krav(pg.evaluate("__bris.S.v.mowmode") == 1, "multitouch: lägesknappen fungerar medan en ton hålls")
    tx, ty = mitt("#tabs2 button[data-tab=play]:visible, #tabs button[data-tab=play]:visible")
    touch("touchStart", [(1, kx, ky), (5, tx, ty)]); touch("touchEnd", [(5, tx, ty)]); pg.wait_for_timeout(250)
    krav(pg.evaluate("__bris.S.tab") == "play" and pg.evaluate("[...__bris.keys.lit].length") == 1, "multitouch: flikarna fungerar medan en ton hålls")
    touch("touchEnd", [(1, kx, ky)]); pg.wait_for_timeout(150)
    krav(pg.evaluate("[...__bris.keys.lit].length") == 0, "multitouch: tonen släpps när fingret lyfts")
    # ett vanligt tryck räknas en gång (inte två)
    pg.evaluate("__bris.tab('mood')"); pg.wait_for_timeout(200)
    pg.tap("#fsw .fs[data-id=moloop]"); pg.wait_for_timeout(300)
    krav(pg.evaluate("__bris.S.v.moloop") == 1, "ett tryck på LOOP slår på den en gång")
    pg.tap("#left .choice .opt >> nth=2"); pg.wait_for_timeout(300)
    krav(pg.evaluate("__bris.S.v.mowmode") == 2, "ett tryck på SLIP väljer den")
    sel = pg.evaluate("getComputedStyle(document.querySelector('#right .rbox .ttl')).webkitUserSelect")
    krav(sel == "none", f"ingen markering av text ({sel})")
    for id_ in ("moloop", "mowet", "mofrz"): pg.evaluate(f"__bris.setParam('{id_}', 0, true)")
    pg.evaluate("__bris.setParam('mowmode', 0, true)")
    ctx.close()
    b.close()
    # Blommorna i lager: bakre och främre lager tillsammans ska bli exakt blomman (inga tätare halvgenomskinliga
    # partier där lagren möts). Klockan och slumpen fryses, så att stoftet och rörelsen är lika i båda bilderna.
    import numpy as np, io
    from PIL import Image
    # Stilla när inget spelas, MOTION OFF och egna ljud
    bl = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
    pg = bl.new_page(viewport={"width": 1000, "height": 760})
    pg.goto(URL); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(900); pg.click("#start"); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.removeItem('blonda-bris-v1-egna')")
    def mitt():   # blommans mitt (utan ringen och dess prick)
        bb = pg.locator("#stage").bounding_box()
        return np.asarray(Image.open(io.BytesIO(pg.screenshot(clip={"x": bb["x"] + bb["width"] * 0.25, "y": bb["y"] + bb["height"] * 0.25,
                                                                    "width": bb["width"] * 0.5, "height": bb["height"] * 0.5}))).convert("RGB"), np.int16)
    pg.wait_for_function("__bris.flower.klar()"); pg.wait_for_timeout(1500)
    a1 = mitt(); pg.wait_for_timeout(900); a2 = mitt()
    krav(int(np.abs(a1 - a2).max()) <= 1, f"blomman står still när inget spelas (skillnad {int(np.abs(a1 - a2).max())})")
    pg.evaluate("__bris.note(60, 110); __bris.note(64, 100)"); pg.wait_for_timeout(1800)
    b1 = mitt(); pg.wait_for_timeout(700); b2 = mitt()
    krav(int(np.abs(b1 - b2).max()) > 3, "blomman lever medan toner klingar")
    pg.evaluate("__bris.off(60); __bris.off(64)")
    pg.click("#menuBtn"); pg.wait_for_timeout(400)
    pg.click("#mfoot button:has-text('MOTION ON')"); pg.wait_for_timeout(200)
    krav(pg.evaluate("document.documentElement.classList.contains('still') && !__bris.S.motion"), "MOTION OFF i menyn")
    pg.click("#menuClose"); pg.wait_for_timeout(500)
    pg.evaluate("__bris.note(60, 110); __bris.note(67, 100)"); pg.wait_for_timeout(1500)
    c1 = mitt(); pg.wait_for_timeout(700); c2 = mitt()
    krav(int(np.abs(c1 - c2).max()) <= 1, f"MOTION OFF: inget rör sig medan man spelar (skillnad {int(np.abs(c1 - c2).max())})")
    pg.evaluate("__bris.off(60); __bris.off(67)")
    # egna ljud: spara, ändra, ladda, efter omladdning, ta bort
    pg.evaluate("__bris.setParam('cut', 0.234, true); __bris.setParam('res', 0.61, true)")
    pg.click("#menuBtn"); pg.wait_for_timeout(400)
    pg.click("#mfoot button:has-text('SAVE SOUND')"); pg.fill("#mfoot input.namn", "kvällsljus"); pg.click("#mfoot button:has-text('SAVE')")
    pg.wait_for_timeout(200)
    krav(pg.evaluate("__bris.S.egna.length === 1 && __bris.S.egna[0].name === 'KVÄLLSLJUS' && document.querySelector('#list .egna .it').textContent === 'KVÄLLSLJUS'"),
         "spara ett eget ljud (syns under MY SOUNDS)")
    krav(pg.evaluate("document.querySelector('.browser .nm').textContent") == "KVÄLLSLJUS", "ljudväljaren visar det egna ljudet")
    pg.click("#menuClose"); pg.evaluate("__bris.selectPreset(3)"); pg.wait_for_timeout(300)
    pg.click("#menuBtn"); pg.wait_for_timeout(300); pg.click("#list .egna .it"); pg.wait_for_timeout(400)
    v = pg.evaluate("[__bris.S.v.cut, __bris.S.v.res]")
    krav(abs(v[0] - 0.234) < 1e-6 and abs(v[1] - 0.61) < 1e-6, f"ladda det egna ljudet ({v})")
    pg.reload(); pg.wait_for_timeout(1200); pg.click("#start"); pg.wait_for_timeout(400)
    krav(pg.evaluate("__bris.S.egna.length === 1 && __bris.S.eget === 'KVÄLLSLJUS' && !__bris.S.motion"), "egna ljud, valt ljud och MOTION OFF finns kvar efter omladdning")
    pg.click("#menuBtn"); pg.wait_for_timeout(300)
    pg.click("#list .egna .bort"); pg.click("#list .egna .bort"); pg.wait_for_timeout(200)
    krav(pg.evaluate("__bris.S.egna.length === 0 && !document.querySelector('#list .egna') && JSON.parse(localStorage.getItem('blonda-bris-v1-egna')).length === 0"),
         "ta bort ett eget ljud (två tryck)")
    pg.click("#mfoot button:has-text('MOTION OFF')")
    pg.close(); bl.close()

    def blomma(bl, foto, med):
        pg = bl.new_page(viewport={"width": 900, "height": 700})
        pg.goto(URL); pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(900)   # typsnittet ändrar scenens storlek
        pg.evaluate("document.querySelector('#start').classList.remove('show')")
        if not med: pg.evaluate(f"BRIS_DATA.blommor['{foto}'].lager = null")
        i = pg.evaluate(f"BRIS_DATA.presets.findIndex(p => BRIS_DATA.plants[p.plant].photo === '{foto}')")
        pg.evaluate(f"__bris.selectPreset({i})")
        pg.wait_for_function("__bris.flower.klar()", timeout=15000)
        pg.evaluate("__bris.flower.frys(12.5)"); pg.wait_for_timeout(1300)   # bakgrundens färg tonar över på 0,8 s
        bild = np.asarray(Image.open(io.BytesIO(pg.locator("#stage").screenshot())).convert("RGB"), np.int16)
        pg.close()
        return bild
    for webgl in (True, False):
        bl = p.chromium.launch(args=[] if webgl else ["--disable-webgl", "--disable-3d-apis"])
        for foto in [k for k, v in D["blommor"].items() if v.get("lager")]:
            a, b2 = blomma(bl, foto, True), blomma(bl, foto, False)
            dd = np.abs(a - b2).max(axis=2)
            # WebGL: exakt (avrundning). 2D (reserven): webbläsaren skalar ner de två lagren var för sig, så längs kanten
            # där ett främre blad ligger över ett bakre blir enstaka pixlar lite annorlunda; mest i de nya blommorna med
            # stark kontrast mellan bladen (t.ex. gult över rosa). Ytterkanten ska vara exakt (masken är hel där).
            ok = dd.max() <= 2 if webgl else (dd.max() <= 24 and (dd > 2).mean() < 0.005)
            krav(ok and b2.std() > 20, f"lager {foto} ({'WebGL' if webgl else '2D'}): blomman i lager = blomman (största skillnad {int(dd.max())}, {int((dd > 2).sum())} px, kontrast {b2.std():.0f})")
            if not ok: Image.fromarray(np.clip(dd * 20, 0, 255).astype(np.uint8)).save(f"{UT}/lagerfel_{foto}_{'gl' if webgl else '2d'}.png")
        bl.close()
print("ALLT OK" if not fel else f"{len(fel)} FEL")
sys.exit(1 if fel else 0)
