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
  | 'meadow'
  | 'soil'
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
  meadow: 1,
  soil: 1,
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

/* ---------- Détails dessinés au trait (brins, fleurs, gravillons, pavés…) ---------- */

type Deco = (ctx: CanvasRenderingContext2D, r: () => number) => void

/** Dessine une forme et ses copies de l'autre côté des bords (texture sans couture) */
function each9(x: number, y: number, m: number, f: (x: number, y: number) => void) {
  for (const dx of [0, -N, N])
    for (const dy of [0, -N, N]) {
      const X = x + dx
      const Y = y + dy
      if (X > -m && X < N + m && Y > -m && Y < N + m) f(X, Y)
    }
}

const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)]

function grassBlades(ctx: CanvasRenderingContext2D, r: () => number, count: number) {
  const blades = ['#3a7228', '#4e8f36', '#5c9c3f', '#76b84f', '#97cf6a', '#2f6322', '#b5e07f']
  ctx.lineCap = 'round'
  for (let i = 0; i < count; i++) {
    const x = r() * N
    const y = r() * N
    const len = 5 + r() * 9
    const ang = -Math.PI / 2 + (r() - 0.5) * 1.1
    ctx.strokeStyle = pick(r, blades)
    ctx.lineWidth = 1.3 + r() * 1.3
    each9(x, y, 10, (X, Y) => {
      ctx.beginPath()
      ctx.moveTo(X, Y)
      ctx.quadraticCurveTo(X + Math.cos(ang) * len * 0.5 + (r() - 0.5) * 2, Y + Math.sin(ang) * len * 0.5, X + Math.cos(ang) * len, Y + Math.sin(ang) * len)
      ctx.stroke()
    })
  }
}

function flowers(ctx: CanvasRenderingContext2D, r: () => number, count: number, colors: string[], size: number) {
  for (let i = 0; i < count; i++) {
    const x = r() * N
    const y = r() * N
    const c = pick(r, colors)
    const s = size * (0.7 + r() * 0.6)
    each9(x, y, 6, (X, Y) => {
      ctx.fillStyle = c
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(X + Math.cos(a) * s * 0.7, Y + Math.sin(a) * s * 0.7, s * 0.55, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#ffd34d'
      ctx.beginPath()
      ctx.arc(X, Y, s * 0.4, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}

function dots(ctx: CanvasRenderingContext2D, r: () => number, count: number, colors: string[], min: number, max: number) {
  for (let i = 0; i < count; i++) {
    const x = r() * N
    const y = r() * N
    ctx.fillStyle = pick(r, colors)
    const s = min + r() * (max - min)
    each9(x, y, max + 1, (X, Y) => {
      ctx.beginPath()
      ctx.arc(X, Y, s, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}

/** Petits cailloux arrondis avec reflet */
function pebbles(ctx: CanvasRenderingContext2D, r: () => number, count: number, colors: string[], min: number, max: number) {
  for (let i = 0; i < count; i++) {
    const x = r() * N
    const y = r() * N
    const w = min + r() * (max - min)
    const h = w * (0.6 + r() * 0.3)
    const c = pick(r, colors)
    const rot = r() * Math.PI
    each9(x, y, max + 2, (X, Y) => {
      ctx.save()
      ctx.translate(X, Y)
      ctx.rotate(rot)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(0.8, 1, w, h, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.ellipse(-w * 0.3, -h * 0.35, w * 0.4, h * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  }
}

const DECO: Partial<Record<TexId, Deco>> = {
  grass: (ctx, r) => {
    dots(ctx, r, 70, ['#7a5a3a', '#8b6a45'], 0.5, 1)
    grassBlades(ctx, r, 1500)
    // trèfles
    for (let i = 0; i < 26; i++) {
      const x = r() * N
      const y = r() * N
      each9(x, y, 5, (X, Y) => {
        ctx.fillStyle = '#4f9636'
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 - Math.PI / 2
          ctx.beginPath()
          ctx.arc(X + Math.cos(a) * 1.7, Y + Math.sin(a) * 1.7, 1.6, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    }
    flowers(ctx, r, 10, ['#ffffff', '#fff3a3'], 1.4)
  },
  meadow: (ctx, r) => {
    grassBlades(ctx, r, 1300)
    flowers(ctx, r, 95, ['#ff70a6', '#ffffff', '#9b5de5', '#ff8fab', '#ffd166', '#74c0fc'], 2)
  },
  soil: (ctx, r) => {
    pebbles(ctx, r, 70, ['#6f4b2e', '#8a6040', '#a27450', '#5c3d24'], 2, 5)
    pebbles(ctx, r, 22, ['#9a948c', '#b5afa6', '#80796f'], 1.5, 3.5)
    // racines
    ctx.strokeStyle = 'rgba(60,38,20,0.6)'
    ctx.lineWidth = 1
    for (let i = 0; i < 4; i++) {
      let x = r() * N
      let y = r() * N
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let k = 0; k < 8; k++) {
        x += (r() - 0.3) * 8
        y += (r() - 0.5) * 8
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    grassBlades(ctx, r, 80)
  },
  asphalt: (ctx, r) => {
    // rapiéçages
    for (let i = 0; i < 3; i++) {
      const x = r() * N
      const y = r() * N
      const w = 30 + r() * 50
      const h = 20 + r() * 40
      ctx.fillStyle = r() > 0.5 ? 'rgba(30,32,38,0.35)' : 'rgba(140,140,150,0.18)'
      each9(x, y, 90, (X, Y) => ctx.fillRect(X, Y, w, h))
    }
    dots(ctx, r, 1600, ['#9a9ca5', '#5a5c64', '#7d7f88', '#b4b6bd'], 0.4, 1.1)
    // fissures
    ctx.strokeStyle = 'rgba(15,15,20,0.75)'
    ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      let x = r() * N
      let y = r() * N
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let k = 0; k < 14; k++) {
        x += (r() - 0.5) * 9
        y += (r() - 0.5) * 9
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    // taches d'huile
    for (let i = 0; i < 2; i++) {
      const x = r() * N
      const y = r() * N
      each9(x, y, 30, (X, Y) => {
        const g = ctx.createRadialGradient(X, Y, 1, X, Y, 22)
        g.addColorStop(0, 'rgba(10,10,15,0.35)')
        g.addColorStop(1, 'rgba(10,10,15,0)')
        ctx.fillStyle = g
        ctx.fillRect(X - 22, Y - 22, 44, 44)
      })
    }
  },
  paving: (ctx, r) => {
    // vrais pavés arrondis posés en rangs décalés
    ctx.fillStyle = '#5f574f'
    ctx.fillRect(0, 0, N, N)
    const rows = 8
    const cell = N / rows
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < rows; col++) {
        const off = row % 2 ? cell / 2 : 0
        const cx = col * cell + off + cell / 2 + (r() - 0.5) * 3
        const cy = row * cell + cell / 2 + (r() - 0.5) * 3
        const w = cell * (0.4 + r() * 0.06)
        const h = cell * (0.4 + r() * 0.06)
        const c = pick(r, ['#b9b0a5', '#a89f94', '#c9c0b4', '#9d9488', '#bdb2a2', '#b0a090'])
        each9(cx, cy, cell, (X, Y) => {
          const g = ctx.createLinearGradient(X - w, Y - h, X + w, Y + h)
          g.addColorStop(0, '#ffffff')
          g.addColorStop(0.25, c)
          g.addColorStop(1, '#6d655c')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.roundRect(X - w, Y - h, w * 2, h * 2, w * 0.45)
          ctx.fill()
        })
      }
    dots(ctx, r, 300, ['rgba(0,0,0,0.15)', 'rgba(255,255,255,0.15)'], 0.4, 0.9)
  },
  sand: (ctx, r) => {
    dots(ctx, r, 1700, ['#f8ebc3', '#c9ab70', '#e2c88e', '#b99a62'], 0.4, 0.9)
    pebbles(ctx, r, 9, ['#9a948c', '#b5afa6', '#d8d2c8'], 1.5, 3.2)
    // coquillages
    for (let i = 0; i < 5; i++) {
      const x = r() * N
      const y = r() * N
      const rot = r() * Math.PI * 2
      each9(x, y, 6, (X, Y) => {
        ctx.save()
        ctx.translate(X, Y)
        ctx.rotate(rot)
        ctx.fillStyle = pick(r, ['#fff4ea', '#ffd9cf', '#f7e6d2'])
        ctx.beginPath()
        ctx.moveTo(0, 2.5)
        ctx.arc(0, 0, 3.2, Math.PI * 1.1, Math.PI * 1.9)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(160,110,90,0.5)'
        ctx.lineWidth = 0.5
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath()
          ctx.moveTo(0, 2.5)
          ctx.lineTo(k * 2, -2.6)
          ctx.stroke()
        }
        ctx.restore()
      })
    }
  },
  planks: (ctx, r) => {
    const bh = N / 6
    // nœuds du bois
    for (let i = 0; i < 6; i++) {
      const x = r() * N
      const y = Math.floor(r() * 6) * bh + bh / 2
      each9(x, y, 10, (X, Y) => {
        ctx.strokeStyle = 'rgba(80,45,20,0.6)'
        ctx.lineWidth = 0.8
        for (let k = 1; k <= 3; k++) {
          ctx.beginPath()
          ctx.ellipse(X, Y, k * 2.2, k * 1.1, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
      })
    }
    // clous en bout de planche
    ctx.fillStyle = '#3b3530'
    for (let b = 0; b < 6; b++)
      for (const x of [b % 2 ? N * 0.25 : N * 0.75]) {
        for (const dy of [0.3, 0.7]) {
          ctx.beginPath()
          ctx.arc(x, b * bh + bh * dy, 1.3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
  },
  snow: (ctx, r) => {
    // congères : ombres bleutées très douces
    for (let i = 0; i < 7; i++) {
      const x = r() * N
      const y = r() * N
      const s = 25 + r() * 35
      each9(x, y, s, (X, Y) => {
        const g = ctx.createRadialGradient(X, Y, 1, X, Y, s)
        g.addColorStop(0, 'rgba(150,175,215,0.28)')
        g.addColorStop(1, 'rgba(150,175,215,0)')
        ctx.fillStyle = g
        ctx.fillRect(X - s, Y - s, s * 2, s * 2)
      })
    }
    dots(ctx, r, 160, ['#ffffff'], 0.4, 1)
  },
}

function painter(id: TexId): Paint {
  switch (id) {
    case 'meadow':
      return painter('grass')
    case 'soil': {
      const n = fbm(37)
      return {
        color: (x, y) => mix([108, 74, 44], [150, 104, 64], n(x, y)),
        height: (x, y) => n(x, y),
      }
    }
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

  // détails dessinés par-dessus ; le relief suit leur luminosité
  const deco = DECO[id]
  if (deco) {
    deco(cctx, rng(id.length * 7919 + id.charCodeAt(0) * 131))
    const d = cctx.getImageData(0, 0, N, N).data
    for (let k = 0; k < N * N; k++) {
      const lum = (d[k * 4] * 0.3 + d[k * 4 + 1] * 0.55 + d[k * 4 + 2] * 0.15) / 255
      heights[k] = heights[k] * 0.35 + lum * 0.65
    }
  }

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
