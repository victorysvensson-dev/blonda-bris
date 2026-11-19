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
    VYER = [("dator", (1670, 940), False), ("ipad_staende", (820, 1180), True), ("ipad13_staende", (1032, 1376), True), ("ipad_liggande", (1180, 820), True), ("iphone", (393, 852), True), ("iphone_se", (375, 667), True), ("iphone_liggande", (852, 393), True), ("auv3_lag", (1024, 360), False)]
    if os.environ.get("BRIS_VY"):   # felsökning: bara några storlekar, t.ex. BRIS_VY=dator
        VYER = [v for v in VYER if v[0] in os.environ["BRIS_VY"].split(",")]
    for namn, vp, mobil in VYER:
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
            # det vanliga ljuset är borttaget (1.10): att spela ritar inget ljus i det vanliga läget
            kb = pg.locator("#keys canvas").bounding_box()
            def ljusbild():   # ljusets duk som bild (toDataURL, så att sidan inte varnar för upprepade läsningar)
                import base64
                u = pg.evaluate("document.querySelector('#ljus') ? document.querySelector('#ljus').toDataURL('image/png') : ''")
                if not u: return np.zeros((2, 2, 4), np.int16)
                return np.asarray(Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert("RGBA"), np.int16)
            pg.mouse.move(kb["x"] + kb["width"] * 0.47, kb["y"] + kb["height"] * 0.85); pg.mouse.down(); pg.wait_for_timeout(400)
            krav(int(ljusbild()[..., 3].max()) == 0, "vanliga läget: inget ljus när man spelar")
            pg.mouse.up(); pg.wait_for_timeout(300)
            krav(pg.locator("#mfoot button:has-text('LIGHT')").count() == 0, "vanliga läget: LIGHT finns inte i menyn")
            # den hemliga patchen: fem tryck på versionen låser upp KRISTALL och byter till glasscenen
            p0 = pg.evaluate("__bris.S.preset")
            krav(pg.locator("#list .grp.hemlig").count() == 0, "KRISTALL syns inte i listan förrän den är upplåst")
            pg.evaluate("for (let i = 0; i < 4; i++) document.querySelector('#ver').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))")
            krav(not pg.evaluate("__bris.S.hemliga.includes('kristall')"), "fyra tryck på versionen låser inte upp")
            pg.evaluate("document.querySelector('#ver').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))")
            pg.wait_for_function("__bris.kristall() && __bris.kristall().klar()", timeout=15000); pg.wait_for_timeout(300)
            kr = pg.evaluate("""({ kr: __bris.S.secret === 'kristall', hem: __bris.S.hemliga.includes('kristall'), cls: document.documentElement.classList.contains('h-kristall'),
                preset: __bris.S.preset, ljud: BRIS_DATA.hemliga.find((h) => h.id === 'kristall').ljud, gl: __bris.kristall().webgl,
                cv: getComputedStyle(document.querySelector('#kristall')).display, blomma: getComputedStyle(document.querySelector('#fGl')).visibility,
                bg: getComputedStyle(document.body).backgroundColor, namn: document.querySelector('.browser .nm').textContent })""")
            krav(kr["kr"] and kr["hem"] and kr["cls"] and kr["preset"] == kr["ljud"] and kr["cv"] == "block" and kr["blomma"] == "hidden" and "KRISTALL" in kr["namn"], f"fem tryck: KRISTALL väljs, mörkt läge, glasscenen i stället för blomman ({kr})")
            krav(kr["gl"], "glasscenen ritas med WebGL")
            m0 = pg.evaluate("__bris.kristall().matt()")
            pg.screenshot(path=f"{UT}/kristall_tom.png")
            # spela längst till vänster (lila) och längst till höger (bärnsten): scenen lyser upp på olika sätt
            def spela(n, ms=500):
                pg.evaluate(f"__bris.note({n}, 110)"); pg.wait_for_timeout(ms)
                m = pg.evaluate("__bris.kristall().matt()"); lb = ljusbild()
                return m, lb
            mv, lbv = spela(48)   # C3, lila, till vänster
            pg.screenshot(path=f"{UT}/kristall_vanster.png")
            pg.evaluate("__bris.off(48)"); pg.wait_for_timeout(1600)
            mt = pg.evaluate("__bris.kristall().matt()")
            mh, lbh = spela(81)   # A5, bärnsten, till höger
            pg.evaluate("__bris.off(81)"); pg.wait_for_timeout(1600)
            krav(mv["ljus"] > m0["ljus"] * 1.15 and mh["ljus"] > m0["ljus"] * 1.15, f"glasscenen lyser upp när man spelar ({m0} -> {mv}, {mh})")
            krav(mh["varm"] > mv["varm"] + 2, f"en bärnstenston lyser varmare än en lila ({mv['varm']:.1f} / {mh['varm']:.1f})")
            krav(abs(mt["ljus"] - m0["ljus"]) < 1.5, f"glasscenen släcks när tonen släpps ({m0['ljus']:.1f} / {mt['ljus']:.1f})")
            def stralar(lb):
                a = lb[..., 3] > 20
                return dict(n=int(a.sum()), lila=int((a & (lb[..., 2] > lb[..., 0] + 30)).sum()), barn=int((a & (lb[..., 0] > lb[..., 2] + 30)).sum()),
                            x=float(np.nonzero(a)[1].mean() / lb.shape[1]) if a.any() else -1)
            sv, sh = stralar(lbv), stralar(lbh)
            krav(sv["lila"] > 1000 and sv["barn"] < sv["lila"] * 0.1 and sh["barn"] > 1000 and sv["x"] < 0.4 and sh["x"] > 0.6, f"strålarna kommer ur tangenten i tonens färg ({sv}, {sh})")
            pg.wait_for_function("__bris.ljus().tomt", timeout=5000)   # ljuset klingar av på ca 1,5 s
            krav(int(ljusbild()[..., 3].max()) == 0, "strålarna släcks helt när tonen släpps")
            # ett ackord över hela tangentbordet, som på bilden
            for n in (52, 60, 65, 72, 81): pg.evaluate(f"__bris.note({n}, 100)")
            pg.wait_for_timeout(700); pg.screenshot(path=f"{UT}/kristall_ackord.png")
            for n in (52, 60, 65, 72, 81): pg.evaluate(f"__bris.off({n})")
            pg.wait_for_timeout(300)
            # med arpen igång följer ljuset arpen: en ton i taget, de hållna tangenterna lyser svagt
            pg.evaluate("__bris.setParam('arp', 1, true)")
            for n in (60, 64, 67): pg.evaluate(f"__bris.note({n}, 100)")
            pg.wait_for_function("[60, 64, 67].every((n) => __bris.keys.held && __bris.keys.held.has(n))", timeout=5000)   # mätarna visar ackordet
            pg.wait_for_timeout(300)
            prov = []
            for i in range(24):
                prov.append(pg.evaluate("({ v: Object.fromEntries([...__bris.ljus().v]), k: Object.fromEntries([...__bris.keys.lvl]) })")); pg.wait_for_timeout(90)
            starkast = [max(p_["v"], key=lambda n: p_["v"][n]) for p_ in prov if p_["v"]]
            alla = sum(1 for p_ in prov if all(p_["v"].get(str(n), 0) >= 0.9 for n in (60, 64, 67)))
            svag = min(min(p_["k"].get(str(n), 0) for n in (60, 64, 67)) for p_ in prov)
            if svag < 0.3: print("  (tangenternas nivå:", [p_["k"] for p_ in prov if min(p_["k"].get(str(n), 0) for n in (60, 64, 67)) < 0.3][:3], ")")
            krav(len(set(starkast)) >= 2 and alla == 0 and svag >= 0.3, f"KRISTALL + ARP: ljuset följer arpen (starkast {starkast}, alla tre fullt {alla} gånger, svagast {svag:.2f})")
            pg.screenshot(path=f"{UT}/kristall_arp.png")
            pg.evaluate("__bris.setParam('arp', 0, true)"); pg.wait_for_timeout(700)
            v = pg.evaluate("Object.fromEntries([...__bris.ljus().v])")
            krav(all(v.get(str(n), 0) >= 0.9 for n in (60, 64, 67)), f"ARP av: de hållna tonerna lyser igen ({v})")
            for n in (60, 64, 67): pg.evaluate(f"__bris.off({n})")
            pg.wait_for_function("__bris.ljus().tomt", timeout=5000)
            pg.click("#menuBtn"); pg.wait_for_timeout(300)
            krav(pg.locator("#list .grp.hemlig .it.on").count() == 1, "menyn: SECRET · KRISTALL överst och vald")
            pg.screenshot(path=f"{UT}/kristall_meny.png")
            pg.click("#list .grp:not(.hemlig):not(.egna) .it >> nth=0"); pg.wait_for_timeout(500)
            ut = pg.evaluate("({ kr: __bris.S.secret === 'kristall', cls: document.documentElement.classList.contains('h-kristall'), cv: getComputedStyle(document.querySelector('#kristall')).display, blomma: getComputedStyle(document.querySelector('#fGl')).visibility, hem: __bris.S.hemliga.includes('kristall') })")
            krav(not ut["kr"] and not ut["cls"] and ut["cv"] == "none" and ut["blomma"] != "hidden" and ut["hem"], f"ett annat ljud lämnar KRISTALL (förblir upplåst) ({ut})")
            pg.click("#list .grp.hemlig .it[data-hem=kristall]"); pg.wait_for_timeout(300)
            krav(pg.evaluate("__bris.S.secret === 'kristall'"), "KRISTALL kan väljas igen i menyn")
            pg.click("#menuClose"); pg.wait_for_timeout(200)
            pg.click(".browser .arr >> nth=1"); pg.wait_for_timeout(300)
            krav(not pg.evaluate("__bris.S.secret === 'kristall'"), "pilen till nästa ljud lämnar KRISTALL")
            pg.evaluate(f"__bris.selectPreset({p0})"); pg.wait_for_timeout(300)
            # tonföljderna: B-A-D-A låser upp SJÖN, D-E-C-A-D-E KASSETTEN (fel följd låser inte upp)
            def spela_foljd(toner, ms=260):
                for n in toner:
                    pg.evaluate(f"__bris.note({n}, 100)"); pg.wait_for_timeout(ms); pg.evaluate(f"__bris.off({n})"); pg.wait_for_timeout(120)
                pg.wait_for_timeout(500)
            # appen lyssnar bara efter fem tryck på BLONDA, och bara en kort stund
            def lyssna():
                pg.evaluate("for (let i = 0; i < 5; i++) document.querySelector('header .logo').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))")
            krav(pg.evaluate("document.querySelectorAll('header .logo span').length") == 6, "BLONDA: bokstäverna var för sig")
            pg.click("[data-tab=fx]"); pg.wait_for_timeout(300)
            krav(pg.locator(".fxrad:has-text('TAPE')").count() == 0 and pg.locator(".fxrad").count() == 2, "FX: kedjan utan TAPE innan KASSETTEN är hittad")
            pg.click("[data-tab=play]"); pg.wait_for_timeout(200)
            spela_foljd([71, 69, 62, 69])
            krav(not pg.evaluate("__bris.S.hemliga.includes('sjon')") and pg.evaluate("__bris.S.secret") is None, "B-A-D-A utan att appen lyssnar låser inte upp")
            pg.evaluate("for (let i = 0; i < 4; i++) document.querySelector('header .logo').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))")
            krav(not pg.evaluate("__bris.lyssnar()"), "fyra tryck på BLONDA: lyssnar inte")
            pg.wait_for_timeout(3200)
            lyssna()
            ly = pg.evaluate("({ l: __bris.lyssnar(), c: document.querySelector('header .logo').classList.contains('lyssnar'), a: getComputedStyle(document.querySelector('header .logo span')).animationName })")
            krav(ly["l"] and ly["c"] and ly["a"] == "lyssna", f"fem tryck på BLONDA: appen lyssnar och bokstäverna rör sig ({ly})")
            pg.wait_for_timeout(1300)
            nd = pg.evaluate("({ t: document.querySelector('#nedrakning').textContent, o: +getComputedStyle(document.querySelector('#nedrakning')).opacity })")
            krav(nd["t"] in ("3", "4") and nd["o"] > 0.5, f"nedräkningen bredvid BLONDA räknar ner ({nd})")
            pg.screenshot(path=f"{UT}/lyssnar.png", clip={"x": 0, "y": 0, "width": 400, "height": 90})
            pg.wait_for_timeout(5600)
            krav(not pg.evaluate("__bris.lyssnar()") and not pg.evaluate("document.querySelector('header .logo').classList.contains('lyssnar')"), "lyssnandet slutar efter ca 5 s")
            pg.wait_for_timeout(400)
            krav(float(pg.evaluate("getComputedStyle(document.querySelector('#nedrakning')).opacity")) < 0.05, "nedräkningen försvinner när lyssnandet slutar")
            lyssna()
            spela_foljd([59, 57, 62, 60])
            krav(not pg.evaluate("__bris.S.hemliga.includes('sjon')") and pg.evaluate("__bris.S.secret") is None, "fel tonföljd (B-A-D-C) låser inte upp")
            mo0 = pg.evaluate("__bris.S.v.mowet")
            spela_foljd([71, 69, 62, 69])   # B-A-D-A i en annan oktav (lyssnandet hölls öppet av tonerna)
            sj = pg.evaluate("""({ s: __bris.S.secret, upp: __bris.S.hemliga.includes('sjon'), mowet: __bris.S.v.mowet, cut: __bris.S.v.cut,
                preset: __bris.S.preset, ljud: BRIS_DATA.hemliga.find((h) => h.id === 'sjon').ljud,
                cv: getComputedStyle(document.querySelector('#sjon')).display, blomma: getComputedStyle(document.querySelector('#fGl')).visibility,
                skylt: document.querySelector('#hemskylt') ? document.querySelector('#hemskylt').textContent : '',
                syns: document.querySelector('#hemskylt') && document.querySelector('#hemskylt').classList.contains('syns') })""")
            krav(sj["s"] == "sjon" and sj["upp"] and sj["mowet"] == 1 and abs(sj["cut"] - 0.52) < 1e-9 and sj["preset"] == sj["ljud"] and sj["cv"] == "block" and sj["blomma"] == "hidden",
                 f"B-A-D-A låser upp och väljer SJÖN (ljud, MOOD-rummet, vattnet) ({sj})")
            krav(sj["syns"] and "SJÖN" in sj["skylt"] and "SECRET 02" in sj["skylt"], f"skylten visar SECRET 02 · SJÖN ({sj['skylt']})")
            krav("SJÖN · MÅNVATTEN" in pg.evaluate("document.querySelector('.browser .nm').textContent") and not pg.evaluate("__bris.lyssnar()"), "SJÖN spelar sitt eget ljud (MÅNVATTEN), och lyssnandet slutar")
            pg.wait_for_timeout(2600)
            m0 = pg.evaluate("__bris.scen('sjon').matt()")
            for n in (52, 64, 76): pg.evaluate(f"__bris.note({n}, 100)"); pg.wait_for_timeout(150)
            pg.wait_for_timeout(450)
            m1 = pg.evaluate("__bris.scen('sjon').matt()")
            pg.screenshot(path=f"{UT}/sjon_droppar.png")
            for n in (52, 64, 76): pg.evaluate(f"__bris.off({n})")
            krav(m1["droppar"] >= m0["droppar"] + 3 and m1["vatten"] > m0["vatten"] * 1.03, f"SJÖN: varje ton släpper en droppe och ringarna syns ({m0} -> {m1})")
            pg.evaluate("__bris.setParam('arp', 1, true)")
            for n in (60, 64, 67): pg.evaluate(f"__bris.note({n}, 100)")
            d0 = pg.evaluate("__bris.scen('sjon').matt().droppar"); pg.wait_for_timeout(1500); d1 = pg.evaluate("__bris.scen('sjon').matt().droppar")
            pg.screenshot(path=f"{UT}/sjon_regn.png")
            for n in (60, 64, 67): pg.evaluate(f"__bris.off({n})")
            pg.evaluate("__bris.setParam('arp', 0, true)")
            krav(d1 >= min(24, d0 + 3), f"SJÖN + ARP: arpens slag blir regn ({d0} -> {d1} droppar)")
            # stjärnfall: syns en kort stund (och kommer av sig självt då och då)
            pg.evaluate("__bris.scen('sjon').stjarnfall()"); pg.wait_for_timeout(250)
            sf1 = pg.evaluate("__bris.scen('sjon').lage().sf"); pg.screenshot(path=f"{UT}/sjon_stjarnfall.png"); pg.wait_for_timeout(1500)
            krav(sf1 and not pg.evaluate("__bris.scen('sjon').lage().sf"), "SJÖN: ett stjärnfall syns en kort stund")
            # fem tryck på månen: dag (månen går ner, solen stiger); himlen blir ljus. Fem tryck på solen: natt igen.
            natt = pg.evaluate("__bris.scen('sjon').matt()")
            # trycken skickas som pekarhändelser där månen är (som riktiga tryck, men i en följd: i CI kan bildrutorna
            # vara så långsamma att riktiga musklick kommer för glest)
            tryck = lambda k, n: pg.evaluate(f"""(() => {{ const [x, y] = __bris.scen('sjon').plats(); const e = document.elementFromPoint(x, y);
                for (let i = 0; i < {n}; i++) e.dispatchEvent(new PointerEvent('pointerdown', {{ bubbles: true, clientX: x, clientY: y }})); }})()""")
            # fyra tryck, läget, och det femte i samma anrop: trycken räknas bara inom 1,2 s från varandra, och i CI kan
            # varje anrop vänta på en långsam bildruta
            fyra = pg.evaluate("""(() => { const [x, y] = __bris.scen('sjon').plats(); const e = document.elementFromPoint(x, y);
                const t = () => e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }));
                for (let i = 0; i < 4; i++) t(); const mal = __bris.scen('sjon').lage().mal; t(); return mal; })()""")
            krav(fyra == 0, "SJÖN: fyra tryck på månen gör inget")
            pg.wait_for_timeout(1500)
            l1 = pg.evaluate("__bris.scen('sjon').lage()")
            krav(l1["mal"] == 1 and 0.05 < l1["p"] < 0.4 and l1["dag"] < 0.01, f"SJÖN: fem tryck på månen: det börjar bli dag, gradvis ({l1})")
            pg.evaluate("__bris.scen('sjon').dag(true, true)"); pg.wait_for_timeout(300)
            dag = pg.evaluate("__bris.scen('sjon').matt()"); pg.screenshot(path=f"{UT}/sjon_dag.png")
            krav(dag["himmel"] > natt["himmel"] * 4 and dag["vatten"] > natt["vatten"] * 3, f"SJÖN: dag – ljus himmel och sjö ({natt} -> {dag})")
            tryck("sol", 5); pg.wait_for_timeout(200)
            krav(pg.evaluate("__bris.scen('sjon').lage().mal") == 0, "SJÖN: fem tryck på solen gör natt igen")
            pg.evaluate("__bris.scen('sjon').dag(false, true)")
            # KASSETTEN
            lyssna(); spela_foljd([62, 64, 60, 57, 62, 64])
            ka = pg.evaluate("""({ s: __bris.S.secret, upp: __bris.S.hemliga, tape: __bris.S.v.tape, media: __bris.S.v.tamedia, mowet: __bris.S.v.mowet,
                preset: __bris.S.preset, ljud: BRIS_DATA.hemliga.find((h) => h.id === 'kassett').ljud,
                cv: getComputedStyle(document.querySelector('#kassett')).display, sjon: getComputedStyle(document.querySelector('#sjon')).display,
                namn: document.querySelector('.browser .nm').textContent })""")
            krav(ka["s"] == "kassett" and ka["tape"] == 1 and ka["media"] == 0 and ka["preset"] == ka["ljud"] and ka["cv"] == "block" and ka["sjon"] == "none" and "KASSETTEN · VARM 106" in ka["namn"],
                 f"D-E-C-A-D-E låser upp och väljer KASSETTEN (bandet på, kassett) ({ka}, senaste toner {pg.evaluate('__bris.melodi()')})")
            krav(ka["mowet"] == mo0, f"att byta från SJÖN sätter tillbaka MOOD ({mo0} / {ka['mowet']})")
            pg.wait_for_function("__bris.scen('kassett').klar()", timeout=10000)
            # bandspelaren: stilla tills man trycker; VU-nålarna visar nivån på bandet
            a0 = pg.evaluate("__bris.scen('kassett').matt()")
            krav(abs(a0["fart"]) < 1e-6 and pg.evaluate("__bris.S.m.bl") == 0, f"KASSETTEN: bandet står still från början ({a0['fart']})")
            def knapp(namn, vanta=250):
                k = pg.evaluate(f"__bris.scen('kassett').plats('knapp', '{namn}')"); pg.mouse.click(k[0], k[1]); pg.wait_for_timeout(vanta)
                return pg.evaluate("({ bl: __bris.S.m.bl, bf: __bris.S.m.bf, bp: __bris.S.m.bp, bs: __bris.S.m.bs, scen: __bris.scen('kassett').matt() })")
            nal0 = pg.evaluate("__bris.scen('kassett').matt().nal")
            k1 = knapp("rec", 100)
            for n in (48, 55, 60, 64, 67): pg.evaluate(f"__bris.note({n}, 120)")
            pg.wait_for_timeout(1500); a2 = pg.evaluate("({ m: __bris.scen('kassett').matt(), bl: __bris.S.m.bl, bs: __bris.S.m.bs })")
            pg.screenshot(path=f"{UT}/kassett_rec.png")
            for n in (48, 55, 60, 64, 67): pg.evaluate(f"__bris.off({n})")
            krav(a2["bl"] == 2 and a2["bs"] > 1.0 and a2["m"]["fart"] > 0.95, f"REC: bandet går och spelar in ({a2['bl']}, {a2['bs']:.2f} s, fart {a2['m']['fart']:.2f})")
            krav(a2["m"]["nal"][0] > nal0[0] + 8 and a2["m"]["nal"][1] > nal0[1] + 8, f"KASSETTEN: VU-nålarna slår ut när man spelar in ({nal0} -> {a2['m']['nal']})")
            dv, dh = a2["m"]["vinkel"][0] - a0["vinkel"][0], a2["m"]["vinkel"][1] - a0["vinkel"][1]
            krav(dv > 0.3 and dh > dv * 1.2, f"KASSETTEN: spolarna snurrar, den tunna (högra) fortare ({dv:.2f} / {dh:.2f} rad)")
            pg.wait_for_timeout(1500)
            k2 = knapp("stop", 300)
            # bromsen tar ca en halv sekund ljudtid; i en långsam webbläsare kan ljudet ligga efter klockan, så vänta på läget
            try: pg.wait_for_function("__bris.S.m.bl === 0 && Math.abs(__bris.S.m.bf) < 0.01", timeout=3000)
            except Exception: pass
            k2 = pg.evaluate("({ bl: __bris.S.m.bl, bf: __bris.S.m.bf })")
            krav(k2["bl"] == 0 and abs(k2["bf"]) < 0.01, f"STOP: bandet stannar ({k2['bl']}, fart {k2['bf']:.3f})")
            k3 = knapp("rew", 500)
            krav(k3["bl"] == 3 and k3["bf"] < -2, f"REW: spolar tillbaka ({k3['bl']}, fart {k3['bf']:.2f})")
            pg.wait_for_function("__bris.S.m.bl === 0", timeout=6000)
            krav(pg.evaluate("__bris.S.m.bp") < 1e-4, f"REW: stannar av sig själv vid början ({pg.evaluate('__bris.S.m.bp')})")
            # uppspelningen hörs: nivån ut utan att man spelar något
            k4 = knapp("play", 900)
            pk = pg.evaluate("__bris.S.m.pk")
            krav(k4["bl"] == 1 and pk > 0.05, f"PLAY: det inspelade spelas upp (läge {k4['bl']}, nivå {pk:.3f})")
            k5 = knapp("paus", 700); p5 = pg.evaluate("__bris.S.m.bp"); pg.wait_for_timeout(300)
            krav(k5["bl"] == 9 and abs(pg.evaluate("__bris.S.m.bp") - p5) < 1e-6, f"PAUSE: bandet står still ({k5['bl']})")
            k6 = knapp("paus", 400)
            krav(k6["bl"] == 1, f"PAUSE igen: bandet går ({k6['bl']})")
            k7 = knapp("ff", 600)
            krav(k7["bl"] == 4 and k7["bf"] > 2 and k7["scen"]["fart"] > 2, f"FF: spolar framåt, spolarna snurrar fort ({k7['bf']:.2f})")
            knapp("stop", 600)
            def vrid(i, dy):
                r = pg.evaluate(f"__bris.scen('kassett').plats('ratt', {i})"); pg.mouse.move(r[0], r[1]); pg.mouse.down()
                pg.mouse.move(r[0], r[1] + dy, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
            s0, o0 = pg.evaluate("[__bris.S.v.tarec, __bris.S.v.taoutv]")
            vrid(0, -60); vrid(1, 45)
            s1, o1 = pg.evaluate("[__bris.S.v.tarec, __bris.S.v.taoutv]")
            krav(abs(s1 - min(1.0, s0 + 60 / 180)) < 0.03 and abs(o1 - max(0.0, o0 - 45 / 180)) < 0.03, f"rattarna vrids: REC LEVEL upp ({s0:.2f} -> {s1:.2f}), OUTPUT ned ({o0:.2f} -> {o1:.2f})")
            # banden: TAPE till höger på PLAY med banden och WEAR, WOW, NOISE; byta band ställer in bandet
            pt = pg.evaluate("({ rt: document.querySelector('.rbox .ttl').textContent, band: [...document.querySelectorAll('.rbox .choice.band .opt')].map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')) })")
            krav(pt["rt"].startswith("TAPE") and pt["band"][0] == "TYPE I*" and len(pt["band"]) == 6, f"KASSETTEN: TAPE med banden till höger ({pt})")
            pg.click(".rbox .choice.band .opt:has-text('METAL')"); pg.wait_for_timeout(300)
            bm = pg.evaluate("({ band: __bris.S.band, wow: __bris.S.v.tawow, brus: __bris.S.v.tabrus, scen: __bris.scen('kassett').matt() })")
            krav(bm["band"] == 2 and abs(bm["wow"] - 0.15) < 1e-9 and abs(bm["brus"] - 0.12) < 1e-9 and bm["scen"]["byte"] >= 0 and bm["scen"]["typ"] == "lucka", f"byta band (METAL): bandet ställs in och kassetten byts med luckan ({bm})")
            mitt = []
            for i in range(12):
                mitt.append(pg.evaluate("__bris.scen('kassett').matt()")); pg.wait_for_timeout(180)
            pg.wait_for_timeout(600)
            krav(max(m_["lucka"] for m_ in mitt) > 0.9 and max(m_["ut"] for m_ in mitt) > 0.5 and pg.evaluate("__bris.scen('kassett').matt().band") == "METAL",
                 f"kassetten: luckan öppnas, bandet byts (lucka {max(m_['lucka'] for m_ in mitt):.2f}, ut {max(m_['ut'] for m_ in mitt):.2f})")
            pg.screenshot(path=f"{UT}/kassett_metal.png")
            # tryck mitt på kassetten (luckan till vänster i bandspelaren) = nästa band
            hit = pg.evaluate("__bris.scen('kassett').plats('lucka')")
            if hit: pg.mouse.click(hit[0], hit[1]); pg.wait_for_timeout(300)
            krav(hit is not None and pg.evaluate("__bris.S.band") == 3, f"tryck på kassetten: nästa band (WORN) ({pg.evaluate('__bris.S.band')})")
            pg.wait_for_timeout(2600)
            # VHS: hela fronten fälls ut, VHS-bandet (lika stort som bandspelaren) åker in underifrån, fronten stängs
            pg.click(".rbox .choice.band .opt:has-text('VHS')")
            mitt = []
            for i in range(16):
                mitt.append(pg.evaluate("__bris.scen('kassett').matt()"))
                if i == 7: pg.screenshot(path=f"{UT}/kassett_vhs_oppen.png")
                pg.wait_for_timeout(170)
            pg.wait_for_timeout(900)
            slut = pg.evaluate("__bris.scen('kassett').matt()")
            mf, mv = max(m_["front"] for m_ in mitt), min(m_["vhsUt"] for m_ in mitt[:10])
            krav(mitt[2]["typ"] == "front" and mf > 0.9 and slut["modell"] == "vhs" and slut["front"] == 0 and slut["vhsUt"] == 0 and slut["byte"] < 0,
                 f"VHS: fronten fälls ut, VHS-bandet åker in och fronten stängs (front {mf:.2f}, {slut['modell']}, vhsUt {slut['vhsUt']})")
            pg.screenshot(path=f"{UT}/kassett_vhs.png")
            # FX: kedjan med TAPE (egen rad med av/på), även i vanliga ljud
            pg.click("[data-tab=fx]"); pg.wait_for_timeout(300)
            pg.click(".fxrad:has-text('TAPE') .fxnamn"); pg.wait_for_timeout(300)
            fx = pg.evaluate("""({ kt: document.querySelector('.fxbox .fxttl span').textContent, kn: [...document.querySelectorAll('.fxbox .knob .lab')].map((e) => e.textContent).join(' '),
                band: document.querySelectorAll('.fxbox .choice.band .opt').length, pa: document.querySelector('.fxbox .fxpa').classList.contains('on'),
                rader: [...document.querySelectorAll('.fxrad')].map((r) => r.textContent) })""")
            krav(fx["kt"] == "TAPE" and fx["band"] == 6 and fx["pa"] and "REC LVL" in fx["kn"] and "FLUTTER" in fx["kn"] and len(fx["rader"]) == 3, f"FX: TAPE i kedjan med av/på, banden och rattarna ({fx})")
            pg.screenshot(path=f"{UT}/fx_tape.png")
            pg.click(".fxbox .fxpa"); pg.wait_for_timeout(200)
            av = pg.evaluate("({ tape: __bris.S.v.tape, inn: document.querySelector('.fxbox .fxinn').classList.contains('av'), rad: document.querySelector('.fxrad.vald .fxpa').classList.contains('on') })")
            krav(av["tape"] == 0 and av["inn"] and not av["rad"], f"FX: TAPE av syns (dämpat, OFF i kedjan) ({av})")
            pg.click(".fxrad.vald .fxpa"); pg.wait_for_timeout(200)
            krav(pg.evaluate("__bris.S.v.tape") == 1, "FX: TAPE på igen från kedjan")
            pg.click("[data-tab=play]"); pg.wait_for_timeout(200)
            # NORRSKEN (F-A-D-E), NATTÅGET (B-A-G-G-A-G-E) och ORGELN (B-A-C-H)
            def hemlig(hid, toner, namn, nr):
                lyssna(); spela_foljd(toner)
                h = pg.evaluate(f"""({{ s: __bris.S.secret, preset: __bris.S.preset, ljud: BRIS_DATA.hemliga.find((h) => h.id === '{hid}').ljud,
                    cv: getComputedStyle(document.querySelector('#{hid}')).display, ka: getComputedStyle(document.querySelector('#kassett')).display,
                    nm: document.querySelector('.browser .nm').textContent, skylt: document.querySelector('#hemskylt').textContent }})""")
                krav(h["s"] == hid and h["preset"] == h["ljud"] and h["cv"] == "block" and h["ka"] == "none" and namn in h["nm"] and f"SECRET {nr}" in h["skylt"],
                     f"{namn}: tonföljden låser upp och väljer den (SECRET {nr}) ({h}, senaste toner {pg.evaluate('__bris.melodi()')})")
            def spela_ackord(toner, ms=700):
                for n in toner: pg.evaluate(f"__bris.note({n}, 110)"); pg.wait_for_timeout(90)
                pg.wait_for_timeout(ms)
            def slapp(toner):
                for n in toner: pg.evaluate(f"__bris.off({n})")
            hemlig("norrsken", [65, 69, 62, 64], "NORRSKEN", "04")
            pg.wait_for_timeout(2600)
            n0 = pg.evaluate("__bris.scen('norrsken').matt()")
            spela_ackord([48, 60, 67, 76]); n1 = pg.evaluate("__bris.scen('norrsken').matt()"); pg.screenshot(path=f"{UT}/norrsken.png"); slapp([48, 60, 67, 76])
            krav(n0 and n0["gron"] > 2 and n1["pulser"] >= n0["pulser"] + 3 and n1["himmel"] > n0["himmel"], f"NORRSKEN: grönt norrsken, och tonerna får det att flamma upp ({n0} -> {n1})")
            # ett tryck på sjön lockar fram späckhuggarna (en flock som kommer upp och andas)
            pg.wait_for_function("__bris.scen('norrsken').klar()", timeout=15000)
            sjo = pg.evaluate("[innerWidth * 0.5, innerHeight * 0.6]")   # sjön mellan panelerna, ovanför tangentbordet
            pg.evaluate(f"(() => {{ const e = document.elementFromPoint({sjo[0]}, {sjo[1]}); e.dispatchEvent(new PointerEvent('pointerdown', {{ bubbles: true, clientX: {sjo[0]}, clientY: {sjo[1]} }})); }})()")
            pg.wait_for_timeout(300)
            krav(pg.evaluate("__bris.scen('norrsken').matt().spack"), "NORRSKEN: ett tryck på sjön lockar fram späckhuggarna")
            hemlig("nattag", [71, 69, 67, 67, 69, 67, 64], "NATTÅGET", "05")
            krav(pg.evaluate("__bris.S.v.tape") == 1 and pg.evaluate("__bris.S.m.bl") == 0, "NATTÅGET: bandet på (utan att bandspelaren går)")
            pg.wait_for_timeout(2600)
            t0 = pg.evaluate("__bris.scen('nattag').matt()")
            spela_ackord([50, 62, 69, 78], 300); t1 = pg.evaluate("__bris.scen('nattag').matt()"); pg.screenshot(path=f"{UT}/nattag.png"); slapp([50, 62, 69, 78])
            krav(t0 and t0["varm"] > 0 and t1["ljusen"] >= t0["ljusen"] + 3, f"NATTÅGET: varje ton blir ett ljus som far förbi fönstret ({t0} -> {t1})")
            hemlig("orgel", [70, 69, 72, 71], "ORGELN", "06")
            pg.wait_for_function("__bris.scen('orgel').klar()", timeout=10000); pg.wait_for_timeout(2600)
            o0 = pg.evaluate("__bris.scen('orgel').matt()")
            spela_ackord([41, 53, 60, 69, 77]); o1 = pg.evaluate("__bris.scen('orgel').matt()"); pg.screenshot(path=f"{UT}/orgel.png"); slapp([41, 53, 60, 69, 77])
            krav(o0 and o1["ljus"] > o0["ljus"] * 1.25 and o1["varm"] > o0["varm"], f"ORGELN: piporna lyser upp, varmt, där man spelar ({o0} -> {o1})")
            pg.wait_for_timeout(2500)
            krav(pg.evaluate("__bris.scen('orgel').matt().ljus") < o1["ljus"] * 0.9, "ORGELN: ljuset klingar av när tangenterna släpps")
            # de tre har egna motorer (SLÖJA, STAV, ORGEL): motorn väljs, flikarna visar motorns sidor, pilarna bläddrar
            # bland motorns ljud utan att lämna patchen, och det låter
            # ANALOG (D-E-C-C-G): motorn ONE med alla sina ljud, och ett oscilloskop som visar ljudet
            hemlig("analog", [62, 64, 60, 60, 67], "ANALOG", "07")
            # vänta tills tonföljdens sista ton har klingat ut, så att jämförelsen börjar från en tyst skärm
            try: pg.wait_for_function("__bris.scen('analog').matt().styrka < 0.6", timeout=6000)
            except Exception: pass
            a0 = pg.evaluate("__bris.scen('analog').matt()")
            for n in (45, 57): pg.evaluate(f"__bris.note({n}, 110)")
            pg.wait_for_timeout(900); a1 = pg.evaluate("__bris.scen('analog').matt()"); pg.screenshot(path=f"{UT}/analog.png")
            for n in (45, 57): pg.evaluate(f"__bris.off({n})")
            krav(a1["utslag"] > a0["utslag"] + 0.05 and a1["styrka"] > a0["styrka"] and a1["ton"] and "HZ" in a1["ton"],
                 f"ANALOG: strålen visar vågformen när man spelar, och tonen står i hörnet ({a0} -> {a1})")
            # KÖREN (A-G-E-G-A): motorn KÖR, och kören i kyrkan där varje ton får tre sångare att sjunga
            hemlig("koren", [69, 67, 64, 67, 69], "KÖREN", "08")
            pg.wait_for_timeout(1500)
            for n in (48, 72): pg.evaluate(f"__bris.note({n}, 100)")
            pk = 0
            for _ in range(9): pg.wait_for_timeout(100); pk = max(pk, pg.evaluate("__bris.S.m.pk || 0"))
            k1 = pg.evaluate("__bris.scen('koren').matt()"); pg.screenshot(path=f"{UT}/koren.png")
            for n in (48, 72): pg.evaluate(f"__bris.off({n})")
            krav(pk > 0.05 and k1["sjunger"] == 6, f"KÖREN: kören sjunger, tre sångare per ton (topp {pk:.3f}, {k1})")
            pg.wait_for_timeout(2500)
            k2 = pg.evaluate("__bris.scen('koren').matt()")
            krav(k2["sjunger"] == 0 and k2["ljus"] < k1["ljus"] * 0.5, f"KÖREN: sångarna tystnar när tangenterna släpps ({k2})")
            for hid, mot, flik, namn in (("norrsken", 2, "VEIL", "NORRSKEN"), ("nattag", 3, "TINE", "NATTÅGET"), ("orgel", 1, "STOPS", "ORGELN"), ("koren", 5, "VOICES", "KÖREN"), ("analog", 4, "OSC", "ANALOG")):
                pg.evaluate(f"__bris.valjHemlig('{hid}')"); pg.wait_for_timeout(500)
                r = pg.evaluate("({ m: __bris.S.v.motor, p: __bris.S.preset, tabs: [...document.querySelectorAll('#tabs button')].map((b) => b.textContent) })")
                flikar_ok = r["tabs"] == ["PLAY", "OSC", "FILTER", "AMP", "MOD", "FX", "MOOD", "ARP"] if hid == "analog" else ("MOD" not in r["tabs"] and "OSC" not in r["tabs"])
                krav(r["m"] == mot and r["tabs"][1] == flik and flikar_ok, f"{namn}: motorn {mot} och dess flikar ({r})")
                pg.click(".browser .arr:last-child"); pg.wait_for_timeout(400)
                r2 = pg.evaluate("({ m: __bris.S.v.motor, p: __bris.S.preset, s: __bris.S.secret, nm: document.querySelector('.browser .nm').textContent })")
                krav(r2["s"] == hid and r2["m"] == mot and r2["p"] == r["p"] + 1 and namn in r2["nm"], f"{namn}: pilen ger motorns nästa ljud i patchen ({r2})")
                pg.evaluate("__bris.tab('osc')"); pg.wait_for_timeout(250)
                kn = pg.evaluate("document.querySelectorAll('#left .knob').length")
                krav(kn >= 4, f"{namn}: motorns första sida har rattar ({kn})")
                pg.evaluate("__bris.tab('play')")
                for n in (48, 60, 64): pg.evaluate(f"__bris.note({n}, 100)")
                pk = 0
                for _ in range(8): pg.wait_for_timeout(100); pk = max(pk, pg.evaluate("__bris.S.m.pk || 0"))
                for n in (48, 60, 64): pg.evaluate(f"__bris.off({n})")
                krav(pk > 0.05, f"{namn}: motorn låter (topp {pk:.3f})")
            pg.wait_for_timeout(600)
            pg.click("#menuBtn"); pg.wait_for_timeout(300)
            hm = pg.evaluate("[...document.querySelectorAll('#list .grp.hemlig .it')].map((b) => b.dataset.hem + (b.classList.contains('on') ? '*' : ''))")
            krav(hm == ["kristall", "sjon", "kassett", "norrsken", "nattag", "orgel", "analog*", "koren"], f"menyn: SECRET med alla åtta, ANALOG vald ({hm})")
            pg.screenshot(path=f"{UT}/hemliga_meny.png")
            pg.click("#menuClose"); pg.wait_for_timeout(200)
            pg.evaluate(f"__bris.selectPreset({p0})"); pg.wait_for_timeout(300)
            pg.wait_for_timeout(200)
            ut = pg.evaluate("({ s: __bris.S.secret, tape: __bris.S.v.tape, mowet: __bris.S.v.mowet, cls: document.documentElement.classList.contains('hemlig'), cv: getComputedStyle(document.querySelector('#kassett')).display, motor: __bris.S.v.motor, osc: [...document.querySelectorAll('#tabs button')].some((b) => b.textContent === 'OSC') })")
            krav(ut["motor"] == 0 and ut["osc"], f"ett vanligt ljud tar tillbaka BRIS och dess flikar ({ut})")
            krav(ut["s"] is None and ut["tape"] == 0 and ut["mowet"] == mo0 and not ut["cls"] and ut["cv"] == "none", f"ett vanligt ljud lämnar den hemliga patchen och stänger av bandet ({ut})")
            krav(pg.evaluate("__bris.S.m.bl") == 0, "att lämna KASSETTEN stannar bandspelaren")
            pg.click("[data-tab=fx]"); pg.wait_for_timeout(300)
            krav(pg.evaluate("document.querySelector('.fxbox .fxttl span').textContent") == "TAPE" and pg.locator(".fxrad").count() == 3, "FX: TAPE finns kvar i ett vanligt ljud (KASSETTEN är hittad)")
            pg.click("[data-tab=play]"); pg.wait_for_timeout(200)

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
            # sliden börjar där man trycker: högt upp på tangenten = mer redan från början, nertill = inget
            pg.mouse.move(gx, kb["y"] + kb["height"] * 0.1); pg.mouse.down(); pg.wait_for_timeout(120)
            hog = pg.evaluate("({ v: __bris.S.glid.v, sent: __bris.S.glid.sent, n: [...__bris.keys.down.values()][0].n })")
            pg.mouse.up(); pg.wait_for_timeout(150)
            pg.mouse.move(gx, kb["y"] + kb["height"] * 0.8); pg.mouse.down(); pg.wait_for_timeout(120)
            lag = pg.evaluate("__bris.S.glid.v"); pg.mouse.up(); pg.wait_for_timeout(150)
            krav(hog["v"] > 0.75 and hog["sent"] > 0.75 and hog["n"] == n0 and lag == 0, f"sliden börjar där man trycker (högt upp {hog}, nertill {lag})")
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
        # huvudet: loggan, flikarna och versionen överlappar inte varandra (versionen kan bli längre, t.ex. 1.10.0)
        hv = pg.evaluate("""(() => { const text = (e) => { const g = document.createRange(); g.selectNodeContents(e); return g.getBoundingClientRect(); };   // själva texten, inte rutan
            const r = (q) => { const e = document.querySelector(q); if (!e || !e.offsetParent) return null; const b = text(e); return [b.left, b.right]; };
            const t = [...document.querySelectorAll('header #tabs button')].filter((e) => e.offsetParent).map(text);
            return { logo: r('header .logo'), ver: r('#ver'), tabs: t.length ? [Math.min(...t.map((b) => b.left)), Math.max(...t.map((b) => b.right))] : null }; })()""")
        fri = lambda a, b: a is None or b is None or a[1] + 4 <= b[0] or b[1] + 4 <= a[0]
        krav(fri(hv["logo"], hv["tabs"]) and fri(hv["tabs"], hv["ver"]) and fri(hv["logo"], hv["ver"]), f"{namn}: loggan, flikarna och versionen överlappar inte ({hv})")
        # den hemliga patchen i varje storlek: glasscenen, strålarna och det mörka tangentbordet får plats
        pg.evaluate("__bris.tab('play'); __bris.valjHemlig('kristall')")
        pg.wait_for_function("__bris.kristall().klar()", timeout=15000)
        for n in (52, 60, 65, 72, 81): pg.evaluate(f"__bris.note({n}, 100)")
        pg.wait_for_timeout(700); pg.screenshot(path=f"{UT}/{namn}_kristall.png")
        for n in (52, 60, 65, 72, 81): pg.evaluate(f"__bris.off({n})")
        for hid in ("sjon", "kassett", "norrsken", "nattag", "orgel", "analog"):
            pg.evaluate(f"__bris.valjHemlig('{hid}')"); pg.wait_for_timeout(400)
            if hid in ("kassett", "orgel", "norrsken"): pg.wait_for_function(f"__bris.scen('{hid}').klar()", timeout=15000)
            for n in (52, 60, 65, 72, 81): pg.evaluate(f"__bris.note({n}, 100)"); pg.wait_for_timeout(100)
            pg.wait_for_timeout(500); pg.screenshot(path=f"{UT}/{namn}_{hid}.png")
            for n in (52, 60, 65, 72, 81): pg.evaluate(f"__bris.off({n})")
        pg.evaluate("__bris.selectPreset(1)"); pg.wait_for_timeout(300)
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
