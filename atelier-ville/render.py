"""
Atelier ville — rendu isométrique des bâtiments avec Blender.

Lancement (sans interface) :
  blender -b -P atelier-ville/render.py -- <dossier_sortie> [nom_job ...]

Chaque « job » assemble un ou plusieurs modèles Kenney (CC0) sur une scène vide,
puis fait un rendu orthographique 2:1 (même angle que la ville SVG actuelle),
fond transparent, à échelle FIXE (pixels par unité) pour que tous les bâtiments
restent cohérents entre eux.
"""
import bpy, sys, os, math
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
KITS = os.path.join(HERE, 'kits')
SUB = os.path.join(KITS, 'city-kit-suburban', 'Models', 'GLB format')
COM = os.path.join(KITS, 'city-kit-commercial', 'Models', 'GLB format')

# px par unité Blender dans le rendu brut (le pixel art réduit ensuite)
PX_PER_UNIT = int(os.environ.get('ATELIER_PPU', '256'))
# Lissage du rendu : 1.5 = normal ; 0 = pixels francs (rendu direct en pixel art)
AA = float(os.environ.get('ATELIER_AA', '1.5'))

# Chaque job : liste de (fichier, position x, y, rotation en degrés), + sol optionnel
JOBS = {
    'maison': {'parts': [(f'{SUB}/building-type-c.glb', 0, 0, 0)]},
    'commerce': {'parts': [(f'{COM}/building-h.glb', 0, 0, 180)]},
    'tour': {'parts': [(f'{COM}/building-skyscraper-b.glb', 0, 0, 0)]},
    'parcelle': {
        # Terrain de 2 × 2 unités ; la façade (porte) regarde vers -y, côté gauche de l'image
        'ground': (2.0, 2.0),
        'parts': [
            (f'{SUB}/building-type-c.glb', 0.05, 0.3, 0),
            (f'{SUB}/path-stones-long.glb', 0.2, -0.42, 0),
            (f'{SUB}/path-stones-long.glb', 0.2, -0.82, 0),
            (f'{SUB}/tree-large.glb', -0.78, -0.75, 0),
            (f'{SUB}/tree-small.glb', -0.8, 0.75, 0),
            (f'{SUB}/tree-large.glb', 0.82, 0.8, 0),
            (f'{SUB}/planter.glb', -0.3, -0.38, 0),
            (f'{SUB}/planter.glb', 0.62, -0.38, 0),
            (f'{SUB}/fence-1x3.glb', -0.1, 0.98, 0),
        ],
    },
    'parcelle-maison2': {
        'ground': (2.0, 2.0),
        'parts': [
            (f'{SUB}/building-type-k.glb', 0.0, 0.25, 0),
            (f'{SUB}/driveway-long.glb', 0.45, -0.6, 0),
            (f'{SUB}/tree-small.glb', -0.8, -0.8, 0),
            (f'{SUB}/tree-large.glb', -0.82, 0.8, 0),
            (f'{SUB}/planter.glb', -0.35, -0.4, 0),
        ],
    },
    'parcelle-commerce': {
        'ground': (2.0, 2.0),
        'parts': [
            (f'{COM}/building-h.glb', 0.0, 0.2, 180),
            (f'{COM}/detail-parasol-a.glb', -0.55, -0.6, 0),
            (f'{COM}/detail-parasol-b.glb', 0.1, -0.7, 0),
            (f'{SUB}/tree-large.glb', 0.8, 0.8, 0),
        ],
    },
    'parcelle-tour': {
        'ground': (2.0, 2.0),
        'parts': [
            (f'{COM}/building-skyscraper-b.glb', 0.0, 0.1, 0),
            (f'{SUB}/tree-large.glb', -0.8, -0.8, 0),
            (f'{SUB}/tree-small.glb', 0.8, -0.8, 0),
            (f'{SUB}/planter.glb', -0.75, 0.3, 90),
        ],
    },
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try:
            sc.render.engine = eng
            break
        except TypeError:
            pass
    sc.render.film_transparent = True
    sc.render.filter_size = AA
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'  # couleurs franches, pas de « Filmic » délavé
    # Lumière d'ambiance douce
    world = bpy.data.worlds.new('W')
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get('Background')
    bg.inputs[0].default_value = (0.75, 0.80, 0.95, 1)
    bg.inputs[1].default_value = 0.55
    # Soleil de fin d'après-midi venant de la gauche (ombres vers la droite)
    sun = bpy.data.lights.new('Soleil', 'SUN')
    sun.energy = 3.2
    sun.angle = math.radians(2)
    sun.color = (1.0, 0.95, 0.85)
    so = bpy.data.objects.new('Soleil', sun)
    so.rotation_euler = (math.radians(50), 0, math.radians(-30))
    sc.collection.objects.link(so)
    try:
        sc.eevee.use_shadows = True
    except AttributeError:
        pass
    return sc


def import_part(path, x, y, rot):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in new if o.parent is None]
    # Option ATELIER_MAT=1 : matériaux mats (aplats nets, sans reflets)
    for o in (new if os.environ.get('ATELIER_MAT') == '1' else []):
        for slot in getattr(o, 'material_slots', []):
            m = slot.material
            if m and m.node_tree:
                b = m.node_tree.nodes.get('Principled BSDF')
                if b:
                    b.inputs['Roughness'].default_value = 1.0
                    for k in ('Specular IOR Level', 'Specular'):
                        if k in b.inputs:
                            b.inputs[k].default_value = 0.0
    # Rotation autour de la verticale puis déplacement (via la matrice : les objets
    # glTF importés sont en quaternions, rotation_euler serait ignoré)
    turn = Matrix.Translation((x, y, 0)) @ Matrix.Rotation(math.radians(rot), 4, 'Z')
    for r in roots:
        r.matrix_world = turn @ r.matrix_world
    bpy.context.view_layer.update()
    return new


def add_ground(w, d):
    bpy.ops.mesh.primitive_plane_add(size=1)
    g = bpy.context.active_object
    g.scale = (w, d, 1)
    m = bpy.data.materials.new('Herbe')
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (0.35, 0.62, 0.25, 1)
    bsdf.inputs['Roughness'].default_value = 1.0
    g.data.materials.append(m)
    # Petit socle (épaisseur) comme une tuile de la ville
    bpy.ops.object.modifier_add(type='SOLIDIFY')
    g.modifiers[-1].thickness = 0.12
    return g


def bounds(objs):
    pts = []
    for o in objs:
        if o.type != 'MESH':
            continue
        for c in o.bound_box:
            pts.append(o.matrix_world @ Vector(c))
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def camera_for(sc, lo, hi):
    cam = bpy.data.cameras.new('Cam')
    cam.type = 'ORTHO'
    co = bpy.data.objects.new('Cam', cam)
    sc.collection.objects.link(co)
    sc.camera = co
    # Iso 2:1 : inclinaison 60°, rotation 45°
    co.rotation_euler = (math.radians(60), 0, math.radians(45))
    bpy.context.view_layer.update()
    # Projette les 8 coins dans le repère caméra pour cadrer au plus juste
    inv = co.matrix_world.inverted()
    corners = [Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
    cc = [inv @ p for p in corners]
    minx, maxx = min(p.x for p in cc), max(p.x for p in cc)
    miny, maxy = min(p.y for p in cc), max(p.y for p in cc)
    pad = 0.15
    w, h = (maxx - minx) + pad * 2, (maxy - miny) + pad * 2
    cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
    # Recentre la caméra sur l'objet dans son propre plan
    co.location = co.matrix_world.to_quaternion() @ Vector((cx, cy, 50))
    cam.ortho_scale = max(w, h)
    cam.clip_end = 200
    sc.render.resolution_x = max(8, round(w * PX_PER_UNIT))
    sc.render.resolution_y = max(8, round(h * PX_PER_UNIT))
    sc.render.resolution_percentage = 100


def run(name, job, out):
    sc = reset()
    objs = []
    if 'ground' in job:
        objs.append(add_ground(*job['ground']))
    for p in job['parts']:
        objs += import_part(*p)
    lo, hi = bounds(objs)
    camera_for(sc, lo, hi)
    sc.render.filepath = os.path.join(out, f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print(f'[atelier] {name} -> {sc.render.filepath} ({sc.render.resolution_x}x{sc.render.resolution_y})')


argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out = os.path.abspath(argv[0] if argv else os.path.join(HERE, 'out', 'raw'))
os.makedirs(out, exist_ok=True)
names = argv[1:] or list(JOBS)
for n in names:
    run(n, JOBS[n], out)
