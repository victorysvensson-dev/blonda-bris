"""Den hemliga patchens glasscen (BRIS), renderad i Blender/Cycles.

Ljus är linjärt: en bild med flera ljus = summan av bilder med ett ljus i taget. Därför renderas scenen en gång
med bara grundljuset (bas) och en gång per ljusposition längs tangentbordet (ljus0..ljusK-1, vitt ljus). Appen blandar
passen i realtid efter vilka toner som spelas och färgar dem (lila / bärnsten), så att glaset, reflexerna i golvet
och skuggorna stämmer med var man spelar.

Körs med bpy (pip install bpy):  PYTHONPATH=<bpy> python3.13 tools/kristall.py --ut <mapp> [--bredd 1200 --prov 256]
Utdata: <mapp>/bas.exr, ljus0.exr ... (linjära, 32-bitars). tools/kristall_bilder.py gör om dem till webp för appen.
"""
import argparse, math, os, sys
import bpy, bmesh
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument("--ut", required=True)
ap.add_argument("--bredd", type=int, default=1200)
ap.add_argument("--hojd", type=int, default=0)
ap.add_argument("--prov", type=int, default=256)
ap.add_argument("--antal", type=int, default=9, help="antal ljuspositioner längs tangentbordet")
ap.add_argument("--bara", default="", help="kommaseparerat: bas,0,1,... (tomt = alla)")
ap.add_argument("--blend", default="", help="spara scenen som .blend också")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
os.makedirs(a.ut, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ------------------------------------------------------------------ material
def glas(namn, ior=1.47, rough=0.015, tint=(0.97, 0.96, 1.0)):
    m = bpy.data.materials.new(namn); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*tint, 1)
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["Roughness"].default_value = rough
    b.inputs["IOR"].default_value = ior
    if "Dispersion" in b.inputs: b.inputs["Dispersion"].default_value = 0.35   # regnbågsskimret i kanterna
    return m

def massing(namn):
    m = bpy.data.materials.new(namn); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.62, 0.47, 0.30, 1)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.32
    # borstad yta: lite brus i grovheten
    # (ingen anisotropi: den ger en virvel mitt på kubernas toppar)
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 60; nz.inputs["Detail"].default_value = 2
    mp = nt.nodes.new("ShaderNodeMapRange"); mp.inputs["To Min"].default_value = 0.24; mp.inputs["To Max"].default_value = 0.40
    nt.links.new(nz.outputs["Fac"], mp.inputs["Value"]); nt.links.new(mp.outputs["Result"], b.inputs["Roughness"])
    return m

def golv():
    m = bpy.data.materials.new("golv"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.016, 0.014, 0.024, 1)
    b.inputs["Roughness"].default_value = 0.14
    b.inputs["Specular IOR Level"].default_value = 0.5
    return m

GLAS, GLAS2, MASS, GOLV = glas("glas"), glas("glas_rok", tint=(0.93, 0.91, 1.0)), massing("massing"), golv()

def lagg(o, mat, mjuk=True):
    o.data.materials.append(mat)
    if mjuk and o.type == "MESH":
        for p in o.data.polygons: p.use_smooth = True
    return o

def kub(namn, s, x, y, z=None, mat=GLAS, rz=0.0, fas=0.025):
    bpy.ops.mesh.primitive_cube_add(size=s, location=(x, y, s / 2 if z is None else z), rotation=(0, 0, rz))
    o = bpy.context.object; o.name = namn
    bv = o.modifiers.new("fas", "BEVEL"); bv.width = fas * s; bv.segments = 3; bv.limit_method = "NONE"
    o.data.materials.append(mat)
    o.data.shade_smooth() if hasattr(o.data, "shade_smooth") else None
    bpy.ops.object.shade_auto_smooth() if hasattr(bpy.ops.object, "shade_auto_smooth") else None
    return o

# ------------------------------------------------------------------ objekten
# Kameran står rakt framför (från -y); kuberna är vridna ROT så att man ser två sidor och toppen, som på bilden.
ROT = math.radians(33)
kub("mitt", 1.6, 0.0, 0.0, rz=ROT)                                 # den stora glaskuben i mitten
kub("bak_massing", 1.25, -1.15, 1.35, mat=MASS, rz=ROT)            # mässing bak till vänster
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.46, location=(-1.15, 1.35, 1.25 + 0.46), segments=96, ring_count=48)
lagg(bpy.context.object, GLAS).name = "klot"
kub("bak_glas", 1.3, 0.25, 1.65, rz=ROT)                           # glaskub bakom mitten
bpy.ops.mesh.primitive_torus_add(major_radius=0.82, minor_radius=0.11, major_segments=160, minor_segments=40,
                                 location=(1.05, 2.35, 1.95), rotation=(math.radians(90), 0, math.radians(-22)))
lagg(bpy.context.object, GLAS).name = "ring"
kub("hoger_massing", 1.2, 1.75, 0.15, mat=MASS, rz=ROT)            # mässing till höger
kub("hoger_glas", 0.72, 2.05, 1.35, rz=ROT)                        # liten glaskub bakom mässingen
kub("fram_glas", 0.95, -1.45, -0.85, rz=ROT)                       # glaskub fram till vänster
bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.6, radius2=0, depth=0.9, location=(1.25, -1.25, 0.45),
                                rotation=(0, 0, ROT))
o = bpy.context.object; o.name = "pyramid"; o.data.materials.append(GLAS)
bv = o.modifiers.new("fas", "BEVEL"); bv.width = 0.012; bv.segments = 2
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.56, location=(-0.35, -1.6, 0), segments=96, ring_count=48)
o = bpy.context.object; o.name = "kupol"
bm = bmesh.new(); bm.from_mesh(o.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context="VERTS")
bm.to_mesh(o.data); bm.free()
sol = o.modifiers.new("tjock", "SOLIDIFY"); sol.thickness = 0.05; sol.offset = -1
lagg(o, GLAS)

# den räfflade vågen till vänster: ett band som reser sig mot mitten, med tunna räfflor på tvären
def vag():
    NU, NV = 260, 90
    bm = bmesh.new(); vs = []
    for i in range(NU):
        u = i / (NU - 1)
        for j in range(NV):
            v = j / (NV - 1)
            x = -3.4 + 2.55 * u
            h = 0.04 + 1.35 * math.sin(min(1.0, u / 0.8) * math.pi * 0.5) ** 2
            y = -0.55 + 1.1 * v + 0.30 * math.sin(u * math.pi * 1.4) + 0.35 * u
            z = h * (0.25 + 0.75 * v) + 0.16 * math.sin(u * math.pi * 2.6 + v * 1.6) * u
            r = 0.012 * math.sin(u * math.pi * 2 * 46)                      # räfflorna
            vs.append(bm.verts.new((x, y, z + r)))
    for i in range(NU - 1):
        for j in range(NV - 1):
            bm.faces.new((vs[i * NV + j], vs[(i + 1) * NV + j], vs[(i + 1) * NV + j + 1], vs[i * NV + j + 1]))
    me = bpy.data.meshes.new("vag"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("vag", me); sc.collection.objects.link(o)
    sol = o.modifiers.new("tjock", "SOLIDIFY"); sol.thickness = 0.03
    lagg(o, GLAS2)
vag()

# en svag lila dis långt bak (en lysande vägg som tonar uppåt), så att glaset har något ljust att bryta och
# golvet får en horisont – bara i grundljuset
def dis():
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 14.0, 0.0), rotation=(math.radians(90), 0, 0))
    o = bpy.context.object; o.name = "dis"; o.scale = (40, 20, 1)
    m = bpy.data.materials.new("dis"); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (0.40, 0.28, 1.0, 1)
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    gr = nt.nodes.new("ShaderNodeMath"); gr.operation = "POWER"; gr.inputs[1].default_value = 2.0
    inv = nt.nodes.new("ShaderNodeMapRange"); inv.inputs["From Min"].default_value = 0.5; inv.inputs["From Max"].default_value = 0.6
    inv.inputs["To Min"].default_value = 1.0; inv.inputs["To Max"].default_value = 0.0
    sx = nt.nodes.new("ShaderNodeMapRange"); sx.inputs["From Min"].default_value = 0.0; sx.inputs["From Max"].default_value = 1.0
    sx.inputs["To Min"].default_value = 0.0; sx.inputs["To Max"].default_value = math.pi
    sn = nt.nodes.new("ShaderNodeMath"); sn.operation = "SINE"
    sp = nt.nodes.new("ShaderNodeMath"); sp.operation = "POWER"; sp.inputs[1].default_value = 3.0
    mu = nt.nodes.new("ShaderNodeMath"); mu.operation = "MULTIPLY"
    st = nt.nodes.new("ShaderNodeMath"); st.operation = "MULTIPLY"; st.inputs[1].default_value = DIS
    L = nt.links.new
    L(tc.outputs["UV"], sep.inputs[0]); L(sep.outputs["Y"], inv.inputs["Value"]); L(inv.outputs["Result"], gr.inputs[0])
    L(sep.outputs["X"], sx.inputs["Value"]); L(sx.outputs["Result"], sn.inputs[0]); L(sn.outputs["Value"], sp.inputs[0])
    L(gr.outputs["Value"], mu.inputs[0]); L(sp.outputs["Value"], mu.inputs[1]); L(mu.outputs["Value"], st.inputs[0])
    L(st.outputs["Value"], em.inputs["Strength"]); L(em.outputs[0], out.inputs["Surface"])
    o.data.materials.append(m)
    return o, st
DIS = 1.1
DISV, DISS = dis()

# golvet
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0)); lagg(bpy.context.object, GOLV, mjuk=False).name = "golv"

# ------------------------------------------------------------------ kamera
cam = bpy.data.cameras.new("kamera"); cam.lens = 54; cam.sensor_width = 36
co = bpy.data.objects.new("kamera", cam); sc.collection.objects.link(co); sc.camera = co
mal = Vector((0.1, 0.45, 0.85)); pos = Vector((0.0, -11.5, 7.4))
co.location = pos; co.rotation_euler = (mal - pos).to_track_quat("-Z", "Y").to_euler()

# ------------------------------------------------------------------ ljus
vg = bpy.data.worlds.new("varld"); sc.world = vg; vg.use_nodes = True
vg.node_tree.nodes["Background"].inputs["Color"].default_value = (0.0035, 0.003, 0.007, 1)
vg.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0

def ljus(namn, typ, loc, energi, farg=(1, 1, 1), storlek=0.2, mot=None):
    d = bpy.data.lights.new(namn, typ); d.energy = energi; d.color = farg
    if typ == "AREA": d.size = storlek
    else: d.shadow_soft_size = storlek
    o = bpy.data.objects.new(namn, d); o.location = loc; sc.collection.objects.link(o)
    if mot is not None: o.rotation_euler = (Vector(mot) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o

# grundljuset: svagt lila kantljus bakifrån högt upp och en dov fyllning, så att scenen syns när ingen spelar
BAS = [ljus("bas_kant", "AREA", (0.5, 7.5, 6.5), 420, (0.55, 0.40, 1.0), 3.0, mot=(0, 0.5, 0.6)),
       ljus("bas_fyll", "AREA", (-2.0, -6.0, 9.0), 25, (0.55, 0.55, 1.0), 4.0, mot=(0, 0, 0.6))]
# ljuspositionerna längs tangentbordet. Varje position har två ljus: ett lågt framför glaset riktat upp och in
# (där strålen ur tangenten träffar) och ett bakom, som lyser genom glaset mot kameran och ger glöden.
XS = [-3.4 + 6.8 * k / (a.antal - 1) for k in range(a.antal)]
SPEL = []
for k, x in enumerate(XS):
    f = ljus(f"ljus{k}_fram", "SPOT", (x * 0.85, -2.7, 0.1), 2600, (1, 1, 1), 0.1, mot=(x * 0.4, 0.5, 1.0))
    f.data.spot_size = math.radians(80); f.data.spot_blend = 0.7
    b = ljus(f"ljus{k}_bak", "POINT", (x * 0.62, 3.3, 1.1), 650, (1, 1, 1), 0.15)
    SPEL.append((f, b))

# ------------------------------------------------------------------ rendering
r = sc.render; r.engine = "CYCLES"
r.resolution_x = a.bredd; r.resolution_y = a.hojd or round(a.bredd * 0.8); r.resolution_percentage = 100
cy = sc.cycles; cy.device = "CPU"; cy.samples = a.prov; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.015
cy.use_denoising = True
try: cy.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
cy.max_bounces = 16; cy.transmission_bounces = 16; cy.glossy_bounces = 8; cy.diffuse_bounces = 3
cy.caustics_reflective = True; cy.caustics_refractive = True; cy.blur_glossy = 0.4
cy.sample_clamp_indirect = 20.0
sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
r.image_settings.file_format = "OPEN_EXR"; r.image_settings.color_depth = "32"
r.image_settings.exr_codec = "ZIP"
r.film_transparent = False

if a.blend: bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.blend))

vilka = [s.strip() for s in a.bara.split(",") if s.strip()] or ["bas"] + [str(k) for k in range(a.antal)]
for v in vilka:
    for o in BAS: o.hide_render = v != "bas"
    DISS.inputs[1].default_value = DIS if v == "bas" else 0.0
    for k, par in enumerate(SPEL):
        for o in par: o.hide_render = v != str(k)
    r.filepath = os.path.join(os.path.abspath(a.ut), ("bas" if v == "bas" else f"ljus{v}") + ".exr")
    bpy.ops.render.render(write_still=True)
    print("KLAR", r.filepath, flush=True)
