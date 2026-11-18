"""Den hemliga patchen KASSETTEN (BRIS): en kassettbandspelare renderad i Blender/Cycles, rakt framifrån (ortografiskt).

Det som rör sig ritas av appen (ui/kassett.js), så scenen renderas i lager:
  bak.png   – det som ligger bakom spolarna: luckans insida och kassettens bakre halva (genomskinlig bakgrund)
  fram.png  – allt framför spolarna: frontpanelen, den rökfärgade luckan, kassettens framsida med etikett, fönster och
              navhål, VU-mätarna, räkneverket och tangenterna (genomskinligt där man ser in till spolarna)
  vu.png    – bara VU-mätarnas bakgrundsljus (läggs till i appen efter nivån)
  nav.png   – ett spolnav sett framifrån (appen snurrar det; bandet runt navet ritas av appen)
  kassett.json – var spolarna, nålarnas fästen och räkneverket ligger i bilden (bildpunkter), och skalor.
Mått i Blender: 1 enhet = 50 mm (kassetten är 100,4 x 63,8 mm = 2,008 x 1,276).

PYTHONPATH=<bpy> python3.13 tools/kassett.py --ut <mapp> [--bredd 1600 --prov 128 --bara bak,fram,vu,nav]
"""
import argparse, json, math, os, sys
import bpy, bmesh
from mathutils import Vector

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument("--ut", required=True)
ap.add_argument("--bredd", type=int, default=1600)
ap.add_argument("--prov", type=int, default=128)
ap.add_argument("--bara", default="")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
UT = os.path.abspath(a.ut); os.makedirs(UT, exist_ok=True)
MONO = os.path.join(ROT, "resurser/typsnitt/blonda-mono.ttf")
GROT = os.path.join(ROT, "resurser/typsnitt/blonda-grotesk.ttf")

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ------------------------------------------------------------------ mått
PW, PH, PD = 4.8, 2.6, 0.9                 # frontpanelen
DX, DZ, DWW, DHH = -1.05, 0.10, 2.45, 1.5  # luckan (mitt, bredd, höjd)
KW, KH = 2.008, 1.276                       # kassetten
KX, KZ, KY = DX, DZ, 0.22            # kassettens mitt (framsidan ligger vid y = KY)
NAV_DX, NAV_DZ = 0.425, 0.07                # spolarnas mitt relativt kassetten (42,5 mm isär)
HAL_R = 0.205                               # navhålen
NAV_R = 0.22                                # navets ytterradie (där bandet lindas), sprite
PACK_MIN, PACK_MAX = 0.22, 0.47             # bandets radie: tomt nav ... full spole
FON_W, FON_H = 0.42, 0.27                   # fönstret mitt i kassetten
VU = [(0.80, 0.50), (1.86, 0.50)]           # VU-mätarnas mitt
VUW, VUH = 0.94, 0.62
CNT = (1.33, -0.16, 0.46, 0.15)             # räkneverket (mitt x, z, bredd, höjd)

# ------------------------------------------------------------------ material
def mat(namn, farg=(0.5, 0.5, 0.5), metall=0.0, grov=0.4, alfa=1.0, emit=None, emitS=0.0):
    m = bpy.data.materials.new(namn); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*farg, 1); b.inputs["Metallic"].default_value = metall
    b.inputs["Roughness"].default_value = grov; b.inputs["Alpha"].default_value = alfa
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = emitS
    if alfa < 1:
        try: m.surface_render_method = "BLENDED"
        except Exception: pass
    return m

def borstad(namn, farg, grov=0.32):
    """borstad aluminium: grovheten varierar i tunna streck längs x"""
    m = mat(namn, farg, 1.0, grov); nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.5, 600, 600)
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 6
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = grov - 0.08; mr.inputs["To Max"].default_value = grov + 0.1
    L = nt.links.new
    L(tc.outputs["Object"], mp.inputs["Vector"]); L(mp.outputs["Vector"], nz.inputs["Vector"]); L(nz.outputs["Fac"], mr.inputs["Value"])
    L(mr.outputs["Result"], b.inputs["Roughness"])
    return m

PANEL = borstad("panel", (0.055, 0.055, 0.06), 0.34)
SILVER = borstad("silver", (0.72, 0.72, 0.74), 0.22)
SVART = mat("svart", (0.012, 0.012, 0.014), 0.0, 0.5)
INSIDA = mat("insida", (0.02, 0.02, 0.022), 0.0, 0.7)
LUCKA = mat("lucka", (0.03, 0.025, 0.02), 0.0, 0.04, alfa=0.30)       # rökfärgat glas
SKAL = mat("skal", (0.06, 0.058, 0.062), 0.0, 0.18, alfa=0.93)        # kassettens skal, rökigt
FONSTER = mat("fonster", (0.9, 0.9, 0.95), 0.0, 0.03, alfa=0.10)      # klart plastfönster
ETIKETT = mat("etikett", (0.9, 0.85, 0.72), 0.0, 0.75)
RAND = mat("rand", (0.95, 0.52, 0.12), 0.0, 0.6)
TEXT = mat("text", (0.05, 0.045, 0.04), 0.0, 0.6)
SKRUV = mat("skruv", (0.6, 0.6, 0.62), 1.0, 0.3)
ROD = mat("rod", (0.6, 0.02, 0.01), 0.0, 0.3, emit=(1, 0.08, 0.03), emitS=0.6)
VUGLAS = mat("vuglas", (0.9, 0.9, 0.9), 0.0, 0.02, alfa=0.06)
VITPLAST = mat("vitplast", (0.86, 0.85, 0.82), 0.0, 0.35)

def lagg(o, m):
    o.data.materials.clear(); o.data.materials.append(m); return o

def box(namn, x, z, w, h, y0, y1, m, fas=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, (y0 + y1) / 2, z))
    o = bpy.context.object; o.name = namn; o.scale = (w, y1 - y0, h)
    bpy.ops.object.transform_apply(scale=True)
    if fas > 0:
        bv = o.modifiers.new("fas", "BEVEL"); bv.width = fas; bv.segments = 3
    return lagg(o, m)

def hal(o, klipp):
    for k in klipp:
        md = o.modifiers.new("hal", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = k; md.solver = "EXACT"
    bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers):
        if md.type == "BOOLEAN": bpy.ops.object.modifier_apply(modifier=md.name)
    for k in klipp: bpy.data.objects.remove(k)

def cyl(namn, x, z, r, y0, y1, m, n=96):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=y1 - y0, vertices=n, location=(x, (y0 + y1) / 2, z), rotation=(math.radians(90), 0, 0))
    o = bpy.context.object; o.name = namn; return lagg(o, m)

def text(namn, s, x, z, storlek, m, typsnitt=MONO, y=-0.001, just="CENTER", spar=0.0):
    cu = bpy.data.curves.new(namn, "FONT"); cu.body = s; cu.size = storlek; cu.align_x = just; cu.align_y = "CENTER"
    cu.font = bpy.data.fonts.load(typsnitt, check_existing=True); cu.space_character = 1 + spar
    o = bpy.data.objects.new(namn, cu); sc.collection.objects.link(o)
    o.location = (x, y, z); o.rotation_euler = (math.radians(90), 0, 0)
    o.data.materials.append(m)
    return o

FRAM, BAK = [], []   # vilka föremål som syns i vilket lager

# ------------------------------------------------------------------ frontpanelen med hål för luckan
panel = box("panel", 0, 0, PW, PH, 0, PD, PANEL, fas=0.06)
k1 = box("k1", DX, DZ, DWW, DHH, -0.5, 1.5, SVART)                                     # luckans öppning, rakt igenom
k2 = box("k2", CNT[0], CNT[1], CNT[2], CNT[3], -0.5, 0.08, SVART)                      # räkneverkets fönster
k3 = [box(f"k3{i}", x, z, VUW, VUH, -0.5, 0.07, SVART) for i, (x, z) in enumerate(VU)]  # VU-mätarnas fönster
hal(panel, [k1, k2] + k3); FRAM.append(panel)
# tunna silverlister upptill och nertill
FRAM += [box("list1", 0, PH / 2 - 0.07, PW - 0.3, 0.012, -0.004, 0.01, SILVER), box("list2", 0, -PH / 2 + 0.07, PW - 0.3, 0.012, -0.004, 0.01, SILVER)]
# luckans ram och glas
FRAM.append(box("ram_o", DX, DZ + DHH / 2 + 0.02, DWW + 0.08, 0.04, -0.02, 0.03, SILVER))
FRAM.append(box("ram_u", DX, DZ - DHH / 2 - 0.02, DWW + 0.08, 0.04, -0.02, 0.03, SILVER))
FRAM.append(box("ram_v", DX - DWW / 2 - 0.02, DZ, 0.04, DHH + 0.08, -0.02, 0.03, SILVER))
FRAM.append(box("ram_h", DX + DWW / 2 + 0.02, DZ, 0.04, DHH + 0.08, -0.02, 0.03, SILVER))
FRAM.append(box("lucka", DX, DZ, DWW, DHH, 0.03, 0.035, LUCKA))
# luckans insida (bakom spolarna)
BAK.append(box("fack", DX, DZ, DWW, DHH, 0.45, 0.5, INSIDA))
for i, (x, z, w, h) in enumerate([(DX, DZ + DHH / 2, DWW, 0.01), (DX, DZ - DHH / 2, DWW, 0.01), (DX - DWW / 2, DZ, 0.01, DHH), (DX + DWW / 2, DZ, 0.01, DHH)]):
    BAK.append(box(f"fackvagg{i}", x, z, w, h, 0.0, 0.5, INSIDA))

# ------------------------------------------------------------------ kassetten
skal = box("skal", KX, KZ, KW, KH, KY, KY + 0.06, SKAL, fas=0.02)
kl = [cyl("h1", KX - NAV_DX, KZ + NAV_DZ, HAL_R, KY - 0.1, KY + 0.2, SVART), cyl("h2", KX + NAV_DX, KZ + NAV_DZ, HAL_R, KY - 0.1, KY + 0.2, SVART),
      box("f", KX, KZ + NAV_DZ, FON_W, FON_H, KY - 0.1, KY + 0.2, SVART)]
hal(skal, kl); FRAM.append(skal)
FRAM.append(box("fonster", KX, KZ + NAV_DZ, FON_W + 0.02, FON_H + 0.02, KY + 0.03, KY + 0.035, FONSTER))
# etiketten: ett band ovanför och ett under navraden, med en färgad rand
ey1 = KZ + NAV_DZ + 0.24; ey2 = KZ + NAV_DZ - 0.24
FRAM.append(box("etikett_o", KX, (ey1 + KZ + KH / 2 - 0.07) / 2, KW - 0.16, KZ + KH / 2 - 0.07 - ey1, KY - 0.003, KY, ETIKETT))
FRAM.append(box("etikett_u", KX, (ey2 + KZ - KH / 2 + 0.3) / 2, KW - 0.16, ey2 - (KZ - KH / 2 + 0.3), KY - 0.003, KY, ETIKETT))
FRAM.append(box("rand", KX, ey1 + 0.07, KW - 0.16, 0.05, KY - 0.005, KY - 0.003, RAND))
FRAM.append(text("t_brand", "BLONDA", KX - KW / 2 + 0.16, ey1 + 0.155, 0.12, TEXT, GROT, KY - 0.006, "LEFT", 0.6))
FRAM.append(text("t_bris", "BRIS", KX + 0.62, ey1 + 0.155, 0.12, TEXT, GROT, KY - 0.006, "LEFT", 0.4))
FRAM.append(text("t_sida", "A", KX - KW / 2 + 0.2, KZ + NAV_DZ, 0.2, mat("sida", (0.85, 0.85, 0.86), 0, 0.4), GROT, KY - 0.008))
# (bandets namn skrivs av appen till höger på den nedre etiketten, och randen färgas efter bandet)
FRAM.append(text("t_hemlig", "SECRET 03", KX - KW / 2 + 0.16, ey2 - 0.06, 0.07, TEXT, MONO, KY - 0.006, "LEFT", 0.3))
# trapetsen nertill (där huvudet möter bandet) och skruvarna
FRAM.append(box("trapets", KX, KZ - KH / 2 + 0.14, 1.25, 0.24, KY - 0.03, KY, SKAL, fas=0.015))
for sx, sz in [(-0.92, 0.55), (0.92, 0.55), (-0.92, -0.55), (0.92, -0.55), (0, -0.52)]:
    FRAM.append(cyl("skruv", KX + sx, KZ + sz, 0.03, KY - 0.012, KY, SKRUV, 32))
BAK.append(box("skal_bak", KX, KZ, KW, KH, KY + 0.06, KY + 0.13, mat("skalbak", (0.035, 0.034, 0.036), 0, 0.5)))
# bandet mellan spolarna längs botten (syns genom fönstret i nederkant)
BAK.append(box("band", KX, KZ - 0.42, 1.5, 0.012, KY + 0.055, KY + 0.06, mat("bandbrun", (0.11, 0.06, 0.03), 0, 0.35)))

# ------------------------------------------------------------------ VHS-bandet: lika stort som hela bandspelaren
# När man väljer bandet VHS öppnar sig hela fronten och ett VHS-band i bandspelarens storlek åker in bakom den; sedan
# ser man bara en del av det (den vänstra spolen) genom luckans glas. Ett riktigt VHS-band är 187 x 103 mm.
VS = 2.09                                   # skalan mot ett VHS-band i samma mått som kassetten (1 enhet = 50 mm * VS)
VW, VHH = 2.25 * VS, 1.24 * VS              # 4,70 x 2,59 – bandspelaren är 4,8 x 2,6
VX, VZ, VY = 0.0, 0.0, 0.12                 # VHS-bandets mitt och framsida (bakom panelen)
VNAV_DX, VNAV_DZ, VNAV_R = 0.47 * VS, 0.05 * VS, 0.2 * VS
VFON_W, VFON_H = 1.42 * VS, 0.44 * VS
VPACK_MIN, VPACK_MAX = 0.2 * VS, 0.42 * VS
SVARTPLAST = mat("svartplast", (0.016, 0.016, 0.018), 0.0, 0.32)
VHS_FRAM, VHS_BAK = [], []
vk = box("vhs", VX, VZ, VW, VHH, VY, VY + 0.25, SVARTPLAST, fas=0.04)
hal(vk, [box("vhs_f", VX, VZ + VNAV_DZ, VFON_W, VFON_H, VY - 0.1, VY + 0.5, SVART)]); VHS_FRAM.append(vk)
VHS_FRAM.append(box("vhs_fonster", VX, VZ + VNAV_DZ, VFON_W + 0.04, VFON_H + 0.04, VY + 0.06, VY + 0.07, FONSTER))
for j in range(7):   # räfflor i plasten under fönstret
    VHS_FRAM.append(box(f"vhs_raffla{j}", VX - 0.6 * VS + j * 0.2 * VS, VZ - 0.42 * VS, 0.08 * VS, 0.2 * VS, VY - 0.012, VY, SVARTPLAST))
VHS_FRAM.append(box("vhs_etikett", VX, VZ + 0.47 * VS, VW - 0.3 * VS, 0.22 * VS, VY - 0.006, VY, mat("vhsetikett", (0.92, 0.91, 0.88), 0, 0.7)))
VHS_FRAM.append(text("vhs_t1", "VHS", VX - VW / 2 + 0.24 * VS, VZ + 0.47 * VS, 0.13 * VS, TEXT, GROT, VY - 0.012, "LEFT", 0.5))
VHS_FRAM.append(text("vhs_t2", "BLONDA  E-180", VX + VW / 2 - 0.24 * VS, VZ + 0.47 * VS, 0.06 * VS, TEXT, MONO, VY - 0.012, "RIGHT", 0.4))
VHS_FRAM.append(text("vhs_t3", "SECRET 03", VX + VW / 2 - 0.24 * VS, VZ - 0.42 * VS, 0.045 * VS, mat("vhsljus", (0.5, 0.5, 0.52), 0, 0.5), MONO, VY - 0.012, "RIGHT", 0.4))
for sx, sz in [(-0.98, -0.5), (0.98, -0.5)]:
    VHS_FRAM.append(cyl("vhs_skruv", VX + sx * VS, VZ + sz * VS, 0.035 * VS, VY - 0.02, VY, SKRUV, 32))
VHS_BAK.append(box("vhs_bak", VX, VZ, VW, VHH, VY + 0.2, VY + 0.25, mat("vhsbak", (0.03, 0.03, 0.032), 0, 0.5)))
VHS_BAK.append(box("vhs_band", VX, VZ - 0.14 * VS, VFON_W, 0.025, VY + 0.18, VY + 0.19, bpy.data.materials["bandbrun"]))

# ------------------------------------------------------------------ bandspelarens insida (syns när fronten fälls ut)
INRE = []
INREMAT = borstad("inre", (0.028, 0.028, 0.03), 0.42)
INRE.append(box("inre_bak", 0, 0, PW, PH, 0.85, 0.9, INREMAT, fas=0.06))
for i, (x, z, w, h) in enumerate([(0, PH / 2 - 0.05, PW, 0.1), (0, -PH / 2 + 0.05, PW, 0.1), (-PW / 2 + 0.05, 0, 0.1, PH), (PW / 2 - 0.05, 0, 0.1, PH)]):
    INRE.append(box(f"inre_kant{i}", x, z, w, h, 0.0, 0.9, PANEL, fas=0.01))
for sx in (-1, 1):   # skenorna som bandet glider in i, och spolarnas axlar
    INRE.append(box(f"inre_skena{sx}", sx * (VW / 2 + 0.02), 0.05, 0.06, PH - 0.4, 0.3, 0.85, SILVER))
    ax = cyl(f"inre_axel{sx}", VX + sx * VNAV_DX, VZ + VNAV_DZ, 0.16, 0.55, 0.85, SILVER, 64); INRE.append(ax)
    for k in range(6):
        v = k * math.pi / 3
        bpy.ops.mesh.primitive_cube_add(size=1, location=(VX + sx * VNAV_DX + math.sin(v) * 0.13, 0.54, VZ + VNAV_DZ + math.cos(v) * 0.13), rotation=(0, -v, 0))
        o = bpy.context.object; o.scale = (0.03, 0.05, 0.07); lagg(o, VITPLAST); INRE.append(o)
# videohuvudet (trumman, axeln uppåt) med sina styrstift och tryckrullen
bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=0.34, vertices=128, location=(0.0, 0.55, -0.86))
o = bpy.context.object; o.name = "inre_trumma"; lagg(o, SILVER); INRE.append(o)
INRE.append(box("inre_trumband", 0.0, -0.86, 0.86, 0.03, 0.12, 0.98, SVART))
for x in (-0.62, 0.62, 1.15):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.045 if x != 1.15 else 0.09, depth=0.3, vertices=48, location=(x, 0.55, -0.86))
    o = bpy.context.object; lagg(o, SILVER if x != 1.15 else SVART); INRE.append(o)
for sx, sz in [(-2.1, 1.05), (2.1, 1.05), (-2.1, -1.05), (2.1, -1.05)]:
    INRE.append(cyl("inre_skruv", sx, sz, 0.035, 0.83, 0.85, SKRUV, 32))
INRE.append(text("inre_t", "BRIS  VHS  HI-FI  STEREO", 0.0, 1.0, 0.055, mat("inretext", (0.45, 0.45, 0.46), 0, 0.5), MONO, 0.84, spar=0.5))

# ------------------------------------------------------------------ VU-mätarna: skalan ritas som bild (PIL) med BLONDA Mono
def vu_bild(sti):
    from PIL import Image, ImageDraw, ImageFont
    W, H = 940, 620
    im = Image.new("RGB", (W, H), (178, 166, 138)); d = ImageDraw.Draw(im)
    px, py, R = W / 2, H * 1.18, H * 0.98        # nålens fäste (under bilden) och skalans radie
    f = ImageFont.truetype(MONO, 30); fs = ImageFont.truetype(MONO, 46)
    def pkt(vinkel, r): a_ = math.radians(vinkel); return (px + r * math.sin(a_), py - r * math.cos(a_))
    # dB -> vinkel (VU-skalan är olinjär): -20..+3 dB över -48..+48 grader
    def vink(db): v = 10 ** (db / 20); v0, v1 = 10 ** (-20 / 20), 10 ** (3 / 20); return -48 + 96 * (v - v0) / (v1 - v0) ** 1 * 1.0
    for db in [-20, -10, -7, -5, -3, -2, -1, 0, 1, 2, 3]:
        an = vink(db); rod = db > 0
        d.line([pkt(an, R * 0.86), pkt(an, R * (0.94 if db in (-20, -10, -5, 0, 3) else 0.91))], fill=(190, 30, 20) if rod else (30, 26, 22), width=4)
        if db in (-20, -10, -7, -5, -3, 0, 1, 3):
            x, y = pkt(an, R * 1.0); s = ("+" if db > 0 else "") + str(db)
            d.text((x, y - 4), s, font=f, fill=(190, 30, 20) if rod else (30, 26, 22), anchor="ms")
    for i in range(160):   # bågen, svart till 0 dB och röd över
        a0 = -48 + 96 * i / 160; a1 = -48 + 96 * (i + 1) / 160
        d.line([pkt(a0, R * 0.86), pkt(a1, R * 0.86)], fill=(190, 30, 20) if a0 > vink(0) else (30, 26, 22), width=5)
        if a0 > vink(0): d.line([pkt(a0, R * 0.875), pkt(a1, R * 0.875)], fill=(190, 30, 20), width=9)
    d.text((W / 2, H * 0.62), "VU", font=fs, fill=(30, 26, 22), anchor="mm")
    d.text((W / 2, H * 0.80), "BLONDA", font=f, fill=(90, 80, 66), anchor="mm")
    im.save(sti)
    return dict(px=px / W, py=py / H, r=R / H, vink=[vink(-20), vink(3)])

VUINFO = vu_bild(os.path.join(UT, "vu_skala.png"))
VUEMIT = []
for i, (x, z) in enumerate(VU):
    m = bpy.data.materials.new(f"vu{i}"); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = bpy.data.images.load(os.path.join(UT, "vu_skala.png"), check_existing=True)
    nt.links.new(tx.outputs["Color"], b.inputs["Base Color"]); nt.links.new(tx.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Roughness"].default_value = 0.6; b.inputs["Emission Strength"].default_value = 0.0
    b.inputs["Specular IOR Level"].default_value = 0.2
    VUEMIT.append(b)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, 0.065, z), rotation=(math.radians(90), 0, 0))
    o = bpy.context.object; o.name = f"vu{i}"; o.scale = (VUW, VUH, 1); bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); FRAM.append(o)
    FRAM.append(box(f"vuglas{i}", x, z, VUW, VUH, 0.01, 0.012, VUGLAS))
    for j, (bx_, bz_, bw_, bh_) in enumerate([(x, z + VUH / 2 + 0.015, VUW + 0.06, 0.03), (x, z - VUH / 2 - 0.015, VUW + 0.06, 0.03),
                                              (x - VUW / 2 - 0.015, z, 0.03, VUH + 0.06), (x + VUW / 2 + 0.015, z, 0.03, VUH + 0.06)]):
        FRAM.append(box(f"vuram{i}{j}", bx_, bz_, bw_, bh_, -0.012, 0.02, SILVER))
FRAM.append(text("t_vul", "L", VU[0][0] - VUW / 2 + 0.06, VU[0][1] - VUH / 2 - 0.09, 0.06, mat("ljustext", (0.6, 0.6, 0.6), 0, 0.5), MONO, -0.001))
FRAM.append(text("t_vur", "R", VU[1][0] - VUW / 2 + 0.06, VU[1][1] - VUH / 2 - 0.09, 0.06, bpy.data.materials["ljustext"], MONO, -0.001))

# räkneverket: ett svart fönster (siffrorna ritas av appen) och en liten knapp
FRAM.append(box("cnt_bak", CNT[0], CNT[1], CNT[2], CNT[3], 0.075, 0.08, SVART))
FRAM.append(cyl("cnt_knapp", CNT[0] + CNT[2] / 2 + 0.14, CNT[1], 0.045, -0.04, 0.0, SILVER, 48))
FRAM.append(text("t_cnt", "COUNTER", CNT[0], CNT[1] - 0.15, 0.05, bpy.data.materials["ljustext"], MONO, -0.001, spar=0.5))
# rattar och REC-lampa
RATTAR = [(0.62, -0.72, 0.17), (1.22, -0.72, 0.17)]   # mitt x, z, radie (strecket ritas av appen, som vrider dem)
LED = (1.86, -0.72)
for i, (x, namn) in enumerate([(0.62, "REC LEVEL"), (1.22, "OUTPUT")]):
    FRAM.append(cyl(f"ratt{i}", x, -0.72, 0.17, -0.2, 0.0, SILVER, 64))
    FRAM.append(text(f"t_ratt{i}", namn, x, -0.98, 0.045, bpy.data.materials["ljustext"], MONO, -0.001, spar=0.5))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.035, location=(1.86, -0.03, -0.72)); o = bpy.context.object; lagg(o, ROD); FRAM.append(o)
FRAM.append(text("t_rec", "REC", 1.86, -0.86, 0.045, bpy.data.materials["ljustext"], MONO, -0.001, spar=0.5))
FRAM.append(text("t_logo", "BLONDA", -PW / 2 + 0.22, PH / 2 - 0.3, 0.15, mat("logo", (0.82, 0.82, 0.84), 0.6, 0.3), GROT, -0.001, "LEFT", 0.9))
FRAM.append(text("t_modell", "BRIS  K-1  STEREO CASSETTE DECK", PW / 2 - 0.22, PH / 2 - 0.3, 0.055, bpy.data.materials["ljustext"], MONO, -0.001, "RIGHT", 0.4))

# transporttangenterna under luckan, med symboler
KNAPP = []   # [(knappen, [symbolerna])] i ordning REC REW PLAY FF STOP PAUS
def symbol(typ, x, z, s):
    m = mat("sym_" + typ, (0.05, 0.05, 0.05), 0, 0.5) if typ != "rec" else ROD
    y = -0.122; fore = len(FRAM)
    def tri(cx, rikt):
        bm_ = bmesh.new(); h = s * 0.55
        pts = [(cx - h * 0.5 * rikt, z - h * 0.6), (cx - h * 0.5 * rikt, z + h * 0.6), (cx + h * 0.55 * rikt, z)]
        vs = [bm_.verts.new((px_, y, pz_)) for px_, pz_ in pts]; bm_.faces.new(vs)
        me = bpy.data.meshes.new("tri"); bm_.to_mesh(me); bm_.free(); o = bpy.data.objects.new("tri", me); sc.collection.objects.link(o)
        o.data.materials.append(m); FRAM.append(o)
    if typ == "play": tri(x, 1)
    elif typ == "ff": tri(x - s * 0.17, 1); tri(x + s * 0.17, 1)
    elif typ == "rew": tri(x + s * 0.17, -1); tri(x - s * 0.17, -1)
    elif typ == "stop": FRAM.append(box("stop", x, z, s * 0.5, s * 0.5, y - 0.001, y, m))
    elif typ == "paus": FRAM.append(box("p1", x - s * 0.13, z, s * 0.12, s * 0.55, y - 0.001, y, m)); FRAM.append(box("p2", x + s * 0.13, z, s * 0.12, s * 0.55, y - 0.001, y, m))
    elif typ == "rec": FRAM.append(cyl("recs", x, z, s * 0.24, y - 0.001, y, m, 48))
    return FRAM[fore:]
KNAPPAR = ["rec", "rew", "play", "ff", "stop", "paus"]; KNW, KNH, KNZ = 0.37, 0.22, -0.95
KNX = [DX - DWW / 2 + 0.2 + i * 0.41 for i in range(6)]
for i, typ in enumerate(KNAPPAR):
    k = box(f"tangent{i}", KNX[i], KNZ, KNW, KNH, -0.12, 0.05, SILVER, fas=0.015); FRAM.append(k)
    KNAPP.append((k, symbol(typ, KNX[i], KNZ, 0.22)))
NERE = 0.05   # så långt in en nedtryckt knapp går

# ------------------------------------------------------------------ ljus och kamera
vg = bpy.data.worlds.new("varld"); sc.world = vg; vg.use_nodes = True
vg.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.0035, 0.003, 1)

def ljus(namn, loc, energi, farg, storlek, mot):
    d = bpy.data.lights.new(namn, "AREA"); d.energy = energi; d.color = farg; d.size = storlek
    o = bpy.data.objects.new(namn, d); o.location = loc; sc.collection.objects.link(o)
    o.rotation_euler = (Vector(mot) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); return o
LJUS = [ljus("nyckel", (-3.0, -5.5, 4.5), 900, (1.0, 0.86, 0.72), 4.0, (0, 0, 0)),     # varmt, uppifrån vänster
        ljus("fyll", (4.5, -6.0, 0.5), 160, (0.75, 0.8, 1.0), 6.0, (0, 0, 0)),
        ljus("topp", (0.0, -1.5, 5.0), 260, (1.0, 0.9, 0.8), 6.0, (0, 0.3, 0))]

# en mjuk ljusruta framför bandspelaren som bara syns i speglingar: ger luckans och VU-glasens diagonala reflex
def reflex():
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-1.2, -12.0, 0.9), rotation=(math.radians(90), math.radians(-28), 0))
    o = bpy.context.object; o.name = "reflex"; o.scale = (1.3, 7.0, 1)
    m = bpy.data.materials.new("reflex"); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (1.0, 0.92, 0.85, 1); em.inputs["Strength"].default_value = 0.9
    nt.links.new(em.outputs[0], out.inputs["Surface"]); o.data.materials.append(m)
    o.visible_camera = False; o.visible_diffuse = False; o.visible_shadow = False; o.visible_transmission = False
    return o
REFLEX = reflex()

cam = bpy.data.cameras.new("kamera"); cam.type = "ORTHO"; cam.ortho_scale = 5.5
co = bpy.data.objects.new("kamera", cam); sc.collection.objects.link(co); sc.camera = co
co.location = (0, -20, 0); co.rotation_euler = (math.radians(90), 0, 0)

r = sc.render; r.engine = "CYCLES"; r.resolution_x = a.bredd; r.resolution_y = round(a.bredd * 3.0 / 5.5); r.resolution_percentage = 100
cy = sc.cycles; cy.device = "CPU"; cy.samples = a.prov; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.02
cy.use_denoising = True
try: cy.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
cy.max_bounces = 8; cy.transparent_max_bounces = 16
sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGBA"; r.image_settings.color_depth = "16"

def bild_px(x, z):   # världens (x, z) -> bildpunkt i renderingen
    W, H = r.resolution_x, r.resolution_y; s = W / cam.ortho_scale
    return (W / 2 + x * s, H / 2 - z * s)

def rendera(namn, synliga, vu_emit, ljus_pa, transparent=True, vhs=False, inne=False):
    for o in sc.objects:
        if o.type in ("MESH", "FONT", "CURVE") and o is not REFLEX: o.visible_camera = o in synliga
    for o in KFRAM + KBAK: o.hide_render = vhs or inne   # kassetten i luckan, eller VHS-bandet bakom fronten
    for o in VHS_FRAM + VHS_BAK: o.hide_render = not vhs
    for o in INRE: o.hide_render = not inne or vhs      # insidan bara när fronten är borta (och inte i VHS-bandets bild)
    for o in PANEL + LUCKA_O + BAK: o.hide_render = inne  # bakom fronten: den skuggar inte (den är utfälld)
    REFLEX.hide_render = not ljus_pa
    for o in LJUS: o.hide_render = not ljus_pa
    vg.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0 if ljus_pa else 0.0
    for b in VUEMIT: b.inputs["Emission Strength"].default_value = vu_emit
    r.film_transparent = transparent
    r.filepath = os.path.join(UT, namn + ".png")
    bpy.ops.render.render(write_still=True); print("KLAR", r.filepath, flush=True)

# Lagren (bakifrån): bak (luckans insida) · kassett_bak · spolarna (appen) · kassett_fram · panel · lucka.
# Kassetten (eller VHS:en) är egna lager så att appen kan låta den åka ut och in medan luckan öppnas.
KASSETTDELAR = {"skal", "fonster", "etikett_o", "etikett_u", "rand", "t_brand", "t_bris", "t_sida", "t_hemlig", "trapets", "skruv"}
KFRAM = [o for o in FRAM if o.name.split(".")[0] in KASSETTDELAR]
KBAK = [o for o in BAK if o.name.split(".")[0] in ("skal_bak", "band")]
LUCKA_O = [o for o in FRAM if o.name == "lucka"]
PANEL = [o for o in FRAM if o not in KFRAM and o not in LUCKA_O]
BAK = [o for o in BAK if o not in KBAK]
ALLA = ["bak", "kassett_bak", "kassett_fram", "vhs_bak", "vhs_fram", "inre", "panel", "nere", "lucka", "vu", "nav"]
vilka = [s.strip() for s in a.bara.split(",") if s.strip()] or ALLA
s_px = r.resolution_x / cam.ortho_scale
if "bak" in vilka: rendera("bak", set(BAK), 0.06, True)
if "kassett_bak" in vilka: rendera("kassett_bak", set(KBAK), 0.06, True)
if "kassett_fram" in vilka: rendera("kassett_fram", set(KFRAM), 0.06, True)
if "vhs_bak" in vilka: rendera("vhs_bak", set(VHS_BAK), 0.06, True, vhs=True, inne=True)
if "vhs_fram" in vilka: rendera("vhs_fram", set(VHS_FRAM), 0.06, True, vhs=True, inne=True)
if "inre" in vilka: rendera("inre", set(INRE), 0.06, True, inne=True)
if "panel" in vilka: rendera("panel", set(PANEL), 0.06, True)
if "nere" in vilka:   # panelen med alla knappar nedtryckta (appen klipper ut de knappar som är nere)
    for k, sy in KNAPP:
        for o in [k] + sy: o.location.y += NERE
    rendera("nere", set(PANEL), 0.06, True)
    for k, sy in KNAPP:
        for o in [k] + sy: o.location.y -= NERE
if "lucka" in vilka: rendera("lucka", set(LUCKA_O), 0.06, True)
if "vu" in vilka:   # bara VU-ljuset: allt annat släckt, ogenomskinligt svart runt omkring (läggs till i appen)
    rendera("vu", set(PANEL), 1.1, False, transparent=False)

# spolnavet: ett vitt nav med sex kuggar, framifrån, i en egen liten rendering
if "nav" in vilka:
    for o in sc.objects:
        if o.type in ("MESH", "FONT", "CURVE"): o.hide_render = True
    nav = cyl("nav", 0, 0, NAV_R, -0.05, 0.0, VITPLAST, 128)
    kl = [cyl("navhal", 0, 0, NAV_R * 0.62, -0.2, 0.2, SVART, 96)]
    hal(nav, kl)
    for i in range(6):
        v = i * math.pi / 3
        bpy.ops.mesh.primitive_cube_add(size=1, location=(math.sin(v) * NAV_R * 0.52, -0.025, math.cos(v) * NAV_R * 0.52), rotation=(0, -v, 0))
        o = bpy.context.object; o.scale = (0.028, 0.05, 0.09); lagg(o, VITPLAST)
    for i in range(3):   # ekrarna syns som tre mörka spår i navets kant
        v = i * 2 * math.pi / 3 + 0.5
        bpy.ops.mesh.primitive_cube_add(size=1, location=(math.sin(v) * NAV_R * 0.82, -0.051, math.cos(v) * NAV_R * 0.82), rotation=(0, -v, 0))
        o = bpy.context.object; o.scale = (0.03, 0.002, 0.06); lagg(o, SVART)
    cam.ortho_scale = NAV_R * 2.1; r.resolution_x = r.resolution_y = 512   # skarpt även på VHS-bandets stora spolar
    r.film_transparent = True
    for o in LJUS: o.hide_render = False
    r.filepath = os.path.join(UT, "nav.png"); bpy.ops.render.render(write_still=True); print("KLAR nav", flush=True)

W0 = a.bredd; H0 = round(a.bredd * 3.0 / 5.5); s0 = W0 / 5.5
def px(x, z): return [round(W0 / 2 + x * s0, 2), round(H0 / 2 - z * s0, 2)]
info = {
    "w": W0, "h": H0, "enhet": round(s0, 4),
    "spolar": [px(KX - NAV_DX, KZ + NAV_DZ), px(KX + NAV_DX, KZ + NAV_DZ)],
    "nav_r": round(NAV_R * s0, 2), "pack": [round(PACK_MIN * s0, 2), round(PACK_MAX * s0, 2)],
    "kassett": px(KX - KW / 2, KZ + KH / 2) + [round(KW * s0, 2), round(KH * s0, 2)],
    "vu": [dict(fast=px(x - VUW / 2 + VUINFO["px"] * VUW, z + VUH / 2 - VUINFO["py"] * VUH), langd=round(VUINFO["r"] * VUH * s0 * 0.93, 2),
                ruta=px(x - VUW / 2, z + VUH / 2) + [round(VUW * s0, 2), round(VUH * s0, 2)]) for x, z in VU],
    "vu_vinkel": [round(v, 3) for v in VUINFO["vink"]],
    "raknare": px(CNT[0] - CNT[2] / 2, CNT[1] + CNT[3] / 2) + [round(CNT[2] * s0, 2), round(CNT[3] * s0, 2)],
    "rand": px(KX - (KW - 0.16) / 2, ey1 + 0.07 + 0.025) + [round((KW - 0.16) * s0, 2), round(0.05 * s0, 2)],
    "bandtext": px(KX + KW / 2 - 0.16, ey2 - 0.06) + [round(0.07 * s0, 2)],   # högerkant, mitt, textens storlek
    "lucka": px(DX - DWW / 2, DZ + DHH / 2) + [round(DWW * s0, 2), round(DHH * s0, 2)],
    "knappar": [dict(namn=KNAPPAR[i], ruta=px(KNX[i] - KNW / 2 - 0.02, KNZ + KNH / 2 + 0.02) + [round((KNW + 0.04) * s0, 2), round((KNH + 0.04) * s0, 2)]) for i in range(6)],
    "rattar": [dict(mitt=px(x, z), r=round(rr * s0, 2)) for x, z, rr in RATTAR],
    "led": px(*LED) + [round(0.035 * s0, 2)],
    "vhs": dict(spolar=[px(VX - VNAV_DX, VZ + VNAV_DZ), px(VX + VNAV_DX, VZ + VNAV_DZ)], nav_r=round(VNAV_R * s0, 2),
                pack=[round(VPACK_MIN * s0, 2), round(VPACK_MAX * s0, 2)], ruta=px(VX - VW / 2, VZ + VHH / 2) + [round(VW * s0, 2), round(VHH * s0, 2)]),
    "front": px(-PW / 2, PH / 2) + [round(PW * s0, 2), round(PH * s0, 2)],   # fronten (fälls ut kring nederkanten)
}
json.dump(info, open(os.path.join(UT, "kassett.json"), "w"), indent=1)
print("KLAR json", flush=True)
