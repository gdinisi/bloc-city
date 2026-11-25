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

/* ---------- Étirement des avant-bras : gros plan, la main se plie et l'autre main la ramène vers soi ---------- */
function forearmScene(t: number) {
  const period = 3600
  const palmUp = t % (period * 2) < period
  const s = pingPong(t, period, 0.22)
  const wrist: Pt = [118, 70]
  const a = lerp(0, 68, s) // la main se plie vers le bas
  // points de la main (repère non tourné), puis rotation autour du poignet
  const rot = (p: Pt): Pt => {
    const r = rad(a)
    const dx = p[0] - wrist[0]
    const dy = p[1] - wrist[1]
    return [wrist[0] + dx * Math.cos(r) - dy * Math.sin(r), wrist[1] + dx * Math.sin(r) + dy * Math.cos(r)]
  }
  const gripC = rot([160, 70]) // l'autre main tient le milieu des doigts
  const nailSide = palmUp ? 9 : -9 // l'ongle est du côté opposé à la paume
  return (
    <g>
      <rect x={0} y={0} width={200} height={150} fill="#fff4e4" />
      <g transform="translate(-14 10) scale(1.12)">
      {/* zone étirée : le dessus de l'avant-bras s'illumine */}
      <ellipse cx={86} cy={58} rx={34} ry={6} fill="#ff6b9a" opacity={0.15 + 0.45 * s} />
      {/* manche */}
      <rect x={-10} y={52} width={66} height={36} rx={14} fill={SHIRT} />
      <rect x={46} y={52} width={12} height={36} rx={5} fill="#e8772f" />
      {/* avant-bras, légèrement effilé vers le poignet */}
      <path d={`M54 58 L${wrist[0]} 61 L${wrist[0]} 79 L54 84 Z`} fill={SKIN} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {/* main qui se plie au poignet */}
      <g transform={`rotate(${a} ${wrist[0]} ${wrist[1]})`}>
        {/* paume */}
        <rect x={wrist[0] - 4} y={59} width={30} height={22} rx={9} fill={SKIN} stroke={INK} strokeWidth={2.5} />
        {/* pouce, côté paume */}
        <rect x={wrist[0] + 6} y={palmUp ? 52 : 76} width={18} height={9} rx={4.5} fill={SKIN} stroke={INK} strokeWidth={2.2} />
        {/* doigts */}
        <rect x={wrist[0] + 22} y={61} width={30} height={18} rx={8} fill={SKIN} stroke={INK} strokeWidth={2.5} />
        {[0, 1].map((i) => ln([wrist[0] + 30 + i * 9, 63], [wrist[0] + 30 + i * 9, 77], SKIN_DARK, 1.5))}
        {/* ongle */}
        <rect x={wrist[0] + 43} y={70 + nailSide / 1.6 - 3} width={7} height={6} rx={2.5} fill="#fff1e6" stroke={SKIN_DARK} strokeWidth={1.2} />
        {/* face de la paume, plus claire */}
        <rect x={wrist[0]} y={palmUp ? 61 : 74} width={22} height={5} rx={2.5} fill="#ffe9d6" />
      </g>
      {/* l'autre main : vient d'en bas (du corps), enveloppe les doigts et tire vers soi */}
      <path d={`M${gripC[0] - 40} 140 Q${gripC[0] - 34} ${gripC[1] + 40} ${gripC[0] - 6} ${gripC[1] + 12}`} stroke={SHIRT} strokeWidth={17} fill="none" strokeLinecap="round" />
      <path d={`M${gripC[0] - 24} ${gripC[1] + 34} Q${gripC[0] - 14} ${gripC[1] + 22} ${gripC[0] - 4} ${gripC[1] + 10}`} stroke={SKIN} strokeWidth={12} fill="none" strokeLinecap="round" />
      <g transform={`rotate(${a} ${gripC[0]} ${gripC[1]})`}>
        <rect x={gripC[0] - 9} y={gripC[1] - 13} width={18} height={26} rx={8} fill={SKIN} stroke={INK} strokeWidth={2.5} />
        {[-6, -1, 4].map((dy) => ln([gripC[0] + 2, gripC[1] + dy], [gripC[0] + 8, gripC[1] + dy], SKIN_DARK, 1.5))}
      </g>
      {s > 0.08 && <CurvedArrow a={rot([176, 50])} b={rot([170, 96])} c={rot([190, 74])} />}
      </g>
      <Badge text={palmUp ? 'Paume vers le haut : ramène les doigts vers toi' : 'Paume vers le bas : ramène le dos de la main'} />
    </g>
  )
}

/* ---------- Étirement des pectoraux : vue de face, dans l'encadrement d'une porte ---------- */
function pecScene(t: number) {
  const s = pingPong(t, 3800, 0.25)
  const k = lerp(1, 1.16, s) // en avançant, la personne se rapproche (elle paraît plus grande)
  const sc = (p: Pt): Pt => [100 + (p[0] - 100) * k, FLOOR + (p[1] - FLOOR) * k]
  const shoulderY = 66
  const shL = sc([84, shoulderY])
  const shR = sc([116, shoulderY])
  // coudes et avant-bras restent collés aux montants de la porte
  const elL: Pt = [58, shoulderY]
  const elR: Pt = [142, shoulderY]
  const hdL: Pt = [58, shoulderY - 30]
  const hdR: Pt = [142, shoulderY - 30]
  return (
    <g>
      {/* mur et ouverture de la porte */}
      <rect x={0} y={0} width={200} height={FLOOR} fill="#f3e7d3" />
      <rect x={54} y={14} width={92} height={FLOOR - 14} fill="#d9c7ab" />
      <rect x={46} y={8} width={108} height={8} rx={2} fill={PROP_DARK} />
      <rect x={46} y={8} width={8} height={FLOOR - 8} rx={2} fill={PROP_DARK} />
      <rect x={146} y={8} width={8} height={FLOOR - 8} rx={2} fill={PROP_DARK} />
      {ln([0, FLOOR + 2], [200, FLOOR + 2], FLOORC, 4)}
      {/* corps (mis à l'échelle autour des pieds) */}
      <g transform={`translate(100 ${FLOOR}) scale(${k}) translate(-100 ${-FLOOR})`}>
        {ln([94, 104], [92, FLOOR - 2], INK, 8)}
        {ln([106, 104], [108, FLOOR - 2], INK, 8)}
        <path d={`M84 ${shoulderY} L116 ${shoulderY} L110 106 L90 106 Z`} fill={SHIRT} stroke={SHIRT} strokeWidth={6} strokeLinejoin="round" />
        {/* zone étirée : la poitrine */}
        <ellipse cx={100} cy={76} rx={13} ry={6} fill="#ff6b9a" opacity={0.1 + 0.55 * s} />
        {ln([100, shoulderY], [100, 56], SKIN, 6)}
        <circle cx={100} cy={48} r={10} fill={SKIN} stroke={INK} strokeWidth={3} />
        <circle cx={96.5} cy={48} r={1.6} fill={INK} />
        <circle cx={103.5} cy={48} r={1.6} fill={INK} />
      </g>
      {/* bras en W : épaule -> coude contre le montant -> main en haut */}
      {[
        [shL, elL, hdL],
        [shR, elR, hdR],
      ].map(([sh, el, hd], i) => (
        <g key={i}>
          <polyline
            points={`${sh[0]},${sh[1]} ${el[0]},${el[1]} ${hd[0]},${hd[1]}`}
            stroke={INK}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx={hd[0]} cy={hd[1]} r={4.5} fill={SKIN} stroke={INK} strokeWidth={2} />
        </g>
      ))}
      <Badge text={s < 0.5 ? 'Avant-bras contre le cadre, coudes à hauteur d\'épaules' : 'Avance d\'un pas : la poitrine s\'étire'} />
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
  'avant-bras': { period: 3600, render: forearmScene, caption: 'Gros plan, vu de côté : bras tendu devant toi · en rose : la zone étirée' },
  'pec-porte': { period: 3800, render: pecScene, caption: 'Vu de face, dans l\'encadrement d\'une porte · en rose : la zone étirée' },
  'essuie-glace': { period: 4400, render: wiperScene, caption: 'Vu depuis les pieds : épaules et bras collés au sol' },
}
