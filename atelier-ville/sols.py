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


def rendre(nom, out):
    sc = reset()
    if nom in RUES:
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
for nom in (argv[1:] or list(SOLS) + list(RUES)):
    rendre(nom, out)
