"""
Atelier ville — rendus Blender des SOLS de l'appli et des rues pavées entre les cases.

Lancement :  blender -b -P atelier-ville/sols.py -- <dossier_sortie> [nom ...]

Une case = 3 × 3 unités (comme une parcelle) ; les rues (ROUTE = 0,6 unité) séparent les cases :
  route-x : rue le long de x (entre deux lignes de cases), route-y : le long de y, carrefour : croisement.
Le dessus de tous les sols est à z = 0 ; seules les rues ont une épaisseur (bord de l'île).
"""
import bpy, sys, os, math, random, json
from mathutils import Vector

ICI = os.path.dirname(os.path.abspath(__file__))
ATELIER_BIBLIO = True
__file__ = os.path.join(ICI, 'village.py')
exec(compile(open(__file__, encoding='utf8').read(), __file__, 'exec'))
__file__ = os.path.join(ICI, 'sols.py')


def mat_bruit(nom, c1, c2, echelle=3.0, relief=0.2):
    """Matériau à taches (deux teintes) en coordonnées monde, avec léger relief."""
    m = bpy.data.materials.get(nom)
    if m:
        return m
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF'); b.inputs['Roughness'].default_value = 1
    geo = N.new('ShaderNodeNewGeometry')
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = echelle; nz.inputs['Detail'].default_value = 6
    L.new(geo.outputs['Position'], nz.inputs['Vector'])
    r = N.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].color = (*[c ** 2.2 for c in hex_rgb(c1)], 1); r.color_ramp.elements[0].position = 0.3
    r.color_ramp.elements[1].color = (*[c ** 2.2 for c in hex_rgb(c2)], 1); r.color_ramp.elements[1].position = 0.7
    L.new(nz.outputs['Fac'], r.inputs['Fac']); L.new(r.outputs['Color'], b.inputs['Base Color'])
    fin = N.new('ShaderNodeTexNoise'); fin.inputs['Scale'].default_value = 40
    L.new(geo.outputs['Position'], fin.inputs['Vector'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = relief; bump.inputs['Distance'].default_value = 0.01
    L.new(fin.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def mat_planches():
    m = bpy.data.materials.get('Planches')
    if m:
        return m
    m = bpy.data.materials.new('Planches')
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF'); b.inputs['Roughness'].default_value = 0.85
    geo = N.new('ShaderNodeNewGeometry')
    br = N.new('ShaderNodeTexBrick'); br.offset = 0.37
    br.inputs['Color1'].default_value = (0.5, 0.3, 0.15, 1); br.inputs['Color2'].default_value = (0.42, 0.24, 0.11, 1)
    br.inputs['Mortar'].default_value = (0.18, 0.1, 0.05, 1); br.inputs['Mortar Size'].default_value = 0.008
    br.inputs['Brick Width'].default_value = 1.1; br.inputs['Row Height'].default_value = 0.16; br.inputs['Scale'].default_value = 1
    L.new(geo.outputs['Position'], br.inputs['Vector'])
    L.new(br.outputs['Color'], b.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.4; bump.inputs['Distance'].default_value = 0.01
    L.new(br.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def rocher(pos, taille, couleur='#a39e93', seed=1, sub=2, rugo=0.22):
    rnd = random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=1.0)
    o = bpy.context.active_object
    for v in o.data.vertices:
        v.co *= 1 + rnd.uniform(-rugo, rugo)
    o.scale = taille
    o.location = pos
    o.rotation_euler = (0, 0, rnd.uniform(0, math.tau))
    o.data.materials.append(_mat('r' + couleur, couleur, 0.95))
    return o


def sol(nom, m, seed=1, avec_touffes=False, n_fleurs=0):
    g = dalle(3, 3, m, 0.0, 0)
    g.name = 'herbe' if avec_touffes else 'sol'
    if avec_touffes:
        touffes(1.47, 170, seed=seed)
    if n_fleurs:
        rnd = random.Random(seed)
        for i in range(n_fleurs):
            fleurs(rnd.uniform(-1.3, 1.3), rnd.uniform(-1.3, 1.3), 0.3, 0.3, 4, seed * 100 + i)
    return g


SOLS = {
    'herbe': lambda: sol('herbe', mat_herbe(), 11, True),
    'herbe2': lambda: sol('herbe2', mat_herbe(), 23, True),
    'fleurs': lambda: sol('fleurs', mat_herbe(), 31, True, 14),
    'eau': lambda: sol('eau', bpy.data.materials.get('Eau') or _eau()),
    'mer': lambda: sol('mer', mat_mer()),
    'terre': lambda: sol('terre', mat_bruit('Terre', '#7a5233', '#a87a50', 3.0, 0.4)),
    'paves': lambda: sol('paves', mat_paves('PavesPlace', (0.7, 0.66, 0.6))),
    'sable': lambda: sol('sable', mat_bruit('SableSol', '#d9b878', '#f0d9a2', 2.5, 0.25)),
    'planches': lambda: sol('planches', mat_planches()),
    'neige': lambda: sol('neige', mat_bruit('Neige', '#e4edf7', '#ffffff', 2.0, 0.15)),
}


def _eau():
    m = bpy.data.materials.new('Eau')
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


def mat_mer():
    """Mer autour de l'île : bleu profond, vaguelettes et reflets clairs."""
    m = bpy.data.materials.get('Mer')
    if m:
        return m
    m = bpy.data.materials.new('Mer')
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF'); b.inputs['Roughness'].default_value = 0.12
    geo = N.new('ShaderNodeNewGeometry')
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.6; nz.inputs['Detail'].default_value = 4
    L.new(geo.outputs['Position'], nz.inputs['Vector'])
    r = N.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].color = (0.04, 0.24, 0.42, 1); r.color_ramp.elements[0].position = 0.35
    r.color_ramp.elements[1].color = (0.08, 0.36, 0.55, 1); r.color_ramp.elements[1].position = 0.7
    L.new(nz.outputs['Fac'], r.inputs['Fac']); L.new(r.outputs['Color'], b.inputs['Base Color'])
    vg = N.new('ShaderNodeTexWave'); vg.inputs['Scale'].default_value = 5; vg.inputs['Distortion'].default_value = 7
    L.new(geo.outputs['Position'], vg.inputs['Vector'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.3; bump.inputs['Distance'].default_value = 0.02
    L.new(vg.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


RUES = {'route-x': (3.0, ROUTE), 'route-y': (ROUTE, 3.0), 'carrefour': (ROUTE, ROUTE)}

# Chemins entre les cases : une texture par type de sol (peinte par le joueur)
MATS_CHEMIN = {
    'paves': lambda: mat_paves('Route', (0.58, 0.55, 0.52)),
    'terre': lambda: mat_bruit('Terre', '#7a5233', '#a87a50', 3.0, 0.4),
    'sable': lambda: mat_bruit('SableSol', '#d9b878', '#f0d9a2', 2.5, 0.25),
    'planches': mat_planches,
    'neige': lambda: mat_bruit('Neige', '#e4edf7', '#ffffff', 2.0, 0.15),
    'herbe': mat_herbe,
    'fleurs': mat_herbe,
    'eau': lambda: bpy.data.materials.get('Eau') or _eau(),
}
CHEMINS = {f'{forme}-{t}': (forme, t) for t in MATS_CHEMIN for forme in RUES}

# Falaises : parois rocheuses sous une case surélevée (face gauche « g » vers -y, droite « d » vers +x),
# pour 1 à 3 marches de dénivelé (une marche = 0,857 unité = 7 px de la carte)
MARCHE = 0.857
FALAISES = {f'falaise-{f}-{h}': (f, h) for f in 'gd' for h in (1, 2, 3, 4)}


def mat_roche():
    """Roche claire gris-beige veinée d'ocre, fissures sombres (inspirée d'un rocher stratifié)."""
    m = bpy.data.materials.get('Roche3')
    if m:
        return m
    m = bpy.data.materials.new('Roche3')
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF'); b.inputs['Roughness'].default_value = 0.8
    geo = N.new('ShaderNodeNewGeometry')
    # base : gris clair → beige, taches douces
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 4; nz.inputs['Detail'].default_value = 8
    L.new(geo.outputs['Position'], nz.inputs['Vector'])
    base = N.new('ShaderNodeValToRGB')
    base.color_ramp.elements[0].color = (0.24, 0.22, 0.2, 1); base.color_ramp.elements[0].position = 0.25
    base.color_ramp.elements[1].color = (0.44, 0.4, 0.34, 1); base.color_ramp.elements[1].position = 0.75
    L.new(nz.outputs['Fac'], base.inputs['Fac'])
    # veines ocre
    ve = N.new('ShaderNodeTexNoise'); ve.inputs['Scale'].default_value = 2.2; ve.inputs['Detail'].default_value = 3
    L.new(geo.outputs['Position'], ve.inputs['Vector'])
    vm = N.new('ShaderNodeMapRange'); vm.inputs['From Min'].default_value = 0.55; vm.inputs['From Max'].default_value = 0.7
    vm.inputs['To Max'].default_value = 0.6
    L.new(ve.outputs['Fac'], vm.inputs['Value'])
    ocre = N.new('ShaderNodeMix'); ocre.data_type = 'RGBA'
    L.new(vm.outputs['Result'], ocre.inputs['Factor']); L.new(base.outputs['Color'], ocre.inputs[6])
    ocre.inputs[7].default_value = (0.42, 0.27, 0.13, 1)
    # fissures : bords de cellules de Voronoï déformés
    dis = N.new('ShaderNodeTexNoise'); dis.inputs['Scale'].default_value = 6
    L.new(geo.outputs['Position'], dis.inputs['Vector'])
    add = N.new('ShaderNodeVectorMath'); add.operation = 'ADD'
    L.new(geo.outputs['Position'], add.inputs[0])
    sc = N.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'; sc.inputs['Scale'].default_value = 0.25
    L.new(dis.outputs['Color'], sc.inputs[0]); L.new(sc.outputs['Vector'], add.inputs[1])
    vo = N.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = 2.2
    L.new(add.outputs['Vector'], vo.inputs['Vector'])
    fis = N.new('ShaderNodeMapRange'); fis.inputs['From Min'].default_value = 0.0; fis.inputs['From Max'].default_value = 0.014
    fis.inputs['To Min'].default_value = 0.25; fis.inputs['To Max'].default_value = 1.0
    L.new(vo.outputs['Distance'], fis.inputs['Value'])
    gris = N.new('ShaderNodeCombineColor')
    for i in range(3):
        L.new(fis.outputs['Result'], gris.inputs[i])
    mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
    L.new(ocre.outputs[2], mul.inputs[6]); L.new(gris.outputs['Color'], mul.inputs[7])
    L.new(mul.outputs[2], b.inputs['Base Color'])
    # relief : fissures creusées + grain
    gr = N.new('ShaderNodeTexNoise'); gr.inputs['Scale'].default_value = 40
    L.new(geo.outputs['Position'], gr.inputs['Vector'])
    h = N.new('ShaderNodeMath'); h.operation = 'ADD'
    L.new(fis.outputs['Result'], h.inputs[0]); L.new(gr.outputs['Fac'], h.inputs[1])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.5; bump.inputs['Distance'].default_value = 0.02
    L.new(h.outputs[0], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def bloc_roche(centre, taille, rnd, m):
    """Dalle de roche : cube aux sommets décalés, arêtes adoucies (biseau), comme un rocher érodé."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=centre)
    o = bpy.context.active_object
    for v in o.data.vertices:
        v.co.x += rnd.uniform(-0.14, 0.14)
        v.co.y += rnd.uniform(-0.14, 0.14)
        v.co.z += rnd.uniform(-0.1, 0.1)
    o.scale = taille
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bev = o.modifiers.new('biseau', 'BEVEL')
    bev.width = min(taille) * 0.22
    bev.segments = 3
    bev.limit_method = 'NONE'
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def paroi(face, h, seed=1):
    """Falaise de h marches : empilement de blocs rocheux à facettes (style low-poly des autres falaises)
    sur un fond de roche sombre, liseré d'herbe qui déborde en haut, éboulis au pied."""
    rnd = random.Random(seed * 13 + h * 7 + (0 if face == 'g' else 3))
    H = h * MARCHE
    roche = mat_roche()
    objs = []

    def P(u, out, z):
        """(u le long de la face, sortie vers l'extérieur, z) → monde"""
        return (u, -1.5 - out, z) if face == 'g' else (1.5 + out, -u, z)

    # fond sombre continu (bouche les interstices entre les blocs)
    fond = bpy.data.meshes.new('fond')
    c = [P(-1.5, 0.0, 0.0), P(1.75, 0.0, 0.0), P(1.75, 0.0, -H), P(-1.5, 0.0, -H)]
    fond.from_pydata(c, [], [(0, 1, 2, 3)])
    fond.materials.append(_mat('rFond', '#3a3129', 0.95))
    fo = bpy.data.objects.new('fond', fond); bpy.context.scene.collection.objects.link(fo); objs.append(fo)
    # blocs : rangées décalées, tailles et saillies variées
    pas_z = 0.3
    rangs = max(1, int(math.ceil(H / pas_z)))
    for r in range(rangs):
        zc = -(r + 0.5) * H / rangs + rnd.uniform(-0.04, 0.04)
        hz = H / rangs * rnd.uniform(0.9, 1.15)
        zc = min(zc, -hz * 0.68)  # le haut des blocs reste sous le liseré d'herbe
        u = -1.5 + (0.0 if r % 2 == 0 else 0.2) + rnd.uniform(0, 0.08)
        while u < 1.75:
            lu = rnd.uniform(0.3, 0.95)
            prof = rnd.uniform(0.05, 0.22) + (0.08 if r == rangs - 1 else 0)  # gros blocs à la base
            # strate : bloc plus large que haut, saillie variable d'un bloc à l'autre
            o = bloc_roche(P(u + lu / 2, prof / 2 - 0.02, zc), (lu, 0.12 + prof, hz) if face == 'g' else (0.12 + prof, lu, hz), rnd, roche)
            o.rotation_euler = (rnd.uniform(-0.04, 0.04), rnd.uniform(-0.04, 0.04), rnd.uniform(-0.05, 0.05))
            o.data.materials[0] = roche
            objs.append(o)
            u += lu * rnd.uniform(0.92, 1.0)
    # liseré d'herbe qui déborde légèrement, avec des touffes qui pendent au bord
    if face == 'g':
        lis = dalle(3.25, 0.2, mat_herbe(), 0.01, 0.1, 0.12, -1.56)
    else:
        lis = dalle(0.2, 3.25, mat_herbe(), 0.01, 0.1, 1.56, -0.12)
    lis.name = 'herbe'
    objs.append(lis)
    for k in range(int(12 + 4 * h)):
        t = rnd.uniform(-1.45, 1.65)
        me_t = maillage_touffe(*rnd.choice([('t1', '#3d8a2e'), ('t2', '#5aa83a'), ('t3', '#2f7426')]))
        tf = bpy.data.objects.new('touffe', me_t)
        tf.location = P(t, 0.16, 0.0)
        tf.rotation_euler = (math.radians(rnd.uniform(110, 150)), 0, 0) if face == 'g' else (0, math.radians(-rnd.uniform(110, 150)), 0)
        tf.scale = (1.3, 1.3, rnd.uniform(1.2, 2.4))
        bpy.context.scene.collection.objects.link(tf)
        objs.append(tf)
    # éboulis au pied
    for k in range(int(3 + 2 * h)):
        t = rnd.uniform(-1.35, 1.6)
        sz = rnd.uniform(0.06, 0.14)
        o = rocher(P(t, 0.2 + rnd.uniform(0, 0.12), -H), (sz, sz * 0.9, sz * 0.7), '#6e6253', seed=seed * 100 + k + h * 10, sub=1)
        o.data.materials[0] = roche
        objs.append(o)
    return objs


def rendre(nom, out):
    sc = reset()
    if nom in FALAISES:
        f, h = FALAISES[nom]
        paroi(f, h)
        for attr in ('use_raytracing', 'use_gtao'):
            try:
                setattr(sc.eevee, attr, True)
            except AttributeError:
                pass
        lo, hi = Vector((-1.5, -1.5, -h * MARCHE - 0.2)), Vector((1.5, 1.5, 0.05))
    elif nom in CHEMINS:
        forme, t = CHEMINS[nom]
        w, d = RUES[forme]
        z = -0.04 if t == 'eau' else 0.0
        g = dalle(w, d, MATS_CHEMIN[t](), z, 0.15 + z)
        if t in ('herbe', 'fleurs'):
            g.name = 'herbe'
            touffes(max(w, d) / 2, int(40 * w * d), seed=len(nom))
        if t == 'fleurs':
            fleurs(0, 0, w * 0.9, d * 0.9, int(12 * w * d) + 2, len(nom))
        lo, hi = Vector((-w / 2, -d / 2, -0.15)), Vector((w / 2, d / 2, 0.05))
    elif nom in RUES:
        w, d = RUES[nom]
        dalle(w, d, mat_paves('Route', (0.58, 0.55, 0.52)), 0.0, 0.15)
        lo, hi = Vector((-w / 2, -d / 2, -0.15)), Vector((w / 2, d / 2, 0.05))
    else:
        SOLS[nom]()
        lo, hi = Vector((-1.5, -1.5, -0.02)), Vector((1.5, 1.5, 0.12))
    camera_for(sc, lo, hi)
    sc.render.filepath = os.path.join(out, f'{nom}.png')
    bpy.ops.render.render(write_still=True)
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(sc, sc.camera, Vector((0, 0, 0)))
    with open(os.path.join(out, f'{nom}.json'), 'w') as f:
        json.dump({'ox': v.x * sc.render.resolution_x, 'oy': (1 - v.y) * sc.render.resolution_y, 'ppu': PX_PER_UNIT}, f)
    print(f'[atelier] {nom}')


argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out = os.path.abspath(argv[0] if argv else os.path.join(ICI, 'out', 'sols'))
os.makedirs(out, exist_ok=True)
for nom in (argv[1:] or list(SOLS) + list(RUES) + list(CHEMINS) + list(FALAISES)):
    rendre(nom, out)
