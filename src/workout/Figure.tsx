import { useEffect, useMemo, useState } from 'react'
import type { Anim, Joints, Limb, Pt } from './skeleton'
import { FLOOR_Y, GRIP_Y, HEAD_R, cycleLength, dir, layoutFirst, place, spinePath, timeline } from './skeleton'
import { ANIMS } from './anims'
import { SCENES } from './scenes'
import { BAND, FAR, INK, PROP, SHIRT, SKIN } from './palette'

const reduceMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

const line = (a: Pt, b: Pt, color: string, w: number) => (
  <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" />
)

const poly = (pts: Pt[], color: string, w: number) => (
  <polyline
    points={pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}
    stroke={color}
    strokeWidth={w}
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  />
)

/** Élastique : légère courbe quand il est détendu */
export function Band({ a, b, slack = 0 }: { a: Pt; b: Pt; slack?: number }) {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2 + slack
  return <path d={`M${a[0]} ${a[1]} Q${mx} ${my} ${b[0]} ${b[1]}`} stroke={BAND} strokeWidth={4} strokeLinecap="round" fill="none" />
}

/* ---------- Corps : points de rendu (épaules / hanches écartées en vue de face) ---------- */

interface Rig {
  head: Pt
  neck: Pt
  hip: Pt
  shL: Pt
  shR: Pt
  hipL: Pt
  hipR: Pt
  arm: Pt[]
  arm2: Pt[]
  leg: Pt[]
  leg2: Pt[]
}

const SHOULDER = 10
const HIP = 6

function rig(j: Joints, front: boolean): Rig {
  if (!front) {
    return {
      head: j.head,
      neck: j.neck,
      hip: j.hip,
      shL: j.neck,
      shR: j.neck,
      hipL: j.hip,
      hipR: j.hip,
      arm: [j.neck, j.elbow, j.hand],
      arm2: [j.neck, j.elbow2, j.hand2],
      leg: [j.hip, j.knee, j.foot],
      leg2: [j.hip, j.knee2, j.foot2],
    }
  }
  const ux = j.neck[0] - j.hip[0]
  const uy = j.neck[1] - j.hip[1]
  const len = Math.hypot(ux, uy) || 1
  const px = -uy / len
  const py = ux / len
  const off = (p: Pt, k: number): Pt => [p[0] + px * k, p[1] + py * k]
  return {
    head: j.head,
    neck: j.neck,
    hip: j.hip,
    shL: off(j.neck, -SHOULDER),
    shR: off(j.neck, SHOULDER),
    hipL: off(j.hip, -HIP),
    hipR: off(j.hip, HIP),
    arm: [j.neck, j.elbow, j.hand].map((p) => off(p, -SHOULDER)),
    arm2: [j.neck, j.elbow2, j.hand2].map((p) => off(p, SHOULDER)),
    leg: [j.hip, j.knee, j.foot].map((p) => off(p, -HIP)),
    leg2: [j.hip, j.knee2, j.foot2].map((p) => off(p, HIP)),
  }
}

function Eyes({ r, headAngle, front }: { r: Rig; headAngle: number; front: boolean }) {
  const [hx, hy] = r.head
  if (front) {
    // deux yeux, perpendiculaires au cou
    const [ux, uy] = dir(headAngle)
    const px = -uy
    const py = ux
    return (
      <g fill={INK}>
        <circle cx={hx + px * 3.2 + ux * 1} cy={hy + py * 3.2 + uy * 1} r={1.6} />
        <circle cx={hx - px * 3.2 + ux * 1} cy={hy - py * 3.2 + uy * 1} r={1.6} />
      </g>
    )
  }
  // de profil : l'œil regarde du côté "avant" du corps
  const [ex, ey] = dir(headAngle + 90)
  const [ux, uy] = dir(headAngle)
  return <circle cx={hx + ex * 4.5 + ux * 1.5} cy={hy + ey * 4.5 + uy * 1.5} r={1.8} fill={INK} />
}

const HL = '#2f80ed'
const HL_FAR = '#8db8f5'

function Body({
  r,
  spine,
  front,
  headAngle,
  eyes,
  hl,
}: {
  r: Rig
  spine: number
  front: boolean
  headAngle: number
  eyes: boolean
  hl: Set<Limb>
}) {
  const far = front ? INK : FAR
  const c = (limb: Limb, base: string) => (hl.has(limb) ? (base === FAR ? HL_FAR : HL) : base)
  return (
    <g>
      {poly(r.leg2, c('leg2', far), 8)}
      {!front && poly(r.arm2, c('arm2', far), 7)}
      {front ? (
        <polygon
          points={[r.shL, r.shR, r.hipR, r.hipL].map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}
          fill={SHIRT}
          stroke={SHIRT}
          strokeWidth={8}
          strokeLinejoin="round"
        />
      ) : (
        <path d={spinePath(r.hip, r.neck, spine)} stroke={SHIRT} strokeWidth={12} strokeLinecap="round" fill="none" />
      )}
      {poly(r.leg, c('leg', INK), 8)}
      {line(r.neck, r.head, SKIN, 6)}
      <circle cx={r.head[0]} cy={r.head[1]} r={HEAD_R} fill={SKIN} stroke={INK} strokeWidth={3} />
      {eyes && <Eyes r={r} headAngle={headAngle} front={front} />}
      {front && poly(r.arm2, c('arm2', INK), 7)}
      {poly(r.arm, c('arm', INK), 7)}
    </g>
  )
}

/* ---------- Décor ---------- */

function Board({ cx, kind }: { cx: number; kind: 'board' | 'board-edge' | 'board-jug' }) {
  return (
    <g>
      {line([cx - 24, GRIP_Y - 10], [cx - 24, 0], INK, 2)}
      {line([cx + 24, GRIP_Y - 10], [cx + 24, 0], INK, 2)}
      <rect x={cx - 40} y={GRIP_Y - 11} width={80} height={13} rx={3} fill={PROP} stroke={INK} strokeWidth={2.5} />
      {kind === 'board-edge' && <rect x={cx - 30} y={GRIP_Y - 1} width={60} height={3} rx={1} fill="#e74c3c" />}
      {kind === 'board-jug' && <rect x={cx - 34} y={GRIP_Y - 3} width={68} height={8} rx={4} fill="#2ecc71" stroke={INK} strokeWidth={2} />}
    </g>
  )
}

function BackProps({ anim, first }: { anim: Anim; first: Joints }) {
  const hand = first.hand
  const items = anim.props ?? []
  const midHands = (first.hand[0] + first.hand2[0]) / 2
  const doorSide = first.hand[0] < first.neck[0] ? -1 : 1
  return (
    <g>
      {items.includes('mat') && <rect x={24} y={FLOOR_Y - 1} width={152} height={5} rx={2} fill="#7fd1a8" />}
      {items.includes('bar') && (
        <g>
          {line([36, 0], [36, GRIP_Y], PROP, 4)}
          {line([164, 0], [164, GRIP_Y], PROP, 4)}
          {line([30, GRIP_Y], [170, GRIP_Y], INK, 5)}
        </g>
      )}
      {(['board', 'board-edge', 'board-jug'] as const).map((k) => items.includes(k) && <Board key={k} cx={midHands} kind={k} />)}
      {items.includes('table-hands') && (
        <g>
          <rect x={hand[0] - 40} y={hand[1] - 6} width={80} height={6} rx={2} fill={PROP} stroke={INK} strokeWidth={2} />
          {line([hand[0] - 34, hand[1]], [hand[0] - 34, FLOOR_Y], PROP, 4)}
          {line([hand[0] + 34, hand[1]], [hand[0] + 34, FLOOR_Y], PROP, 4)}
        </g>
      )}
      {items.includes('chair-hands') && (
        <g>
          <rect x={hand[0] - 22} y={hand[1] + 1} width={30} height={5} rx={2} fill={PROP} stroke={INK} strokeWidth={2} />
          {line([hand[0] - 19, hand[1] + 6], [hand[0] - 19, FLOOR_Y], PROP, 3.5)}
          {line([hand[0] + 5, hand[1] + 6], [hand[0] + 5, FLOOR_Y], PROP, 3.5)}
          {line([hand[0] - 19, hand[1] + 1], [hand[0] - 19, hand[1] - 30], PROP, 3.5)}
        </g>
      )}
      {items.includes('chair-foot') && (
        <g>
          <rect x={first.foot[0] - 18} y={first.foot[1] + 4} width={36} height={5} rx={2} fill={PROP} stroke={INK} strokeWidth={2} />
          {line([first.foot[0] - 14, first.foot[1] + 9], [first.foot[0] - 14, FLOOR_Y], PROP, 3.5)}
          {line([first.foot[0] + 14, first.foot[1] + 9], [first.foot[0] + 14, FLOOR_Y], PROP, 3.5)}
        </g>
      )}
      {items.includes('door-hand') && (
        <g>
          <rect x={hand[0] + doorSide * 4 - (doorSide < 0 ? 10 : 0)} y={8} width={10} height={FLOOR_Y - 6} rx={2} fill="#e3c9a8" stroke={PROP} strokeWidth={3} />
        </g>
      )}
      {items.includes('band') && <rect x={184} y={hand[1] - 10} width={10} height={20} rx={3} fill={PROP} stroke={INK} strokeWidth={2} />}
    </g>
  )
}

function FrontProps({ anim, first, r }: { anim: Anim; first: Joints; r: Rig }) {
  const items = anim.props ?? []
  const hand = r.arm[2]
  const hand2 = r.arm2[2]
  return (
    <g>
      {items.includes('band') && <Band a={hand} b={[189, first.hand[1]]} />}
      {items.includes('band-hands') && <Band a={hand} b={hand2} slack={Math.max(0, 14 - Math.abs(hand[0] - hand2[0]) / 3)} />}
    </g>
  )
}

/** Hauteur de la scène, et de la scène + bandeau d'étiquette en dessous */
export const VIEW_H = 150
export const VIEW_H_LABEL = 172

/** Étiquette centrée dans un bandeau sous la scène (ne cache jamais le décor) */
export function LabelBadge({ text }: { text: string }) {
  const natural = 14 + text.length * 5.7
  const w = Math.min(194, natural)
  // texte trop long : on réduit la police plutôt que de déborder
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

/* ---------- Composant ---------- */

export function hasAnim(id: string) {
  return id in ANIMS || id in SCENES
}

function useClock(active: boolean) {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!active || reduceMotion()) return
    let raf = 0
    const start = performance.now()
    const loop = (now: number) => {
      setT(Math.max(0, now - start))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])
  return t
}

/** Durée d'un cycle (ms), pour les captures de contrôle */
export function animCycle(id: string) {
  if (SCENES[id]) return SCENES[id].period * (id === 'poignet-flex' || id === 'avant-bras' ? 2 : 1)

  return ANIMS[id] ? cycleLength(ANIMS[id]) : 1000
}

export function ExerciseFigure({ id, size = 'normal', frame, at }: { id: string; size?: 'normal' | 'small'; frame?: number; at?: number }) {
  const anim: Anim | undefined = ANIMS[id]
  const scene = SCENES[id]
  const first = useMemo(() => (anim ? layoutFirst(anim) : null), [anim])
  const animated = (!!scene || (!!anim && anim.frames.length > 1)) && frame === undefined && at === undefined
  const clock = useClock(animated)
  const t = at ?? clock

  if (scene) {
    const time = frame !== undefined ? frame * scene.period * 0.25 + scene.period * 0.08 : t
    return (
      <figure className={`figure ${size}`}>
        <svg viewBox={`0 0 200 ${VIEW_H_LABEL}`} role="img" aria-label="Démonstration de l'exercice">
          {scene.render(time)}
        </svg>
        {scene.caption && <figcaption>{scene.caption}</figcaption>}
      </figure>
    )
  }

  if (!anim || !first) return null
  const tl =
    frame !== undefined
      ? (() => {
          const f = anim.frames[Math.min(frame, anim.frames.length - 1)]
          return { pose: f, a: f, b: f, k: 0, label: f.label }
        })()
      : timeline(anim, t)
  const j = place(anim, first, tl.pose, tl.a, tl.b, tl.k)
  const r = rig(j, !!anim.front)
  const labelled = anim.frames.some((f) => f.label)

  return (
    <figure className={`figure ${size}`}>
      <svg viewBox={`0 0 200 ${labelled ? VIEW_H_LABEL : VIEW_H}`} role="img" aria-label="Démonstration de l'exercice">
        {!anim.top && line([10, FLOOR_Y + 2], [190, FLOOR_Y + 2], '#d9cdb5', 4)}
        <BackProps anim={anim} first={first} />
        <Body r={r} spine={tl.pose.spine ?? 0} front={!!anim.front} headAngle={tl.pose.head ?? tl.pose.torso} eyes={anim.eyes ?? !(anim.top && anim.front)}
          hl={new Set([...(tl.a.hl ?? []), ...(tl.k > 0 ? (tl.b.hl ?? []) : [])])}
        />
        <FrontProps anim={anim} first={first} r={r} />
        {tl.label && <LabelBadge text={tl.label} />}
      </svg>
      {anim.caption && <figcaption>{anim.caption}</figcaption>}
    </figure>
  )
}
