import * as THREE from 'three'
import type { Building } from '../city/buildings'

/*
 * Bâtiments en 3D « low-poly » construits en code à partir des mêmes données
 * que la vue 2D (type, couleurs, hauteur). Emprise : 1 × 1 (mise à l'échelle × 2
 * pour les bâtiments 2 × 2). Hauteur : 30 px de la vue 2D ≈ 1 unité.
 */

const mats = new Map<string, THREE.MeshStandardMaterial>()
export function mat(color: string, opts: { rough?: number; metal?: number; emissive?: string; transparent?: number } = {}) {
  const key = `${color}|${opts.rough ?? 0.85}|${opts.metal ?? 0}|${opts.emissive ?? ''}|${opts.transparent ?? 1}`
  let m = mats.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.85,
      metalness: opts.metal ?? 0,
      flatShading: true,
      emissive: opts.emissive ? new THREE.Color(opts.emissive) : undefined,
      emissiveIntensity: opts.emissive ? 0.6 : 0,
      transparent: (opts.transparent ?? 1) < 1,
      opacity: opts.transparent ?? 1,
    })
    mats.set(key, m)
  }
  return m
}

export function disposeMaterials() {
  mats.forEach((m) => m.dispose())
  mats.clear()
}

function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

const box = (w: number, h: number, d: number, color: string, y = 0, x = 0, z = 0, o = {}) =>
  mesh(new THREE.BoxGeometry(w, h, d), mat(color, o), x, y + h / 2, z)

/** Cylindre entre deux points (pieds de la tour Eiffel…) */
function beam(a: THREE.Vector3, b: THREE.Vector3, r: number, color: string) {
  const len = a.distanceTo(b)
  const m = mesh(new THREE.CylinderGeometry(r, r, len, 5), mat(color, { metal: 0.3, rough: 0.6 }))
  m.position.copy(a).add(b).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
  return m
}

function pyramidRoof(size: number, h: number, color: string, y: number) {
  const m = mesh(new THREE.ConeGeometry(size * 0.72, h, 4), mat(color), 0, y + h / 2, 0)
  m.rotation.y = Math.PI / 4
  return m
}

function windows(g: THREE.Group, w: number, h: number, floors: number, y0: number, color = '#cfe9ff') {
  const fh = h / floors
  for (let f = 0; f < floors; f++) {
    for (const u of [-0.2, 0.2]) {
      const y = y0 + f * fh + fh * 0.5
      g.add(box(0.14, fh * 0.45, 0.02, color, y - fh * 0.22, u * w * 1.6, w / 2 + 0.01, { rough: 0.2, metal: 0.2 }))
      const side = box(0.02, fh * 0.45, 0.14, color, y - fh * 0.22, w / 2 + 0.01, u * w * 1.6, { rough: 0.2, metal: 0.2 })
      g.add(side)
    }
  }
}

function holds(g: THREE.Group, n: number, area: (i: number) => [number, number, number], seed = 1) {
  const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff70a6']
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280), s / 233280)
  for (let i = 0; i < n; i++) {
    const [x, y, z] = area(rnd())
    g.add(mesh(new THREE.SphereGeometry(0.035 + rnd() * 0.02, 5, 4), mat(colors[i % colors.length], { rough: 0.5 }), x, y, z))
  }
}

export function buildMesh(b: Building): THREE.Group {
  const g = new THREE.Group()
  const H = b.h / 30
  const { color, accent } = b
  switch (b.kind) {
    case 'house': {
      g.add(box(0.8, H, 0.8, color))
      windows(g, 0.8, H * 0.8, 1, H * 0.1)
      g.add(box(0.16, 0.3, 0.02, '#6b3d1f', 0, 0.12, 0.41))
      if (b.roof === 'pyramid') g.add(pyramidRoof(0.86, 0.45, accent, H))
      else g.add(box(0.88, 0.07, 0.88, accent, H))
      break
    }
    case 'tower': {
      g.add(box(0.78, H, 0.78, color))
      windows(g, 0.78, H * 0.9, b.floors ?? 4, H * 0.08)
      g.add(box(0.84, 0.08, 0.84, accent, H))
      break
    }
    case 'glass': {
      g.add(box(0.66, H, 0.66, color, 0, 0, 0, { rough: 0.15, metal: 0.4 }))
      windows(g, 0.66, H * 0.92, 10, H * 0.05, '#e8f6ff')
      g.add(box(0.44, 0.35, 0.44, color, H, 0, 0, { rough: 0.15, metal: 0.4 }))
      g.add(beam(new THREE.Vector3(0, H + 0.35, 0), new THREE.Vector3(0, H + 0.9, 0), 0.015, '#2b2d42'))
      break
    }
    case 'tree': {
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.35, 6), mat(accent), 0, 0.17, 0))
      g.add(mesh(new THREE.IcosahedronGeometry(0.3, 0), mat(color), 0, 0.55, 0))
      g.add(mesh(new THREE.IcosahedronGeometry(0.2, 0), mat('#74c69d'), 0.12, 0.72, 0.05))
      break
    }
    case 'pine': {
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.25, 6), mat(accent), 0, 0.12, 0))
      ;[0.32, 0.25, 0.17].forEach((r, i) => g.add(mesh(new THREE.ConeGeometry(r, 0.38, 7), mat(i === 2 ? '#40916c' : color), 0, 0.38 + i * 0.22, 0)))
      break
    }
    case 'garden': {
      g.add(box(0.9, 0.04, 0.9, color))
      const cols = ['#ff70a6', '#ffd166', '#9b5de5', '#f15bb5']
      for (let i = 0; i < 9; i++) g.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), mat(cols[i % 4]), ((i % 3) - 1) * 0.28, 0.1, (Math.floor(i / 3) - 1) * 0.28))
      break
    }
    case 'water':
      g.add(mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 20), mat(color, { rough: 0.1, metal: 0.3 }), 0, 0.03, 0))
      break
    case 'fountain': {
      g.add(mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.15, 16), mat(color), 0, 0.075, 0))
      g.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 16), mat(accent, { rough: 0.1, metal: 0.3 }), 0, 0.15, 0))
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.45, 8), mat(color), 0, 0.37, 0))
      g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(accent, { rough: 0.1 }), 0, 0.62, 0))
      break
    }
    case 'kiosk': {
      g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 8), mat('#e9d8a6'), 0, 0.04, 0))
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, H, 5), mat(color), Math.cos(a) * 0.34, 0.08 + H / 2, Math.sin(a) * 0.34))
      }
      g.add(mesh(new THREE.ConeGeometry(0.5, 0.35, 8), mat(accent), 0, H + 0.25, 0))
      break
    }
    case 'stall': {
      g.add(box(0.6, 0.3, 0.4, '#b5651d'))
      g.add(box(0.55, 0.06, 0.35, color, 0.3))
      g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 5), mat('#2b2d42'), 0, 0.6, 0))
      g.add(mesh(new THREE.ConeGeometry(0.5, 0.22, 8), mat(accent), 0, 0.95, 0))
      break
    }
    case 'boulder': {
      g.add(box(0.7, 0.06, 0.5, '#4ea8de', 0, 0.05, 0.1))
      const r = mesh(new THREE.DodecahedronGeometry(0.34, 0), mat(color), 0, 0.3, 0)
      r.scale.set(1.1, 0.95, 0.85)
      g.add(r)
      holds(g, 8, (u) => [Math.cos(u * 9) * 0.3, 0.15 + u * 0.4, 0.28], 7)
      break
    }
    case 'wall': {
      g.add(box(0.9, 0.06, 0.6, '#4ea8de', 0, 0, 0.15))
      const w = box(0.9, H, 0.12, color, 0, 0, -0.2)
      w.rotation.x = -0.25
      g.add(w)
      holds(g, 12, (u) => [(u - 0.5) * 0.75, 0.1 + ((u * 7) % 1) * H * 0.9, -0.12 + ((u * 7) % 1) * H * 0.24], 3)
      break
    }
    case 'gym': {
      g.add(box(0.86, H, 0.86, color))
      holds(g, 14, (u) => [(u - 0.5) * 0.76, 0.1 + ((u * 5) % 1) * (H - 0.2), 0.44], 11)
      holds(g, 14, (u) => [0.44, 0.1 + ((u * 3) % 1) * (H - 0.2), (u - 0.5) * 0.76], 5)
      g.add(box(0.92, 0.1, 0.92, accent, H))
      break
    }
    case 'cliff':
    case 'bigwall': {
      const n = b.kind === 'cliff' ? 4 : 6
      for (let i = 0; i < n; i++) {
        const r = mesh(new THREE.DodecahedronGeometry(0.42 - i * 0.05, 0), mat(i % 2 ? color : '#9c8b7a'), (i % 2 ? 0.06 : -0.06), (i * H) / n + 0.25, i % 3 ? 0.04 : -0.04)
        r.scale.set(1, 1.3, 0.9)
        r.rotation.y = i
        g.add(r)
      }
      if (b.kind === 'bigwall') g.add(mesh(new THREE.ConeGeometry(0.2, 0.35, 5), mat('#ffffff'), 0, H + 0.2, 0))
      holds(g, 12, (u) => [(u - 0.5) * 0.4, 0.2 + ((u * 11) % 1) * H * 0.9, 0.36], 13)
      g.add(beam(new THREE.Vector3(0.05, 0, 0.4), new THREE.Vector3(0.05, H * 0.8, 0.38), 0.008, accent))
      break
    }
    case 'statue': {
      g.add(box(0.5, 0.3, 0.5, color))
      g.add(mesh(new THREE.CapsuleGeometry(0.07, 0.25, 3, 6), mat(accent, { metal: 0.7, rough: 0.3 }), 0, 0.55, 0))
      g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(accent, { metal: 0.7, rough: 0.3 }), 0, 0.78, 0))
      g.add(beam(new THREE.Vector3(0, 0.62, 0), new THREE.Vector3(0.16, 0.85, 0), 0.025, accent))
      break
    }
    case 'lighthouse': {
      const seg = 5
      for (let i = 0; i < seg; i++) {
        const r0 = 0.32 - (i / seg) * 0.12
        const r1 = 0.32 - ((i + 1) / seg) * 0.12
        g.add(mesh(new THREE.CylinderGeometry(r1, r0, H / seg, 12), mat(i % 2 ? accent : color), 0, (i + 0.5) * (H / seg), 0))
      }
      g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 10), mat('#ffe66d', { emissive: '#ffd60a' }), 0, H + 0.11, 0))
      g.add(mesh(new THREE.ConeGeometry(0.22, 0.2, 10), mat(accent), 0, H + 0.32, 0))
      break
    }
    case 'clock': {
      g.add(box(0.6, H, 0.6, color))
      g.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16), mat('#ffffff'), 0, H - 0.3, 0.31).rotateX(Math.PI / 2))
      g.add(pyramidRoof(0.65, 0.55, accent, H))
      break
    }
    case 'castle': {
      g.add(box(0.7, H * 0.75, 0.7, color))
      for (const [x, z] of [
        [-0.38, -0.38],
        [0.38, -0.38],
        [-0.38, 0.38],
        [0.38, 0.38],
      ]) {
        g.add(mesh(new THREE.CylinderGeometry(0.12, 0.13, H, 8), mat(color), x, H / 2, z))
        g.add(mesh(new THREE.ConeGeometry(0.16, 0.28, 8), mat(accent), x, H + 0.14, z))
      }
      g.add(box(0.14, 0.32, 0.02, '#5e3b2b', 0, 0, 0.36))
      g.add(beam(new THREE.Vector3(0, H * 0.75, 0), new THREE.Vector3(0, H * 0.75 + 0.4, 0), 0.01, '#2b2d42'))
      g.add(box(0.18, 0.1, 0.01, '#e63946', H * 0.75 + 0.28, 0.09, 0))
      break
    }
    case 'observatory': {
      g.add(box(0.8, H * 0.55, 0.8, color))
      g.add(mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(accent, { metal: 0.4, rough: 0.4 }), 0, H * 0.55, 0))
      g.add(beam(new THREE.Vector3(0, H * 0.55 + 0.25, 0), new THREE.Vector3(0.3, H * 0.55 + 0.55, 0), 0.05, '#2b2d42'))
      break
    }
    case 'pyramid': {
      const p = mesh(new THREE.ConeGeometry(0.66, H, 4), mat(color), 0, H / 2, 0)
      p.rotation.y = Math.PI / 4
      g.add(p)
      const cap = mesh(new THREE.ConeGeometry(0.1, 0.15, 4), mat('#ffd60a', { metal: 0.8, rough: 0.2 }), 0, H - 0.07, 0)
      cap.rotation.y = Math.PI / 4
      g.add(cap)
      break
    }
    case 'eiffel': {
      const top = new THREE.Vector3(0, H * 0.82, 0)
      for (const [x, z] of [
        [-0.4, -0.4],
        [0.4, -0.4],
        [-0.4, 0.4],
        [0.4, 0.4],
      ]) {
        const foot = new THREE.Vector3(x, 0, z)
        const knee = new THREE.Vector3(x * 0.45, H * 0.3, z * 0.45)
        g.add(beam(foot, knee, 0.035, accent))
        g.add(beam(knee, top, 0.025, accent))
      }
      g.add(box(0.55, 0.05, 0.55, accent, H * 0.28))
      g.add(box(0.28, 0.04, 0.28, accent, H * 0.55))
      g.add(beam(top, new THREE.Vector3(0, H * 1.05, 0), 0.02, accent))
      break
    }
    case 'colosseum': {
      g.add(mesh(new THREE.CylinderGeometry(0.47, 0.47, H, 24, 1, true), mat(color, {}), 0, H / 2, 0))
      ;(g.children[g.children.length - 1] as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color, flatShading: true, side: THREE.DoubleSide, roughness: 0.9 })
      g.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 24), mat('#e9d5a6'), 0, 0.04, 0))
      g.add(mesh(new THREE.TorusGeometry(0.47, 0.03, 4, 24), mat(accent), 0, H, 0).rotateX(Math.PI / 2))
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        g.add(box(0.06, H * 0.35, 0.02, '#6d5638', H * 0.15, Math.cos(a) * 0.475, Math.sin(a) * 0.475).rotateY(-a + Math.PI / 2))
      }
      break
    }
    case 'temple': {
      g.add(box(0.95, 0.12, 0.8, accent))
      for (let i = 0; i < 6; i++) {
        for (const z of [-0.3, 0.3]) g.add(mesh(new THREE.CylinderGeometry(0.04, 0.045, H, 8), mat(color), -0.38 + i * 0.152, 0.12 + H / 2, z))
      }
      g.add(box(0.98, 0.08, 0.82, color, H + 0.12))
      const roof = mesh(new THREE.ConeGeometry(0.62, 0.22, 4), mat(color), 0, H + 0.31, 0)
      roof.rotation.y = Math.PI / 4
      roof.scale.set(1.15, 1, 0.95)
      g.add(roof)
      break
    }
    case 'moai': {
      g.add(box(0.4, 0.15, 0.4, accent))
      g.add(box(0.34, H * 0.8, 0.3, color, 0.15))
      g.add(box(0.08, 0.22, 0.08, color, 0.15 + H * 0.35, 0, 0.17))
      g.add(box(0.36, 0.08, 0.32, '#b5603c', 0.15 + H * 0.8))
      break
    }
    case 'rocket': {
      g.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16), mat('#adb5bd'), 0, 0.05, 0))
      g.add(mesh(new THREE.CylinderGeometry(0.16, 0.18, H * 0.8, 14), mat(color, { metal: 0.3, rough: 0.4 }), 0, 0.1 + H * 0.4, 0))
      g.add(mesh(new THREE.ConeGeometry(0.16, 0.4, 14), mat(accent), 0, 0.1 + H * 0.8 + 0.2, 0))
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2
        g.add(box(0.03, 0.25, 0.18, accent, 0.1, Math.cos(a) * 0.2, Math.sin(a) * 0.2).rotateY(-a))
      }
      g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), mat('#8ecae6', { rough: 0.1 }), 0, 0.1 + H * 0.55, 0.17).rotateX(Math.PI / 2))
      break
    }
    case 'arch': {
      const a = mesh(new THREE.TorusGeometry(0.32, 0.11, 6, 14, Math.PI), mat(color), 0, 0.05, 0)
      a.scale.set(1, H / 0.45, 1)
      g.add(a)
      holds(g, 8, (u) => [(u < 0.5 ? -0.32 : 0.32) + (u - 0.5) * 0.05, 0.1 + ((u * 7) % 1) * H * 0.6, 0.1], 17)
      break
    }
    default:
      g.add(box(0.8, Math.max(0.3, H), 0.8, color))
  }
  return g
}
