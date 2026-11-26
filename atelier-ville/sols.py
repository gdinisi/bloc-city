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
FALAISES = {f'falaise-{f}-{h}': (f, h) for f in 'gd' for h in (1, 2, 3)}


def mat_roche():
    m = bpy.data.materials.get('Roche')
    if m:
        return m
    m = bpy.data.materials.new('Roche')
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N.get('Principled BSDF'); b.inputs['Roughness'].default_value = 0.95
    geo = N.new('ShaderNodeNewGeometry')
    st = N.new('ShaderNodeTexWave'); st.wave_type = 'BANDS'; st.bands_direction = 'Z'
    st.inputs['Scale'].default_value = 1.4; st.inputs['Distortion'].default_value = 9.0; st.inputs['Detail'].default_value = 4
    L.new(geo.outputs['Position'], st.inputs['Vector'])
    r = N.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].color = (0.24, 0.2, 0.16, 1); r.color_ramp.elements[0].position = 0.15
    r.color_ramp.elements[1].color = (0.4, 0.34, 0.27, 1); r.color_ramp.elements[1].position = 0.95
    L.new(st.outputs['Fac'], r.inputs['Fac']); L.new(r.outputs['Color'], b.inputs['Base Color'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 18
    L.new(geo.outputs['Position'], nz.inputs['Vector'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.5; bump.inputs['Distance'].default_value = 0.02
    L.new(nz.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def paroi(face, h, seed=1):
    """Paroi rocheuse irrégulière (facettes) d'une hauteur de h marches, avec un liseré d'herbe en haut."""
    rnd = random.Random(seed * 7 + h)
    H = h * MARCHE
    nx, nz = 18, max(4, int(5 * h))
    verts, faces = [], []
    for j in range(nz + 1):
        z = -H * j / nz
        for i in range(nx + 1):
            u = -1.5 + 3.0 * i / nx
            bord = i in (0, nx) or j == 0
            sortie = 0.0 if bord else rnd.uniform(0.03, 0.2) + 0.06 * math.sin(i * 0.9 + j * 1.7)
            # paroi un peu évasée vers le bas, comme un éboulis
            sortie += 0.08 * (j / nz) ** 2 * (0 if i in (0, nx) else 1)
            if face == 'g':
                verts.append((u, -1.5 - sortie, z))
            else:
                verts.append((1.5 + sortie, -u, z))
    for j in range(nz):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    me = bpy.data.meshes.new('paroi')
    me.from_pydata(verts, [], faces)
    me.materials.append(mat_roche())
    o = bpy.data.objects.new('paroi', me)
    bpy.context.scene.collection.objects.link(o)
    # liseré d'herbe qui déborde un peu du haut de la falaise
    lis = dalle(3.0 if face == 'g' else 0.12, 0.12 if face == 'g' else 3.0, mat_herbe(), 0.005, 0.07,
                0.0 if face == 'g' else 1.52, -1.52 if face == 'g' else 0.0)
    return [o, lis]


def rendre(nom, out):
    sc = reset()
    if nom in FALAISES:
        f, h = FALAISES[nom]
        paroi(f, h)
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
