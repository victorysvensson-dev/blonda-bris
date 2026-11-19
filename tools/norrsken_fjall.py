"""NORRSKENs fjäll (BRIS), renderade i Blender/Cycles som ett brett panorama med genomskinlig himmel.

Tre fjällkedjor (längst bort högst och ljusast, sedan en mörkare kedja och låga åsar närmast stranden), byggda som
höjdfält av "ridged multifractal"-brus, med snö som ligger på allt som är flackt nog och mörkt berg i branterna.
Två pass, som appen blandar i sin shader (ui/norrsken.js):
  bas  – svagt, kallt ljus från himlen (så fjällen syns när norrskenet är svagt)
  sken – vitt ljus uppifrån och lite bakifrån, som appen färgar med norrskenets färg rakt ovanför
Kameran är ortografisk och tittar vågrätt: bildens underkant är strandlinjen (z = 0).
Mått: 1 enhet ≈ 100 m. x åt höger, y in i bilden, z upp.

PYTHONPATH=<bpy> python3.13 tools/norrsken_fjall.py --ut <mapp> [--bredd 2800 --prov 64]
Utdata: <mapp>/bas.exr, sken.exr. tools/norrsken_bilder.py gör om dem till ui/norrsken/fjall.webp.
"""
import argparse, math, os, sys
import bpy
import mathutils.noise as mn
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument("--ut", required=True)
ap.add_argument("--bredd", type=int, default=2800)
ap.add_argument("--prov", type=int, default=64)
ap.add_argument("--forhand", action="store_true")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
UT = os.path.abspath(a.ut); os.makedirs(UT, exist_ok=True)

ASP = 8.0          # panoramat: bredd / höjd
BRED = 160.0       # bildens bredd i enheter
HOG = BRED / ASP   # bildens höjd (20)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ------------------------------------------------------------------ höjdfälten
def kedja(namn, y0, y1, nx, ny, hmax, skala, seed, kant=0.25):
    """En fjällkedja mellan y0 och y1: ridged multifractal, som tonar ner mot fram- och bakkanten (kant)."""
    vs, fs = [], []
    for j in range(ny + 1):
        v = j / ny; y = y0 + (y1 - y0) * v
        env = min(1.0, v / kant, (1 - v) / kant) if kant > 0 else 1.0
        env = env * env * (3 - 2 * env)
        for i in range(nx + 1):
            x = -BRED * 0.56 + BRED * 1.12 * i / nx
            p = Vector((x * skala + seed, y * skala * 1.4 + seed * 0.7, seed * 0.3))
            # massiv i stor skala (stiger och sjunker längs kedjan) gånger åsar och toppar
            m = 0.5 + 0.5 * mn.noise(Vector((x * skala * 0.18 + seed, seed, 0.5)), noise_basis="PERLIN_ORIGINAL")
            r = mn.ridged_multi_fractal(p, 1.1, 2.1, 6, 1.0, 2.0, noise_basis="PERLIN_ORIGINAL")
            h = hmax * env * (0.15 + 0.85 * m ** 2.2) * max(0.0, r) / 1.3
            vs.append((x, y, h))
    for j in range(ny):
        for i in range(nx):
            k = j * (nx + 1) + i
            fs.append((k, k + 1, k + nx + 2, k + nx + 1))
    me = bpy.data.meshes.new(namn); me.from_pydata(vs, [], fs); me.update()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(namn, me); sc.collection.objects.link(o)
    return o

# ------------------------------------------------------------------ material: snö på det flacka, berg i branterna
def fjallmat(namn, sno_ljus, berg_ljus, grans):
    m = bpy.data.materials.new(namn); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links.new
    b = N["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.75
    geo = N.new("ShaderNodeNewGeometry"); sep = N.new("ShaderNodeSeparateXYZ"); L(geo.outputs["Normal"], sep.inputs[0])
    tc = N.new("ShaderNodeTexCoord"); nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.35
    nz.inputs["Detail"].default_value = 8; nz.inputs["Roughness"].default_value = 0.6
    L(tc.outputs["Object"], nz.inputs["Vector"])
    # snöfaktor = flackhet (normalens z) + brus, lägre gräns högre upp
    sepz = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["Object"], sepz.inputs[0])
    hz = N.new("ShaderNodeMath"); hz.operation = "MULTIPLY"; hz.inputs[1].default_value = 0.035; L(sepz.outputs["Z"], hz.inputs[0])
    s1 = N.new("ShaderNodeMath"); s1.operation = "ADD"; L(sep.outputs["Z"], s1.inputs[0]); L(hz.outputs[0], s1.inputs[1])
    nn = N.new("ShaderNodeMath"); nn.operation = "MULTIPLY_ADD"; nn.inputs[1].default_value = 0.3; nn.inputs[2].default_value = -0.15
    L(nz.outputs["Fac"], nn.inputs[0])
    s2 = N.new("ShaderNodeMath"); s2.operation = "ADD"; L(s1.outputs[0], s2.inputs[0]); L(nn.outputs[0], s2.inputs[1])
    mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = grans; mr.inputs["From Max"].default_value = grans + 0.08
    L(s2.outputs[0], mr.inputs["Value"])
    mx = N.new("ShaderNodeMixRGB"); mx.inputs["Color1"].default_value = (*berg_ljus, 1); mx.inputs["Color2"].default_value = (*sno_ljus, 1)
    L(mr.outputs["Result"], mx.inputs["Fac"])
    # lite variation i berget (lavar, sten)
    vz = N.new("ShaderNodeTexNoise"); vz.inputs["Scale"].default_value = 2.0; L(tc.outputs["Object"], vz.inputs["Vector"])
    vm = N.new("ShaderNodeMixRGB"); vm.blend_type = "MULTIPLY"; vm.inputs["Fac"].default_value = 0.35
    L(mx.outputs["Color"], vm.inputs["Color1"]); L(vz.outputs["Color"], vm.inputs["Color2"])
    L(vm.outputs["Color"], b.inputs["Base Color"])
    bu = N.new("ShaderNodeBump"); bu.inputs["Strength"].default_value = 0.15; bu.inputs["Distance"].default_value = 0.05
    L(nz.outputs["Fac"], bu.inputs["Height"]); L(bu.outputs["Normal"], b.inputs["Normal"])
    return m

M_LANGT = fjallmat("langt", (0.78, 0.82, 0.88), (0.13, 0.14, 0.16), 0.66)
M_MITT = fjallmat("mitt", (0.75, 0.79, 0.85), (0.05, 0.055, 0.065), 0.77)
M_NARA = fjallmat("nara", (0.55, 0.58, 0.62), (0.025, 0.028, 0.032), 0.86)

k1 = kedja("langt", 70, 110, 1000, 170, 22.0, 0.038, 3.1, 0.3); k1.data.materials.append(M_LANGT)
k2 = kedja("mitt", 32, 62, 1000, 150, 11.0, 0.052, 11.7, 0.3); k2.data.materials.append(M_MITT)
k3 = kedja("nara", 8, 24, 600, 60, 2.6, 0.11, 23.3, 0.35); k3.data.materials.append(M_NARA)

# ------------------------------------------------------------------ kamera, himmel och ljus
cam = bpy.data.cameras.new("kamera"); cam.type = "ORTHO"; cam.ortho_scale = BRED
co = bpy.data.objects.new("kamera", cam); sc.collection.objects.link(co); sc.camera = co
co.location = (0.0, -40.0, HOG / 2); co.rotation_euler = (math.radians(90), 0, 0)
cam.clip_end = 400

vg = bpy.data.worlds.new("varld"); sc.world = vg; vg.use_nodes = True
BG = vg.node_tree.nodes["Background"]
BG.inputs["Color"].default_value = (0.05, 0.08, 0.13, 1)   # himlens kalla ljus (bara i bas-passet)

d = bpy.data.lights.new("sken", "AREA"); d.energy = 2.6e5; d.size = 120; d.color = (1, 1, 1)
SKEN = bpy.data.objects.new("sken", d); SKEN.location = (-20, 140, 90); sc.collection.objects.link(SKEN)
SKEN.rotation_euler = (Vector((0, 40, 0)) - SKEN.location).to_track_quat("-Z", "Y").to_euler()

r = sc.render; r.engine = "CYCLES"; r.film_transparent = True
r.resolution_x = a.bredd; r.resolution_y = round(a.bredd / ASP); r.resolution_percentage = 100
cy = sc.cycles; cy.device = "CPU"; cy.samples = a.prov; cy.use_denoising = True
try: cy.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
cy.max_bounces = 4; cy.diffuse_bounces = 2
sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"

def stall(bas):
    BG.inputs["Strength"].default_value = 1.0 if bas else 0.0
    SKEN.hide_render = bas

if a.forhand:
    stall(False); BG.inputs["Strength"].default_value = 1.0
    sc.view_settings.view_transform = "AgX"
    r.image_settings.file_format = "PNG"; r.filepath = os.path.join(UT, "forhand.png")
    bpy.ops.render.render(write_still=True); print("KLAR", r.filepath, flush=True); sys.exit(0)

r.image_settings.file_format = "OPEN_EXR"; r.image_settings.color_mode = "RGBA"; r.image_settings.color_depth = "32"
for namn in ("bas", "sken"):
    stall(namn == "bas")
    r.filepath = os.path.join(UT, namn + ".exr")
    bpy.ops.render.render(write_still=True)
    print("KLAR", r.filepath, flush=True)
