"""Den hemliga patchen KÖREN (BRIS): en kör i en mörk stenkyrka, renderad i Blender/Cycles.

Samma idé som ORGELN och KRISTALL (tools/orgel.py, tools/kristall.py): ljus är linjärt, så scenen renderas en gång
med bara grundljuset (bas: månen som lyser in genom fönstren, i en tunn dimma, och alla ljus i sångarnas händer svagt) och en gång
per ljusposition längs tangentbordet (ljus0..ljusK-1). I ett ljuspass brinner ljusen i en kolumn av sångare
(fram, mitten, bak) starkt, så att deras luvor, händer och ansikten lyser upp. Appen blandar passen efter vilka toner
som spelas (vänster = låga toner) och låter lågorna fladdra.

Sångarna: tre rader på trappsteg, var och en i en lång kåpa med vida ärmar och en djup luva som döljer ansiktet.
Kåporna är draperade (veck som är djupast nertill), luvan har en spets bakåt och ett öppet ansikte där bara hakan och
näsan fångar ljuset underifrån. Händerna håller ett ljus framför bröstet, ett rep sitter om midjan. Bakom: en vägg av huggen sten med höga
spetsbågiga fönster i månsken och pelare, och ett golv av sten som speglar ljusen svagt.
Mått: 1 enhet ≈ 1 m. x åt höger, y in i bilden, z upp.

PYTHONPATH=<bpy> python3.13 tools/koren.py --ut <mapp> [--bredd 1200 --prov 64 --bara bas,0,1 --forhand --nara]
Utdata: <mapp>/bas.exr, ljus0.exr ... tools/kristall_bilder.py --namn koren gör om dem till ui/koren/.
Appens bild: --bredd 1100 --prov 64, sedan kristall_bilder.py --namn koren --bredd 1100 samt "exp": 0.6 och "styrka": 4.0 i koren.json
(månljuset i grundpasset är starkt mot ljusen i renderingen; exp tar ner allt, styrkan lyfter ljusen i appen).
"""
import argparse, math, os, random, sys
import bpy, bmesh
from mathutils import Vector, noise as mn

ap = argparse.ArgumentParser()
ap.add_argument("--ut", required=True)
ap.add_argument("--bredd", type=int, default=1200)
ap.add_argument("--prov", type=int, default=64)
ap.add_argument("--antal", type=int, default=9)
ap.add_argument("--bara", default="")
ap.add_argument("--nara", action="store_true", help="kameran nära en sångare (för att se formen)")
ap.add_argument("--dimma", type=float, default=0.008, help="dimmans täthet i kyrkan (0 = ingen)")
ap.add_argument("--mane", type=float, default=3.5, help="månens styrka (strålarna genom fönstren)")
ap.add_argument("--forhand", action="store_true", help="en bild med grundljuset och tre kolumner som sjunger")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
UT = os.path.abspath(a.ut); os.makedirs(UT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
K = a.antal
rnd = random.Random(7)

# ------------------------------------------------------------------ material
def mat(namn, farg, grov=0.5, spec=0.5):
    m = bpy.data.materials.new(namn); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*farg, 1); b.inputs["Roughness"].default_value = grov
    b.inputs["Specular IOR Level"].default_value = spec
    return m, b

def ylle(namn, farg):
    """Grov ylle: matt, med lite lyster i kanterna (sheen) och en fin struktur i vävnaden."""
    m, b = mat(namn, farg, 0.92, 0.25)
    b.inputs["Sheen Weight"].default_value = 0.4; b.inputs["Sheen Roughness"].default_value = 0.45
    b.inputs["Sheen Tint"].default_value = (0.75, 0.68, 0.6, 1)
    nt = m.node_tree; tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 180; nz.inputs["Detail"].default_value = 4
    nz2 = nt.nodes.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 7; nz2.inputs["Detail"].default_value = 3
    mx = nt.nodes.new("ShaderNodeMixRGB"); mx.blend_type = "MULTIPLY"; mx.inputs["Fac"].default_value = 0.35
    mx.inputs["Color1"].default_value = (*farg, 1)
    bu = nt.nodes.new("ShaderNodeBump"); bu.inputs["Strength"].default_value = 0.25; bu.inputs["Distance"].default_value = 0.002
    L = nt.links.new
    L(tc.outputs["Object"], nz.inputs["Vector"]); L(tc.outputs["Object"], nz2.inputs["Vector"])
    L(nz2.outputs["Color"], mx.inputs["Color2"]); L(mx.outputs["Color"], b.inputs["Base Color"])
    # skrynklor i tyget (större än vävnaden), ovanpå vävnadens höjd
    nz3 = nt.nodes.new("ShaderNodeTexNoise"); nz3.inputs["Scale"].default_value = 26; nz3.inputs["Detail"].default_value = 6
    nz3.inputs["Distortion"].default_value = 0.6
    ad = nt.nodes.new("ShaderNodeMath"); ad.operation = "MULTIPLY_ADD"; ad.inputs[1].default_value = 6.0
    L(tc.outputs["Object"], nz3.inputs["Vector"]); L(nz3.outputs["Fac"], ad.inputs[0]); L(nz.outputs["Fac"], ad.inputs[2])
    L(ad.outputs[0], bu.inputs["Height"]); L(bu.outputs["Normal"], b.inputs["Normal"])
    return m

def hud():
    m, b = mat("hud", (0.3, 0.18, 0.13), 0.55, 0.4)
    b.inputs["Subsurface Weight"].default_value = 0.35; b.inputs["Subsurface Radius"].default_value = (0.9, 0.35, 0.2)
    b.inputs["Subsurface Scale"].default_value = 0.01
    return m

def vax():
    m, b = mat("vax", (0.86, 0.8, 0.68), 0.35, 0.5)
    b.inputs["Subsurface Weight"].default_value = 0.6; b.inputs["Subsurface Radius"].default_value = (1.0, 0.7, 0.4)
    b.inputs["Subsurface Scale"].default_value = 0.02
    return m

def sten(namn, ljus=1.0, skala=0.45):
    m, b = mat(namn, (0.2, 0.18, 0.16), 0.82, 0.35)
    nt = m.node_tree   # huggna block i förband, fogar och olika ton per block
    tc = nt.nodes.new("ShaderNodeTexCoord"); br = nt.nodes.new("ShaderNodeTexBrick")
    br.inputs["Scale"].default_value = skala; br.inputs["Mortar Size"].default_value = 0.012
    br.inputs["Brick Width"].default_value = 0.9; br.inputs["Row Height"].default_value = 0.4
    br.inputs["Color1"].default_value = (0.12 * ljus, 0.108 * ljus, 0.094 * ljus, 1)
    br.inputs["Color2"].default_value = (0.085 * ljus, 0.077 * ljus, 0.068 * ljus, 1)
    br.inputs["Mortar"].default_value = (0.045, 0.04, 0.036, 1)
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 12; nz.inputs["Detail"].default_value = 6
    mx = nt.nodes.new("ShaderNodeMixRGB"); mx.blend_type = "MULTIPLY"; mx.inputs["Fac"].default_value = 0.6
    bu = nt.nodes.new("ShaderNodeBump"); bu.inputs["Strength"].default_value = 0.4
    L = nt.links.new
    L(tc.outputs["Object"], br.inputs["Vector"])
    L(br.outputs["Color"], mx.inputs["Color1"]); L(nz.outputs["Color"], mx.inputs["Color2"]); L(mx.outputs["Color"], b.inputs["Base Color"])
    L(br.outputs["Fac"], bu.inputs["Height"]); L(bu.outputs["Normal"], b.inputs["Normal"])
    return m

def golv():
    m = sten("golv", 0.8, 0.55)
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.42   # slitet och lite blankt: ljusen speglas svagt
    return m

def glod(namn, farg, styrka):   # ren emission med en styrka som kan ändras per pass
    m = bpy.data.materials.new(namn); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    ut = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*farg, 1); em.inputs["Strength"].default_value = styrka
    nt.links.new(em.outputs[0], ut.inputs["Surface"])
    return m, em

KAPOR = [ylle("kapa_svart", (0.03, 0.028, 0.027)), ylle("kapa_brun", (0.045, 0.032, 0.024)),
         ylle("kapa_gra", (0.05, 0.048, 0.046))]
INSIDA = ylle("insida", (0.012, 0.01, 0.01))
HUD, VAX, STEN, GOLV = hud(), vax(), sten("sten"), golv()
REP, _ = mat("rep", (0.09, 0.07, 0.05), 0.9, 0.2)
VEKE, _ = mat("veke", (0.02, 0.015, 0.01), 0.8)
FONSTER, FONSTER_EM = glod("fonster", (0.45, 0.55, 0.9), 0.0)
def _blyglas():   # blyinfattade rutor: mörka lister, och varje ruta med lite olika ton (gammalt, ojämnt glas)
    nt = FONSTER.node_tree; tc = nt.nodes.new("ShaderNodeTexCoord")
    br = nt.nodes.new("ShaderNodeTexBrick"); br.inputs["Scale"].default_value = 5.0
    br.inputs["Mortar Size"].default_value = 0.035; br.inputs["Brick Width"].default_value = 0.5; br.inputs["Row Height"].default_value = 0.32
    br.offset = 0.0
    br.inputs["Color1"].default_value = (0.5, 0.6, 0.95, 1); br.inputs["Color2"].default_value = (0.32, 0.42, 0.75, 1)
    br.inputs["Mortar"].default_value = (0.0, 0.0, 0.0, 1)
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 3
    mx = nt.nodes.new("ShaderNodeMixRGB"); mx.blend_type = "MULTIPLY"; mx.inputs["Fac"].default_value = 0.7
    # tegelmönstret är plant i x/y: vrid koordinaterna så att rutorna ligger i fönstrets plan (x/z)
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Rotation"].default_value = (math.radians(90), 0, 0)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], br.inputs["Vector"]); nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    nt.links.new(br.outputs["Color"], mx.inputs["Color1"]); nt.links.new(nz.outputs["Color"], mx.inputs["Color2"])
    nt.links.new(mx.outputs["Color"], FONSTER_EM.inputs["Color"])
_blyglas()
LAGA = [glod(f"laga{k}", (1.0, 0.62, 0.28), 0.0) for k in range(K)]

def lagg(o, m, mjuk=True):
    o.data.materials.append(m)
    if mjuk:
        for p in o.data.polygons: p.use_smooth = True
    return o

def nyttobj(namn, bm, m, mjuk=True):
    me = bpy.data.meshes.new(namn); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(namn, me); sc.collection.objects.link(o)
    return lagg(o, m, mjuk)

# ------------------------------------------------------------------ en sångare
PROFIL = [  # (höjd, radie, förskjutning bakåt, bredd, djup): fötterna -> axlarna -> luvan med spetsen bakåt
    (0.00, 0.34, 0.00, 1.0, 0.80), (0.08, 0.35, 0.00, 1.0, 0.80), (0.35, 0.31, 0.00, 1.0, 0.82),
    (0.70, 0.27, 0.00, 1.0, 0.86), (1.00, 0.25, 0.00, 1.0, 0.90), (1.20, 0.245, 0.0, 1.0, 0.86),
    (1.32, 0.24, 0.00, 1.0, 0.74), (1.40, 0.215, 0.0, 1.0, 0.78), (1.46, 0.178, 0.0, 1.0, 0.92),
    (1.52, 0.166, 0.01, 1.0, 1.06), (1.62, 0.162, 0.02, 1.0, 1.12), (1.72, 0.156, 0.035, 1.0, 1.14),
    (1.80, 0.136, 0.06, 0.98, 1.12), (1.87, 0.10, 0.09, 0.95, 1.1), (1.92, 0.06, 0.13, 0.9, 1.1),
    (1.95, 0.02, 0.17, 0.8, 1.0)]
NACKE = 1.45

def profil(h, tab=PROFIL):
    for i in range(len(tab) - 1):
        a0, a1 = tab[i], tab[i + 1]
        if h <= a1[0]:
            t = (h - a0[0]) / (a1[0] - a0[0])
            return [a0[j] + (a1[j] - a0[j]) * t for j in range(1, 5)]
    return list(tab[-1][1:])

def luta(p, x, y, z, lut, vrid):
    """Böjer allt ovanför nacken framåt (lut) och vrider det lite (vrid), kring nacken."""
    dz = p[2] - (z + NACKE)
    if dz <= 0: return p
    dy = p[1] - y; dx = p[0] - x
    c, s = math.cos(lut), math.sin(lut)
    dy, dz = dy * c - dz * s, dy * s + dz * c
    c, s = math.cos(vrid), math.sin(vrid)
    dx, dy = dx * c - dy * s, dx * s + dy * c
    return (x + dx, y + dy, z + NACKE + dz)

HC, AH, AV = 1.655, 0.14, 0.78   # ansiktsöppningen: mitt (höjd), halv höjd, halv vinkel

def oppn_e(v, h):
    w = math.atan2(math.sin(v), math.cos(v))
    return ((h - HC) / AH) ** 2 + (w / AV) ** 2

def svarv(x, y, z, frö, tab, h0, h1, R, oppning, vdjup, lut, vrid, namn, m):
    """En svarvad tygform längs en profil med veck (djupast nertill) och en ansiktsöppning framtill i luvan."""
    bm = bmesh.new(); N = 80
    def pos(v, h):
        r, yb, sx, sy = profil(h, tab)
        # långa veck som hänger rakt ner från bröstet och axlarna, fler och djupare nertill
        veck = math.sin(v * 11 + frö + 0.3 * math.sin(h * 2.0 + frö)) * 0.5 + math.sin(v * 6 + frö * 2.3) * 0.4
        veck += mn.noise(Vector((math.cos(v) * 2.5 + frö, math.sin(v) * 2.5, h * 0.9))) * 0.9
        veck += math.sin(v * 19 + frö * 1.7 + 0.8 * math.sin(h * 3.1 + frö)) * 0.22   # små veck mellan de stora
        rr = r + vdjup(h) * veck
        if oppning:   # luvans brätte runt öppningen sticker fram lite, mest upptill (skuggar ansiktet)
            e = oppn_e(v, h)
            if e < 2.2: rr += (0.02 + 0.035 * max(0.0, (h - HC) / AH)) * max(0.0, 1.0 - abs(math.sqrt(e) - 1.0) * 2.2)
        p = (x + math.sin(v) * rr * sx, y - math.cos(v) * rr * sy + yb, z + h)
        return luta(p, x, y, z, lut, vrid)
    hs = [h0 + (min(h1, NACKE) - h0) * j / R for j in range(R + 1)]
    if h1 > NACKE: hs += [NACKE + (h1 - NACKE) * j / 44 for j in range(1, 45)]
    vs, par = [], {}
    for h in hs:
        ring = []
        for i in range(N):
            v = i / N * math.tau                       # v = 0 framåt (mot kameran, -y)
            bv = bm.verts.new(pos(v, h)); par[bv] = (v, h); ring.append(bv)
        vs.append(ring)
    for j in range(len(hs) - 1):
        hm = (hs[j] + hs[j + 1]) / 2
        for i in range(N):
            if oppning and oppn_e((i + 0.5) / N * math.tau, hm) < 1.0: continue
            bm.faces.new((vs[j][i], vs[j][(i + 1) % N], vs[j + 1][(i + 1) % N], vs[j + 1][i]))
    if oppning:
        # öppningens kant: flytta kantpunkterna ut på ellipsen, så att kanten blir jämn (inte trappsteg)
        for bv in list(bm.verts):
            if not bv.link_faces: bm.verts.remove(bv); continue
            v, h = par[bv]
            if any(ed.is_boundary for ed in bv.link_edges) and HC - AH * 1.6 < h < HC + AH * 1.6:
                w = math.atan2(math.sin(v), math.cos(v)); e = oppn_e(v, h)
                if 0 < e < 2.5:
                    k = 1 / math.sqrt(e); bv.co = pos(w * k, HC + (h - HC) * k)
    o = nyttobj(namn, bm, m)
    so = o.modifiers.new("tjock", "SOLIDIFY"); so.thickness = 0.018; so.offset = -1.0; so.material_offset = 1
    o.data.materials.append(INSIDA)
    sd = o.modifiers.new("mjuk", "SUBSURF"); sd.levels = 1; sd.render_levels = 2 if oppning else 1
    return o

def ror(pts, rad, frö, m, lut, vrid, x, y, z):
    """En ärm: ett rör längs en bruten linje med veck, öppet i ändarna."""
    bm = bmesh.new(); N, S = 20, 8
    # utjämnad bana (Catmull-Rom) och ringar vinkelräta mot den
    def bana(t):
        n = len(pts) - 1; i = min(n - 1, int(t * n)); u = t * n - i
        p0 = pts[max(0, i - 1)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(n, i + 2)]
        return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3)
    M = (len(pts) - 1) * S; ringar = []
    for j in range(M + 1):
        t = j / M; c = bana(t); d = (bana(min(1, t + 0.01)) - bana(max(0, t - 0.01))).normalized()
        u = d.cross(Vector((0, 0, 1))); u = u.normalized() if u.length > 1e-4 else Vector((1, 0, 0)); w = d.cross(u)
        k = t * (len(rad) - 1); i = min(len(rad) - 2, int(k)); r = rad[i] + (rad[i + 1] - rad[i]) * (k - i)
        ring = []
        for q in range(N):
            v = q / N * math.tau
            rr = r * (1 + 0.12 * mn.noise(Vector((math.cos(v) * 2 + frö, math.sin(v) * 2, t * 3))) + 0.06 * math.sin(v * 5 + frö))
            ring.append(bm.verts.new(luta(c + (u * math.cos(v) + w * math.sin(v)) * rr, x, y, z, lut * 0.4, vrid * 0.4)))
        ringar.append(ring)
    for j in range(M):
        for q in range(N):
            bm.faces.new((ringar[j][q], ringar[j][(q + 1) % N], ringar[j + 1][(q + 1) % N], ringar[j + 1][q]))
    o = nyttobj("arm", bm, m)
    so = o.modifiers.new("tjock", "SOLIDIFY"); so.thickness = 0.012; so.material_offset = 1; o.data.materials.append(INSIDA)
    sd = o.modifiers.new("mjuk", "SUBSURF"); sd.levels = 1; sd.render_levels = 1
    return o

def sangare(x, y, z, k, frö):
    m = KAPOR[int(frö * 10) % len(KAPOR)]
    lut = rnd.uniform(0.1, 0.28)            # huvudet lite nedböjt mot ljuset
    vrid = rnd.uniform(-0.12, 0.12)
    # kåpan med luvan i ett stycke
    svarv(x, y, z, frö, PROFIL, 0.0, 1.95, 40, True, lambda h: 0.02 + 0.045 * max(0.0, 1 - h / 1.4) ** 1.5 + 0.012 * math.exp(-((h - 1.5) / 0.05) ** 2), lut, vrid, "kapa", m)
    # huvudet inne i luvan, en bit in (hakan och näsan fångar ljuset underifrån)
    hz = z + 1.645
    def huvuddel(r, loc, skala):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=r, location=luta(loc, x, y, z, lut, vrid))
        o = bpy.context.object; o.scale = skala; o.rotation_euler = (lut, 0, vrid); lagg(o, HUD)
    huvuddel(0.096, (x, y + 0.04, hz), (0.8, 0.98, 1.15))
    huvuddel(0.018, (x, y - 0.05, hz - 0.015), (0.8, 1.0, 1.3))      # näsan
    huvuddel(0.045, (x, y - 0.015, hz - 0.08), (0.95, 0.95, 0.75))   # hakan
    # ärmarna: från axeln ner längs sidan till armbågen och fram till händerna, vida (klockformade) vid handleden
    for sd_ in (-1, 1):
        pts = [Vector((x + sd_ * 0.2, y, z + 1.37)), Vector((x + sd_ * 0.235, y - 0.05, z + 1.18)),
               Vector((x + sd_ * 0.2, y - 0.14, z + 1.04)), Vector((x + sd_ * 0.06, y - 0.27, z + 1.0))]
        ror(pts, [0.075, 0.08, 0.085, 0.108], frö + sd_, m, lut, vrid, x, y, z)
    # ett rep om midjan (under ärmarna) med en ände som hänger ner
    bm = bmesh.new(); N = 64; Q = 8; rr = 0.011; ringar = []
    for i in range(N + 1):
        v = i / N * math.tau
        r_, yb, sx, sy = profil(0.98)
        c = Vector((x + math.sin(v) * (r_ + 0.012) * sx, y - math.cos(v) * (r_ + 0.012) * sy, z + 0.98 - 0.02 * math.cos(v)))
        t = Vector((math.cos(v) * sx, math.sin(v) * sy, 0)).normalized(); nn = Vector((0, 0, 1)); bb = t.cross(nn)
        ringar.append([bm.verts.new(c + (nn * math.cos(q / Q * math.tau) + bb * math.sin(q / Q * math.tau)) * rr) for q in range(Q)])
    for i in range(N):
        for q in range(Q):
            bm.faces.new((ringar[i][q], ringar[i][(q + 1) % Q], ringar[i + 1][(q + 1) % Q], ringar[i + 1][q]))
    nyttobj("rep", bm, REP)
    vr = 0.5 + rnd.uniform(-0.15, 0.15)
    r_, yb, sx, sy = profil(0.9)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=rr, depth=0.42, location=(x + math.sin(vr) * (r_ + 0.03), y - math.cos(vr) * (r_ + 0.03) * sy, z + 0.76))
    o = bpy.context.object; o.rotation_euler = (0.08, -0.05, 0); lagg(o, REP)
    # händerna om ljuset, den ena över den andra
    for hy, hz_ in ((-0.315, 1.035), (-0.31, 1.085)):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.04, location=(x, y + hy, z + hz_))
        ha = bpy.context.object; ha.scale = (1.15, 0.95, 0.62); lagg(ha, HUD)
    # ljuset i händerna: vaxljus med veke och låga (lågan glöder bara i sitt pass)
    lz = z + 1.03
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.021, depth=0.24, location=(x, y - 0.32, lz + 0.12)); lagg(bpy.context.object, VAX)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.002, depth=0.02, location=(x, y - 0.32, lz + 0.25)); lagg(bpy.context.object, VEKE)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.011, location=(x, y - 0.32, lz + 0.278))
    fl = bpy.context.object; fl.scale = (0.75, 0.75, 2.2); lagg(fl, LAGA[k][0])
    fl.visible_shadow = False   # lågan kastar ingen skugga själv
    return Vector((x, y - 0.32, lz + 0.285))

XB = 3.1         # körens halva bredd (för ljuspositionerna)
def kolumn(x): return max(0, min(K - 1, round((x + XB) / (2 * XB) * (K - 1))))

LAGOR = []        # (läge, kolumn)
rader = [(0.0, 0.0, 9, 0.0), (0.95, 0.32, 8, 0.45), (1.9, 0.64, 9, 0.0)]   # (y, trappsteg, antal, förskjutning)
for ry, rz, n, fs in rader:
    for i in range(n):
        x = -XB + (2 * XB / 8) * (i + (0.5 if fs else 0.0))
        x += rnd.uniform(-0.05, 0.05)
        LAGOR.append((sangare(x, ry + rnd.uniform(-0.04, 0.04), rz, kolumn(x), rnd.random() * 10), kolumn(x)))
# trappstegen sångarna står på
for ry, rz, n, fs in rader[1:]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, ry + 0.5, rz / 2)); o = bpy.context.object
    o.scale = (10, 1.0 + (ry * 0.0), rz); bpy.ops.object.transform_apply(scale=True); lagg(o, STEN, False)

# ------------------------------------------------------------------ kyrkan
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 3.0, 0)); o = bpy.context.object
o.scale = (30, 30, 1); bpy.ops.object.transform_apply(scale=True); lagg(o, GOLV, False)
# väggen: tjock sten med riktiga fönsteröppningar (månljuset faller in genom dem och syns som strålar i dimman)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 5.15, 6.0)); VAGG = bpy.context.object
VAGG.scale = (30, 0.3, 14); bpy.ops.object.transform_apply(scale=True); lagg(VAGG, STEN, False)
FW, FH0, FH1 = 0.55, 2.4, 6.2
def bage():
    pts = [(-FW, FH0), (FW, FH0), (FW, FH1)]
    for i in range(1, 12):
        v = i / 12 * math.pi / 2   # spetsbågen
        pts.append((FW - FW * (1 - math.cos(v)), FH1 + FW * 1.6 * math.sin(v)))
    pts.append((0.0, FH1 + FW * 1.75))
    for i in range(11, 0, -1):
        v = i / 12 * math.pi / 2
        pts.append((-FW + FW * (1 - math.cos(v)), FH1 + FW * 1.6 * math.sin(v)))
    pts.append((-FW, FH1))
    return pts
SKAR = bmesh.new()
def fonster(xc):
    pts = bage()
    # skäraren: bågen som ett prisma genom väggen
    fr = [SKAR.verts.new((xc + px, 4.8, pz)) for px, pz in pts]
    ba = [SKAR.verts.new((xc + px, 5.5, pz)) for px, pz in pts]
    SKAR.faces.new(list(reversed(fr))); SKAR.faces.new(ba)
    for i in range(len(pts)):
        j = (i + 1) % len(pts); SKAR.faces.new((fr[i], fr[j], ba[j], ba[i]))
    # glaset (blyinfattat, i månsken) i öppningen: det lyser men skuggar inte, så att månljuset går igenom
    bm = bmesh.new(); bm.faces.new([bm.verts.new((xc + px, 5.25, pz)) for px, pz in pts])
    g = nyttobj("glas", bm, FONSTER, False); g.visible_shadow = False
    # spröjsarna (järn) i öppningen: de kastar skugga, så att strålarna får fönstrets mönster
    for zz in (3.4, 4.4, 5.4):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(xc, 5.15, zz)); r_ = bpy.context.object
        r_.scale = (FW * 2, 0.03, 0.035); lagg(r_, INSIDA, False)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(xc, 5.15, 4.6)); r_ = bpy.context.object
    r_.scale = (0.035, 0.03, 4.6); lagg(r_, INSIDA, False)
    # omfattningen: en djup nisch av sten runt fönstret
    for s_ in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(xc + s_ * (FW + 0.1), 4.88, 4.6)); q_ = bpy.context.object
        q_.scale = (0.2, 0.24, 4.6); lagg(q_, STEN, False)
for xc in (-5.2, -1.75, 1.75, 5.2):
    fonster(xc)
bmesh.ops.recalc_face_normals(SKAR, faces=SKAR.faces)   # utåt på alla prismor (annars blir skärningen fel)
me = bpy.data.meshes.new("skar"); SKAR.to_mesh(me); SKAR.free()
sk = bpy.data.objects.new("skar", me); sc.collection.objects.link(sk); sk.hide_render = True; sk.display_type = "WIRE"
bo = VAGG.modifiers.new("fonster", "BOOLEAN"); bo.operation = "DIFFERENCE"; bo.object = sk; bo.solver = "EXACT"
for xc in (-3.5, 0.0, 3.5, -7.0, 7.0):   # pelarna
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.38, depth=12, location=(xc, 4.75, 6)); lagg(bpy.context.object, STEN)

# ------------------------------------------------------------------ kamera och ljus
cam = bpy.data.cameras.new("kamera"); cam.lens = 35; cam.sensor_width = 36
co = bpy.data.objects.new("kamera", cam); sc.collection.objects.link(co); sc.camera = co
pos, mal = Vector((0.0, -6.2, 1.55)), Vector((0.0, 1.0, 2.05))
if a.nara: pos, mal = Vector((0.4, -2.0, 1.6)), Vector((0.0, 0.0, 1.45))
co.location = pos; co.rotation_euler = (mal - pos).to_track_quat("-Z", "Y").to_euler()

vg = bpy.data.worlds.new("varld"); sc.world = vg; vg.use_nodes = True
vg.node_tree.nodes["Background"].inputs["Color"].default_value = (0.0015, 0.0018, 0.0025, 1)
if a.dimma > 0:   # en låda med tunn dimma runt kören: ljuset från fönstren och ljusen syns i luften
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 1.5, 3.5)); dl = bpy.context.object
    dl.scale = (16, 7, 7); dm = bpy.data.materials.new("dimma"); dm.use_nodes = True; nt = dm.node_tree
    for n_ in list(nt.nodes): nt.nodes.remove(n_)
    vo = nt.nodes.new("ShaderNodeVolumePrincipled"); vo.inputs["Density"].default_value = a.dimma
    vo.inputs["Color"].default_value = (0.8, 0.82, 0.9, 1); vo.inputs["Anisotropy"].default_value = 0.35
    nt.links.new(vo.outputs[0], nt.nodes.new("ShaderNodeOutputMaterial").inputs["Volume"])
    dl.data.materials.append(dm); dl.visible_shadow = False

def ljus(namn, typ, loc, energi, farg=(1, 1, 1), storlek=0.3, mot=None):
    d = bpy.data.lights.new(namn, typ); d.energy = energi; d.color = farg
    if typ == "AREA": d.size = storlek
    else: d.shadow_soft_size = storlek
    o = bpy.data.objects.new(namn, d); o.location = loc; sc.collection.objects.link(o)
    o.visible_camera = False; o.visible_glossy = typ != "AREA"   # lamporna syns inte själva (bara det de lyser på)
    if mot is not None: o.rotation_euler = (Vector(mot) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o

# grundljuset: kallt månsken genom fönstren (bakifrån och från sidan, så att luvornas kanter fångar det), ett mycket
# svagt kallt fyllljus framifrån och alla ljusen svagt (sångarna syns i mörkret när ingen sjunger)
# månljuset: månen står bakom kyrkan, snett ovanför, och lyser in genom fönstren (strålar i dimman, fönstrens mönster
# på golvet och på luvorna). Ytljus precis framför glaset ger det spridda skenet från fönstren.
mn_d = bpy.data.lights.new("bas_manen", "SUN"); mn_d.energy = a.mane; mn_d.color = (0.62, 0.72, 1.0); mn_d.angle = math.radians(0.8)
MANE = bpy.data.objects.new("bas_manen", mn_d); sc.collection.objects.link(MANE)
MANE.rotation_euler = Vector((1.0, -0.3, -0.75)).to_track_quat("-Z", "Y").to_euler()
MANE.visible_camera = False
BAS = [MANE,
       ljus("bas_mane", "AREA", (-1.75, 4.88, 4.6), 90, (0.55, 0.65, 1.0), 1.1, mot=(-0.6, 0.6, 1.2)),
       ljus("bas_mane2", "AREA", (1.75, 4.88, 4.6), 70, (0.5, 0.6, 1.0), 1.1, mot=(0.6, 0.6, 1.2)),
       ljus("bas_mane3", "AREA", (-5.2, 4.88, 4.6), 55, (0.5, 0.6, 1.0), 1.1, mot=(-2.5, 0.6, 1.2)),
       ljus("bas_mane4", "AREA", (5.2, 4.88, 4.6), 55, (0.5, 0.6, 1.0), 1.1, mot=(2.5, 0.6, 1.2)),
       ljus("bas_fyll", "AREA", (0.0, -6.0, 3.0), 6, (0.5, 0.58, 0.8), 6.0, mot=(0, 1.0, 1.4))]
SVAGA = []
SPEL = []
for k in range(K):
    SPEL.append([])
for p, k in LAGOR:
    s = ljus(f"svag{k}", "POINT", p, 0.04, (1.0, 0.6, 0.28), 0.01); SVAGA.append(s)
    l = ljus(f"ljus{k}", "POINT", p, 1.6, (1.0, 0.6, 0.28), 0.012); SPEL[k].append(l)

r = sc.render; r.engine = "CYCLES"
r.resolution_x = a.bredd; r.resolution_y = round(a.bredd / 1.25); r.resolution_percentage = 100
cy = sc.cycles; cy.device = "CPU"; cy.samples = a.prov; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03
cy.use_denoising = True
try: cy.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
cy.max_bounces = 6; cy.glossy_bounces = 3; cy.diffuse_bounces = 3; cy.transmission_bounces = 2
cy.sample_clamp_indirect = 8.0; cy.blur_glossy = 0.5
sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
r.film_transparent = False

def stall(bas, aktiva):
    for o in BAS + SVAGA: o.hide_render = not bas
    FONSTER_EM.inputs["Strength"].default_value = 0.16 if bas else 0.0
    for k in range(K):
        on = k in aktiva
        for l in SPEL[k]: l.hide_render = not on
        LAGA[k][1].inputs["Strength"].default_value = 30.0 if on else (1.2 if bas else 0.0)

if a.forhand:
    stall(True, {1, 4, 7})
    r.image_settings.file_format = "PNG"; r.filepath = os.path.join(UT, "forhand.png")
    sc.view_settings.view_transform = "AgX"
    bpy.ops.render.render(write_still=True); print("KLAR", r.filepath, flush=True); sys.exit(0)

r.image_settings.file_format = "OPEN_EXR"; r.image_settings.color_depth = "32"; r.image_settings.exr_codec = "ZIP"
vilka = [s.strip() for s in a.bara.split(",") if s.strip()] or ["bas"] + [str(k) for k in range(K)]
for v in vilka:
    stall(v == "bas", set() if v == "bas" else {int(v)})
    r.filepath = os.path.join(UT, ("bas" if v == "bas" else f"ljus{v}") + ".exr")
    bpy.ops.render.render(write_still=True)
    print("KLAR", r.filepath, flush=True)
