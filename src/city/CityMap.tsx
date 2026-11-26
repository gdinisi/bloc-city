import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CityState } from './economy'
import { cheminOf, landCandidates, landOf } from './economy'
import { buildingById, sizeOf } from './buildings'
import { BuildingSprite, TH, TW, spriteUrl } from './iso'
import { SOLS, SPRITES } from './sprites'

/*
 * Carte isométrique de la ville (rendus Blender : sols, chemins, falaises, bâtiments).
 * - l'île est un ensemble libre de cases (on peut en ajouter / enlever une par une)
 * - les cases sont séparées par des chemins (pavés par défaut, texture peinte par le joueur),
 *   avec un carrefour à chaque croisement ; le bord de l'île est un chemin qui fait falaise
 * - relief : 0 à 3 marches par case ; parois rocheuses jusqu'au niveau du chemin voisin
 * - caméra : glisser pour se déplacer, pincer pour zoomer (×0,5 à ×14, molette sur ordinateur) ;
 *   au départ, elle cadre la partie construite. Seule la partie visible est dessinée.
 */

type P = [number, number]
const STEP = 7 // hauteur d'une marche de relief (unités de la carte)
const F = 1.2 // pas de la grille, en cases : une case + un chemin (0,2 case)
const RUE = F - 1
const SOCLE = 12 // épaisseur du bord de l'île
const ROCHE_G = '#7d6a57'
const ROCHE_D = '#9a8670'
const ROCHE_TRAIT = '#5a4a3b'

interface Props {
  city: CityState
  /** Carte figée : pas de caméra ni de contrôles */
  readOnly?: boolean
  onTile?: (x: number, y: number) => void
  onBuilding?: (uid: string) => void
  /** Peinture des chemins : clé "h:x,y" / "v:x,y" */
  onPath?: (key: string) => void
  /** Ajout de cases : emplacements libres à côté de l'île */
  onAddCase?: (x: number, y: number) => void
  selected?: string | null
  /** Cases à mettre en surbrillance (pose / déplacement) */
  valid?: Set<string>
  /** Bâtiments transparents (édition du sol, du relief ou du terrain) */
  ghost?: boolean
  movingUid?: string | null
  className?: string
  /** Affichage plein écran (la carte remplit son conteneur) */
  plein?: boolean
  /** Bouton supplémentaire dans les contrôles (ex. plein écran) */
  controle?: ReactNode
}

export function CityMap({ city, readOnly, onTile, onBuilding, onPath, onAddCase, selected, valid, ghost, movingUid, className, plein, controle }: Props) {
  const land = useMemo(() => landOf(city), [city])
  const candidats = useMemo(() => (onAddCase ? landCandidates(city) : []), [city, onAddCase])
  const [cam, setCam] = useState({ s: 1, x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, P>())
  const gesture = useRef<{ dist: number; s: number; moved: boolean }>({ dist: 0, s: 1, moved: false })

  // ---------- géométrie ----------
  const projC = (u: number, v: number): P => [((u - v) * TW) / 2, ((u + v) * TH) / 2]
  const isLand = (x: number, y: number) => land.has(`${x},${y}`)
  const elev = (x: number, y: number) => (isLand(x, y) ? (city.elevation[`${x},${y}`] ?? 0) : 0)
  const cases = useMemo(() => [...land].map((k) => k.split(',').map(Number) as P), [land])

  // ---------- cadrage (boîte englobante de l'île et des bâtiments) ----------
  const boite = useMemo(() => {
    const pts = [...cases, ...candidats.map((k) => k.split(',').map(Number) as P)]
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity
    for (const [x, y] of pts) {
      a0 = Math.min(a0, (x - y) * F); a1 = Math.max(a1, (x - y) * F)
      b0 = Math.min(b0, (x + y) * F); b1 = Math.max(b1, (x + y) * F)
    }
    const m = 0.5 + RUE
    const x0 = (a0 * TW) / 2 - m * TW - 8
    const x1 = (a1 * TW) / 2 + m * TW + 8
    let top = (b0 * TH) / 2 - m * TH - 40
    const bottom = (b1 * TH) / 2 + m * TH + 3 * STEP + SOCLE + 16
    for (const p of city.placed) {
      const b = buildingById(p.id)
      if (!b) continue
      const s = sizeOf(b)
      const [, cy] = projC((p.x + (s - 1) / 2) * F, (p.y + (s - 1) / 2) * F)
      const sp = SPRITES[b.id]
      top = Math.min(top, sp ? cy - sp.oy - 3 * STEP - 4 : cy - (b.h + 36) * s - 3 * STEP)
    }
    return { x0, x1, top, bottom }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases, candidats, city.placed])
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
    // preserveAspectRatio « meet » : le viewBox est centré dans l'élément
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
    d: (cyV + visH / 2 - cam.y) / cam.s + TH * 6,
  }
  const visible = (x: number, y: number) => x >= vue.a && x <= vue.b && y >= vue.c && y <= vue.d
  const hd = cam.s >= 2.2
  const solUrl = (nom: string) => `${import.meta.env.BASE_URL}img/ville/sol/${hd ? 'hd/' : ''}${nom}.webp`
  const image = (nom: string, cx: number, cy: number) => {
    const sp = SOLS[nom]
    if (!sp) return null
    return <image href={solUrl(nom)} x={cx - sp.ox} y={cy - sp.oy} width={sp.w} height={sp.h} preserveAspectRatio="none" />
  }
  /** Faces avant (vers +u et +v) d'un élément plat centré en (u, v), de demi-étendues (hu, hv), élevé de L px */
  const faces = (u: number, v: number, hu: number, hv: number, L: number, hU: number, hV: number, key: string) => {
    const out: ReactNode[] = []
    const pt = (a: number, b: number, dz: number) => {
      const [sx, sy] = projC(a, b)
      return `${sx},${sy - L + dz}`
    }
    if (hV > 0)
      out.push(<polygon key={`${key}fv`} points={[pt(u - hu, v + hv, 0), pt(u + hu, v + hv, 0), pt(u + hu, v + hv, hV), pt(u - hu, v + hv, hV)].join(' ')} fill={ROCHE_G} stroke={ROCHE_TRAIT} strokeWidth={0.5} />)
    if (hU > 0)
      out.push(<polygon key={`${key}fu`} points={[pt(u + hu, v - hv, 0), pt(u + hu, v + hv, 0), pt(u + hu, v + hv, hU), pt(u + hu, v - hv, hU)].join(' ')} fill={ROCHE_D} stroke={ROCHE_TRAIT} strokeWidth={0.5} />)
    return out
  }

  // ---------- éléments du sol : cases, chemins, carrefours ----------
  type Elt = { k: number; node: ReactNode }
  const sol: Elt[] = []
  const occupant = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of city.placed) {
      const b = buildingById(p.id)
      const s = b ? sizeOf(b) : 1
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) m.set(`${p.x + dx},${p.y + dy}`, p.uid)
    }
    return m
  }, [city.placed])
  /** Deux cases du même grand bâtiment : le chemin entre elles est recouvert par son rendu */
  const memeBatiment = (cells: P[]) => {
    const u = cells.map(([x, y]) => occupant.get(`${x},${y}`))
    return u[0] !== undefined && u.every((v) => v === u[0])
  }
  const niveau = (cells: P[]) => Math.min(...cells.map(([x, y]) => elev(x, y)))
  const existeSeg = (cells: P[]) => cells.some(([x, y]) => isLand(x, y))

  // chemins (segments) : "v:x,y" entre (x,y) et (x+1,y) ; "h:x,y" entre (x,y) et (x,y+1)
  const segInfo = (cle: string): { cells: P[]; existe: boolean; L: number; type: string } => {
    const [t, rest] = cle.split(':')
    const [x, y] = rest.split(',').map(Number)
    const cells: P[] = t === 'v' ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]]
    return { cells, existe: existeSeg(cells), L: niveau(cells), type: cheminOf(city, cle) }
  }
  const segs = new Set<string>()
  const croix = new Set<string>()
  for (const [x, y] of cases) {
    for (const k of [`v:${x},${y}`, `v:${x - 1},${y}`, `h:${x},${y}`, `h:${x},${y - 1}`]) segs.add(k)
    for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]] as P[]) croix.add(`${x + dx},${y + dy}`)
  }
  for (const cle of segs) {
    const { cells, L, type } = segInfo(cle)
    const [t, rest] = cle.split(':')
    const [x, y] = rest.split(',').map(Number)
    const u = t === 'v' ? x * F + F / 2 : x * F
    const v = t === 'v' ? y * F : y * F + F / 2
    const [cx, cy] = projC(u, v)
    if (!visible(cx, cy) || memeBatiment(cells)) continue
    const Lpx = L * STEP
    // devant : la case suivante (+u pour v, +v pour h) et le carrefour (+v pour v, +u pour h)
    const caseDevant: P = t === 'v' ? [x + 1, y] : [x, y + 1]
    const devantCase = isLand(...caseDevant) ? Math.max(0, L - elev(...caseDevant)) * STEP : Lpx + SOCLE
    const cr: P[] = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]
    const devantCroix = Math.max(0, L - niveau(cr)) * STEP
    const [hu, hv] = t === 'v' ? [RUE / 2, 0.5] : [0.5, RUE / 2]
    const hU = t === 'v' ? devantCase : devantCroix
    const hV = t === 'v' ? devantCroix : devantCase
    const nom = `${t === 'v' ? 'route-y' : 'route-x'}-${type}`
    sol.push({
      k: u + v,
      node: (
        <g key={`s${cle}`} onClick={tap(onPath ? () => onPath(cle) : undefined)} style={{ cursor: onPath ? 'pointer' : undefined }}>
          {faces(u, v, hu, hv, Lpx, hU, hV, cle)}
          {image(nom, cx, cy - Lpx)}
          {onPath && <polygon points={[projC(u - hu, v - hv), projC(u + hu, v - hv), projC(u + hu, v + hv), projC(u - hu, v + hv)].map(([a, b]) => `${a},${b - Lpx}`).join(' ')} fill="#ffffff" fillOpacity={0.18} stroke="#5b6cff" strokeWidth={0.6} strokeDasharray="2 2" />}
        </g>
      ),
    })
  }
  for (const k of croix) {
    const [x, y] = k.split(',').map(Number)
    const cells: P[] = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]
    const u = x * F + F / 2
    const v = y * F + F / 2
    const [cx, cy] = projC(u, v)
    if (!visible(cx, cy) || memeBatiment(cells)) continue
    // type : celui des chemins voisins s'ils sont tous pareils, sinon pavés
    const voisins = [`v:${x},${y}`, `v:${x},${y + 1}`, `h:${x},${y}`, `h:${x + 1},${y}`].map(segInfo).filter((s) => s.existe).map((s) => s.type)
    const type = voisins.length && voisins.every((t) => t === voisins[0]) ? voisins[0] : 'paves'
    const L = niveau(cells)
    const Lpx = L * STEP
    const segU = segInfo(`h:${x + 1},${y}`)
    const segV = segInfo(`v:${x},${y + 1}`)
    const hU = segU.existe ? Math.max(0, L - segU.L) * STEP : Lpx + SOCLE
    const hV = segV.existe ? Math.max(0, L - segV.L) * STEP : Lpx + SOCLE
    sol.push({
      k: u + v,
      node: (
        <g key={`c${k}`}>
          {faces(u, v, RUE / 2, RUE / 2, Lpx, hU, hV, `c${k}`)}
          {image(`carrefour-${type}`, cx, cy - Lpx)}
        </g>
      ),
    })
  }
  // cases de l'île (herbe) + parois rocheuses quand elles dominent le chemin voisin
  for (const [x, y] of cases) {
    const u = x * F, v = y * F
    const [cx, cy0] = projC(u, v)
    if (!visible(cx, cy0)) continue
    const e = elev(x, y)
    const cy = cy0 - e * STEP
    const hD = e - Math.min(e, elev(x + 1, y)) // face droite (vers +x)
    const hG = e - Math.min(e, elev(x, y + 1)) // face gauche (vers +y)
    const herbe = (x * 7 + y * 13) % 3 === 0 ? 'herbe2' : 'herbe'
    sol.push({
      k: u + v,
      node: (
        <g key={`t${x},${y}`} onClick={tap(onTile ? () => onTile(x, y) : undefined)} style={{ cursor: onTile ? 'pointer' : undefined }}>
          {hG > 0 && image(`falaise-g-${Math.min(3, hG)}`, cx, cy)}
          {hD > 0 && image(`falaise-d-${Math.min(3, hD)}`, cx, cy)}
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
  // emplacements où l'on peut ajouter une case
  for (const k of candidats) {
    const [x, y] = k.split(',').map(Number)
    const [cx, cy] = projC(x * F, y * F)
    if (!visible(cx, cy)) continue
    sol.push({
      k: (x + y) * F + 0.001,
      node: (
        <g key={`a${k}`} onClick={tap(onAddCase ? () => onAddCase(x, y) : undefined)} style={{ cursor: 'pointer' }}>
          <polygon points={`${cx - TW / 2},${cy} ${cx},${cy + TH / 2} ${cx + TW / 2},${cy} ${cx},${cy - TH / 2}`} fill="#7ed957" fillOpacity={0.25} stroke="#ffffff" strokeWidth={1.2} strokeDasharray="3 2" />
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
        return { p, b, s, vx: p.x, vy: p.y, e, depth: (p.x + p.y + 2 * (s - 1)) * F }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.placed, city.elevation, land])
  /** Demi-largeur (en cases) de l'emprise d'un bâtiment de s cases, chemins internes compris */
  const emp = (s: number) => ((s - 1) * F + 1) / 2

  // cadrage de départ : la partie construite (ou toute l'île si elle est vide)
  const cadrer = () => {
    if (!items.length) return { s: 1, x: 0, y: 0 }
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity
    for (const it of items) {
      const [cx, cy0] = projC((it.vx + (it.s - 1) / 2) * F, (it.vy + (it.s - 1) / 2) * F)
      const cy = cy0 - it.e * STEP
      const sp = SPRITES[it.b.id]
      const w = sp ? sp.w : TW * it.s, h = sp ? sp.h : 60 * it.s
      const ox = sp ? sp.ox : w / 2, oy = sp ? sp.oy : h - TH
      a = Math.min(a, cx - ox); b = Math.max(b, cx - ox + w)
      c = Math.min(c, cy - oy); d = Math.max(d, cy - oy + h)
    }
    const m = TW * F
    const bw = Math.max(b - a + 2 * m, 3 * TW * F), bh = Math.max(d - c + 2 * m, 3 * TH * F)
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
    const [cx, cy] = projC((it.vx + (it.s - 1) / 2) * F, (it.vy + (it.s - 1) / 2) * F)
    const isSel = it.p.uid === selected
    const moving = it.p.uid === movingUid
    const sp = SPRITES[it.b.id]
    const contour = `${-TW * emp(it.s)},0 0,${TH * emp(it.s)} ${TW * emp(it.s)},0 0,${-TH * emp(it.s)}`
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
    <div className={`city-map ${plein ? 'plein' : ''} ${className ?? ''}`}>
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
