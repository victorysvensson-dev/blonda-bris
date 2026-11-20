"""KNAPPSATSEN (BRIS): en retro sifferknappsats, renderad i Blender/Cycles som en produktbild.

Sjutton tangenter i fyra kolumner (som en vanlig sifferknappsats): beige siffror, grå räknetangenter, en orange ENTER.
Varje tangent har sin siffra och, i orange, vad den gör i trummaskinen (KICK, SNARE ... PLAY, REC). Lådan är beige
plast, kilformad, med ett litet grågrönt LCD-fönster och en NUM-lampa ovanför tangenterna och en sladd bakåt.
Knappsatsen ligger på ett mörkt bord och kameran tittar snett uppifrån (ortografiskt, TILT grader).

Appen (ui/knappsats.js) ritar det som rör sig: nedtryckta tangenter (ur passet där alla är nere, klippta med varje
tangents mask), texten i LCD-fönstret och NUM-lampan. Utdata (tools/knappsats_bilder.py gör om dem till ui/knappsats/):
  uppe.png    alla tangenter uppe
  nere.png    alla tangenter nedtryckta
  index_uppe.png / index_nere.png   tangenternas nummer * 12 i varje bildpunkt (0 = ingen tangent)
  knappsats.json  bildens storlek, LCD-fönstrets och lampans läge (bildpunkter), tangenternas namn
Mått: 1 enhet = 1 cm. x åt höger, y bakåt (bort från kameran), z upp.

PYTHONPATH=<bpy> python3.13 tools/knappsats.py --ut <mapp> [--bredd 1200 --prov 96 --forhand]
"""
import argparse, json, math, os, sys
import bpy, bmesh
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument("--ut", required=True)
ap.add_argument("--bredd", type=int, default=1200)
ap.add_argument("--prov", type=int, default=96)
ap.add_argument("--forhand", action="store_true", help="bara bilden med tangenterna uppe, för att bedöma utseendet")
ap.add_argument("--bara-index", action="store_true", help="bara indexbilderna och knappsats.json (uppe/nere finns redan)")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
UT = os.path.abspath(a.ut); os.makedirs(UT, exist_ok=True)
MONO = os.path.join(ROT, "resurser/typsnitt/blonda-mono.ttf")
GROT = os.path.join(ROT, "resurser/typsnitt/blonda-grotesk.ttf")

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ------------------------------------------------------------------ mått
U = 1.905                     # tangentavstånd (19,05 mm)
TILT = 42.0                   # kameran tittar så här många grader uppifrån
LUT = 5.0                     # knappsatsens ovansida lutar så här mycket (kilformad)
NERE = 0.34                   # så långt ner en nedtryckt tangent går
KH = 0.78                     # tangentens höjd
PLATTA = 0.55                 # plattan tangenterna sitter på (över lådans botten)
LOCK = 1.18                   # lådans ovansida (i lådans lutande plan)
MX, MFRAM, MBAK = 0.85, 0.85, 3.3   # lådans kant runt tangenterna (sidor, fram, bak med LCD och lampa)

# tangenterna: (namn, siffra, funktion, kolumn, rad, bredd, höjd, färg)
TANGENTER = [
    ("numlock", "NUM\nLOCK", "", 0, 0, 1, 1, "mork"),
    ("delat", "/", "BPM-", 1, 0, 1, 1, "gra"),
    ("ganger", "*", "BPM+", 2, 0, 1, 1, "gra"),
    ("minus", "-", "CLEAR", 3, 0, 1, 1, "gra"),
    ("7", "7", "LO TOM", 0, 1, 1, 1, "beige"),
    ("8", "8", "MID TOM", 1, 1, 1, 1, "beige"),
    ("9", "9", "HI TOM", 2, 1, 1, 1, "beige"),
    ("plus", "+", "REC", 3, 1, 1, 2, "gra"),
    ("4", "4", "C.HAT", 0, 2, 1, 1, "beige"),
    ("5", "5", "O.HAT", 1, 2, 1, 1, "beige"),
    ("6", "6", "RIM", 2, 2, 1, 1, "beige"),
    ("1", "1", "KICK", 0, 3, 1, 1, "beige"),
    ("2", "2", "SNARE", 1, 3, 1, 1, "beige"),
    ("3", "3", "CLAP", 2, 3, 1, 1, "beige"),
    ("enter", "ENTER", "PLAY", 3, 3, 1, 2, "orange"),
    ("0", "0", "BELL", 0, 4, 2, 1, "beige"),
    ("punkt", ".", "TOP TOM", 2, 4, 1, 1, "beige"),
]
GW, GD = 4 * U, 5 * U          # tangentfältet
X0, Y0 = -GW / 2, 0.0          # tangentfältets vänstra framkant (y = 0 är främsta raden, raderna går bakåt)

# ------------------------------------------------------------------ material
def mat(namn, farg, grov=0.4, spec=0.5, coat=0.0):
    m = bpy.data.materials.new(namn); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*farg, 1); b.inputs["Roughness"].default_value = grov
    b.inputs["Specular IOR Level"].default_value = spec
    if coat: b.inputs["Coat Weight"].default_value = coat; b.inputs["Coat Roughness"].default_value = 0.15
    return m, b

def plast(namn, farg, grov=0.42, struktur=0.0):
    """ABS-plast: halvblank, med en fin struktur (lådan är lite mattare och har gnistrig yta)."""
    m, b = mat(namn, farg, grov, 0.5)
    b.inputs["Subsurface Weight"].default_value = 0.05; b.inputs["Subsurface Radius"].default_value = (1.0, 0.8, 0.6)
    b.inputs["Subsurface Scale"].default_value = 0.05
    if struktur:
        nt = m.node_tree; tc = nt.nodes.new("ShaderNodeTexCoord")
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 60; nz.inputs["Detail"].default_value = 8
        bu = nt.nodes.new("ShaderNodeBump"); bu.inputs["Strength"].default_value = struktur; bu.inputs["Distance"].default_value = 0.004
        nz2 = nt.nodes.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 3; nz2.inputs["Detail"].default_value = 2
        mx = nt.nodes.new("ShaderNodeMixRGB"); mx.blend_type = "MULTIPLY"; mx.inputs["Fac"].default_value = 0.08
        mx.inputs["Color1"].default_value = (*farg, 1)
        L = nt.links.new
        L(tc.outputs["Object"], nz.inputs["Vector"]); L(nz.outputs["Fac"], bu.inputs["Height"]); L(bu.outputs["Normal"], b.inputs["Normal"])
        L(tc.outputs["Object"], nz2.inputs["Vector"]); L(nz2.outputs["Color"], mx.inputs["Color2"]); L(mx.outputs["Color"], b.inputs["Base Color"])
    return m

FARG = {"beige": plast("beige", (0.70, 0.64, 0.52), 0.38, 0.05), "gra": plast("gra", (0.30, 0.30, 0.30), 0.4, 0.05),
        "mork": plast("mork", (0.13, 0.13, 0.13), 0.42, 0.05), "orange": plast("orange", (0.86, 0.36, 0.07), 0.36, 0.05)}
LADA = plast("lada", (0.58, 0.53, 0.43), 0.55, 0.25)
PLATTAN, _ = mat("platta", (0.05, 0.05, 0.05), 0.6)
TRYCK = {"beige": mat("tryck_m", (0.12, 0.10, 0.08), 0.5)[0], "gra": mat("tryck_l", (0.82, 0.78, 0.68), 0.5)[0],
         "mork": mat("tryck_l2", (0.82, 0.78, 0.68), 0.5)[0], "orange": mat("tryck_o", (0.16, 0.07, 0.03), 0.5)[0]}
FUNK = {"beige": mat("funk_o", (0.85, 0.27, 0.02), 0.5)[0], "gra": mat("funk_o2", (1.0, 0.56, 0.18), 0.5)[0],
        "mork": mat("funk_o3", (1.0, 0.56, 0.18), 0.5)[0], "orange": mat("funk_m", (0.25, 0.10, 0.03), 0.5)[0]}
LCDM, _ = mat("lcd", (0.36, 0.40, 0.31), 0.6, 0.3, coat=0.8)   # grågrönt LCD bakom ett blankt glas (lacken)
LAMPA, LAMPB = mat("lampa", (0.25, 0.04, 0.02), 0.15, 0.5, coat=0.6)
LOGO, _ = mat("logo", (0.30, 0.27, 0.22), 0.5)
SLADD, _ = mat("sladd", (0.62, 0.58, 0.50), 0.5)
BORD, BORDB = mat("bord", (0.016, 0.016, 0.018), 0.55, 0.3)

def lagg(o, m, mjuk=False):
    o.data.materials.append(m)
    if mjuk:
        for p in o.data.polygons: p.use_smooth = True
    return o

# lådans lutande plan: allt på lådan placeras i det (rotation kring x vid framkanten)
PIV = bpy.data.objects.new("lada_plan", None); sc.collection.objects.link(PIV)
PIV.rotation_euler = (math.radians(LUT), 0, 0); PIV.location = (0, -MFRAM, 0)

def i_planet(o):   # o:s läge och form är givna i planets koordinater
    o.parent = PIV
    return o

def nyttobj(namn, bm, m, mjuk=False):
    me = bpy.data.meshes.new(namn); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(namn, me); sc.collection.objects.link(o)
    return lagg(o, m, mjuk)

def text(namn, s, x, y, z, storlek, m, typsnitt=MONO, just="LEFT", rad=1.0, idx=0):
    cu = bpy.data.curves.new(namn, "FONT"); cu.body = s; cu.font = bpy.data.fonts.load(typsnitt, check_existing=True)
    cu.size = storlek; cu.align_x = just; cu.align_y = "TOP"; cu.space_line = rad; cu.extrude = 0.0
    o = bpy.data.objects.new(namn, cu); sc.collection.objects.link(o); o.location = (x, y, z)
    o.data.materials.append(m); o.pass_index = idx
    return o

# ------------------------------------------------------------------ lådan
PV = PIV.matrix_world
def ladan():
    x0, x1 = X0 - MX, X0 + GW + MX
    y0, y1 = Y0 - MFRAM, Y0 + GD + MBAK
    bm = bmesh.new()
    # en låda vars ovansida ligger i det lutande planet (botten plan på bordet)
    hb = LOCK
    def p(x, y, ovan):
        if not ovan: return (x, y, 0.0)
        v = PV @ Vector((x, y + MFRAM, hb)); return (v.x, v.y, v.z)
    v = [bm.verts.new(p(x, y, o)) for o in (False, True) for (x, y) in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
    bm.faces.new((v[0], v[3], v[2], v[1])); bm.faces.new((v[4], v[5], v[6], v[7]))
    for i in range(4):
        j = (i + 1) % 4; bm.faces.new((v[i], v[j], v[j + 4], v[i + 4]))
    o = nyttobj("lada", bm, LADA)
    bv = o.modifiers.new("fas", "BEVEL"); bv.width = 0.45; bv.segments = 8; bv.limit_method = "ANGLE"
    # brunnen tangenterna sitter i
    bm = bmesh.new(); m_ = 0.18
    w = [bm.verts.new((x, y, z)) for z in (PLATTA, LOCK + 1.0) for (x, y) in
         ((X0 - m_, Y0 - m_ + MFRAM), (X0 + GW + m_, Y0 - m_ + MFRAM), (X0 + GW + m_, Y0 + GD + m_ + MFRAM), (X0 - m_, Y0 + GD + m_ + MFRAM))]
    bm.faces.new((w[0], w[3], w[2], w[1])); bm.faces.new((w[4], w[5], w[6], w[7]))
    for i in range(4):
        j = (i + 1) % 4; bm.faces.new((w[i], w[j], w[j + 4], w[i + 4]))
    sk = nyttobj("brunn", bm, LADA); i_planet(sk); sk.hide_render = True; sk.display_type = "WIRE"
    bo = o.modifiers.new("brunn", "BOOLEAN"); bo.operation = "DIFFERENCE"; bo.object = sk; bo.solver = "EXACT"
    # fasen först (lådans ytterkanter), hålet sedan: brunnens kant blir skarp och tangenterna står i en tydlig brunn
    # plattan i brunnens botten
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, Y0 + GD / 2 + MFRAM, PLATTA - 0.05)); pl = bpy.context.object
    pl.scale = (GW + 0.4, GD + 0.4, 0.1); lagg(pl, PLATTAN); i_planet(pl)
ladan()

# ------------------------------------------------------------------ tangenterna
NYCKLAR = {}   # namn -> lista med objekt (tangenten och dess tryck), för nedtryckt läge
def tangent(i, namn, siffra, funk, kol, rad, bw, bh, farg):
    idx = i + 1
    x = X0 + kol * U; y = Y0 + (4 - rad - (bh - 1)) * U          # rad 0 längst bak
    w, d = bw * U, bh * U
    bm = bmesh.new()
    g0, g1 = 0.08, 0.3                                           # glipa nertill, smalare upptill
    lag = [(x + g0, y + g0, 0), (x + w - g0, y + g0, 0), (x + w - g0, y + d - g0, 0), (x + g0, y + d - g0, 0)]
    topp = [(x + g1, y + g1 + 0.03, KH), (x + w - g1, y + g1 + 0.03, KH), (x + w - g1, y + d - g1 + 0.06, KH + 0.04), (x + g1, y + d - g1 + 0.06, KH + 0.04)]
    v = [bm.verts.new(q) for q in lag + topp]
    bm.faces.new((v[0], v[3], v[2], v[1])); bm.faces.new((v[4], v[5], v[6], v[7]))
    for k in range(4):
        j = (k + 1) % 4; bm.faces.new((v[k], v[j], v[j + 4], v[k + 4]))
    o = nyttobj("tangent_" + namn, bm, FARG[farg], True)
    bv = o.modifiers.new("fas", "BEVEL"); bv.width = 0.14; bv.segments = 5
    sd = o.modifiers.new("mjuk", "SUBSURF"); sd.levels = 1; sd.render_levels = 2
    o.location.z = PLATTA; o.pass_index = idx
    o.location.y += MFRAM
    delar = [o]
    # trycket på ovansidan: siffran upptill till vänster, funktionen i orange nertill
    tz = PLATTA + KH + 0.045
    tx, ty = x + g1 + 0.12, y + MFRAM + d - g1 - 0.05
    st = 0.52 if len(siffra) <= 1 else 0.24
    t1 = text("tryck_" + namn, siffra, tx, ty, tz, st, TRYCK[farg], MONO, idx=idx, rad=0.9); delar.append(t1)
    if funk:
        t2 = text("funk_" + namn, funk, tx, y + MFRAM + g1 + 0.38, tz - 0.02, 0.24, FUNK[farg], GROT, idx=idx); delar.append(t2)
    for q in delar: i_planet(q)
    NYCKLAR[namn] = delar
for i, t in enumerate(TANGENTER):
    tangent(i, *t)

# ------------------------------------------------------------------ ovanför tangenterna: LCD, lampa, märke
YB = Y0 + GD + MFRAM                 # tangentfältets bakkant (i planet)
LCD = (X0 + 0.25, YB + 0.75, 4.15, 1.25)   # vänster, framkant, bredd, djup
def lcd():
    x, y, w, d = LCD
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x + w / 2, y + d / 2, LOCK - 0.02)); f = bpy.context.object
    f.scale = (w + 0.3, d + 0.3, 0.1); lagg(f, PLATTAN); i_planet(f)
    bv = f.modifiers.new("fas", "BEVEL"); bv.width = 0.08; bv.segments = 3
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x + w / 2, y + d / 2, LOCK + 0.035)); s = bpy.context.object
    s.scale = (w, d, 1); lagg(s, LCDM); i_planet(s)
lcd()
LAMP = (X0 + GW - 0.75, YB + 1.05)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.17, location=(LAMP[0], LAMP[1], LOCK + 0.02))
lp = bpy.context.object; lp.scale = (1, 1, 0.55); lagg(lp, LAMPA, True); i_planet(lp)
text("lampa_text", "NUM", LAMP[0], LAMP[1] - 0.3, LOCK + 0.02, 0.17, LOGO, GROT, just="CENTER"); i_planet(bpy.data.objects["lampa_text"])
text("logo", "BLONDA", X0 + GW - 0.15, YB + 2.55, LOCK + 0.02, 0.36, LOGO, GROT, just="RIGHT"); i_planet(bpy.data.objects["logo"])
text("modell", "KP-84  PULS", X0 + 0.25, YB + 2.55, LOCK + 0.02, 0.2, LOGO, MONO); i_planet(bpy.data.objects["modell"])
for o in ("lampa_text", "logo", "modell"):
    bpy.data.objects[o].location.z = LOCK + 0.004

# sladden: ut baktill, en mjuk båge bort över bordet
cu = bpy.data.curves.new("sladd", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.18; cu.bevel_resolution = 6
sp = cu.splines.new("BEZIER"); pts = [(0.6, Y0 + GD + MFRAM + MBAK - 0.2, 0.6), (1.4, Y0 + GD + MFRAM + MBAK + 3.0, 0.2), (4.5, Y0 + GD + 18, 0.2)]
sp.bezier_points.add(len(pts) - 1)
for bp, q in zip(sp.bezier_points, pts):
    bp.co = q; bp.handle_left_type = bp.handle_right_type = "AUTO"
so = bpy.data.objects.new("sladd", cu); sc.collection.objects.link(so); so.data.materials.append(SLADD)

# fötter (syns som en liten skugga under framkanten)
for fx in (X0 - MX + 1.2, X0 + GW + MX - 1.2):
    for fy in (Y0 - MFRAM + 1.0, Y0 + GD + MBAK - 1.0):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=0.1, location=(fx, fy, 0.0)); lagg(bpy.context.object, PLATTAN)

# bordet: mörkt, lite struktur
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.05)); bo_ = bpy.context.object; lagg(bo_, BORD)
nt = BORD.node_tree; tc = nt.nodes.new("ShaderNodeTexCoord"); nz = nt.nodes.new("ShaderNodeTexNoise")
nz.inputs["Scale"].default_value = 0.6; nz.inputs["Detail"].default_value = 10
bu = nt.nodes.new("ShaderNodeBump"); bu.inputs["Strength"].default_value = 0.08
nt.links.new(tc.outputs["Object"], nz.inputs["Vector"]); nt.links.new(nz.outputs["Fac"], bu.inputs["Height"]); nt.links.new(bu.outputs["Normal"], BORDB.inputs["Normal"])

# ------------------------------------------------------------------ kamera och ljus
MITT = Vector((0, Y0 + (GD + MBAK) / 2 + 0.3, 1.0))
cam = bpy.data.cameras.new("kamera"); cam.type = "ORTHO"; cam.ortho_scale = 17.5
co = bpy.data.objects.new("kamera", cam); sc.collection.objects.link(co); sc.camera = co
rikt = Vector((0, math.cos(math.radians(TILT)), -math.sin(math.radians(TILT))))
co.location = MITT - rikt * 60; co.rotation_euler = rikt.to_track_quat("-Z", "Y").to_euler()

vg = bpy.data.worlds.new("varld"); sc.world = vg; vg.use_nodes = True
vg.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.004, 0.005, 1)

def ljus(namn, loc, energi, farg, storlek, mot):
    d = bpy.data.lights.new(namn, "AREA"); d.energy = energi; d.color = farg; d.size = storlek
    o = bpy.data.objects.new(namn, d); o.location = loc; sc.collection.objects.link(o)
    o.rotation_euler = (Vector(mot) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    o.visible_camera = False
    return o
ljus("nyckel", (-16, -4, 16), 5200, (1.0, 0.95, 0.88), 7, MITT)      # stor mjuk lampa snett ovanifrån vänster
ljus("kant", (12, 22, 9), 1500, (0.85, 0.9, 1.0), 6, MITT)          # kantljus bakifrån höger
ljus("fyll", (10, -18, 6), 260, (0.9, 0.92, 1.0), 14, MITT)

r = sc.render; r.engine = "CYCLES"
r.resolution_x = a.bredd; r.resolution_y = round(a.bredd * 0.86); r.resolution_percentage = 100
cy = sc.cycles; cy.device = "CPU"; cy.samples = a.prov; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.02
cy.use_denoising = True
try: cy.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
cy.max_bounces = 8; cy.transmission_bounces = 4
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Base Contrast"

def nertryckt(on):
    for namn, delar in NYCKLAR.items():
        for o in delar:
            o.location.z = o.get("z0", o.location.z) if not on else o["z0"] - NERE
for delar in NYCKLAR.values():
    for o in delar: o["z0"] = o.location.z

def till_bild(p):
    v = world_to_camera_view(sc, co, p)
    return [round(v.x * r.resolution_x, 2), round((1 - v.y) * r.resolution_y, 2)]

def i_bild(x, y, z):   # punkt i lådans plan (samma koordinater som delarna som sitter i planet) -> bildpunkt
    return till_bild(PV @ Vector((x, y, z)))

def rendera(namn, nere):
    nertryckt(nere)
    r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGB"; r.image_settings.color_depth = "8"
    r.filepath = os.path.join(UT, namn + ".png"); cy.samples = a.prov
    bpy.ops.render.render(write_still=True); print("KLAR", r.filepath, flush=True)

def index(namn, nere):
    """tangenternas nummer i varje bildpunkt: alla ytor lyser med objektindex * 12 / 255 (Raw, ett prov, ingen
    kantutjämning), så bildpunkten har värdet 12 * tangentens nummer (0 = ingen tangent). Appens mask per tangent."""
    nertryckt(nere)
    m = bpy.data.materials.get("index_lys") or bpy.data.materials.new("index_lys")
    m.use_nodes = True; nt = m.node_tree
    for n_ in list(nt.nodes): nt.nodes.remove(n_)
    oi = nt.nodes.new("ShaderNodeObjectInfo"); mu = nt.nodes.new("ShaderNodeMath"); mu.operation = "MULTIPLY"; mu.inputs[1].default_value = 12 / 255
    em = nt.nodes.new("ShaderNodeEmission"); ut_ = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(oi.outputs["Object Index"], mu.inputs[0]); nt.links.new(mu.outputs[0], em.inputs["Strength"]); nt.links.new(em.outputs[0], ut_.inputs["Surface"])
    em.inputs["Color"].default_value = (1, 1, 1, 1)
    vl = sc.view_layers[0]; vl.material_override = m
    vt, lk = sc.view_settings.view_transform, sc.view_settings.look
    sc.view_settings.view_transform = "Raw"; sc.view_settings.look = "None"
    bak = vg.node_tree.nodes["Background"].inputs["Strength"].default_value; vg.node_tree.nodes["Background"].inputs["Strength"].default_value = 0
    gammal = cy.samples; cy.samples = 1; cy.use_denoising = False; cy.use_adaptive_sampling = False; r.filter_size = 0.01
    r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "BW"; r.image_settings.color_depth = "8"
    r.filepath = os.path.join(UT, namn + ".png")
    bpy.ops.render.render(write_still=True); print("KLAR", r.filepath, flush=True)
    vl.material_override = None; sc.view_settings.view_transform = vt; sc.view_settings.look = lk
    vg.node_tree.nodes["Background"].inputs["Strength"].default_value = bak
    cy.samples = gammal; cy.use_denoising = True; cy.use_adaptive_sampling = True; r.filter_size = 1.5

if a.forhand:
    rendera("forhand", False); sys.exit(0)

if not a.bara_index:
    rendera("uppe", False)
    rendera("nere", True)
index("index_uppe", False)
index("index_nere", True)
info = {
    "w": r.resolution_x, "h": r.resolution_y,
    "tangenter": [t[0] for t in TANGENTER],
    "lcd": [i_bild(LCD[0], LCD[1] + LCD[3], LOCK + 0.05), i_bild(LCD[0] + LCD[2], LCD[1] + LCD[3], LOCK + 0.05),
            i_bild(LCD[0] + LCD[2], LCD[1], LOCK + 0.05), i_bild(LCD[0], LCD[1], LOCK + 0.05)],   # hörnen: bak vänster, bak höger, fram höger, fram vänster
    "lampa": i_bild(LAMP[0], LAMP[1], LOCK + 0.11), "lampa_r": round(0.17 / cam.ortho_scale * r.resolution_x, 2),
}
json.dump(info, open(os.path.join(UT, "knappsats.json"), "w"), indent=1)
print("KLAR", os.path.join(UT, "knappsats.json"), flush=True)
