"""SJÖNs landskap (BRIS): fjäll och skog på andra sidan sjön, renderade i Blender/Cycles som ett brett panorama
med genomskinlig himmel. Appen (ui/sjon.js) lägger bilden över himlen och speglar den i vattnet.

Kameran står nära vattenytan och tittar vågrätt över sjön: bildens underkant är horisonten (vattenlinjen).
Närmast (ca 700 m bort) en strand med blandskog som stiger uppför kullar och åsar bakåt (2–3 km), längre bort
en lägre skogsås i dis, och längst bort (15–22 km) fjäll med snö på topparna och mörkt berg i branterna.
Träden byggs här i skriptet: granar (grenvåningar med hängande grenar och en smal topp), tallar (lång rödbrun stam,
oregelbunden krona högt upp), björkar (vit stam, luftig krona) och lövträd (rundade kronor). Barr och löv har
trasiga kanter (genomskinligt brus), så kronorna blir luftiga. Diset läggs på efter avståndet i varje material.

Två bilder: dag (solen framför till höger, ljus himmel) och natt (månen framför till vänster, svagt blått ljus).
Mått: 1 enhet = 1 m. x åt höger, y in i bilden, z upp.

PYTHONPATH=<bpy> python3.13 tools/sjon_land.py --ut <mapp> [--bredd 5280 --prov 64 --bara dag|natt --trad]
Utdata: <mapp>/dag.png, natt.png (RGBA). tools/sjon_bilder.py gör om dem till ui/sjon/.
"""
import argparse, math, os, random, sys
import bpy, bmesh
import mathutils.noise as mn
from mathutils import Vector, Matrix

ap = argparse.ArgumentParser()
ap.add_argument("--ut", required=True)
ap.add_argument("--bredd", type=int, default=3520)
ap.add_argument("--prov", type=int, default=48)
ap.add_argument("--bara", default="")
ap.add_argument("--tathet", type=float, default=1.0, help="skogens täthet (1 = full)")
ap.add_argument("--trad", action="store_true", help="bara träden på rad, nära (för att se formen)")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
UT = os.path.abspath(a.ut); os.makedirs(UT, exist_ok=True)

ASP = 11.0                 # bildens bredd / höjd
HFOV = math.radians(50)    # kamerans vågräta synvinkel
TAN = math.tan(HFOV / 2)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
rnd = random.Random(5)

# ------------------------------------------------------------------ dis: varje material blandas mot dis efter avståndet
DIS = []   # (färg-nod, avstånds-nod) i alla material, ställs om för dag och natt

def med_dis(m, ut_shader):
    """Lägg dis efter avståndet framför materialets shader (1 - exp(-d / D))."""
    nt = m.node_tree; N = nt.nodes; L = nt.links.new
    cd = N.new("ShaderNodeCameraData")
    dv = N.new("ShaderNodeMath"); dv.operation = "DIVIDE"; dv.inputs[1].default_value = 12000.0
    L(cd.outputs["View Distance"], dv.inputs[0])
    ng = N.new("ShaderNodeMath"); ng.operation = "MULTIPLY"; ng.inputs[1].default_value = -1.0; L(dv.outputs[0], ng.inputs[0])
    ex = N.new("ShaderNodeMath"); ex.operation = "EXPONENT"; L(ng.outputs[0], ex.inputs[0])
    fac = N.new("ShaderNodeMath"); fac.operation = "SUBTRACT"; fac.inputs[0].default_value = 1.0; L(ex.outputs[0], fac.inputs[1])
    em = N.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = 1.0
    mx = N.new("ShaderNodeMixShader"); L(fac.outputs[0], mx.inputs[0]); L(ut_shader, mx.inputs[1]); L(em.outputs[0], mx.inputs[2])
    return mx, em, dv

def material(namn, farg, grov=0.8, trasig=0.0, skala=40.0, variation=0.25, transl=0.0, glans=0.3):
    """Ett material med färgvariation per träd (slump per instans) och i ytan, trasiga kanter (genomskinligt brus)
    om trasig > 0, lite genomlysning (löv) och dis."""
    m = bpy.data.materials.new(namn); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links.new
    b = N["Principled BSDF"]; b.inputs["Roughness"].default_value = grov; b.inputs["Specular IOR Level"].default_value = glans
    oi = N.new("ShaderNodeObjectInfo")
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (*[c * (1 - variation) for c in farg], 1)
    ramp.color_ramp.elements[1].color = (*[min(1.0, c * (1 + variation)) for c in farg], 1)
    L(oi.outputs["Random"], ramp.inputs[0])
    tc = N.new("ShaderNodeTexCoord")
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = skala; nz.inputs["Detail"].default_value = 6
    nz.inputs["Roughness"].default_value = 0.65; L(tc.outputs["Object"], nz.inputs["Vector"])
    mul = N.new("ShaderNodeMixRGB"); mul.blend_type = "MULTIPLY"; mul.inputs["Fac"].default_value = 0.55
    L(ramp.outputs["Color"], mul.inputs["Color1"]); L(nz.outputs["Color"], mul.inputs["Color2"])
    L(mul.outputs["Color"], b.inputs["Base Color"])
    if transl > 0:
        b.inputs["Transmission Weight"].default_value = 0.0
        try: b.inputs["Subsurface Weight"].default_value = transl; b.inputs["Subsurface Radius"].default_value = (0.1, 0.2, 0.05)
        except KeyError: pass
    out = N["Material Output"]
    sh = b.outputs["BSDF"]
    if trasig > 0:
        # trasiga kanter: brus som klipper hål (luftiga kronor)
        nz2 = N.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = skala * 2.2; nz2.inputs["Detail"].default_value = 4
        L(tc.outputs["Object"], nz2.inputs["Vector"])
        mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = trasig; mr.inputs["From Max"].default_value = trasig + 0.04
        L(nz2.outputs["Fac"], mr.inputs["Value"])
        tr = N.new("ShaderNodeBsdfTransparent"); mx = N.new("ShaderNodeMixShader")
        L(mr.outputs["Result"], mx.inputs[0]); L(tr.outputs[0], mx.inputs[1]); L(sh, mx.inputs[2])
        dmx, em, dv = med_dis(m, mx.outputs[0])
        # (diset ska inte fylla hålen: blanda dis och genomskinligt med samma mask)
        m2 = N.new("ShaderNodeMixShader"); L(mr.outputs["Result"], m2.inputs[0]); L(tr.outputs[0], m2.inputs[1]); L(dmx.outputs[0], m2.inputs[2])
        L(m2.outputs[0], out.inputs["Surface"])
    else:
        dmx, em, dv = med_dis(m, sh)
        L(dmx.outputs[0], out.inputs["Surface"])
    DIS.append((em, dv))
    return m

M_GRAN = material("granbarr", (0.040, 0.075, 0.038), 0.85, trasig=0.36, skala=3.0, variation=0.3)
M_TALL = material("tallbarr", (0.060, 0.090, 0.038), 0.85, trasig=0.40, skala=2.5, variation=0.3)
M_BJORK = material("bjorklov", (0.19, 0.31, 0.065), 0.7, trasig=0.44, skala=3.5, variation=0.25, transl=0.15)
M_LOV = material("lov", (0.10, 0.20, 0.048), 0.7, trasig=0.40, skala=2.2, variation=0.3, transl=0.12)
M_STAM = material("stam", (0.05, 0.04, 0.03), 0.9, skala=8, variation=0.2)
M_TALLSTAM = material("tallstam", (0.32, 0.14, 0.06), 0.85, skala=6, variation=0.2)
M_BJORKSTAM = material("bjorkstam", (0.62, 0.62, 0.58), 0.7, skala=2.5, variation=0.1)
M_MARK = material("mark", (0.035, 0.05, 0.025), 0.95, skala=0.08, variation=0.1)

# björkens stam: svarta fläckar (barken)
def bjorkflackar(m):
    nt = m.node_tree; N = nt.nodes; L = nt.links.new
    b = N["Principled BSDF"]; tc = [n for n in N if n.bl_idname == "ShaderNodeTexCoord"][0]
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (2.0, 2.0, 9.0); L(tc.outputs["Object"], mp.inputs["Vector"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 3
    L(mp.outputs["Vector"], nz.inputs["Vector"])
    mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.6; mr.inputs["From Max"].default_value = 0.64
    L(nz.outputs["Fac"], mr.inputs["Value"])
    gam = N.new("ShaderNodeMixRGB"); gam.inputs["Color2"].default_value = (0.02, 0.02, 0.02, 1)
    L(b.inputs["Base Color"].links[0].from_socket, gam.inputs["Color1"]); L(mr.outputs["Result"], gam.inputs["Fac"])
    L(gam.outputs["Color"], b.inputs["Base Color"])
bjorkflackar(M_BJORKSTAM)

# ------------------------------------------------------------------ träden (byggs som nät, en enhet = 1 m)
class Nat:
    def __init__(s): s.v, s.f, s.m = [], [], []
    def yta(s, pts, mi):
        k = len(s.v); s.v += [tuple(p) for p in pts]; s.f.append(tuple(range(k, k + len(pts)))); s.m.append(mi)
    def objekt(s, namn, mats, samling):
        me = bpy.data.meshes.new(namn); me.from_pydata(s.v, [], s.f); me.update()
        for m in mats: me.materials.append(m)
        for p, mi in zip(me.polygons, s.m): p.material_index = mi; p.use_smooth = True
        o = bpy.data.objects.new(namn, me); samling.objects.link(o)
        return o

def stam(n, h, r0, r1, mi, bojd=(0, 0), sid=7, z0=0.0):
    """En stam (kon med lite böj) från z0 till h."""
    steg = 6; ringar = []
    for i in range(steg + 1):
        t = i / steg; z = z0 + (h - z0) * t; r = r0 + (r1 - r0) * t
        cx, cy = bojd[0] * t * t, bojd[1] * t * t
        ringar.append([Vector((cx + r * math.cos(2 * math.pi * j / sid), cy + r * math.sin(2 * math.pi * j / sid), z)) for j in range(sid)])
    for i in range(steg):
        for j in range(sid):
            j2 = (j + 1) % sid
            n.yta([ringar[i][j], ringar[i][j2], ringar[i + 1][j2], ringar[i + 1][j]], mi)

def gren_blad(n, bas, rikt, langd, hang, bredd, mi, upp=0.08):
    """En gren som ett hängande blad: överkanten följer grenen (ut och lite ner, spetsen vänder upp), underkanten hänger
    under (grenens hängande skott). Syns från sidan som en luddig, nedåtböjd gren."""
    sid = Vector((-rikt.y, rikt.x, 0)).normalized()
    pts_o, pts_u = [], []
    for i in range(5):
        t = i / 4
        p = bas + rikt * (langd * t) + Vector((0, 0, -langd * (0.28 * t - upp * t * t * 1.6)))
        w = bredd * math.sin(math.pi * min(1.0, 0.15 + t * 0.95)) * 0.5
        d = hang * math.sin(math.pi * min(1.0, 0.1 + t))
        pts_o.append(p + sid * w * 0.3); pts_u.append(p + Vector((0, 0, -d)) - sid * w * 0.3)
    for i in range(4):
        n.yta([pts_o[i], pts_o[i + 1], pts_u[i + 1], pts_u[i]], mi)
    # en tvärgående skiva (så grenen syns också rakt framifrån)
    for i in range(4):
        q0 = bas + rikt * (langd * i / 4) + Vector((0, 0, -langd * 0.28 * i / 4))
        q1 = bas + rikt * (langd * (i + 1) / 4) + Vector((0, 0, -langd * 0.28 * (i + 1) / 4))
        w0 = bredd * 0.5 * (1 - i / 4 * 0.8); w1 = bredd * 0.5 * (1 - (i + 1) / 4 * 0.8)
        n.yta([q0 - sid * w0, q1 - sid * w1, q1 + sid * w1, q0 + sid * w0], mi)

def gran(h, seed, smal=1.0):
    """Gran: rak stam, grenvåningar från ca 1,5 m upp till toppen, grenarna kortare uppåt, hängande, och en smal spets."""
    r = random.Random(seed); n = Nat()
    stam(n, h, 0.22 * h / 20, 0.02, 1)
    R = 0.17 * h * smal * r.uniform(0.85, 1.12)
    z = r.uniform(1.2, 2.2)
    while z < h - 0.4:
        t = z / h
        rr = R * (1 - t) ** 0.95 * r.uniform(0.75, 1.15) + 0.15
        k = max(3, int(5 + 6 * (1 - t)))
        a0 = r.uniform(0, 6.28)
        for j in range(k):
            ang = a0 + 6.28 * j / k + r.uniform(-0.3, 0.3)
            rikt = Vector((math.cos(ang), math.sin(ang), 0))
            L = rr * r.uniform(0.7, 1.05)
            gren_blad(n, Vector((0, 0, z)), rikt, L, hang=L * r.uniform(0.35, 0.55), bredd=L * 0.7, mi=0, upp=0.1)
        z += r.uniform(0.35, 0.6) * (0.6 + 0.6 * (1 - t))
    # toppskottet: en smal spets
    for j in range(2):
        sid = Vector((math.cos(1.57 * j), math.sin(1.57 * j), 0)) * 0.12
        n.yta([Vector((0, 0, h - 1.2)) - sid, Vector((0, 0, h - 1.2)) + sid, Vector((0, 0, h + 0.5))], 0)
    return n, [M_GRAN, M_STAM]

def klump(n, mitt, r, platt, seed, mi, delar=2):
    """En ojämn klump (krona eller del av krona): en ikosfär som buktas av brus."""
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=delar, radius=1.0)
    off = Vector((seed * 1.7, seed * 0.3, seed * 2.1))
    for v in bm.verts:
        p = v.co.copy()
        d = 1.0 + 0.35 * mn.noise(p * 1.6 + off) + 0.15 * mn.noise(p * 4.0 + off)
        v.co = Vector((p.x * r * d, p.y * r * d, p.z * r * d * platt)) + mitt
    for f in bm.faces:
        n.yta([v.co for v in f.verts], mi)
    bm.free()

def tall(h, seed):
    """Tall: lång, lite slingrande stam (rödbrun upptill), kronan i klumpar högt upp, platt och oregelbunden."""
    r = random.Random(seed); n = Nat()
    bo = (r.uniform(-0.8, 0.8), r.uniform(-0.8, 0.8))
    stam(n, h * 0.92, 0.28 * h / 22, 0.05, 1, bojd=bo)
    # kronan: grenar ut åt olika håll från övre tredjedelen, var och en med en platt barrklump i änden,
    # och en klump i toppen (svensk tall: oregelbunden, glesare nertill, ofta bredare än hög)
    kl = r.randint(9, 13)
    for i in range(kl):
        t = 0.62 + 0.36 * (i / (kl - 1)) ** 0.8 + r.uniform(-0.03, 0.03); z = h * t
        ang = r.uniform(0, 6.28); ut = r.uniform(1.5, 4.8) * (1.3 - t) * h / 22
        cx, cy = bo[0] * t * t, bo[1] * t * t
        mitt = Vector((cx + ut * math.cos(ang), cy + ut * math.sin(ang), z + ut * 0.15))
        rr = r.uniform(1.3, 2.1) * h / 22
        klump(n, mitt, rr, r.uniform(0.4, 0.55), seed * 13 + i, 0)
        b0 = Vector((cx, cy, z - 0.5))
        sid = (mitt - b0).cross(Vector((0, 0, 1)))
        if sid.length > 0.01:
            sid.normalize(); w = 0.07
            n.yta([b0 - sid * w, mitt - sid * w * 0.5, mitt + sid * w * 0.5, b0 + sid * w], 2)
    klump(n, Vector((bo[0] * 0.85, bo[1] * 0.85, h * 0.97)), 1.3 * h / 22, 0.6, seed * 13 + 99, 0)
    return n, [M_TALL, M_STAM, M_TALLSTAM]

def bjork(h, seed):
    """Björk: vit stam med svarta fläckar, lätt lutande, en luftig, hängande krona av många små klumpar."""
    r = random.Random(seed); n = Nat()
    bo = (r.uniform(-0.6, 0.6), r.uniform(-0.6, 0.6))
    stam(n, h * 0.9, 0.2 * h / 16, 0.04, 1, bojd=bo)
    # kronan: många små klumpar i en smal, hög oval som hänger lite (grenarna böjer ner ytterst)
    for i in range(r.randint(55, 75)):
        t = r.uniform(0.35, 0.99)
        rx = 2.3 * h / 16 * math.sin(math.pi * min(1.0, (t - 0.28) / 0.78)) + 0.3
        ang = r.uniform(0, 6.28); ut = rx * math.sqrt(r.uniform(0, 1))
        mitt = Vector((bo[0] * t * t + ut * math.cos(ang), bo[1] * t * t + ut * math.sin(ang), h * t - ut * ut * 0.12))
        klump(n, mitt, r.uniform(0.45, 0.8) * h / 16, r.uniform(1.0, 1.5), seed * 17 + i, 0, delar=1)
    return n, [M_BJORK, M_BJORKSTAM]

def lovtrad(h, seed):
    """Lövträd (asp, al): kort stam, en rundad krona av större klumpar."""
    r = random.Random(seed); n = Nat()
    stam(n, h * 0.55, 0.25 * h / 14, 0.08, 1)
    for i in range(r.randint(26, 36)):
        ang = r.uniform(0, 6.28); z = h * r.uniform(0.45, 0.95)
        rx = 3.6 * h / 14 * math.sin(math.pi * min(1.0, (z / h - 0.4) / 0.62)) + 0.5
        ut = rx * math.sqrt(r.uniform(0, 1))
        mitt = Vector((ut * math.cos(ang), ut * math.sin(ang), z))
        klump(n, mitt, r.uniform(0.9, 1.45) * h / 14, r.uniform(0.8, 1.0), seed * 19 + i, 0)
    return n, [M_LOV, M_STAM]

TRAD = bpy.data.collections.new("trad")   # inte länkad i scenen: används bara som instanser
proto = []
for i in range(6): n, ms = gran(rnd.uniform(17, 26), 100 + i, smal=rnd.uniform(0.85, 1.1)); proto.append(n.objekt(f"gran{i}", ms, TRAD))
for i in range(3): n, ms = tall(rnd.uniform(19, 25), 200 + i); proto.append(n.objekt(f"tall{i}", ms, TRAD))
for i in range(2): n, ms = bjork(rnd.uniform(14, 18), 300 + i); proto.append(n.objekt(f"bjork{i}", ms, TRAD))
for i in range(2): n, ms = lovtrad(rnd.uniform(12, 16), 400 + i); proto.append(n.objekt(f"lov{i}", ms, TRAD))

# ------------------------------------------------------------------ marken (strand, kullar, åsar) med skog
def fbm(x, y, okt=5, s=1.0):
    v, amp, f = 0.0, 0.5, 1.0
    for _ in range(okt):
        v += amp * mn.noise(Vector((x * f * s, y * f * s, 0.37)), noise_basis="PERLIN_ORIGINAL"); amp *= 0.5; f *= 2.03
    return v

def terrang(namn, y0, y1, nx, ny, hojd, mat_):
    """Ett marknät framför kameran mellan y0 och y1 (bredden följer synfältet). Höjden stiger bakåt, med kullar."""
    vs, fs = [], []
    for j in range(ny + 1):
        v = j / ny; y = y0 + (y1 - y0) * v
        for i in range(nx + 1):
            u = i / nx * 2 - 1; x = u * (y * TAN * 1.25 + 60)
            # stranden: vikar och uddar (marken börjar på olika avstånd)
            kust = 45 * fbm(x / 260, 3.1, 3)
            yy = y + kust * (1 - v)
            h = hojd(x, yy, v)
            vs.append((x, yy, h))
    for j in range(ny):
        for i in range(nx):
            k = j * (nx + 1) + i
            fs.append((k, k + 1, k + nx + 2, k + nx + 1))
    me = bpy.data.meshes.new(namn); me.from_pydata(vs, [], fs); me.update()
    for p in me.polygons: p.use_smooth = True
    me.materials.append(mat_)
    o = bpy.data.objects.new(namn, me); sc.collection.objects.link(o)
    return o

def hojd_skog(x, y, v):
    bak = (v ** 1.3) * 85 * (0.4 + 1.2 * max(0.0, 0.5 + fbm(x / 700, 7.7, 3)))   # åsar bakåt (olika höga)
    kulle = 30 * max(0.0, fbm(x / 220, y / 220, 4) + 0.1) * (0.5 + v)          # kullar, också nära stranden
    return 0.3 + bak + kulle + 3 * fbm(x / 40, y / 40, 3)

def skog(o, tathet, seed):
    """Träd på marken med geometrinoder: punkter på ytan (glesare där bruset säger det: myrar och gläntor),
    ett slumpat träd per punkt, slumpad vridning, storlek och lite lutning."""
    ng = bpy.data.node_groups.new("skog" + o.name, "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N = ng.nodes; L = ng.links.new
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    dp = N.new("GeometryNodeDistributePointsOnFaces"); dp.distribute_method = "RANDOM"
    dp.inputs["Seed"].default_value = seed
    # tätheten: brus över marken (gläntor, myrar) gånger grundtätheten
    pos = N.new("GeometryNodeInputPosition")
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.004; nz.inputs["Detail"].default_value = 3
    L(pos.outputs[0], nz.inputs["Vector"])
    mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.38; mr.inputs["From Max"].default_value = 0.5
    mr.inputs["To Min"].default_value = 0.15 * tathet; mr.inputs["To Max"].default_value = tathet
    L(nz.outputs["Fac"], mr.inputs["Value"])
    L(gi.outputs[0], dp.inputs["Mesh"]); L(mr.outputs["Result"], dp.inputs["Density"])
    ci = N.new("GeometryNodeCollectionInfo"); ci.inputs["Collection"].default_value = TRAD
    ci.inputs["Separate Children"].default_value = True; ci.inputs["Reset Children"].default_value = True
    io = N.new("GeometryNodeInstanceOnPoints"); io.inputs["Pick Instance"].default_value = True
    ri = N.new("FunctionNodeRandomValue"); ri.data_type = "INT"; ri.inputs["Max"].default_value = len(proto) - 1
    ri.inputs["Seed"].default_value = seed + 1
    rr = N.new("FunctionNodeRandomValue"); rr.data_type = "FLOAT_VECTOR"
    rr.inputs["Min"].default_value = (-0.05, -0.05, 0); rr.inputs["Max"].default_value = (0.05, 0.05, 6.283)
    rs = N.new("FunctionNodeRandomValue"); rs.data_type = "FLOAT"; rs.inputs["Min"].default_value = 0.6; rs.inputs["Max"].default_value = 1.25
    rs.inputs["Seed"].default_value = seed + 2
    L(dp.outputs["Points"], io.inputs["Points"]); L(ci.outputs[0], io.inputs["Instance"])
    L(ri.outputs[0], io.inputs["Instance Index"])
    L(rr.outputs[0], io.inputs["Rotation"]); L(rs.outputs[0], io.inputs["Scale"])
    jg = N.new("GeometryNodeJoinGeometry"); L(gi.outputs[0], jg.inputs[0]); L(io.outputs[0], jg.inputs[0])
    L(jg.outputs[0], go.inputs[0])
    md = o.modifiers.new("skog", "NODES"); md.node_group = ng

# ------------------------------------------------------------------ fjällen (höjdfält av "ridged multifractal")
def fjall(namn, y0, y1, nx, ny, hmax, skala, seed, toppar, kant=0.25):
    vs, fs = [], []
    for j in range(ny + 1):
        v = j / ny; y = y0 + (y1 - y0) * v
        env = min(1.0, v / kant, (1 - v) / kant); env = env * env * (3 - 2 * env)
        for i in range(nx + 1):
            u = i / nx * 2 - 1; x = u * y * TAN * 1.3
            # topparna där de ska stå (vinklar), annars lägre kedjor
            mask = 0.25
            for (vink, bredd, styrka) in toppar:
                xt = y * math.tan(math.radians(vink))
                mask += styrka * math.exp(-((x - xt) / (y * bredd)) ** 2)
            # (förvrängt brus: åsarna slingrar som riktiga fjäll i stället för att följa rutnätet)
            wx = 700 * mn.noise(Vector((x * 0.00025, y * 0.00025, seed)), noise_basis="PERLIN_ORIGINAL")
            wy = 700 * mn.noise(Vector((x * 0.00025 + 5.2, y * 0.00025, seed)), noise_basis="PERLIN_ORIGINAL")
            p = Vector(((x + wx) * skala + seed, (y + wy) * skala * 1.5 + seed * 0.7, seed * 0.3))
            rm = mn.ridged_multi_fractal(p, 0.9, 2.15, 8, 1.0, 2.2, noise_basis="PERLIN_ORIGINAL")
            h = hmax * env * min(1.3, mask) * max(0.0, rm) / 1.4
            vs.append((x, y, h))
    for j in range(ny):
        for i in range(nx):
            k = j * (nx + 1) + i
            fs.append((k, k + 1, k + nx + 2, k + nx + 1))
    me = bpy.data.meshes.new(namn); me.from_pydata(vs, [], fs); me.update()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(namn, me); sc.collection.objects.link(o)
    return o

def fjallmat(namn, sno, berg, grans_z, grans_n=0.62):
    """Snö där det är högt och flackt nog (normalens z), med en ojämn gräns (brus i två skalor); berget i branterna
    varierar mellan grått och brunt, med skikt och en grov yta; dis efter avståndet."""
    m = bpy.data.materials.new(namn); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links.new
    b = N["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.85
    geo = N.new("ShaderNodeNewGeometry"); sn = N.new("ShaderNodeSeparateXYZ"); L(geo.outputs["Normal"], sn.inputs[0])
    sp = N.new("ShaderNodeSeparateXYZ"); L(geo.outputs["Position"], sp.inputs[0])
    def brus(skala_, detalj=6, grov=0.6):
        n_ = N.new("ShaderNodeTexNoise"); n_.inputs["Scale"].default_value = skala_; n_.inputs["Detail"].default_value = detalj
        n_.inputs["Roughness"].default_value = grov; L(geo.outputs["Position"], n_.inputs["Vector"]); return n_
    def matte(op, a_, b_=None, c_=None):
        q = N.new("ShaderNodeMath"); q.operation = op
        for i_, v_ in enumerate((a_, b_, c_)):
            if v_ is None: continue
            if isinstance(v_, (int, float)): q.inputs[i_].default_value = v_
            else: L(v_, q.inputs[i_])
        return q.outputs[0]
    stor, fin = brus(0.0016, 6), brus(0.03, 4)
    # snöfaktor: flackhet + höjd över snögränsen + ojämnhet (stor och fin)
    hz = N.new("ShaderNodeMapRange"); hz.inputs["From Min"].default_value = grans_z; hz.inputs["From Max"].default_value = grans_z * 1.4
    L(sp.outputs["Z"], hz.inputs["Value"])
    s_ = matte("ADD", sn.outputs["Z"], matte("MULTIPLY", hz.outputs["Result"], 0.3))
    s_ = matte("ADD", s_, matte("MULTIPLY_ADD", stor.outputs["Fac"], 0.34, -0.17))
    s_ = matte("ADD", s_, matte("MULTIPLY_ADD", fin.outputs["Fac"], 0.12, -0.06))
    mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = grans_n; mr.inputs["From Max"].default_value = grans_n + 0.03
    L(s_, mr.inputs["Value"])
    # berget: grått till brunt i stora fläckar, skikt (vågräta band) och fin struktur
    bf = brus(0.0007, 3)
    br = N.new("ShaderNodeMixRGB"); br.inputs["Color1"].default_value = (*berg, 1)
    br.inputs["Color2"].default_value = (berg[0] * 1.5, berg[1] * 1.25, berg[2] * 1.0, 1); L(bf.outputs["Fac"], br.inputs["Fac"])
    sk = N.new("ShaderNodeTexWave"); sk.wave_type = "BANDS"; sk.bands_direction = "Z"; sk.inputs["Scale"].default_value = 0.012
    sk.inputs["Distortion"].default_value = 6; sk.inputs["Detail"].default_value = 3; L(geo.outputs["Position"], sk.inputs["Vector"])
    skm = N.new("ShaderNodeMixRGB"); skm.blend_type = "MULTIPLY"; skm.inputs["Fac"].default_value = 0.25
    L(br.outputs["Color"], skm.inputs["Color1"]); L(sk.outputs["Color"], skm.inputs["Color2"])
    snof = N.new("ShaderNodeMixRGB"); snof.inputs["Color1"].default_value = (sno[0] * 0.86, sno[1] * 0.9, sno[2] * 0.96, 1)
    snof.inputs["Color2"].default_value = (*sno, 1); L(fin.outputs["Fac"], snof.inputs["Fac"])
    mx = N.new("ShaderNodeMixRGB"); L(skm.outputs["Color"], mx.inputs["Color1"]); L(snof.outputs["Color"], mx.inputs["Color2"])
    L(mr.outputs["Result"], mx.inputs["Fac"]); L(mx.outputs["Color"], b.inputs["Base Color"])
    # ytan: grov i berget (fina åsar), mjukare i snön
    gr = brus(0.08, 8, 0.7)
    bu = N.new("ShaderNodeBump"); bu.inputs["Strength"].default_value = 0.45; bu.inputs["Distance"].default_value = 6
    L(gr.outputs["Fac"], bu.inputs["Height"]); L(bu.outputs["Normal"], b.inputs["Normal"])
    dmx, em, dv = med_dis(m, b.outputs["BSDF"]); L(dmx.outputs[0], N["Material Output"].inputs["Surface"])
    DIS.append((em, dv))
    return m

# ------------------------------------------------------------------ scenen
if a.trad:
    # granskning: träden på rad framför kameran, nära
    for i, p in enumerate(proto):
        o = bpy.data.objects.new("visa" + p.name, p.data); sc.collection.objects.link(o)
        o.location = (-72 + i * 12, 300, 0)
else:
    mark = terrang("strand", 950, 3800, 300, 120, hojd_skog, M_MARK)
    skog(mark, 0.034 * a.tathet, 3)
    # en lägre skogsås långt bort (i dis), utan enskilda träd: mörk mark med fin struktur räcker på 6–9 km
    M_AS = material("as", (0.03, 0.05, 0.03), 0.95, skala=0.02, variation=0.05)
    def hojd_as(x, y, v): return 40 + 260 * max(0.0, 0.55 + fbm(x / 2500, 1.3, 4)) * math.sin(math.pi * v) + 8 * fbm(x / 120, y / 120, 3)
    asen = terrang("as", 5500, 9000, 400, 40, hojd_as, M_AS)
    skog(asen, 0.0035 * a.tathet, 9)   # glesa träd på åsen (syns som en luddig kant)
    M_FJ = fjallmat("fjall", (0.9, 0.93, 0.97), (0.06, 0.07, 0.085), 600.0, 0.8)
    fj = fjall("fjall", 18000, 27000, 1400, 220, 950.0, 0.00042, 3.7, [(-10.5, 0.13, 1.1), (11.5, 0.09, 0.8), (1.0, 0.25, 0.25)])
    fj.data.materials.append(M_FJ)

# kameran: nära vattnet, vågrätt, bildens underkant = horisonten
cam = bpy.data.cameras.new("kamera"); cam.sensor_fit = "HORIZONTAL"; cam.sensor_width = 36
cam.lens = cam.sensor_width / 2 / TAN; cam.clip_start = 1; cam.clip_end = 40000
cam.shift_y = 0.5 / ASP
co = bpy.data.objects.new("kamera", cam); sc.collection.objects.link(co); sc.camera = co
co.location = (0, 0, 2.0); co.rotation_euler = (math.radians(90), 0, 0)

vg = bpy.data.worlds.new("varld"); sc.world = vg; vg.use_nodes = True
BG = vg.node_tree.nodes["Background"]
sol = bpy.data.lights.new("sol", "SUN"); sol.angle = math.radians(0.6)
SOL = bpy.data.objects.new("sol", sol); sc.collection.objects.link(SOL)

r = sc.render; r.engine = "CYCLES"; r.film_transparent = True
r.resolution_x = a.bredd; r.resolution_y = round(a.bredd / ASP); r.resolution_percentage = 100
cy = sc.cycles; cy.device = "CPU"; cy.samples = a.prov; cy.use_denoising = True
try: cy.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
cy.max_bounces = 6; cy.diffuse_bounces = 2; cy.transparent_max_bounces = 16; cy.glossy_bounces = 1
sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGBA"; r.image_settings.color_depth = "16"

def riktning(azimut, hojd):
    """Ljusets riktning: azimut i grader (0 = rakt fram, + = höger), höjd i grader. Ljuset kommer därifrån."""
    az, el = math.radians(azimut), math.radians(hojd)
    fran = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))
    return (-fran).to_track_quat("-Z", "Y").to_euler()

def lin(c): return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

STALL = {
    # solen framför till höger (som i appen), himlens blå ljus fyller skuggorna; dis mot horisontens färg
    "dag": dict(sol=(70, 32), solf=(1.0, 0.95, 0.86), sols=5.2, bg=lin((0.55, 0.70, 0.88)), bgs=1.05, dis=lin((0.62, 0.77, 0.90)), D=20000),
    # månen framför till vänster, svagt kallt ljus; diset nästan svart (som himlen vid horisonten)
    "natt": dict(sol=(-8, 22), solf=(0.75, 0.82, 1.0), sols=0.6, bg=lin((0.05, 0.08, 0.13)), bgs=0.04, dis=lin((0.020, 0.040, 0.075)), D=20000),
}
for namn, s in STALL.items():
    if a.bara and namn not in a.bara.split(","): continue
    SOL.rotation_euler = riktning(*s["sol"]); sol.color = s["solf"]; sol.energy = s["sols"]
    BG.inputs["Color"].default_value = (*s["bg"], 1); BG.inputs["Strength"].default_value = s["bgs"]
    for em, dv in DIS:
        em.inputs["Color"].default_value = (*s["dis"], 1); dv.inputs[1].default_value = s["D"]
    r.filepath = os.path.join(UT, namn + ".png")
    bpy.ops.render.render(write_still=True)
    print("KLAR", r.filepath, flush=True)
