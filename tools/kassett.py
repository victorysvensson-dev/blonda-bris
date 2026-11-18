"""Den hemliga patchen KASSETTEN (BRIS): en kassettbandspelare renderad i Blender/Cycles, som en produktbild.

Bandspelaren står på ett bord och kameran tittar rakt fram, lite uppifrån (ortografiskt, TILT grader), så att
locket syns. Fronten är borstad champagnefärgad aluminium mellan två sidor i valnöt, med rökfärgad lucka, bakbelysta
VU-mätare, svarvade rattar och pianotangenter.

Det som rör sig ritas av appen (ui/kassett.js), så scenen renderas i lager (genomskinlig bakgrund):
  skugga        – bandspelarens skugga på bordet (bara skuggan)
  bak           – luckans insida (facket, belyst inifrån)
  kassett_bak / kassett_fram – kassetten i luckan, bakom och framför spolarna (appen ritar spolarna)
  vhs_bak / vhs_fram – VHS-bandet, lika stort som hela bandspelaren, bakom fronten
  inre          – bandspelarens insida (syns när fronten fälls ut)
  skap          – skåpet i valnöt (locket, sidorna) och fötterna; står kvar när fronten fälls ut
  panel         – fronten; nere = samma med alla tangenter nedtryckta
  lucka         – luckans rökglas
  vu            – bara VU-mätarnas bakgrundsljus (läggs till i appen efter nivån)
  nav / nav_vhs – spolnaven framifrån (kassettens nav, VHS-spolen med fläns); appen snurrar dem
  kassett.json  – var spolarna, nålarnas fästen, räkneverket, tangenterna m.m. ligger i bilden (bildpunkter).
Mått i Blender: 1 enhet = 50 mm (kassetten är 100,4 x 63,8 mm = 2,008 x 1,276). x åt höger, y in i bilden, z upp.

PYTHONPATH=<bpy> python3.13 tools/kassett.py --ut <mapp> [--bredd 1600 --prov 128 --bara panel,vu ... --forhand]
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
ap.add_argument("--forhand", action="store_true", help="en enda bild med allt (för att bedöma utseendet)")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
UT = os.path.abspath(a.ut); os.makedirs(UT, exist_ok=True)
MONO = os.path.join(ROT, "resurser/typsnitt/blonda-mono.ttf")
GROT = os.path.join(ROT, "resurser/typsnitt/blonda-grotesk.ttf")

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ------------------------------------------------------------------ mått
TILT = 6.0                                  # kameran tittar så här många grader uppifrån
PW, PH, PD = 4.8, 2.6, 2.4                  # fronten (bredd, höjd) och bandspelarens djup
CW = 0.17                                   # sidorna i trä
GOLV = -PH / 2 - 0.09                       # bordet (fötterna är 0,09 höga)
DX, DZ, DWW, DHH = -1.05, 0.10, 2.45, 1.5   # luckan (mitt, bredd, höjd)
KW, KH = 2.008, 1.276                       # kassetten
KX, KZ, KY = DX, DZ, 0.22                   # kassettens mitt (framsidan ligger vid y = KY)
NAV_DX, NAV_DZ = 0.425, 0.07                # spolarnas mitt relativt kassetten (42,5 mm isär)
HAL_R = 0.205                               # navhålen
NAV_R = 0.22                                # navets ytterradie (där bandet lindas), sprite
PACK_MIN, PACK_MAX = 0.22, 0.47             # bandets radie: tomt nav ... full spole
FON_W, FON_H = 0.42, 0.27                   # fönstret mitt i kassetten
VU = [(0.80, 0.50), (1.86, 0.50)]           # VU-mätarnas mitt
VUW, VUH = 0.94, 0.62
VUY = 0.07                                  # VU-skalans djup (bakom glaset)
CNT = (1.33, -0.16, 0.46, 0.15)             # räkneverket (mitt x, z, bredd, höjd)
RATTAR = [(0.62, -0.72, 0.17), (1.22, -0.72, 0.17)]   # rattarna: mitt x, z, radie (strecket ritas av appen)
RATTY = -0.2                                # rattarnas framsida
LED = (1.86, -0.72)
KNAPPAR = ["rec", "rew", "play", "ff", "stop", "paus"]; KNW, KNH, KNZ = 0.37, 0.22, -0.95
KNX = [DX - DWW / 2 + 0.2 + i * 0.41 for i in range(6)]
KNY0 = -0.12                                # tangenternas framsida
NERE = 0.06                                 # så långt in en nedtryckt tangent går

# ------------------------------------------------------------------ material
def mat(namn, farg=(0.5, 0.5, 0.5), metall=0.0, grov=0.4, alfa=1.0, emit=None, emitS=0.0, coat=0.0):
    m = bpy.data.materials.new(namn); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*farg, 1); b.inputs["Metallic"].default_value = metall
    b.inputs["Roughness"].default_value = grov; b.inputs["Alpha"].default_value = alfa
    if coat: b.inputs["Coat Weight"].default_value = coat; b.inputs["Coat Roughness"].default_value = 0.08
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = emitS
    if alfa < 1:
        try: m.surface_render_method = "BLENDED"
        except Exception: pass
    return m

def noder(m):
    nt = m.node_tree; return nt, nt.nodes["Principled BSDF"], nt.links.new

def borstad(namn, farg, grov=0.3, skala=(1.0, 900, 900), aniso=0.55, djup=0.06):
    """borstad metall: grovheten och en svag bump varierar i tunna streck längs x, och glansen dras ut i borstningens riktning"""
    m = mat(namn, farg, 1.0, grov); nt, b, L = noder(m)
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = skala
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 2.5; nz.inputs["Detail"].default_value = 8
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = grov - 0.07; mr.inputs["To Max"].default_value = grov + 0.08
    bu = nt.nodes.new("ShaderNodeBump"); bu.inputs["Strength"].default_value = djup; bu.inputs["Distance"].default_value = 0.002
    L(tc.outputs["Object"], mp.inputs["Vector"]); L(mp.outputs["Vector"], nz.inputs["Vector"]); L(nz.outputs["Fac"], mr.inputs["Value"])
    L(mr.outputs["Result"], b.inputs["Roughness"]); L(nz.outputs["Fac"], bu.inputs["Height"]); L(bu.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Anisotropic"].default_value = aniso
    tg = nt.nodes.new("ShaderNodeTangent"); tg.direction_type = "RADIAL"; tg.axis = "Z"
    L(tg.outputs["Tangent"], b.inputs["Tangent"])
    return m

def svarvad(namn, farg, grov=0.26):
    """svarvad metall (rattarnas framsida): fina ringar runt mitten"""
    m = mat(namn, farg, 1.0, grov); nt, b, L = noder(m)
    tc = nt.nodes.new("ShaderNodeTexCoord"); wv = nt.nodes.new("ShaderNodeTexWave")
    wv.wave_type = "RINGS"; wv.rings_direction = "Y"; wv.inputs["Scale"].default_value = 60; wv.inputs["Distortion"].default_value = 1.5
    wv.inputs["Detail"].default_value = 4
    bu = nt.nodes.new("ShaderNodeBump"); bu.inputs["Strength"].default_value = 0.08; bu.inputs["Distance"].default_value = 0.001
    L(tc.outputs["Object"], wv.inputs["Vector"]); L(wv.outputs["Fac"], bu.inputs["Height"]); L(bu.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Anisotropic"].default_value = 0.7
    tg = nt.nodes.new("ShaderNodeTangent"); tg.direction_type = "RADIAL"; tg.axis = "Y"; L(tg.outputs["Tangent"], b.inputs["Tangent"])
    return m

def tra(namn, rikt="X"):
    """valnöt: ådring (vågor med brus), varm brun, lackad. rikt = axeln som ådringen växlar längs"""
    m = mat(namn, (0.2, 0.1, 0.05), 0.0, 0.42, coat=0.35); nt, b, L = noder(m)
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (7, 7, 0.6) if rikt == "X" else (0.6, 7, 7)
    if rikt != "X": mp.inputs["Rotation"].default_value = (math.radians(45), 0, 0)   # ådringen syns både ovanpå och i kanten
    wv = nt.nodes.new("ShaderNodeTexWave"); wv.wave_type = "BANDS"; wv.bands_direction = "X" if rikt == "X" else "Y"
    wv.inputs["Scale"].default_value = 3.0; wv.inputs["Distortion"].default_value = 9.0; wv.inputs["Detail"].default_value = 6; wv.inputs["Detail Scale"].default_value = 1.6
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].position = 0.25; cr.color_ramp.elements[0].color = (0.055, 0.025, 0.012, 1)
    cr.color_ramp.elements[1].position = 0.85; cr.color_ramp.elements[1].color = (0.24, 0.12, 0.055, 1)
    L(tc.outputs["Object"], mp.inputs["Vector"]); L(mp.outputs["Vector"], wv.inputs["Vector"]); L(wv.outputs["Fac"], cr.inputs["Fac"])
    L(cr.outputs["Color"], b.inputs["Base Color"])
    return m

def papper(namn, farg):
    """etikettens papper: lite fiber i ytan"""
    m = mat(namn, farg, 0.0, 0.8); nt, b, L = noder(m)
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 400; nz.inputs["Detail"].default_value = 3
    bu = nt.nodes.new("ShaderNodeBump"); bu.inputs["Strength"].default_value = 0.05
    L(nz.outputs["Fac"], bu.inputs["Height"]); L(bu.outputs["Normal"], b.inputs["Normal"])
    return m

FRONT = borstad("front", (0.80, 0.77, 0.71), 0.3)                       # champagnefärgad aluminium
LOCK = borstad("lock", (0.52, 0.5, 0.47), 0.4, skala=(1.0, 1.0, 900))  # locket (borstat framåt)
SILVER = borstad("silver", (0.86, 0.85, 0.83), 0.22)
KROM = mat("krom", (0.9, 0.9, 0.9), 1.0, 0.08)
SVART = mat("svart", (0.012, 0.012, 0.014), 0.0, 0.5)
ANOD = mat("anod", (0.018, 0.017, 0.019), 0.3, 0.32)                     # svart anodiserad ram
INSIDA = mat("insida", (0.025, 0.024, 0.026), 0.0, 0.7)
LUCKA = mat("lucka", (0.035, 0.028, 0.022), 0.0, 0.03, alfa=0.36)       # rökfärgat glas
SKAL = mat("skal", (0.07, 0.066, 0.07), 0.0, 0.16, alfa=0.9)            # kassettens skal, rökigt
FONSTER = mat("fonster", (0.9, 0.9, 0.95), 0.0, 0.03, alfa=0.10)        # klart plastfönster
ETIKETT = papper("etikett", (0.92, 0.88, 0.78))
RAND = mat("rand", (0.95, 0.52, 0.12), 0.0, 0.6)
TEXT = mat("text", (0.05, 0.045, 0.04), 0.0, 0.6)
GRAVYR = mat("gravyr", (0.10, 0.095, 0.09), 0.2, 0.45)                  # text och linjer i fronten
SKRUV = mat("skruv", (0.6, 0.6, 0.62), 1.0, 0.3)
ROD = mat("rod", (0.6, 0.02, 0.01), 0.0, 0.25, emit=(1, 0.08, 0.03), emitS=0.5)
VUGLAS = mat("vuglas", (0.9, 0.9, 0.9), 0.0, 0.02, alfa=0.08)
VITPLAST = mat("vitplast", (0.86, 0.85, 0.82), 0.0, 0.35)
GUMMI = mat("gummi", (0.02, 0.02, 0.02), 0.0, 0.8)
TRA = tra("tra"); TRA_TOPP = tra("tra_topp", "Y")
TRA_TOPP.node_tree.nodes["Principled BSDF"].inputs["Coat Weight"].default_value = 0.12
TRA_TOPP.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.55
for _e, _c in zip(TRA_TOPP.node_tree.nodes["Color Ramp"].color_ramp.elements, [(0.03, 0.013, 0.006, 1), (0.12, 0.058, 0.026, 1)]): _e.color = _c
RATTMAT = svarvad("ratt", (0.86, 0.85, 0.83))

def lagg(o, m):
    o.data.materials.clear(); o.data.materials.append(m); return o

def box(namn, x, z, w, h, y0, y1, m, fas=0.0, seg=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, (y0 + y1) / 2, z))
    o = bpy.context.object; o.name = namn; o.scale = (w, y1 - y0, h)
    bpy.ops.object.transform_apply(scale=True)
    if fas > 0:
        bv = o.modifiers.new("fas", "BEVEL"); bv.width = fas; bv.segments = seg; bv.limit_method = "ANGLE"
    return lagg(o, m)

def hal(o, klipp):
    for k in klipp:
        md = o.modifiers.new("hal", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = k; md.solver = "EXACT"
    bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers):
        if md.type == "BOOLEAN": bpy.ops.object.modifier_apply(modifier=md.name)
    for k in klipp: bpy.data.objects.remove(k)

def ram(namn, x, z, w, h, bredd, y0, y1, m, fas=0.012):
    """en ram (lådan med ett hål), utan skarvar i hörnen"""
    o = box(namn, x, z, w + 2 * bredd, h + 2 * bredd, y0, y1, m)
    hal(o, [box(namn + "_h", x, z, w, h, y0 - 1, y1 + 1, SVART)])
    if fas > 0:
        bv = o.modifiers.new("fas", "BEVEL"); bv.width = fas; bv.segments = 3; bv.limit_method = "ANGLE"
    return o

def cyl(namn, x, z, r, y0, y1, m, n=96, fas=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=y1 - y0, vertices=n, location=(x, (y0 + y1) / 2, z), rotation=(math.radians(90), 0, 0))
    o = bpy.context.object; o.name = namn
    if fas > 0:
        bv = o.modifiers.new("fas", "BEVEL"); bv.width = fas; bv.segments = 4; bv.limit_method = "ANGLE"
    return lagg(o, m)

def text(namn, s, x, z, storlek, m, typsnitt=MONO, y=-0.001, just="CENTER", spar=0.0):
    cu = bpy.data.curves.new(namn, "FONT"); cu.body = s; cu.size = storlek; cu.align_x = just; cu.align_y = "CENTER"
    cu.font = bpy.data.fonts.load(typsnitt, check_existing=True); cu.space_character = 1 + spar
    o = bpy.data.objects.new(namn, cu); sc.collection.objects.link(o)
    o.location = (x, y, z); o.rotation_euler = (math.radians(90), 0, 0)
    o.data.materials.append(m); cu.extrude = 0.0008
    return o

FRAM, BAK = [], []   # vilka föremål som syns i vilket lager

# ------------------------------------------------------------------ fronten, locket och sidorna
panel = box("panel", 0, 0, PW, PH, 0, PD, FRONT, fas=0.025)
k1 = box("k1", DX, DZ, DWW, DHH, -0.5, PD + 0.5, SVART)                                     # luckans öppning, rakt igenom
k2 = box("k2", CNT[0], CNT[1], CNT[2], CNT[3], -0.5, 0.08, SVART)                      # räkneverkets fönster
k3 = [box(f"k3{i}", x, z, VUW, VUH, -0.5, VUY + 0.03, SVART) for i, (x, z) in enumerate(VU)]  # VU-mätarnas fönster
hal(panel, [k1, k2] + k3); FRAM.append(panel)
# skåpet i valnöt: ett lock ovanpå och två sidor runt den borstade fronten
TT = 0.11   # lockets tjocklek
FRAM.append(box("lock", 0, PH / 2 + TT / 2, PW + 2 * CW, TT, -0.03, PD, TRA_TOPP, fas=0.025))
for sx in (-1, 1):
    FRAM.append(box(f"sida{sx}", sx * (PW / 2 + CW / 2), 0, CW, PH + 0.002, -0.03, PD, TRA, fas=0.02))
# fötter
for fx, fy in [(-1.95, 0.35), (1.95, 0.35), (-1.95, 2.0), (1.95, 2.0)]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.14, depth=0.09, vertices=48, location=(fx, fy, -PH / 2 - 0.045))
    bpy.context.object.name = "fot"; FRAM.append(lagg(bpy.context.object, GUMMI))
# graverade linjer: under logotypen och runt tangenternas fält
FRAM.append(box("linje1", 0.15, PH / 2 - 0.47, PW - 0.6, 0.006, -0.0015, 0.001, GRAVYR))
FRAM.append(box("linje2", 0.15, -PH / 2 + 0.14, PW - 0.6, 0.006, -0.0015, 0.001, GRAVYR))
# luckan: svart anodiserad ram och rökglas
FRAM.append(ram("luckram", DX, DZ, DWW, DHH, 0.05, -0.03, 0.03, ANOD))
FRAM.append(box("lucka", DX, DZ, DWW, DHH, 0.02, 0.025, LUCKA))
# luckans insida (bakom spolarna), belyst inifrån
BAK.append(box("fack", DX, DZ, DWW, DHH, 0.45, 0.5, INSIDA))
for i, (x, z, w, h) in enumerate([(DX, DZ + DHH / 2, DWW, 0.01), (DX, DZ - DHH / 2, DWW, 0.01), (DX - DWW / 2, DZ, 0.01, DHH), (DX + DWW / 2, DZ, 0.01, DHH)]):
    BAK.append(box(f"fackvagg{i}", x, z, w, h, 0.0, 0.5, INSIDA))

# ------------------------------------------------------------------ kassetten
skal = box("skal", KX, KZ, KW, KH, KY, KY + 0.06, SKAL, fas=0.02)
kl = [cyl("h1", KX - NAV_DX, KZ + NAV_DZ, HAL_R, KY - 0.1, KY + 0.2, SVART), cyl("h2", KX + NAV_DX, KZ + NAV_DZ, HAL_R, KY - 0.1, KY + 0.2, SVART),
      box("f", KX, KZ + NAV_DZ, FON_W, FON_H, KY - 0.1, KY + 0.2, SVART)]
hal(skal, kl); FRAM.append(skal)
FRAM.append(box("fonster", KX, KZ + NAV_DZ, FON_W + 0.02, FON_H + 0.02, KY + 0.03, KY + 0.035, FONSTER))
# etiketten: ett band ovanför och ett under navraden, med en färgad rand och skrivlinjer
ey1 = KZ + NAV_DZ + 0.24; ey2 = KZ + NAV_DZ - 0.24
EW = KW - 0.3   # etikettens bredd (skruvarna i hörnen sitter utanför)
FRAM.append(box("etikett_o", KX, (ey1 + KZ + KH / 2 - 0.07) / 2, EW, KZ + KH / 2 - 0.07 - ey1, KY - 0.003, KY, ETIKETT))
FRAM.append(box("etikett_u", KX, (ey2 + KZ - KH / 2 + 0.3) / 2, EW, ey2 - (KZ - KH / 2 + 0.3), KY - 0.003, KY, ETIKETT))
FRAM.append(box("rand", KX, ey1 + 0.07, EW, 0.05, KY - 0.005, KY - 0.003, RAND))
SKRIV = mat("skrivlinje", (0.55, 0.5, 0.42), 0.0, 0.7)
for j in range(2):
    FRAM.append(box(f"skrivlinje{j}", KX, ey1 + 0.13 + 0.09 * j, EW - 0.2, 0.004, KY - 0.0045, KY - 0.003, SKRIV))
FRAM.append(text("t_brand", "BLONDA", KX - EW / 2 + 0.08, ey1 + 0.2, 0.085, TEXT, GROT, KY - 0.006, "LEFT", 0.6))
FRAM.append(text("t_bris", "BRIS  C-60", KX + EW / 2 - 0.08, ey1 + 0.2, 0.065, TEXT, MONO, KY - 0.006, "RIGHT", 0.4))
FRAM.append(text("t_sida", "A", KX - KW / 2 + 0.2, KZ + NAV_DZ, 0.2, mat("sida", (0.85, 0.85, 0.86), 0, 0.4), GROT, KY - 0.008))
# (bandets namn skrivs av appen till höger på den nedre etiketten, och randen färgas efter bandet)
FRAM.append(text("t_hemlig", "SECRET 03", KX - EW / 2 + 0.08, ey2 - 0.06, 0.07, TEXT, MONO, KY - 0.006, "LEFT", 0.3))
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
VS = 2.09                                   # skalan mot ett VHS-band i samma mått som kassetten
VW, VHH = 2.25 * VS, 1.24 * VS              # 4,70 x 2,59 – bandspelarens front är 4,8 x 2,6
VX, VZ, VY = 0.0, 0.0, 0.12                 # VHS-bandets mitt och framsida (bakom fronten)
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
VHS_FRAM.append(box("vhs_etikett", VX, VZ + 0.47 * VS, VW - 0.3 * VS, 0.22 * VS, VY - 0.006, VY, papper("vhsetikett", (0.92, 0.91, 0.88))))
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
INRE.append(ram("inre_kant", 0, 0, PW - 0.16, PH - 0.16, 0.08, 0.0, 0.9, FRONT, 0.01))   # väggarna (fronten är borta)
for sx in (-1, 1):   # skenorna som bandet glider in i, och spolarnas axlar
    INRE.append(box(f"inre_skena{sx}", sx * (VW / 2 + 0.02), 0.05, 0.06, PH - 0.4, 0.3, 0.85, SILVER))
    INRE.append(cyl(f"inre_axel{sx}", VX + sx * VNAV_DX, VZ + VNAV_DZ, 0.16, 0.55, 0.85, SILVER, 64))
    for k in range(6):
        v = k * math.pi / 3
        bpy.ops.mesh.primitive_cube_add(size=1, location=(VX + sx * VNAV_DX + math.sin(v) * 0.13, 0.54, VZ + VNAV_DZ + math.cos(v) * 0.13), rotation=(0, -v, 0))
        o = bpy.context.object; o.scale = (0.03, 0.05, 0.07); lagg(o, VITPLAST); INRE.append(o)
# videohuvudet (trumman, axeln uppåt) med sina styrstift och tryckrullen
bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=0.34, vertices=128, location=(0.0, 0.55, -0.86))
o = bpy.context.object; o.name = "inre_trumma"; lagg(o, KROM); INRE.append(o)
INRE.append(box("inre_trumband", 0.0, -0.86, 0.86, 0.03, 0.12, 0.98, SVART))
for x in (-0.62, 0.62, 1.15):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.045 if x != 1.15 else 0.09, depth=0.3, vertices=48, location=(x, 0.55, -0.86))
    o = bpy.context.object; lagg(o, KROM if x != 1.15 else GUMMI); INRE.append(o)
for sx, sz in [(-2.1, 1.05), (2.1, 1.05), (-2.1, -1.05), (2.1, -1.05)]:
    INRE.append(cyl("inre_skruv", sx, sz, 0.035, 0.83, 0.85, SKRUV, 32))
INRE.append(text("inre_t", "BRIS  VHS  HI-FI  STEREO", 0.0, 1.0, 0.055, mat("inretext", (0.45, 0.45, 0.46), 0, 0.5), MONO, 0.84, spar=0.5))

# ------------------------------------------------------------------ VU-mätarna: skalan ritas som bild (PIL) med BLONDA Mono
def vu_bild(sti):
    from PIL import Image, ImageDraw, ImageFont
    W, H = 1410, 930
    im = Image.new("RGB", (W, H), (236, 214, 168)); d = ImageDraw.Draw(im)
    for yy in range(H):   # ljuset kommer underifrån: varmare och ljusare nertill
        t = yy / H; c = (int(222 + 20 * t), int(196 + 22 * t), int(146 + 26 * t))
        d.line([(0, yy), (W, yy)], fill=c)
    px, py, R = W / 2, H * 1.18, H * 0.98        # nålens fäste (under bilden) och skalans radie
    f = ImageFont.truetype(MONO, 44); fs = ImageFont.truetype(GROT, 70); fl = ImageFont.truetype(MONO, 34)
    def pkt(vinkel, r): a_ = math.radians(vinkel); return (px + r * math.sin(a_), py - r * math.cos(a_))
    # dB -> vinkel (VU-skalan är olinjär): -20..+3 dB över -48..+48 grader
    def vink(db): v = 10 ** (db / 20); v0, v1 = 10 ** (-20 / 20), 10 ** (3 / 20); return -48 + 96 * (v - v0) / (v1 - v0)
    MORK, ROD_ = (34, 28, 22), (186, 36, 22)
    for i in range(240):   # bågen, mörk till 0 dB och röd över
        a0 = -48 + 96 * i / 240; a1 = -48 + 96 * (i + 1) / 240
        d.line([pkt(a0, R * 0.86), pkt(a1, R * 0.86)], fill=ROD_ if a0 > vink(0) else MORK, width=5)
        if a0 > vink(0): d.line([pkt(a0, R * 0.878), pkt(a1, R * 0.878)], fill=ROD_, width=14)
    for db in [-20, -10, -7, -5, -3, -2, -1, 0, 1, 2, 3]:
        an = vink(db); rod = db > 0
        d.line([pkt(an, R * 0.86), pkt(an, R * (0.95 if db in (-20, -10, -5, 0, 3) else 0.915))], fill=ROD_ if rod else MORK, width=5)
        if db in (-20, -10, -7, -5, -3, 0, 1, 3):
            x, y = pkt(an, R * 1.0); s = ("+" if db > 0 else "") + str(db)
            d.text((x, y - 6), s, font=f, fill=ROD_ if rod else MORK, anchor="ms")
    for pc, txt in [(0, "0"), (50, "50"), (100, "100%")]:   # procentskalan under bågen
        an = -48 + 96 * pc / 100 * (vink(0) + 48) / 96
        x, y = pkt(an, R * 0.78); d.text((x, y), txt, font=fl, fill=(110, 96, 74), anchor="mm")
    d.text((W / 2, H * 0.6), "VU", font=fs, fill=MORK, anchor="mm")
    d.text((W / 2, H * 0.78), "B L O N D A", font=fl, fill=(120, 104, 80), anchor="mm")
    im.save(sti)
    return dict(px=px / W, py=py / H, r=R / H, vink=[vink(-20), vink(3)])

VUINFO = vu_bild(os.path.join(UT, "vu_skala.png"))
VUEMIT = []
for i, (x, z) in enumerate(VU):
    m = bpy.data.materials.new(f"vu{i}"); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = bpy.data.images.load(os.path.join(UT, "vu_skala.png"), check_existing=True)
    # utan bakgrundsljus är skalan mörkare (ljuset läggs på i appen efter nivån, lagret vu)
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"; mx.inputs["Factor"].default_value = 1.0
    mx.inputs["B"].default_value = (0.42, 0.4, 0.37, 1)
    nt.links.new(tx.outputs["Color"], mx.inputs["A"]); nt.links.new(mx.outputs["Result"], b.inputs["Base Color"])
    nt.links.new(tx.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Roughness"].default_value = 0.6; b.inputs["Emission Strength"].default_value = 0.0
    b.inputs["Specular IOR Level"].default_value = 0.2
    VUEMIT.append(b)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, VUY, z), rotation=(math.radians(90), 0, 0))
    o = bpy.context.object; o.name = f"vu{i}"; o.scale = (VUW, VUH, 1); bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); FRAM.append(o)
    FRAM.append(box(f"vuglas{i}", x, z, VUW, VUH, 0.012, 0.014, VUGLAS))
    FRAM.append(ram(f"vuram{i}", x, z, VUW, VUH, 0.04, -0.02, 0.03, ANOD))
    # skuggan överst i mätaren (ramen skymmer ljuset) – en tunn mörk list innanför ramen
    FRAM.append(box(f"vulist{i}", x, z + VUH / 2 - 0.02, VUW, 0.04, 0.03, VUY - 0.004, ANOD))
LJUSTEXT = mat("ljustext", (0.01, 0.009, 0.008), 0.0, 0.7)   # graverad text i den ljusa fronten
FRAM.append(text("t_vul", "L", VU[0][0] - VUW / 2 + 0.03, VU[0][1] - VUH / 2 - 0.12, 0.06, LJUSTEXT, MONO, -0.001))
FRAM.append(text("t_vur", "R", VU[1][0] - VUW / 2 + 0.03, VU[1][1] - VUH / 2 - 0.12, 0.06, LJUSTEXT, MONO, -0.001))

# räkneverket: ett svart fönster (siffrorna ritas av appen) med ram och en återställningsknapp
FRAM.append(box("cnt_bak", CNT[0], CNT[1], CNT[2], CNT[3], 0.075, 0.08, SVART))
FRAM.append(ram("cnt_ram", CNT[0], CNT[1], CNT[2], CNT[3], 0.025, -0.012, 0.02, ANOD, 0.006))
FRAM.append(cyl("cnt_knapp", CNT[0] + CNT[2] / 2 + 0.14, CNT[1], 0.045, -0.05, 0.0, KROM, 48, 0.008))
FRAM.append(text("t_cnt", "TAPE COUNTER", CNT[0], CNT[1] - 0.16, 0.045, LJUSTEXT, MONO, -0.001, spar=0.5))
FRAM.append(text("t_cntr", "RESET", CNT[0] + CNT[2] / 2 + 0.14, CNT[1] - 0.16, 0.035, LJUSTEXT, MONO, -0.001, spar=0.4))
# rattarna: svarvad framsida, räfflad kant (syns uppifrån), mörk kjol mot fronten; REC-lampan i en kromring
for i, (x, z, rr) in enumerate(RATTAR):
    FRAM.append(cyl(f"rattkjol{i}", x, z, rr * 1.18, -0.035, 0.0, ANOD, 96, 0.006))
    rt = cyl(f"ratt{i}", x, z, rr, RATTY, -0.03, SILVER, 96, 0.012); FRAM.append(rt)
    for k in range(48):   # räfflorna
        v = k * 2 * math.pi / 48
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x + math.sin(v) * rr, (RATTY - 0.03) / 2 - 0.005, z + math.cos(v) * rr), rotation=(0, -v, 0))
        o = bpy.context.object; o.scale = (0.012, -RATTY - 0.06, 0.008); lagg(o, ANOD); FRAM.append(o)
    FRAM.append(cyl(f"rattfront{i}", x, z, rr * 0.93, RATTY - 0.002, RATTY + 0.001, RATTMAT, 96))
    FRAM.append(text(f"t_ratt{i}", ["REC LEVEL", "OUTPUT"][i], x, -0.98, 0.045, LJUSTEXT, MONO, -0.001, spar=0.5))
    for k in range(11):   # skalan runt ratten (-135 .. +135 grader)
        v = math.radians(-135 + 27 * k)
        FRAM.append(box(f"rattskala{i}{k}", x + math.sin(v) * rr * 1.36, z + math.cos(v) * rr * 1.36, 0.012, 0.012, -0.0015, 0.001, GRAVYR))
FRAM.append(cyl("led_ring", LED[0], LED[1], 0.055, -0.03, 0.0, KROM, 48, 0.006))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.036, location=(LED[0], -0.03, LED[1])); o = bpy.context.object; lagg(o, ROD); FRAM.append(o)
FRAM.append(text("t_rec", "REC", LED[0], -0.86, 0.045, LJUSTEXT, MONO, -0.001, spar=0.5))
FRAM.append(text("t_logo", "BLONDA", -PW / 2 + 0.24, PH / 2 - 0.3, 0.19, LJUSTEXT, GROT, -0.002, "LEFT", 0.9))
FRAM.append(text("t_modell", "BRIS  K-1   STEREO CASSETTE DECK", PW / 2 - 0.24, PH / 2 - 0.3, 0.055, LJUSTEXT, MONO, -0.001, "RIGHT", 0.4))

# transporttangenterna under luckan (pianotangenter), med symboler
KNAPP = []   # [(tangenten, [symbolerna])] i ordning REC REW PLAY FF STOP PAUS
def symbol(typ, x, z, s):
    m = SVART if typ != "rec" else ROD
    y = KNY0 - 0.002; fore = len(FRAM)
    def tri(cx, rikt):
        bm_ = bmesh.new(); h = s * 0.5
        pts = [(cx - h * 0.5 * rikt, z - h * 0.6), (cx - h * 0.5 * rikt, z + h * 0.6), (cx + h * 0.55 * rikt, z)]
        vs = [bm_.verts.new((px_, y, pz_)) for px_, pz_ in pts]; bm_.faces.new(vs)
        me = bpy.data.meshes.new("tri"); bm_.to_mesh(me); bm_.free(); o = bpy.data.objects.new("tri", me); sc.collection.objects.link(o)
        o.data.materials.append(m); FRAM.append(o)
    if typ == "play": tri(x, 1)
    elif typ == "ff": tri(x - s * 0.15, 1); tri(x + s * 0.15, 1)
    elif typ == "rew": tri(x + s * 0.15, -1); tri(x - s * 0.15, -1)
    elif typ == "stop": FRAM.append(box("stop", x, z, s * 0.42, s * 0.42, y - 0.001, y, m))
    elif typ == "paus": FRAM.append(box("p1", x - s * 0.12, z, s * 0.1, s * 0.5, y - 0.001, y, m)); FRAM.append(box("p2", x + s * 0.12, z, s * 0.1, s * 0.5, y - 0.001, y, m))
    elif typ == "rec": FRAM.append(cyl("recs", x, z, s * 0.22, y - 0.001, y, m, 48))
    return FRAM[fore:]
FRAM.append(box("tangentfalt", (KNX[0] + KNX[-1]) / 2, KNZ, KNX[-1] - KNX[0] + KNW + 0.06, KNH + 0.06, -0.004, 0.02, ANOD, fas=0.01))
for i, typ in enumerate(KNAPPAR):
    k = box(f"tangent{i}", KNX[i], KNZ, KNW, KNH, KNY0, 0.05, SILVER, fas=0.03, seg=5); FRAM.append(k)
    KNAPP.append((k, symbol(typ, KNX[i], KNZ, 0.22)))
    FRAM.append(text(f"t_tangent{i}", ["REC", "REW", "PLAY", "FF", "STOP", "PAUSE"][i], KNX[i], KNZ - KNH / 2 - 0.09, 0.038, LJUSTEXT, MONO, -0.001, spar=0.4))

# ------------------------------------------------------------------ bordet, ljus och kamera
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 6, GOLV)); BORD = bpy.context.object; BORD.name = "bord"
lagg(BORD, mat("bord", (0.06, 0.045, 0.035), 0.0, 0.6))
BORD.is_shadow_catcher = True

vg = bpy.data.worlds.new("varld"); sc.world = vg; vg.use_nodes = True
# omgivningen (syns i metallen): mörkt nertill, ett varmt ljust tak
wn = vg.node_tree.nodes; wl = vg.node_tree.links.new
tcw = wn.new("ShaderNodeTexCoord"); sep = wn.new("ShaderNodeSeparateXYZ"); crw = wn.new("ShaderNodeValToRGB")
crw.color_ramp.elements[0].position = 0.52; crw.color_ramp.elements[0].color = (0.004, 0.0035, 0.003, 1)
crw.color_ramp.elements[1].position = 0.9; crw.color_ramp.elements[1].color = (0.30, 0.26, 0.22, 1)
mrw = wn.new("ShaderNodeMapRange"); mrw.inputs["From Min"].default_value = -1; mrw.inputs["From Max"].default_value = 1
wl(tcw.outputs["Generated"], sep.inputs["Vector"]); wl(sep.outputs["Z"], mrw.inputs["Value"]); wl(mrw.outputs["Result"], crw.inputs["Fac"])
wl(crw.outputs["Color"], wn["Background"].inputs["Color"])

def ljus(namn, loc, energi, farg, storlek, mot, form="RECTANGLE", sy=None):
    d = bpy.data.lights.new(namn, "AREA"); d.energy = energi; d.color = farg; d.shape = form; d.size = storlek; d.size_y = sy or storlek
    o = bpy.data.objects.new(namn, d); o.location = loc; sc.collection.objects.link(o)
    o.rotation_euler = (Vector(mot) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); return o
LJUS = [ljus("nyckel", (-3.2, -4.2, 3.6), 1000, (1.0, 0.88, 0.76), 5.0, (0, 0.5, 0), sy=3.0),     # varm softbox uppifrån vänster
        ljus("fyll", (5.5, -6.5, 1.0), 260, (0.78, 0.84, 1.0), 6.0, (0, 0, 0)),
        ljus("topp", (0.0, 1.0, 6.0), 110, (1.0, 0.92, 0.82), 7.0, (0, 1.2, 0), sy=3.0),           # locket
        ljus("kant", (0.0, 8.0, 3.0), 300, (1.0, 0.85, 0.7), 8.0, (0, 0, 0))]                       # bakifrån: kanter
LJUS[3].visible_glossy = False   # kantljuset syns inte som en spegling i locket (det blev en grå skiva)
# ett svagt ljus inne i luckans fack, så att kassetten syns genom glaset
fl_ = bpy.data.lights.new("fackljus", "AREA"); fl_.energy = 6; fl_.color = (1.0, 0.8, 0.6); fl_.size = DWW * 0.9; fl_.shape = "RECTANGLE"; fl_.size_y = 0.2
FACKLJUS = bpy.data.objects.new("fackljus", fl_); FACKLJUS.location = (DX, 0.12, DZ + DHH / 2 - 0.05); sc.collection.objects.link(FACKLJUS)
FACKLJUS.rotation_euler = (math.radians(-30), 0, 0)

# en mjuk ljusruta framför bandspelaren som bara syns i speglingar: ger glaset och metallen en diagonal reflex
def reflex():
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-1.2, -12.0, -0.4), rotation=(math.radians(90), math.radians(-24), 0))
    o = bpy.context.object; o.name = "reflex"; o.scale = (1.6, 9.0, 1)
    m = bpy.data.materials.new("reflex"); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (1.0, 0.93, 0.86, 1); em.inputs["Strength"].default_value = 0.8
    nt.links.new(em.outputs[0], out.inputs["Surface"]); o.data.materials.append(m)
    o.visible_camera = False; o.visible_diffuse = False; o.visible_shadow = False; o.visible_transmission = False
    return o
REFLEX = reflex()

ORTO = 5.75                                  # bildens bredd i enheter
t_ = math.radians(TILT); D_ = Vector((0, math.cos(t_), -math.sin(t_))); U_ = Vector((0, math.sin(t_), math.cos(t_)))
C0 = 0.12                                    # bildens mitt (höjd i bilden), så att bandspelaren och skuggan står mitt i
cam = bpy.data.cameras.new("kamera"); cam.type = "ORTHO"; cam.ortho_scale = ORTO
co = bpy.data.objects.new("kamera", cam); sc.collection.objects.link(co); sc.camera = co
co.location = -20 * D_ + C0 * U_; co.rotation_euler = (math.radians(90 - TILT), 0, 0)

r = sc.render; r.engine = "CYCLES"; r.resolution_x = a.bredd; r.resolution_y = round(a.bredd * 3.3 / ORTO); r.resolution_percentage = 100
cy = sc.cycles; cy.device = "CPU"; cy.samples = a.prov; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.015
cy.use_denoising = True
try: cy.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
cy.max_bounces = 10; cy.transparent_max_bounces = 16
try: sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
except Exception:
    try: sc.view_settings.view_transform = "Filmic"; sc.view_settings.look = "Medium High Contrast"
    except Exception: sc.view_settings.view_transform = "Standard"
r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGBA"; r.image_settings.color_depth = "16"

W0, H0 = r.resolution_x, r.resolution_y; s0 = W0 / ORTO
def px(x, z, y=0.0):   # världens punkt -> bildpunkt (kameran lutar TILT grader nedåt)
    p = Vector((x, y, z)); return [round(W0 / 2 + x * s0, 2), round(H0 / 2 - (p.dot(U_) - C0) * s0, 2)]
def ruta(x0, z0, w, h, y=0.0):   # rektangel i fronten (vänster, överkant) -> [x, y, b, h] i bildpunkter
    a_ = px(x0, z0, y); b_ = px(x0 + w, z0 - h, y); return a_ + [round(b_[0] - a_[0], 2), round(b_[1] - a_[1], 2)]

# Lagren (bakifrån): skugga · bak (luckans insida) · kassett_bak · spolarna (appen) · kassett_fram · panel · lucka.
KASSETTDELAR = {"skal", "fonster", "etikett_o", "etikett_u", "rand", "t_brand", "t_bris", "t_sida", "t_hemlig", "trapets", "skruv", "skrivlinje0", "skrivlinje1"}
KFRAM = [o for o in FRAM if o.name.split(".")[0] in KASSETTDELAR]
KBAK = [o for o in BAK if o.name.split(".")[0] in ("skal_bak", "band")]
LUCKA_O = [o for o in FRAM if o.name == "lucka"]
SKAP = [o for o in FRAM if o.name.split(".")[0] in ("lock", "sida-1", "sida1", "fot")]   # skåpet står kvar när fronten fälls ut
PANELDEL = [o for o in FRAM if o not in KFRAM and o not in LUCKA_O and o not in SKAP]
BAK = [o for o in BAK if o not in KBAK]
DECK = set(PANELDEL + SKAP + LUCKA_O + BAK + KFRAM + KBAK)

def rendera(namn, synliga, vu_emit, ljus_pa, transparent=True, vhs=False, inne=False, skugga=False, skap_hal=False):
    for o in sc.objects:
        if o.type in ("MESH", "FONT", "CURVE") and o is not REFLEX: o.visible_camera = o in synliga
    for o in SKAP:   # skåpet skymmer fronten där det ligger framför (locket över frontens ovansida), utan att synas själv
        o.is_holdout = skap_hal and not inne
        if o.is_holdout: o.visible_camera = True
    for o in KFRAM + KBAK: o.hide_render = vhs or inne   # kassetten i luckan, eller VHS-bandet bakom fronten
    for o in VHS_FRAM + VHS_BAK: o.hide_render = not vhs
    for o in INRE: o.hide_render = not inne or vhs      # insidan bara när fronten är borta
    for o in PANELDEL + SKAP + LUCKA_O + BAK: o.hide_render = inne   # bakom fronten: den skuggar inte (den är utfälld)
    BORD.hide_render = not skugga
    REFLEX.hide_render = not ljus_pa
    for o in LJUS: o.hide_render = not ljus_pa
    FACKLJUS.hide_render = not ljus_pa or inne
    vg.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0 if ljus_pa else 0.0
    for b in VUEMIT: b.inputs["Emission Strength"].default_value = vu_emit
    r.film_transparent = transparent
    r.filepath = os.path.join(UT, namn + ".png")
    bpy.ops.render.render(write_still=True); print("KLAR", r.filepath, flush=True)

VU_GLOD = 0.0   # VU-skalorna lyser inte i de vanliga lagren: appen lägger på ljuset (lagret vu) efter nivån
ALLA = ["skugga", "bak", "kassett_bak", "kassett_fram", "vhs_bak", "vhs_fram", "inre", "skap", "panel", "nere", "lucka", "vu", "nav", "nav_vhs"]
vilka = [s.strip() for s in a.bara.split(",") if s.strip()] or ALLA
if a.forhand:
    rendera("forhand", DECK | {BORD}, VU_GLOD * 2, True, skugga=True); vilka = []
if "skugga" in vilka: rendera("skugga", {BORD}, VU_GLOD, True, skugga=True)
if "bak" in vilka: rendera("bak", set(BAK), VU_GLOD, True)
if "kassett_bak" in vilka: rendera("kassett_bak", set(KBAK), VU_GLOD, True)
if "kassett_fram" in vilka: rendera("kassett_fram", set(KFRAM), VU_GLOD, True)
if "vhs_bak" in vilka: rendera("vhs_bak", set(VHS_BAK), VU_GLOD, True, vhs=True, inne=True)
if "vhs_fram" in vilka: rendera("vhs_fram", set(VHS_FRAM), VU_GLOD, True, vhs=True, inne=True)
if "inre" in vilka: rendera("inre", set(INRE), VU_GLOD, True, inne=True)
if "skap" in vilka: rendera("skap", set(SKAP), VU_GLOD, True)
if "panel" in vilka: rendera("panel", set(PANELDEL), VU_GLOD, True, skap_hal=True)
if "nere" in vilka:   # fronten med alla tangenter nedtryckta (appen klipper ut de tangenter som är nere)
    for k, sy in KNAPP:
        for o in [k] + sy: o.location.y += NERE
    rendera("nere", set(PANELDEL), VU_GLOD, True, skap_hal=True)
    for k, sy in KNAPP:
        for o in [k] + sy: o.location.y -= NERE
if "lucka" in vilka: rendera("lucka", set(LUCKA_O), VU_GLOD, True)
if "vu" in vilka:   # bara VU-ljuset: allt annat släckt, ogenomskinligt svart runt omkring (läggs till i appen)
    rendera("vu", set(PANELDEL), 0.9, False, transparent=False)

# spolnaven, framifrån i egna små renderingar (rakt framifrån, utan lutning, med ljus rakt framifrån så att inget
# ljus snurrar med när appen vrider bilden):
#   nav      – kassettens nav: en vit ring med sex kuggar inåt, och bandspelarens axel i mitten (genom skalets hål)
#   nav_vhs  – VHS-spolen: vitt nav med kuggar och tre fönster, och spolens genomskinliga fläns över bandet
NAVSPRITE = {"nav": NAV_R * 1.05, "nav_vhs": VPACK_MAX * 1.03 * 1.04}   # bildens halva bredd (enheter)
if "nav" in vilka or "nav_vhs" in vilka:
    for o in sc.objects:
        if o.type in ("MESH", "FONT", "CURVE"): o.hide_render = True
    for o in LJUS: o.hide_render = True
    BORD.hide_render = True; FACKLJUS.hide_render = True; REFLEX.hide_render = True
    fram_ = ljus("navljus", (0.0, -6.0, 0.0), 200, (1.0, 0.96, 0.9), 9.0, (0, 0, 0))
    for _v in range(6):   # en krans av svaga ljus runt om (ljuset är detsamma åt alla håll, så det snurrar inte med)
        _a = _v * math.pi / 3; ljus(f"navkrans{_v}", (math.sin(_a) * 4, -3.0, math.cos(_a) * 4), 40, (1.0, 0.96, 0.9), 1.5, (0, 0, 0))
    vg.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
    NAVPLAST = mat("navplast", (0.88, 0.86, 0.82), 0.0, 0.42)
    AXEL = mat("axel", (0.06, 0.06, 0.065), 0.4, 0.35)
    BAKOM = mat("bakom", (0.01, 0.01, 0.012), 0.0, 0.8)
    FLANS = mat("flans", (0.85, 0.86, 0.9), 0.0, 0.05, alfa=0.12)
    FLANSRIB = mat("flansrib", (0.9, 0.9, 0.92), 0.0, 0.2, alfa=0.35)

    def tander(r0, r1, b, n, y0, y1, m, fas=0.0, off=0.0):   # n kuggar från radien r0 till r1 (bredd b), vridna off
        ut = []
        for i in range(n):
            v = i * 2 * math.pi / n + off
            rm = (r0 + r1) / 2
            bpy.ops.mesh.primitive_cube_add(size=1, location=(math.sin(v) * rm, (y0 + y1) / 2, math.cos(v) * rm), rotation=(0, -v, 0))
            o = bpy.context.object; o.scale = (b, y1 - y0, r1 - r0); bpy.ops.object.transform_apply(scale=True)
            if fas: bv = o.modifiers.new("fas", "BEVEL"); bv.width = fas; bv.segments = 2
            ut.append(lagg(o, m))
        return ut

    def navrender(namn, delar):
        for o in sc.objects:
            if o.type in ("MESH", "FONT", "CURVE"): o.hide_render = o not in delar
            if o.type in ("MESH", "FONT", "CURVE"): o.visible_camera = True
        cam.ortho_scale = NAVSPRITE[namn] * 2; r.resolution_x = r.resolution_y = 512
        co.location = (0, -20, 0); co.rotation_euler = (math.radians(90), 0, 0)
        r.film_transparent = True
        r.filepath = os.path.join(UT, namn + ".png"); bpy.ops.render.render(write_still=True); print("KLAR", namn, flush=True)

    if "nav" in vilka:
        R = NAV_R; d = []
        ring = cyl("navring", 0, 0, R, -0.05, 0.0, NAVPLAST, 160, 0.004)
        hal(ring, [cyl("navringhal", 0, 0, R * 0.57, -0.3, 0.3, SVART, 128)]); d.append(ring)
        d.append(ring)
        kant = cyl("navkant", 0, 0, R * 0.68, -0.056, -0.049, NAVPLAST, 128, 0.002)   # en upphöjd kant runt hålet
        hal(kant, [cyl("navkanthal", 0, 0, R * 0.57, -0.3, 0.3, SVART, 128)]); d.append(kant)
        d += tander(R * 0.38, R * 0.6, 0.032, 6, -0.048, 0.0, NAVPLAST, 0.004)
        # bandspelarens axel: mörk, med tre kilar mellan kuggarna, och en ljus topp
        d.append(cyl("axel", 0, 0, R * 0.3, -0.03, 0.1, AXEL, 96, 0.006))
        d += tander(R * 0.25, R * 0.4, 0.028, 3, -0.025, 0.05, AXEL, 0.003, math.pi / 6)
        d.append(cyl("axeltopp", 0, 0, R * 0.1, -0.035, -0.02, KROM, 48, 0.003))
        d.append(cyl("navbakom", 0, 0, R * 0.62, 0.15, 0.2, BAKOM, 96))
        navrender("nav", set(d))

    if "nav_vhs" in vilka:
        R = VNAV_R; RF = VPACK_MAX * 1.03; d = []
        hub = cyl("vnav", 0, 0, R, -0.06, 0.0, NAVPLAST, 192, 0.006)
        kl = [cyl("vnavhal", 0, 0, R * 0.42, -0.3, 0.3, SVART, 128)]
        for i in range(6):   # sex runda hål i navet
            v = i * 2 * math.pi / 6 + math.pi / 6
            kl.append(cyl(f"vf{i}", math.sin(v) * R * 0.72, math.cos(v) * R * 0.72, R * 0.1, -0.3, 0.3, SVART, 64))
        hal(hub, kl); d.append(hub)
        d += tander(R * 0.28, R * 0.44, 0.045, 6, -0.055, 0.0, NAVPLAST, 0.005)
        d.append(cyl("vaxel", 0, 0, R * 0.2, -0.04, 0.1, AXEL, 96, 0.008))
        d += tander(R * 0.16, R * 0.29, 0.04, 3, -0.035, 0.05, AXEL, 0.004, math.pi / 6)
        d.append(cyl("vaxeltopp", 0, 0, R * 0.07, -0.045, -0.03, KROM, 48, 0.004))
        d.append(cyl("vnavbakom", 0, 0, R * 0.95, 0.15, 0.2, BAKOM, 128))
        # flänsen: genomskinlig plast över bandet, med en ring vid navet, sex svaga ribbor och en kant ytterst
        d.append(cyl("flans", 0, 0, RF, -0.075, -0.068, FLANS, 192))
        fk = cyl("flanskant", 0, 0, RF, -0.078, -0.066, FLANSRIB, 192); hal(fk, [cyl("fkh", 0, 0, RF - 0.02, -0.3, 0.3, SVART, 192)]); d.append(fk)
        fr = cyl("flansring", 0, 0, R * 1.18, -0.08, -0.068, FLANSRIB, 192); hal(fr, [cyl("frh", 0, 0, R * 1.1, -0.3, 0.3, SVART, 192)]); d.append(fr)
        d += tander(R * 1.18, RF - 0.03, 0.012, 6, -0.078, -0.07, FLANSRIB)
        navrender("nav_vhs", set(d))

info = {
    "w": W0, "h": H0, "enhet": round(s0, 4), "tilt": TILT,
    "spolar": [px(KX - NAV_DX, KZ + NAV_DZ, KY + 0.06), px(KX + NAV_DX, KZ + NAV_DZ, KY + 0.06)],
    "nav_r": round(NAV_R * s0, 2), "pack": [round(PACK_MIN * s0, 2), round(PACK_MAX * s0, 2)],
    "kassett": ruta(KX - KW / 2, KZ + KH / 2, KW, KH, KY),
    "vu": [dict(fast=px(x - VUW / 2 + VUINFO["px"] * VUW, z + VUH / 2 - VUINFO["py"] * VUH, VUY), langd=round(VUINFO["r"] * VUH * s0 * 0.93, 2),
                ruta=ruta(x - VUW / 2, z + VUH / 2, VUW, VUH, VUY)) for x, z in VU],
    "vu_vinkel": [round(v, 3) for v in VUINFO["vink"]],
    "raknare": ruta(CNT[0] - CNT[2] / 2, CNT[1] + CNT[3] / 2, CNT[2], CNT[3], 0.075),
    "rand": ruta(KX - EW / 2, ey1 + 0.07 + 0.025, EW, 0.05, KY),
    "bandtext": px(KX + EW / 2 - 0.08, ey2 - 0.06, KY) + [round(0.07 * s0, 2)],   # högerkant, mitt, textens storlek
    "lucka": ruta(DX - DWW / 2, DZ + DHH / 2, DWW, DHH, 0.02),
    "knappar": [dict(namn=KNAPPAR[i], ruta=ruta(KNX[i] - KNW / 2 - 0.02, KNZ + KNH / 2 + 0.02, KNW + 0.04, KNH + 0.04, KNY0)) for i in range(6)],
    "rattar": [dict(mitt=px(x, z, RATTY), r=round(rr * s0, 2)) for x, z, rr in RATTAR],
    "led": px(LED[0], LED[1], -0.03) + [round(0.036 * s0, 2)],
    "vhs": dict(spolar=[px(VX - VNAV_DX, VZ + VNAV_DZ, VY + 0.15), px(VX + VNAV_DX, VZ + VNAV_DZ, VY + 0.15)], nav_r=round(VNAV_R * s0, 2),
                sprite_r=round(VPACK_MAX * 1.03 * 1.04 * s0, 2),   # VHS-spolens bild (nav + fläns): halva bredden
                pack=[round(VPACK_MIN * s0, 2), round(VPACK_MAX * s0, 2)], ruta=ruta(VX - VW / 2, VZ + VHH / 2, VW, VHH, VY)),
    "front": ruta(-PW / 2, PH / 2, PW, PH, 0.0),   # fronten (fälls ut kring nederkanten)
}
json.dump(info, open(os.path.join(UT, "kassett.json"), "w"), indent=1)
print("KLAR json", flush=True)
