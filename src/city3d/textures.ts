import * as THREE from 'three'

/*
 * Textures procédurales (dessinées en code sur un canvas, rien à télécharger).
 * Chaque texture a une couleur (map) et une carte de relief (normalMap) calculée
 * à partir d'une carte de hauteur, pour que la lumière accroche les détails.
 * Les textures de bâtiments sont claires et neutres : la couleur du bâtiment
 * vient teinter la texture.
 */

export type TexId =
  | 'grass'
  | 'grassSide'
  | 'dirt'
  | 'rock'
  | 'asphalt'
  | 'sand'
  | 'planks'
  | 'paving'
  | 'snow'
  | 'seabed'
  | 'plaster'
  | 'brick'
  | 'woodwall'
  | 'roof'
  | 'stoneblock'
  | 'glass'
  | 'leaves'

/** Répétitions de la texture par unité de longueur (taille d'une case = 1) */
export const DENSITY: Record<TexId, number> = {
  grass: 1,
  grassSide: 1,
  dirt: 1,
  rock: 1.2,
  asphalt: 1,
  sand: 1,
  planks: 1,
  paving: 1,
  snow: 1,
  seabed: 0.25,
  plaster: 1.2,
  brick: 1.6,
  woodwall: 1.6,
  roof: 2,
  stoneblock: 1.4,
  glass: 2.4,
  leaves: 2,
}

const N = 256

/** Générateur pseudo-aléatoire reproductible */
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

/** Bruit de valeur lissé et raccordable (la texture se répète sans couture) */
function makeNoise(cells: number, seed: number) {
  const r = rng(seed)
  const g = Array.from({ length: cells * cells }, () => r())
  const at = (x: number, y: number) => g[((y % cells) + cells) % cells * cells + (((x % cells) + cells) % cells)]
  const sm = (t: number) => t * t * (3 - 2 * t)
  return (x: number, y: number) => {
    const fx = (x / N) * cells
    const fy = (y / N) * cells
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const tx = sm(fx - x0)
    const ty = sm(fy - y0)
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx
    return a + (b - a) * ty
  }
}

const fbm = (seed: number) => {
  const n1 = makeNoise(8, seed)
  const n2 = makeNoise(16, seed + 1)
  const n3 = makeNoise(32, seed + 2)
  const n4 = makeNoise(64, seed + 3)
  return (x: number, y: number) => n1(x, y) * 0.5 + n2(x, y) * 0.25 + n3(x, y) * 0.15 + n4(x, y) * 0.1
}

type RGB = [number, number, number]
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

interface Paint {
  color: (x: number, y: number) => RGB
  height: (x: number, y: number) => number
}

function painter(id: TexId): Paint {
  switch (id) {
    case 'grass': {
      const n = fbm(11)
      const blades = makeNoise(128, 12)
      return {
        color: (x, y) => {
          const v = n(x, y)
          const b = blades(x, y)
          const base = mix([104, 168, 70], [150, 206, 98], v)
          // petits reflets et creux, sans stries
          return mix(base, b > 0.78 ? [186, 226, 128] : b < 0.2 ? [84, 140, 56] : base, 0.4)
        },
        height: (x, y) => n(x, y) * 0.6 + blades(x, y) * 0.4,
      }
    }
    case 'grassSide': {
      const n = fbm(21)
      const edge = makeNoise(24, 22)
      const dirt = painter('dirt')
      return {
        color: (x, y) => {
          const limit = N * (0.42 + edge(x, 0) * 0.22)
          return y < limit ? mix([84, 148, 56], [120, 184, 80], n(x, y)) : dirt.color(x, y)
        },
        height: (x, y) => (y < N * (0.42 + edge(x, 0) * 0.22) ? 0.7 + n(x, y) * 0.3 : dirt.height(x, y)),
      }
    }
    case 'dirt': {
      const n = fbm(31)
      const strata = makeNoise(6, 32)
      const peb = makeNoise(48, 33)
      return {
        color: (x, y) => {
          const band = Math.sin((y / N) * Math.PI * 8 + strata(x, y) * 4) * 0.5 + 0.5
          const base = mix([120, 80, 48], [158, 110, 70], n(x, y) * 0.7 + band * 0.3)
          const p = peb(x, y)
          return p > 0.8 ? [176, 150, 120] : p < 0.12 ? [92, 60, 36] : base
        },
        height: (x, y) => n(x, y) * 0.5 + (peb(x, y) > 0.8 ? 0.5 : 0),
      }
    }
    case 'rock': {
      const n = fbm(41)
      const crack = makeNoise(20, 42)
      return {
        color: (x, y) => {
          const c = Math.abs(crack(x, y) - 0.5) < 0.025 ? 0.55 : 1
          const v = mix([118, 112, 104], [176, 170, 160], n(x, y))
          return [v[0] * c, v[1] * c, v[2] * c]
        },
        height: (x, y) => n(x, y) - (Math.abs(crack(x, y) - 0.5) < 0.025 ? 0.4 : 0),
      }
    }
    case 'asphalt': {
      const n = fbm(51)
      const r = makeNoise(128, 52)
      return {
        color: (x, y) => {
          const v = 78 + n(x, y) * 22 + (r(x, y) > 0.8 ? 30 : 0)
          return [v, v + 2, v + 8]
        },
        height: (x, y) => r(x, y) * 0.6 + n(x, y) * 0.4,
      }
    }
    case 'sand': {
      const n = fbm(61)
      return {
        color: (x, y) => {
          const rip = Math.sin((x + y * 0.4) / 7 + n(x, y) * 6) * 0.5 + 0.5
          return mix([214, 190, 130], [240, 222, 168], n(x, y) * 0.6 + rip * 0.4)
        },
        height: (x, y) => Math.sin((x + y * 0.4) / 7 + n(x, y) * 6) * 0.5 + 0.5,
      }
    }
    case 'planks': {
      const n = fbm(71)
      const grain = makeNoise(64, 72)
      return {
        color: (x, y) => {
          const row = Math.floor(y / (N / 6))
          const gap = y % (N / 6) < 3 ? 0.55 : 1
          const g = grain(x * 0.15 + row * 50, y * 3)
          const v = mix([150, 98, 56], [196, 140, 86], g * 0.6 + n(x, y) * 0.4 + (row % 2) * 0.08)
          return [v[0] * gap, v[1] * gap, v[2] * gap]
        },
        height: (x, y) => (y % (N / 6) < 3 ? 0 : 0.6 + grain(x * 0.15, y * 3) * 0.4),
      }
    }
    case 'paving': {
      const n = fbm(81)
      return {
        color: (x, y) => {
          const s = N / 4
          const off = Math.floor(y / s) % 2 ? s / 2 : 0
          const mortar = (x + off) % s < 4 || y % s < 4
          const tile = Math.floor((x + off) / s) * 7 + Math.floor(y / s) * 13
          const v = mix([168, 160, 150], [206, 198, 186], ((tile * 37) % 10) / 10 * 0.5 + n(x, y) * 0.5)
          return mortar ? [120, 112, 104] : v
        },
        height: (x, y) => {
          const s = N / 4
          const off = Math.floor(y / s) % 2 ? s / 2 : 0
          return (x + off) % s < 4 || y % s < 4 ? 0 : 0.8 + n(x, y) * 0.2
        },
      }
    }
    case 'snow': {
      const n = fbm(91)
      const sp = makeNoise(128, 92)
      return {
        color: (x, y) => {
          const v = mix([214, 226, 240], [250, 252, 255], n(x, y))
          return sp(x, y) > 0.9 ? [255, 255, 255] : v
        },
        height: (x, y) => n(x, y),
      }
    }
    case 'seabed': {
      const n = fbm(101)
      return { color: (x, y) => mix([150, 140, 100], [196, 184, 140], n(x, y)), height: (x, y) => n(x, y) }
    }
    case 'plaster': {
      const n = fbm(111)
      return { color: (x, y) => { const v = 214 + n(x, y) * 36; return [v, v, v - 4] }, height: (x, y) => n(x, y) * 0.6 }
    }
    case 'brick': {
      const n = fbm(121)
      return {
        color: (x, y) => {
          const bh = N / 8
          const bw = N / 4
          const off = Math.floor(y / bh) % 2 ? bw / 2 : 0
          const mortar = y % bh < 3 || (x + off) % bw < 3
          const id = Math.floor((x + off) / bw) * 3 + Math.floor(y / bh) * 7
          const v = 196 + ((id * 53) % 40) - 20 + n(x, y) * 20
          return mortar ? [238, 236, 230] : [v, v * 0.93, v * 0.9]
        },
        height: (x, y) => {
          const bh = N / 8
          const bw = N / 4
          const off = Math.floor(y / bh) % 2 ? bw / 2 : 0
          return y % bh < 3 || (x + off) % bw < 3 ? 0 : 0.8 + n(x, y) * 0.2
        },
      }
    }
    case 'woodwall': {
      const grain = makeNoise(48, 131)
      return {
        color: (x, y) => {
          const pw = N / 5
          const gap = x % pw < 3 ? 0.62 : 1
          const v = 200 + grain(x * 4, y * 0.4) * 40
          return [v * gap, v * 0.92 * gap, v * 0.84 * gap]
        },
        height: (x, y) => (x % (N / 5) < 3 ? 0 : 0.6 + grain(x * 4, y * 0.4) * 0.4),
      }
    }
    case 'roof': {
      const n = fbm(141)
      return {
        color: (x, y) => {
          const rh = N / 8
          const tw = N / 6
          const off = Math.floor(y / rh) % 2 ? tw / 2 : 0
          const u = ((x + off) % tw) / tw - 0.5
          const v = (y % rh) / rh
          const shade = v > 0.75 - u * u * 0.8 ? 0.7 : 1
          const c = 210 + n(x, y) * 40
          return [c * shade, c * shade, c * shade]
        },
        height: (x, y) => ((y % (N / 8)) / (N / 8)) * 0.8 + n(x, y) * 0.2,
      }
    }
    case 'stoneblock': {
      const n = fbm(151)
      return {
        color: (x, y) => {
          const bh = N / 5
          const bw = N / 3
          const off = Math.floor(y / bh) % 2 ? bw / 2 : 0
          const joint = y % bh < 3 || (x + off) % bw < 3
          const id = Math.floor((x + off) / bw) * 5 + Math.floor(y / bh) * 11
          const v = 206 + ((id * 29) % 30) - 15 + n(x, y) * 26
          return joint ? [150, 144, 136] : [v, v * 0.97, v * 0.92]
        },
        height: (x, y) => {
          const bh = N / 5
          const bw = N / 3
          const off = Math.floor(y / bh) % 2 ? bw / 2 : 0
          return y % bh < 3 || (x + off) % bw < 3 ? 0 : 0.7 + n(x, y) * 0.3
        },
      }
    }
    case 'glass': {
      const n = fbm(161)
      return {
        color: (x, y) => {
          const frame = x % (N / 4) < 5 || y % (N / 4) < 5
          const v = 170 + n(x, y) * 60 + (y / N) * 25
          return frame ? [236, 240, 244] : [v * 0.85, v * 0.95, v]
        },
        height: (x, y) => (x % (N / 4) < 5 || y % (N / 4) < 5 ? 1 : 0.2),
      }
    }
    case 'leaves': {
      const n = fbm(171)
      const l = makeNoise(40, 172)
      return {
        color: (x, y) => {
          const v = l(x, y)
          const c = 170 + n(x, y) * 60 + (v > 0.7 ? 30 : v < 0.3 ? -40 : 0)
          return [c, c, c]
        },
        height: (x, y) => l(x, y),
      }
    }
  }
}

const cache = new Map<TexId, { map: THREE.CanvasTexture; normal: THREE.CanvasTexture }>()

/** Couleur + relief d'une texture (mis en cache) */
export function texture(id: TexId) {
  const hit = cache.get(id)
  if (hit) return hit
  const p = painter(id)
  const heights = new Float32Array(N * N)
  const colorCanvas = document.createElement('canvas')
  colorCanvas.width = colorCanvas.height = N
  const cctx = colorCanvas.getContext('2d')!
  const cimg = cctx.createImageData(N, N)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const [r, g, b] = p.color(x, y)
      const i = (y * N + x) * 4
      cimg.data[i] = r
      cimg.data[i + 1] = g
      cimg.data[i + 2] = b
      cimg.data[i + 3] = 255
      heights[y * N + x] = p.height(x, y)
    }
  cctx.putImageData(cimg, 0, 0)

  const normalCanvas = document.createElement('canvas')
  normalCanvas.width = normalCanvas.height = N
  const nctx = normalCanvas.getContext('2d')!
  const nimg = nctx.createImageData(N, N)
  const h = (x: number, y: number) => heights[((y + N) % N) * N + ((x + N) % N)]
  const v = new THREE.Vector3()
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      v.set((h(x - 1, y) - h(x + 1, y)) * 3, (h(x, y + 1) - h(x, y - 1)) * 3, 1).normalize()
      const i = (y * N + x) * 4
      nimg.data[i] = (v.x * 0.5 + 0.5) * 255
      nimg.data[i + 1] = (v.y * 0.5 + 0.5) * 255
      nimg.data[i + 2] = (v.z * 0.5 + 0.5) * 255
      nimg.data[i + 3] = 255
    }
  nctx.putImageData(nimg, 0, 0)

  const map = new THREE.CanvasTexture(colorCanvas)
  map.colorSpace = THREE.SRGBColorSpace
  const normal = new THREE.CanvasTexture(normalCanvas)
  for (const t of [map, normal]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 4
  }
  const out = { map, normal }
  cache.set(id, out)
  return out
}

export function disposeTextures() {
  cache.forEach(({ map, normal }) => {
    map.dispose()
    normal.dispose()
  })
  cache.clear()
}

/**
 * Remet les coordonnées de texture d'une boîte à l'échelle du monde :
 * une brique garde la même taille sur un petit mur et sur une tour.
 */
export function worldUV(geo: THREE.BufferGeometry, w: number, h: number, d: number, density: number) {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute
  // ordre des faces d'une BoxGeometry : +x, -x, +y, -y, +z, -z (4 sommets chacune)
  const sizes: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ]
  for (let f = 0; f < 6; f++)
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k
      uv.setXY(i, uv.getX(i) * sizes[f][0] * density, uv.getY(i) * sizes[f][1] * density)
    }
  uv.needsUpdate = true
  return geo
}
