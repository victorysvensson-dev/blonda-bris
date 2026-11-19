"""Den hemliga patchen ORGELN (BRIS): en piporgel i en stenkyrka, renderad i Blender/Cycles.

Samma idé som KRISTALL (tools/kristall.py): ljus är linjärt, så scenen renderas en gång med bara grundljuset (bas:
månsken genom rosettfönstret och ett svagt varmt sken nerifrån) och en gång per ljusposition längs tangentbordet
(ljus0..ljusK-1). I ett ljuspass lyser ett varmt ljus upp piporna vid den positionen framifrån och bakifrån, och
pipornas munnar där glöder. Appen blandar passen efter vilka toner som spelas (vänster = låga toner).

Orgelfasaden: ett fodral i mörk ek med förgyllda lister och krön, tre torn (det höga i mitten och två på sidorna)
och två fält emellan, med pipor i blankt tenn (fot, kropp och mun). Bakom: en vägg av huggen sten med ett rosettfönster.
Mått: 1 enhet ≈ 1 m. x åt höger, y in i bilden, z upp.

PYTHONPATH=<bpy> python3.13 tools/orgel.py --ut <mapp> [--bredd 1100 --prov 96 --bara bas,0,1 --forhand]
Utdata: <mapp>/bas.exr, ljus0.exr ... tools/kristall_bilder.py --namn orgel gör om dem till ui/orgel/.
"""
import argparse, math, os, sys
import bpy
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument("--ut", required=True)
ap.add_argument("--bredd", type=int, default=1100)
ap.add_argument("--prov", type=int, default=96)
ap.add_argument("--antal", type=int, default=9)
ap.add_argument("--bara", default="")
ap.add_argument("--forhand", action="store_true", help="en bild med grundljuset och tre ljuspositioner (för att bedöma utseendet)")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
UT = os.path.abspath(a.ut); os.makedirs(UT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
K = a.antal

# ------------------------------------------------------------------ material
def mat(namn, farg, metall=0.0, grov=0.5, spec=0.5):
    m = bpy.data.materials.new(namn); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*farg, 1); b.inputs["Metallic"].default_value = metall
    b.inputs["Roughness"].default_value = grov; b.inputs["Specular IOR Level"].default_value = spec
    return m, b

def tenn():
    m, b = mat("tenn", (0.82, 0.8, 0.76), 1.0, 0.16)
    nt = m.node_tree   # lite ojämn glans på höjden (hamrad, polerad för hand)
    tc = nt.nodes.new("ShaderNodeTexCoord"); nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 3
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (6, 6, 0.6)
    rg = nt.nodes.new("ShaderNodeMapRange"); rg.inputs["To Min"].default_value = 0.1; rg.inputs["To Max"].default_value = 0.26
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    nt.links.new(nz.outputs["Fac"], rg.inputs["Value"]); nt.links.new(rg.outputs["Result"], b.inputs["Roughness"])
    return m

def ek():
    m, b = mat("ek", (0.07, 0.035, 0.018), 0.0, 0.3)
    nt = m.node_tree   # ådring på höjden
    tc = nt.nodes.new("ShaderNodeTexCoord"); w = nt.nodes.new("ShaderNodeTexWave")
    w.wave_type = "BANDS"; w.bands_direction = "X"; w.inputs["Scale"].default_value = 14.0
    w.inputs["Distortion"].default_value = 4.0; w.inputs["Detail"].default_value = 4; w.inputs["Detail Scale"].default_value = 2.0
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (0.022, 0.011, 0.006, 1); cr.color_ramp.elements[1].color = (0.06, 0.032, 0.016, 1)
    nt.links.new(tc.outputs["Object"], w.inputs["Vector"]); nt.links.new(w.outputs["Fac"], cr.inputs["Fac"])
    nt.links.new(cr.outputs["Color"], b.inputs["Base Color"])
    return m

def guld():
    m, b = mat("guld", (0.86, 0.6, 0.27), 1.0, 0.3)
    nt = m.node_tree   # bladguld: lite fläckigt
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 40
    rg = nt.nodes.new("ShaderNodeMapRange"); rg.inputs["To Min"].default_value = 0.2; rg.inputs["To Max"].default_value = 0.45
    nt.links.new(nz.outputs["Fac"], rg.inputs["Value"]); nt.links.new(rg.outputs["Result"], b.inputs["Roughness"])
    return m

def sten():
    m, b = mat("sten", (0.2, 0.18, 0.16), 0.0, 0.85, 0.3)
    nt = m.node_tree   # huggna block i förband, med fogar och lite olika ton per block
    tc = nt.nodes.new("ShaderNodeTexCoord"); br = nt.nodes.new("ShaderNodeTexBrick")
    br.inputs["Scale"].default_value = 0.42; br.inputs["Mortar Size"].default_value = 0.01
    br.inputs["Brick Width"].default_value = 0.9; br.inputs["Row Height"].default_value = 0.42
    br.inputs["Color1"].default_value = (0.13, 0.115, 0.1, 1); br.inputs["Color2"].default_value = (0.09, 0.08, 0.07, 1)
    br.inputs["Mortar"].default_value = (0.05, 0.045, 0.04, 1)
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Rotation"].default_value = (math.radians(90), 0, 0)
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 14; nz.inputs["Detail"].default_value = 6
    mx = nt.nodes.new("ShaderNodeMixRGB"); mx.blend_type = "MULTIPLY"; mx.inputs["Fac"].default_value = 0.6
    bu = nt.nodes.new("ShaderNodeBump"); bu.inputs["Strength"].default_value = 0.35
    L = nt.links.new
    L(tc.outputs["Object"], mp.inputs["Vector"]); L(mp.outputs["Vector"], br.inputs["Vector"])
    L(br.outputs["Color"], mx.inputs["Color1"]); L(nz.outputs["Color"], mx.inputs["Color2"]); L(mx.outputs["Color"], b.inputs["Base Color"])
    L(br.outputs["Fac"], bu.inputs["Height"]); L(bu.outputs["Normal"], b.inputs["Normal"])
    return m

def svart():
    m, b = mat("svart", (0.004, 0.003, 0.003), 0.0, 0.9)
    return m

def glod(namn, farg, styrka):   # ren emission med en styrka som kan ändras per pass
    m = bpy.data.materials.new(namn); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    ut = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*farg, 1); em.inputs["Strength"].default_value = styrka
    nt.links.new(em.outputs[0], ut.inputs["Surface"])
    return m, em

TENN, EK, GULD, STEN, SVART = tenn(), ek(), guld(), sten(), svart()
# pipornas munnar: en emission per ljusposition (tänds i sitt pass), och rosettfönstrets glas (bara i grundpasset)
MUN = [glod(f"mun{k}", (1.0, 0.72, 0.42), 0.0) for k in range(K)]
ROSETT, ROSETT_EM = glod("rosett", (0.42, 0.52, 1.0), 0.0)
def _rosettfarg():
    nt = ROSETT.node_tree; tc = nt.nodes.new("ShaderNodeTexCoord"); vo = nt.nodes.new("ShaderNodeTexVoronoi")
    vo.inputs["Scale"].default_value = 9.0
    cr = nt.nodes.new("ShaderNodeValToRGB"); el = cr.color_ramp.elements; cr.color_ramp.interpolation = "CONSTANT"
    el[0].color = (0.18, 0.3, 1.0, 1); el[1].position = 0.55; el[1].color = (0.9, 0.12, 0.1, 1)
    e = el.new(0.35); e.color = (0.25, 0.5, 1.0, 1); e = el.new(0.8); e.color = (1.0, 0.62, 0.15, 1)
    nt.links.new(tc.outputs["Object"], vo.inputs["Vector"]); nt.links.new(vo.outputs["Color"], cr.inputs["Fac"])
    nt.links.new(cr.outputs["Color"], ROSETT_EM.inputs["Color"])
_rosettfarg()

def lagg(o, m, mjuk=True):
    o.data.materials.append(m)
    if mjuk:
        for p in o.data.polygons: p.use_smooth = True
    return o

def lada(x0, x1, y0, y1, z0, z1, m, namn="lada", fas=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    o = bpy.context.object; o.name = namn; o.scale = (x1 - x0, y1 - y0, z1 - z0)
    bpy.ops.object.transform_apply(scale=True)
    if fas > 0: bv = o.modifiers.new("fas", "BEVEL"); bv.width = fas; bv.segments = 2
    return lagg(o, m, mjuk=False)

def cyl(x, y, z0, z1, r, m, namn="cyl", r2=None, n=40):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=r, depth=z1 - z0, location=(x, y, (z0 + z1) / 2))
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=n, radius1=r, radius2=r2, depth=z1 - z0, location=(x, y, (z0 + z1) / 2))
    o = bpy.context.object; o.name = namn
    return lagg(o, m)

def grupp(x):   # vilken ljusposition en pipa hör till (vänster -> höger)
    return max(0, min(K - 1, round((x + BRED) / (2 * BRED) * (K - 1))))

# ------------------------------------------------------------------ piporna
def pipa(x, y, fot_z, h, r):
    """En pipa: konisk fot, rak kropp och en mun (mörk springa med ett glödande inre) framtill."""
    fh = min(0.75, max(0.3, h * 0.2))
    cyl(x, y, fot_z, fot_z + fh, r * 0.22, TENN, "fot", r2=r)
    cyl(x, y, fot_z + fh, fot_z + h, r, TENN, "pipa")
    # munnen: den platta överläppen (en tunn sköld) och springan under den
    mh = r * 1.1
    lada(x - r * 0.62, x + r * 0.62, y - r - 0.012, y - r * 0.55, fot_z + fh, fot_z + fh + mh * 0.22, MUN[grupp(x)][0], "mun")
    lada(x - r * 0.66, x + r * 0.66, y - r - 0.006, y - r * 0.6, fot_z + fh + mh * 0.22, fot_z + fh + mh, TENN, "lapp")

def falt(xc, bredd, antal, y, fot_z, hojder, r):
    for i in range(antal):
        x = xc - bredd / 2 + bredd * (i + 0.5) / antal
        pipa(x, y, fot_z, hojder(i / max(1, antal - 1)), r)

BRED = 4.2       # fasadens halva bredd (för ljuspositionerna)
IMP = 1.75       # impostens höjd: där piporna står
# tornens pipor står i en spetsig "mitra" (längst i mitten), fälten sjunker utåt
mitra = lambda hmin, hmax: (lambda t: hmin + (hmax - hmin) * (1 - abs(t - 0.5) * 2) ** 0.8)
falt(0.0, 1.95, 7, -0.62, IMP, mitra(3.6, 4.7), 0.13)                    # mitttornet
for s in (-1, 1):
    falt(s * 3.35, 1.45, 5, -0.5, IMP, mitra(3.1, 3.9), 0.12)             # sidotornen
    falt(s * 1.7, 1.35, 9, -0.3, IMP, (lambda t, s=s: 2.9 - 0.9 * (t if s > 0 else 1 - t)), 0.075)   # fälten
    falt(s * 1.7, 1.25, 11, -0.28, IMP + 3.25, (lambda t, s=s: 1.05 - 0.35 * (t if s > 0 else 1 - t)), 0.045)   # övre fälten

# ------------------------------------------------------------------ fodralet
def torn(xc, bredd, y, topp, hog):
    x0, x1 = xc - bredd / 2 - 0.12, xc + bredd / 2 + 0.12
    for xs in (x0, x1 - 0.12):  # stolparna
        lada(xs, xs + 0.12, y - 0.1, 0.35, IMP - 0.05, topp, EK, "stolpe", 0.01)
        lada(xs - 0.01, xs + 0.13, y - 0.11, y - 0.09, IMP + 0.2, topp - 0.3, GULD, "lister", 0.004)   # förgylld list framtill
    lada(x0 - 0.1, x1 + 0.1, y - 0.22, 0.35, topp, topp + 0.18, EK, "krans", 0.02)      # kransen
    lada(x0 - 0.13, x1 + 0.13, y - 0.25, y - 0.2, topp + 0.04, topp + 0.12, GULD, "kranslist", 0.006)
    lada(x0 - 0.05, x1 + 0.05, y - 0.18, 0.3, topp + 0.18, topp + 0.32, EK, "krans2", 0.02)
    # pipskärmen: förgyllt snideri ovanför piporna (en panel med sniderier = guld med reliefmönster)
    lada(x0 + 0.12, x1 - 0.12, y - 0.04, y + 0.02, topp - (0.55 if hog else 0.42), topp, GULD, "skarm", 0.004)
    # krönet: en urna i mitten och två spiror
    if hog:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.16, location=(xc, y - 0.05, topp + 0.5)); lagg(bpy.context.object, GULD)
        cyl(xc, y - 0.05, topp + 0.32, topp + 0.4, 0.13, GULD, "fot")
        cyl(xc, y - 0.05, topp + 0.64, topp + 1.0, 0.07, GULD, "spira", r2=0.0)
    for xs in (x0, x1):
        cyl(xs, y - 0.1, topp + 0.32, topp + 0.62, 0.05, GULD, "spira", r2=0.0)

torn(0.0, 1.95, -0.62, IMP + 4.95, True)
for s in (-1, 1):
    torn(s * 3.35, 1.45, -0.5, IMP + 4.15, True)
    # fälten: tak med list, och det övre fältets ram
    x0, x1 = (0.98, 2.42) if s > 0 else (-2.42, -0.98)
    lada(x0, x1, -0.42, 0.3, IMP + 3.05, IMP + 3.2, EK, "faltlist", 0.01)
    lada(x0, x1, -0.44, -0.4, IMP + 3.08, IMP + 3.16, GULD, "faltguld", 0.004)
    lada(x0, x1, -0.36, 0.3, IMP + 4.35, IMP + 4.55, EK, "faltkrans", 0.015)
    lada(x0 + 0.05, x1 - 0.05, -0.33, -0.29, IMP + 4.0, IMP + 4.35, GULD, "faltskarm", 0.004)
    lada(x0, x1, -0.4, -0.3, IMP - 0.08, IMP + 0.02, GULD, "faltfot", 0.004)
# underbyggnaden: en ekpanel med fyllningar, impostlisten och läktarens kant
lada(-4.4, 4.4, -0.8, 0.4, 0.0, IMP - 0.05, EK, "under", 0.02)
lada(-4.5, 4.5, -0.92, 0.4, IMP - 0.12, IMP, EK, "impost", 0.02)
lada(-4.52, 4.52, -0.94, -0.9, IMP - 0.1, IMP - 0.04, GULD, "impostguld", 0.004)
for i in range(8):
    x = -3.85 + 7.7 * (i + 0.5) / 8 - 0.4
    lada(x, x + 0.8, -0.83, -0.79, 0.25, IMP - 0.3, EK, "fyllning", 0.03)
    lada(x + 0.08, x + 0.72, -0.84, -0.82, 0.33, IMP - 0.38, GULD, "fyllnad_list", 0.003)
    lada(x + 0.1, x + 0.7, -0.85, -0.83, 0.35, IMP - 0.4, EK, "fyllnad_in", 0.01)
# insidan bakom piporna: mörker (bakom fälten upp till deras krans, bakom tornen upp till kransen)
lada(-4.4, 4.4, 0.35, 0.5, IMP, IMP + 4.5, SVART, "inre")
lada(-1.1, 1.1, 0.3, 0.45, IMP, IMP + 4.95, SVART, "inre_mitt")
for s in (-1, 1): lada(s * 3.35 - 0.85, s * 3.35 + 0.85, 0.3, 0.45, IMP, IMP + 4.15, SVART, "inre_sida")

# ------------------------------------------------------------------ kyrkan
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 1.2, 6.0), rotation=(math.radians(90), 0, 0))
o = bpy.context.object; o.scale = (30, 16, 1); bpy.ops.object.transform_apply(scale=True); lagg(o, STEN, False).name = "vagg"
# rosettfönstret: ett runt glas med blyspröjsar (en ring, ekrar och små ringar), i en djup omfattning av sten
RZ, RR = 9.05, 1.15
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=RR, depth=0.05, location=(0, 1.17, RZ), rotation=(math.radians(90), 0, 0))
lagg(bpy.context.object, ROSETT).name = "rosett"
bpy.ops.mesh.primitive_torus_add(major_radius=RR + 0.08, minor_radius=0.16, major_segments=96, minor_segments=16,
                                 location=(0, 1.08, RZ), rotation=(math.radians(90), 0, 0))
lagg(bpy.context.object, STEN).name = "omfattning"
bpy.ops.mesh.primitive_torus_add(major_radius=RR * 0.32, minor_radius=0.035, major_segments=64, minor_segments=8,
                                 location=(0, 1.13, RZ), rotation=(math.radians(90), 0, 0)); lagg(bpy.context.object, SVART)
for i in range(12):
    v = i / 12 * math.tau
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.028, depth=RR * 0.68, rotation=(0, v, 0),
        location=(math.sin(v) * RR * 0.66, 1.13, RZ + math.cos(v) * RR * 0.66)); lagg(bpy.context.object, SVART)
    bpy.ops.mesh.primitive_torus_add(major_radius=RR * 0.16, minor_radius=0.025, major_segments=32, minor_segments=6,
        location=(math.sin(v + math.pi / 12) * RR * 0.72, 1.13, RZ + math.cos(v + math.pi / 12) * RR * 0.72),
        rotation=(math.radians(90), 0, 0)); lagg(bpy.context.object, SVART)

# ------------------------------------------------------------------ kamera och ljus
cam = bpy.data.cameras.new("kamera"); cam.lens = 38; cam.sensor_width = 36
co = bpy.data.objects.new("kamera", cam); sc.collection.objects.link(co); sc.camera = co
pos, mal = Vector((0.0, -15.5, 2.6)), Vector((0.0, 0.0, 4.8))
co.location = pos; co.rotation_euler = (mal - pos).to_track_quat("-Z", "Y").to_euler()

vg = bpy.data.worlds.new("varld"); sc.world = vg; vg.use_nodes = True
vg.node_tree.nodes["Background"].inputs["Color"].default_value = (0.002, 0.002, 0.003, 1)

def ljus(namn, typ, loc, energi, farg=(1, 1, 1), storlek=0.3, mot=None):
    d = bpy.data.lights.new(namn, typ); d.energy = energi; d.color = farg
    if typ == "AREA": d.size = storlek
    else: d.shadow_soft_size = storlek
    o = bpy.data.objects.new(namn, d); o.location = loc; sc.collection.objects.link(o)
    if mot is not None: o.rotation_euler = (Vector(mot) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o

# grundljuset: kallt månsken snett uppifrån (som genom ett högt fönster) och ett svagt varmt sken nerifrån (ljusen
# vid läktaren), så att orgeln syns i mörkret när ingen spelar
BAS = [ljus("bas_mane", "AREA", (-6.0, -7.0, 11.0), 380, (0.55, 0.65, 1.0), 2.5, mot=(0.5, 0, 4.5)),
       ljus("bas_varm", "AREA", (0.0, -4.5, 0.6), 55, (1.0, 0.62, 0.32), 6.0, mot=(0, 0, 4.0)),
       ljus("bas_kant", "AREA", (5.0, -2.0, 9.5), 90, (0.5, 0.6, 1.0), 2.0, mot=(1.0, 0, 5.0))]
XS = [-BRED + 2 * BRED * k / (K - 1) for k in range(K)]
SPEL = []
for k, x in enumerate(XS):
    f = ljus(f"ljus{k}_fram", "AREA", (x * 0.95, -2.8, IMP + 0.25), 300, (1, 1, 1), 0.8, mot=(x, -0.4, IMP + 3.2))
    b = ljus(f"ljus{k}_bak", "POINT", (x, 0.1, IMP + 2.2), 120, (1, 1, 1), 0.4)
    SPEL.append((f, b))

r = sc.render; r.engine = "CYCLES"
r.resolution_x = a.bredd; r.resolution_y = round(a.bredd * 0.9); r.resolution_percentage = 100
cy = sc.cycles; cy.device = "CPU"; cy.samples = a.prov; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.02
cy.use_denoising = True
try: cy.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
cy.max_bounces = 8; cy.glossy_bounces = 6; cy.diffuse_bounces = 2; cy.transmission_bounces = 2
cy.sample_clamp_indirect = 10.0; cy.blur_glossy = 0.5
sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
r.film_transparent = False

def stall(bas, aktiva):
    for o in BAS: o.hide_render = not bas
    ROSETT_EM.inputs["Strength"].default_value = 1.5 if bas else 0.0
    for k, (f, b) in enumerate(SPEL):
        on = k in aktiva; f.hide_render = not on; b.hide_render = not on
        MUN[k][1].inputs["Strength"].default_value = 9.0 if on else 0.0

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
