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
    for namn, vp, mobil in [("dator", (1670, 940), False), ("ipad_staende", (820, 1180), True), ("iphone", (393, 852), True), ("auv3_lag", (1024, 360), False)]:
        ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, device_scale_factor=2, has_touch=mobil)
        pg = ctx.new_page()
        logs = []
        pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
        pg.goto(URL); pg.wait_for_timeout(1200)
        pg.click("#start"); pg.wait_for_timeout(600)
        if namn == "dator":
            krav(pg.evaluate("Bridge.running"), "ljudet startar efter tryck")
            pg.evaluate("__bris.setPlaying(true)"); pg.wait_for_timeout(2500)
            s = pg.evaluate("__bris.S.m")
            krav(s["step"] >= 0, f"frasen spelar (steg {s['step']})")
            krav(s["nc"] > 0, f"toner räknas ({s['nc']})")
            krav(s["env"] > 0.01 or s["pk"] > 0.01, f"ljud kommer ut (env {s['env']:.3f}, peak {s['pk']:.3f})")
            pg.screenshot(path=f"{UT}/{namn}_spelar.png")
            pg.evaluate("__bris.setPlaying(false)")
            # alla växter
            for pi, pl in enumerate(D["plants"]):
                first = next(i for i in D["order"] if D["presets"][i]["plant"] == pi)
                pg.evaluate(f"__bris.selectPreset({first})"); pg.wait_for_timeout(250)
                pg.evaluate("__bris.setPlaying(true)"); pg.wait_for_timeout(1300)
                pg.screenshot(path=f"{UT}/vaxt_{pi:02d}_{pl['id']}.png")
                pg.evaluate("__bris.setPlaying(false)")
                acc = pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--a').trim()")
                krav(acc.lower() == pl["color"].lower(), f"växt {pl['id']}: färg {acc}")
            # flikarna
            for t in ["osc", "filter", "mod", "fx"]:
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
            pg.click("#vKeys"); pg.wait_for_timeout(300)
            kb = pg.locator("#keys canvas").bounding_box()
            pg.mouse.move(kb["x"] + 70, kb["y"] + kb["height"] * 0.8); pg.mouse.down(); pg.wait_for_timeout(500)
            s = pg.evaluate("__bris.S.m"); pg.screenshot(path=f"{UT}/tangenter.png"); pg.mouse.up()
            krav(s["mask"] != 0, f"tangent spelar en röst (mask {s['mask']})")
            pg.click("#vRoll")
        else:
            pg.evaluate("__bris.setPlaying(true)"); pg.wait_for_timeout(1500)
            pg.screenshot(path=f"{UT}/{namn}.png", full_page=False)
            pg.evaluate("__bris.setPlaying(false)")
        krav(not logs, f"{namn}: inga fel i konsolen" + ("" if not logs else ": " + " | ".join(logs[:5])))
        ctx.close()
    b.close()
print("ALLT OK" if not fel else f"{len(fel)} FEL")
sys.exit(1 if fel else 0)
