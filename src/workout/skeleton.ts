/**
 * Petit moteur de bonhomme articulé (vue de profil par défaut).
 * Les angles sont en degrés, repère SVG : 0 = vers la droite, 90 = vers le bas, -90 = vers le haut.
 * Chaque membre est donné en angles ABSOLUS : [segment haut, segment bas].
 */

export type Pt = [number, number]

export type Joint = 'hip' | 'neck' | 'head' | 'elbow' | 'hand' | 'elbow2' | 'hand2' | 'knee' | 'foot' | 'knee2' | 'foot2'

export interface Pose {
  /** Direction hanche -> épaules */
  torso: number
  /** Direction épaules -> tête (par défaut = torso) */
  head?: number
  /** Courbure du dos (px), positif = bombé vers le "haut" du torse */
  spine?: number
  arm: [number, number]
  arm2?: [number, number]
  leg: [number, number]
  leg2?: [number, number]
  /** Longueur apparente des bras (1 = normal, < 1 = bras pointé vers nous) */
  armK?: number
  arm2K?: number
  /** Longueur apparente des avant-bras (pointés vers nous) */
  foreK?: number
  /** Longueur apparente des tibias (genoux pliés vus de face) */
  shinK?: number
  /** Durée de la transition qui part de cette image (ms) */
  dur?: number
  /** Monte tout le corps sauf les mains (gainage des épaules suspendu) */
  shrug?: number
  dx?: number
  dy?: number
  /** Articulation qui reste à la même place que sur la 1re image (remplace anim.fix pour cette image) */
  pin?: Joint
  /** Texte affiché dans le badge pendant cette image */
  label?: string
  /** Pause sur cette image (ms) */
  hold?: number
}

export type PropKind =
  | 'bar'
  | 'board'
  | 'board-edge'
  | 'board-jug'
  | 'table-hands'
  | 'chair-hands'
  | 'chair-foot'
  | 'band'
  | 'band-hands'
  | 'door-hand'
  | 'mat'

export interface Anim {
  frames: Pose[]
  /** Personnage vu de face : épaules et hanches écartées */
  front?: boolean
  /** Vu de dessus (allongé) : pas de sol, un tapis derrière le corps */
  top?: boolean
  /** 'floor' : posé au sol ; 'grip' : mains accrochées en haut ; 'center' : centré (vue de dessus) */
  anchor?: 'floor' | 'grip' | 'center'
  /** Articulation qui ne bouge pas entre les images clés */
  fix?: Joint
  props?: PropKind[]
  /** Durée d'une transition (ms) */
  dur?: number
  /** Pause par défaut sur chaque image clé (ms) */
  hold?: number
  /** Saut direct de la dernière image à la première (rotations complètes) */
  wrap?: boolean
  caption?: string
}

export const FLOOR_Y = 142
export const GRIP_Y = 12
export const HEAD_R = 9

const L = { torso: 40, neck: 13, upper: 22, fore: 20, thigh: 26, shin: 24 }

export const dir = (a: number): Pt => {
  const r = (a * Math.PI) / 180
  return [Math.cos(r), Math.sin(r)]
}
const add = (p: Pt, a: number, len: number): Pt => {
  const d = dir(a)
  return [p[0] + d[0] * len, p[1] + d[1] * len]
}

export type Joints = Record<Joint, Pt>

/** Cinématique directe, hanche à l'origine */
export function solve(p: Pose): Joints {
  const hip: Pt = [0, 0]
  const neck = add(hip, p.torso, L.torso)
  const head = add(neck, p.head ?? p.torso, L.neck)
  const arm2 = p.arm2 ?? p.arm
  const leg2 = p.leg2 ?? p.leg
  const k1 = p.armK ?? 1
  const k2 = p.arm2K ?? k1
  const fk = p.foreK ?? 1
  const sk = p.shinK ?? 1
  const elbow = add(neck, p.arm[0], L.upper * k1)
  const hand = add(elbow, p.arm[1], L.fore * k1 * fk)
  const elbow2 = add(neck, arm2[0], L.upper * k2)
  const hand2 = add(elbow2, arm2[1], L.fore * k2 * fk)
  const knee = add(hip, p.leg[0], L.thigh)
  const foot = add(knee, p.leg[1], L.shin * sk)
  const knee2 = add(hip, leg2[0], L.thigh)
  const foot2 = add(knee2, leg2[1], L.shin * sk)
  return { hip, neck, head, elbow, hand, elbow2, hand2, knee, foot, knee2, foot2 }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp2 = (a: [number, number], b: [number, number], t: number): [number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]

export function mix(a: Pose, b: Pose, t: number): Pose {
  return {
    torso: lerp(a.torso, b.torso, t),
    head: lerp(a.head ?? a.torso, b.head ?? b.torso, t),
    spine: lerp(a.spine ?? 0, b.spine ?? 0, t),
    arm: lerp2(a.arm, b.arm, t),
    arm2: lerp2(a.arm2 ?? a.arm, b.arm2 ?? b.arm, t),
    leg: lerp2(a.leg, b.leg, t),
    leg2: lerp2(a.leg2 ?? a.leg, b.leg2 ?? b.leg, t),
    armK: lerp(a.armK ?? 1, b.armK ?? 1, t),
    arm2K: lerp(a.arm2K ?? a.armK ?? 1, b.arm2K ?? b.armK ?? 1, t),
    foreK: lerp(a.foreK ?? 1, b.foreK ?? 1, t),
    shinK: lerp(a.shinK ?? 1, b.shinK ?? 1, t),
    shrug: lerp(a.shrug ?? 0, b.shrug ?? 0, t),
    dx: lerp(a.dx ?? 0, b.dx ?? 0, t),
    dy: lerp(a.dy ?? 0, b.dy ?? 0, t),
  }
}

const translate = (j: Joints, dx: number, dy: number): Joints =>
  Object.fromEntries(Object.entries(j).map(([k, p]) => [k, [p[0] + dx, p[1] + dy]])) as Joints

/** Place la première image dans la scène (sol, prise ou centre), centrée horizontalement */
export function layoutFirst(anim: Anim): Joints {
  const j = solve(anim.frames[0])
  const pts = Object.values(j)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const offX = 100 - (Math.min(...xs) + Math.max(...xs)) / 2
  let offY: number
  if (anim.anchor === 'grip') {
    offY = GRIP_Y - Math.min(j.hand[1], j.hand2[1])
  } else if (anim.anchor === 'center') {
    offY = 75 - (Math.min(...ys, j.head[1] - HEAD_R) + Math.max(...ys)) / 2
  } else {
    const lowest = Math.max(...ys, j.head[1] + HEAD_R)
    offY = FLOOR_Y - lowest
  }
  return translate(j, offX, offY)
}

const defaultFix = (anim: Anim): Joint => anim.fix ?? (anim.anchor === 'grip' ? 'hand' : anim.anchor === 'center' ? 'hip' : 'foot')

/**
 * Position de la pose mélangée entre les images a et b (poids k), recalée sur
 * l'articulation fixe de chacune (le recalage est lui aussi interpolé).
 */
export function place(anim: Anim, first: Joints, p: Pose, a: Pose, b: Pose, k: number): Joints {
  const j = solve(p)
  const pa = a.pin ?? defaultFix(anim)
  const pb = b.pin ?? defaultFix(anim)
  const tax = first[pa][0] - j[pa][0]
  const tay = first[pa][1] - j[pa][1]
  const tbx = first[pb][0] - j[pb][0]
  const tby = first[pb][1] - j[pb][1]
  let out = translate(j, lerp(tax, tbx, k) + (p.dx ?? 0), lerp(tay, tby, k) + (p.dy ?? 0))
  if (p.shrug) {
    out = { ...out }
    for (const key of Object.keys(out) as Joint[]) if (key !== 'hand' && key !== 'hand2') out[key] = [out[key][0], out[key][1] - p.shrug]
  }
  return out
}

/** Courbe du dos (chemin SVG) */
export function spinePath(from: Pt, to: Pt, spine: number) {
  const [hx, hy] = from
  const [nx, ny] = to
  const len = Math.hypot(nx - hx, ny - hy) || 1
  const ux = (nx - hx) / len
  const uy = (ny - hy) / len
  const cx = (hx + nx) / 2 + uy * spine
  const cy = (hy + ny) / 2 - ux * spine
  return `M${hx.toFixed(1)} ${hy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Pose interpolée à l'instant t (ms), avec les images encadrantes */
export function timeline(anim: Anim, t: number) {
  const n = anim.frames.length
  const f = anim.frames
  if (n === 1) return { pose: f[0], a: f[0], b: f[0], k: 0, label: f[0].label }
  const durOf = (i: number) => f[i].dur ?? anim.dur ?? 1100
  const segs = anim.wrap ? n - 1 : n
  const lens = Array.from({ length: segs }, (_, i) => (f[i].hold ?? anim.hold ?? 350) + durOf(i))
  const total = lens.reduce((s, x) => s + x, 0)
  let local = ((t % total) + total) % total
  let i = 0
  while (i < segs - 1 && local >= lens[i]) {
    local -= lens[i]
    i++
  }
  const hold = f[i].hold ?? anim.hold ?? 350
  const k = local < hold ? 0 : easeInOut(Math.min(1, (local - hold) / durOf(i)))
  const a = f[i]
  const b = f[(i + 1) % n]
  return { pose: mix(a, b, k), a, b, k, label: k < 0.5 ? a.label : b.label }
}
