import type { ReactNode } from 'react'
import type { Building } from './buildings'

/*
 * Rendu isométrique (losanges 2:1). Chaque bâtiment est dessiné autour de son
 * point au sol (0, 0) = centre de la case. Les faces gauche / droite / dessus
 * sont ombrées pour donner le volume.
 */

export const TW = 40 // largeur d'une case
export const TH = 20 // hauteur d'une case
const HW = 17 // demi-largeur de l'emprise d'un bâtiment
const HH = 8.5
const INK = '#2b2d42'

type P = [number, number]
const pts = (p: P[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

/** Éclaircit (k > 0) ou assombrit (k < 0) une couleur hexadécimale */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))
  const r = ch((n >> 16) & 255)
  const g = ch((n >> 8) & 255)
  const b = ch(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

const Poly = ({ p, fill, stroke = INK, sw = 1.4 }: { p: P[]; fill: string; stroke?: string; sw?: number }) => (
  <polygon points={pts(p)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
)

/** Pavé isométrique : emprise (hw, hh), hauteur h, posé à l'altitude y0 */
function Box({ hw = HW, hh = HH, h, color, y0 = 0, top = true }: { hw?: number; hh?: number; h: number; color: string; y0?: number; top?: boolean }) {
  const b = -y0
  return (
    <g>
      <Poly p={[[-hw, b], [0, b + hh], [0, b + hh - h], [-hw, b - h]]} fill={shade(color, -0.18)} />
      <Poly p={[[0, b + hh], [hw, b], [hw, b - h], [0, b + hh - h]]} fill={color} />
      {top && <Poly p={[[-hw, b - h], [0, b + hh - h], [hw, b - h], [0, b - hh - h]]} fill={shade(color, 0.25)} />}
    </g>
  )
}

/** Fenêtres sur les deux faces visibles */
function Windows({ h, floors = 1, y0 = 0, color = '#dff3ff', hw = HW, hh = HH }: { h: number; floors?: number; y0?: number; color?: string; hw?: number; hh?: number }) {
  const out: ReactNode[] = []
  const fh = h / floors
  for (let f = 0; f < floors; f++) {
    const v1 = y0 + f * fh + fh * 0.3
    const v2 = y0 + f * fh + fh * 0.75
    for (const [u1, u2] of [
      [0.2, 0.42],
      [0.58, 0.8],
    ]) {
      // face droite : de (0, hh) à (hw, 0)
      const R = (u: number, v: number): P => [u * hw, hh - u * hh - v]
      // face gauche : de (-hw, 0) à (0, hh)
      const Lf = (u: number, v: number): P => [-hw + u * hw, u * hh - v]
      out.push(<Poly key={`r${f}${u1}`} p={[R(u1, v1), R(u2, v1), R(u2, v2), R(u1, v2)]} fill={color} sw={1} />)
      out.push(<Poly key={`l${f}${u1}`} p={[Lf(u1, v1), Lf(u2, v1), Lf(u2, v2), Lf(u1, v2)]} fill={shade(color, -0.15)} sw={1} />)
    }
  }
  return <g>{out}</g>
}

function PyramidRoof({ h, r, color, hw = HW + 2, hh = HH + 1 }: { h: number; r: number; color: string; hw?: number; hh?: number }) {
  const apex: P = [0, -h - r]
  return (
    <g>
      <Poly p={[[-hw, -h], [0, hh - h], apex]} fill={shade(color, -0.15)} />
      <Poly p={[[0, hh - h], [hw, -h], apex]} fill={color} />
    </g>
  )
}

function Door({ color = '#6b3d1f' }: { color?: string }) {
  // porte sur la face droite
  const R = (u: number, v: number): P => [u * HW, HH - u * HH - v]
  return <Poly p={[R(0.42, 0), R(0.6, 0), R(0.6, 9), R(0.42, 9)]} fill={color} sw={1} />
}

/** Prises d'escalade colorées sur une face */
function Holds({ seed, n, area }: { seed: number; n: number; area: (u: number, v: number) => P }) {
  const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff70a6']
  let s = seed
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = area(0.12 + rnd() * 0.76, 0.1 + rnd() * 0.85)
        return <circle key={i} cx={x} cy={y} r={1.7 + rnd()} fill={colors[i % colors.length]} stroke={INK} strokeWidth={0.6} />
      })}
    </g>
  )
}

function Shadow() {
  return <ellipse cx={0} cy={2} rx={HW} ry={HH * 0.9} fill="#000" opacity={0.12} />
}

/** Dessine un bâtiment ; `flip` = tourné (miroir horizontal) */
export function BuildingSprite({ b, flip = false }: { b: Building; flip?: boolean }) {
  return <g transform={flip ? 'scale(-1 1)' : undefined}>{draw(b)}</g>
}

function draw(b: Building): ReactNode {
  const { color, accent, h } = b
  switch (b.kind) {
    case 'house':
      return (
        <g>
          <Shadow />
          <Box h={h} color={color} top={b.roof !== 'pyramid'} />
          <Windows h={h - 4} y0={4} floors={1} />
          <Door />
          {b.roof === 'pyramid' && <PyramidRoof h={h} r={14} color={accent} />}
          {b.roof === 'flat' && <Box hw={HW + 1.5} hh={HH + 0.8} h={2.5} color={accent} y0={h} />}
          {b.id === 'boulangerie' && <text x={9} y={-h + 2} fontSize={9} textAnchor="middle">🥐</text>}
          {b.id === 'cafe' && <text x={9} y={-h + 2} fontSize={9} textAnchor="middle">☕</text>}
          {b.id === 'magasin-sport' && <text x={9} y={-h + 2} fontSize={9} textAnchor="middle">🧗</text>}
        </g>
      )
    case 'tower':
      return (
        <g>
          <Shadow />
          <Box h={h} color={color} />
          <Windows h={h - 6} y0={6} floors={b.floors ?? 3} />
          <Door />
          <Box hw={HW + 1} hh={HH + 0.5} h={2.5} color={accent} y0={h} />
        </g>
      )
    case 'tree':
      return (
        <g>
          <ellipse cx={0} cy={2} rx={11} ry={5} fill="#000" opacity={0.12} />
          <rect x={-2.5} y={-12} width={5} height={13} rx={2} fill={accent} stroke={INK} strokeWidth={1.2} />
          <circle cx={-6} cy={-16} r={8} fill={shade(color, -0.12)} stroke={INK} strokeWidth={1.3} />
          <circle cx={6} cy={-17} r={8} fill={color} stroke={INK} strokeWidth={1.3} />
          <circle cx={0} cy={-25} r={9} fill={shade(color, 0.12)} stroke={INK} strokeWidth={1.3} />
        </g>
      )
    case 'pine':
      return (
        <g>
          <ellipse cx={0} cy={2} rx={10} ry={4.5} fill="#000" opacity={0.12} />
          <rect x={-2.5} y={-8} width={5} height={9} rx={2} fill={accent} stroke={INK} strokeWidth={1.2} />
          <Poly p={[[-12, -6], [12, -6], [0, -22]]} fill={shade(color, -0.08)} />
          <Poly p={[[-10, -15], [10, -15], [0, -30]]} fill={color} />
          <Poly p={[[-7, -24], [7, -24], [0, -37]]} fill={shade(color, 0.15)} />
        </g>
      )
    case 'garden':
      return (
        <g>
          <Poly p={[[-HW, 0], [0, HH], [HW, 0], [0, -HH]]} fill={color} />
          {[
            [-8, -1, '#ff70a6'],
            [-2, 3, '#ffd166'],
            [5, -2, '#ff70a6'],
            [0, -4, '#9b5de5'],
            [9, 1, '#ffd166'],
            [-4, -5, '#f15bb5'],
          ].map(([x, y, c], i) => (
            <g key={i}>
              <line x1={x as number} y1={y as number} x2={x as number} y2={(y as number) - 4} stroke="#2d6a4f" strokeWidth={1.2} />
              <circle cx={x as number} cy={(y as number) - 5} r={2.2} fill={c as string} stroke={INK} strokeWidth={0.6} />
            </g>
          ))}
        </g>
      )
    case 'water':
      return (
        <g>
          <Poly p={[[-HW - 1, 0], [0, HH + 0.5], [HW + 1, 0], [0, -HH - 0.5]]} fill={color} />
          <path d="M-8 -1 q3 -2 6 0 t6 0" stroke={accent} strokeWidth={1.4} fill="none" strokeLinecap="round" />
          <path d="M-2 4 q3 -2 6 0 t6 0" stroke={accent} strokeWidth={1.4} fill="none" strokeLinecap="round" />
          <text x={-6} y={-2} fontSize={7}>🦆</text>
        </g>
      )
    case 'fountain':
      return (
        <g>
          <Shadow />
          <ellipse cx={0} cy={0} rx={15} ry={7.5} fill={shade(color, -0.2)} stroke={INK} strokeWidth={1.3} />
          <ellipse cx={0} cy={-3} rx={15} ry={7.5} fill={color} stroke={INK} strokeWidth={1.3} />
          <ellipse cx={0} cy={-3} rx={12} ry={5.5} fill={accent} />
          <rect x={-2} y={-16} width={4} height={13} fill={color} stroke={INK} strokeWidth={1} />
          <path d="M0 -17 q-7 -6 -9 4 M0 -17 q7 -6 9 4" stroke={accent} strokeWidth={2} fill="none" strokeLinecap="round" />
        </g>
      )
    case 'kiosk':
      return (
        <g>
          <Shadow />
          <Box h={3} color="#e9d8a6" />
          {[[-11, -1], [11, -1], [0, 4]].map(([x, y], i) => (
            <rect key={i} x={x - 1.2} y={y - h} width={2.4} height={h} fill={color} stroke={INK} strokeWidth={0.8} />
          ))}
          <PyramidRoof h={h} r={11} color={accent} />
        </g>
      )
    case 'stall':
      return (
        <g>
          <Shadow />
          <Box hw={13} hh={6.5} h={h} color={shade(color, -0.2)} />
          <text x={-6} y={-h - 1} fontSize={7}>🍎</text>
          <text x={2} y={-h - 1} fontSize={7}>🥖</text>
          <line x1={0} y1={-h} x2={0} y2={-h - 14} stroke={INK} strokeWidth={1.4} />
          <Poly p={[[-15, -h - 10], [15, -h - 10], [0, -h - 22]]} fill={accent} />
          <Poly p={[[-7, -h - 10], [0, -h - 10], [0, -h - 22]]} fill="#fff" sw={1} />
        </g>
      )
    case 'boulder':
      return (
        <g>
          <ellipse cx={2} cy={3} rx={14} ry={6} fill="#4ea8de" stroke={INK} strokeWidth={1.1} />
          <Poly p={[[-13, 1], [-10, -10], [-2, -h - 2], [8, -h], [13, -4], [9, 3], [-4, 4]]} fill={color} />
          <Poly p={[[-2, -h - 2], [8, -h], [13, -4], [3, -6]]} fill={shade(color, 0.2)} sw={1} />
          <Holds seed={7} n={6} area={(u, v) => [-10 + u * 20, 1 - v * (h - 1)]} />
        </g>
      )
    case 'wall':
      return (
        <g>
          <Shadow />
          <Box hw={HW} hh={HH} h={4} color="#4ea8de" />
          {/* grand pan incliné */}
          <Poly p={[[-HW, -4], [0, HH - 4], [4, HH - 4 - h], [-HW + 4, -4 - h]]} fill={shade(color, -0.1)} />
          <Holds seed={3} n={9} area={(u, v) => [-HW + u * HW + v * 4, -4 + u * HH - v * h]} />
          <Poly p={[[0, HH - 4], [3, HH - 6], [7, HH - 6 - h], [4, HH - 4 - h]]} fill={shade(color, 0.15)} sw={1} />
        </g>
      )
    case 'gym':
      return (
        <g>
          <Shadow />
          <Box h={h} color={color} />
          <Holds seed={11} n={10} area={(u, v) => [-HW + u * HW, u * HH - 3 - v * (h - 6)]} />
          <Holds seed={5} n={8} area={(u, v) => [u * HW, HH - u * HH - 3 - v * (h - 6)]} />
          <Box hw={HW + 1} hh={HH + 0.5} h={3} color={accent} y0={h} />
          <text x={0} y={-h - 6} fontSize={8} textAnchor="middle" fontWeight={900} fill={INK}>
            BLOC
          </text>
        </g>
      )
    case 'cliff':
    case 'bigwall': {
      const H = h
      return (
        <g>
          <Shadow />
          <Poly p={[[-HW, 0], [0, HH], [HW, 0], [HW - 3, -H * 0.6], [6, -H], [-4, -H - 4], [-HW + 2, -H * 0.7]]} fill={color} />
          <Poly p={[[0, HH], [HW, 0], [HW - 3, -H * 0.6], [6, -H], [2, -H * 0.5]]} fill={shade(color, 0.18)} sw={1} />
          <Holds seed={b.kind === 'cliff' ? 13 : 21} n={b.kind === 'cliff' ? 8 : 14} area={(u, v) => [-HW + 3 + u * (HW + 8), HH * u - v * (H - 6)]} />
          {/* corde et grimpeur */}
          <line x1={-2} y1={HH - 2} x2={-1} y2={-H * 0.75} stroke={accent} strokeWidth={1.4} />
          <circle cx={-1} cy={-H * 0.75 + 3} r={2.6} fill="#ffd8b0" stroke={INK} strokeWidth={0.8} />
          {b.kind === 'bigwall' && <Poly p={[[-4, -H - 4], [6, -H], [4, -H - 10], [-1, -H - 14]]} fill="#fff" sw={1} />}
        </g>
      )
    }
    case 'statue':
      return (
        <g>
          <Shadow />
          <Box hw={11} hh={5.5} h={9} color={color} />
          {/* grimpeur doré, bras levé */}
          <g stroke={accent} strokeWidth={3} strokeLinecap="round" fill="none">
            <line x1={0} y1={-12} x2={0} y2={-22} />
            <line x1={0} y1={-12} x2={-4} y2={-9} />
            <line x1={0} y1={-12} x2={4} y2={-9} />
            <line x1={0} y1={-20} x2={6} y2={-27} />
            <line x1={0} y1={-20} x2={-5} y2={-17} />
          </g>
          <circle cx={0} cy={-25} r={3} fill={accent} stroke={INK} strokeWidth={0.8} />
        </g>
      )
    case 'lighthouse':
      return (
        <g>
          <Shadow />
          <Poly p={[[-10, 0], [10, 0], [6, -h], [-6, -h]]} fill={color} />
          <Poly p={[[-9, -h * 0.25], [9, -h * 0.25], [8.2, -h * 0.4], [-8.2, -h * 0.4]]} fill={accent} sw={1} />
          <Poly p={[[-7.5, -h * 0.6], [7.5, -h * 0.6], [6.8, -h * 0.75], [-6.8, -h * 0.75]]} fill={accent} sw={1} />
          <rect x={-5} y={-h - 9} width={10} height={9} fill="#ffe66d" stroke={INK} strokeWidth={1.2} />
          <Poly p={[[-7, -h - 9], [7, -h - 9], [0, -h - 17]]} fill={accent} />
        </g>
      )
    case 'clock':
      return (
        <g>
          <Shadow />
          <Box hw={11} hh={5.5} h={h} color={color} />
          <circle cx={5.5} cy={-h + 9} r={4.5} fill="#fff" stroke={INK} strokeWidth={1.1} />
          <line x1={5.5} y1={-h + 9} x2={5.5} y2={-h + 6} stroke={INK} strokeWidth={1} />
          <line x1={5.5} y1={-h + 9} x2={7.5} y2={-h + 9} stroke={INK} strokeWidth={1} />
          <PyramidRoof h={h} r={16} color={accent} hw={12.5} hh={6.5} />
        </g>
      )
    case 'castle':
      return (
        <g>
          <Shadow />
          <Box h={h * 0.7} color={color} />
          <Windows h={h * 0.5} y0={6} floors={1} color="#3d5a80" />
          <Door color="#5e3b2b" />
          {/* tours d'angle */}
          {[[-HW + 3, -1], [HW - 3, -1]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect x={-4} y={-h} width={8} height={h} fill={shade(color, i ? 0 : -0.15)} stroke={INK} strokeWidth={1.2} />
              <Poly p={[[-5.5, -h], [5.5, -h], [0, -h - 11]]} fill={accent} />
            </g>
          ))}
          <rect x={-3} y={-h - 2} width={6} height={10} fill={shade(color, 0.1)} stroke={INK} strokeWidth={1} />
          <line x1={0} y1={-h - 2} x2={0} y2={-h - 12} stroke={INK} strokeWidth={1} />
          <Poly p={[[0, -h - 12], [7, -h - 10], [0, -h - 8]]} fill="#e63946" sw={0.8} />
        </g>
      )
    case 'observatory':
      return (
        <g>
          <Shadow />
          <Box h={h * 0.55} color={color} />
          <Windows h={h * 0.35} y0={4} floors={1} />
          <path d={`M-14 ${-h * 0.55 + 1} A14 14 0 0 1 14 ${-h * 0.55 + 1} Z`} fill={accent} stroke={INK} strokeWidth={1.3} />
          <line x1={0} y1={-h * 0.55 - 8} x2={12} y2={-h * 0.55 - 18} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <text x={12} y={-h - 4} fontSize={7}>✨</text>
        </g>
      )
  }
}

/** Petite vignette autonome d'un bâtiment (cartes, inventaire, boutique) */
export function BuildingThumb({ b, size = 64, dim = false }: { b: Building; size?: number; dim?: boolean }) {
  // cadrage adapté à la hauteur du bâtiment, pied du bâtiment en bas de la vignette
  const top = Math.max(40, b.h + (b.roof === 'pyramid' || b.kind === 'clock' || b.kind === 'castle' ? 22 : 16))
  return (
    <svg
      viewBox={`-28 ${-top} 56 ${top + 14}`}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMax meet"
      style={{ opacity: dim ? 0.35 : 1, filter: dim ? 'grayscale(1)' : undefined }}
      aria-hidden="true"
    >
      <BuildingSprite b={b} />
    </svg>
  )
}
