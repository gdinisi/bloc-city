import type { ReactNode } from 'react'
import { BAND, FLOORC, INK, SHIRT, SKIN, SKIN_DARK } from './palette'

/**
 * Scènes dessinées à la main pour les mouvements qu'un bonhomme de profil
 * montre mal (gros plans des mains, vues particulières).
 */
export interface Scene {
  /** Durée d'un cycle complet (ms) */
  period: number
  caption?: string
  render: (t: number) => ReactNode
}

type Pt = [number, number]
const rad = (a: number) => (a * Math.PI) / 180
const at = (p: Pt, a: number, len: number): Pt => [p[0] + Math.cos(rad(a)) * len, p[1] + Math.sin(rad(a)) * len]
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2

/** 0 -> 1 -> 0 sur une période, avec des pauses aux extrémités */
const pingPong = (t: number, period: number, pause = 0.18) => {
  const u = (t % period) / period
  const half = (u < 0.5 ? u : 1 - u) * 2 // 0..1..0
  return ease((half - pause) / (1 - 2 * pause))
}

const ln = (a: Pt, b: Pt, color: string, w: number) => (
  <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" />
)

function Badge({ text }: { text: string }) {
  const w = Math.min(194, 14 + text.length * 5.7)
  return (
    <g>
      <rect x={100 - w / 2} y={152} width={w} height={18} rx={9} fill={INK} />
      <text x={100} y={164.5} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#fff">
        {text}
      </text>
    </g>
  )
}

/* ---------- Extension des doigts : main de face, élastique autour des doigts ---------- */
function fingersScene(t: number) {
  const s = pingPong(t, 2400)
  const palm = { x: 78, y: 78, w: 44, h: 40 }
  const bases: Pt[] = [
    [84, 80],
    [95, 77],
    [106, 77],
    [117, 80],
  ]
  const closed = [-80, -86, -94, -100]
  const open = [-122, -102, -80, -58]
  const lens = [26, 30, 29, 23]
  const tips = bases.map((b, i) => at(b, lerp(closed[i], open[i], s), lens[i]))
  const thumbBase: Pt = [80, 104]
  const thumbTip = at(thumbBase, lerp(-70, -158, s), 24)
  const all = [...tips, thumbTip]
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2 + 2
  const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + 4
  const ry = (Math.max(...ys) - Math.min(...ys)) / 2 + 4
  return (
    <g>
      <rect x={86} y={112} width={28} height={40} fill={SKIN} stroke={INK} strokeWidth={3} />
      {bases.map((b, i) => ln(b, tips[i], INK, 11))}
      {bases.map((b, i) => ln(b, tips[i], SKIN, 6))}
      {ln(thumbBase, thumbTip, INK, 12)}
      {ln(thumbBase, thumbTip, SKIN, 7)}
      <rect x={palm.x} y={palm.y} width={palm.w} height={palm.h} rx={12} fill={SKIN} stroke={INK} strokeWidth={3} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={Math.min(ry, 22)} fill="none" stroke={BAND} strokeWidth={4} />
      <Badge text={s > 0.5 ? 'Ouvre grand' : 'Referme lentement'} />
    </g>
  )
}

/* ---------- Serviette essorée : deux poings qui tournent en sens opposés ---------- */
function towelScene(t: number) {
  const period = 3200
  const phase = (t % (period * 2)) < period ? 1 : -1 // change de sens à chaque cycle
  const s = pingPong(t, period) * phase
  const y = 72
  const stripes = []
  for (let x = 58; x <= 142; x += 9) {
    const off = s * 7
    stripes.push(ln([x + off - 5, y - 9], [x - off + 5, y + 9], '#4aa3df', 3))
  }
  const fist = (x: number, rot: number) => (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <rect x={x - 13} y={y - 15} width={26} height={30} rx={10} fill={SKIN} stroke={INK} strokeWidth={3} />
      {ln([x - 7, y - 15], [x - 7, y - 6], INK, 2)}
      {ln([x, y - 15], [x, y - 6], INK, 2)}
      {ln([x + 7, y - 15], [x + 7, y - 6], INK, 2)}
    </g>
  )
  const arrow = (x: number, up: boolean) => {
    const y0 = up ? 42 : 34
    const y1 = up ? 34 : 42
    return (
      <g stroke={INK} strokeWidth={2.5} fill="none" strokeLinecap="round">
        <path d={`M${x - 10} ${y0} Q${x} ${y1 - 8} ${x + 10} ${y0}`} />
        <path d={`M${x + 10} ${y0} l-6 -1 M${x + 10} ${y0} l-1 -6`} />
      </g>
    )
  }
  return (
    <g>
      <rect x={50} y={y - 10} width={100} height={20} rx={6} fill="#bfe3ff" stroke={INK} strokeWidth={2.5} />
      {stripes}
      <rect x={42} y={y + 12} width={18} height={60} fill={SHIRT} />
      <rect x={140} y={y + 12} width={18} height={60} fill={SHIRT} />
      {fist(52, s * 35)}
      {fist(148, -s * 35)}
      {arrow(52, phase > 0)}
      {arrow(148, phase < 0)}
      <Badge text={phase > 0 ? 'Essore fort' : 'Change de sens'} />
    </g>
  )
}

/* ---------- Étirement avant-bras : bras tendu, l'autre main tire les doigts ---------- */
function forearmScene(t: number) {
  const period = 3600
  const palmUp = t % (period * 2) < period
  const s = pingPong(t, period, 0.25)
  const wrist: Pt = [112, 70]
  const angle = lerp(0, 62, s) // la main se plie vers le bas
  const knuckles = at(wrist, angle, 22)
  const tip = at(knuckles, angle + 8 * s, 18)
  const pull = at(tip, angle + 90, 4)
  return (
    <g>
      {/* bras tendu, épaule à gauche */}
      <path d="M8 62 L112 64 L112 78 L8 80 Z" fill={SHIRT} />
      <rect x={60} y={63} width={54} height={15} rx={7} fill={SKIN} stroke={INK} strokeWidth={2.5} />
      {/* main */}
      <g>
        {ln(wrist, knuckles, INK, 17)}
        {ln(wrist, knuckles, SKIN, 12)}
        {ln(knuckles, tip, INK, 13)}
        {ln(knuckles, tip, SKIN, 8)}
        {palmUp ? ln(at(wrist, angle - 90, 4), at(knuckles, angle - 90, 4), SKIN_DARK, 2) : ln(at(wrist, angle + 90, 4), at(knuckles, angle + 90, 4), SKIN_DARK, 2)}
      </g>
      {/* l'autre main qui tire */}
      <g>
        {ln([170, 150], [pull[0] + 10, pull[1] + 12], SHIRT, 14)}
        <circle cx={pull[0] + 4} cy={pull[1] + 4} r={9} fill={SKIN} stroke={INK} strokeWidth={2.5} />
      </g>
      <Badge text={palmUp ? 'Paume vers le haut : tire les doigts' : 'Paume vers le bas : tire le dos de la main'} />
    </g>
  )
}

/* ---------- Essuie-glaces : vu depuis les pieds, épaules au sol ---------- */
function wiperScene(t: number) {
  const period = 4400
  const u = (t % period) / period
  // centre -> gauche -> centre -> droite -> centre
  const swing = Math.sin(u * Math.PI * 2)
  const angle = -90 + swing * 55
  const floorY = 128
  const hip: Pt = [100, 118]
  const legL = at([96, 118], angle, 58)
  const legR = at([104, 118], angle, 58)
  return (
    <g>
      {ln([10, floorY + 6], [190, floorY + 6], FLOORC, 4)}
      <rect x={26} y={floorY - 2} width={148} height={6} rx={3} fill="#7fd1a8" />
      {/* bras en croix collés au sol */}
      {ln([42, floorY - 6], [158, floorY - 6], INK, 7)}
      {/* tête au loin (côté sol) */}
      <circle cx={100} cy={floorY - 16} r={9} fill={SKIN} stroke={INK} strokeWidth={3} />
      {/* torse raccourci */}
      <rect x={86} y={floorY - 16} width={28} height={14} rx={5} fill={SHIRT} />
      {/* jambes jointes */}
      {ln([96, hip[1]], legL, INK, 8)}
      {ln([104, hip[1]], legR, INK, 8)}
      <circle cx={(legL[0] + legR[0]) / 2} cy={(legL[1] + legR[1]) / 2} r={6} fill={INK} />
      <Badge text={Math.abs(swing) < 0.2 ? 'Jambes à la verticale' : swing < 0 ? 'Descends à gauche' : 'Descends à droite'} />
    </g>
  )
}

export const SCENES: Record<string, Scene> = {
  'ext-doigts': { period: 2400, render: fingersScene, caption: 'Gros plan : élastique autour du bout des doigts' },
  'poignet-flex': { period: 3200, render: towelScene, caption: 'Serviette roulée tenue à deux mains, bras devant toi' },
  'avant-bras': { period: 3600, render: forearmScene, caption: 'Bras tendu devant toi' },
  'essuie-glace': { period: 4400, render: wiperScene, caption: 'Vu depuis les pieds : épaules et bras collés au sol' },
}
