import type { ReactNode } from 'react'
import { BAND, FLOORC, INK, SHIRT, SKIN, SKIN_DARK } from './palette'

const PROP_DARK = '#b07a4a'

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

/* ---------- Étirement des avant-bras : bras tendu devant, l'autre main tire la main vers soi ---------- */
function forearmScene(t: number) {
  const period = 3600
  const palmUp = t % (period * 2) < period
  const s = pingPong(t, period, 0.22)
  const wrist: Pt = [128, 62]
  const a = lerp(0, 72, s) // la main se plie vers le bas
  const knuckles = at(wrist, a, 20)
  const tip = at(knuckles, a + 6 * s, 18)
  const grip = at(knuckles, a + 3 * s, 10) // l'autre main tient les doigts
  const side = palmUp ? -90 : 90 // côté de la paume (dessus si paume vers le haut)
  return (
    <g>
      {/* le corps, à gauche */}
      <circle cx={18} cy={30} r={14} fill={SKIN} stroke={INK} strokeWidth={3} />
      <circle cx={24} cy={28} r={1.8} fill={INK} />
      <rect x={-6} y={46} width={40} height={110} rx={14} fill={SHIRT} />
      {/* bras tendu devant (manche puis avant-bras) */}
      {ln([24, 60], [78, 62], SHIRT, 16)}
      {ln([76, 62], wrist, INK, 15)}
      {ln([76, 62], wrist, SKIN, 10)}
      {/* main qui se plie */}
      {ln(wrist, knuckles, INK, 17)}
      {ln(wrist, knuckles, SKIN, 12)}
      {ln(knuckles, tip, INK, 12)}
      {ln(knuckles, tip, SKIN, 7)}
      {/* face de la paume, plus claire */}
      {ln(at(wrist, a + side, 4), at(knuckles, a + side, 4), '#ffe9d6', 3)}
      {/* l'autre main : vient du corps et tire les doigts vers soi */}
      {ln([34, 120], [grip[0] - 8, grip[1] + 16], SHIRT, 15)}
      {ln([grip[0] - 18, grip[1] + 26], [grip[0] - 4, grip[1] + 8], SKIN, 10)}
      <g transform={`rotate(${a} ${grip[0]} ${grip[1]})`}>
        <rect x={grip[0] - 7} y={grip[1] - 11} width={14} height={22} rx={6} fill={SKIN} stroke={INK} strokeWidth={2.5} />
      </g>
      {s > 0.05 && <CurvedArrow a={at(wrist, a - 4, 46)} b={at(wrist, a + 26, 44)} c={at(wrist, a + 11, 52)} />}
      <Badge text={palmUp ? 'Paume vers le haut : tire les doigts vers toi' : 'Paume vers le bas : tire le dos de la main'} />
    </g>
  )
}

/* ---------- Étirement des pectoraux : vu de dessus, dans l'encadrement d'une porte ---------- */
function pecScene(t: number) {
  const s = pingPong(t, 3600, 0.25)
  const wallY = 52
  const by = lerp(62, 92, s) // la personne avance d'un pas
  const shL: Pt = [82, by]
  const shR: Pt = [118, by]
  const contact: Pt = [66, wallY + 4] // avant-bras posé contre le montant gauche
  return (
    <g>
      {/* murs et encadrement */}
      <rect x={4} y={wallY - 12} width={62} height={12} fill="#e3c9a8" stroke={PROP_DARK} strokeWidth={2.5} />
      <rect x={134} y={wallY - 12} width={62} height={12} fill="#e3c9a8" stroke={PROP_DARK} strokeWidth={2.5} />
      <rect x={60} y={wallY - 14} width={8} height={18} rx={2} fill={PROP_DARK} />
      <rect x={132} y={wallY - 14} width={8} height={18} rx={2} fill={PROP_DARK} />
      <text x={100} y={wallY - 2} textAnchor="middle" fontSize={9} fontWeight={800} fill="#a58a6a">
        PORTE
      </text>
      {/* bras gauche : de l'épaule jusqu'au montant */}
      {ln(shL, contact, INK, 8)}
      <circle cx={contact[0]} cy={contact[1]} r={5} fill={SKIN} stroke={INK} strokeWidth={2} />
      {/* bras droit relâché */}
      {ln(shR, [126, by + 14], INK, 8)}
      {/* épaules et tête, vues de dessus (le visage regarde vers le bas de l'image) */}
      <rect x={78} y={by - 8} width={44} height={16} rx={8} fill={SHIRT} />
      <circle cx={100} cy={by + 2} r={9} fill={SKIN} stroke={INK} strokeWidth={3} />
      <circle cx={100} cy={by + 9} r={1.8} fill={INK} />
      {/* pas en avant */}
      <CurvedArrow a={[150, 70]} b={[150, 112]} c={[156, 91]} />
      <Badge text={s < 0.5 ? 'Avant-bras contre le montant, coude à hauteur d\'épaule' : 'Avance d\'un pas : la poitrine s\'étire'} />
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
  'avant-bras': { period: 3600, render: forearmScene, caption: 'Vu de côté : bras tendu devant toi, l\'autre main tire' },
  'pec-porte': { period: 3600, render: pecScene, caption: 'Vu de dessus, dans l\'encadrement d\'une porte' },
  'essuie-glace': { period: 4400, render: wiperScene, caption: 'Vu depuis les pieds : épaules et bras collés au sol' },
}
