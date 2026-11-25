import { useEffect, useMemo, useState } from 'react'
import type { Anim, Joints, Pt } from './skeleton'
import { FLOOR_Y, GRIP_Y, HEAD_R, easeInOut, layoutFirst, mix, place, spinePath } from './skeleton'
import { ANIMS } from './anims'

const INK = '#2b2d42'
const FAR = '#9a9fb8'
const SHIRT = '#ff8a3d'
const SKIN = '#ffd8b0'
const PROP = '#b07a4a'
const BAND = '#e84393'

const reduceMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Calcule la pose à l'instant t (ms) */
function poseAt(anim: Anim, t: number) {
  const n = anim.frames.length
  if (n === 1) return anim.frames[0]
  const dur = anim.dur ?? 1100
  const hold = anim.hold ?? 350
  const segs = anim.wrap ? n - 1 : n
  const segLen = dur + hold
  const total = segs * segLen
  // t peut être légèrement négatif au premier rendu (horodatage rAF antérieur)
  const local = ((t % total) + total) % total
  const i = Math.min(segs - 1, Math.floor(local / segLen))
  const within = local - i * segLen
  const k = within < hold ? 0 : easeInOut((within - hold) / dur)
  return mix(anim.frames[i], anim.frames[(i + 1) % n], k)
}

const line = (a: Pt, b: Pt, color: string, w: number) => (
  <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" />
)

function Props({ anim, first, j }: { anim: Anim; first: Joints; j: Joints }) {
  const hand = first.hand
  const items = anim.props ?? []
  return (
    <g>
      {items.includes('mat') && <rect x={30} y={FLOOR_Y - 1} width={140} height={5} rx={2} fill="#7fd1a8" />}
      {items.includes('bar') && (
        <g>
          {line([40, 0], [40, GRIP_Y], PROP, 4)}
          {line([160, 0], [160, GRIP_Y], PROP, 4)}
          {line([34, GRIP_Y], [166, GRIP_Y], INK, 5)}
        </g>
      )}
      {items.includes('board') && (
        <g>
          <rect x={hand[0] - 34} y={GRIP_Y - 10} width={68} height={12} rx={3} fill={PROP} stroke={INK} strokeWidth={2.5} />
          {line([hand[0] - 20, GRIP_Y - 10], [hand[0] - 20, 0], INK, 2)}
          {line([hand[0] + 20, GRIP_Y - 10], [hand[0] + 20, 0], INK, 2)}
        </g>
      )}
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
          <rect x={first.foot[0] - 18} y={first.foot[1]} width={36} height={5} rx={2} fill={PROP} stroke={INK} strokeWidth={2} />
          {line([first.foot[0] - 14, first.foot[1] + 5], [first.foot[0] - 14, FLOOR_Y], PROP, 3.5)}
          {line([first.foot[0] + 14, first.foot[1] + 5], [first.foot[0] + 14, FLOOR_Y], PROP, 3.5)}
        </g>
      )}
      {items.includes('wall-hand') && line([hand[0] + 4, 18], [hand[0] + 4, FLOOR_Y], PROP, 5)}
      {items.includes('band') && (
        <g>
          {line([188, hand[1] - 4], [188, hand[1] + 4], INK, 4)}
          {line(j.hand, [188, hand[1]], BAND, 3)}
        </g>
      )}
      {items.includes('band-hands') && line(j.hand, j.hand2, BAND, 3)}
    </g>
  )
}

function Body({ j, spine, front }: { j: Joints; spine: number; front?: boolean }) {
  const far = front ? INK : FAR
  return (
    <g>
      {line(j.neck, j.elbow2, far, 7)}
      {line(j.elbow2, j.hand2, far, 7)}
      {line(j.hip, j.knee2, far, 8)}
      {line(j.knee2, j.foot2, far, 8)}
      <path d={spinePath(j, spine)} stroke={SHIRT} strokeWidth={front ? 15 : 12} strokeLinecap="round" fill="none" />
      {line(j.hip, j.knee, INK, 8)}
      {line(j.knee, j.foot, INK, 8)}
      <circle cx={j.head[0]} cy={j.head[1]} r={HEAD_R} fill={SKIN} stroke={INK} strokeWidth={3} />
      {line(j.neck, j.elbow, INK, 7)}
      {line(j.elbow, j.hand, INK, 7)}
    </g>
  )
}

export function hasAnim(id: string) {
  return id in ANIMS
}

export function ExerciseFigure({ id, size = 'normal', frame }: { id: string; size?: 'normal' | 'small'; frame?: number }) {
  const anim = ANIMS[id]
  const first = useMemo(() => (anim ? layoutFirst(anim) : null), [anim])
  const [t, setT] = useState(0)

  useEffect(() => {
    if (!anim || anim.frames.length < 2 || frame !== undefined || reduceMotion()) return
    let raf = 0
    const start = performance.now()
    const loop = (now: number) => {
      setT(now - start)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [anim, frame])

  if (!anim || !first) return null
  const pose = frame !== undefined ? anim.frames[Math.min(frame, anim.frames.length - 1)] : poseAt(anim, t)
  const j = place(anim, first, pose)

  return (
    <figure className={`figure ${size}`}>
      <svg viewBox="0 0 200 150" role="img" aria-label="Démonstration de l'exercice">
        {line([10, FLOOR_Y + 2], [190, FLOOR_Y + 2], '#d9cdb5', 4)}
        <Props anim={anim} first={first} j={j} />
        <Body j={j} spine={pose.spine ?? 0} front={anim.front} />
      </svg>
      {anim.caption && <figcaption>{anim.caption}</figcaption>}
    </figure>
  )
}
