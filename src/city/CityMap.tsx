import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CityState } from './economy'
import { gridOf } from './economy'
import { buildingById, sizeOf } from './buildings'
import { BuildingSprite, GroundTile, TH, TW, shade } from './iso'

/*
 * Carte isométrique de la ville.
 * - rotation de la vue par quarts de tour (on « tourne autour » de la ville)
 * - relief : chaque case a une hauteur (0 à 3 marches)
 * - routes, eau et ponts se raccordent automatiquement à leurs voisins
 * - caméra : glisser pour se déplacer, pincer avec deux doigts pour zoomer (molette sur ordinateur)
 * - ordre d'affichage par diagonales, puis tri topologique des emprises
 */

type P = [number, number]
const STEP = 7 // hauteur d'une marche de relief (px)
const DIRS: P[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const CONNECT: Record<string, string[]> = {
  route: ['route', 'pont'],
  pont: ['route', 'pont'],
}

interface Props {
  city: CityState
  /** Carte figée (aperçu de l'accueil) : pas de caméra ni de contrôles */
  readOnly?: boolean
  onTile?: (x: number, y: number) => void
  onBuilding?: (uid: string) => void
  selected?: string | null
  /** Cases à mettre en surbrillance (pose / déplacement) */
  valid?: Set<string>
  /** Bâtiments transparents (édition du sol ou du relief) */
  ghost?: boolean
  movingUid?: string | null
  className?: string
}

export function CityMap({ city, readOnly, onTile, onBuilding, selected, valid, ghost, movingUid, className }: Props) {
  const G = gridOf(city)
  // vue fixe (plus de rotation autour de la ville)
  const rot = 0 as number
  const [cam, setCam] = useState({ s: 1, x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, P>())
  const gesture = useRef<{ dist: number; s: number; moved: boolean }>({ dist: 0, s: 1, moved: false })

  // ---------- géométrie (vue tournée) ----------
  const toView = (x: number, y: number): P => {
    switch (rot) {
      case 1:
        return [G - 1 - y, x]
      case 2:
        return [G - 1 - x, G - 1 - y]
      case 3:
        return [y, G - 1 - x]
      default:
        return [x, y]
    }
  }
  const proj = (vx: number, vy: number): P => [((vx - vy) * TW) / 2, ((vx + vy) * TH) / 2]
  const elev = (x: number, y: number) => city.elevation[`${x},${y}`] ?? 0
  const screen = (x: number, y: number): P => proj(...toView(x, y))
  const groundAt = (x: number, y: number) => (x < 0 || y < 0 || x >= G || y >= G ? null : (city.ground[`${x},${y}`] ?? 'herbe'))

  // ---------- cadrage ----------
  const half = (G * TW) / 2 + 8
  const bottom = G * TH - TH / 2 + 16
  const top = useMemo(() => {
    let t = -60
    for (const p of city.placed) {
      const b = buildingById(p.id)
      if (!b) continue
      const s = sizeOf(b)
      const [, cy] = proj(...toView(p.x + (s - 1) / 2, p.y + (s - 1) / 2))
      t = Math.min(t, cy - (b.h + 36) * s - 3 * STEP)
    }
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.placed, rot, G])
  const vbW = half * 2
  const vbH = bottom - top

  // ---------- caméra ----------
  const clampS = (s: number) => Math.min(3.2, Math.max(0.7, s))
  const zoomBy = (k: number, cx = 0, cy = (top + bottom) / 2) =>
    setCam((c) => {
      const s = clampS(c.s * k)
      // garde le point (cx, cy) fixe à l'écran
      const r = s / c.s
      return { s, x: cx - (cx - c.x) * r, y: cy - (cy - c.y) * r }
    })
  const toSvg = (clientX: number, clientY: number): P => {
    const el = svgRef.current
    if (!el) return [0, 0]
    const r = el.getBoundingClientRect()
    return [-half + ((clientX - r.left) / r.width) * vbW, top + ((clientY - r.top) / r.height) * vbH]
  }
  const unitsPerPx = () => {
    const el = svgRef.current
    return el ? vbW / el.getBoundingClientRect().width : 1
  }

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, [e.clientX, e.clientY])
    if (pointers.current.size === 1) gesture.current.moved = false
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current.dist = Math.hypot(a[0] - b[0], a[1] - b[1])
      gesture.current.s = cam.s
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const cur: P = [e.clientX, e.clientY]
    pointers.current.set(e.pointerId, cur)
    if (pointers.current.size === 1) {
      const dx = cur[0] - prev[0]
      const dy = cur[1] - prev[1]
      if (!gesture.current.moved && Math.hypot(dx, dy) < 2) return
      gesture.current.moved = true
      const u = unitsPerPx()
      setCam((c) => ({ ...c, x: c.x + dx * u, y: c.y + dy * u }))
    } else if (pointers.current.size === 2) {
      gesture.current.moved = true
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a[0] - b[0], a[1] - b[1])
      if (!gesture.current.dist) return
      const target = clampS((gesture.current.s * d) / gesture.current.dist)
      const [mx, my] = toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
      setCam((c) => {
        const r = target / c.s
        return { s: target, x: mx - (mx - c.x) * r, y: my - (my - c.y) * r }
      })
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) gesture.current.dist = 0
  }
  const onWheel = (e: React.WheelEvent) => {
    const [mx, my] = toSvg(e.clientX, e.clientY)
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, mx, my)
  }
  /** Un glissement ne doit pas déclencher de « toucher » */
  const tap = (fn?: () => void) => () => {
    if (gesture.current.moved || !fn) return
    fn()
  }

  // ---------- sol ----------
  const drawGround = (x: number, y: number): ReactNode => {
    const id = groundAt(x, y)!
    const [cx, cy0] = screen(x, y)
    const e = elev(x, y)
    const cy = cy0 - e * STEP
    const alt = (x + y) % 2 === 1
    const out: ReactNode[] = []

    // flancs du relief
    if (e > 0) {
      const h = e * STEP
      out.push(
        <polygon key="l" points={`${cx - TW / 2},${cy} ${cx},${cy + TH / 2} ${cx},${cy + TH / 2 + h} ${cx - TW / 2},${cy + h}`} fill="#a9744a" stroke="#7d5232" strokeWidth={0.8} />,
        <polygon key="r" points={`${cx},${cy + TH / 2} ${cx + TW / 2},${cy} ${cx + TW / 2},${cy + h} ${cx},${cy + TH / 2 + h}`} fill="#c08a5b" stroke="#7d5232" strokeWidth={0.8} />,
      )
    }

    const base = id === 'route' ? 'herbe' : id === 'pont' ? 'eau' : id
    out.push(<GroundTile key="g" id={base} cx={cx} cy={cy} alt={alt} />)

    if (id === 'route' || id === 'pont') {
      // vecteurs vers chaque voisin (dans la vue tournée)
      const C: P = [cx, cy]
      const conns = DIRS.filter(([dx, dy]) => CONNECT[id].includes(groundAt(x + dx, y + dy) ?? ''))
      const dirsToDraw = conns.length ? conns : id === 'pont' ? ([[1, 0], [-1, 0]] as P[]) : []
      const k = id === 'route' ? 0.3 : 0.34
      const color = id === 'route' ? '#5c5f6b' : '#c08a50'
      const vec = (dx: number, dy: number): P => {
        const [nx, ny] = screen(x + dx, y + dy)
        const [ox, oy] = screen(x, y)
        return [(nx - ox) / 2, (ny - oy) / 2]
      }
      // pavé central
      const a = vec(1, 0)
      const b = vec(0, 1)
      const corner = (sa: number, sb: number): string => `${C[0] + (a[0] * sa + b[0] * sb) * k * 2},${C[1] + (a[1] * sa + b[1] * sb) * k * 2}`
      out.push(<polygon key="c" points={[corner(1, 1), corner(1, -1), corner(-1, -1), corner(-1, 1)].join(' ')} fill={color} />)
      for (const [dx, dy] of dirsToDraw) {
        const m = vec(dx, dy)
        const w = vec(Math.abs(dy), Math.abs(dx))
        const wx = w[0] * k * 2
        const wy = w[1] * k * 2
        const M: P = [C[0] + m[0], C[1] + m[1]]
        out.push(
          <polygon
            key={`b${dx}${dy}`}
            points={`${C[0] + wx},${C[1] + wy} ${M[0] + wx},${M[1] + wy} ${M[0] - wx},${M[1] - wy} ${C[0] - wx},${C[1] - wy}`}
            fill={color}
          />,
        )
        if (id === 'route') {
          out.push(<line key={`d${dx}${dy}`} x1={C[0]} y1={C[1]} x2={M[0]} y2={M[1]} stroke="#f1f3f5" strokeWidth={1.1} strokeDasharray="2.5 2.5" />)
        } else {
          // planches et garde-corps du pont
          out.push(
            <line key={`p${dx}${dy}`} x1={C[0]} y1={C[1]} x2={M[0]} y2={M[1]} stroke="#9c6b3a" strokeWidth={0.8} />,
            <line key={`r1${dx}${dy}`} x1={C[0] + wx} y1={C[1] + wy - 2} x2={M[0] + wx} y2={M[1] + wy - 2} stroke="#6b4423" strokeWidth={1.2} />,
            <line key={`r2${dx}${dy}`} x1={C[0] - wx} y1={C[1] - wy - 2} x2={M[0] - wx} y2={M[1] - wy - 2} stroke="#6b4423" strokeWidth={1.2} />,
          )
        }
      }
    }

    if (valid?.has(`${x},${y}`)) {
      out.push(
        <polygon
          key="v"
          points={`${cx - TW / 2},${cy} ${cx},${cy + TH / 2} ${cx + TW / 2},${cy} ${cx},${cy - TH / 2}`}
          fill="#ffffff"
          fillOpacity={0.45}
          stroke="#5b6cff"
          strokeWidth={1.4}
          strokeDasharray="3 2"
        />,
      )
    }

    return (
      <g key={`t${x},${y}`} onClick={tap(onTile ? () => onTile(x, y) : undefined)} style={{ cursor: onTile ? 'pointer' : undefined }}>
        {out}
      </g>
    )
  }

  // ---------- bâtiments : position, profondeur, ordre ----------
  const items = useMemo(() => {
    return city.placed
      .map((p) => {
        const b = buildingById(p.id)
        if (!b) return null
        const s = sizeOf(b)
        const corners = [toView(p.x, p.y), toView(p.x + s - 1, p.y + s - 1)]
        const vx = Math.min(corners[0][0], corners[1][0])
        const vy = Math.min(corners[0][1], corners[1][1])
        let e = 0
        for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) e = Math.max(e, elev(p.x + dx, p.y + dy))
        return { p, b, s, vx, vy, e, depth: vx + vy + 2 * (s - 1) }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.placed, city.elevation, rot, G])

  /** A doit être dessiné avant B s'il est derrière lui sur un axe où leurs emprises se recouvrent */
  type Item = (typeof items)[number]
  const behind = (a: Item, b: Item) => {
    const overlapX = a.vx < b.vx + b.s && b.vx < a.vx + a.s
    const overlapY = a.vy < b.vy + b.s && b.vy < a.vy + a.s
    return (a.vx + a.s <= b.vx && overlapY) || (a.vy + a.s <= b.vy && overlapX)
  }
  const ordered = useMemo(() => {
    // tri topologique simple (peu d'éléments)
    const rest = [...items].sort((a, b) => a.depth - b.depth)
    const out: Item[] = []
    while (rest.length) {
      const i = rest.findIndex((a) => !rest.some((b) => b !== a && behind(b, a)))
      out.push(...rest.splice(i === -1 ? 0 : i, 1))
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  // ---------- rendu par diagonales : sol puis bâtiments de chaque diagonale ----------
  const layers: ReactNode[] = []
  const tilesByDepth = new Map<number, P[]>()
  for (let y = 0; y < G; y++)
    for (let x = 0; x < G; x++) {
      const [vx, vy] = toView(x, y)
      const d = vx + vy
      if (!tilesByDepth.has(d)) tilesByDepth.set(d, [])
      tilesByDepth.get(d)!.push([x, y])
    }
  const buildingsByDepth = new Map<number, Item[]>()
  for (const it of ordered) {
    if (!buildingsByDepth.has(it.depth)) buildingsByDepth.set(it.depth, [])
    buildingsByDepth.get(it.depth)!.push(it)
  }
  for (let d = 0; d <= 2 * G - 2; d++) {
    for (const [x, y] of tilesByDepth.get(d) ?? []) layers.push(drawGround(x, y))
    for (const it of buildingsByDepth.get(d) ?? []) {
      const [cx, cy] = proj(it.vx + (it.s - 1) / 2, it.vy + (it.s - 1) / 2)
      const isSel = it.p.uid === selected
      const moving = it.p.uid === movingUid
      layers.push(
        <g
          key={it.p.uid}
          transform={`translate(${cx} ${cy - it.e * STEP})`}
          onClick={tap(onBuilding ? () => onBuilding(it.p.uid) : undefined)}
          style={{
            cursor: onBuilding ? 'pointer' : undefined,
            opacity: moving ? 0.35 : ghost ? 0.3 : 1,
            pointerEvents: ghost || moving || !onBuilding ? 'none' : 'auto',
            transition: 'opacity 0.2s',
          }}
        >
          {isSel && (
            <polygon
              points={`${(-TW * it.s) / 2},0 0,${(TH * it.s) / 2} ${(TW * it.s) / 2},0 0,${(-TH * it.s) / 2}`}
              fill="#ffe066"
              stroke="#f2994a"
              strokeWidth={2}
            />
          )}
          <g transform={it.s > 1 ? `scale(${it.s})` : undefined}>
            <BuildingSprite b={it.b} flip={it.p.flip !== (rot % 2 === 1)} />
          </g>
        </g>,
      )
    }
  }

  return (
    <div className={`city-map ${className ?? ''}`}>
      <svg
        ref={svgRef}
        className="city-svg"
        viewBox={`${-half} ${top} ${vbW} ${vbH}`}
        role="img"
        aria-label="Ta ville"
        onPointerDown={readOnly ? undefined : onPointerDown}
        onPointerMove={readOnly ? undefined : onPointerMove}
        onPointerUp={readOnly ? undefined : onPointerUp}
        onPointerCancel={readOnly ? undefined : onPointerUp}
        onPointerLeave={readOnly ? undefined : onPointerUp}
        onWheel={readOnly ? undefined : onWheel}
        style={{ touchAction: readOnly ? 'auto' : 'none' }}
      >
        <rect x={-half} y={top} width={vbW} height={vbH} fill="transparent" />
        <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.s})`}>
          {/* socle de terre sous la carte */}
          <polygon points={`${(-G * TW) / 2},${(G * TH) / 2 - TH / 2} 0,${G * TH - TH / 2} 0,${G * TH - TH / 2 + 10} ${(-G * TW) / 2},${(G * TH) / 2 - TH / 2 + 10}`} fill="#b07a4a" />
          <polygon points={`0,${G * TH - TH / 2} ${(G * TW) / 2},${(G * TH) / 2 - TH / 2} ${(G * TW) / 2},${(G * TH) / 2 - TH / 2 + 10} 0,${G * TH - TH / 2 + 10}`} fill={shade('#b07a4a', -0.2)} />
          {layers}
        </g>
      </svg>
      {!readOnly && (
        <div className="map-controls">
          <button type="button" className="round" aria-label="Recentrer" onClick={() => setCam({ s: 1, x: 0, y: 0 })}>
            ⌖
          </button>
        </div>
      )}
    </div>
  )
}
