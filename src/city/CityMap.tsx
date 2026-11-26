import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CityState } from './economy'
import { landCandidates, landOf } from './economy'
import { buildingById, sizeOf } from './buildings'
import { BuildingSprite, TH, TW, spriteUrl } from './iso'
import { SOLS, SPRITES } from './sprites'

/*
 * Carte isométrique de la ville (rendus Blender : sols, falaises, mer, bâtiments).
 * - l'île est un ensemble libre de cases côte à côte (on peut en ajouter / enlever une par une)
 * - l'île est entourée par la mer, une marche plus bas que le sol (de quoi ajouter des ports plus tard)
 * - relief : 0 à 3 marches par case ; falaises rocheuses face à la mer ou à une case plus basse
 * - caméra : glisser pour se déplacer, pincer pour zoomer (×0,5 à ×14, molette sur ordinateur) ;
 *   au départ, elle cadre la partie construite. Seule la partie visible est dessinée.
 */

type P = [number, number]
const STEP = 7 // hauteur d'une marche de relief (unités de la carte)
const MER = -1 // niveau de la mer, en marches
/** Couleur de la mer au-delà des cases d'eau dessinées */
export const COULEUR_MER = '#1d5f8c'

interface Props {
  city: CityState
  /** Carte figée : pas de caméra ni de contrôles */
  readOnly?: boolean
  onTile?: (x: number, y: number) => void
  onBuilding?: (uid: string) => void
  /** Ajout de cases : emplacements libres à côté de l'île */
  onAddCase?: (x: number, y: number) => void
  selected?: string | null
  /** Cases à mettre en surbrillance (pose / déplacement) */
  valid?: Set<string>
  /** Bâtiments transparents (édition du relief ou du terrain) */
  ghost?: boolean
  movingUid?: string | null
  className?: string
  /** Affichage plein écran (la carte remplit son conteneur) */
  plein?: boolean
  /** Bouton supplémentaire dans les contrôles (ex. plein écran) */
  controle?: ReactNode
}

export function CityMap({ city, readOnly, onTile, onBuilding, onAddCase, selected, valid, ghost, movingUid, className, plein, controle }: Props) {
  const land = useMemo(() => landOf(city), [city])
  const candidats = useMemo(() => (onAddCase ? landCandidates(city) : []), [city, onAddCase])
  const [cam, setCam] = useState({ s: 1, x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, P>())
  const gesture = useRef<{ dist: number; s: number; moved: boolean }>({ dist: 0, s: 1, moved: false })

  // ---------- géométrie ----------
  const proj = (x: number, y: number): P => [((x - y) * TW) / 2, ((x + y) * TH) / 2]
  const isLand = (x: number, y: number) => land.has(`${x},${y}`)
  const elev = (x: number, y: number) => (isLand(x, y) ? (city.elevation[`${x},${y}`] ?? 0) : MER)
  const cases = useMemo(() => [...land].map((k) => k.split(',').map(Number) as P), [land])

  // ---------- cadrage : figé au premier affichage (ajouter / enlever des cases ne fait pas sauter la carte) ----------
  const calculerBoite = () => {
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity
    for (const [x, y] of cases) {
      a0 = Math.min(a0, x - y); a1 = Math.max(a1, x - y)
      b0 = Math.min(b0, x + y); b1 = Math.max(b1, x + y)
    }
    if (!cases.length) a0 = a1 = b0 = b1 = 0
    const m = 1.5 // un peu de mer autour
    const x0 = ((a0 - m) * TW) / 2 - TW / 2
    const x1 = ((a1 + m) * TW) / 2 + TW / 2
    let top = ((b0 - m) * TH) / 2 - TH - 40
    const bottom = ((b1 + m) * TH) / 2 + TH + 4 * STEP
    for (const p of city.placed) {
      const b = buildingById(p.id)
      if (!b) continue
      const s = sizeOf(b)
      const [, cy] = proj(p.x + (s - 1) / 2, p.y + (s - 1) / 2)
      const sp = SPRITES[b.id]
      top = Math.min(top, sp ? cy - sp.oy - 3 * STEP - 4 : cy - (b.h + 36) * s - 3 * STEP)
    }
    return { x0, x1, top, bottom }
  }
  const [boite] = useState(calculerBoite)
  const { x0, x1, top, bottom } = boite
  const vbW = x1 - x0
  const vbH = bottom - top
  const cxV = (x0 + x1) / 2
  const cyV = (top + bottom) / 2
  // taille réelle de la carte à l'écran : la zone visible (en unités) peut dépasser le viewBox (plein écran)
  const [ecran, setEcran] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const el = svgRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      if (r.width && r.height) setEcran({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const kVue = ecran ? Math.min(ecran.w / vbW, ecran.h / vbH) : 1
  const visW = ecran ? ecran.w / kVue : vbW
  const visH = ecran ? ecran.h / kVue : vbH

  // ---------- caméra ----------
  const clampS = (s: number) => Math.min(14, Math.max(0.5, s))
  const zoomBy = (k: number, cx = cxV, cy = cyV) =>
    setCam((c) => {
      const s = clampS(c.s * k)
      const r = s / c.s
      return { s, x: cx - (cx - c.x) * r, y: cy - (cy - c.y) * r }
    })
  const toSvg = (clientX: number, clientY: number): P => {
    const el = svgRef.current
    if (!el) return [0, 0]
    const r = el.getBoundingClientRect()
    const k = Math.min(r.width / vbW, r.height / vbH)
    const ox = (r.width - vbW * k) / 2, oy = (r.height - vbH * k) / 2
    return [x0 + (clientX - r.left - ox) / k, top + (clientY - r.top - oy) / k]
  }
  const unitsPerPx = () => {
    const el = svgRef.current
    if (!el) return 1
    const r = el.getBoundingClientRect()
    return 1 / Math.min(r.width / vbW, r.height / vbH)
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

  // ---------- partie visible ----------
  const vue = {
    a: (cxV - visW / 2 - cam.x) / cam.s - TW,
    b: (cxV + visW / 2 - cam.x) / cam.s + TW,
    c: (cyV - visH / 2 - cam.y) / cam.s - TH * 2,
    d: (cyV + visH / 2 - cam.y) / cam.s + TH * 8,
  }
  const visible = (x: number, y: number) => x >= vue.a && x <= vue.b && y >= vue.c && y <= vue.d
  const hd = cam.s >= 2.2
  const solUrl = (nom: string) => `${import.meta.env.BASE_URL}img/ville/sol/${hd ? 'hd/' : ''}${nom}.webp`
  const image = (nom: string, cx: number, cy: number, agrandi = 1) => {
    const sp = SOLS[nom]
    if (!sp) return null
    // `agrandi` : léger recouvrement (cases de mer) pour qu'aucune jointure ne se voie
    return <image href={solUrl(nom)} x={cx - sp.ox * agrandi} y={cy - sp.oy * agrandi} width={sp.w * agrandi} height={sp.h * agrandi} preserveAspectRatio="none" />
  }

  // ---------- sol : mer, cases, falaises ----------
  type Elt = { k: number; node: ReactNode }
  const sol: Elt[] = []
  // cases de mer dans la partie visible (au-delà : la couleur de fond de la carte)
  {
    const inv = (sx: number, sy: number): P => [(sx / (TW / 2) + sy / (TH / 2)) / 2, (sy / (TH / 2) - sx / (TW / 2)) / 2]
    const coins = [inv(vue.a, vue.c), inv(vue.b, vue.c), inv(vue.a, vue.d), inv(vue.b, vue.d)]
    const xa = Math.floor(Math.min(...coins.map((c) => c[0]))) - 1, xb = Math.ceil(Math.max(...coins.map((c) => c[0]))) + 1
    const ya = Math.floor(Math.min(...coins.map((c) => c[1]))) - 1, yb = Math.ceil(Math.max(...coins.map((c) => c[1]))) + 1
    if ((xb - xa) * (yb - ya) < 4000) {
      for (let y = ya; y <= yb; y++)
        for (let x = xa; x <= xb; x++) {
          if (isLand(x, y)) continue
          const [cx, cy] = proj(x, y)
          if (!visible(cx, cy)) continue
          sol.push({ k: x + y - 0.002, node: <g key={`m${x},${y}`}>{image('mer', cx, cy - MER * STEP, 1.04)}</g> })
        }
    }
  }
  for (const [x, y] of cases) {
    const [cx, cy0] = proj(x, y)
    if (!visible(cx, cy0)) continue
    const e = elev(x, y)
    const cy = cy0 - e * STEP
    const hD = Math.min(4, e - Math.min(e, elev(x + 1, y))) // face droite (vers +x) : jusqu'à la case voisine ou la mer
    const hG = Math.min(4, e - Math.min(e, elev(x, y + 1))) // face gauche (vers +y)
    const herbe = (x * 7 + y * 13) % 3 === 0 ? 'herbe2' : 'herbe'
    sol.push({
      k: x + y,
      node: (
        <g key={`t${x},${y}`} onClick={tap(onTile ? () => onTile(x, y) : undefined)} style={{ cursor: onTile ? 'pointer' : undefined }}>
          {hG > 0 && image(`falaise-g-${hG}`, cx, cy)}
          {hD > 0 && image(`falaise-d-${hD}`, cx, cy)}
          {image(herbe, cx, cy)}
          {valid?.has(`${x},${y}`) && (
            <polygon
              points={`${cx - TW / 2},${cy} ${cx},${cy + TH / 2} ${cx + TW / 2},${cy} ${cx},${cy - TH / 2}`}
              fill="#ffffff"
              fillOpacity={0.45}
              stroke="#5b6cff"
              strokeWidth={1.4}
              strokeDasharray="3 2"
            />
          )}
        </g>
      ),
    })
  }
  // emplacements où l'on peut ajouter une case (sur la mer, au bord de l'île)
  for (const k of candidats) {
    const [x, y] = k.split(',').map(Number)
    const [cx, cy0] = proj(x, y)
    const cy = cy0 - MER * STEP
    if (!visible(cx, cy)) continue
    sol.push({
      k: x + y + 0.001,
      node: (
        <g key={`a${k}`} onClick={tap(onAddCase ? () => onAddCase(x, y) : undefined)} style={{ cursor: 'pointer' }}>
          <polygon points={`${cx - TW / 2},${cy} ${cx},${cy + TH / 2} ${cx + TW / 2},${cy} ${cx},${cy - TH / 2}`} fill="#7ed957" fillOpacity={0.3} stroke="#ffffff" strokeWidth={1.2} strokeDasharray="3 2" />
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill="#ffffff">+</text>
        </g>
      ),
    })
  }

  // ---------- bâtiments ----------
  const items = useMemo(() => {
    return city.placed
      .map((p) => {
        const b = buildingById(p.id)
        if (!b) return null
        const s = sizeOf(b)
        let e = 0
        for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) e = Math.max(e, elev(p.x + dx, p.y + dy))
        return { p, b, s, e, depth: p.x + p.y + 2 * (s - 1) }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.placed, city.elevation, land])

  // cadrage de départ : la partie construite (ou toute l'île si elle est vide)
  const cadrer = () => {
    if (!items.length) return { s: 1, x: 0, y: 0 }
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity
    for (const it of items) {
      const [cx, cy0] = proj(it.p.x + (it.s - 1) / 2, it.p.y + (it.s - 1) / 2)
      const cy = cy0 - it.e * STEP
      const sp = SPRITES[it.b.id]
      const w = sp ? sp.w : TW * it.s, h = sp ? sp.h : 60 * it.s
      const ox = sp ? sp.ox : w / 2, oy = sp ? sp.oy : h - TH
      a = Math.min(a, cx - ox); b = Math.max(b, cx - ox + w)
      c = Math.min(c, cy - oy); d = Math.max(d, cy - oy + h)
    }
    const bw = Math.max(b - a + 2 * TW, 3 * TW), bh = Math.max(d - c + 2 * TW, 3 * TH)
    const sc = clampS(Math.min(visW / bw, visH / bh))
    const mx = (a + b) / 2, my = (c + d) / 2
    return { s: sc, x: cxV - mx * sc, y: cyV - my * sc }
  }
  const dejaCadre = useRef(false)
  useLayoutEffect(() => {
    if (dejaCadre.current) return
    dejaCadre.current = true
    setCam(cadrer())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // en passant en plein écran (ou en le quittant), on recadre dès que la nouvelle taille est connue
  const pleinPrec = useRef(plein)
  const aRecadrer = useRef(true) // aussi au premier affichage, une fois la taille réelle mesurée
  if (pleinPrec.current !== plein) {
    pleinPrec.current = plein
    aRecadrer.current = true
  }
  useEffect(() => {
    if (!ecran || !aRecadrer.current) return
    aRecadrer.current = false
    setCam(cadrer())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecran])

  const bats: Elt[] = items.map((it) => {
    const [cx, cy] = proj(it.p.x + (it.s - 1) / 2, it.p.y + (it.s - 1) / 2)
    const isSel = it.p.uid === selected
    const moving = it.p.uid === movingUid
    const sp = SPRITES[it.b.id]
    const h = it.s / 2
    const contour = `${-TW * h},0 0,${TH * h} ${TW * h},0 0,${-TH * h}`
    return {
      k: it.depth + 0.0005,
      node: (
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
          {sp ? (
            <>
              <image href={spriteUrl(it.b.id, it.p.flip, hd ? 'hd' : 'normal')} x={-sp.ox} y={-sp.oy} width={sp.w} height={sp.h} preserveAspectRatio="none" />
              {isSel && <polygon points={contour} fill="#ffe066" fillOpacity={0.28} stroke="#f2994a" strokeWidth={2 / Math.sqrt(cam.s)} style={{ pointerEvents: 'none' }} />}
            </>
          ) : (
            <>
              {isSel && <polygon points={contour} fill="#ffe066" stroke="#f2994a" strokeWidth={2} />}
              <g transform={it.s > 1 ? `scale(${it.s})` : undefined}>
                <BuildingSprite b={it.b} flip={it.p.flip} />
              </g>
            </>
          )}
        </g>
      ),
    }
  })

  // ordre d'affichage : du fond vers l'avant (sol d'abord à profondeur égale)
  const tout = [...sol, ...bats].sort((a, b) => a.k - b.k)

  return (
    <div className={`city-map ${plein ? 'plein' : ''} ${className ?? ''}`} style={{ background: COULEUR_MER }}>
      <svg
        ref={svgRef}
        className="city-svg"
        viewBox={`${x0} ${top} ${vbW} ${vbH}`}
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
        <rect x={x0} y={top} width={vbW} height={vbH} fill="transparent" />
        <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.s})`}>{tout.map((e) => e.node)}</g>
      </svg>
      {!readOnly && (
        <div className="map-controls">
          <button type="button" className="round" aria-label="Recentrer" onClick={() => setCam(cadrer())}>
            ⌖
          </button>
          {controle}
        </div>
      )}
    </div>
  )
}
