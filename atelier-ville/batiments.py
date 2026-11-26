"""
Atelier ville — rendu Blender de TOUS les éléments de l'appli (src/city/buildings.ts).

Lancement (sans interface) :
  blender -b -P atelier-ville/batiments.py -- <dossier_sortie> [id ...] [--sens g|d]

Chaque élément est rendu dans ses deux orientations :
  <id>-g.png : façade tournée vers la GAUCHE de l'écran (vers -y)
  <id>-d.png : façade tournée vers la DROITE (scène pivotée d'un quart de tour, même soleil)
→ dans l'appli : flip = false ↔ « d » (comme les dessins SVG actuels, porte à droite), flip = true ↔ « g ».
Un élément de taille n occupe n × n cases ; une case = une parcelle de 3 × 3 unités
(+ la largeur d'une route entre deux cases, recouverte par les grands bâtiments).
Les merveilles (et légendaires) ont un rendu « premium » : plus de détails, éclairage raytracing.
"""
import bpy, sys, os, math, random, json
from mathutils import Vector, Matrix

ICI = os.path.dirname(os.path.abspath(__file__))
ATELIER_BIBLIO = True
__file__ = os.path.join(ICI, 'village.py')
exec(compile(open(__file__, encoding='utf8').read(), __file__, 'exec'))
__file__ = os.path.join(ICI, 'batiments.py')


def hex_rgb(h):
    """Couleur « #rrggbb » ou « #rgb » → tableau 0..1 (remplace celle de village.py)."""
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])

# ---------- Palettes supplémentaires ----------
STYLES.update({
    'bleu': {'enduit': '#c9def2', 'tuile_rouge': '#c2453a', 'tuile_verte': '#c2453a', 'bois': '#4f3122', 'planches': '#6b4029'},
    'chalet': {'enduit': '#ead2a8', 'tuile_rouge': '#6a4a3a', 'tuile_verte': '#6a4a3a', 'bois': '#5a361f', 'planches': '#8a5a34'},
    'orange': {'enduit': '#f7c08f', 'tuile_rouge': '#7a3f2a', 'tuile_verte': '#7a3f2a', 'bois': '#4f3122', 'planches': '#6b4029'},
    'villa': {'enduit': '#fffaf0', 'tuile_rouge': '#2a9d8f', 'tuile_verte': '#2a9d8f', 'bois': '#6b4a30', 'planches': '#8a5a34'},
    'boulange': {'enduit': '#f6dcb5', 'tuile_rouge': '#a5532b', 'tuile_verte': '#a5532b', 'bois': '#5a361f', 'planches': '#7a4a30'},
    'cafe': {'enduit': '#cfe8ea', 'tuile_rouge': '#c2453a', 'tuile_verte': '#c2453a', 'bois': '#4f3122', 'planches': '#6b4029'},
    'sport': {'enduit': '#ffe6cc', 'tuile_rouge': '#f0782d', 'tuile_verte': '#f0782d', 'bois': '#3d2b22', 'planches': '#5a3a2a'},
    'refuge': {'enduit': '#c9c2b6', 'tuile_rouge': '#7a2a2a', 'tuile_verte': '#7a2a2a', 'bois': '#4a2e20', 'planches': '#6b4029'},
    'horloge': {'enduit': '#efe0b8', 'tuile_rouge': '#8e2328', 'tuile_verte': '#8e2328', 'bois': '#4a2e20', 'planches': '#6b4029'},
    'ville': {'enduit': '#dfe9f2', 'tuile_rouge': '#3d4f6e', 'tuile_verte': '#3d4f6e', 'bois': '#3a3f4a', 'planches': '#5a5f6a'},
})


# ---------- Primitives ----------
def mat(hexa, rough=0.8, metal=0.0, emission=0.0, nom=None):
    nom = nom or f'c{hexa}{rough}{metal}{emission}'
    m = bpy.data.materials.get(nom)
    if m:
        return m
    m = _mat(nom, hexa, rough)
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Metallic'].default_value = metal
    if emission:
        b.inputs['Emission Color'].default_value = b.inputs['Base Color'].default_value
        b.inputs['Emission Strength'].default_value = emission
    return m


def _fini(o, m, lisse=False):
    o.data.materials.append(m)
    if lisse:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def cyl(r, h, pos, m, n=16, r2=None, lisse=True, rot=(0, 0, 0)):
    """Cylindre (ou tronc de cône si r2) posé sur pos (z = base)."""
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=r, depth=h)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=n, radius1=r, radius2=r2, depth=h)
    o = bpy.context.active_object
    o.rotation_euler = rot
    if rot == (0, 0, 0):
        o.location = (pos[0], pos[1], pos[2] + h / 2)
    else:
        o.location = pos
    return _fini(o, m, lisse)


def sphere(r, pos, m, sc=(1, 1, 1), n=16, lisse=True):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=n, ring_count=max(6, n // 2), radius=r, location=pos)
    o = bpy.context.active_object
    o.scale = sc
    return _fini(o, m, lisse)


def pave(taille, pos, m, rz=0.0):
    """Pavé centré en pos, tourné de rz (degrés) autour de la verticale."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    o = bpy.context.active_object
    o.scale = taille
    o.rotation_euler = (0, 0, math.radians(rz))
    return _fini(o, m)


def rocher(pos, taille, couleur='#a39e93', seed=1, sub=2, rugo=0.22):
    """Rocher low-poly : icosphère déformée aléatoirement, facettes nettes."""
    rnd = random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=1.0)
    o = bpy.context.active_object
    for v in o.data.vertices:
        k = 1 + rnd.uniform(-rugo, rugo)
        v.co *= k
        if v.co.z < -0.3:
            v.co.z = -0.3 - (v.co.z + 0.3) * 0.15  # base aplatie, posée au sol
    o.scale = taille
    o.location = (pos[0], pos[1], pos[2] + 0.3 * taille[2])
    o.rotation_euler = (0, 0, rnd.uniform(0, math.tau))
    return _fini(o, mat(couleur, 0.95))


def prises(pts, seed=1, r=(0.022, 0.04)):
    """Prises colorées posées aux points donnés."""
    rnd = random.Random(seed)
    objs = []
    for p in pts:
        c = rnd.choice(PRISES)
        h = bpy.data.objects.new('prise', _mesh(f'p{c}', rnd.uniform(*r), c))
        h.location = p
        bpy.context.scene.collection.objects.link(h)
        objs.append(h)
    return objs


def prises_sur(objs_cibles, n, seed=1, zmin=0.1, zmax=None, face=Vector((0.7, -0.7, 0))):
    """Prises posées sur la surface d'objets (rayons lancés depuis la caméra vers l'objet)."""
    rnd = random.Random(seed)
    noms = {o.name for o in objs_cibles}
    pts = [o.matrix_world @ Vector(c) for o in objs_cibles if o.type == 'MESH' for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    zmax = zmax or hi.z - 0.05
    res, essais = [], 0
    while len(res) < n and essais < n * 10:
        essais += 1
        cible = Vector((rnd.uniform(lo.x, hi.x), rnd.uniform(lo.y, hi.y), rnd.uniform(zmin, zmax)))
        d = Vector((face.x + rnd.uniform(-0.4, 0.4), face.y + rnd.uniform(-0.4, 0.4), rnd.uniform(-0.2, 0.3))).normalized()
        ok, loc, nrm, _, obj, _ = _rayon(cible + d * 6, -d)
        if ok and obj.name in noms:
            res.append(loc + nrm * 0.01)
    return prises(res, seed)


def mat_pierre(nom='PierreTaille', base='#d9cdb4', joints='#a89a80', echelle=(0.3, 0.14)):
    """Pierre de taille : appareillage de blocs (texture brique sur coordonnées monde, selon la face)."""
    m = bpy.data.materials.get(nom)
    if m:
        return m
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF')
    b.inputs['Roughness'].default_value = 0.9
    geo = N.new('ShaderNodeNewGeometry')
    sep = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Position'], sep.inputs[0])
    sn = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Normal'], sn.inputs[0])
    # coordonnée horizontale le long de la face : x pour les faces ±y, y pour les faces ±x
    ax = N.new('ShaderNodeMath'); ax.operation = 'ABSOLUTE'; L.new(sn.outputs[0], ax.inputs[0])
    gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.5; L.new(ax.outputs[0], gt.inputs[0])
    mixu = N.new('ShaderNodeMix'); mixu.data_type = 'FLOAT'
    L.new(gt.outputs[0], mixu.inputs['Factor'])
    L.new(sep.outputs[0], mixu.inputs[2]); L.new(sep.outputs[1], mixu.inputs[3])
    comb = N.new('ShaderNodeCombineXYZ')
    L.new(mixu.outputs[0], comb.inputs[0]); L.new(sep.outputs[2], comb.inputs[1])
    br = N.new('ShaderNodeTexBrick'); br.offset = 0.5
    br.inputs['Color1'].default_value = (*[c ** 2.2 for c in hex_rgb(base)], 1)
    br.inputs['Color2'].default_value = (*[min(1, c ** 2.2 * 0.9) for c in hex_rgb(base)], 1)
    br.inputs['Mortar'].default_value = (*[c ** 2.2 for c in hex_rgb(joints)], 1)
    br.inputs['Scale'].default_value = 1.0
    br.inputs['Mortar Size'].default_value = 0.008
    br.inputs['Brick Width'].default_value = echelle[0]
    br.inputs['Row Height'].default_value = echelle[1]
    L.new(comb.outputs[0], br.inputs['Vector'])
    L.new(br.outputs['Color'], b.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.4; bump.inputs['Distance'].default_value = 0.01
    L.new(br.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def mat_eau(nom='Eau'):
    m = bpy.data.materials.get(nom)
    if m:
        return m
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (0.08, 0.38, 0.6, 1)
    b.inputs['Roughness'].default_value = 0.08
    geo = N.new('ShaderNodeNewGeometry')
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 14
    L.new(geo.outputs['Position'], nz.inputs['Vector'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25; bump.inputs['Distance'].default_value = 0.01
    L.new(nz.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def mat_sable(nom='Sable'):
    m = bpy.data.materials.get(nom)
    if m:
        return m
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF'); b.inputs['Roughness'].default_value = 1
    geo = N.new('ShaderNodeNewGeometry')
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.5; nz.inputs['Detail'].default_value = 5
    L.new(geo.outputs['Position'], nz.inputs['Vector'])
    r = N.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].color = (0.72, 0.55, 0.3, 1); r.color_ramp.elements[0].position = 0.3
    r.color_ramp.elements[1].color = (0.88, 0.72, 0.45, 1); r.color_ramp.elements[1].position = 0.7
    L.new(nz.outputs['Fac'], r.inputs['Fac']); L.new(r.outputs['Color'], b.inputs['Base Color'])
    # dunes et rides de sable
    rides = N.new('ShaderNodeTexWave'); rides.inputs['Scale'].default_value = 6.0; rides.inputs['Distortion'].default_value = 6.0
    L.new(geo.outputs['Position'], rides.inputs['Vector'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25; bump.inputs['Distance'].default_value = 0.02
    L.new(rides.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def forme_plane(points, z, m, nom='forme'):
    """Polygone plat (eau, sable…) à partir d'un contour."""
    me = bpy.data.meshes.new(nom)
    me.from_pydata([(x, y, z) for x, y in points], [], [list(range(len(points)))])
    me.materials.append(m)
    o = bpy.data.objects.new(nom, me)
    bpy.context.scene.collection.objects.link(o)
    return o


def contour_organique(cx, cy, rx, ry, seed=1, n=40, ampl=0.15):
    rnd = random.Random(seed)
    ph = [rnd.uniform(0, 6.3) for _ in range(3)]
    return [(cx + rx * math.cos(a) * (1 + ampl * math.sin(3 * a + ph[0]) + ampl * 0.5 * math.sin(5 * a + ph[1])),
             cy + ry * math.sin(a) * (1 + ampl * math.sin(2 * a + ph[2])))
            for a in [i / n * math.tau for i in range(n)]]


def personnage(pos, couleur='#3d8bff', rz=0.0, pose='debout', echelle=0.16):
    """Petit personnage stylisé (corps, tête, bras) ; pose 'grimpe' = bras levés."""
    objs = []
    x, y, z = pos
    e = echelle
    corps = cyl(0.11 * e, 0.42 * e, (x, y, z + 0.4 * e), mat(couleur, 0.7), n=10, r2=0.08 * e)
    tete = sphere(0.09 * e, (x, y, z + 0.92 * e), mat('#f1c27d', 0.6), n=10)
    jambes = cyl(0.08 * e, 0.4 * e, (x, y, z), mat('#2b2d42', 0.8), n=8)
    objs += [corps, tete, jambes]
    for s in (-1, 1):
        a = math.radians(rz)
        bx, by = x + math.cos(a) * s * 0.12 * e, y + math.sin(a) * s * 0.12 * e
        if pose == 'grimpe':
            objs.append(cyl(0.03 * e, 0.4 * e, (bx, by, z + 0.75 * e), mat('#f1c27d', 0.6), n=6))
        else:
            objs.append(cyl(0.03 * e, 0.35 * e, (bx, by, z + 0.45 * e), mat('#f1c27d', 0.6), n=6))
    return objs


def palmier(x, y, h=1.0, seed=1):
    rnd = random.Random(seed)
    objs = []
    pts = []
    pen = rnd.uniform(-0.15, 0.15)
    for i in range(8):
        t = i / 7
        pts.append(Vector((x + pen * t * t * h, y + pen * 0.6 * t * t * h, t * h)))
    for a, b in zip(pts, pts[1:]):
        c = Charpente(); c.poutre(a, b, 0.05 * h + 0.02, 0.05 * h + 0.02)
        objs.append(c.objet('tronc', mat('#8d6a48', 0.9)))
    top = pts[-1]
    for k in range(7):
        a = k / 7 * math.tau + rnd.uniform(-0.2, 0.2)
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.09 * h, radius2=0.0, depth=0.55 * h)
        f = bpy.context.active_object
        f.scale = (1, 0.25, 1)
        f.rotation_euler = (0, math.radians(110), a)
        f.location = (top.x + math.cos(a) * 0.22 * h, top.y + math.sin(a) * 0.22 * h, top.z - 0.02)
        objs.append(_fini(f, mat('#3f9b4a', 0.8)))
    return objs


# ---------- Maisons ----------
def b_maison_bleue():
    o = maison(0.1, 0.45, 2, 1, 2, 'bleu', seed=101)
    o += chemin([porte(0.1, 0.45, 2, 1), (-0.25, -0.3), (-0.7, -0.75), (-0.9, -1.2), (-0.85, -1.5)], seed=101)[0]
    o += bordure('hedge', '+y') + bordure('hedge', '+x', sauf=(1, 2))
    o += deco('tree-high-round', -1.05, 1.0, s=0.85) + deco('tree', 1.1, 1.05, s=0.75)
    o += deco('stall-bench', 0.65, -0.55, s=0.75) + deco('lantern', -0.45, -0.15, s=0.7)
    o += deco('planter', 0.45, 0.0, kit=SUB, s=1.4) + deco('tree-small', 1.05, -1.0, kit=SUB, s=1.4)
    o += fleurs(0.45, -0.05, 0.4, 0.12, 7, 102) + fleurs(-1.0, 0.1, 0.4, 0.6, 12, 103, ['#3d8bff', '#ffffff', '#ffd23f'])
    o += fleurs(0.3, -1.1, 0.7, 0.3, 10, 104)
    return o


def b_chalet():
    o = maison(0.15, 0.45, 2, 2, 2, 'chalet', seed=111, kz=0.38,
               rdc=['wall-wood-window-shutters', 'wall-wood', 'wall-wood-window-small'],
               etage=['balcony-wall', 'wall-wood-window-shutters', 'wall-wood-detail-cross'],
               porte_piece='wall-wood-door', toit='gable', toit_z=1.0)
    o += chemin([porte(0.15, 0.45, 2, 2), (0.4, -0.45), (0.95, -0.7), (1.5, -0.75)], seed=111)[0]
    # tas de bûches
    for i in range(9):
        r, z = i % 3, i // 3
        o.append(cyl(0.035, 0.32, (-0.7, -0.15 - r * 0.075 + z * 0.035, 0.035 + z * 0.065), mat('#9a6a3f'), n=8, rot=(0, math.radians(90), 0)))
    for x, y, s in ((-1.1, 1.0, 0.9), (-0.6, 1.2, 0.7), (1.1, 1.1, 0.85), (-1.15, -0.9, 0.75), (1.15, 0.3, 0.6)):
        o += deco('tree', x, y, s=s)
    o += [rocher((0.8, -1.15, 0), (0.18, 0.14, 0.12), seed=112), rocher((-0.3, -1.2, 0), (0.12, 0.1, 0.08), seed=113)]
    o += deco('stall-bench', -0.55, -0.75, s=0.7) + fleurs(0.6, -0.2, 0.5, 0.12, 6, 114, ['#ff6fa3', '#e8443a'])
    return o


def b_immeuble():
    o = maison(0.1, 0.4, 3, 2, 4, 'orange', seed=121, kz=0.4)
    o += chemin([porte(0.1, 0.4, 3, 2), (0.1, -0.6), (-0.2, -1.1), (-0.15, -1.5)], larg=0.3, seed=121)[0]
    o += bordure('hedge', '-x', sauf=(4, 5)) + bordure('hedge', '+y')
    o += deco('tree-high-round', 1.1, 1.1, s=0.8) + deco('tree-high-round', -1.1, 1.1, s=0.8)
    o += deco('stall-bench', 0.8, -0.7, s=0.8) + deco('lantern', -0.55, -0.6, s=0.75) + deco('lantern', 0.6, -1.2, s=0.75)
    o += fleurs(-0.7, -0.15, 0.6, 0.15, 9, 122) + fleurs(0.85, -0.15, 0.5, 0.15, 8, 123) + fleurs(-1.0, -1.0, 0.4, 0.4, 8, 124)
    return o


def b_villa():
    o = maison(-0.2, 0.55, 3, 2, 2, 'villa', seed=131, toit='gable', toit_z=0.7,
               rdc=['wall-window-glass', 'wall-window-shutters', 'wall-window-glass'])
    # piscine avec margelle
    o.append(pave((1.2, 0.7, 0.04), (0.55, -0.75, 0.02), mat('#efe6d6')))
    o.append(pave((1.05, 0.55, 0.02), (0.55, -0.75, 0.035), mat_eau()))
    o += deco('detail-parasol-a', -0.35, -0.8, kit=os.path.join(ICI, 'kits', 'city-kit-commercial', 'Models', 'GLB format'), s=1.6)
    for x in (-0.65, -0.05):
        o.append(pave((0.12, 0.3, 0.04), (x, -1.2, 0.04), mat('#ffffff')))
    o += chemin([porte(-0.2, 0.55, 3, 2), (-0.55, -0.1), (-1.0, -0.2), (-1.5, -0.2)], seed=131)[0]
    o += bordure('hedge', '+y') + bordure('hedge', '+x')
    for x, y in ((-1.15, 1.15), (1.1, 1.1), (1.15, 0.2)):
        o += deco('tree-high-round', x, y, s=0.75)
    o += fleurs(0.3, 0.05, 0.6, 0.12, 8, 132) + fleurs(-1.1, -1.0, 0.5, 0.5, 10, 133)
    return o


def b_gratte_ciel():
    """Grande tour d'habitation (2 × 2) : pierre et verre, 8 étages, toit d'ardoise."""
    o = maison(0, 0.2, 4, 3, 8, 'ville', seed=141, kz=0.45, toit_z=0.9,
               rdc=['wall-window-glass', 'wall-doorway-square-wide', 'wall-window-glass'],
               etage=['wall-window-glass', 'wall-window-glass', 'wall-window-round', 'wall-detail-cross'],
               porte_piece='wall-doorway-round')
    o.append(dalle(3.2, 1.6, mat_paves(), 0.012, 0.03, 0, -1.25))
    o += chemin([(0.0, -2.0), (-0.3, -2.6), (-0.2, -3.3)], larg=0.4, seed=141)[0]
    for x in (-1.3, -0.65, 0.65, 1.3):
        o += deco('lantern', x, -1.9, s=0.8)
    for x, y in ((-2.6, 2.6), (2.6, 2.6), (-2.7, -2.6), (2.6, -2.6), (-2.6, 0.0), (2.7, 0.2)):
        o += deco('tree-high-round', x, y, s=0.85)
    o += deco('fountain-round', 1.9, -1.4, s=0.7) + deco('stall-bench', -1.9, -1.3, rot=90, s=0.8)
    o += fleurs(-1.6, -2.4, 1.0, 0.5, 14, 142) + fleurs(1.5, -2.5, 1.0, 0.4, 12, 143)
    o += bordure_n('hedge', '+y', 2) + bordure_n('hedge', '-x', 2, sauf=(4, 5, 6))
    return o


# ---------- Commerces ----------
def auvent(x0, x1, y, z, couleur, rayures='#ffffff'):
    """Auvent rayé au-dessus d'une vitrine (façade -y)."""
    objs = []
    n = max(2, round((x1 - x0) / 0.08))
    for i in range(n):
        xa = x0 + (x1 - x0) * (i + 0.5) / n
        c = couleur if i % 2 == 0 else rayures
        p = pave(((x1 - x0) / n, 0.2, 0.012), (xa, y - 0.09, z), mat(c, 0.7))
        p.rotation_euler = (math.radians(-22), 0, 0)
        objs.append(p)
    return objs


def b_boulangerie():
    o = maison(0.05, 0.45, 2, 1, 2, 'boulange', seed=151,
               rdc=['wall-window-glass'], porte_piece='wall-door')
    o += auvent(-0.45, 0.55, 0.2, 0.33, '#b5651d', '#f6e7c8')
    o += deco('banner-red', 0.3, 0.18, z=0.45, rot=270, s=0.6)
    # pains dans une charrette, tables
    o += deco('cart', 0.85, -0.55, rot=20, s=0.6)
    for i in range(7):
        o.append(sphere(0.035, (0.85 + (i % 4 - 1.5) * 0.05, -0.55 + (i // 4) * 0.05, 0.19), mat('#c8873e', 0.7), sc=(1.6, 0.8, 0.7), n=8))
    o += deco('stall-bench', -0.7, -0.6, s=0.7) + deco('stall-stool', -0.45, -0.6, s=0.7)
    o += chemin([porte(0.05, 0.45, 2, 1), (-0.05, -0.4), (0.15, -0.95), (0.05, -1.5)], larg=0.32, seed=151)[0]
    o += bordure('hedge', '-x', sauf=(1, 2)) + bordure('hedge', '+y')
    o += deco('tree-high-round', -1.1, 1.05, s=0.8) + deco('tree', 1.1, 1.05, s=0.75)
    o += fleurs(-0.6, 0.1, 0.5, 0.12, 7, 152) + fleurs(0.9, -1.15, 0.5, 0.3, 8, 153)
    return o


def b_cafe():
    o = maison(0.1, 0.5, 2, 1, 2, 'cafe', seed=161, rdc=['wall-window-glass'])
    o += auvent(-0.4, 0.6, 0.25, 0.33, '#e63946', '#ffffff')
    o.append(dalle(1.9, 0.9, mat_paves(), 0.012, 0.03, 0.05, -0.35))
    com = os.path.join(ICI, 'kits', 'city-kit-commercial', 'Models', 'GLB format')
    for x, y in ((-0.6, -0.4), (0.15, -0.55), (0.75, -0.3)):
        o += deco('detail-parasol-a' if x < 0 else 'detail-parasol-b', x, y, kit=com, s=1.5)
        o += deco('stall-stool', x + 0.16, y, s=0.65) + deco('stall-stool', x - 0.16, y, s=0.65)
    o += chemin([(0.05, -0.8), (-0.1, -1.2), (0.0, -1.5)], larg=0.3, seed=161)[0]
    o += bordure('hedge', '+y') + bordure('hedge', '-x', sauf=(2, 3))
    o += deco('tree-high-round', -1.1, 1.05, s=0.8) + deco('tree-high-round', 1.1, 1.0, s=0.75)
    o += fleurs(-1.0, -1.0, 0.5, 0.5, 10, 162) + fleurs(1.0, -1.0, 0.5, 0.5, 10, 163)
    return o


def b_marche():
    o = []
    o.append(dalle(2.4, 2.0, mat_paves(), 0.012, 0.03, 0, 0.1))
    for (x, y, nom, r) in ((-0.7, 0.6, 'stall-red', 0), (0.6, 0.6, 'stall-green', 0), (-0.75, -0.45, 'stall', 90), (0.7, -0.5, 'stall-red', 90)):
        o += deco(nom, x, y, rot=r, s=1.0)
    rnd = random.Random(171)
    for (x, y) in ((-0.7, 0.45), (0.6, 0.45), (-0.6, -0.45), (0.55, -0.5)):
        coul = rnd.choice(['#e0322b', '#ff8c1a', '#ffd23f', '#5aa83a'])
        for i in range(8):
            o.append(sphere(0.03, (x + (i % 4 - 1.5) * 0.06, y + (i // 4) * 0.06 - 0.03, 0.27), mat(coul, 0.6), n=8))
    o += deco('cart', 0.0, -1.05, rot=10, s=0.6) + deco('lantern', -1.2, -1.2, s=0.75) + deco('lantern', 1.2, -1.2, s=0.75)
    o += deco('tree-high-round', -1.2, 1.2, s=0.7) + deco('tree-high-round', 1.2, 1.2, s=0.7)
    o += fleurs(-1.2, -0.4, 0.2, 0.6, 6, 172) + fleurs(1.2, -0.4, 0.2, 0.6, 6, 173)
    return o


def b_magasin_sport():
    o = maison(0.0, 0.6, 5, 2, 2, 'sport', seed=181, kz=0.5,
               rdc=['wall-window-glass'], etage=['wall-window-round', 'wall-detail-cross'], porte_piece='wall-doorway-square-wide')
    o += auvent(-1.25, 1.25, 0.1, 0.42, '#f0782d', '#2b2d42')
    o += mur_escalade(-1.6, -0.6, 0.7, 1.0, 8, '#2f8f8a', seed=182)
    o.append(boite('tapis', (0.9, 0.45, 0.06), (-1.6, -0.95, 0.03), '#2f5fbf'))
    o.append(dalle(3.4, 1.2, mat_paves(), 0.012, 0.03, 0.3, -0.6))
    # vélos stylisés : deux roues + cadre
    for i, x in enumerate((0.6, 0.9, 1.2)):
        for dx in (-0.08, 0.08):
            o.append(cyl(0.06, 0.012, (x + dx, -0.85, 0.06), mat('#2b2d42'), n=12, rot=(math.radians(90), 0, 0)))
        o.append(pave((0.17, 0.015, 0.015), (x, -0.85, 0.09), mat(['#f0782d', '#3d8bff', '#2fbf71'][i], 0.5)))
    o += chemin([(0.3, -1.2), (0.1, -2.0), (0.3, -2.7), (0.2, -3.3)], larg=0.4, seed=181)[0]
    for x, y in ((-2.6, 2.6), (2.6, 2.6), (-2.6, -2.6), (2.6, -2.6), (2.6, -0.6)):
        o += deco('tree-high-round', x, y, s=0.85)
    o += deco('lantern', -0.6, -1.4, s=0.8) + deco('lantern', 1.2, -1.4, s=0.8)
    o += fleurs(-1.6, -2.3, 1.0, 0.6, 14, 183) + fleurs(1.7, -2.3, 1.0, 0.6, 14, 184)
    o += bordure_n('hedge', '+y', 2) + bordure_n('hedge', '-x', 2, sauf=(5, 6))
    return o


# ---------- Parcs & nature ----------
def b_arbre():
    o = []
    a = piece('tree-high-round', 0.1, 0.15, 0, 30, None, (K * 1.5, K * 1.5, K * 1.15))
    o += a
    o += deco('stall-bench', 0.1, -0.55, s=0.8)
    o += chemin([(0.1, -0.75), (-0.3, -1.1), (-0.2, -1.5)], larg=0.24, seed=191)[0]
    o += deco('tree-small', -0.8, 0.6, kit=SUB, s=1.6) + deco('tree-small', 0.9, 0.7, kit=SUB, s=1.4)
    o += fleurs(0.1, 0.15, 1.6, 1.4, 22, 192) + fleurs(-1.0, -1.0, 0.5, 0.4, 8, 193)
    o += [rocher((0.95, -0.9, 0), (0.16, 0.13, 0.1), seed=194)]
    return o


def b_sapin():
    o = []
    rnd = random.Random(201)
    for x, y, s in ((0.0, 0.25, 1.35), (-0.75, 0.75, 1.0), (0.8, 0.6, 1.1), (-0.85, -0.45, 0.9), (0.7, -0.6, 0.8), (-0.2, 1.15, 0.8)):
        o += deco('tree', x, y, rot=rnd.uniform(0, 360), s=s)
    o += [rocher((0.25, -0.95, 0), (0.25, 0.2, 0.16), seed=202), rocher((-0.3, -1.1, 0), (0.15, 0.12, 0.1), seed=203)]
    o += fleurs(-0.2, -0.6, 0.6, 0.3, 6, 204, ['#ffffff', '#b07cff'])
    return o


def b_jardin():
    o = []
    # massifs en rond + allées en croix + petite pergola
    o.append(dalle(0.3, 3.0, mat_paves(), 0.012, 0.03))
    o.append(dalle(3.0, 0.3, mat_paves(), 0.012, 0.03))
    for i, (x, y) in enumerate(((-0.8, -0.8), (0.8, -0.8), (-0.8, 0.8), (0.8, 0.8))):
        o += fleurs(x, y, 1.0, 1.0, 36, 210 + i, [FLEURS[i], FLEURS[(i + 2) % 6], '#ffffff'])
        o += bordure_coin(x, y)
    o += deco('fountain-round', 0, 0, s=0.5)
    for x, y in ((-1.3, -1.3), (1.3, 1.3), (-1.3, 1.3), (1.3, -1.3)):
        o += deco('tree-high-round', x, y, s=0.6)
    o += deco('stall-bench', 0.55, -0.32, s=0.7) + deco('stall-bench', -0.55, 0.32, s=0.7)
    return o


def bordure_coin(x, y):
    """Petite haie basse en L autour d'un massif."""
    o = []
    for t in (-0.3, 0.0, 0.3):
        o += piece('hedge', x + t, y - 0.5 * (1 if y > 0 else -1), 0, 90 if y > 0 else 270, None, (0.3, 0.3, 0.3))
    return o


def b_lac():
    o = []
    bord = contour_organique(0.1, 0.0, 2.2, 1.9, seed=221, ampl=0.12)
    o.append(forme_plane([(x * 1.06, y * 1.06) for x, y in bord], 0.006, mat_sable(), 'rive'))
    o.append(forme_plane(bord, 0.012, mat_eau(), 'lac'))
    # ponton en bois
    o.append(pave((0.3, 1.1, 0.04), (1.6, -1.2, 0.06), mat('#a57650')))
    for dx in (-0.12, 0.12):
        for dy in (-0.6, -0.1, 0.35):
            o.append(cyl(0.02, 0.12, (1.6 + dx, -1.2 + dy, 0.0), mat('#6b4029'), n=6))
    # barque, roseaux, rochers, arbres
    o.append(sphere(0.25, (0.6, 0.3, 0.03), mat('#a0522d', 0.7), sc=(1.0, 0.4, 0.25), n=12))
    rnd = random.Random(222)
    for i in range(40):
        a = rnd.uniform(0, math.tau)
        x, y = 0.1 + math.cos(a) * 2.15, math.sin(a) * 1.85
        o.append(cyl(0.006, rnd.uniform(0.1, 0.2), (x, y, 0), mat('#5d8a3a'), n=4, lisse=False))
    for i, (x, y) in enumerate(((-2.4, 1.6), (2.3, 1.9), (-2.5, -1.8), (2.6, 0.2), (-0.8, 2.4))):
        o += deco('tree-high-round', x, y, s=0.9)
        o.append(rocher((x * 0.85, y * 0.85, 0), (0.2, 0.16, 0.12), seed=230 + i))
    o += deco('stall-bench', -2.2, -0.2, rot=90, s=0.8) + deco('lantern', -2.4, 0.4, s=0.8)
    o += fleurs(-1.9, -2.5, 1.0, 0.5, 12, 223) + fleurs(2.2, 2.6, 0.8, 0.4, 10, 224)
    return o


def b_fontaine():
    o = [dalle(2.4, 2.4, mat_paves(), 0.012, 0.03)]
    o += deco('fountain-round', 0, 0, s=1.4) + deco('fountain-center', 0, 0, s=1.0)
    for a in range(4):
        x, y = math.cos(a * math.pi / 2 + math.pi / 4) * 1.0, math.sin(a * math.pi / 2 + math.pi / 4) * 1.0
        o += deco('lantern', x, y, s=0.8)
    o += deco('stall-bench', 0, -1.0, s=0.8) + deco('stall-bench', 1.0, 0, rot=90, s=0.8)
    for x, y in ((-1.3, -1.3), (1.3, 1.3), (-1.3, 1.3), (1.3, -1.3)):
        o += deco('tree-high-round', x, y, s=0.6)
    o += fleurs(0, -1.3, 1.6, 0.2, 10, 241) + fleurs(-1.3, 0, 0.2, 1.6, 10, 242)
    return o


def b_kiosque():
    """Kiosque à musique : socle octogonal, colonnettes, toit en pavillon, guirlande."""
    o = []
    R = 0.65
    o.append(cyl(R + 0.08, 0.16, (0, 0, 0), mat_pierre('Socle', '#e9dcc4', '#b8a888', (0.25, 0.08)), n=8, lisse=False))
    o.append(cyl(R + 0.1, 0.03, (0, 0, 0.16), mat('#ffffff'), n=8, lisse=False))
    pts = []
    for k in range(8):
        a = k / 8 * math.tau + math.pi / 8
        x, y = math.cos(a) * R, math.sin(a) * R
        o.append(cyl(0.025, 0.6, (x, y, 0.19), mat('#ffffff', 0.5), n=8))
        pts.append((x * 1.02, y * 1.02, 0.74))
    pts.append(pts[0])
    o.append(cyl(R + 0.12, 0.06, (0, 0, 0.78), mat('#2a9d8f', 0.6), n=8, lisse=False))
    o.append(cyl(R + 0.14, 0.45, (0, 0, 0.84), mat('#2a9d8f', 0.6), n=8, r2=0.05, lisse=False))
    o.append(sphere(0.05, (0, 0, 1.32), mat('#e9c46a', 0.3, 0.8)))
    o += guirlande(pts, 40)
    for i in range(4):
        a = i / 4 * math.tau
        o += personnage((math.cos(a) * 0.3, math.sin(a) * 0.3, 0.19), ['#e63946', '#3d8bff', '#ffd23f', '#2fbf71'][i], echelle=0.18)
    o += chemin([(0, -0.8), (0.2, -1.2), (0.1, -1.5)], larg=0.3, seed=251)[0]
    for x, y in ((-1.2, 1.2), (1.2, 1.2), (-1.2, -1.1), (1.2, -1.1)):
        o += deco('tree-high-round', x, y, s=0.6)
    o += fleurs(0, 0, 2.4, 2.4, 20, 252)
    return o


# ---------- Escalade ----------
def b_bloc():
    o = []
    r = [rocher((0, 0.2, 0), (0.75, 0.6, 0.55), seed=261), rocher((0.5, 0.55, 0), (0.45, 0.4, 0.35), seed=262)]
    o += r
    o += prises_sur(r, 40, seed=263, zmin=0.05)
    o.append(boite('tapis', (1.0, 0.5, 0.07), (-0.05, -0.65, 0.035), '#ff7a3d'))
    o.append(boite('tapis2', (0.5, 0.5, 0.07), (0.75, -0.2, 0.035), '#2f5fbf'))
    o += personnage((-0.3, -0.55, 0.07), '#3d8bff', pose='grimpe', echelle=0.2)
    o += deco('tree-high-round', -1.1, 1.1, s=0.7) + deco('tree', 1.15, 1.05, s=0.6)
    o += fleurs(-1.0, -1.0, 0.6, 0.6, 10, 264) + deco('stall-bench', 0.9, -1.1, s=0.7)
    return o


def b_mur():
    o = []
    o += mur_escalade(-0.45, 0.2, 0.9, 2.0, 12, '#5c677d', seed=271, n=50)
    o += mur_escalade(0.55, 0.2, 0.9, 1.7, 0, '#e9c08a', seed=272, n=42)
    o.append(boite('tapis', (2.1, 0.7, 0.08), (0.05, -0.4, 0.04), '#2f5fbf'))
    o += personnage((0.4, 0.08, 0.7), '#ffca3a', pose='grimpe', echelle=0.2)
    o += personnage((-0.2, -0.75, 0.08), '#e63946', echelle=0.2)
    o += deco('tree-high-round', -1.15, 1.15, s=0.7) + deco('tree-high-round', 1.15, 1.15, s=0.7)
    o += deco('stall-bench', 0.8, -1.1, s=0.7) + fleurs(-1.0, -1.0, 0.6, 0.5, 10, 273)
    return o


def b_refuge():
    o = maison(0.1, 0.5, 2, 1, 1, 'refuge', seed=281, kz=0.42,
               rdc=['wall-window-stone', 'wall-window-small'], porte_piece='wall-wood-door', toit_z=1.2)
    for i, (x, y, s) in enumerate(((-1.0, 0.9, 0.35), (1.0, 1.0, 0.3), (-1.1, -0.6, 0.25), (0.9, -0.9, 0.3), (0.4, 1.2, 0.22))):
        o.append(rocher((x, y, 0), (s, s * 0.8, s * 0.7), seed=282 + i))
    for x, y in ((-0.5, 1.2), (1.2, 0.3), (-1.2, 0.2)):
        o += deco('tree', x, y, s=0.75)
    for i in range(6):
        o.append(cyl(0.03, 0.3, (0.75, -0.2 - i * 0.06, 0.03), mat('#9a6a3f'), n=8, rot=(0, math.radians(90), 0)))
    o += chemin([porte(0.1, 0.5, 2, 1), (-0.2, -0.4), (0.1, -1.0), (-0.1, -1.5)], larg=0.22, seed=281)[0]
    o += deco('stall-bench', -0.5, -0.1, s=0.7) + fleurs(0.5, -1.2, 0.5, 0.3, 6, 288, ['#ffffff', '#b07cff'])
    return o


def b_falaise():
    """Falaise (2 × 2) : grande paroi rocheuse ocre, voies équipées, cordes, sommet boisé."""
    o, r = [], []
    rnd = random.Random(301)
    for i in range(9):
        x = -2.4 + i * 0.6 + rnd.uniform(-0.1, 0.1)
        h = rnd.uniform(1.5, 2.3)
        r.append(rocher((x, 1.4 + rnd.uniform(-0.2, 0.3), 0), (0.55, 0.7, h), '#b08968', seed=302 + i, rugo=0.18))
    for i in range(6):
        r.append(rocher((-2.2 + i * 0.9, 0.9, 0), (0.45, 0.35, rnd.uniform(0.4, 0.8)), '#a37b5c', seed=320 + i))
    o += r
    o += prises_sur(r, 120, seed=330, zmin=0.1)
    # cordes : depuis le haut jusqu'au pied
    for i, x in enumerate((-1.5, 0.0, 1.4)):
        cu = bpy.data.curves.new('corde', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.008
        sp = cu.splines.new('POLY'); sp.points.add(1)
        sp.points[0].co = (x, 0.6, 2.4, 1); sp.points[1].co = (x - 0.1, 0.1, 0.02, 1)
        c = bpy.data.objects.new('corde', cu); c.data.materials.append(mat(['#ff006e', '#3d8bff', '#ffca3a'][i])); bpy.context.scene.collection.objects.link(c)
        o.append(c)
        o += personnage((x - 0.03, 0.5, 0.9 + i * 0.35), ['#e63946', '#2fbf71', '#3d8bff'][i], pose='grimpe', echelle=0.18)
    for x in (-2.3, -1.1, 0.4, 1.8):
        o += deco('tree', x, 2.2 + rnd.uniform(-0.2, 0.2), z=1.8, s=0.7)
    o += [boite('tapis', (0.8, 0.4, 0.06), (x, -0.1, 0.03), c) for x, c in ((-1.4, '#ff7a3d'), (0.1, '#2f5fbf'), (1.5, '#ff7a3d'))]
    o += chemin([(0.0, -0.4), (0.4, -1.4), (0.1, -2.4), (0.3, -3.3)], larg=0.3, seed=331)[0]
    for x, y in ((-2.6, -2.5), (2.6, -2.4), (-2.5, -0.9), (2.6, -0.8)):
        o += deco('tree-high-round', x, y, s=0.8)
    o += deco('stall-bench', -1.0, -1.2, s=0.8) + fleurs(1.6, -2.0, 1.0, 0.8, 14, 332) + fleurs(-1.6, -2.3, 0.8, 0.6, 10, 333)
    return o


def b_arche():
    """Arche de pierre naturelle (2 × 2)."""
    o = []
    # deux piliers + voûte faite de rochers en arc
    n = 19
    for i in range(n):
        t = i / (n - 1)
        a = math.pi * t
        x, z = -1.75 * math.cos(a), 2.5 * math.sin(a)
        s = 0.62 - 0.22 * math.sin(a)
        o.append(rocher((x, 0.45, z - 0.3 * s), (s, 0.6, s), '#c08552', seed=340 + i, rugo=0.14))
    for i, x in enumerate((-1.95, 1.95)):
        o.append(rocher((x, 0.5, 0), (0.8, 0.75, 0.9), '#b07448', seed=360 + i))
        o.append(rocher((x * 1.1, 0.0, 0), (0.45, 0.4, 0.35), '#a86d44', seed=365 + i))
    o += prises_sur(o, 50, seed=362, zmin=0.1)
    o += chemin([(0.0, 1.8), (0.1, 0.4), (-0.2, -1.0), (0.1, -2.2), (0.0, -3.3)], larg=0.35, seed=363)[0]
    for x, y in ((-2.4, 2.4), (2.4, 2.5), (-2.5, -2.3), (2.5, -2.2), (2.6, 0.2)):
        o += deco('tree', x, y, s=0.8)
    o += personnage((0.9, 0.0, 1.9), '#e63946', pose='grimpe', echelle=0.2)
    o += fleurs(-1.5, -1.5, 1.2, 1.0, 16, 364) + fleurs(1.5, -1.4, 1.0, 0.8, 12, 365)
    return o


# ---------- Monuments ----------
def b_statue():
    """Statue du grimpeur : bronze sur un socle de pierre, grimpeur accroché à un rocher."""
    o = [dalle(1.6, 1.6, mat_paves(), 0.012, 0.03)]
    pierre = mat_pierre('Socle2', '#ddd0b8', '#ab9c80', (0.22, 0.1))
    o.append(pave((0.75, 0.75, 0.12), (0, 0.05, 0.06), pierre))
    o.append(pave((0.6, 0.6, 0.45), (0, 0.05, 0.345), pierre))
    o.append(pave((0.68, 0.68, 0.06), (0, 0.05, 0.6), pierre))
    bronze = mat('#a0703a', 0.35, 0.85)
    roc = rocher((0, 0.14, 0.63), (0.22, 0.16, 0.62), '#7d6a52', seed=401, rugo=0.1)
    roc.data.materials[0] = bronze
    o.append(roc)
    # grimpeur en bronze accroché à la face avant du rocher : un bras tendu vers la prise du haut
    ch = Charpente()
    P = {'tete': (0.0, -0.27, 1.3), 'cou': (0.0, -0.25, 1.2), 'epG': (-0.08, -0.25, 1.17), 'epD': (0.08, -0.25, 1.17),
         'bassin': (0.0, -0.27, 0.95), 'mainG': (-0.07, -0.16, 1.5), 'coudeG': (-0.1, -0.22, 1.33), 'mainD': (0.17, -0.17, 1.05),
         'coudeD': (0.15, -0.26, 1.1), 'genouG': (-0.1, -0.33, 0.85), 'piedG': (-0.11, -0.18, 0.74),
         'genouD': (0.11, -0.32, 0.93), 'piedD': (0.13, -0.18, 0.9)}
    ancre = Vector((0.0, -0.16, 0.63))
    P = {k: tuple(ancre + (Vector(v) - ancre) * 1.3) for k, v in P.items()}
    V = {k: Vector(v) for k, v in P.items()}
    ch.poutre(V['cou'], V['bassin'], 0.15, 0.11)
    for a, b, w in (('epG', 'coudeG', 0.04), ('coudeG', 'mainG', 0.035), ('epD', 'coudeD', 0.04), ('coudeD', 'mainD', 0.035),
                    ('bassin', 'genouG', 0.05), ('genouG', 'piedG', 0.045), ('bassin', 'genouD', 0.05), ('genouD', 'piedD', 0.045),
                    ('epG', 'epD', 0.05)):
        ch.poutre(V[a], V[b], w)
    o.append(ch.objet('grimpeur', bronze))
    o.append(sphere(0.07, P['tete'], bronze, n=12))
    o += prises([tuple(V['mainG'] + Vector((0, 0.03, 0.03))), tuple(V['mainD'] + Vector((0.01, 0.03, -0.02)))], seed=404, r=(0.035, 0.035))
    o.append(pave((0.3, 0.01, 0.07), (0, -0.25, 0.4), mat('#c9a227', 0.3, 0.9)))  # plaque
    for a in range(4):
        ang = a * math.pi / 2 + math.pi / 4
        o += deco('lantern', math.cos(ang) * 0.95, math.sin(ang) * 0.95, s=0.75)
    o += chemin([(0, -0.8), (-0.2, -1.2), (0, -1.5)], larg=0.3, seed=402)[0]
    o += fleurs(0, 0.05, 1.0, 1.0, 14, 403) + deco('tree-high-round', -1.15, 1.15, s=0.7) + deco('tree-high-round', 1.15, 1.15, s=0.7)
    return o


def cadran(pos, normale, r=0.2):
    """Cadran d'horloge (disque blanc, cerclage doré, aiguilles) orienté selon la normale (vers -y ou +x)."""
    objs = []
    rot = (math.radians(90), 0, 0) if normale == '-y' else (0, math.radians(90), 0)
    x, y, z = pos
    off = Vector((0, -1, 0)) if normale == '-y' else Vector((1, 0, 0))
    objs.append(cyl(r + 0.03, 0.03, (x, y, z), mat('#c9a227', 0.3, 0.9), n=24, rot=rot))
    p = Vector(pos) + off * 0.012
    objs.append(cyl(r, 0.03, tuple(p), mat('#fbf6e8', 0.5), n=24, rot=rot))
    p2 = Vector(pos) + off * 0.03
    for ang, l in ((math.radians(60), 0.75 * r), (math.radians(-80), 0.55 * r)):
        if normale == '-y':
            a = Vector((math.sin(ang) * l, 0, math.cos(ang) * l))
        else:
            a = Vector((0, math.sin(ang) * l, math.cos(ang) * l))
        c = Charpente(); c.poutre(p2, p2 + a, 0.02, 0.008); objs.append(c.objet('aiguille', mat('#1d1d1d')))
    return objs


def b_tour_horloge():
    o = maison(0.0, 0.25, 2, 2, 6, 'horloge', seed=411, kz=0.5, cheminee=False,
               rdc=['wall-window-stone'], etage=['wall-window-round', 'wall-detail-cross', 'wall-window-shutters'],
               porte_piece='wall-doorway-round', toit_z=2.6)
    zc = 2.55
    o += cadran((0.0, 0.25 - 0.5 - 0.06, zc), '-y', 0.24) + cadran((0.5 + 0.06, 0.25, zc), '+x', 0.24)
    o += chemin([(-0.25, -0.3), (-0.1, -0.8), (-0.3, -1.5)], larg=0.3, seed=412)[0]
    o += deco('lantern', -0.7, -0.6, s=0.8) + deco('lantern', 0.7, -0.6, s=0.8) + deco('stall-bench', 0.75, -1.05, s=0.75)
    o += deco('tree-high-round', -1.1, 1.1, s=0.75) + deco('tree-high-round', 1.1, 1.1, s=0.75)
    o += fleurs(-0.9, -0.2, 0.5, 0.6, 10, 413) + fleurs(0.95, -0.3, 0.4, 0.5, 8, 414) + bordure('hedge', '+y')
    return o


def b_phare():
    o = []
    for i in range(6):
        o.append(rocher(((i % 3 - 1) * 0.55, (i // 3 - 0.5) * 0.6 + 0.2, 0), (0.45, 0.4, 0.3), '#8c8577', seed=421 + i))
    H, r0, r1 = 3.0, 0.42, 0.28
    n = 7
    for i in range(n):
        za, zb = 0.25 + H * i / n, 0.25 + H * (i + 1) / n
        ra, rb = r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n
        o.append(cyl(ra, zb - za, (0, 0.2, za), mat('#e63946' if i % 2 else '#fbf8f2', 0.5), n=24, r2=rb))
    zt = 0.25 + H
    o.append(cyl(r1 + 0.12, 0.05, (0, 0.2, zt), mat('#2b2d42', 0.5, 0.5), n=24))
    pts = [(math.cos(a) * (r1 + 0.1), 0.2 + math.sin(a) * (r1 + 0.1), zt + 0.13) for a in [i / 24 * math.tau for i in range(25)]]
    c = Charpente(); c.polyligne([Vector(p) for p in pts], 0.012)
    for p in pts[::2]:
        c.poutre((p[0], p[1], zt + 0.05), p, 0.01)
    o.append(c.objet('rambarde', mat('#2b2d42', 0.5, 0.5)))
    feu = cyl(r1 * 0.75, 0.32, (0, 0.2, zt + 0.05), mat('#ffe7a3', 0.2, 0, 6.0), n=16)
    feu.name = 'feu-phare'
    o.append(feu)
    for k in range(8):
        a = k / 8 * math.tau
        o.append(cyl(0.012, 0.32, (math.cos(a) * r1 * 0.77, 0.2 + math.sin(a) * r1 * 0.77, zt + 0.05), mat('#2b2d42'), n=6))
    o.append(cyl(r1 * 0.95, 0.3, (0, 0.2, zt + 0.37), mat('#e63946', 0.5), n=16, r2=0.02))
    o.append(sphere(0.04, (0, 0.2, zt + 0.7), mat('#2b2d42', 0.4, 0.6)))
    o += maison(0.95, -0.5, 1, 1, 1, 'blanc', seed=422, cheminee=True)
    o += chemin([porte(0.95, -0.5, 1, 1), (0.6, -1.0), (0.7, -1.5)], larg=0.22, seed=423)[0]
    o += fleurs(-0.8, -0.9, 0.6, 0.5, 8, 424, ['#ffffff', '#ffd23f']) + deco('tree', -1.15, 1.15, s=0.6)
    return o


def mat_tuf():
    """Tuf volcanique monolithique : teinte irrégulière, petites cavités (pas d'appareillage de blocs)."""
    m = bpy.data.materials.get('Tuf')
    if m:
        return m
    m = bpy.data.materials.new('Tuf')
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF'); b.inputs['Roughness'].default_value = 0.95
    geo = N.new('ShaderNodeNewGeometry')
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 9; nz.inputs['Detail'].default_value = 6
    L.new(geo.outputs['Position'], nz.inputs['Vector'])
    r = N.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].color = (0.2, 0.18, 0.15, 1); r.color_ramp.elements[0].position = 0.35
    r.color_ramp.elements[1].color = (0.32, 0.29, 0.25, 1); r.color_ramp.elements[1].position = 0.7
    L.new(nz.outputs['Fac'], r.inputs['Fac']); L.new(r.outputs['Color'], b.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.6; bump.inputs['Distance'].default_value = 0.02
    L.new(nz.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def moai(x, y, h, rz=0, chapeau=False):
    """Moaï sculpté : torse, tête allongée, arcade sourcilière profonde, nez long, lèvres, oreilles, mains."""
    pierre = mat_tuf()
    creux = mat('#4a443c', 0.95)
    o = []
    def bloc(t, dx, dy, dz, m=pierre, tilt=0.0):
        p = pave(t, (x + dx, y + dy, dz), m, rz)
        if tilt:
            p.rotation_euler = (math.radians(tilt), 0, math.radians(rz))
        o.append(p)
    tor = cyl(0.25 * h, 0.42 * h, (x, y, 0), pierre, n=4, r2=0.22 * h, lisse=False)
    tor.rotation_euler = (0, 0, math.radians(45 + rz)); tor.scale = (1, 0.78, 1); o.append(tor)
    tete = cyl(0.21 * h, 0.56 * h, (x, y + 0.01 * h, 0.4 * h), pierre, n=4, r2=0.245 * h, lisse=False)
    tete.rotation_euler = (0, 0, math.radians(45 + rz)); tete.scale = (1, 0.8, 1); o.append(tete)
    bloc((0.33 * h, 0.12 * h, 0.08 * h), 0, -0.14 * h, 0.8 * h)                    # arcade sourcilière
    for s in (-1, 1):
        bloc((0.09 * h, 0.03 * h, 0.06 * h), s * 0.075 * h, -0.135 * h, 0.735 * h, creux)  # orbites
        bloc((0.045 * h, 0.07 * h, 0.32 * h), s * 0.205 * h, 0.0, 0.66 * h)              # oreilles
        bloc((0.05 * h, 0.03 * h, 0.2 * h), s * 0.12 * h, -0.17 * h, 0.22 * h, tilt=-8)  # avant-bras
    bloc((0.075 * h, 0.11 * h, 0.25 * h), 0, -0.18 * h, 0.63 * h, tilt=-14)         # nez
    bloc((0.2 * h, 0.08 * h, 0.035 * h), 0, -0.16 * h, 0.52 * h)                    # lèvre
    bloc((0.15 * h, 0.03 * h, 0.02 * h), 0, -0.175 * h, 0.495 * h, creux)          # bouche
    bloc((0.21 * h, 0.1 * h, 0.07 * h), 0, -0.13 * h, 0.45 * h)                     # menton
    bloc((0.3 * h, 0.03 * h, 0.04 * h), 0, -0.185 * h, 0.12 * h)                    # mains jointes
    if chapeau:
        o.append(cyl(0.16 * h, 0.15 * h, (x, y + 0.01 * h, 0.95 * h), mat('#a24a35', 0.9), n=14))
    return o


def b_moai():
    o = [pave((2.5, 0.6, 0.16), (0, 0.4, 0.08), mat_pierre('Ahu', '#9a9186', '#6e665b', (0.25, 0.08)))]
    o += moai(-0.85, 0.4, 1.2, 0) + moai(0.0, 0.4, 1.45, 0, chapeau=True) + moai(0.85, 0.4, 1.2, 0)
    for z in o:
        if z.location.z > 0.05:
            z.location.z += 0.16
    o += chemin([(0.0, 0.0), (0.3, -0.7), (0.1, -1.5)], larg=0.3, seed=431)[0]
    for i, (x, y) in enumerate(((-1.1, -0.9), (1.2, -0.8), (-1.2, 1.2), (1.2, 1.2))):
        o.append(rocher((x, y, 0), (0.18, 0.15, 0.1), seed=432 + i))
    o += palmier(-1.1, 1.0, 1.1, 433) + palmier(1.15, 1.05, 1.0, 434)
    o += fleurs(-0.7, -0.6, 0.6, 0.3, 8, 435, ['#ffd23f', '#e8443a'])
    return o


def b_salle_bloc():
    return p_salle()


# ---------- Légendaires ----------
def creneaux(ax, ay, bx, by, z, ep, m, pas=0.18, larg=0.1, haut=0.12):
    o = []
    L = math.hypot(bx - ax, by - ay)
    n = max(1, int(L / pas))
    ang = math.degrees(math.atan2(by - ay, bx - ax))
    for i in range(n):
        t = (i + 0.5) / n
        o.append(pave((larg, ep, haut), (ax + (bx - ax) * t, ay + (by - ay) * t, z + haut / 2), m, ang))
    return o


def tour_ronde(x, y, r, h, m, toit='#3d5a80', drapeau='#e63946'):
    o = [cyl(r, h, (x, y, 0), m, n=24)]
    o.append(cyl(r + 0.06, 0.08, (x, y, h), m, n=24))
    for k in range(10):
        a = k / 10 * math.tau
        o.append(pave((0.09, 0.09, 0.11), (x + math.cos(a) * (r + 0.02), y + math.sin(a) * (r + 0.02), h + 0.135), m, math.degrees(a)))
    o.append(cyl(r + 0.02, r * 2.2, (x, y, h + 0.08), mat(toit, 0.6), n=24, r2=0.01))
    o.append(cyl(0.01, 0.35, (x, y, h + 0.08 + r * 2.2 - 0.05), mat('#444'), n=6))
    o.append(pave((0.16, 0.005, 0.1), (x + 0.08, y, h + r * 2.2 + 0.32), mat(drapeau, 0.6)))
    for k in range(3):  # meurtrières
        a = -math.pi / 4 + k * 0.5
        o.append(pave((0.03, 0.03, 0.16), (x + math.cos(a) * r, y + math.sin(a) * r, h * (0.35 + 0.25 * k)), mat('#2a2520'), math.degrees(a)))
    return o


def b_chateau():
    pierre = mat_pierre('PierreChateau', '#d6ccc2', '#a49a8e', (0.26, 0.12))
    o = []
    D = 5.1
    # douves + pont-levis
    ext = [(-3.9, -3.9), (3.9, -3.9), (3.9, 3.9), (-3.9, 3.9)]
    o.append(forme_plane([(x * 1.0, y * 1.0) for x, y in ext], 0.01, mat_eau(), 'douves'))
    o.append(forme_plane([(x * 0.86, y * 0.86) for x, y in ext], 0.014, mat_herbe(), 'ile'))
    # remparts
    c, hm, ep = 3.0, 1.35, 0.32
    coins = [(-c, -c), (c, -c), (c, c), (-c, c)]
    for k in range(4):
        (ax, ay), (bx, by) = coins[k], coins[(k + 1) % 4]
        L = math.hypot(bx - ax, by - ay)
        ang = math.degrees(math.atan2(by - ay, bx - ax))
        o.append(pave((L, ep, hm), ((ax + bx) / 2, (ay + by) / 2, hm / 2), pierre, ang))
        o.append(pave((L, ep + 0.1, 0.06), ((ax + bx) / 2, (ay + by) / 2, hm + 0.03), pierre, ang))
        o += creneaux(ax, ay, bx, by, hm + 0.06, ep + 0.06, pierre)
    for x, y in coins:
        o += tour_ronde(x, y, 0.55, 2.0, pierre)
    # châtelet d'entrée (façade -y) : deux tours, porte en arc, herse, pont-levis
    for sx in (-1, 1):
        o += tour_ronde(sx * 0.55, -c, 0.38, 1.75, pierre, drapeau='#ffd23f')
    o.append(pave((0.75, 0.42, 1.55), (0, -c, 0.775), pierre))
    o += creneaux(-0.4, -c - 0.21, 0.4, -c - 0.21, 1.55, 0.08, pierre)
    o.append(pave((0.45, 0.05, 0.6), (0, -c - 0.22, 0.3), mat('#2a2520')))
    o.append(cyl(0.225, 0.05, (0, -c - 0.22, 0.6), mat('#2a2520'), n=16, rot=(math.radians(90), 0, 0)))
    for i in range(5):
        o.append(pave((0.012, 0.02, 0.5), (-0.18 + i * 0.09, -c - 0.25, 0.42), mat('#3a3a3a', 0.4, 0.7)))
    o.append(pave((0.5, 1.1, 0.05), (0, -c - 0.8, 0.05), mat('#8b5e3c')))
    for s in (-1, 1):
        c2 = Charpente(); c2.poutre((s * 0.22, -c - 0.25, 0.75), (s * 0.24, -c - 1.3, 0.08), 0.012); o.append(c2.objet('chaine', mat('#333', 0.4, 0.8)))
    # donjon
    o.append(pave((1.9, 1.9, 2.8), (0.3, 0.5, 1.4), pierre))
    o += creneaux(-0.65, -0.45, 1.25, -0.45, 2.8, 0.12, pierre) + creneaux(1.25, -0.45, 1.25, 1.45, 2.8, 0.12, pierre)
    o += creneaux(-0.65, 1.45, 1.25, 1.45, 2.8, 0.12, pierre) + creneaux(-0.65, -0.45, -0.65, 1.45, 2.8, 0.12, pierre)
    for x, y in ((-0.65, -0.45), (1.25, -0.45), (1.25, 1.45), (-0.65, 1.45)):
        o += tour_ronde(x, y, 0.22, 3.2, pierre)
    for z in (0.9, 1.6, 2.3):
        for x in (-0.1, 0.3, 0.7):
            o.append(pave((0.12, 0.03, 0.22), (x, -0.46, z), mat('#ffd98a', 0.3, 0, 2.5)))
        for y in (0.1, 0.5, 0.9):
            o.append(pave((0.03, 0.12, 0.22), (1.26, y, z), mat('#ffd98a', 0.3, 0, 2.5)))
    o.append(pave((1.95, 1.95, 0.06), (0.3, 0.5, 2.83), mat('#6b6258')))
    o.append(pave((0.04, 0.005, 0.5), (0.3, 0.5, 3.3), mat('#444')))
    o.append(pave((0.4, 0.01, 0.25), (0.5, 0.5, 3.45), mat('#3d5a80', 0.6)))
    # cour : pavés, puits, chariot, écurie
    o.append(dalle(5.6, 5.6, mat_paves(), 0.016, 0.03))
    o += deco('fountain-round', -1.5, -1.3, s=0.5) + deco('cart', 1.6, -1.6, rot=30, s=0.6)
    o += deco('stall-red', -1.7, 1.6, s=0.9) + deco('stall-green', -1.7, 0.6, rot=90, s=0.9)
    for x, y in ((-1.0, -2.3), (1.0, -2.3), (2.3, 0.0), (-2.3, -0.2)):
        o += deco('lantern', x, y, s=0.85)
    for x, y in ((-4.6, -4.6), (4.6, 4.6), (-4.6, 4.6), (4.6, -4.6), (-4.7, 0.5), (4.7, -0.8), (1.5, -4.7), (-2.0, -4.7)):
        o += deco('tree-high-round', x, y, s=0.85)
    o += chemin([(0, -4.35), (0.3, -4.7), (0.0, -D)], larg=0.45, seed=441)[0]
    o += fleurs(-3.2, -4.4, 1.4, 0.4, 14, 442) + fleurs(3.2, -4.4, 1.4, 0.4, 14, 443)
    return o


def b_observatoire():
    pierre = mat_pierre('PierreObs', '#e0e1dd', '#b4b6b0', (0.26, 0.12))
    o = [cyl(1.05, 1.1, (0.2, 0.4, 0), pierre, n=32)]
    o.append(cyl(1.12, 0.08, (0.2, 0.4, 1.1), mat('#c9c9c4', 0.5), n=32))
    o.append(sphere(1.04, (0.2, 0.4, 1.18), mat('#f2f4f7', 0.25, 0.6), n=32))
    o[-1].scale = (1, 1, 0.95)
    # fente du dôme : bandeau sombre qui suit le dôme vers l'avant
    c = Charpente()
    pts = [Vector((0.2 + math.sin(t) * 1.06 * 0.0, 0.4 - math.sin(t) * 1.06, 1.18 + math.cos(t) * 1.0)) for t in [i / 12 * 1.25 for i in range(13)]]
    c.polyligne(pts, 0.3, 0.04)
    o.append(c.objet('fente', mat('#1b2433', 0.6)))
    # télescope
    t = cyl(0.16, 1.4, (0.2, -0.05, 1.9), mat('#415a77', 0.4, 0.6), n=20, rot=(math.radians(-55), 0, 0))
    o.append(t)
    o.append(cyl(0.18, 0.12, (0.2, -0.62, 2.31), mat('#2b2d42', 0.4, 0.7), n=20, rot=(math.radians(-55), 0, 0)))
    # fenêtres du tambour + porte
    for k in range(10):
        a = k / 10 * math.tau
        o.append(pave((0.1, 0.04, 0.3), (0.2 + math.cos(a) * 1.06, 0.4 + math.sin(a) * 1.06, 0.6), mat('#ffd98a', 0.3, 0, 2.0), math.degrees(a) + 90))
    o += maison(-1.7, 0.3, 2, 2, 1, 'pierre', seed=451, kz=0.45, cheminee=True)
    o.append(dalle(3.2, 1.0, mat_paves(), 0.012, 0.03, 0.0, -1.0))
    o += chemin([(0.0, -1.5), (0.4, -2.3), (0.1, -3.3)], larg=0.4, seed=452)[0]
    for x, y in ((-2.6, 2.6), (2.6, 2.6), (2.6, -2.4), (-2.6, -2.4)):
        o += deco('tree-high-round', x, y, s=0.8)
    o += deco('stall-bench', 1.6, -1.3, s=0.8) + deco('lantern', -0.9, -1.6, s=0.8) + deco('lantern', 0.9, -1.6, s=0.8)
    o += fleurs(-1.6, -2.2, 1.0, 0.6, 14, 453) + fleurs(1.8, -2.4, 1.0, 0.6, 12, 454)
    return o


def b_temple():
    marbre = mat_pierre('Marbre', '#f3eee4', '#cfc6b4', (0.5, 0.2))
    blanc = mat('#f6f1e7', 0.55)
    o = []
    W, Dp = 4.2, 2.8
    cx, cy = 0.0, 0.6
    for i in range(3):  # krépis à 3 marches
        o.append(pave((W + 0.6 - i * 0.2, Dp + 0.6 - i * 0.2, 0.12), (cx, cy, 0.06 + i * 0.12), marbre))
    zb = 0.36
    nx, ny = 8, 5
    Hc = 1.55
    for i in range(nx):
        for j in range(ny):
            if 0 < i < nx - 1 and 0 < j < ny - 1:
                continue
            x = cx - W / 2 + 0.2 + i * (W - 0.4) / (nx - 1)
            y = cy - Dp / 2 + 0.2 + j * (Dp - 0.4) / (ny - 1)
            o.append(cyl(0.12, Hc, (x, y, zb), blanc, n=20, r2=0.1))
            o.append(pave((0.3, 0.3, 0.06), (x, y, zb + Hc + 0.03), blanc))
            o.append(cyl(0.15, 0.05, (x, y, zb), blanc, n=16))
    # cella
    o.append(pave((W - 1.4, Dp - 1.2, Hc), (cx, cy + 0.05, zb + Hc / 2), marbre))
    o.append(pave((0.4, 0.05, 0.9), (cx, cy - (Dp - 1.2) / 2 + 0.03, zb + 0.45), mat('#3b2f25')))
    # entablement : architrave, frise à triglyphes, corniche
    ze = zb + Hc + 0.06
    o.append(pave((W, Dp, 0.16), (cx, cy, ze + 0.08), blanc))
    for i in range(24):
        x = cx - W / 2 + 0.1 + i * (W - 0.2) / 23
        o.append(pave((0.06, 0.02, 0.14), (x, cy - Dp / 2 - 0.005, ze + 0.24), mat('#d9d0bf')))
    o.append(pave((W, Dp, 0.16), (cx, cy, ze + 0.25), mat('#efe8db', 0.55)))
    o.append(pave((W + 0.12, Dp + 0.12, 0.06), (cx, cy, ze + 0.36), blanc))
    # fronton + toit (prisme)
    zr = ze + 0.39
    hr = 0.55
    me = bpy.data.meshes.new('toit')
    v = [(cx - W / 2 - 0.06, cy - Dp / 2 - 0.06, zr), (cx + W / 2 + 0.06, cy - Dp / 2 - 0.06, zr), (cx, cy - Dp / 2 - 0.06, zr + hr),
         (cx - W / 2 - 0.06, cy + Dp / 2 + 0.06, zr), (cx + W / 2 + 0.06, cy + Dp / 2 + 0.06, zr), (cx, cy + Dp / 2 + 0.06, zr + hr)]
    # (faîtage le long de y : pignons sur les façades -y/+y)
    v = [(cx - W / 2 - 0.06, cy - Dp / 2 - 0.06, zr), (cx + W / 2 + 0.06, cy - Dp / 2 - 0.06, zr), (cx + W / 2 + 0.06, cy + Dp / 2 + 0.06, zr),
         (cx - W / 2 - 0.06, cy + Dp / 2 + 0.06, zr), (cx, cy - Dp / 2 - 0.06, zr + hr), (cx, cy + Dp / 2 + 0.06, zr + hr)]
    f = [(0, 1, 4), (3, 5, 2), (0, 4, 5, 3), (1, 2, 5, 4), (0, 3, 2, 1)]
    me.from_pydata(v, [], f)
    me.materials.append(mat('#c98a5a', 0.7))
    tt = bpy.data.objects.new('toit', me); bpy.context.scene.collection.objects.link(tt); o.append(tt)
    # tympan clair en façade + acrotères
    for s in (-1, 1):
        o.append(sphere(0.07, (cx + s * (W / 2 + 0.04), cy - Dp / 2 - 0.06, zr + 0.05), mat('#e9c46a', 0.3, 0.8), n=10))
    o.append(sphere(0.08, (cx, cy - Dp / 2 - 0.06, zr + hr + 0.05), mat('#e9c46a', 0.3, 0.8), n=10))
    # parvis, statues, oliviers
    o.append(dalle(5.4, 1.6, mat_paves(), 0.012, 0.03, cx, cy - Dp / 2 - 1.1))
    o += chemin([(0.0, -2.4), (0.4, -3.4), (0.0, -4.3), (0.2, -5.1)], larg=0.5, seed=461)[0]
    for s in (-1, 1):
        o.append(pave((0.3, 0.3, 0.5), (s * 1.3, -1.6, 0.25), marbre))
        o += personnage((s * 1.3, -1.6, 0.5), '#f3eee4', echelle=0.55)
    rnd = random.Random(462)
    for x, y in ((-4.2, -4.2), (4.2, -4.2), (-4.3, 0.5), (4.3, 0.0), (-4.2, 4.2), (4.2, 4.3), (-2.5, -4.5), (2.6, -4.4), (0.0, 4.5)):
        tr = cyl(0.06, 0.45, (x, y, 0), mat('#7a6650'), n=8)
        o.append(tr)
        for k in range(4):
            o.append(sphere(0.28, (x + rnd.uniform(-0.2, 0.2), y + rnd.uniform(-0.2, 0.2), 0.6 + rnd.uniform(0, 0.15)), mat('#8fa07a', 0.9), n=10, lisse=False))
    o += fleurs(-2.2, -3.6, 1.2, 0.8, 14, 463) + fleurs(2.2, -3.6, 1.2, 0.8, 14, 464)
    o += bordure_n('hedge', '+y', 3) + bordure_n('hedge', '-x', 3, sauf=(9, 10, 11))
    return o


def b_grande_paroi():
    """Grande paroi (3 × 3) : immense mur de rocher, voies équipées, cascade, camp de base."""
    o, r = [], []
    rnd = random.Random(471)
    for i in range(16):
        x = -4.6 + i * 0.62 + rnd.uniform(-0.1, 0.1)
        h = 2.6 + 1.6 * math.sin(i / 15 * math.pi) + rnd.uniform(-0.3, 0.3)
        r.append(rocher((x, 3.3 + rnd.uniform(-0.25, 0.3), 0), (0.6, 0.85, h), '#a8a29e', seed=472 + i, rugo=0.16))
    for i in range(10):
        x = -4.3 + i * 0.95
        r.append(rocher((x, 2.4, 0), (0.6, 0.5, rnd.uniform(0.6, 1.2)), '#9c958f', seed=500 + i))
    o += r
    o += prises_sur(r, 260, seed=520, zmin=0.1)
    for i, x in enumerate((-3.2, -1.6, 0.2, 1.8, 3.4)):
        cu = bpy.data.curves.new('corde', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.01
        sp = cu.splines.new('POLY'); sp.points.add(2)
        sp.points[0].co = (x, 2.9, 4.0, 1); sp.points[1].co = (x + 0.1, 2.4, 1.6, 1); sp.points[2].co = (x - 0.1, 1.7, 0.02, 1)
        cc = bpy.data.objects.new('corde', cu); cc.data.materials.append(mat(['#ff006e', '#3d8bff', '#ffca3a', '#2fbf71', '#ff7a3d'][i])); bpy.context.scene.collection.objects.link(cc)
        o.append(cc)
        o += personnage((x + 0.05, 2.25, 1.3 + (i % 3) * 0.7), ['#e63946', '#2fbf71', '#3d8bff', '#ffca3a', '#b07cff'][i], pose='grimpe', echelle=0.2)
    # cascade + bassin
    cas = pave((0.35, 0.02, 3.2), (4.15, 2.35, 1.6), mat('#8fd0f2', 0.1, 0, 0.12))
    cas.rotation_euler = (math.radians(-12), 0, 0)
    o.append(cas)
    o.append(forme_plane(contour_organique(4.0, 1.6, 0.8, 0.55, seed=530), 0.012, mat_eau(), 'bassin'))
    for i in range(8):
        a = i / 8 * math.tau
        o.append(rocher((4.0 + math.cos(a) * 0.85, 1.6 + math.sin(a) * 0.6, 0), (0.15, 0.12, 0.1), seed=531 + i))
    # camp de base : tentes, tapis, feu de camp
    for i, (x, y, coul) in enumerate(((-3.6, -0.4, '#f0782d'), (-2.7, -0.9, '#2f8f8a'), (-3.8, -1.5, '#ffca3a'))):
        tn = cyl(0.35, 0.4, (x, y, 0), mat(coul, 0.7), n=4, r2=0.0, lisse=False)
        tn.rotation_euler = (0, 0, math.radians(45 + i * 10))
        o.append(tn)
    o.append(cyl(0.12, 0.05, (-2.9, -1.9, 0), mat('#555'), n=10))
    o.append(cyl(0.06, 0.18, (-2.9, -1.9, 0.03), mat('#ff8c1a', 0.3, 0, 5.0), n=6, r2=0.0, lisse=False))
    for x, c in ((-1.8, '#2f5fbf'), (-0.2, '#ff7a3d'), (1.4, '#2f5fbf')):
        o.append(boite('tapis', (1.0, 0.5, 0.07), (x, 1.55, 0.035), c))
    o += chemin([(0.0, 1.1), (0.5, -0.5), (0.0, -2.5), (0.4, -4.0), (0.2, -5.1)], larg=0.45, seed=540)[0]
    for x, y in ((4.5, -4.5), (-4.5, -4.5), (2.5, -3.8), (-1.5, -4.2), (4.6, -1.5), (-4.6, 0.8)):
        o += deco('tree', x, y, s=0.9)
    o += fleurs(2.4, -1.5, 1.6, 1.0, 18, 541) + fleurs(-1.5, -3.0, 1.4, 1.0, 16, 542)
    return o


# ---------- Merveilles (premium) ----------
class Maconnerie:
    """Accumule des blocs (pavés tournés autour de la verticale) dans un seul maillage."""

    def __init__(self):
        self.v, self.f = [], []

    def bloc(self, c, rz, sx, sy, sz):
        ca, sa = math.cos(rz), math.sin(rz)
        i = len(self.v)
        for dz in (-sz / 2, sz / 2):
            for dx, dy in ((-sx / 2, -sy / 2), (sx / 2, -sy / 2), (sx / 2, sy / 2), (-sx / 2, sy / 2)):
                self.v.append((c[0] + dx * ca - dy * sa, c[1] + dx * sa + dy * ca, c[2] + dz))
        self.f += [(i, i + 3, i + 2, i + 1), (i + 4, i + 5, i + 6, i + 7), (i, i + 1, i + 5, i + 4),
                   (i + 1, i + 2, i + 6, i + 5), (i + 2, i + 3, i + 7, i + 6), (i + 3, i, i + 4, i + 7)]

    def objet(self, nom, m):
        me = bpy.data.meshes.new(nom)
        me.from_pydata(self.v, [], self.f)
        me.materials.append(m)
        o = bpy.data.objects.new(nom, me)
        bpy.context.scene.collection.objects.link(o)
        return o


def sphinx(x, y, s=1.0, rz=0.0):
    """Sphinx : corps de lion couché, pattes avant, tête coiffée du némès rayé bleu et or (face vers -y)."""
    gres = mat_pierre('GresSphinx', '#dcb873', '#a8844c', (0.18, 0.08))
    bleu, or_ = mat('#2f4f8f', 0.5), mat('#e2b13c', 0.3, 0.7)
    o = []
    a = math.radians(rz)
    def P(dx, dy, dz):
        return (x + (dx * math.cos(a) - dy * math.sin(a)) * s, y + (dx * math.sin(a) + dy * math.cos(a)) * s, dz * s)
    def b(t, dx, dy, dz, m=gres):
        o.append(pave((t[0] * s, t[1] * s, t[2] * s), P(dx, dy, dz), m, rz))
    b((0.62, 1.5, 0.12), 0, 0.05, 0.06)                     # socle
    b((0.42, 1.05, 0.34), 0, 0.25, 0.29)                    # corps
    o.append(sphere(0.24 * s, P(0, 0.72, 0.36), gres, sc=(0.95, 1.1, 0.85), n=14))  # croupe
    for sx in (-1, 1):
        b((0.12, 0.62, 0.1), sx * 0.13, -0.42, 0.17)         # pattes avant
        b((0.14, 0.14, 0.12), sx * 0.13, -0.68, 0.18)        # griffes
    b((0.36, 0.3, 0.36), 0, -0.22, 0.58)                    # poitrail
    b((0.26, 0.24, 0.3), 0, -0.3, 0.88)                     # visage
    for k in range(5):                                       # némès rayé
        m = bleu if k % 2 else or_
        b((0.44 - k * 0.02, 0.26, 0.05), 0, -0.24, 1.04 - k * 0.04, m)
    for sx in (-1, 1):
        b((0.08, 0.16, 0.36), sx * 0.19, -0.26, 0.78, bleu)  # pans du némès
    b((0.05, 0.05, 0.12), 0, -0.43, 0.68, bleu)             # barbe
    b((0.05, 0.03, 0.04), 0, -0.425, 0.92)                  # nez
    o.append(sphere(0.03 * s, P(0, -0.37, 1.1), or_, n=8))   # uræus
    return o


def chameau(x, y, rz=0.0, s=0.5):
    peau = mat('#c79a5b', 0.9)
    o = []
    a = math.radians(rz)
    def P(dx, dy, dz):
        return (x + (dx * math.cos(a) - dy * math.sin(a)) * s, y + (dx * math.sin(a) + dy * math.cos(a)) * s, dz * s)
    o.append(sphere(0.3 * s, P(0, 0, 0.72), peau, sc=(1.4, 0.55, 0.55), n=12))
    o.append(sphere(0.16 * s, P(0, 0, 0.92), peau, sc=(1.1, 0.8, 0.9), n=10))
    ch = Charpente()
    ch.poutre(P(0.36, 0, 0.75), P(0.55, 0, 1.08), 0.08 * s, 0.07 * s)
    for dx in (-0.28, 0.28):
        for dy in (-0.1, 0.1):
            ch.poutre(P(dx, dy, 0.6), P(dx, dy, 0.0), 0.05 * s)
    o.append(ch.objet('chameau', peau))
    o.append(pave((0.18 * s, 0.08 * s, 0.08 * s), P(0.6, 0, 1.08), peau, rz))
    o.append(pave((0.3 * s, 0.3 * s, 0.04 * s), P(0, 0, 1.0), mat('#b83b3b', 0.8), rz))  # tapis de selle
    return o


def b_pyramide():
    """Pyramide (4 × 4) : assises de blocs, sommet revêtu de calcaire lisse, pyramidion d'or,
    grand Sphinx, allée de sphinx, obélisques gravés, oasis et caravane."""
    o = []
    gres = mat_pierre('Gres', '#e2bd74', '#9c7a45', (0.22, 0.1))
    gres.node_tree.nodes['Brick Texture'].inputs['Color2'].default_value = (0.55, 0.4, 0.2, 1)
    calcaire = mat_pierre('Calcaire', '#f3ead6', '#d8cbb0', (0.6, 0.3))
    cy = 1.0
    B, H = 4.2, 4.4
    n = 44
    for i in range(n):
        h = H / n
        d = B * (1 - i / n)
        m = calcaire if i >= n * 0.72 else gres
        o.append(pave((2 * d, 2 * d, h), (0, cy, h * (i + 0.5)), m))
    # revêtement lisse : faces inclinées sur le dernier quart
    z0 = H * 0.72
    d0 = B * (1 - 0.72)
    cas = cyl(d0 * 1.414 + 0.02, H - z0, (0, cy, z0), calcaire, n=4, r2=0.0, lisse=False)
    cas.rotation_euler = (0, 0, math.radians(45))
    o.append(cas)
    pyr = cyl(0.32, 0.42, (0, cy, H - 0.3), mat('#f2c14e', 0.15, 1.0), n=4, r2=0.0, lisse=False)
    pyr.rotation_euler = (0, 0, math.radians(45))
    o.append(pyr)
    # entrée (face -y)
    ze = 1.0
    ye = cy - B * (1 - ze / H) - 0.04
    o.append(pave((0.36, 0.16, 0.46), (0, ye, ze), mat('#2c2116')))
    o.append(pave((0.56, 0.18, 0.1), (0, ye - 0.02, ze + 0.28), gres))
    o.append(pave((0.3, 0.05, 0.4), (0, ye - 0.06, ze + 0.1), mat('#3a2a1a')))
    # chaussée vers le Sphinx et le temple d'accueil
    o.append(dalle(1.4, 3.6, mat_paves('PavesSable', (0.85, 0.72, 0.5)), 0.012, 0.03, 0, -4.3))
    o += sphinx(-2.6, -3.3, 1.6, 0)
    for k in range(4):
        y = -2.9 - k * 0.8
        for sx in (-1, 1):
            o += sphinx(sx * 0.95, y, 0.32, 0)
    for sx in (-1, 1):  # pylône d'entrée
        o.append(cyl(0.38, 1.1, (sx * 0.55, -6.0, 0), gres, n=4, r2=0.3, lisse=False))
        o[-1].rotation_euler = (0, 0, math.radians(45))
    o.append(pave((1.5, 0.35, 0.16), (0, -6.0, 1.02), gres))
    # obélisques gravés
    for sx in (-1, 1):
        ob = cyl(0.17, 2.3, (sx * 1.6, -1.9, 0.15), gres, n=4, r2=0.1, lisse=False)
        ob.rotation_euler = (0, 0, math.radians(45))
        o.append(ob)
        for k in range(6):
            o.append(pave((0.05, 0.015, 0.1), (sx * 1.6, -1.9 - 0.13 + k * 0.0, 0.5 + k * 0.28), mat('#7a5a2c')))
        o.append(pave((0.5, 0.5, 0.15), (sx * 1.6, -1.9, 0.075), gres))
        pt = cyl(0.11, 0.2, (sx * 1.6, -1.9, 2.45), mat('#f2c14e', 0.15, 1.0), n=4, r2=0.0, lisse=False)
        pt.rotation_euler = (0, 0, math.radians(45))
        o.append(pt)
    # petites pyramides des reines
    for sx in (-1, 1):
        for i in range(14):
            d = 0.95 * (1 - i / 14)
            o.append(pave((2 * d, 2 * d, 0.09), (sx * 4.9, 4.8, 0.045 + 0.09 * i), gres))
    # oasis, palmiers, tentes, caravane, voyageurs
    o.append(forme_plane(contour_organique(-4.6, 2.0, 1.3, 1.0, seed=551), 0.012, mat_eau(), 'oasis'))
    o.append(forme_plane([(x * 1.0, y) for x, y in contour_organique(-4.6, 2.0, 1.6, 1.3, seed=551)], 0.008, mat_herbe(), 'rive'))
    for i, (x, y) in enumerate(((-5.7, 3.1), (-3.3, 2.9), (-5.9, 1.0), (-4.1, 0.7), (-3.1, 1.6), (-5.0, 3.4), (5.3, 1.5), (6.0, 0.3), (5.6, -2.8))):
        o += palmier(x, y, 1.15 + (i % 3) * 0.22, 560 + i)
    for i, (x, y, coul) in enumerate(((4.4, -1.0, '#e9e2cf'), (5.4, -1.6, '#c8553d'), (5.0, -0.2, '#e9e2cf'))):
        tn = cyl(0.42, 0.45, (x, y, 0), mat(coul, 0.8), n=4, r2=0.0, lisse=False)
        tn.rotation_euler = (0, 0, math.radians(45 + i * 12))
        o.append(tn)
    for i in range(4):
        o += chameau(2.2 + i * 0.75, -4.6 + i * 0.25, rz=15, s=0.55)
    rnd = random.Random(590)
    for i in range(7):
        o += personnage((rnd.uniform(-1.0, 1.0), rnd.uniform(-5.6, -3.0), 0.02), rnd.choice(['#f3ead6', '#2f4f8f', '#c8553d']), echelle=0.22)
    for i in range(14):
        a = i / 14 * math.tau
        o.append(rocher((math.cos(a) * 6.3, math.sin(a) * 6.3, 0), (0.25, 0.2, 0.15), '#c9a76b', seed=580 + i))
    return o


def b_colisee():
    """Colisée (4 × 4) : ellipse à 3 rangs d'arcades + attique, côté avant en ruine (on voit la cavea),
    gradins, arène et hypogée."""
    trav = mat_pierre('Travertin', '#e6cfa6', '#b89e78', (0.32, 0.14))
    ombre = mat('#5e4a35', 0.95)
    m_ext, m_int, m_omb = Maconnerie(), Maconnerie(), Maconnerie()
    cx, cy = 0.0, 0.4
    A, B = 4.5, 3.75
    N = 48
    tiers = [0.72, 0.72, 0.72, 0.5]
    ang_ruine = math.radians(-40)  # vers la caméra (avant droit)

    def pt(t, k=1.0):
        return Vector((cx + A * k * math.cos(t), cy + B * k * math.sin(t), 0))

    for i in range(N):
        t0, t1 = i / N * math.tau, (i + 1) / N * math.tau
        tm = (t0 + t1) / 2
        p0, p1 = pt(t0), pt(t1)
        L = (p1 - p0).length
        rz = math.atan2(p1.y - p0.y, p1.x - p0.x)
        # nombre d'étages conservés : le côté face à la caméra est éboulé
        dist = abs(math.atan2(math.sin(tm - ang_ruine), math.cos(tm - ang_ruine)))
        ruine = max(0.0, 1 - dist / math.radians(70))
        nt = 4 - int(round(ruine * 3.2 + (0.6 if i % 3 == 0 else 0) * ruine))
        nt = max(1, min(4, nt))
        z = 0.0
        for k in range(nt):
            h = tiers[k]
            # pilier à la limite de la travée
            m_ext.bloc((p0.x, p0.y, z + h / 2), rz, 0.16, 0.42, h)
            if k < 3:
                ray = (L - 0.16) / 2
                zs = z + h - 0.1 - ray
                if zs < z + 0.12:
                    zs = z + 0.12
                # jambages + arc en voussoirs
                for j in range(9):
                    a0, a1 = math.pi * j / 9, math.pi * (j + 1) / 9
                    am = (a0 + a1) / 2
                    u = -math.cos(am) * ray
                    pc = p0 + (p1 - p0) * 0.5
                    dirv = (p1 - p0).normalized()
                    c = pc + dirv * u
                    m_ext.bloc((c.x, c.y, zs + math.sin(am) * ray + 0.03), rz + am - math.pi / 2, 0.06, 0.42, ray * math.pi / 9 + 0.01)
                # écoinçons au-dessus de l'arc
                pc = p0 + (p1 - p0) * 0.5
                m_ext.bloc((pc.x, pc.y, z + h - 0.06), rz, L, 0.42, 0.12)
                # fond sombre de l'arcade (couloir)
                q0, q1 = pt(t0, 0.93), pt(t1, 0.93)
                qc = (q0 + q1) / 2
                m_omb.bloc((qc.x, qc.y, z + h / 2), rz, (q1 - q0).length, 0.05, h)
            else:
                pc = p0 + (p1 - p0) * 0.5
                m_ext.bloc((pc.x, pc.y, z + h / 2), rz, L, 0.42, h)
                m_omb.bloc(((pc + (pt(tm, 1.004) - pt(tm))).x, pc.y, z + h * 0.55), rz, 0.1, 0.44, 0.16)
            # corniche
            pc = p0 + (p1 - p0) * 0.5
            m_ext.bloc((pc.x, pc.y, z + h + 0.025), rz, L + 0.01, 0.5, 0.05)
            z += h + 0.05
    o = [m_ext.objet('colisee', trav), m_omb.objet('arcades-ombre', ombre)]
    # gradins (cavea) : anneaux en escalier de l'arène vers le mur
    for s in range(12):
        k0 = 0.44 + s * 0.042
        zg = 0.12 + s * 0.17
        for i in range(N):
            t0, t1 = i / N * math.tau, (i + 1) / N * math.tau
            p0, p1 = pt(t0, k0 + 0.021), pt(t1, k0 + 0.021)
            dist = abs(math.atan2(math.sin((t0 + t1) / 2 - ang_ruine), math.cos((t0 + t1) / 2 - ang_ruine)))
            if dist < math.radians(25) and s > 6:
                continue
            m_int.bloc(((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, zg / 2), math.atan2(p1.y - p0.y, p1.x - p0.x), (p1 - p0).length + 0.01, A * 0.045, zg)
    o.append(m_int.objet('gradins', mat_pierre('Gradins', '#d8c09a', '#a68d6a', (0.4, 0.17))))
    # arène + hypogée
    arene = [(cx + A * 0.43 * math.cos(a), cy + B * 0.43 * math.sin(a)) for a in [i / 48 * math.tau for i in range(48)]]
    o.append(forme_plane(arene, 0.02, mat_sable(), 'arene'))
    hyp = Maconnerie()
    for i in range(-3, 4):
        hyp.bloc((cx + i * 0.38, cy, 0.08), 0, 0.05, B * 0.55, 0.16)
    for j in (-1, 0, 1):
        hyp.bloc((cx, cy + j * 0.45, 0.08), 0, A * 0.6, 0.05, 0.16)
    o.append(hyp.objet('hypogee', mat('#a8916d', 0.95)))
    # esplanade, arc de triomphe, arbres, visiteurs
    o.append(dalle(9.6, 1.6, mat_paves(), 0.012, 0.03, 0, -4.4))
    o += chemin([(0.0, -5.2), (0.4, -6.0), (0.1, -6.9)], larg=0.5, seed=601)[0]
    arc = Maconnerie()
    ax0, ay0 = -4.6, -4.4
    for s in (-1, 1):
        arc.bloc((ax0 + s * 0.4, ay0, 0.5), 0, 0.35, 0.45, 1.0)
    arc.bloc((ax0, ay0, 1.15), 0, 1.15, 0.45, 0.3)
    arc.bloc((ax0, ay0, 1.36), 0, 1.25, 0.5, 0.12)
    o.append(arc.objet('arc', trav))
    o.append(cyl(0.23, 0.46, (ax0, ay0, 0.55), ombre, n=16, rot=(math.radians(90), 0, 0)))
    for x, y in ((-6.2, -6.2), (6.2, -6.2), (-6.3, 2.5), (6.3, 3.0), (-5.8, 6.0), (5.8, 6.1), (3.5, -6.3), (-2.8, -6.4)):
        o += deco('tree-high-round', x, y, s=0.9)
    rnd = random.Random(602)
    for i in range(10):
        o += personnage((rnd.uniform(-3.5, 3.5), -4.4 + rnd.uniform(-0.6, 0.6), 0.02), rnd.choice(PRISES[:6]), echelle=0.22)
    for x in (-3.6, -1.2, 1.2, 3.6):
        o += deco('lantern', x, -5.3, s=0.9)
    o += fleurs(-4.5, -6.0, 2.0, 0.6, 18, 603) + fleurs(4.5, -6.0, 2.0, 0.6, 18, 604)
    return o


def mat_verre_tour():
    """Verre de façade : bleu profond de face, plus clair et réfléchissant en incidence rasante."""
    m = bpy.data.materials.get('VerreTour2')
    if m:
        return m
    m = bpy.data.materials.new('VerreTour2')
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF')
    b.inputs['Roughness'].default_value = 0.04
    b.inputs['Metallic'].default_value = 0.55
    lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.35
    r = N.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].color = (0.05, 0.16, 0.32, 1)
    r.color_ramp.elements[1].color = (0.55, 0.75, 0.92, 1)
    L.new(lw.outputs['Facing'], r.inputs['Fac'])
    L.new(r.outputs['Color'], b.inputs['Base Color'])
    return m


def b_tour_verre():
    """Tour de verre géante (3 × 3) : tour vrillée en façade-rideau, montants, planchers fins,
    fenêtres chaudes, jardin suspendu, couronne en treillis, socle et bassin miroir."""
    o = []
    verre = mat_verre_tour()
    plancher = mat('#dfe3e8', 0.4, 0.2)
    montant = mat('#a9b4c2', 0.3, 0.8)
    allume = mat('#ffc56b', 0.5, 0, 1.2)
    rnd = random.Random(611)
    cx, cy = 0.0, 0.6
    n, hz = 28, 0.24
    d0 = 1.0
    sl, gl, li, mo = Maconnerie(), Maconnerie(), Maconnerie(), Maconnerie()
    jardin_etage = 14
    for i in range(n):
        t = i / (n - 1)
        rz = math.radians(45 * t)
        d = d0 * (1 - 0.3 * t * t)
        z = 0.5 + i * hz
        sl.bloc((cx, cy, z), rz, 2 * d + 0.05, 2 * d + 0.05, 0.03)
        if i == jardin_etage:
            continue  # étage ouvert : jardin suspendu
        gl.bloc((cx, cy, z + hz / 2 + 0.01), rz, 2 * d - 0.02, 2 * d - 0.02, hz - 0.03)
        ca, sa = math.cos(rz), math.sin(rz)
        for face in range(4):
            nx, ny = [(0, -1), (1, 0), (0, 1), (-1, 0)][face]
            m_ = 7
            for k in range(m_ + 1):
                u = -d + 2 * d * k / m_
                px, py = nx * d + (-ny) * u, ny * d + nx * u
                mo.bloc((cx + px * ca - py * sa, cy + px * sa + py * ca, z + hz / 2 + 0.01), rz, 0.018, 0.018, hz - 0.02)
            for k in range(m_):
                if rnd.random() < 0.16:
                    u = -d + 2 * d * (k + 0.5) / m_
                    px, py = nx * (d - 0.004) + (-ny) * u, ny * (d - 0.004) + nx * u
                    li.bloc((cx + px * ca - py * sa, cy + px * sa + py * ca, z + hz / 2), rz + (math.pi / 2 if face % 2 else 0), 2 * d / m_ * 0.8, 0.012, hz - 0.08)
    o += [sl.objet('planchers', plancher), gl.objet('verre', verre), li.objet('fenetres', allume), mo.objet('montants', montant)]
    # jardin suspendu : arbres et massifs sur l'étage ouvert, colonnes de structure
    zj = 0.5 + jardin_etage * hz + 0.02
    tj = jardin_etage / (n - 1)
    dj = d0 * (1 - 0.3 * tj * tj)
    rzj = math.radians(45 * tj)
    for k in range(4):
        a = rzj + math.pi / 4 + k * math.pi / 2
        o.append(cyl(0.03, hz, (cx + math.cos(a) * dj * 1.3, cy + math.sin(a) * dj * 1.3, zj), montant, n=8))
    for k in range(6):
        a = k / 6 * math.tau
        o += piece('tree-high-round', cx + math.cos(a) * dj * 0.6, cy + math.sin(a) * dj * 0.6, zj, 0, None, (0.17, 0.17, 0.12))
    o += fleurs(cx, cy, dj * 1.4, dj * 1.4, 18, 616)
    for f in o[-18 * 4:]:
        f.location.z += zj
    # couronne : 3 étages en retrait + treillis + flèche
    zt = 0.5 + n * hz
    ch, peau = Charpente(), Charpente()
    ann = [carre(cx, cy, zt + i * 0.2, 0.42 - i * 0.07) for i in range(6)]
    section_treillis(ch, peau, ann, 0.03, 0.018, 0.012)
    o.append(ch.objet('couronne', montant))
    o.append(cyl(0.34, 0.5, (cx, cy, zt), verre, n=4, r2=0.12, lisse=False))
    o[-1].rotation_euler = (0, 0, math.radians(45 + 45))
    o.append(cyl(0.025, 1.2, (cx, cy, zt + 1.0), mat('#d9d9d9', 0.3, 0.9), n=8, r2=0.006))
    o += guirlande([(cx, cy, zt + 2.22), (cx, cy, zt + 2.23)], 1, '#ff3b30')
    # socle : podium vitré, marquise, bassin miroir, jardin
    o.append(pave((2.8, 2.8, 0.5), (cx, cy, 0.25), mat('#e9e4da', 0.6)))
    o.append(pave((2.7, 0.04, 0.38), (cx, cy - 1.41, 0.24), verre))
    o.append(pave((1.0, 0.6, 0.05), (cx, cy - 1.7, 0.42), plancher))
    o.append(dalle(6.0, 2.0, mat_paves(), 0.012, 0.03, 0, -2.1))
    o.append(pave((3.2, 0.7, 0.03), (0, -2.4, 0.03), mat_eau()))
    for x in (-1.2, -0.4, 0.4, 1.2):
        o.append(cyl(0.03, 0.25, (x, -2.4, 0.03), mat('#bfe6ff', 0.1, 0, 0.2), n=8, r2=0.005))
    o += chemin([(0.0, -3.1), (0.5, -4.0), (0.2, -5.1)], larg=0.5, seed=612)[0]
    for x, y in ((-4.3, -4.3), (4.3, -4.3), (-4.4, 0.5), (4.4, 0.2), (-4.2, 4.3), (4.3, 4.2), (-2.6, 4.5), (2.5, 4.6), (-2.7, -4.5), (2.7, -4.4)):
        o += deco('tree-high-round', x, y, s=0.9)
    for x in (-2.6, -1.3, 1.3, 2.6):
        o += deco('lantern', x, -3.0, s=0.9)
    o += deco('stall-bench', -2.0, -1.6, s=0.85) + deco('stall-bench', 2.0, -1.6, s=0.85)
    rnd2 = random.Random(613)
    for i in range(8):
        o += personnage((rnd2.uniform(-2.6, 2.6), -2.0 + rnd2.uniform(-0.6, 0.5), 0.02), rnd2.choice(PRISES[:6]), echelle=0.22)
    o += fleurs(-3.4, -3.8, 1.6, 0.8, 18, 614) + fleurs(3.4, -3.8, 1.6, 0.8, 18, 615)
    o += bordure_n('hedge', '+y', 3) + bordure_n('hedge', '-x', 3, sauf=(9, 10, 11))
    return o


def b_fusee():
    """Fusée (2 × 2) : lanceur blanc et rouge, boosters, tour de lancement en treillis, réservoirs, vapeur."""
    o = []
    blanc = mat('#f8f9fa', 0.35)
    rouge = mat('#e63946', 0.4)
    sombre = mat('#2b2d42', 0.5, 0.6)
    fx, fy = 0.45, 0.45
    # aire de lancement
    o.append(cyl(1.6, 0.14, (0.2, 0.3, 0), mat('#b8b3aa', 0.9), n=8, lisse=False))
    o.append(pave((0.9, 0.9, 0.1), (fx, fy, 0.19), mat('#8a857c', 0.8)))
    o.append(pave((0.5, 1.6, 0.02), (fx, fy - 1.0, 0.141), mat('#3a3631')))  # carneau
    # corps principal
    Z0 = 0.5
    o.append(cyl(0.32, 3.0, (fx, fy, Z0), blanc, n=32))
    o.append(cyl(0.325, 0.18, (fx, fy, Z0 + 2.1), rouge, n=32))
    o.append(cyl(0.325, 0.06, (fx, fy, Z0 + 0.5), sombre, n=32))
    o.append(cyl(0.32, 0.75, (fx, fy, Z0 + 3.0), rouge, n=32, r2=0.03))
    o.append(sphere(0.035, (fx, fy, Z0 + 3.76), rouge, n=10))
    for k in range(3):  # hublots
        a = math.radians(-90 + (k - 1) * 30)
        o.append(sphere(0.05, (fx + math.cos(a) * 0.31, fy + math.sin(a) * 0.31, Z0 + 2.55), mat('#87cefa', 0.1, 0.5), sc=(1, 1, 1), n=12))
    # ailerons
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        p = pave((0.36, 0.035, 0.55), (fx + math.cos(a) * 0.45, fy + math.sin(a) * 0.45, Z0 + 0.3), rouge, math.degrees(a))
        o.append(p)
    # boosters
    for s in (-1, 1):
        bx, by = fx + s * 0.47 * 0.707, fy - s * 0.47 * 0.707
        o.append(cyl(0.14, 1.9, (bx, by, Z0 - 0.1), blanc, n=20))
        o.append(cyl(0.14, 0.35, (bx, by, Z0 + 1.8), rouge, n=20, r2=0.01))
        o.append(cyl(0.1, 0.18, (bx, by, Z0 - 0.26), sombre, n=16, r2=0.13))
    o.append(cyl(0.2, 0.22, (fx, fy, Z0 - 0.2), sombre, n=20, r2=0.27))
    # tour de lancement en treillis + bras d'accès
    ch, peau = Charpente(), Charpente()
    tx, ty, d = -0.55, 0.85, 0.28
    ann = [carre(tx, ty, z, d) for z in [0.14 + i * 0.25 for i in range(17)]]
    section_treillis(ch, peau, ann, 0.04, 0.025, 0.016)
    for zb in (1.6, 2.7, 3.4):
        ch.poutre((tx + d, ty - 0.1, zb), (fx - 0.3, fy + 0.05, zb), 0.06, 0.05)
        ch.poutre((tx + d, ty - 0.25, zb + 0.08), (fx - 0.3, fy - 0.05, zb + 0.08), 0.02)
    o.append(ch.objet('tour-lancement', mat('#d9481c', 0.5, 0.3)))
    o.append(pave((0.7, 0.7, 0.2), (tx, ty, 4.4), mat('#d9481c', 0.5, 0.3)))
    o.append(cyl(0.02, 0.6, (tx, ty, 4.5), mat('#d9d9d9', 0.3, 0.9), n=6))
    o += guirlande([(tx, ty, 5.12), (tx, ty, 5.13)], 1, '#ff3b30')
    # réservoirs sphériques, bunker, projecteurs, vapeur
    for x, y in ((-2.2, -0.6), (-2.2, 0.6)):
        for k in range(4):
            a = k * math.pi / 2 + math.pi / 4
            o.append(cyl(0.03, 0.5, (x + math.cos(a) * 0.3, y + math.sin(a) * 0.3, 0), mat('#9aa0a6', 0.5, 0.6), n=6))
        o.append(sphere(0.48, (x, y, 0.95), blanc, n=24))
    o.append(pave((1.0, 0.7, 0.35), (2.2, -2.0, 0.175), mat('#c9c3b8', 0.8)))
    o.append(pave((0.6, 0.02, 0.1), (2.2, -2.36, 0.25), mat('#87cefa', 0.1, 0, 1.5)))
    for x, y in ((-1.6, -1.6), (2.0, 1.8)):
        o.append(cyl(0.03, 1.6, (x, y, 0), mat('#9aa0a6', 0.5, 0.6), n=6))
        o.append(pave((0.25, 0.08, 0.15), (x, y - 0.05, 1.6), mat('#ffe7a3', 0.3, 0, 4.0)))
    rnd = random.Random(621)
    for i in range(14):
        a = rnd.uniform(0, math.tau)
        rr = rnd.uniform(0.4, 1.1)
        o.append(sphere(rnd.uniform(0.18, 0.32), (fx + math.cos(a) * rr, fy - 0.6 + math.sin(a) * rr * 0.6, rnd.uniform(0.1, 0.35)), mat('#f4f4f4', 0.9), n=12))
    o += chemin([(0.0, -1.4), (0.4, -2.3), (0.2, -3.3)], larg=0.45, seed=622)[0]
    for x, y in ((-2.7, 2.6), (2.7, 2.7), (-2.7, -2.7), (2.8, -0.4)):
        o += deco('tree-high-round', x, y, s=0.8)
    o += fleurs(-1.5, -2.7, 1.0, 0.5, 12, 623) + fleurs(1.2, -2.8, 0.8, 0.4, 10, 624)
    return o


def b_tour_eiffel():
    return p_tour_eiffel()


# ---------- Registre : id → (fonction, taille, hauteur max du cadrage, premium, sol) ----------
CATALOGUE = {
    'maison-bleue': (b_maison_bleue, 1, 2.4, False, 'herbe'),
    'maison-jaune': (p_maison_jaune, 1, 2.4, False, 'herbe'),
    'maison-rose': (p_maison_rose, 1, 2.4, False, 'herbe'),
    'chalet': (b_chalet, 1, 2.4, False, 'herbe'),
    'immeuble': (b_immeuble, 1, 2.8, False, 'herbe'),
    'villa': (b_villa, 1, 2.4, False, 'herbe'),
    'gratte-ciel': (b_gratte_ciel, 2, 5.4, False, 'herbe'),
    'boulangerie': (b_boulangerie, 1, 2.4, False, 'herbe'),
    'cafe': (b_cafe, 1, 2.4, False, 'herbe'),
    'marche': (b_marche, 1, 2.4, False, 'herbe'),
    'magasin-sport': (b_magasin_sport, 2, 3.0, False, 'herbe'),
    'arbre': (b_arbre, 1, 2.6, False, 'herbe'),
    'sapin': (b_sapin, 1, 2.6, False, 'herbe'),
    'jardin': (b_jardin, 1, 2.4, False, 'herbe'),
    'lac': (b_lac, 2, 2.4, False, 'herbe'),
    'fontaine': (b_fontaine, 1, 2.4, False, 'herbe'),
    'kiosque': (b_kiosque, 1, 2.4, False, 'herbe'),
    'bloc': (b_bloc, 1, 2.4, False, 'herbe'),
    'mur': (b_mur, 1, 2.8, False, 'herbe'),
    'refuge': (b_refuge, 1, 2.4, False, 'herbe'),
    'salle-bloc': (b_salle_bloc, 2, 3.6, False, 'herbe'),
    'falaise': (b_falaise, 2, 3.8, False, 'herbe'),
    'grande-paroi': (b_grande_paroi, 3, 5.6, True, 'herbe'),
    'arche': (b_arche, 2, 3.4, False, 'herbe'),
    'statue': (b_statue, 1, 2.4, False, 'herbe'),
    'tour-horloge': (b_tour_horloge, 1, 4.6, False, 'herbe'),
    'phare': (b_phare, 1, 4.6, False, 'herbe'),
    'moai': (b_moai, 1, 2.6, False, 'herbe'),
    'chateau': (b_chateau, 3, 4.6, True, 'herbe'),
    'observatoire': (b_observatoire, 2, 3.4, True, 'herbe'),
    'temple': (b_temple, 3, 3.4, True, 'herbe'),
    'pyramide': (b_pyramide, 4, 5.4, True, 'sable'),
    'tour-eiffel': (b_tour_eiffel, 3, 9.3, True, 'herbe'),
    'colisee': (b_colisee, 4, 3.8, True, 'herbe'),
    'tour-verre': (b_tour_verre, 3, 8.4, True, 'herbe'),
    'fusee': (b_fusee, 2, 5.6, True, 'herbe'),
}


def rendre(bid, sens, out):
    fn, n, hmax, premium, sol = CATALOGUE[bid]
    sc = reset()
    cote = 3 * n + ROUTE * (n - 1)
    if sol == 'sable':
        sol_obj = dalle(cote, cote, mat_sable(), 0.0, 0)
        sol_obj.name = 'sable'
    else:
        sol_obj = add_ground(cote, cote, sol)
    fn()
    if premium:
        for attr in ('use_raytracing', 'use_gtao'):
            try:
                setattr(sc.eevee, attr, True)
            except AttributeError:
                pass
    if sens == 'd':
        # façade vers la droite : on pivote toute la scène d'un quart de tour (le soleil, lui, ne bouge pas)
        R = Matrix.Rotation(math.radians(90), 4, 'Z')
        bpy.context.view_layer.update()
        for o in list(sc.objects):
            if o.parent is None and o != sol_obj and o.type not in ('CAMERA', 'LIGHT'):
                o.matrix_world = R @ o.matrix_world
    if sol == 'herbe' and HERBE_TEXTUREE:
        touffes(cote / 2 - 0.03, int(170 * (cote / 3) ** 2), seed=len(bid))
    lo, hi = Vector((-cote / 2, -cote / 2, -0.15)), Vector((cote / 2, cote / 2, hmax))
    camera_for(sc, lo, hi)
    if NUIT:
        appliquer_nuit(sc)
    nom = f'{bid}-{sens}'
    sc.render.filepath = os.path.join(out, f'{nom}.png')
    bpy.ops.render.render(write_still=True)
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(sc, sc.camera, Vector((0, 0, 0)))
    with open(os.path.join(out, f'{nom}.json'), 'w') as f:
        json.dump({'ox': v.x * sc.render.resolution_x, 'oy': (1 - v.y) * sc.render.resolution_y, 'ppu': PX_PER_UNIT, 'taille': n}, f)
    if NUIT:
        # couche de lumière (halos qui débordent sur les cases voisines, faisceau du phare)
        m = passe_lumiere(sc, os.path.join(out, f'{nom}-lum.png'), lo, hi, sens=sens)
        with open(os.path.join(out, f'{nom}-lum.json'), 'w') as f:
            json.dump({**m, 'ppu': PX_PER_UNIT, 'taille': n}, f)
    print(f'[atelier] {nom}')


argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
sens = ['g', 'd']
if '--sens' in argv:
    i = argv.index('--sens')
    sens = [argv[i + 1]]
    argv = argv[:i] + argv[i + 2:]
out = os.path.abspath(argv[0] if argv else os.path.join(ICI, 'out', 'batiments'))
os.makedirs(out, exist_ok=True)
for bid in (argv[1:] or list(CATALOGUE)):
    for s in sens:
        try:
            rendre(bid, s, out)
        except Exception as e:  # on continue avec les autres éléments
            import traceback
            traceback.print_exc()
            print(f'[atelier] ERREUR {bid}-{s} : {e}')
