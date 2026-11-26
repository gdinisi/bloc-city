import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CityState } from './economy'
import { landCandidates, landOf } from './economy'
import { buildingById, sizeOf } from './buildings'
import { BuildingSprite, TH, TW, spriteUrl } from './iso'
import { SOLS, SPRITES } from './sprites'
import { NUIT_BATS, NUIT_LUM, NUIT_SOLS } from './sprites-nuit'

/*
 * Carte isométrique de la ville (rendus Blender : sols, falaises, mer, bâtiments).
 * - l'île est un ensemble libre de cases côte à côte (on peut en ajouter / enlever une par une)
 * - le sol non surélevé est au niveau de la mer ; une rangée de cases de rivage (plage) fait la liaison
 *   entre l'île et la mer, en tenant compte des angles et des trous d'une case
 * - en hauteur, des falaises rocheuses jusqu'au niveau de la case voisine (ou du rivage)
 * - la mer est un motif continu (texture périodique) sous toute la carte : visible à tous les zooms
 * - les images ne captent pas le toucher : chaque case a une zone en losange exacte (pose, terrain, relief)
 * - caméra : glisser pour se déplacer, pincer pour zoomer (×0,5 à ×14, molette sur ordinateur) ;
 *   au départ, elle cadre la partie construite. Seule la partie visible est dessinée.
 */

type P = [number, number]
const STEP = 7 // hauteur d'une marche de relief (unités de la carte)
const MER = 0 // niveau de la mer, en marches (= le sol non surélevé)
/** Couleur de la mer au-delà des cases d'eau dessinées */
export const COULEUR_MER = '#1d5f8c'
const COULEUR_MER_NUIT = '#0b2033'

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
  /** Ville de nuit (aperçu) : rendus de nuit, couche de lumière en mode écran */
  nuit?: boolean
}

export function CityMap({ city, readOnly, onTile, onBuilding, onAddCase, selected, valid, ghost, movingUid, className, plein, controle, nuit }: Props) {
  const land = useMemo(() => landOf(city), [city])
  const candidats = useMemo(() => (onAddCase ? landCandidates(city) : []), [city, onAddCase])
  const [cam, setCam] = useState({ s: 1, x: 0, y: 0 })
  const idMer = `mer${useId().replace(/:/g, '')}`
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
      camBougee.current = true
      const u = unitsPerPx()
      setCam((c) => ({ ...c, x: c.x + dx * u, y: c.y + dy * u }))
    } else if (pointers.current.size === 2) {
      gesture.current.moved = true
      camBougee.current = true
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
    camBougee.current = true
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
  const solUrl = (nom: string) =>
    nuit && NUIT_SOLS[nom]
      ? `${import.meta.env.BASE_URL}img/ville-nuit/sol/${hd ? 'hd/' : ''}${nom}.webp?v=${NUIT_SOLS[nom]}`
      : `${import.meta.env.BASE_URL}img/ville/sol/${hd ? 'hd/' : ''}${nom}.webp?v=${SOLS[nom]?.v ?? ''}`
  /** Image de nuit d'un bâtiment (ou de sa couche de lumière / de sa silhouette), si elle existe */
  const nuitUrl = (id: string, flip: boolean, suffixe = '') => {
    const nom = `${id}-${flip ? 'g' : 'd'}`
    if (!nuit || !NUIT_BATS[nom]) return null
    const v = suffixe === '-lum' ? NUIT_LUM[nom]?.v : NUIT_BATS[nom]
    return `${import.meta.env.BASE_URL}img/ville-nuit/${hd ? 'hd/' : ''}${nom}${suffixe}.webp?v=${v}`
  }
  const image = (nom: string, cx: number, cy: number, agrandi = 1) => {
    const sp = SOLS[nom]
    if (!sp) return null
    // `agrandi` : léger recouvrement (cases de mer) pour qu'aucune jointure ne se voie
    return <image href={solUrl(nom)} x={cx - sp.ox * agrandi} y={cy - sp.oy * agrandi} width={sp.w * agrandi} height={sp.h * agrandi} preserveAspectRatio="none" style={{ pointerEvents: 'none' }} />
  }

  // ---------- sol : mer, cases, falaises ----------
  type Elt = { k: number; node: ReactNode }
  const sol: Elt[] = []
  // rivage : chaque case d'eau voisine de l'île (diagonales comprises) reçoit une plage
  // masque : +x, +y, -x, -y, puis coins (+x+y), (-x+y), (-x-y), (+x-y) — un coin ne compte que si ses deux côtés sont de l'eau
  {
    const V: P[] = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]]
    const vus = new Set<string>()
    for (const [lx, ly] of cases)
      for (const [dx, dy] of V) {
        const x = lx + dx, y = ly + dy
        const k = `${x},${y}`
        if (vus.has(k) || isLand(x, y)) continue
        vus.add(k)
        const [cx, cy] = proj(x, y)
        if (!visible(cx, cy)) continue
        const b = V.map(([ax, ay]) => (isLand(x + ax, y + ay) ? '1' : '0'))
        for (const [c, i, j] of [[4, 0, 1], [5, 2, 1], [6, 2, 3], [7, 0, 3]]) if (b[i] === '1' || b[j] === '1') b[c] = '0'
        sol.push({ k: x + y, node: <g key={`r${k}`}>{image(`rivage-${b.join('')}`, cx, cy - MER * STEP)}</g> })
      }
  }
  for (const [x, y] of cases) {
    const [cx, cy0] = proj(x, y)
    if (!visible(cx, cy0)) continue
    const e = elev(x, y)
    const cy = cy0 - e * STEP
    // falaises jusqu'à la case voisine (ou jusqu'au rivage, au niveau de la mer)
    const hD = Math.min(4, e - Math.min(e, elev(x + 1, y))) // face droite (vers +x)
    const hG = Math.min(4, e - Math.min(e, elev(x, y + 1))) // face gauche (vers +y)
    const dessus = (x * 7 + y * 13) % 3 === 0 ? 'herbe2' : 'herbe'
    const falaise = hG > 0 && hD > 0 ? `falaise-c-${hG}-${hD}` : hG > 0 ? `falaise-g-${hG}` : hD > 0 ? `falaise-d-${hD}` : null
    // pied de la falaise (éboulis, herbes hautes) : au niveau du sol d'en bas, dessiné juste après lui
    // (avant les bâtiments de cette rangée) pour casser la ligne droite entre la roche et le sol
    if (hG > 0) sol.push({ k: x + y + 1.0002, node: <g key={`pg${x},${y}`}>{image('pied-g', cx, cy + hG * STEP)}</g> })
    if (hD > 0) sol.push({ k: x + y + 1.0002, node: <g key={`pd${x},${y}`}>{image('pied-d', cx, cy + hD * STEP)}</g> })
    sol.push({
      k: x + y,
      node: (
        <g key={`t${x},${y}`} onClick={tap(onTile ? () => onTile(x, y) : undefined)} style={{ cursor: onTile ? 'pointer' : undefined }}>
          {image(dessus, cx, cy)}
          {/* la falaise par-dessus l'herbe : son bord herbeux arrondi recouvre l'arête de la case */}
          {falaise && image(falaise, cx, cy)}
          {/* zone de toucher exacte de la case */}
          <polygon points={`${cx - TW / 2},${cy} ${cx},${cy + TH / 2} ${cx + TW / 2},${cy} ${cx},${cy - TH / 2}`} fill="transparent" />
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

  // cadrage : toute l'île (cases réelles, pas le cadre figé du premier affichage), centrée à l'écran
  const cadrer = () => {
    if (!cases.length) return { s: 1, x: 0, y: 0 }
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity
    for (const [x, y] of cases) {
      const [cx, cy0] = proj(x, y)
      const cy = cy0 - elev(x, y) * STEP
      a = Math.min(a, cx - TW / 2); b = Math.max(b, cx + TW / 2)
      c = Math.min(c, cy - TH / 2); d = Math.max(d, cy0 + TH / 2)
    }
    // le haut des grands bâtiments compte aussi (sinon une tour sortirait du cadre)
    for (const it of items) {
      const [, cy0] = proj(it.p.x + (it.s - 1) / 2, it.p.y + (it.s - 1) / 2)
      const sp = SPRITES[it.b.id]
      c = Math.min(c, cy0 - it.e * STEP - (sp ? sp.oy : 60 * it.s))
    }
    // un peu de plage et de mer autour
    a -= TW * 0.6; b += TW * 0.6; c -= TH * 0.6; d += TH * 1.2
    const sc = clampS(Math.min(visW / (b - a), visH / (d - c)))
    const mx = (a + b) / 2, my = (c + d) / 2
    return { s: sc, x: cxV - mx * sc, y: cyV - my * sc }
  }
  /** La caméra a-t-elle été bougée à la main depuis le dernier cadrage ? */
  const camBougee = useRef(false)
  const recadrer = () => {
    camBougee.current = false
    setCam(cadrer())
  }
  const dejaCadre = useRef(false)
  useLayoutEffect(() => {
    if (dejaCadre.current) return
    dejaCadre.current = true
    recadrer()
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
    recadrer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecran])
  // l'île arrive (synchro au démarrage) ou change de forme : on recadre, sauf si l'on est en train de la
  // modifier ou si la carte a déjà été bougée à la main
  const empreinteIle = useMemo(() => [...land].sort().join(';'), [land])
  const ilePrec = useRef(empreinteIle)
  useEffect(() => {
    if (ilePrec.current === empreinteIle) return
    ilePrec.current = empreinteIle
    if (ghost || onAddCase || camBougee.current) return
    recadrer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empreinteIle])

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
              <image href={nuitUrl(it.b.id, it.p.flip) ?? spriteUrl(it.b.id, it.p.flip, hd ? 'hd' : 'normal')} x={-sp.ox} y={-sp.oy} width={sp.w} height={sp.h} preserveAspectRatio="none" style={{ pointerEvents: 'none' }} />
              {/* zone de toucher : l'emprise au sol prolongée vers le haut (pas le rectangle transparent de l'image) */}
              <polygon points={`${-TW * h},0 0,${TH * h} ${TW * h},0 ${TW * h},${-(sp.oy - TH * h) * 0.85} 0,${-(sp.oy - TH * h) * 0.85 - TH * h} ${-TW * h},${-(sp.oy - TH * h) * 0.85}`} fill="transparent" />
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

  // ---------- nuit : couche de lumière ----------
  // Chaque bâtiment a une couche de lumière (halos qui débordent sur les cases voisines, faisceau du phare),
  // posée en mode « écran » par-dessus la ville. Les silhouettes des volumes (maisons, arbres, lampadaires)
  // la masquent : la lumière éclaire le sol mais ne passe jamais devant un bâtiment ou un objet.
  const idMasque = `${idMer}-masque`
  const lumieres = nuit
    ? items.flatMap((it) => {
        const nom = `${it.b.id}-${it.p.flip ? 'g' : 'd'}`
        const lu = NUIT_LUM[nom]
        const sp = SPRITES[it.b.id]
        if (!lu || !sp || !NUIT_BATS[nom]) return []
        const [cx, cy] = proj(it.p.x + (it.s - 1) / 2, it.p.y + (it.s - 1) / 2)
        const y = cy - it.e * STEP
        // seulement ce qui touche la partie visible (le faisceau du phare porte loin)
        if (cx - lu.ox > vue.b || cx - lu.ox + lu.w < vue.a || y - lu.oy > vue.d || y - lu.oy + lu.h < vue.c - 4 * TW) return []
        return [
          {
            lum: <image key={`l${it.p.uid}`} href={nuitUrl(it.b.id, it.p.flip, '-lum')!} x={cx - lu.ox} y={y - lu.oy} width={lu.w} height={lu.h} preserveAspectRatio="none" style={{ mixBlendMode: 'screen' }} />,
            vol: <image key={`v${it.p.uid}`} href={nuitUrl(it.b.id, it.p.flip, '-vol')!} x={cx - sp.ox} y={y - sp.oy} width={sp.w} height={sp.h} preserveAspectRatio="none" />,
          },
        ]
      })
    : []

  return (
    <div className={`city-map ${plein ? 'plein' : ''} ${className ?? ''}`} style={{ background: nuit ? COULEUR_MER_NUIT : COULEUR_MER }}>
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
        <defs>
          {/* mer : une cellule (TW × TH) d'une texture périodique, répétée à l'infini, une marche sous le sol */}
          <pattern id={idMer} patternUnits="userSpaceOnUse" x={-TW / 2} y={-TH / 2 - MER * STEP} width={TW} height={TH}>
            <image href={solUrl('mer-motif')} x={0} y={0} width={TW} height={TH} preserveAspectRatio="none" />
          </pattern>
        </defs>
        <rect x={x0} y={top} width={vbW} height={vbH} fill="transparent" />
        {lumieres.length > 0 && (
          <defs>
            <mask id={idMasque} maskUnits="userSpaceOnUse" x={vue.a - TW} y={vue.c - 4 * TW} width={vue.b - vue.a + 2 * TW} height={vue.d - vue.c + 8 * TW}>
              <rect x={vue.a - TW} y={vue.c - 4 * TW} width={vue.b - vue.a + 2 * TW} height={vue.d - vue.c + 8 * TW} fill="#ffffff" />
              {lumieres.map((l) => l.vol)}
            </mask>
          </defs>
        )}
        <g transform={`translate(${cam.x} ${cam.y}) scale(${cam.s})`}>
          <rect x={vue.a - TW} y={vue.c - TH} width={vue.b - vue.a + 2 * TW} height={vue.d - vue.c + 2 * TH} fill={`url(#${idMer})`} style={{ pointerEvents: 'none' }} />
          {tout.map((e) => e.node)}
          {lumieres.length > 0 && (
            <g mask={`url(#${idMasque})`} style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}>
              {lumieres.map((l) => l.lum)}
            </g>
          )}
        </g>
      </svg>
      {!readOnly && (
        <div className="map-controls">
          <button type="button" className="round" aria-label="Recentrer" onClick={recadrer}>
            ⌖
          </button>
          {controle}
        </div>
      )}
    </div>
  )
}
