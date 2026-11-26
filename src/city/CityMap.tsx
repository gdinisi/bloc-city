import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CityState } from './economy'
import { gridOf, groundOf } from './economy'
import { buildingById, sizeOf } from './buildings'
import { BuildingSprite, TH, TW, shade, spriteUrl } from './iso'
import { SOLS, SPRITES } from './sprites'

/*
 * Carte isométrique de la ville.
 * - rotation de la vue par quarts de tour (on « tourne autour » de la ville)
 * - relief : chaque case a une hauteur (0 à 3 marches)
 * - les cases sont séparées par des rues pavées (tracées automatiquement), de l'eau entre deux cases d'eau
 * - sols, rues et bâtiments : rendus Blender (public/img/ville), seule la partie visible est dessinée
 * - au départ, la caméra cadre la partie construite de la ville
 * - caméra : glisser pour se déplacer, pincer avec deux doigts pour zoomer (molette sur ordinateur), sans limite pratique
 * - bâtiments : rendus Blender (public/img/ville), version HD chargée quand on zoome de près
 * - ordre d'affichage par diagonales, puis tri topologique des emprises
 */

type P = [number, number]
const STEP = 7 // hauteur d'une marche de relief (px)
/** Pas de la grille, en cases : une case + une rue (0,2 case) */
const F = 1.2
const RUE = F - 1
const EAU = '#62adc6'

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
  /** Projection d'un point exprimé en cases (u, v) — les centres de cases sont à (x·F, y·F) */
  const projC = (u: number, v: number): P => [((u - v) * TW) / 2, ((u + v) * TH) / 2]
  const proj = (vx: number, vy: number): P => projC(vx * F, vy * F)
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < G && y < G
  const elev = (x: number, y: number) => (inside(x, y) ? (city.elevation[`${x},${y}`] ?? 0) : 0)
  const groundAt = (x: number, y: number) => (inside(x, y) ? groundOf(city, `${x},${y}`) : null)

  // ---------- cadrage ----------
  const lo = -0.5 - RUE
  const hi = (G - 1) * F + 0.5 + RUE
  const half = ((hi - lo) * TW) / 2 + 8
  const bottom = hi * TH + 16
  const top = useMemo(() => {
    let t = lo * TH - 40
    for (const p of city.placed) {
      const b = buildingById(p.id)
      if (!b) continue
      const s = sizeOf(b)
      const [, cy] = proj(...toView(p.x + (s - 1) / 2, p.y + (s - 1) / 2))
      const sp = SPRITES[b.id]
      t = Math.min(t, sp ? cy - sp.oy - 3 * STEP - 4 : cy - (b.h + 36) * s - 3 * STEP)
    }
    return t
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.placed, rot, G])
  const vbW = half * 2
  const vbH = bottom - top

  // ---------- caméra ----------
  // zoom : de la vue d'ensemble jusqu'au très gros plan
  const clampS = (s: number) => Math.min(14, Math.max(0.5, s))
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

  // ---------- partie visible (on ne dessine que ce qui est à l'écran) ----------
  const vue = {
    x0: (-half - cam.x) / cam.s - TW,
    x1: (half - cam.x) / cam.s + TW,
    y0: (top - cam.y) / cam.s - TH * 2,
    y1: (bottom - cam.y) / cam.s + TH * 2,
  }
  const visible = (x: number, y: number, marge = 0) => x >= vue.x0 - marge && x <= vue.x1 + marge && y >= vue.y0 - marge && y <= vue.y1 + marge
  const hd = cam.s >= 2.2
  const solUrl = (nom: string) => `${import.meta.env.BASE_URL}img/ville/sol/${hd ? 'hd/' : ''}${nom}.webp`
  const image = (nom: string, cx: number, cy: number, key: string) => {
    const sp = SOLS[nom]
    return <image key={key} href={solUrl(nom)} x={cx - sp.ox} y={cy - sp.oy} width={sp.w} height={sp.h} preserveAspectRatio="none" />
  }

  // ---------- sol d'une case ----------
  const drawGround = (x: number, y: number): ReactNode => {
    const id = groundAt(x, y)!
    const [vx, vy] = toView(x, y)
    const [cx, cy0] = proj(vx, vy)
    if (!visible(cx, cy0, TW)) return null
    const e = elev(x, y)
    const cy = cy0 - e * STEP
    const out: ReactNode[] = []
    // flancs du relief : jusqu'au niveau de la rue voisine (min des deux cases)
    const avant = (dx: number, dy: number) => {
      // voisin devant dans la vue
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as P[]) {
        const [wx, wy] = toView(nx, ny)
        if (wx - vx === dx && wy - vy === dy) return Math.min(e, elev(nx, ny))
      }
      return 0
    }
    const hG = (e - avant(0, 1)) * STEP // face avant gauche (vers +vy)
    const hD = (e - avant(1, 0)) * STEP // face avant droite (vers +vx)
    if (hG > 0)
      out.push(<polygon key="l" points={`${cx - TW / 2},${cy} ${cx},${cy + TH / 2} ${cx},${cy + TH / 2 + hG} ${cx - TW / 2},${cy + hG}`} fill="#a9744a" stroke="#7d5232" strokeWidth={0.8} />)
    if (hD > 0)
      out.push(<polygon key="r" points={`${cx},${cy + TH / 2} ${cx + TW / 2},${cy} ${cx + TW / 2},${cy + hD} ${cx},${cy + TH / 2 + hD}`} fill="#c08a5b" stroke="#7d5232" strokeWidth={0.8} />)
    const nom = id === 'herbe' ? ((x * 7 + y * 13) % 3 === 0 ? 'herbe2' : 'herbe') : SOLS[id] ? id : 'herbe'
    out.push(image(nom, cx, cy, 'g'))
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

  // ---------- rues pavées entre les cases (et eau entre deux cases d'eau) ----------
  const occupant = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of city.placed) {
      const b = buildingById(p.id)
      const s = b ? sizeOf(b) : 1
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) m.set(`${p.x + dx},${p.y + dy}`, p.uid)
    }
    return m
  }, [city.placed])
  const rues: ReactNode[] = []
  {
    const meme = (cases: P[]) => {
      const u = cases.map(([x, y]) => (inside(x, y) ? occupant.get(`${x},${y}`) : undefined))
      return u[0] !== undefined && u.every((v) => v === u[0])
    }
    const eau = (cases: P[]) => cases.every(([x, y]) => groundAt(x, y) === 'eau')
    const niveau = (cases: P[]) => Math.min(...cases.map(([x, y]) => elev(x, y)))
    const poser = (nom: string, u: number, v: number, cases: P[], key: string) => {
      const [cx, cy] = projC(u, v)
      if (!visible(cx, cy, TW) || meme(cases)) return
      const L = niveau(cases) * STEP
      if (eau(cases)) {
        // demi-étendues de la bande, en cases
        const w = nom === 'route-x' ? [0.5, RUE / 2] : nom === 'route-y' ? [RUE / 2, 0.5] : [RUE / 2, RUE / 2]
        const c = (a: number, b: number) => projC(u + a, v + b).map((q, i) => (i ? q - L : q)).join(',')
        rues.push(<polygon key={key} points={[c(-w[0], -w[1]), c(w[0], -w[1]), c(w[0], w[1]), c(-w[0], w[1])].join(' ')} fill={EAU} />)
        return
      }
      rues.push(image(nom, cx, cy - L, key))
    }
    // vue tournée : on travaille en coordonnées de vue (rot = 0 aujourd'hui)
    for (let vy = 0; vy < G; vy++)
      for (let vx = -1; vx < G; vx++) poser('route-y', vx * F + F / 2, vy * F, [[vx, vy], [vx + 1, vy]], `ry${vx},${vy}`)
    for (let vx = 0; vx < G; vx++)
      for (let vy = -1; vy < G; vy++) poser('route-x', vx * F, vy * F + F / 2, [[vx, vy], [vx, vy + 1]], `rx${vx},${vy}`)
    for (let vx = -1; vx < G; vx++)
      for (let vy = -1; vy < G; vy++)
        poser('carrefour', vx * F + F / 2, vy * F + F / 2, [[vx, vy], [vx + 1, vy], [vx, vy + 1], [vx + 1, vy + 1]], `rc${vx},${vy}`)
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

  // ---------- cadrage de départ : la partie construite de la ville (ou toute l'île si elle est vide) ----------
  const cadrer = () => {
    if (!items.length) return { s: 1, x: 0, y: 0 }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const it of items) {
      const [cx, cy0] = proj(it.vx + (it.s - 1) / 2, it.vy + (it.s - 1) / 2)
      const cy = cy0 - it.e * STEP
      const sp = SPRITES[it.b.id]
      const w = sp ? sp.w : TW * it.s, h = sp ? sp.h : 60 * it.s
      const ox = sp ? sp.ox : w / 2, oy = sp ? sp.oy : h - TH
      x0 = Math.min(x0, cx - ox); x1 = Math.max(x1, cx - ox + w)
      y0 = Math.min(y0, cy - oy); y1 = Math.max(y1, cy - oy + h)
    }
    // marge d'environ une case autour, et au moins 3 × 3 cases de champ
    const m = TW * F
    const bw = Math.max(x1 - x0 + 2 * m, 3 * TW * F), bh = Math.max(y1 - y0 + 2 * m, 3 * TH * F)
    const sc = clampS(Math.min(vbW / bw, vbH / bh))
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
    return { s: sc, x: -mx * sc, y: (top + bottom) / 2 - my * sc }
  }
  const dejaCadre = useRef(false)
  useLayoutEffect(() => {
    if (dejaCadre.current) return
    dejaCadre.current = true
    setCam(cadrer())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- rendu par diagonales : sol puis bâtiments de chaque diagonale ----------
  /** Demi-largeur (en cases) de l'emprise d'un bâtiment de s cases, rues internes comprises */
  const emp = (s: number) => ((s - 1) * F + 1) / 2
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
          {SPRITES[it.b.id] ? (
            <>
              <image
                href={spriteUrl(it.b.id, it.p.flip !== (rot % 2 === 1), hd ? 'hd' : 'normal')}
                x={-SPRITES[it.b.id].ox}
                y={-SPRITES[it.b.id].oy}
                width={SPRITES[it.b.id].w}
                height={SPRITES[it.b.id].h}
                preserveAspectRatio="none"
              />
              {isSel && (
                <polygon
                  points={`${-TW * emp(it.s)},0 0,${TH * emp(it.s)} ${TW * emp(it.s)},0 0,${-TH * emp(it.s)}`}
                  fill="#ffe066"
                  fillOpacity={0.28}
                  stroke="#f2994a"
                  strokeWidth={2 / Math.sqrt(cam.s)}
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </>
          ) : (
            <>
              {isSel && (
                <polygon
                  points={`${-TW * emp(it.s)},0 0,${TH * emp(it.s)} ${TW * emp(it.s)},0 0,${-TH * emp(it.s)}`}
                  fill="#ffe066"
                  stroke="#f2994a"
                  strokeWidth={2}
                />
              )}
              <g transform={it.s > 1 ? `scale(${it.s})` : undefined}>
                <BuildingSprite b={it.b} flip={it.p.flip !== (rot % 2 === 1)} />
              </g>
            </>
          )}
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
          {/* socle de terre sous l'île */}
          <polygon points={`${projC(lo, hi).join(',')} ${projC(hi, hi).join(',')} ${projC(hi, hi)[0]},${projC(hi, hi)[1] + 12} ${projC(lo, hi)[0]},${projC(lo, hi)[1] + 12}`} fill="#b07a4a" />
          <polygon points={`${projC(hi, hi).join(',')} ${projC(hi, lo).join(',')} ${projC(hi, lo)[0]},${projC(hi, lo)[1] + 12} ${projC(hi, hi)[0]},${projC(hi, hi)[1] + 12}`} fill={shade('#b07a4a', -0.2)} />
          {rues}
          {layers}
        </g>
      </svg>
      {!readOnly && (
        <div className="map-controls">
          <button type="button" className="round" aria-label="Recentrer" onClick={() => setCam(cadrer())}>
            ⌖
          </button>
        </div>
      )}
    </div>
  )
}
