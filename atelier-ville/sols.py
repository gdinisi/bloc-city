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
# les deux faces ensemble (angle avant fermé), hauteurs indépendantes
FALAISES_C = {f'falaise-c-{a}-{b}': (a, b) for a in (1, 2, 3, 4) for b in (1, 2, 3, 4)}
# pied des falaises (éboulis, herbes hautes), dessiné au niveau du sol d'en bas, par-dessus celui-ci
PIEDS = {'pied-g': 'g', 'pied-d': 'd'}


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


def P_face(face, u, out, z):
    """(u le long de la face, sortie vers l'extérieur, z) → monde. Face « g » vers -y Blender (+y appli),
    « d » vers +x. u croît de l'arrière vers l'angle avant (u = 1,5 : angle avant de la case)."""
    return (u, -1.5 - out, z) if face == 'g' else (1.5 + out, -u, z)


NORMALE = {'g': (0.0, -1.0), 'd': (1.0, 0.0)}
TOUFFES = [('t1', '#3d8a2e'), ('t2', '#5aa83a'), ('t3', '#2f7426')]


def periodique(u, termes):
    """Somme de sinus de période 3 (une case) : identique d'une case à l'autre, donc sans couture."""
    return sum(a * math.sin(math.tau * k * u / 3 + p) for k, a, p in termes)


def retombee(u):
    """Hauteur dont l'herbe retombe sur la roche : festons irréguliers et quelques coulures plus longues."""
    v = 0.2 + periodique(u, [(2, 0.045, 0.3), (3, 0.035, 1.1), (5, 0.03, 2.0), (8, 0.02, 0.5), (11, 0.012, 2.6)])
    v += 0.11 * max(0.0, math.sin(math.tau * 4 * u / 3 + 0.9)) ** 8 + 0.07 * max(0.0, math.sin(math.tau * 7 * u / 3 + 2.3)) ** 10
    return max(0.13, v)


def mat_terre_sombre():
    return bpy.data.materials.get('TerreSombre') or _mat('TerreSombre', '#3b2a1a', 1.0)


def bourrelet(chemin):
    """Bord herbeux arrondi qui recouvre le haut de la falaise : il part du dessus de la case (même herbe,
    mêmes coordonnées monde que la dalle → raccord invisible), s'arrondit et retombe en festons sur la roche.
    chemin = [(x, y, nx, ny, u)] : points du bord de la case, normale sortante, abscisse le long de la face."""
    prof = lambda d: [(-0.3, 0.0), (-0.08, 0.0), (0.04, -0.012), (0.11, -0.045), (0.14, -0.1), (0.13, -d + 0.03),
                      (0.1, -d), (0.04, -d + 0.005), (-0.02, -d + 0.05)]
    n = 9
    vs, fs, ms = [], [], []
    for (x, y, nx, ny, u) in chemin:
        for o, z in prof(retombee(u)):
            vs.append((x + nx * o, y + ny * o, z))
    for i in range(len(chemin) - 1):
        for k in range(n - 1):
            a = i * n + k
            fs.append((a, a + 1, a + n + 1, a + n))
            ms.append(0 if k < 5 else 1)   # dessous de la retombée : terre sombre (ombre portée de l'herbe)
    # bouchons aux deux bouts : la coupe du bord d'herbe ne laisse pas voir le dessous
    fin = (len(chemin) - 1) * n
    fs += [tuple(range(n)), tuple(fin + k for k in range(n))]
    ms += [0, 0]
    me = bpy.data.meshes.new('bourrelet')
    me.from_pydata(vs, [], fs)
    me.materials.append(mat_herbe())
    me.materials.append(mat_terre_sombre())
    for p, k in zip(me.polygons, ms):
        p.material_index = k
        p.use_smooth = True
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('herbe', me)
    bpy.context.scene.collection.objects.link(o)
    return o


def chemin_face(face, u0, u1, pas=0.025):
    nx, ny = NORMALE[face]
    m = max(2, int(abs(u1 - u0) / pas))
    pts = []
    for i in range(m + 1):
        u = u0 + (u1 - u0) * i / m
        x, y, _ = P_face(face, u, 0.0, 0.0)
        pts.append((x, y, nx, ny, u))
    return pts


def touffe_orientee(pos, direction, echelle, rnd):
    me_t = maillage_touffe(*rnd.choice(TOUFFES))
    tf = bpy.data.objects.new('touffe', me_t)
    tf.location = pos
    tf.rotation_mode = 'QUATERNION'
    tf.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(direction).normalized())
    tf.scale = echelle
    bpy.context.scene.collection.objects.link(tf)
    return tf


def decor_rebord(face, rnd, u0, u1):
    """Touffes dressées sur le rebord et brins qui pendent sous les festons."""
    nx, ny = NORMALE[face]
    objs = []
    for _ in range(int(34 * (u1 - u0) / 3)):
        u, o = rnd.uniform(u0 + 0.03, u1 - 0.03), rnd.uniform(-0.26, 0.09)
        z = 0.0 if o < 0.0 else -0.012 - 0.3 * o * o
        s = rnd.uniform(1.0, 1.7)
        objs.append(touffe_orientee(P_face(face, u, o, z), (nx * 0.25 * max(o, 0) * 6, ny * 0.25 * max(o, 0) * 6, 1), (s, s, s * rnd.uniform(1, 1.5)), rnd))
    for _ in range(int(26 * (u1 - u0) / 3)):
        u = rnd.uniform(u0 + 0.03, u1 - 0.03)
        d = retombee(u)
        s = rnd.uniform(1.1, 1.6)
        objs.append(touffe_orientee(P_face(face, u, 0.11, -d + 0.02), (nx * 0.55, ny * 0.55, -1), (s, s, s * rnd.uniform(1.3, 2.6)), rnd))
    # quelques fleurs sauvages au bord
    for _ in range(int(5 * (u1 - u0) / 3)):
        u, o = rnd.uniform(u0 + 0.1, u1 - 0.1), rnd.uniform(-0.22, -0.02)
        x, y, _ = P_face(face, u, o, 0)
        c = rnd.choice(FLEURS)
        f = bpy.data.objects.new('feuilles', _mesh('feuilles', 0.05, '#3f8f3a'))
        f.location = (x, y, 0.025); f.scale = (1, 1, 0.7)
        bpy.context.scene.collection.objects.link(f); objs.append(f)
        for _ in range(3):
            fl = bpy.data.objects.new('fleur', _mesh('f' + c, 0.02, c))
            fl.location = (x + rnd.uniform(-0.04, 0.04), y + rnd.uniform(-0.04, 0.04), 0.06 + rnd.uniform(0, 0.015))
            bpy.context.scene.collection.objects.link(fl); objs.append(fl)
    return objs


def paroi(face, h, seed=1, u_fin=1.5, avec_bord=True):
    """Falaise de h marches : strates de blocs de roche qui se chevauchent (aucun interstice sombre),
    fond en même roche légèrement en retrait, bord d'herbe arrondi qui retombe sur la roche.
    Le pied (rochers, touffes) est rendu à part (`pied`) : il est dessiné par-dessus le sol d'en bas."""
    rnd = random.Random(seed * 13 + h * 7 + (0 if face == 'g' else 3))
    H = h * MARCHE
    roche = mat_roche()
    objs = []
    u0, u1 = -1.53, u_fin + 0.03  # léger chevauchement avec la case voisine : pas de jointure visible
    P = lambda u, out, z: P_face(face, u, out, z)

    # fond continu dans la même roche (en retrait) : bouche les interstices sans tache sombre
    fond = bpy.data.meshes.new('fond')
    c = [P(u0, -0.02, -0.05), P(u1, -0.02, -0.05), P(u1, -0.02, -H), P(u0, -0.02, -H)]
    fond.from_pydata(c, [], [(0, 1, 2, 3)])
    fond.materials.append(roche)
    fo = bpy.data.objects.new('fond', fond); bpy.context.scene.collection.objects.link(fo); objs.append(fo)
    # strates : rangées décalées, blocs qui se recouvrent ; le haut passe sous le bord d'herbe
    rangs = max(1, int(math.ceil(H / 0.3)))
    hr = (H - 0.05) / rangs
    for r in range(rangs):
        zc = -0.05 - (r + 0.5) * hr
        hz = hr * rnd.uniform(1.05, 1.3)
        zc = min(zc, -hz * 0.5 - 0.07)           # le haut reste sous l'herbe (ne perce pas le dessus de la case)
        zc = max(zc, -H + hz * 0.5)              # le bas ne descend pas sous le pied de la falaise
        u = u0 - (0.0 if r % 2 == 0 else 0.25) - rnd.uniform(0, 0.1)
        while u < u1:
            lu = rnd.uniform(0.3, 1.0)
            a, b = max(u, u0), min(u + lu, u1)
            if b - a > 0.08:
                prof = rnd.uniform(0.02, 0.08)
                o = bloc_roche(P((a + b) / 2, prof / 2 - 0.02, zc), (b - a, 0.1 + prof, hz) if face == 'g' else (0.1 + prof, b - a, hz), rnd, roche)
                o.rotation_euler = (rnd.uniform(-0.03, 0.03), rnd.uniform(-0.03, 0.03), rnd.uniform(-0.04, 0.04))
                objs.append(o)
            u += lu * rnd.uniform(0.8, 0.92)    # recouvrement entre blocs voisins
    if avec_bord:
        objs.append(bourrelet(chemin_face(face, u0, u1)))
        objs += decor_rebord(face, rnd, u0, u1)
    return objs


def pied(face, seed=5):
    """Pied de falaise, au niveau du sol d'en bas (z = 0) : éboulis arrondis, touffes hautes et buissons
    qui cassent la ligne droite entre la roche et le sol. Dessiné après le sol de la case d'en bas."""
    rnd = random.Random(seed + (0 if face == 'g' else 17))
    roche = mat_roche()
    nx, ny = NORMALE[face]
    objs = []
    P = lambda u, out, z: P_face(face, u, out, z)
    # herbes hautes collées à la paroi : la base de la roche disparaît dans la végétation
    for _ in range(70):
        u, o = rnd.uniform(-1.48, 1.45), rnd.uniform(0.0, 0.16)
        s = rnd.uniform(1.2, 2.0)
        objs.append(touffe_orientee(P(u, o, 0.0), (nx * 0.25, ny * 0.25, 1), (s, s, s * rnd.uniform(1.4, 2.6)), rnd))
    for _ in range(30):
        u, o = rnd.uniform(-1.45, 1.4), rnd.uniform(0.12, 0.42)
        s = rnd.uniform(0.9, 1.5)
        objs.append(touffe_orientee(P(u, o, 0.0), (0, 0, 1), (s, s, s), rnd))
    # éboulis : quelques gros rochers et des cailloux, à moitié enfoncés
    u = -1.35 + rnd.uniform(0, 0.3)
    while u < 1.3:
        t = rnd.uniform(0.09, 0.2)
        o = bloc_roche(P(u, t * 0.6 + rnd.uniform(0.0, 0.12), t * 0.25), (t * rnd.uniform(1.0, 1.6), t * rnd.uniform(0.9, 1.3), t * rnd.uniform(0.7, 1.1)), rnd, roche)
        o.rotation_euler = (rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), rnd.uniform(0, math.tau))
        objs.append(o)
        for _ in range(rnd.randint(1, 3)):
            c = rnd.uniform(0.035, 0.07)
            o2 = bloc_roche(P(u + rnd.uniform(-0.25, 0.25), rnd.uniform(0.08, 0.38), c * 0.2), (c * 1.3, c, c * 0.8), rnd, roche)
            o2.rotation_euler = (0, 0, rnd.uniform(0, math.tau))
            objs.append(o2)
        u += rnd.uniform(0.45, 0.9)
    # petits buissons
    for _ in range(3):
        bu = rnd.uniform(-1.2, 1.2)
        x, y, _ = P(bu, rnd.uniform(0.12, 0.25), 0)
        for k in range(4):
            b = bpy.data.objects.new('buisson', _mesh('buisson' + str(k % 2), 0.07, '#3f8f3a' if k % 2 else '#2f7426'))
            b.location = (x + rnd.uniform(-0.07, 0.07), y + rnd.uniform(-0.07, 0.07), 0.04 + rnd.uniform(0, 0.03))
            b.scale = (1, 1, 0.8)
            bpy.context.scene.collection.objects.link(b); objs.append(b)
    return objs


# ---------- Rivage : case d'eau voisine de l'île, plage qui fait la liaison terre / mer ----------
# masque de 8 voisins, axes de l'appli : +x, +y, -x, -y, puis coins (+x+y), (-x+y), (-x-y), (+x-y)
# (un coin ne compte que si ses deux côtés adjacents sont de l'eau)
VOISINS8 = [(1, 0), (0, 1), (-1, 0), (0, -1), (1, 1), (-1, 1), (-1, -1), (1, -1)]
COIN_COTES = {4: (0, 1), 5: (2, 1), 6: (2, 3), 7: (0, 3)}


def masque_canonique(bits):
    b = list(bits)
    for c, (i, j) in COIN_COTES.items():
        if b[i] == '1' or b[j] == '1':
            b[c] = '0'
    return ''.join(b)


RIVAGES = sorted({masque_canonique(format(n, '08b')) for n in range(1, 256)} - {'00000000'})


def coords_tore(N, L, R=1.0):
    """Coordonnées 4D sur un tore : une texture de bruit qui les lit est PÉRIODIQUE de période 3 en x et en y
    (une case) → deux cases de rivage voisines se raccordent sans couture."""
    geo = N.new('ShaderNodeNewGeometry')
    sep = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Position'], sep.inputs[0])
    sortie = []
    for axe in (0, 1):
        ang = N.new('ShaderNodeMath'); ang.operation = 'MULTIPLY'; ang.inputs[1].default_value = math.tau / 3
        L.new(sep.outputs[axe], ang.inputs[0])
        for op in ('COSINE', 'SINE'):
            t = N.new('ShaderNodeMath'); t.operation = op; L.new(ang.outputs[0], t.inputs[0])
            r = N.new('ShaderNodeMath'); r.operation = 'MULTIPLY'; r.inputs[1].default_value = R; L.new(t.outputs[0], r.inputs[0])
            sortie.append(r)
    vec = N.new('ShaderNodeCombineXYZ')
    for i in range(3):
        L.new(sortie[i].outputs[0], vec.inputs[i])
    return vec, sortie[3]


def tex4d(N, L, kind, vec, w, echelle):
    t = N.new(kind)
    if kind == 'ShaderNodeTexNoise':
        t.noise_dimensions = '4D'
        t.inputs['Detail'].default_value = 3
    else:
        t.voronoi_dimensions = '4D'
    t.inputs['Scale'].default_value = echelle
    L.new(vec.outputs[0], t.inputs['Vector']); L.new(w.outputs[0], t.inputs['W'])
    return t


def plage_d(N, L, a, b, src, interp='SMOOTHSTEP', vmin=0.0, vmax=1.0):
    m = N.new('ShaderNodeMapRange'); m.interpolation_type = interp
    m.inputs['From Min'].default_value = a; m.inputs['From Max'].default_value = b
    m.inputs['To Min'].default_value = vmin; m.inputs['To Max'].default_value = vmax
    L.new(src, m.inputs['Value'])
    return m.outputs['Result']


def melange(N, L, fac, c1, c2, mode='MIX'):
    m = N.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = mode
    for entree, v in ((m.inputs['Factor'], fac), (m.inputs[6], c1), (m.inputs[7], c2)):
        if isinstance(v, (tuple, list)):
            entree.default_value = (*v, 1) if len(v) == 3 else v
        elif isinstance(v, float):
            entree.default_value = v
        else:
            L.new(v, entree)
    return m.outputs[2]


def lin(hexa):
    return tuple(c ** 2.2 for c in hex_rgb(hexa))


def mat_rivage():
    """Plage organique (attribut « d » = distance à la terre, déjà ondulée) : sable sec, sable mouillé,
    dentelle d'écume à la ligne d'eau, eau turquoise translucide avec reflets de caustiques,
    puis bleu plus profond qui s'efface dans la mer."""
    m = bpy.data.materials.get('Rivage2')
    if m:
        return m
    m = bpy.data.materials.new('Rivage2')
    m.use_nodes = True
    try:
        m.surface_render_method = 'BLENDED'
    except AttributeError:
        m.blend_method = 'BLEND'
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF')
    at = N.new('ShaderNodeAttribute'); at.attribute_name = 'd'; at.attribute_type = 'GEOMETRY'
    d = at.outputs['Fac']
    vec, w = coords_tore(N, L)
    # sable : grain et taches
    nz = tex4d(N, L, 'ShaderNodeTexNoise', vec, w, 3.0)
    sec = melange(N, L, plage_d(N, L, 0.35, 0.7, nz.outputs['Fac']), lin('#dcbc7e'), lin('#f3dfaa'))
    mouille = melange(N, L, plage_d(N, L, 0.35, 0.7, nz.outputs['Fac']), lin('#a7895a'), lin('#c2a36c'))
    sable = melange(N, L, plage_d(N, L, 0.72, 0.97, d), sec, mouille)
    # eau : turquoise clair → bleu, mélangée par-dessus le sable mouillé (effet de transparence)
    rampe = N.new('ShaderNodeValToRGB')
    el = rampe.color_ramp.elements
    el[0].position = 0.0; el[0].color = (*lin('#7fe0d2'), 1)
    el[1].position = 1.0; el[1].color = (*lin('#1f6f9c'), 1)
    e2 = el.new(0.35); e2.color = (*lin('#38bdc4'), 1)
    L.new(plage_d(N, L, 1.0, 2.0, d, 'LINEAR'), rampe.inputs['Fac'])
    couvre = plage_d(N, L, 0.99, 1.75, d, 'SMOOTHSTEP', 0.55, 1.0)
    dans_eau = plage_d(N, L, 0.985, 1.02, d)
    fac_eau = N.new('ShaderNodeMath'); fac_eau.operation = 'MULTIPLY'
    L.new(couvre, fac_eau.inputs[0]); L.new(dans_eau, fac_eau.inputs[1])
    col = melange(N, L, fac_eau.outputs[0], sable, rampe.outputs['Color'])
    # caustiques : bords de cellules de Voronoï, plus visibles en eau peu profonde
    vo = tex4d(N, L, 'ShaderNodeTexVoronoi', vec, w, 7.0)
    vo.feature = 'DISTANCE_TO_EDGE'
    cau = plage_d(N, L, 0.0, 0.05, vo.outputs['Distance'], 'SMOOTHSTEP', 1.0, 0.0)
    peu = plage_d(N, L, 1.05, 1.9, d, 'LINEAR', 0.35, 0.0)
    fc = N.new('ShaderNodeMath'); fc.operation = 'MULTIPLY'
    L.new(cau, fc.inputs[0]); L.new(peu, fc.inputs[1])
    col = melange(N, L, fc.outputs[0], col, lin('#e9fffb'))
    # écume : dentelle irrégulière le long de la ligne d'eau + quelques paquets un peu plus au large
    ne = tex4d(N, L, 'ShaderNodeTexNoise', vec, w, 14.0)
    ne.inputs['Detail'].default_value = 6
    bande = N.new('ShaderNodeMath'); bande.operation = 'SUBTRACT'
    L.new(d, bande.inputs[0]); bande.inputs[1].default_value = 1.03
    absb = N.new('ShaderNodeMath'); absb.operation = 'ABSOLUTE'; L.new(bande.outputs[0], absb.inputs[0])
    prox = plage_d(N, L, 0.0, 0.11, absb.outputs[0], 'LINEAR', 1.0, 0.0)          # 1 sur la ligne d'eau
    seuil = N.new('ShaderNodeMath'); seuil.operation = 'ADD'
    L.new(ne.outputs['Fac'], seuil.inputs[0]); L.new(prox, seuil.inputs[1])
    ecume1 = plage_d(N, L, 1.12, 1.2, seuil.outputs[0])
    # liseré continu très fin au contact du sable
    lis = plage_d(N, L, 0.0, 0.018, absb.outputs[0], 'SMOOTHSTEP', 1.0, 0.0)
    # paquets d'écume épars plus loin (vague suivante)
    b2 = N.new('ShaderNodeMath'); b2.operation = 'SUBTRACT'; L.new(d, b2.inputs[0]); b2.inputs[1].default_value = 1.28
    a2 = N.new('ShaderNodeMath'); a2.operation = 'ABSOLUTE'; L.new(b2.outputs[0], a2.inputs[0])
    prox2 = plage_d(N, L, 0.0, 0.07, a2.outputs[0], 'LINEAR', 0.6, 0.0)
    s2 = N.new('ShaderNodeMath'); s2.operation = 'ADD'; L.new(ne.outputs['Fac'], s2.inputs[0]); L.new(prox2, s2.inputs[1])
    ecume2 = plage_d(N, L, 1.08, 1.14, s2.outputs[0], 'SMOOTHSTEP', 0.0, 0.85)
    em = N.new('ShaderNodeMath'); em.operation = 'MAXIMUM'
    L.new(ecume1, em.inputs[0]); L.new(ecume2, em.inputs[1])
    em2 = N.new('ShaderNodeMath'); em2.operation = 'MAXIMUM'
    L.new(em.outputs[0], em2.inputs[0]); L.new(lis, em2.inputs[1])
    col = melange(N, L, em2.outputs[0], col, lin('#fbfdff'))
    L.new(col, b.inputs['Base Color'])
    rug = N.new('ShaderNodeMath'); rug.operation = 'MULTIPLY_ADD'
    L.new(dans_eau, rug.inputs[0]); rug.inputs[1].default_value = -0.75; rug.inputs[2].default_value = 0.9
    L.new(rug.outputs[0], b.inputs['Roughness'])
    # transparence : l'eau s'efface dans la mer
    L.new(plage_d(N, L, 1.6, 2.1, d, 'SMOOTHSTEP', 1.0, 0.0), b.inputs['Alpha'])
    # relief : grain du sable et petites rides de l'eau
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.15; bump.inputs['Distance'].default_value = 0.01
    L.new(ne.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def ondulation(x, y):
    """Ondulation périodique (période 3 = une case) de la ligne de rivage, entre -1 et 1 environ."""
    T = math.tau / 3
    termes = [(1, 2, 0.32, 0.4), (2, -1, 0.28, 1.7), (3, 1, 0.18, 2.9), (1, -3, 0.14, 0.8), (4, 2, 0.1, 2.2), (2, 5, 0.08, 1.3)]
    return sum(a * math.sin(T * (p * x + q * y) + f) for p, q, a, f in termes)


def rivage(masque):
    """Plage organique sur une case d'eau voisine de l'île : distance aux cases de terre voisines (diagonales
    comprises : bords droits, angles saillants et rentrants, trou d'une case), ondulée par un motif périodique
    (raccord parfait entre cases), puis sable, écume et eau translucide (voir mat_rivage)."""
    carres = []
    for i, (dx, dy) in enumerate(VOISINS8):
        if masque[i] == '1':
            cx, cy = dx * 3.0, -dy * 3.0
            carres.append((cx - 1.5, cx + 1.5, cy - 1.5, cy + 1.5))

    def dist(x, y):
        d = 9.0
        for x0, x1, y0, y1 in carres:
            d = min(d, math.hypot(max(x0 - x, 0, x - x1), max(y0 - y, 0, y - y1)))
        return d
    n = 120
    vs, ds = [], []
    for j in range(n + 1):
        for i in range(n + 1):
            x, y = -1.5 + 3 * i / n, -1.5 + 3 * j / n
            d0 = dist(x, y)
            d = d0 + 0.2 * ondulation(x, y) * min(1.0, d0 / 0.35)   # au contact de la terre : pas d'ondulation
            ds.append(d)
            t = min(1.0, max(0.0, d) / 1.05)
            vs.append((x, y, -0.05 * t * t))
    fs = []
    for j in range(n):
        for i in range(n):
            a = j * (n + 1) + i
            q = (a, a + 1, a + n + 2, a + n + 1)
            if min(ds[k] for k in q) > 2.12:
                continue
            fs.append(q)
    me = bpy.data.meshes.new('rivage')
    me.from_pydata(vs, [], fs)
    me.attributes.new('d', 'FLOAT', 'POINT').data.foreach_set('value', ds)
    me.materials.append(mat_rivage())
    o = bpy.data.objects.new('sol', me)
    bpy.context.scene.collection.objects.link(o)
    return o


def mat_mer_motif():
    """Mer stylisée PÉRIODIQUE (période = une case de 3 unités en x et en y) : se raccorde sans couture.
    Bleu profond, bandes de vagues plus claires, petites crêtes d'écume."""
    m = bpy.data.materials.get('MerMotif')
    if m:
        return m
    m = bpy.data.materials.new('MerMotif')
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF'); b.inputs['Roughness'].default_value = 0.18
    geo = N.new('ShaderNodeNewGeometry')
    sep = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Position'], sep.inputs[0])
    TAU = math.tau

    def onde(ax, ay, periode, phase=0.0):
        """sin(2π (ax·x + ay·y) / période + phase) — périodes choisies pour diviser 3."""
        mx = N.new('ShaderNodeMath'); mx.operation = 'MULTIPLY'; mx.inputs[1].default_value = ax * TAU / periode
        my = N.new('ShaderNodeMath'); my.operation = 'MULTIPLY'; my.inputs[1].default_value = ay * TAU / periode
        L.new(sep.outputs[0], mx.inputs[0]); L.new(sep.outputs[1], my.inputs[0])
        ad = N.new('ShaderNodeMath'); ad.operation = 'ADD'; L.new(mx.outputs[0], ad.inputs[0]); L.new(my.outputs[0], ad.inputs[1])
        ph = N.new('ShaderNodeMath'); ph.operation = 'ADD'; ph.inputs[1].default_value = phase; L.new(ad.outputs[0], ph.inputs[0])
        s_ = N.new('ShaderNodeMath'); s_.operation = 'SINE'; L.new(ph.outputs[0], s_.inputs[0])
        return s_
    # somme d'ondes de périodes 3, 1.5, 1, 0.75 dans plusieurs directions
    ondes = [onde(1, 1, 3.0), onde(1, -1, 1.5, 1.3), onde(1, 0, 1.0, 0.7), onde(0, 1, 0.75, 2.1), onde(2, 1, 3.0, 0.4),
             onde(3, -1, 1.5, 0.9), onde(1, 2, 0.5, 1.7)]
    poids = [0.3, 0.25, 0.18, 0.14, 0.2, 0.15, 0.1]
    acc = None
    for o_, w in zip(ondes, poids):
        mw = N.new('ShaderNodeMath'); mw.operation = 'MULTIPLY'; mw.inputs[1].default_value = w; L.new(o_.outputs[0], mw.inputs[0])
        if acc is None:
            acc = mw
        else:
            a2 = N.new('ShaderNodeMath'); a2.operation = 'ADD'; L.new(acc.outputs[0], a2.inputs[0]); L.new(mw.outputs[0], a2.inputs[1]); acc = a2
    norm = N.new('ShaderNodeMapRange'); norm.inputs['From Min'].default_value = -1.0; norm.inputs['From Max'].default_value = 1.0
    L.new(acc.outputs[0], norm.inputs['Value'])
    r = N.new('ShaderNodeValToRGB')
    el = r.color_ramp.elements
    el[0].position = 0.0; el[0].color = (0.02, 0.16, 0.32, 1)
    el[1].position = 0.78; el[1].color = (0.05, 0.33, 0.52, 1)
    e2 = el.new(0.92); e2.color = (0.1, 0.45, 0.62, 1)
    e3 = el.new(0.975); e3.color = (0.6, 0.82, 0.9, 1)  # fines crêtes d'écume
    L.new(norm.outputs['Result'], r.inputs['Fac'])
    L.new(r.outputs['Color'], b.inputs['Base Color'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35; bump.inputs['Distance'].default_value = 0.03
    L.new(norm.outputs['Result'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


PLAGES = {f'plage-{a}{b}{c}{d}': (a, b, c, d) for a in '01' for b in '01' for c in '01' for d in '01' if (a, b, c, d) != ('0', '0', '0', '0')}


def plage(masque):
    """Case d'herbe dont les bords donnant sur la mer descendent en pente douce de sable jusqu'à l'eau.
    masque = (+x, +y, -x, -y) : '1' = bord de plage."""
    H, W = MARCHE, 0.8
    n = 72
    actifs = [i for i, c in enumerate(masque) if c == '1']

    def z_et_d(x, y):
        dmin = 9.0
        for i in actifs:
            # masque en axes de l'appli : +x, +y appli (= -y Blender), -x, -y appli (= +y Blender)
            d = [1.5 - x, y + 1.5, x + 1.5, 1.5 - y][i]
            dmin = min(dmin, d)
        t = max(0.0, min(1.0, 1 - dmin / W))
        return -H * (t * t * (3 - 2 * t)), dmin
    verts, faces, mats = [], [], []
    for j in range(n + 1):
        for i in range(n + 1):
            x, y = -1.5 + 3 * i / n, -1.5 + 3 * j / n
            verts.append((x, y, z_et_d(x, y)[0]))
    for j in range(n):
        for i in range(n):
            a = j * (n + 1) + i
            faces.append((a, a + 1, a + n + 2, a + n + 1))
            cx, cy = -1.5 + 3 * (i + 0.5) / n, -1.5 + 3 * (j + 0.5) / n
            d = z_et_d(cx, cy)[1]
            mats.append(3 if d < 0.05 else 2 if d < 0.3 else 1 if d < W * 0.92 else 0)
    me = bpy.data.meshes.new('plage')
    me.from_pydata(verts, [], faces)
    for m in (mat_herbe(), mat_bruit('SablePlage', '#d9bb7c', '#f2dca6', 3.0, 0.2), mat_bruit('SableMouille', '#a98d5c', '#c4a56d', 4.0, 0.15), _mat('Ecume', '#f4fbff', 0.6)):
        me.materials.append(m)
    for p, k in zip(me.polygons, mats):
        p.material_index = k
    o = bpy.data.objects.new('herbe', me)
    bpy.context.scene.collection.objects.link(o)
    tf = touffes(1.47, 170, seed=7)
    for t in tf:
        if t.location.z < -0.005:
            bpy.data.objects.remove(t)
    return o


def paroi_combo(hg, hd, seed=1):
    """Deux faces de falaise (gauche hg marches, droite hd marches) avec l'angle avant fermé."""
    objs = []
    objs += paroi('g', hg, seed, u_fin=1.5 + 0.12, avec_bord=False)
    objs += paroi('d', hd, seed + 1, u_fin=1.5 + 0.12, avec_bord=False)
    # bord d'herbe continu qui fait le tour de l'angle (arrondi)
    ch = chemin_face('g', -1.53, 1.5)
    for i in range(1, 12):
        a = -math.pi / 2 + (math.pi / 2) * i / 12
        ch.append((1.5, -1.5, math.cos(a), math.sin(a), 1.5))
    ch += chemin_face('d', 1.5, -1.53)
    objs.append(bourrelet(ch))
    rnd = random.Random(seed * 31 + hg * 5 + hd)
    objs += decor_rebord('g', rnd, -1.53, 1.5) + decor_rebord('d', rnd, -1.53, 1.5)
    return objs


def rendre(nom, out):
    sc = reset()
    if nom == 'mer-motif':
        dalle(12, 12, mat_mer_motif(), 0.0, 0)
        lo, hi = Vector((-1.5, -1.5, 0.0)), Vector((1.5, 1.5, 0.0))
    elif nom.startswith('rivage-'):
        rivage(nom[7:])
        lo, hi = Vector((-1.5, -1.5, -0.1)), Vector((1.5, 1.5, 0.05))
    elif nom in PLAGES:
        plage(PLAGES[nom])
        lo, hi = Vector((-1.5, -1.5, -MARCHE)), Vector((1.5, 1.5, 0.12))
    elif nom in FALAISES_C:
        a, b = FALAISES_C[nom]
        paroi_combo(a, b)
        for attr in ('use_raytracing', 'use_gtao'):
            try:
                setattr(sc.eevee, attr, True)
            except AttributeError:
                pass
        lo, hi = Vector((-1.6, -1.8, -max(a, b) * MARCHE - 0.2)), Vector((1.8, 1.6, 0.12))
    elif nom in PIEDS:
        pied(PIEDS[nom])
        for attr in ('use_raytracing', 'use_gtao'):
            try:
                setattr(sc.eevee, attr, True)
            except AttributeError:
                pass
        lo, hi = Vector((-1.6, -2.1, 0.0)), Vector((2.1, 1.6, 0.3))
    elif nom in FALAISES:
        f, h = FALAISES[nom]
        paroi(f, h)
        for attr in ('use_raytracing', 'use_gtao'):
            try:
                setattr(sc.eevee, attr, True)
            except AttributeError:
                pass
        lo, hi = Vector((-1.6, -1.8, -h * MARCHE - 0.2)), Vector((1.8, 1.6, 0.12))
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
for nom in (argv[1:] or list(SOLS) + list(FALAISES) + list(FALAISES_C) + list(PIEDS) + ['rivage-' + m for m in RIVAGES] + ['mer-motif']):
    rendre(nom, out)
