/**
 * Petit moteur de bonhomme articulé (vue de profil par défaut).
 * Les angles sont en degrés, repère SVG : 0 = vers la droite, 90 = vers le bas, -90 = vers le haut.
 * Chaque membre est donné en angles ABSOLUS : [segment haut, segment bas].
 */

export type Pt = [number, number]

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
  /** Monte tout le corps sauf les mains (gainage des épaules suspendu) */
  shrug?: number
  dx?: number
  dy?: number
}

export type PropKind = 'bar' | 'board' | 'table-hands' | 'chair-hands' | 'chair-foot' | 'band' | 'band-hands' | 'wall-hand' | 'mat'

export type Joint = 'hip' | 'neck' | 'head' | 'elbow' | 'hand' | 'elbow2' | 'hand2' | 'knee' | 'foot' | 'knee2' | 'foot2'

export interface Anim {
  frames: Pose[]
  /** Personnage vu de face : tous les membres de la même couleur */
  front?: boolean
  /** 'floor' : posé au sol ; 'grip' : mains accrochées en haut (barre, poutre) */
  anchor?: 'floor' | 'grip'
  /** Articulation qui ne bouge pas entre les images clés */
  fix?: Joint
  props?: PropKind[]
  /** Durée d'une transition (ms) */
  dur?: number
  /** Pause sur chaque image clé (ms) */
  hold?: number
  /** Saut direct de la dernière image à la première (rotations complètes) */
  wrap?: boolean
  caption?: string
}

export const FLOOR_Y = 142
export const GRIP_Y = 12
export const HEAD_R = 9

const L = { torso: 40, neck: 13, upper: 22, fore: 20, thigh: 26, shin: 24 }

const dir = (a: number): Pt => {
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
  const elbow = add(neck, p.arm[0], L.upper)
  const hand = add(elbow, p.arm[1], L.fore)
  const elbow2 = add(neck, arm2[0], L.upper)
  const hand2 = add(elbow2, arm2[1], L.fore)
  const knee = add(hip, p.leg[0], L.thigh)
  const foot = add(knee, p.leg[1], L.shin)
  const knee2 = add(hip, leg2[0], L.thigh)
  const foot2 = add(knee2, leg2[1], L.shin)
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
    shrug: lerp(a.shrug ?? 0, b.shrug ?? 0, t),
    dx: lerp(a.dx ?? 0, b.dx ?? 0, t),
    dy: lerp(a.dy ?? 0, b.dy ?? 0, t),
  }
}

const translate = (j: Joints, dx: number, dy: number): Joints =>
  Object.fromEntries(Object.entries(j).map(([k, p]) => [k, [p[0] + dx, p[1] + dy]])) as Joints

/** Place la première image dans la scène (sol ou prise, centré) */
export function layoutFirst(anim: Anim): Joints {
  const j = solve(anim.frames[0])
  const pts = Object.values(j)
  const xs = pts.map((p) => p[0])
  const offX = 100 - (Math.min(...xs) + Math.max(...xs)) / 2
  let offY: number
  if (anim.anchor === 'grip') {
    offY = GRIP_Y - Math.min(j.hand[1], j.hand2[1])
  } else {
    const lowest = Math.max(...pts.map((p) => p[1]), j.head[1] + HEAD_R)
    offY = FLOOR_Y - lowest
  }
  return translate(j, offX, offY)
}

/** Position de la pose p, recalée sur l'articulation fixe de la première image */
export function place(anim: Anim, first: Joints, p: Pose): Joints {
  const fix: Joint = anim.fix ?? (anim.anchor === 'grip' ? 'hand' : 'foot')
  let j = solve(p)
  j = translate(j, first[fix][0] - j[fix][0] + (p.dx ?? 0), first[fix][1] - j[fix][1] + (p.dy ?? 0))
  if (p.shrug) {
    for (const k of Object.keys(j) as Joint[]) if (k !== 'hand' && k !== 'hand2') j[k] = [j[k][0], j[k][1] - p.shrug]
  }
  return j
}

/** Courbe du dos (chemin SVG) */
export function spinePath(j: Joints, spine: number) {
  const [hx, hy] = j.hip
  const [nx, ny] = j.neck
  const len = Math.hypot(nx - hx, ny - hy) || 1
  const ux = (nx - hx) / len
  const uy = (ny - hy) / len
  // perpendiculaire "au-dessus" du torse
  const cx = (hx + nx) / 2 + uy * spine
  const cy = (hy + ny) / 2 - ux * spine
  return `M${hx.toFixed(1)} ${hy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
