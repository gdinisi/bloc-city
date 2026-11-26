"""
Atelier ville — style « village cosy » : maisons à colombage colorées.

Lancement (sans interface) :
  blender -b -P atelier-ville/village.py -- <dossier_sortie> [nom_job ...]

Pièces modulaires du kit Kenney « Fantasy Town » (CC0) : grille de 1 × 1 × 1,
les murs sont posés sur le bord +x de leur case. Chaque maison est assemblée
par `maison()` et recolorée en modifiant la texture-palette du kit (enduit,
tuiles, bois) : une palette par maison.
Même caméra isométrique 2:1 que render.py.
"""
import bpy, sys, os, math, random, json
import numpy as np
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
FT = os.path.join(HERE, 'kits', 'fantasy-town-kit', 'Models', 'GLB format')
SUB = os.path.join(HERE, 'kits', 'city-kit-suburban', 'Models', 'GLB format')
PX_PER_UNIT = int(os.environ.get('ATELIER_PPU', '200'))
# Mode nuit (essai) : ATELIER_NUIT=1 → clair de lune, fenêtres et lanternes allumées
NUIT = os.environ.get('ATELIER_NUIT') == '1'

# ---------- Palettes ----------
# Zones de la texture-palette du kit (x0, y0, x1, y1 en pixels, origine en haut à gauche)
ZONES = {
    'enduit': (64, 256, 128, 384),
    'tuile_rouge': (0, 384, 64, 512),
    'tuile_verte': (64, 384, 128, 512),
    'bois': (256, 384, 320, 512),      # poutres du colombage, cadres et volets
    'planches': (320, 384, 384, 512),  # planches du pignon, porte
}
STYLES = {
    'creme': {'enduit': '#f6e7c8', 'tuile_rouge': '#c8553d', 'tuile_verte': '#c8553d', 'bois': '#5e3a26', 'planches': '#7a4a30'},
    'jaune': {'enduit': '#f7d98b', 'tuile_rouge': '#a63d32', 'tuile_verte': '#a63d32', 'bois': '#5a3724', 'planches': '#7a4a30'},
    'rose': {'enduit': '#f4c6bd', 'tuile_rouge': '#5b6b8c', 'tuile_verte': '#5b6b8c', 'bois': '#5e3a26', 'planches': '#7a4a30'},
    'blanc': {'enduit': '#fbf4ea', 'tuile_rouge': '#d96c3b', 'tuile_verte': '#d96c3b', 'bois': '#4f3122', 'planches': '#6b4029'},
    'vert': {'enduit': '#dfe8c9', 'tuile_rouge': '#b84a3a', 'tuile_verte': '#3f8a63', 'bois': '#5e3a26', 'planches': '#7a4a30'},
    'pierre': {'enduit': '#e2d6c1', 'tuile_rouge': '#2f8f8a', 'tuile_verte': '#2f8f8a', 'bois': '#4a2e20', 'planches': '#6b4029'},
}


def hex_rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


_images = {}


def style_image(base, style):
    key = (base.name, style)
    if key in _images:
        return _images[key]
    w, h = base.size
    px = np.array(base.pixels[:], dtype=np.float32).reshape(h, w, 4)
    for zone, col in STYLES[style].items():
        x0, y0, x1, y1 = ZONES[zone]
        # pixels Blender : origine en bas à gauche
        r = px[h - y1:h - y0, x0:x1]
        lum = r[..., :3] @ np.array([0.3, 0.59, 0.11])
        k = lum / max(lum.mean(), 1e-4)
        r[..., :3] = np.clip(hex_rgb(col)[None, None, :] * k[..., None], 0, 1)
    img = bpy.data.images.new(f'palette-{style}', w, h, alpha=True)
    img.pixels = px.ravel()
    img.pack()
    _images[key] = img
    return img


_mats = {}


def style_material(m, style, tuiles=False):
    key = (m.name, style, tuiles)
    if key not in _mats:
        c = m.copy()
        for n in c.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image:
                n.image = style_image(n.image, style)
                n.interpolation = 'Closest'
        if tuiles:
            ajoute_tuiles(c)
        _mats[key] = c
    return _mats[key]


def ajoute_tuiles(mat):
    """Motif de tuiles (rangées décalées + relief) sur les seules zones « toit » de la palette.

    Les rangées suivent la hauteur (coordonnées locales x / z de la pièce de toit),
    donc elles courent parallèlement au faîtage sur les deux pans.
    """
    nt = mat.node_tree
    N, L = nt.nodes, nt.links
    bsdf = next(n for n in N if n.type == 'BSDF_PRINCIPLED')
    tex = next(n for n in N if n.type == 'TEX_IMAGE')
    coord = N.new('ShaderNodeTexCoord')
    # Masque : zones toit de la palette (u < 0.25 et v < 0.25)
    sep_uv = N.new('ShaderNodeSeparateXYZ')
    L.new(coord.outputs['UV'], sep_uv.inputs[0])
    mu = N.new('ShaderNodeMath'); mu.operation = 'LESS_THAN'; mu.inputs[1].default_value = 0.25
    mv = N.new('ShaderNodeMath'); mv.operation = 'LESS_THAN'; mv.inputs[1].default_value = 0.25
    L.new(sep_uv.outputs[0], mu.inputs[0]); L.new(sep_uv.outputs[1], mv.inputs[0])
    masque = N.new('ShaderNodeMath'); masque.operation = 'MULTIPLY'
    L.new(mu.outputs[0], masque.inputs[0]); L.new(mv.outputs[0], masque.inputs[1])
    # Tuiles : texture « brique » sur (x, z) locaux
    sep = N.new('ShaderNodeSeparateXYZ')
    L.new(coord.outputs['Object'], sep.inputs[0])
    comb = N.new('ShaderNodeCombineXYZ')
    L.new(sep.outputs[0], comb.inputs[0]); L.new(sep.outputs[2], comb.inputs[1])
    brick = N.new('ShaderNodeTexBrick')
    brick.offset = 0.5
    brick.inputs['Color1'].default_value = (1, 1, 1, 1)
    brick.inputs['Color2'].default_value = (0.84, 0.84, 0.84, 1)
    brick.inputs['Mortar'].default_value = (0.55, 0.55, 0.55, 1)
    brick.inputs['Scale'].default_value = 1.0
    brick.inputs['Mortar Size'].default_value = 0.012
    brick.inputs['Bias'].default_value = 0.0
    brick.inputs['Brick Width'].default_value = 0.2
    brick.inputs['Row Height'].default_value = 0.11
    L.new(comb.outputs[0], brick.inputs['Vector'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    L.new(masque.outputs[0], mix.inputs['Factor'])
    L.new(tex.outputs['Color'], mix.inputs[6])
    L.new(brick.outputs['Color'], mix.inputs[7])
    L.new(mix.outputs[2], bsdf.inputs['Base Color'])
    # Relief des rangées
    force = N.new('ShaderNodeMath'); force.operation = 'MULTIPLY'; force.inputs[1].default_value = 0.6
    L.new(masque.outputs[0], force.inputs[0])
    bump = N.new('ShaderNodeBump'); bump.inputs['Distance'].default_value = 0.02
    L.new(force.outputs[0], bump.inputs['Strength'])
    L.new(brick.outputs['Fac'], bump.inputs['Height'])
    L.new(bump.outputs['Normal'], bsdf.inputs['Normal'])


# ---------- Scène ----------
def reset():
    _images.clear()
    _mats.clear()
    _lib.clear()
    _fmesh.clear()
    _touffe.clear()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try:
            sc.render.engine = eng
            break
        except TypeError:
            pass
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    # Ambiance chaude de fin de journée
    world = bpy.data.worlds.new('W')
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    bg.inputs[0].default_value = (1.0, 0.88, 0.78, 1)
    bg.inputs[1].default_value = 0.6
    sun = bpy.data.lights.new('Soleil', 'SUN')
    sun.energy = 3.4
    sun.angle = math.radians(4)  # ombres légèrement adoucies
    sun.color = (1.0, 0.86, 0.68)
    so = bpy.data.objects.new('Soleil', sun)
    so.rotation_euler = (math.radians(52), 0, math.radians(-35))
    sc.collection.objects.link(so)
    if NUIT:
        # nuit claire : ciel bleu nuit, lune froide qui garde les volumes lisibles
        bg.inputs[0].default_value = (0.16, 0.24, 0.5, 1)
        bg.inputs[1].default_value = 0.42
        sun.energy = 0.75
        sun.color = (0.62, 0.74, 1.0)
        sun.angle = math.radians(2)
        so.rotation_euler = (math.radians(48), 0, math.radians(-35))
        for attr in ('use_raytracing', 'use_gtao'):
            try:
                setattr(sc.eevee, attr, True)
            except AttributeError:
                pass
    return sc


LUMIERE = (1.0, 0.62, 0.28)


def _mat_lumiere(nom, force):
    m = bpy.data.materials.get(nom)
    if m:
        return m
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*LUMIERE, 1)
    b.inputs['Emission Color'].default_value = (*LUMIERE, 1)
    b.inputs['Emission Strength'].default_value = force
    return m


def appliquer_nuit(sc):
    """Avant le rendu de nuit : vitres des pièces du kit allumées, lanternes qui éclairent autour d'elles."""
    # fenêtres : les pièces de mur du kit ont des ouvertures ; un panneau lumineux placé dans l'épaisseur
    # du mur (repère local de la pièce : mur en x ≈ 0,425 → 0,475) n'est visible qu'à travers elles
    lum = _mat_lumiere('Fenetre', 5.0)
    for o in list(sc.objects):
        if o.type == 'MESH' and o.name.startswith('wall') and 'window' in o.name:
            me = bpy.data.meshes.new('vitre')
            me.from_pydata([(0.45, -0.46, 0.06), (0.45, 0.46, 0.06), (0.45, 0.46, 0.94), (0.45, -0.46, 0.94)], [], [(0, 1, 2, 3)])
            me.materials.append(lum)
            v = bpy.data.objects.new('vitre', me)
            sc.collection.objects.link(v)
            v.matrix_world = o.matrix_world.copy()
    for o in list(sc.objects):
        if o.type == 'MESH' and o.name.startswith('lantern'):
            pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
            x = sum(p.x for p in pts) / 8; y = sum(p.y for p in pts) / 8
            z0 = min(p.z for p in pts); z1 = max(p.z for p in pts)
            li = bpy.data.lights.new('lanterne', 'POINT')
            li.energy = 30.0
            li.color = LUMIERE
            li.shadow_soft_size = 0.05
            li.use_shadow = False  # la lumière sort de la lanterne (sinon sa tête fait écran)
            lo = bpy.data.objects.new('lanterne', li)
            lo.location = (x, y, z0 + 0.78 * (z1 - z0))
            sc.collection.objects.link(lo)
            # petit globe lumineux
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.035, location=lo.location, segments=12, ring_count=8)
            g = bpy.context.active_object
            gm = bpy.data.materials.get('Globe') or bpy.data.materials.new('Globe')
            gm.use_nodes = True
            gb = gm.node_tree.nodes.get('Principled BSDF')
            gb.inputs['Base Color'].default_value = (*LUMIERE, 1)
            gb.inputs['Emission Color'].default_value = (*LUMIERE, 1)
            gb.inputs['Emission Strength'].default_value = 4.0
            g.data.materials.append(gm)


_lib = {}


def piece(name, x, y, z=0.0, rot=0, style=None, scale=(1, 1, 1), kit=FT, tuiles=False):
    """Pose une copie d'une pièce du kit (importée une seule fois)."""
    path = os.path.join(kit, f'{name}.glb')
    if path not in _lib:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=path)
        new = [o for o in bpy.data.objects if o not in before]
        for o in new:
            for c in list(o.users_collection):
                c.objects.unlink(o)
        _lib[path] = new
    src = _lib[path]
    copies = {o: o.copy() for o in src}
    for o, c in copies.items():
        if o.parent in copies:
            c.parent = copies[o.parent]
        bpy.context.scene.collection.objects.link(c)
        if style and c.type == 'MESH':
            for slot in c.material_slots:
                if slot.material:
                    m = slot.material
                    slot.link = 'OBJECT'
                    slot.material = style_material(m, style, tuiles)
    t = Matrix.Translation((x, y, z)) @ Matrix.Rotation(math.radians(rot), 4, 'Z') @ Matrix.Diagonal((*scale, 1))
    for o, c in copies.items():
        if o.parent not in copies:
            c.matrix_world = t @ o.matrix_world
    return list(copies.values())


SIDE_ROT = {'+x': 0, '+y': 90, '-x': 180, '-y': 270}

# Échelle des pièces du kit dans une parcelle de 3 × 3 : une case de maison = 0,5.
# (Les maisons restent petites pour laisser la place aux grands bâtiments et aux merveilles.)
K = 0.5
# Hauteur des maisons : plus basses que larges (étages et toits tassés),
# pour garder de la marge aux grands bâtiments et aux merveilles
K_HAUT = 0.36


RDC = ['wall-window-shutters', 'wall-window-shutters', 'wall', 'wall-window-small']
ETAGE = ['wall-window-shutters', 'wall-detail-cross', 'wall-window-shutters', 'wall-detail-diagonal']


def maison(cx, cy, W, D, etages, style, seed=1, cheminee=True, toit='high', k=K, kz=None,
           rdc=RDC, etage=ETAGE, porte_piece='wall-door', toit_z=None):
    """Maison à colombage : RDC en enduit (porte + volets), étages à pans de bois."""
    rnd = random.Random(seed)
    objs = []
    x0, y0 = cx - W * k / 2, cy - D * k / 2
    porte = (W - 1) // 2
    kz = kz or K_HAUT
    s = (k, k, kz)
    for f in range(etages):
        for i in range(W):
            for j in range(D):
                ccx, ccy = x0 + (i + 0.5) * k, y0 + (j + 0.5) * k
                sides = []
                if i == W - 1: sides.append('+x')
                if i == 0: sides.append('-x')
                if j == D - 1: sides.append('+y')
                if j == 0: sides.append('-y')
                for sd in sides:
                    if f == 0:
                        if sd == '-y' and i == porte:
                            p = porte_piece
                        else:
                            p = rnd.choice(rdc)
                    else:
                        p = rnd.choice(etage)
                    objs += piece(p, ccx, ccy, f * kz, SIDE_ROT[sd], style, s)
    # Toit à deux pans, faîtage dans le sens de la longueur
    zt = etages * kz
    along_x = W >= D
    n, depth = (W, D) if along_x else (D, W)
    for q in range(n):
        if along_x:
            px, py, rot = x0 + (q + 0.5) * k, cy, 0
        else:
            px, py, rot = cx, y0 + (q + 0.5) * k, 90
        name = 'roof-high-gable' if toit == 'high' else 'roof-gable'
        objs += piece(name, px, py, zt, rot, style, (k, depth * k, (toit_z or (0.55 + 0.3 * depth)) * kz), tuiles=True)
    if cheminee:
        objs += piece('chimney', x0 + (W - 0.9) * k, cy, zt - 0.1 * kz, 0, style, s)
    return objs


def deco(name, x, y, rot=0, s=1.0, z=0.0, kit=FT, style=None):
    """Objet de décor à l'échelle de la parcelle."""
    return piece(name, x, y, z, rot, style, (K * s, K * s, K * s), kit)


def bordure(name, cote, sauf=(), s_h=1.0):
    """Rangée (haie, clôture) le long d'un bord de la parcelle, par segments de K."""
    o = []
    for idx in range(round(3 / K)):
        if idx in sauf:
            continue
        t = -1.5 + K * (idx + 0.5)
        x, y = {'-x': (-1.5 + K / 2, t), '+x': (1.5 - K / 2, t), '+y': (t, 1.5 - K / 2), '-y': (t, -1.5 + K / 2)}[cote]
        o += piece(name, x, y, 0, SIDE_ROT[cote], None, (K, K, K * s_h))
    return o


def allee(x, y0, y1, larg=K * 0.6):
    """Allée pavée (mêmes pavés que les routes), le long de l'axe y, de y0 (haut) à y1."""
    a, b = y0 + K / 2, y1 - K / 2
    return [dalle(larg, a - b, mat_paves(), 0.012, 0.03, x, (a + b) / 2)]


# Largeur des routes qui pourront séparer les parcelles (en unités ; une parcelle = 3)
ROUTE = 0.6


def mat_herbe():
    """Herbe nuancée (taches claires / foncées), calculée en coordonnées monde :
    deux parcelles voisines se raccordent sans couture."""
    m = bpy.data.materials.get('Herbe')
    if m:
        return m
    m = bpy.data.materials.new('Herbe')
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF')
    b.inputs['Roughness'].default_value = 1.0
    geo = N.new('ShaderNodeNewGeometry')
    bruit = N.new('ShaderNodeTexNoise')
    bruit.inputs['Scale'].default_value = 1.3
    bruit.inputs['Detail'].default_value = 4.0
    L.new(geo.outputs['Position'], bruit.inputs['Vector'])
    rampe = N.new('ShaderNodeValToRGB')
    rampe.color_ramp.elements[0].position = 0.35
    rampe.color_ramp.elements[0].color = (0.20, 0.45, 0.13, 1)
    rampe.color_ramp.elements[1].position = 0.7
    rampe.color_ramp.elements[1].color = (0.36, 0.62, 0.22, 1)
    L.new(bruit.outputs['Fac'], rampe.inputs['Fac'])
    if not HERBE_TEXTUREE:
        L.new(rampe.outputs['Color'], b.inputs['Base Color'])
        return m
    # Texture fine : moucheture (petites touffes plus claires / plus sombres) + relief
    fin = N.new('ShaderNodeTexNoise')
    fin.inputs['Scale'].default_value = 38.0
    fin.inputs['Detail'].default_value = 2.0
    L.new(geo.outputs['Position'], fin.inputs['Vector'])
    mouch = N.new('ShaderNodeValToRGB')
    mouch.color_ramp.elements[0].position = 0.3
    mouch.color_ramp.elements[0].color = (0.8, 0.84, 0.78, 1)
    mouch.color_ramp.elements[1].position = 0.7
    mouch.color_ramp.elements[1].color = (1.12, 1.15, 1.0, 1)
    L.new(fin.outputs['Fac'], mouch.inputs['Fac'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    L.new(rampe.outputs['Color'], mix.inputs[6]); L.new(mouch.outputs['Color'], mix.inputs[7])
    # Taches de trèfle / herbe plus foncée (cellules)
    vor = N.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 9.0
    vor.inputs['Randomness'].default_value = 1.0
    L.new(geo.outputs['Position'], vor.inputs['Vector'])
    tache = N.new('ShaderNodeMath'); tache.operation = 'LESS_THAN'; tache.inputs[1].default_value = 0.12
    L.new(vor.outputs['Distance'], tache.inputs[0])
    mix2 = N.new('ShaderNodeMix'); mix2.data_type = 'RGBA'; mix2.blend_type = 'MULTIPLY'
    f2 = N.new('ShaderNodeMath'); f2.operation = 'MULTIPLY'; f2.inputs[1].default_value = 0.35
    L.new(tache.outputs[0], f2.inputs[0]); L.new(f2.outputs[0], mix2.inputs['Factor'])
    mix2.inputs[7].default_value = (0.55, 0.72, 0.45, 1)
    L.new(mix.outputs[2], mix2.inputs[6])
    L.new(mix2.outputs[2], b.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35; bump.inputs['Distance'].default_value = 0.01
    L.new(fin.outputs['Fac'], bump.inputs['Height'])
    L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


# Test « herbe texturée » (matériau + touffes 3D) : ATELIER_HERBE=0 pour comparer sans
HERBE_TEXTUREE = os.environ.get('ATELIER_HERBE', '1') == '1'
_touffe = {}


def maillage_touffe(nom, couleur):
    """Petite touffe : 5 brins (triangles fins) qui s'écartent du centre."""
    if nom in _touffe:
        return _touffe[nom]
    verts, faces = [], []
    for i in range(5):
        a = i / 5 * math.tau + 0.3
        ca, sa = math.cos(a), math.sin(a)
        h = 0.045 + 0.012 * (i % 2)
        base = len(verts)
        verts += [(-0.007 * sa, 0.007 * ca, 0), (0.007 * sa, -0.007 * ca, 0), (0.022 * ca, 0.022 * sa, h)]
        faces.append((base, base + 1, base + 2))
    me = bpy.data.meshes.new(nom)
    me.from_pydata(verts, [], faces)
    me.materials.append(_mat('m' + nom, couleur, 1.0))
    _touffe[nom] = me
    return me


def touffes(demi, n, seed=1):
    """Sème des touffes d'herbe uniquement sur le sol herbeux (rayon vertical : pas sur les chemins ni le décor)."""
    rnd = random.Random(seed)
    objs = []
    for _ in range(n):
        x, y = rnd.uniform(-demi, demi), rnd.uniform(-demi, demi)
        ok, loc, _, _, obj, _ = _rayon(Vector((x, y, 6)), Vector((0, 0, -1)))
        if not ok or not obj.name.startswith('herbe'):
            continue
        me = maillage_touffe(*rnd.choice([('t1', '#3d8a2e'), ('t2', '#5aa83a'), ('t3', '#2f7426')]))
        o = bpy.data.objects.new('touffe', me)
        o.location = loc
        o.rotation_euler = (0, 0, rnd.uniform(0, math.tau))
        sc = rnd.uniform(0.7, 1.4)
        o.scale = (sc, sc, sc)
        bpy.context.scene.collection.objects.link(o)
        objs.append(o)
    return objs


def mat_paves(nom='Paves', base=(0.62, 0.57, 0.50)):
    """Pavés irréguliers (cellules de Voronoï), joints sombres et teinte variable, en coordonnées monde."""
    m = bpy.data.materials.get(nom)
    if m:
        return m
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF')
    b.inputs['Roughness'].default_value = 0.95
    geo = N.new('ShaderNodeNewGeometry')
    vor = N.new('ShaderNodeTexVoronoi')
    vor.feature = 'DISTANCE_TO_EDGE'
    vor.inputs['Scale'].default_value = 6.0
    L.new(geo.outputs['Position'], vor.inputs['Vector'])
    cell = N.new('ShaderNodeTexVoronoi')
    cell.inputs['Scale'].default_value = 6.0
    L.new(geo.outputs['Position'], cell.inputs['Vector'])
    joint = N.new('ShaderNodeValToRGB')
    joint.color_ramp.elements[0].position = 0.0
    joint.color_ramp.elements[0].color = (0.25, 0.22, 0.2, 1)
    joint.color_ramp.elements[1].position = 0.06
    joint.color_ramp.elements[1].color = (*base, 1)
    L.new(vor.outputs['Distance'], joint.inputs['Fac'])
    teinte = N.new('ShaderNodeMix'); teinte.data_type = 'RGBA'; teinte.blend_type = 'MULTIPLY'
    teinte.inputs['Factor'].default_value = 0.12
    L.new(joint.outputs['Color'], teinte.inputs[6])
    L.new(cell.outputs['Color'], teinte.inputs[7])
    L.new(teinte.outputs[2], b.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.5; bump.inputs['Distance'].default_value = 0.02
    L.new(vor.outputs['Distance'], bump.inputs['Height'])
    L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def dalle(w, d, mat, z_haut=0.0, epais=0.15, x=0.0, y=0.0):
    """Plaque de sol (parcelle ou route), dessus à z_haut."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, y, z_haut))
    g = bpy.context.active_object
    g.scale = (w, d, 1)
    g.data.materials.append(mat)
    if epais:
        bpy.ops.object.modifier_add(type='SOLIDIFY')
        g.modifiers[-1].thickness = epais
    return g


def add_ground(w, d, sol='herbe'):
    """Sol plat d'une parcelle, au même niveau que les routes (ce sont les routes qui portent l'épaisseur)."""
    g = dalle(w, d, mat_paves() if sol == 'paves' else mat_herbe(), 0.0, 0)
    g.name = 'herbe' if sol == 'herbe' else 'sol'
    return g


FLEURS = ['#ff6fa3', '#ffd23f', '#e8443a', '#ffffff', '#b07cff', '#ff9a3c']
_fmesh = {}


def _mat(nom, hexa, rough=0.9):
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*[c ** 2.2 for c in hex_rgb(hexa)], 1)
    b.inputs['Roughness'].default_value = rough
    return m


def _mesh(cle, rayon, hexa):
    if cle not in _fmesh:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=rayon)
        o = bpy.context.active_object
        me = o.data
        me.materials.append(_mat(cle, hexa))
        bpy.data.objects.remove(o)
        _fmesh[cle] = me
    return _fmesh[cle]


def fleurs(x, y, w, d, n=14, seed=1, couleurs=None):
    """Massif de fleurs : touffes de feuillage + petites fleurs de couleur, dans un rectangle w × d."""
    rnd = random.Random(seed)
    couleurs = couleurs or FLEURS
    objs = []
    for _ in range(n):
        px, py = x + (rnd.random() - 0.5) * w, y + (rnd.random() - 0.5) * d
        f = bpy.data.objects.new('feuilles', _mesh('feuilles', 0.055, '#3f8f3a'))
        f.location = (px, py, 0.035)
        f.scale = (1, 1, 0.75)
        bpy.context.scene.collection.objects.link(f)
        objs.append(f)
        c = rnd.choice(couleurs)
        for _ in range(3):
            fl = bpy.data.objects.new('fleur', _mesh('f' + c, 0.022, c))
            fl.location = (px + (rnd.random() - 0.5) * 0.08, py + (rnd.random() - 0.5) * 0.08, 0.07 + rnd.random() * 0.02)
            bpy.context.scene.collection.objects.link(fl)
            objs.append(fl)
    return objs


def courbe(points, pas=0.04):
    """Courbe lisse (Catmull-Rom) passant par les points ; renvoie des points régulièrement espacés."""
    P = [Vector((x, y)) for x, y in points]
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int((p2 - p1).length / pas))
        for j in range(n):
            t = j / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t))
    out.append(P[-2])
    return out


def chemin(points, larg=0.26, seed=1):
    """Chemin pavé organique : ruban courbe de largeur irrégulière, mêmes pavés que les routes.
    Le dernier point doit être sur un bord de la parcelle (±1.5) pour rejoindre la route."""
    rnd = random.Random(seed)
    pts = courbe(points)
    ph = [rnd.uniform(0, 6.28) for _ in range(4)]
    verts, faces = [], []
    for i, p in enumerate(pts):
        a = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]
        a.normalize()
        nrm = Vector((-a.y, a.x))
        t = i * 0.35
        # bords gauche / droit qui ondulent indépendamment
        g = larg / 2 * (1 + 0.18 * math.sin(t + ph[0]) + 0.08 * math.sin(2.7 * t + ph[1]))
        d = larg / 2 * (1 + 0.18 * math.sin(1.3 * t + ph[2]) + 0.08 * math.sin(3.1 * t + ph[3]))
        if i == len(pts) - 1 or i == 0:
            g = d = larg / 2
        l, r = p + nrm * g, p - nrm * d
        verts += [(l.x, l.y, 0.014), (r.x, r.y, 0.014)]
        if i:
            k = 2 * i
            faces.append((k - 2, k - 1, k + 1, k))
    me = bpy.data.meshes.new('chemin')
    me.from_pydata(verts, [], faces)
    me.materials.append(mat_paves())
    o = bpy.data.objects.new('chemin', me)
    bpy.context.scene.collection.objects.link(o)
    return [o], [(p.x, p.y) for p in pts]


def _rayon(origine, direction):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    return bpy.context.scene.ray_cast(dg, origine, direction)


def fruits_arbre(arbre, n, seed=1, couleur='#e0322b'):
    """Fruits posés SUR le feuillage : rayons lancés de l'extérieur vers le cœur du houppier."""
    rnd = random.Random(seed)
    mesh = [o for o in arbre if o.type == 'MESH']
    pts = [o.matrix_world @ Vector(c) for o in mesh for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z + 0.62 * (hi.z - lo.z)))
    objs, essais = [], 0
    while len(objs) < n and essais < n * 8:
        essais += 1
        a, e = rnd.uniform(0, math.tau), math.radians(rnd.uniform(-25, 55))
        d = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)))
        ok, loc, nrm, _, obj, _ = _rayon(centre + d * 3, -d)
        if not ok or obj.name not in {m.name for m in mesh}:
            continue
        f = bpy.data.objects.new('fruit', _mesh('fruit' + couleur, 0.024, couleur))
        f.location = loc + nrm * 0.012
        bpy.context.scene.collection.objects.link(f)
        objs.append(f)
    return objs


def fruits_poses(x, y, rayon, n, seed=1, couleur='#e0322b'):
    """Fruits posés sur ce qui se trouve dessous (sol, charrette) : rayon vertical."""
    rnd = random.Random(seed)
    objs = []
    for _ in range(n):
        a, r = rnd.uniform(0, math.tau), rayon * math.sqrt(rnd.random())
        ok, loc, *_ = _rayon(Vector((x + math.cos(a) * r, y + math.sin(a) * r, 5)), Vector((0, 0, -1)))
        if not ok:
            continue
        f = bpy.data.objects.new('fruit', _mesh('fruit' + couleur, 0.024, couleur))
        f.location = loc + Vector((0, 0, 0.02))
        bpy.context.scene.collection.objects.link(f)
        objs.append(f)
    return objs


def porte(cx, cy, W, D, k=K):
    """Point juste devant la porte d'une maison (façade -y)."""
    return (cx - W * k / 2 + ((W - 1) // 2 + 0.5) * k, cy - D * k / 2 - 0.04)


# ---------- Parcelles (3 × 3 unités, façade vers -y = côté gauche de l'image) ----------
# Les chemins partent des portes et rejoignent la route par des côtés différents.
def p_maison_creme():
    o = maison(0.15, 0.4, 2, 1, 2, 'creme', seed=3)
    o += chemin([porte(0.15, 0.4, 2, 1), (-0.05, -0.25), (0.35, -0.45), (0.9, -0.38), (1.25, -0.2), (1.5, -0.2)], seed=1)[0]
    o += bordure('hedge', '-x', sauf=(0,)) + bordure('hedge', '+y', sauf=(5,))
    o += deco('tree-high-round', -1.05, 1.05, s=0.9)
    o += deco('tree', 1.1, 1.0, s=0.8)
    o += deco('tree-crooked', 1.1, -1.05, s=0.7)
    o += deco('planter', 0.45, 0.0, kit=SUB, s=1.4)
    o += deco('planter', -0.55, 0.0, kit=SUB, s=1.4)
    o += deco('lantern', 0.05, -0.65, s=0.7)
    o += deco('stall-bench', 0.55, -0.95, rot=0, s=0.8)
    o += deco('tree-small', -0.75, -0.85, kit=SUB, s=1.4)
    o += deco('tree-small', -1.15, -1.15, kit=SUB, s=1.2)
    o += deco('rock-small', 0.05, -1.2, s=0.6)
    o += fleurs(0.4, -0.05, 0.45, 0.12, 8, 1) + fleurs(-0.55, -0.12, 0.4, 0.12, 7, 2)
    o += fleurs(0.75, -0.7, 0.35, 0.12, 6, 3) + fleurs(-0.95, 0.4, 0.5, 0.5, 12, 4)
    return o


def p_maison_jaune():
    o = maison(0.25, 0.4, 2, 2, 2, 'jaune', seed=7)
    # sortie sur le côté droit, par la barrière ouverte
    o += chemin([porte(0.25, 0.4, 2, 2), (0.1, -0.5), (0.55, -0.85), (1.05, -1.15), (1.5, -1.25)], seed=2)[0]
    o += bordure('fence', '-y') + bordure('fence', '+x', sauf=(0,))
    o += bordure('hedge', '-x')
    o += deco('tree', -1.0, 1.05, s=0.85)
    o += deco('tree-high', -0.55, 1.15, s=0.7)
    o += deco('tree-high-round', 1.1, 1.1, s=0.8)
    o += deco('cart', 1.0, -0.35, rot=40, s=0.6)
    o += deco('planter', -0.45, -0.75, kit=SUB, s=1.4)
    o += deco('planter', -0.45, -1.1, kit=SUB, s=1.4)
    o += deco('lantern', -0.3, -0.1, s=0.7)
    o += deco('tree-small', -1.05, -1.1, kit=SUB, s=1.3)
    o += fleurs(-0.85, -0.4, 0.5, 0.6, 14, 5, ['#ff6fa3', '#ffffff', '#b07cff'])
    o += fleurs(0.55, -0.15, 0.6, 0.15, 8, 6) + fleurs(0.25, -1.2, 0.5, 0.2, 8, 7, ['#ffd23f', '#ff9a3c'])
    return o


def p_maison_rose():
    o = maison(-0.1, 0.55, 2, 1, 2, 'rose', seed=5)
    # sortie par le côté gauche (trouée dans la haie)
    o += chemin([porte(-0.1, 0.55, 2, 1), (-0.45, -0.05), (-0.85, -0.25), (-1.2, -0.5), (-1.5, -0.5)], seed=3)[0]
    o += bordure('hedge', '+y') + bordure('hedge', '-x', sauf=(1, 2))
    o += deco('fountain-round', 0.7, -0.55, s=0.55)  # bassin du jardin
    o += deco('tree-crooked', -1.05, -1.05, s=0.8)
    o += deco('tree-high-round', 1.1, 0.9, s=0.8)
    o += deco('tree', -1.0, 0.95, s=0.7)
    o += deco('stall-bench', 0.6, 0.15, rot=0, s=0.7)
    o += deco('lantern', -0.05, -0.35, s=0.7)
    o += deco('planter', -0.75, 0.15, kit=SUB, s=1.3)
    o += deco('tree-small', 1.15, -1.15, kit=SUB, s=1.3)
    o += deco('rock-small', -0.45, -0.75, s=0.5)
    o += fleurs(1.05, -0.2, 0.3, 0.4, 7, 8) + fleurs(0.25, -1.1, 0.4, 0.3, 7, 17) + fleurs(0.1, 0.18, 0.5, 0.12, 6, 9, ['#ff6fa3', '#ffffff'])
    o += fleurs(-1.0, 0.3, 0.4, 0.3, 8, 10, ['#e8443a', '#ffd23f'])
    return o


def p_auberge():
    o = maison(0.1, 0.45, 3, 2, 3, 'blanc', seed=11)
    o += deco('banner-red', 0.1, -0.05, z=0.42, rot=270, s=0.7)
    o += chemin([porte(0.1, 0.45, 3, 2), (0.15, -0.45), (-0.1, -0.9), (-0.05, -1.25), (-0.05, -1.5)], larg=0.32, seed=4)[0]
    # Terrasse : tables et tabourets
    o += deco('stall-bench', -0.85, -0.85, rot=0, s=0.8) + deco('stall-stool', -0.85, -0.55, s=0.8) + deco('stall-stool', -0.85, -1.15, s=0.8)
    o += deco('stall-bench', 0.95, -0.85, rot=0, s=0.8) + deco('stall-stool', 0.95, -0.55, s=0.8) + deco('stall-stool', 0.95, -1.15, s=0.8)
    o += deco('cart', 1.0, 0.3, rot=100, s=0.6)
    o += deco('lantern', -0.45, -1.2, s=0.7) + deco('lantern', 0.45, -1.2, s=0.7)
    o += bordure('hedge', '-x', sauf=(1, 2, 3, 4)) + bordure('hedge', '+y', sauf=(1, 2, 3, 4))
    o += deco('tree-high-round', -1.1, 1.1, s=0.85)
    o += deco('tree', 1.15, 1.1, s=0.7) + deco('tree-high', -0.7, 1.2, s=0.6) + deco('tree-small', 1.2, 0.55, kit=SUB, s=1.4)
    o += fleurs(-0.55, -0.05, 0.5, 0.12, 7, 11) + fleurs(0.75, -0.05, 0.5, 0.12, 7, 12)
    o += fleurs(-1.0, 0.6, 0.5, 0.5, 9, 13, ['#e8443a', '#ffffff'])
    return o


def p_place():
    o = deco('fountain-round', 0, 0, s=1.3)
    o += deco('stall-red', -0.95, 0.95, s=1.0)
    o += deco('stall-green', 0.95, 0.95, s=1.0)
    o += deco('stall', -0.95, -0.2, rot=90, s=0.9)
    o += deco('lantern', -1.2, -1.2, s=0.8) + deco('lantern', 1.2, -1.2, s=0.8)
    o += deco('stall-bench', 0, -1.05, s=0.8) + deco('stall-bench', 1.05, -0.2, rot=90, s=0.8)
    o += deco('tree-high-round', 0, 1.2, s=0.7)
    o += deco('planter', -0.55, -1.15, kit=SUB, s=1.4) + deco('planter', 0.55, -1.15, kit=SUB, s=1.4)
    o += deco('cart', 1.05, -0.95, rot=-30, s=0.6)
    o += fleurs(0.95, 0.4, 0.35, 0.3, 6, 14) + fleurs(-0.5, -0.75, 0.35, 0.25, 6, 15)
    o += fleurs(-0.6, 0.85, 0.4, 0.2, 5, 16, ['#ffd23f', '#ff6fa3'])
    return o


def porte_x(cx, W, k=K):
    """Abscisse de la porte d'une maison (cellule (W-1)//2 de la façade -y)."""
    return cx - W * k / 2 + ((W - 1) // 2 + 0.5) * k


def p_hameau_2(styles=('vert', 'rose'), seed=21):
    """Deux maisons : une à étage au fond, une chaumière à l'avant droit, reliées par un chemin."""
    o = maison(-0.45, 0.75, 2, 1, 2, styles[0], seed=seed)
    o += maison(0.8, -0.35, 2, 1, 1, styles[1], seed=seed + 1, cheminee=False)
    a, b = porte(-0.45, 0.75, 2, 1), porte(0.8, -0.35, 2, 1)
    # maison du fond → côté gauche ; chaumière → bord avant ; et un chemin entre les deux
    o += chemin([a, (-0.85, 0.3), (-1.2, 0.25), (-1.5, 0.25)], seed=seed)[0]
    o += chemin([a, (-0.45, 0.05), (0.05, -0.25), (0.45, -0.75), (0.5, -1.1), (0.4, -1.5)], seed=seed + 1)[0]
    o += chemin([b, (0.45, -0.75)], larg=0.22, seed=seed + 2)[0]
    o += bordure('hedge', '-x', sauf=(3,)) + bordure('hedge', '+y', sauf=(0,))
    o += deco('tree-high-round', 1.1, 1.1, s=0.8) + deco('tree', 0.55, 1.15, s=0.6)
    o += deco('tree-crooked', -1.1, -0.9, s=0.7)
    o += deco('lantern', -0.3, -0.45, s=0.7)
    o += deco('stall-bench', -0.8, -0.3, rot=0, s=0.7)
    o += deco('planter', 0.25, 0.3, kit=SUB, s=1.3)
    o += fleurs(-0.95, 0.65, 0.3, 0.2, 6, 31) + fleurs(0.15, 0.45, 0.35, 0.2, 6, 32, ['#ff6fa3', '#ffffff'])
    o += fleurs(1.2, -0.6, 0.2, 0.5, 6, 33) + fleurs(-0.2, -0.95, 0.4, 0.3, 7, 34, ['#ffd23f', '#e8443a'])
    return o


def p_hameau_3():
    """Trois petites maisons autour d'une courette pavée."""
    o = maison(-0.65, 0.8, 2, 1, 1, 'creme', seed=41)
    o += maison(0.75, 0.8, 1, 1, 2, 'jaune', seed=42, cheminee=False)
    o += maison(0.7, -0.6, 2, 1, 1, 'blanc', seed=43)
    # courette ronde au centre
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.42, depth=0.02, location=(-0.05, 0.05, 0.01))
    c = bpy.context.active_object
    c.scale = (1.25, 0.85, 1)
    c.data.materials.append(mat_paves())
    o.append(c)
    o += chemin([porte(-0.65, 0.8, 2, 1), (-0.6, 0.25)], larg=0.22, seed=41)[0]
    o += chemin([porte(0.75, 0.8, 1, 1), (0.45, 0.2)], larg=0.22, seed=42)[0]
    o += chemin([(-0.5, -0.05), (-0.95, -0.15), (-1.25, 0.0), (-1.5, 0.0)], seed=43)[0]  # vers la gauche
    o += chemin([porte(0.7, -0.6, 2, 1), (0.3, -1.05), (0.35, -1.3), (0.3, -1.5)], seed=44)[0]  # vers l'avant
    o += deco('lantern', 0.1, 0.05, s=0.75)
    o += deco('stall-bench', -0.25, -0.3, rot=0, s=0.6)
    o += bordure('hedge', '-x', sauf=(2, 3))
    o += deco('tree-high-round', -1.1, 1.15, s=0.7) + deco('tree', 1.2, 1.2, s=0.55)
    o += deco('tree', -1.1, -1.1, s=0.6) + deco('tree-small', 1.2, -1.2, kit=SUB, s=1.3)
    o += deco('cart', -0.9, -0.7, rot=80, s=0.5)
    o += fleurs(-0.65, 0.45, 0.6, 0.12, 7, 51) + fleurs(0.95, 0.45, 0.25, 0.12, 4, 52, ['#ff6fa3'])
    o += fleurs(-0.25, -0.95, 0.4, 0.25, 6, 53) + fleurs(1.05, -1.05, 0.25, 0.3, 5, 54, ['#b07cff', '#ffffff'])
    return o


def p_verger():
    """Verger « naturel » : arbres fruitiers semés au hasard (espacement minimal), tailles variées,
    fruits accrochés au feuillage, chemin sinueux de la cabane à la route, cueillette dans la charrette."""
    rnd = random.Random(2024)
    o = []
    o += maison(0.85, 0.95, 1, 1, 1, 'vert', seed=91, cheminee=False)
    ch, sentier = chemin([porte(0.85, 0.95, 1, 1), (0.5, 0.35), (0.0, 0.2), (-0.55, -0.15), (-1.1, -0.5), (-1.5, -0.5)], larg=0.22, seed=92)
    o += ch
    pts = []
    def libre(x, y, dmin):
        if abs(x - 0.85) < 0.5 and abs(y - 0.95) < 0.45:
            return False
        if abs(x + 0.75) < 0.35 and abs(y + 1.05) < 0.3:  # charrette
            return False
        if any(math.hypot(x - sx, y - sy) < 0.25 for sx, sy in sentier):
            return False
        return all(math.hypot(x - px, y - py) > dmin for px, py, _ in pts)
    essais = 0
    while len(pts) < 13 and essais < 4000:
        essais += 1
        x, y = rnd.uniform(-1.25, 1.25), rnd.uniform(-1.25, 1.25)
        s = rnd.uniform(0.3, 0.5)
        if libre(x, y, 0.33 + s * 0.35):
            pts.append((x, y, s))
    arbres = []
    for i, (x, y, s) in enumerate(pts):
        if i % 5 == 4:
            o += deco('tree-small', x, y, rot=rnd.uniform(0, 360), kit=SUB, s=s * 3.2)  # buisson
        else:
            lx, lz = rnd.uniform(1.35, 1.6), rnd.uniform(0.75, 0.9)
            a = piece('tree-high-round', x, y, 0, rnd.uniform(0, 360), None, (K * s * lx, K * s * lx, K * s * lz))
            o += a
            arbres.append((a, x, y, i))
    # fruits : après avoir posé tous les arbres (les rayons voient la scène complète)
    for a, x, y, i in arbres:
        coul = rnd.choice(['#e0322b', '#e0322b', '#ff8c1a', '#ffd23f'])
        o += fruits_arbre(a, rnd.randint(7, 11), seed=i, couleur=coul)
        if rnd.random() < 0.5:
            o += fruits_poses(x + 0.1, y - 0.08, 0.08, 2, seed=100 + i, couleur=coul)
    o += deco('cart', -0.75, -1.05, rot=25, s=0.6)
    o += fruits_poses(-0.75, -1.05, 0.07, 12, seed=7)
    o += deco('wheel', -0.3, -1.25, rot=70, s=0.45)
    for i in range(7):
        fx, fy = rnd.uniform(-1.2, 1.2), rnd.uniform(-1.2, 1.2)
        if all(math.hypot(fx - sx, fy - sy) > 0.25 for sx, sy in sentier):
            o += fleurs(fx, fy, 0.25, 0.25, 3, 200 + i, ['#ffffff', '#ffd23f', '#b07cff'])
    o += bordure('fence', '-x', sauf=(1, 2)) + bordure('hedge', '+y', sauf=(0, 1, 2))
    return o


# ---------- Grand bâtiment : salle d'escalade (2 × 2 parcelles, terrain 6 × 6) ----------
PRISES = ['#ff5a5f', '#ffd23f', '#2fbf71', '#3d8bff', '#b07cff', '#ff9a3c', '#ffffff', '#1d1d1d']


def boite(nom, taille, pos, hexa, parent=None, rough=0.85):
    """Pavé simple (panneau, tapis, socle) : taille = (x, y, z), pos = centre."""
    me = bpy.data.meshes.new(nom)
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= taille[0]; v.co.y *= taille[1]; v.co.z *= taille[2]
    bm.to_mesh(me)
    bm.free()
    cle = 'm' + hexa
    mat = bpy.data.materials.get(cle) or _mat(cle, hexa, rough)
    me.materials.append(mat)
    o = bpy.data.objects.new(nom, me)
    o.location = pos
    if parent:
        o.parent = parent
    bpy.context.scene.collection.objects.link(o)
    return o


def mur_escalade(cx, cy, larg, haut, incl, couleur, seed=1, n=34):
    """Pan d'escalade face à -y, incliné en dévers de `incl` degrés, couvert de prises colorées."""
    rnd = random.Random(seed)
    pivot = bpy.data.objects.new('pivot', None)
    pivot.location = (cx, cy, 0.06)
    pivot.rotation_euler = (math.radians(incl), 0, 0)
    bpy.context.scene.collection.objects.link(pivot)
    objs = [boite('panneau', (larg, 0.06, haut), (0, 0.03, haut / 2), couleur, pivot)]
    # cadre bois
    objs += [boite('montant', (0.06, 0.1, haut + 0.04), (sx * (larg / 2 + 0.03), 0.05, haut / 2), '#7a4a30', pivot) for sx in (-1, 1)]
    objs.append(boite('linteau', (larg + 0.12, 0.1, 0.06), (0, 0.05, haut + 0.03), '#7a4a30', pivot))
    for _ in range(n):
        c = rnd.choice(PRISES)
        r = rnd.uniform(0.022, 0.045)
        h = bpy.data.objects.new('prise', _mesh(f'p{c}{r:.3f}', r, c))
        h.location = (rnd.uniform(-larg / 2 + 0.06, larg / 2 - 0.06), -0.005, rnd.uniform(0.1, haut - 0.08))
        h.scale = (1, 0.6, 1)
        h.parent = pivot
        bpy.context.scene.collection.objects.link(h)
        objs.append(h)
    # contrefort à l'arrière (le dévers ne tient pas tout seul)
    objs.append(boite('jambe', (larg * 0.8, 0.06, 0.06), (cx, cy + 0.3, haut * 0.55), '#7a4a30'))
    bpy.context.view_layer.update()
    return objs


def p_salle():
    # Halle en pierre : grandes verrières au RDC, oculus et colombage à l'étage, toit teal
    o = maison(0.1, 1.15, 6, 3, 2, 'pierre', seed=71, kz=0.68, cheminee=False,
               rdc=['wall-window-glass', 'wall-window-glass', 'wall-window-stone'],
               etage=['wall-window-round', 'wall-detail-cross', 'wall-window-round'],
               porte_piece='wall-doorway-round', toit_z=1.15)
    # Tour d'escalade (4 niveaux) accolée à gauche, toit pointu orange
    o += maison(-2.05, 0.95, 1, 1, 4, 'blanc', seed=72, kz=0.6, cheminee=False,
                rdc=['wall-window-stone'], etage=['wall-detail-cross', 'wall-window-round'],
                porte_piece='wall-doorway-round', toit_z=1.6)
    o += mur_escalade(-2.05, 0.67, 0.42, 2.2, 0, '#f0782d', seed=5, n=26)
    o += deco('banner-green', 0.1 - 0.25, 0.39, z=0.75, rot=270, s=1.0)
    o += deco('banner-red', -0.9, 0.39, z=0.75, rot=270, s=1.0) + deco('banner-red', 1.1, 0.39, z=0.75, rot=270, s=1.0)
    # Buvette et terrasse sur le parvis
    o += deco('stall-red', -1.1, -0.75, s=1.0) + deco('stall-stool', -0.75, -1.0, s=0.8) + deco('stall-stool', -1.4, -1.05, s=0.8)
    o += deco('cart', 0.2, -0.65, rot=-20, s=0.6)
    # Placette pavée devant la halle
    o.append(dalle(4.0, 1.7, mat_paves(), 0.012, 0.03, 0.0, -0.75))
    o += chemin([(-0.15, -1.55), (-0.45, -2.15), (-0.1, -2.8), (-0.2, -3.3)], larg=0.34, seed=70)[0]
    o += chemin([(1.9, -1.3), (2.4, -1.8), (2.9, -1.7), (3.3, -1.85)], larg=0.26, seed=71)[0]
    # Murs d'escalade extérieurs + tapis
    o += mur_escalade(1.45, -0.35, 1.1, 1.45, 16, '#e9c08a', seed=3)
    o += mur_escalade(2.45, -0.35, 0.8, 1.2, 4, '#2f8f8a', seed=4)
    o.append(boite('tapis', (2.1, 0.6, 0.08), (1.9, -0.95, 0.04), '#2f5fbf'))
    # Bloc naturel avec prises
    o += deco('rock-large', -2.2, -1.6, rot=20, s=1.1)
    rnd = random.Random(9)
    for _ in range(14):
        c = rnd.choice(PRISES)
        h = bpy.data.objects.new('prise', _mesh('p' + c, 0.028, c))
        a = rnd.uniform(-2.4, 0.4)
        h.location = (-2.2 + math.cos(a) * 0.34, -1.6 + math.sin(a) * 0.32, rnd.uniform(0.08, 0.5))
        bpy.context.scene.collection.objects.link(h)
        o.append(h)
    o.append(boite('tapis-bloc', (0.9, 0.5, 0.06), (-2.05, -2.15, 0.03), '#ff7a3d'))
    # Décor : arbres, bancs, lanternes, fleurs, haies
    o += bordure_n('hedge', '-x', 2, sauf=(4, 5, 6)) + bordure_n('hedge', '+y', 2, sauf=(5, 6))
    for x, y, s in ((-2.6, 2.6, 0.9), (2.6, 2.6, 0.8), (-2.6, 0.2, 0.7), (2.65, 1.0, 0.75), (2.6, -2.6, 0.7)):
        o += deco('tree-high-round', x, y, s=s)
    o += deco('tree', -2.65, -2.6, s=0.6) + deco('tree', 1.6, 2.7, s=0.6)
    o += deco('stall-bench', -1.2, -1.7, s=0.8) + deco('stall-bench', 0.6, -1.7, s=0.8)
    o += deco('lantern', -1.0, -2.2, s=0.8) + deco('lantern', 0.4, -2.2, s=0.8)
    o += fleurs(-1.6, 0.0, 1.2, 0.12, 12, 81) + fleurs(1.1, 0.0, 1.2, 0.12, 12, 82)
    o += fleurs(-2.3, -0.7, 0.5, 0.6, 10, 83) + fleurs(1.2, -2.4, 1.2, 0.4, 14, 84)
    o += deco('planter', -1.95, -2.55, kit=SUB, s=1.4) + deco('planter', 0.95, -2.5, kit=SUB, s=1.4)
    return o


def bordure_n(name, cote, n, sauf=()):
    """Comme bordure(), pour une parcelle de n × n (côté 3n)."""
    o = []
    demi = 1.5 * n
    for idx in range(round(3 * n / K)):
        if idx in sauf:
            continue
        t = -demi + K * (idx + 0.5)
        x, y = {'-x': (-demi + K / 2, t), '+x': (demi - K / 2, t), '+y': (t, demi - K / 2), '-y': (t, -demi + K / 2)}[cote]
        o += piece(name, x, y, 0, SIDE_ROT[cote], None, (K, K, K))
    return o


# ---------- Merveille : Tour Eiffel (3 × 3 parcelles) ----------
H_TOUR = 8.0


def demi_largeur(z):
    """Profil de la tour : demi-largeur en fonction de la hauteur (courbe qui s'affine vers le haut)."""
    return 1.45 * max(0.0, 1 - z / 8.6) ** 2.6 + 0.09


def mat_metal(nom='Fer', hexa='#dca066'):
    m = bpy.data.materials.get(nom)
    if m:
        return m
    m = _mat(nom, hexa, 0.55)
    m.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value = 0.35
    return m


def treillis(anneaux, epais=0.022, nom='treillis'):
    """Tube carré en treillis : anneaux = [(z, cx, cy, demi)], faces triangulées puis « fil de fer »."""
    verts, faces = [], []
    for z, cx, cy, d in anneaux:
        verts += [(cx - d, cy - d, z), (cx + d, cy - d, z), (cx + d, cy + d, z), (cx - d, cy + d, z)]
    for i in range(len(anneaux) - 1):
        a, b = 4 * i, 4 * (i + 1)
        for k in range(4):
            k2 = (k + 1) % 4
            # deux triangles par panneau, diagonale alternée : croisillons du treillis
            if i % 2:
                faces += [(a + k, a + k2, b + k2), (a + k, b + k2, b + k)]
            else:
                faces += [(a + k, a + k2, b + k), (a + k2, b + k2, b + k)]
    me = bpy.data.meshes.new(nom)
    me.from_pydata(verts, [], faces)
    me.materials.append(mat_metal())
    o = bpy.data.objects.new(nom, me)
    bpy.context.scene.collection.objects.link(o)
    w = o.modifiers.new('fil', 'WIREFRAME')
    w.thickness = epais
    w.use_even_offset = False
    # « Peau » sombre derrière le treillis : silhouette pleine, motif de poutres en relief
    peau = bpy.data.objects.new(nom + '-peau', me)
    bpy.context.scene.collection.objects.link(peau)
    peau.material_slots[0].link = 'OBJECT'
    peau.material_slots[0].material = mat_metal('FerOmbre', '#93603a')
    return o


def arche(y_ou_x, axe, c, z0, rz, epais=0.045):
    """Arche décorative entre deux pieds (demi-ellipse), dans le plan vertical d'un côté."""
    cu = bpy.data.curves.new('arche', 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = epais
    sp = cu.splines.new('POLY')
    n = 24
    sp.points.add(n)
    for i in range(n + 1):
        t = math.pi * i / n
        u, z = c * math.cos(t), z0 + rz * math.sin(t)
        p = (u, y_ou_x, z) if axe == 'x' else (y_ou_x, u, z)
        sp.points[i].co = (*p, 1)
    o = bpy.data.objects.new('arche', cu)
    o.data.materials.append(mat_metal())
    bpy.context.scene.collection.objects.link(o)
    return o


def guirlande(points, n, couleur='#ffd27a'):
    """Petites ampoules lumineuses réparties le long d'une polyligne."""
    m = bpy.data.materials.get('Ampoule' + couleur)
    if not m:
        m = bpy.data.materials.new('Ampoule' + couleur)
        m.use_nodes = True
        b = m.node_tree.nodes.get('Principled BSDF')
        b.inputs['Emission Color'].default_value = (*[c ** 2.2 for c in hex_rgb(couleur)], 1)
        b.inputs['Emission Strength'].default_value = 4.0 if couleur == '#ffd27a' else 2.5
        b.inputs['Base Color'].default_value = (*[c ** 2.2 for c in hex_rgb(couleur)], 1)
    cle = 'ampoule' + couleur
    if cle not in _fmesh:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.018 if couleur == '#ffd27a' else 0.03)
        t = bpy.context.active_object
        me = t.data
        me.materials.append(m)
        bpy.data.objects.remove(t)
        _fmesh[cle] = me
    objs = []
    seg = [(Vector(points[i]), Vector(points[i + 1])) for i in range(len(points) - 1)]
    tot = sum((b - a).length for a, b in seg)
    for k in range(n):
        d = tot * k / n
        for a, b in seg:
            l = (b - a).length
            if d <= l:
                o = bpy.data.objects.new('ampoule', _fmesh[cle])
                o.location = a + (b - a) * (d / l)
                bpy.context.scene.collection.objects.link(o)
                objs.append(o)
                break
            d -= l
    return objs


class Charpente:
    """Accumule des poutres (prismes à section rectangulaire) dans un seul maillage."""

    def __init__(self):
        self.v, self.f = [], []

    def poutre(self, a, b, w, h=None):
        a, b = Vector(a), Vector(b)
        d = b - a
        if d.length < 1e-6:
            return
        d.normalize()
        ref = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        s = d.cross(ref).normalized() * (w / 2)
        u = s.cross(d).normalized() * ((h or w) / 2)
        i = len(self.v)
        for p in (a, b):
            self.v += [p - s - u, p + s - u, p + s + u, p - s + u]
        self.f += [(i, i + 1, i + 2, i + 3), (i + 4, i + 7, i + 6, i + 5),
                   (i, i + 4, i + 5, i + 1), (i + 1, i + 5, i + 6, i + 2),
                   (i + 2, i + 6, i + 7, i + 3), (i + 3, i + 7, i + 4, i)]

    def polyligne(self, pts, w, h=None):
        for p, q in zip(pts, pts[1:]):
            self.poutre(p, q, w, h)

    def objet(self, nom, mat):
        me = bpy.data.meshes.new(nom)
        me.from_pydata([tuple(p) for p in self.v], [], self.f)
        me.materials.append(mat)
        o = bpy.data.objects.new(nom, me)
        bpy.context.scene.collection.objects.link(o)
        return o


def carre(cx, cy, z, h):
    return [Vector((cx - h, cy - h, z)), Vector((cx + h, cy - h, z)), Vector((cx + h, cy + h, z)), Vector((cx - h, cy + h, z))]


def section_treillis(ch, peau, anneaux, wc, wr, wd):
    """Montants d'angle + traverses + croisillons en X sur les 4 faces ; peau sombre en retrait."""
    for i, r in enumerate(anneaux):
        for k in range(4):
            ch.poutre(r[k], r[(k + 1) % 4], wr)
        if i == len(anneaux) - 1:
            break
        r2 = anneaux[i + 1]
        for k in range(4):
            k2 = (k + 1) % 4
            ch.poutre(r[k], r2[k], wc)
            ch.poutre(r[k], r2[k2], wd)
            ch.poutre(r[k2], r2[k], wd)
        # peau : quadrilatères légèrement rentrés vers l'axe de la section
        c1 = sum(r, Vector()) / 4
        c2 = sum(r2, Vector()) / 4
        a = [c1 + (p - c1) * 0.93 for p in r]
        b = [c2 + (p - c2) * 0.93 for p in r2]
        j = len(peau.v)
        peau.v += a + b
        for k in range(4):
            k2 = (k + 1) % 4
            peau.f.append((j + k, j + k2, j + 4 + k2, j + 4 + k))


def frise(ch, sombre, z_bas, haut, d, pas=0.13, garde_corps=True):
    """Étage-balcon : sol, frise à arcades sur les 4 côtés, corniche et garde-corps."""
    z_haut = z_bas + haut
    # plancher (anneau sombre) et corniche saillante
    for zz, ep, marge in ((z_bas, 0.05, 0.0), (z_haut, 0.04, 0.035)):
        dd = d + marge
        coins = [Vector((-dd, -dd, zz)), Vector((dd, -dd, zz)), Vector((dd, dd, zz)), Vector((-dd, dd, zz))]
        for k in range(4):
            ch.poutre(coins[k], coins[(k + 1) % 4], 0.07, ep)
    coins = [(-d, -d), (d, -d), (d, d), (-d, d)]
    for k in range(4):
        (x0, y0), (x1, y1) = coins[k], coins[(k + 1) % 4]
        L = math.hypot(x1 - x0, y1 - y0)
        n = max(2, round(L / pas))
        for i in range(n + 1):
            t = i / n
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            ch.poutre((x, y, z_bas), (x, y, z_haut), 0.026)
            if i < n:
                # petite arcade entre deux poteaux
                xa, ya = x0 + (x1 - x0) * (i + 0.5) / n, y0 + (y1 - y0) * (i + 0.5) / n
                ray = L / n / 2
                ux, uy = (x1 - x0) / L, (y1 - y0) / L
                arc = [Vector((xa - ux * ray * math.cos(a), ya - uy * ray * math.cos(a), z_haut - haut * 0.42 + ray * 0.9 * math.sin(a)))
                       for a in [j * math.pi / 6 for j in range(7)]]
                ch.polyligne(arc, 0.018)
        ch.poutre((x0, y0, z_bas + haut * 0.2), (x1, y1, z_bas + haut * 0.2), 0.02)
    # fond sombre de la frise (donne du relief aux arcades)
    j = len(sombre.v)
    for zz in (z_bas, z_haut):
        sombre.v += [Vector((x * 0.985, y * 0.985, zz)) for x, y in coins]
    for k in range(4):
        k2 = (k + 1) % 4
        sombre.f.append((j + k, j + k2, j + 4 + k2, j + 4 + k))
    if garde_corps:
        dd = d + 0.03
        cg = [(-dd, -dd), (dd, -dd), (dd, dd), (-dd, dd)]
        for k in range(4):
            (x0, y0), (x1, y1) = cg[k], cg[(k + 1) % 4]
            n = max(2, round(math.hypot(x1 - x0, y1 - y0) / 0.07))
            for i in range(n):
                t = i / n
                x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
                ch.poutre((x, y, z_haut + 0.02), (x, y, z_haut + 0.09), 0.012)
            ch.poutre((x0, y0, z_haut + 0.09), (x1, y1, z_haut + 0.09), 0.018)
    return [(x * (d + 0.03) / d, y * (d + 0.03) / d, z_haut + 0.1) for x, y in coins + [coins[0]]]


def tour_eiffel():
    o = []
    H = H_TOUR
    z1, z2, z3 = 0.18 * H, 0.36 * H, 0.88 * H
    s0, s2 = 0.58, demi_largeur(z2)
    ch, peau, sombre = Charpente(), Charpente(), Charpente()

    def pied(z):
        s = s0 + (s2 - s0) * z / z2
        return s, demi_largeur(z) - s / 2

    # --- 4 pieds en treillis (montants d'angle, traverses, croix) ---
    for sx in (-1, 1):
        for sy in (-1, 1):
            ann, z = [], 0.0
            while z <= z2 + 1e-6:
                s, c = pied(z)
                ann.append(carre(sx * c, sy * c, z, s / 2))
                z += z2 / 16
            section_treillis(ch, peau, ann, 0.055, 0.026, 0.018)
    # --- fût jusqu'au sommet, avec deux ceintures intermédiaires ---
    ann, z = [], z2
    pas = (z3 - z2) / 26
    while z <= z3 + 1e-6:
        ann.append(carre(0, 0, z, demi_largeur(z)))
        z += pas
    section_treillis(ch, peau, ann, 0.05, 0.022, 0.016)
    for zc in (0.55 * H, 0.72 * H):
        d = demi_largeur(zc) + 0.02
        cs = carre(0, 0, zc, d)
        for k in range(4):
            ch.poutre(cs[k], cs[(k + 1) % 4], 0.05, 0.05)
    # --- grandes arches doubles + remplissage en treillis jusqu'au 1er étage ---
    zm = z1 * 0.6
    s, c = pied(zm)
    plan = c + s / 2 - 0.04          # face extérieure des pieds
    ax = pied(0.35)[1] - pied(0.35)[0] / 2 + 0.02
    az = z1 - 0.2
    for sgn in (-1, 1):
        for axe in ('x', 'y'):
            def P(u, z):
                return Vector((u, sgn * plan, z)) if axe == 'x' else Vector((sgn * plan, u, z))
            n = 28
            arc1 = [P(ax * math.cos(math.pi * i / n), az * math.sin(math.pi * i / n)) for i in range(n + 1)]
            arc2 = [P((ax - 0.09) * math.cos(math.pi * i / n), (az - 0.09) * math.sin(math.pi * i / n)) for i in range(n + 1)]
            ch.polyligne(arc1, 0.07, 0.1)
            ch.polyligne(arc2, 0.035, 0.06)
            for i in range(1, n, 2):  # entretoises en zigzag entre les deux arcs
                ch.poutre(arc1[i], arc2[i + 1], 0.016)
            # tympan : poteaux verticaux de l'arche jusqu'au 1er étage + croix
            m = 12
            for i in range(1, m):
                u = -ax + 2 * ax * i / m
                za = az * math.sqrt(max(0.0, 1 - (u / ax) ** 2))
                if za < z1 - 0.08:
                    ch.poutre(P(u, za), P(u, z1 - 0.12), 0.016)
            ch.poutre(P(-ax, z1 - 0.12), P(ax, z1 - 0.12), 0.04)
    # --- étages en frise à arcades, avec garde-corps lumineux ---
    lum1 = frise(ch, sombre, z1 - 0.12, 0.34, demi_largeur(z1) + 0.1)
    lum2 = frise(ch, sombre, z2 - 0.06, 0.2, demi_largeur(z2) + 0.07, pas=0.11)
    lum3 = frise(ch, sombre, z3 - 0.02, 0.1, demi_largeur(z3) + 0.05, pas=0.07)
    o += guirlande(lum1, 70) + guirlande(lum2, 44) + guirlande(lum3, 20)
    # --- campanile : poteaux, toit, petit dôme, flèche, feu rouge ---
    zc = z3 + 0.12
    for x, y in ((-0.1, -0.1), (0.1, -0.1), (0.1, 0.1), (-0.1, 0.1)):
        ch.poutre((x, y, zc), (x, y, zc + 0.22), 0.03)
    o.append(boite('campanile', (0.17, 0.17, 0.2), (0, 0, zc + 0.11), '#f3e2bf'))
    o.append(boite('toit-campanile', (0.26, 0.26, 0.04), (0, 0, zc + 0.24), '#b98250'))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.09, location=(0, 0, zc + 0.26))
    dome = bpy.context.active_object
    dome.scale = (1, 1, 0.8)
    dome.data.materials.append(mat_metal())
    o.append(dome)
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.035, radius2=0.004, depth=0.6, location=(0, 0, zc + 0.6))
    fl = bpy.context.active_object
    fl.data.materials.append(mat_metal())
    o.append(fl)
    o += guirlande([(0, 0, zc + 0.9), (0, 0, zc + 0.91)], 1, '#ff3b30')
    o.append(ch.objet('charpente', mat_metal()))
    o.append(peau.objet('peau', mat_metal('FerOmbre', '#7c4f2e')))
    o.append(sombre.objet('frise-fond', mat_metal('FriseOmbre', '#4e3120')))
    return o


def p_tour_eiffel():
    """Tour Eiffel au fond d'un parc : esplanade pavée, pelouses, bassins, allées d'arbres, stands."""
    # Merveille : rendu plus soigné (ombres de contact / lumière indirecte d'Eevee)
    for attr in ('use_raytracing', 'use_gtao'):
        try:
            setattr(bpy.context.scene.eevee, attr, True)
        except AttributeError:
            pass
    o = tour_eiffel()
    D = (3 * 3 + 2 * ROUTE) / 2  # 5.1
    # esplanade sous la tour
    o.append(dalle(3.8, 3.8, mat_paves(), 0.012, 0.03))
    # grande pelouse vers l'avant, encadrée de deux allées qui ondulent légèrement
    o += chemin([(-1.4, -1.9), (-1.55, -3.0), (-1.4, -4.2), (-1.45, -D)], larg=0.5, seed=301)[0]
    o += chemin([(1.4, -1.9), (1.5, -3.0), (1.4, -4.2), (1.45, -D)], larg=0.5, seed=302)[0]
    # allées latérales vers la droite et la gauche
    o += chemin([(1.9, 0.6), (3.0, 0.9), (4.2, 0.6), (D, 0.7)], larg=0.4, seed=303)[0]
    o += chemin([(-1.9, -0.6), (-3.0, -0.9), (-4.1, -0.5), (-D, -0.6)], larg=0.4, seed=304)[0]
    # bassins sur la pelouse
    o += deco('fountain-round', 0, -3.0, s=1.6) + deco('fountain-round', 0, -4.4, s=1.0)
    o += fleurs(0, -2.2, 1.6, 0.25, 18, 311) + fleurs(-0.7, -3.7, 0.4, 0.5, 8, 312) + fleurs(0.7, -3.7, 0.4, 0.5, 8, 313)
    # allées d'arbres le long des allées
    for y in (-2.4, -3.2, -4.0, -4.7):
        o += deco('tree-high-round', -2.05, y, s=0.75) + deco('tree-high-round', 2.05, y, s=0.75)
    # jardins latéraux et du fond
    rnd = random.Random(320)
    for (x, y) in ((-3.6, 2.8), (-4.4, 1.6), (-2.8, 4.2), (3.4, 3.6), (4.4, 2.4), (2.6, 4.5), (-4.5, 4.4), (4.5, 4.5),
                   (-3.4, -2.6), (-4.4, -3.8), (3.6, -2.4), (4.4, -3.6), (-3.2, -4.6), (3.3, -4.6)):
        o += deco(rnd.choice(['tree-high-round', 'tree', 'tree-high-round']), x, y, rot=rnd.uniform(0, 360), s=rnd.uniform(0.7, 0.95))
    o += deco('stall-red', -3.0, -1.9, s=1.0) + deco('stall-green', 3.0, -1.6, s=1.0)
    o += deco('stall-bench', -2.6, -3.4, rot=90, s=0.8) + deco('stall-bench', 2.6, -3.4, rot=90, s=0.8)
    o += deco('stall-bench', -0.8, -1.95, s=0.8) + deco('stall-bench', 0.8, -1.95, s=0.8)
    for x, y in ((-1.85, -2.0), (1.85, -2.0), (-1.85, -4.6), (1.85, -4.6), (-2.2, 2.2), (2.2, 2.2)):
        o += deco('lantern', x, y, s=0.85)
    o += deco('cart', 3.8, -0.9, rot=-30, s=0.6) + deco('cart', -3.8, 0.4, rot=60, s=0.6)
    o += fleurs(-3.6, 1.2, 0.7, 0.4, 10, 330) + fleurs(3.6, -0.3, 0.7, 0.3, 9, 331) + fleurs(0, 2.6, 2.0, 0.3, 14, 332)
    o += bordure_n('hedge', '-x', 3, sauf=(9, 10, 11)) + bordure_n('hedge', '+y', 3)
    return o


LOTS = {
    'maison-creme': p_maison_creme,
    'maison-jaune': p_maison_jaune,
    'place-fontaine': p_place,
    'auberge': p_auberge,
    'maison-rose': p_maison_rose,
    'hameau-2': p_hameau_2,
    'hameau-3': p_hameau_3,
    'verger': p_verger,
    'hameau-2b': lambda: p_hameau_2(('jaune', 'creme'), 27),
    'salle-escalade': p_salle,
    'tour-eiffel': p_tour_eiffel,
}
GROUND = {'place-fontaine': 'paves'}
# Parcelles multiples : côté en nombre de parcelles (2 = 2 × 2)
TAILLE = {'salle-escalade': 2, 'tour-eiffel': 3}
HAUT_MAX = {'salle-escalade': 3.6, 'tour-eiffel': 9.3}


def bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == 'MESH' for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def camera_for(sc, lo, hi):
    cam = bpy.data.cameras.new('Cam')
    cam.type = 'ORTHO'
    co = bpy.data.objects.new('Cam', cam)
    sc.collection.objects.link(co)
    sc.camera = co
    co.rotation_euler = (math.radians(60), 0, math.radians(45))
    bpy.context.view_layer.update()
    inv = co.matrix_world.inverted()
    cc = [inv @ Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
    minx, maxx = min(p.x for p in cc), max(p.x for p in cc)
    miny, maxy = min(p.y for p in cc), max(p.y for p in cc)
    pad = 0.15
    w, h = (maxx - minx) + pad * 2, (maxy - miny) + pad * 2
    co.location = co.matrix_world.to_quaternion() @ Vector(((minx + maxx) / 2, (miny + maxy) / 2, 50))
    cam.ortho_scale = max(w, h)
    cam.clip_end = 200
    sc.render.resolution_x = max(8, round(w * PX_PER_UNIT))
    sc.render.resolution_y = max(8, round(h * PX_PER_UNIT))


# Tuiles de route : même niveau que les parcelles ; ce sont elles qui portent l'épaisseur du terrain
ROUTES = {'route-x': (3.0, ROUTE), 'route-y': (ROUTE, 3.0), 'carrefour': (ROUTE, ROUTE)}


def run(name, out):
    sc = reset()
    if name in ROUTES:
        w, d = ROUTES[name]
        objs = [dalle(w, d, mat_paves('Route', (0.58, 0.55, 0.52)), 0.0, 0.15)]
        lo, hi = Vector((-w / 2, -d / 2, -0.15)), Vector((w / 2, d / 2, 0.05))
    else:
        n = TAILLE.get(name, 1)
        cote = 3 * n + ROUTE * (n - 1)  # une grande parcelle recouvre aussi les routes internes
        objs = [add_ground(cote, cote, GROUND.get(name, 'herbe'))]
        objs += LOTS[name]()
        if HERBE_TEXTUREE and GROUND.get(name, 'herbe') == 'herbe':
            objs += touffes(cote / 2 - 0.03, int(170 * (cote / 3) ** 2), seed=len(name))
        lo, hi = Vector((-cote / 2, -cote / 2, -0.15)), Vector((cote / 2, cote / 2, HAUT_MAX.get(name, 2.4)))
    camera_for(sc, lo, hi)
    sc.render.filepath = os.path.join(out, f'{name}.png')
    bpy.ops.render.render(write_still=True)
    # Position (en px) de l'origine de la tuile dans l'image : sert à l'assemblage au pixel près
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(sc, sc.camera, Vector((0, 0, 0)))
    rx, ry = sc.render.resolution_x, sc.render.resolution_y
    with open(os.path.join(out, f'{name}.json'), 'w') as f:
        json.dump({'ox': v.x * rx, 'oy': (1 - v.y) * ry, 'ppu': PX_PER_UNIT}, f)
    print(f'[atelier] {name} -> {sc.render.filepath}')


# Utilisé comme bibliothèque par batiments.py (ATELIER_BIBLIO) : pas de rendu automatique
if not globals().get('ATELIER_BIBLIO'):
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out = os.path.abspath(argv[0] if argv else os.path.join(HERE, 'out', 'village'))
    os.makedirs(out, exist_ok=True)
    for n in (argv[1:] or list(LOTS) + list(ROUTES)):
        run(n, out)
