#!/usr/bin/env python3
"""Testar webbversionen i Chrome (Playwright): inga fel i konsolen, ljudet startar, frasen spelar och växten reagerar,
alla växter går att välja. Skärmdumpar till dist/skärmdumpar/.   python3 tester/webb_test.py [dist/web]"""
import http.server, os, socketserver, sys, threading, json
from playwright.sync_api import sync_playwright

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
            for t in ["osc", "filter", "amp", "mod", "fx"]:
                pg.click(f"#tabs button[data-tab={t}]"); pg.wait_for_timeout(300)
                pg.screenshot(path=f"{UT}/flik_{t}.png")
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
            pg.mouse.up(); pg.wait_for_timeout(100)
            krav(pg.evaluate("__bris.S.glid.v") == 0 and pg.evaluate("__bris.S.glid.sent") == 0, "glidet går tillbaka när tangenten släpps")
            pg.click("#kbar .opt[data-m='2']")
            krav(pg.evaluate("__bris.S.glid.m") == 2, "välja VIBRATO i raden ovanför tangenterna")
            o0 = pg.evaluate("__bris.S.oct"); pg.mouse.click(kb["x"] + 10, kb["y"] + kb["height"] * 0.12)
            krav(pg.evaluate("__bris.S.oct") == o0 + 1, "oktav upp med + vid tangenterna")
        else:
            pg.evaluate("__bris.note(60, 100)"); pg.wait_for_timeout(1500)
            pg.screenshot(path=f"{UT}/{namn}.png", full_page=False)
            # allt syns utan att skrolla, på alla flikar
            for t in ["play", "osc", "filter", "amp", "mod", "fx"]:
                pg.evaluate(f"__bris.tab('{t}')"); pg.wait_for_timeout(150)
                ut = pg.evaluate("""(() => { const H = innerHeight, W = innerWidth; const bad = [];
                    for (const e of document.querySelectorAll('#app header, #tabs2, .panel *, #keys, #kbar *')) { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
                      const r = e.getBoundingClientRect(); if (r.width && r.height && (r.bottom > H + 1 || r.right > W + 1 || r.top < -1)) bad.push((e.className || e.id || e.tagName) + ':' + Math.round(r.bottom)); }
                    const st = document.querySelector('#stage').getBoundingClientRect();
                    return { bad: bad.slice(0, 4), stage: Math.round(st.height) }; })()""")
                krav(not ut["bad"], f"{namn} {t}: allt syns ({ut['bad']})")
                krav(ut["stage"] >= (180 if t == "play" else 60) or namn == "auv3_lag", f"{namn} {t}: blomman får plats ({ut['stage']} px)")
                if t in ("play", "mod"): pg.screenshot(path=f"{UT}/{namn}_{t}.png")
            pg.evaluate("__bris.off(60)")
        krav(not logs, f"{namn}: inga fel i konsolen" + ("" if not logs else ": " + " | ".join(logs[:5])))
        ctx.close()
    b.close()
print("ALLT OK" if not fel else f"{len(fel)} FEL")
sys.exit(1 if fel else 0)
