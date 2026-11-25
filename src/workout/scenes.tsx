import type { ReactNode } from 'react'
import { BAND, FLOORC, INK, SHIRT, SKIN, SKIN_DARK } from './palette'

const PROP_DARK = '#b07a4a'
const FLOOR = 142

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
  const natural = 14 + text.length * 5.7
  const w = Math.min(194, natural)
  const fs = natural > 194 ? (10.5 * 180) / (natural - 14) : 10.5
  return (
    <g>
      <rect x={100 - w / 2} y={152} width={w} height={18} rx={9} fill={INK} />
      <text x={100} y={164.5} textAnchor="middle" fontSize={fs} fontWeight={800} fill="#fff">
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

/** Flèche courbe (de a vers b, bombée vers c) avec pointe */
function CurvedArrow({ a, b, c, color = '#2f80ed' }: { a: Pt; b: Pt; c: Pt; color?: string }) {
  // tangente à l'arrivée = direction c -> b
  const ang = Math.atan2(b[1] - c[1], b[0] - c[0])
  const h1: Pt = [b[0] - 7 * Math.cos(ang - 0.5), b[1] - 7 * Math.sin(ang - 0.5)]
  const h2: Pt = [b[0] - 7 * Math.cos(ang + 0.5), b[1] - 7 * Math.sin(ang + 0.5)]
  return (
    <g stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`} />
      <path d={`M${h1[0]} ${h1[1]} L${b[0]} ${b[1]} L${h2[0]} ${h2[1]}`} />
    </g>
  )
}

/* ---------- Serviette essorée : vue de face, les poignets tournent en sens opposés ---------- */
function towelScene(t: number) {
  const period = 3000
  const reversed = t % (period * 2) >= period // change de sens à chaque cycle
  const s = pingPong(t, period, 0.15) // 0 -> 1 -> 0
  const dir = reversed ? -1 : 1
  const y = 74
  // vrille de la serviette
  const twist = s * 7 * dir
  const stripes = []
  for (let x = 62; x <= 138; x += 8) stripes.push(ln([x - twist, y - 8], [x + twist, y + 8], '#3d8fd1', 3))

  /** Poing vu de face : les doigts montent ou descendent selon la flexion du poignet */
  const fist = (cx: number, pitch: number) => {
    const fy = y - 6 * pitch
    return (
      <g>
        {/* avant-bras */}
        {ln([cx, y + 14], [cx + (cx < 100 ? -10 : 10), 150], SHIRT, 16)}
        {ln([cx, y + 8], [cx + (cx < 100 ? -3 : 3), y + 30], SKIN, 12)}
        <rect x={cx - 14} y={y - 16} width={28} height={32} rx={10} fill={SKIN} stroke={INK} strokeWidth={3} />
        {/* doigts repliés : ils remontent ou descendent quand le poignet tourne */}
        {[-8, -3, 2, 7].map((dx) => (
          <rect key={dx} x={cx + dx - 2.5} y={fy - 9} width={5} height={14} rx={2.5} fill={SKIN_DARK} stroke={INK} strokeWidth={1.5} />
        ))}
      </g>
    )
  }

  // flèches : vers le haut pour une main, vers le bas pour l'autre
  const up = (cx: number) => <CurvedArrow a={[cx + 14, y + 22]} b={[cx + 14, y - 26]} c={[cx + 30, y]} />
  const down = (cx: number) => <CurvedArrow a={[cx - 14, y - 26]} b={[cx - 14, y + 22]} c={[cx - 30, y]} />

  return (
    <g>
      <rect x={52} y={y - 10} width={96} height={20} rx={9} fill="#bfe3ff" stroke={INK} strokeWidth={2.5} />
      {stripes}
      {fist(46, s * dir)}
      {fist(154, -s * dir)}
      {dir > 0 ? down(46) : up(46)}
      {dir > 0 ? up(154) : down(154)}
      <Badge text={reversed ? 'Change de sens' : 'Essore : poignets en sens opposés'} />
    </g>
  )
}

/* ---------- Étirement des avant-bras : gros plan de la main seule ---------- */
const HELPER = '#f0bf92' // l'autre main, un ton plus foncé pour la distinguer
function forearmScene(t: number) {
  const period = 3200
  const fingersBack = t % (period * 2) < period // 1er temps : doigts vers l'arrière ; 2e : poignet vers le bas
  const s = pingPong(t, period, 0.22)
  const W: Pt = [86, 84] // poignet
  const a = (fingersBack ? -1 : 1) * 62 * s
  const rot = (p: Pt): Pt => {
    const r = rad(a)
    const dx = p[0] - W[0]
    const dy = p[1] - W[1]
    return [W[0] + dx * Math.cos(r) - dy * Math.sin(r), W[1] + dx * Math.sin(r) + dy * Math.cos(r)]
  }
  // l'autre main appuie du côté opposé au mouvement
  const helperY = fingersBack ? 98 : 58
  return (
    <g>
      {/* zone étirée sur l'avant-bras */}
      <rect x={18} y={fingersBack ? 92 : 66} width={66} height={10} rx={5} fill="#ff6b9a" opacity={0.15 + 0.55 * s} />
      {/* avant-bras, simple */}
      <rect x={14} y={72} width={76} height={24} rx={11} fill={SKIN} stroke={INK} strokeWidth={2.5} />
      <g transform={`rotate(${a} ${W[0]} ${W[1]})`}>
        {/* paume (côté paume plus clair, en bas) */}
        <rect x={W[0] - 4} y={71} width={36} height={26} rx={11} fill={SKIN} stroke={INK} strokeWidth={2.5} />
        <rect x={W[0] + 2} y={90} width={24} height={4} rx={2} fill="#ffeedd" />
        {/* doigts */}
        <rect x={W[0] + 28} y={74} width={36} height={20} rx={10} fill={SKIN} stroke={INK} strokeWidth={2.5} />
        {ln([W[0] + 40, 76], [W[0] + 40, 92], SKIN_DARK, 1.6)}
        {ln([W[0] + 51, 76], [W[0] + 51, 92], SKIN_DARK, 1.6)}
        {/* pouce */}
        <rect x={W[0] + 8} y={66} width={20} height={10} rx={5} fill={SKIN} stroke={INK} strokeWidth={2.2} />
        {/* l'autre main : paume posée sur les doigts */}
        <rect x={W[0] + 30} y={helperY - 7} width={34} height={14} rx={7} fill={HELPER} stroke={INK} strokeWidth={2.2} />
        {[W[0] + 41, W[0] + 52].map((x) => ln([x, helperY - 5], [x, helperY + 5], '#d9a272', 1.5))}
      </g>
      {s > 0.08 &&
        (fingersBack ? (
          <CurvedArrow a={rot([158, 106])} b={rot([160, 70])} c={rot([172, 90])} />
        ) : (
          <CurvedArrow a={rot([158, 62])} b={rot([160, 98])} c={rot([172, 78])} />
        ))}
      <Badge text={fingersBack ? 'Pousse les doigts vers l\'arrière' : 'Puis plie le poignet vers le bas'} />
    </g>
  )
}

/* ---------- Étirement des pectoraux : de profil, en 2 temps, + vignette de face ---------- */
function pecScene(t: number) {
  const s = pingPong(t, 4200, 0.25)
  const hx = lerp(94, 116, s) // la hanche avance d'un pas
  const neck: Pt = [hx + lerp(2, 9, s), 56]
  const head: Pt = [neck[0] + 4, neck[1] - 13]
  const hip: Pt = [hx, 96]
  const backFoot: Pt = [92, 140]
  const frontFoot: Pt = [lerp(98, 128, s), 140]
  const knee = (f: Pt): Pt => [(hip[0] + f[0]) / 2 + 3, (hip[1] + f[1]) / 2]
  // avant-bras collé contre le cadre : coude et main ne bougent pas
  const elbow: Pt = [84, 58]
  const hand: Pt = [84, 28]
  return (
    <g>
      {ln([0, FLOOR + 2], [200, FLOOR + 2], FLOORC, 4)}
      {/* cadre de porte vu de côté */}
      <rect x={72} y={14} width={10} height={FLOOR - 14} rx={2} fill={PROP_DARK} />
      <text x={77} y={10} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="#a58a6a">
        cadre
      </text>
      {/* jambe arrière, bras relâché (côté éloigné, en gris) */}
      <polyline points={`${hip[0]},${hip[1]} ${knee(backFoot)[0]},${knee(backFoot)[1]} ${backFoot[0]},${backFoot[1]}`} stroke="#8e95b5" strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {ln(neck, [neck[0] + 4, neck[1] + 36], '#8e95b5', 7)}
      {/* torse et zone étirée */}
      {ln(hip, neck, SHIRT, 13)}
      <ellipse cx={neck[0] + 6} cy={neck[1] + 12} rx={7} ry={11} fill="#ff6b9a" opacity={0.1 + 0.65 * s} />
      {/* jambe avant */}
      <polyline points={`${hip[0]},${hip[1]} ${knee(frontFoot)[0]},${knee(frontFoot)[1]} ${frontFoot[0]},${frontFoot[1]}`} stroke={INK} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* tête */}
      {ln(neck, head, SKIN, 6)}
      <circle cx={head[0]} cy={head[1]} r={9} fill={SKIN} stroke={INK} strokeWidth={3} />
      <circle cx={head[0] + 4.5} cy={head[1] - 1} r={1.8} fill={INK} />
      {/* bras contre le cadre : épaule -> coude -> main */}
      <polyline points={`${neck[0]},${neck[1]} ${elbow[0]},${elbow[1]} ${hand[0]},${hand[1]}`} stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={hand[0]} cy={hand[1]} r={4.5} fill={SKIN} stroke={INK} strokeWidth={2} />
      {s < 0.6 && <CurvedArrow a={[hx + 2, 128]} b={[hx + 30, 128]} c={[hx + 16, 120]} />}

      {/* vignette : la position des bras vue de face */}
      <g>
        <rect x={140} y={6} width={56} height={62} rx={8} fill="#fff" stroke={INK} strokeWidth={2} />
        <rect x={146} y={14} width={4} height={50} fill={PROP_DARK} />
        <rect x={186} y={14} width={4} height={50} fill={PROP_DARK} />
        <rect x={146} y={12} width={44} height={4} fill={PROP_DARK} />
        <polyline points="162,37 151,37 151,22" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="174,37 185,37 185,22" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x={161} y={35} width={14} height={16} rx={3} fill={SHIRT} />
        <circle cx={168} cy={29} r={5} fill={SKIN} stroke={INK} strokeWidth={1.5} />
        {ln([165, 51], [164, 62], INK, 3)}
        {ln([171, 51], [172, 62], INK, 3)}
        <text x={168} y={66} textAnchor="middle" fontSize={6.5} fontWeight={800} fill="#7a7d94">
          de face
        </text>
      </g>
      <Badge text={s < 0.5 ? '1. Avant-bras contre le cadre, coude à hauteur d\'épaule' : '2. Avance d\'un pas : la poitrine s\'étire'} />
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
  'poignet-flex': { period: 3000, render: towelScene, caption: 'Vu de face : serviette roulée tenue à deux mains devant toi' },
  'avant-bras': { period: 3200, render: forearmScene, caption: 'Gros plan de la main, bras tendu devant toi · l\'autre main (plus foncée) appuie · en rose : la zone étirée' },
  'pec-porte': { period: 4200, render: pecScene, caption: 'De profil (en haut à droite : la position vue de face) · en rose : la zone étirée' },
  'essuie-glace': { period: 4400, render: wiperScene, caption: 'Vu depuis les pieds : épaules et bras collés au sol' },
}
