import { useEffect, useMemo, useState } from 'react'
import type { CityState, Pack } from './economy'
import {
  canPlace,
  chestPack,
  chestReadyAt,
  fragmentsNeeded,
  gridOf,
  isFragmented,
  move,
  paint,
  place,
  population,
  rotate,
  sculpt,
  store,
  unlockedGrounds,
} from './economy'
import { BUILDINGS, CATS, CITY_LEVELS, GROUNDS, RARITIES, buildingById, cityLevel, gridSizeFor, nextGrowthLevel, nextLevelAt, sizeOf } from './buildings'
import { BuildingThumb, GroundTile } from './iso'
import { CityMap } from './CityMap'
import { PackOpening } from './PackOpening'
import { Shop } from './Shop'

interface Props {
  city: CityState
  onCity: (fn: (c: CityState) => CityState) => void
}

type Mode =
  | { type: 'idle' }
  | { type: 'place'; id: string }
  | { type: 'move'; uid: string }
  | { type: 'paint'; ground: string }
  | { type: 'relief'; delta: 1 | -1 }

export function useNow(every = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(t)
  }, [every])
  return now
}

export const formatWait = (ms: number) => {
  const m = Math.max(1, Math.floor(ms / 60000))
  const h = Math.floor(m / 60)
  return h > 0 ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`
}

export function CityScreen({ city, onCity }: Props) {
  const [mode, setMode] = useState<Mode>({ type: 'idle' })
  const [selected, setSelected] = useState<string | null>(null)
  const [opening, setOpening] = useState<Pack[] | null>(null)
  const [shop, setShop] = useState(false)
  const now = useNow()

  const pop = population(city)
  const level = cityLevel(pop)
  const grid = gridOf(city)
  const growAt = nextGrowthLevel(level)
  const nextAt = nextLevelAt(pop)
  const levelStart = CITY_LEVELS[level - 1] ?? 0
  const chestAt = chestReadyAt(city)
  const chestReady = now >= chestAt
  const inventory = Object.entries(city.inventory).filter(([, n]) => n > 0)
  const selectedP = city.placed.find((p) => p.uid === selected)
  const selectedB = selectedP ? buildingById(selectedP.id) : undefined
  const grounds = unlockedGrounds(city)
  const fragments = BUILDINGS.filter((b) => isFragmented(b) && (city.fragments[b.id] ?? 0) > 0)
  const editingGround = mode.type === 'paint' || mode.type === 'relief'

  /** Cases où l'on peut poser / déplacer le bâtiment en cours (coin du haut de son emprise) */
  const valid = useMemo(() => {
    const set = new Set<string>()
    const id = mode.type === 'place' ? mode.id : mode.type === 'move' ? city.placed.find((p) => p.uid === mode.uid)?.id : undefined
    if (!id) return set
    const except = mode.type === 'move' ? mode.uid : undefined
    for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) if (canPlace(city, id, x, y, except)) set.add(`${x},${y}`)
    return set
  }, [mode, city, grid])

  const onTile = (x: number, y: number) => {
    if (mode.type === 'paint') return onCity((c) => paint(c, x, y, mode.ground))
    if (mode.type === 'relief') return onCity((c) => sculpt(c, x, y, mode.delta))
    if (mode.type === 'place') {
      if (!valid.has(`${x},${y}`)) return
      onCity((c) => place(c, mode.id, x, y) ?? c)
      setMode({ type: 'idle' })
      return
    }
    if (mode.type === 'move') {
      if (!valid.has(`${x},${y}`)) return
      onCity((c) => move(c, mode.uid, x, y) ?? c)
      setMode({ type: 'idle' })
      return
    }
    const hit = city.placed.find((p) => {
      const s = sizeOf(buildingById(p.id)!)
      return x >= p.x && x < p.x + s && y >= p.y && y < p.y + s
    })
    setSelected(hit ? hit.uid : null)
  }

  const banner =
    mode.type === 'place'
      ? `Touche une case en surbrillance pour poser : ${buildingById(mode.id)?.name}${sizeOf(buildingById(mode.id)!) > 1 ? ' (2 × 2 cases, case du haut)' : ''}`
      : mode.type === 'move'
        ? 'Touche une case en surbrillance pour le déplacer'
        : null

  const toggleTool = (m: Mode) => {
    setSelected(null)
    setMode(mode.type === m.type ? { type: 'idle' } : m)
  }

  return (
    <div className="screen">
      <section className="card city-hud">
        <div className="city-stats">
          <div>
            <b>👥 {pop}</b>
            <span>habitants</span>
          </div>
          <div>
            <b>🏙️ {level}</b>
            <span>niveau</span>
          </div>
          <div>
            <b>🪙 {city.coins}</b>
            <span>pièces</span>
          </div>
          <div>
            <b>
              📖 {city.discovered.length}/{BUILDINGS.length}
            </b>
            <span>collection</span>
          </div>
        </div>
        {nextAt !== null && (
          <div className="bar small-bar" title={`Prochain niveau à ${nextAt} habitants`}>
            <div className="bar-fill" style={{ width: `${((pop - levelStart) / (nextAt - levelStart)) * 100}%` }} />
          </div>
        )}
        <p className="muted small-text">
          Carte {grid} × {grid}
          {growAt !== null ? ` · ${gridSizeFor(growAt)} × ${gridSizeFor(growAt)} au niveau ${growAt}` : ' · taille maximale'}
          {nextAt !== null ? ` · niveau ${level + 1} à ${nextAt} habitants` : ''}
        </p>
      </section>

      <div className="reward-row">
        <button type="button" className={`reward-btn packs ${city.packs.length ? 'on' : ''}`} disabled={!city.packs.length} onClick={() => setOpening(city.packs)}>
          <span className="reward-emoji">🎁</span>
          <span>
            <b>{city.packs.length ? `${city.packs.length} pack${city.packs.length > 1 ? 's' : ''} à ouvrir` : 'Aucun pack'}</b>
            <span>{city.packs.length ? 'Touche pour les ouvrir' : '1 pack par séance'}</span>
          </span>
        </button>
        <button type="button" className={`reward-btn chest ${chestReady ? 'on' : ''}`} disabled={!chestReady} onClick={() => setOpening([chestPack()])}>
          <span className="reward-emoji">🧰</span>
          <span>
            <b>{chestReady ? 'Coffre prêt !' : 'Coffre du jour'}</b>
            <span>{chestReady ? 'Gratuit, toutes les 6 h' : `Dans ${formatWait(chestAt - now)}`}</span>
          </span>
        </button>
      </div>

      <section className="card city-card">
        <div className="city-tools">
          <button type="button" className={`chip ${mode.type === 'paint' ? 'on' : ''}`} onClick={() => toggleTool({ type: 'paint', ground: 'route' })}>
            🖌️ Sol
          </button>
          <button type="button" className={`chip ${mode.type === 'relief' ? 'on' : ''}`} onClick={() => toggleTool({ type: 'relief', delta: 1 })}>
            ⛰️ Relief
          </button>
          {editingGround && (
            <button type="button" className="btn small" onClick={() => setMode({ type: 'idle' })}>
              Terminer
            </button>
          )}
        </div>

        {mode.type === 'paint' && (
          <>
            <div className="ground-palette">
              {GROUNDS.map((g) => {
                const ok = grounds.some((u) => u.id === g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    disabled={!ok}
                    className={`ground-chip ${mode.ground === g.id ? 'on' : ''}`}
                    onClick={() => setMode({ type: 'paint', ground: g.id })}
                    title={ok ? g.name : g.quest ? 'Débloqué par une quête' : `Débloqué au niveau ${g.level}`}
                  >
                    <svg viewBox="-21 -11 42 22" width={42} height={22} aria-hidden="true">
                      <GroundTile id={g.id === 'pont' ? 'planches' : g.id} cx={0} cy={0} alt={false} />
                    </svg>
                    <span>{ok ? g.name : g.quest ? '🔒 quête' : `🔒 niv. ${g.level}`}</span>
                  </button>
                )
              })}
            </div>
            <p className="muted small-text">
              Touche les cases à peindre. Les routes et les ponts se raccordent tout seuls à leurs voisins ; un pont se pose sur l'eau pour relier deux routes. « Herbe » efface.
            </p>
          </>
        )}

        {mode.type === 'relief' && (
          <>
            <div className="seg wide relief-seg">
              <button type="button" className={mode.delta === 1 ? 'on' : ''} onClick={() => setMode({ type: 'relief', delta: 1 })}>
                ⬆️ Monter
              </button>
              <button type="button" className={mode.delta === -1 ? 'on' : ''} onClick={() => setMode({ type: 'relief', delta: -1 })}>
                ⬇️ Creuser
              </button>
            </div>
            <p className="muted small-text">Touche une case pour la monter ou la creuser (3 marches maximum). Les bâtiments suivent le terrain.</p>
          </>
        )}

        {banner && (
          <div className="place-banner">
            <span>{banner}</span>
            <button type="button" className="btn small" onClick={() => setMode({ type: 'idle' })}>
              Annuler
            </button>
          </div>
        )}

        <CityMap
          city={city}
          onTile={onTile}
          onBuilding={(uid) => setSelected(selected === uid ? null : uid)}
          selected={selected}
          valid={mode.type === 'place' || mode.type === 'move' ? valid : undefined}
          ghost={editingGround}
          movingUid={mode.type === 'move' ? mode.uid : null}
        />
        <p className="muted small-text center map-hint">Glisse pour te déplacer · pince ou +/− pour zoomer · ⟳ pour tourner autour</p>
        {city.placed.length === 0 && mode.type === 'idle' && (
          <p className="muted small-text center">Ta ville est vide : ouvre tes packs puis pose tes bâtiments depuis l'inventaire.</p>
        )}
      </section>

      {selectedP && selectedB && mode.type === 'idle' && (
        <section className="card selected-card">
          <div className="selected-head">
            <BuildingThumb b={selectedB} size={52} />
            <div>
              <b>{selectedB.name}</b>
              <span className="rarity" style={{ color: RARITIES[selectedB.rarity].color }}>
                {RARITIES[selectedB.rarity].label} · +{RARITIES[selectedB.rarity].pop} habitants
                {sizeOf(selectedB) > 1 ? ' · 2 × 2 cases' : ''}
              </span>
            </div>
            <button type="button" className="round" aria-label="Fermer" onClick={() => setSelected(null)}>
              ✕
            </button>
          </div>
          <div className="selected-actions">
            <button type="button" className="btn small" onClick={() => onCity((c) => rotate(c, selectedP.uid))}>
              🔄 Tourner
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => {
                setMode({ type: 'move', uid: selectedP.uid })
                setSelected(null)
              }}
            >
              ✋ Déplacer
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => {
                onCity((c) => store(c, selectedP.uid))
                setSelected(null)
              }}
            >
              📦 Ranger
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <div className="day-head">
          <h2>Inventaire</h2>
          <button type="button" className="btn small" onClick={() => setShop(true)}>
            🛒 Boutique
          </button>
        </div>
        {inventory.length === 0 ? (
          <p className="muted empty">Rien à poser pour l'instant. Chaque séance te rapporte un pack de bâtiments.</p>
        ) : (
          <div className="inventory">
            {inventory.map(([id, n]) => {
              const b = buildingById(id)
              if (!b) return null
              const on = mode.type === 'place' && mode.id === id
              return (
                <button
                  key={id}
                  type="button"
                  className={`inv-item ${on ? 'on' : ''}`}
                  style={{ borderColor: RARITIES[b.rarity].color }}
                  onClick={() => {
                    setSelected(null)
                    setMode(on ? { type: 'idle' } : { type: 'place', id })
                  }}
                >
                  <BuildingThumb b={b} size={58} />
                  <span className="inv-name">{b.name}</span>
                  {sizeOf(b) > 1 && <span className="inv-size">2×2</span>}
                  {n > 1 && <span className="inv-count">×{n}</span>}
                </button>
              )
            })}
          </div>
        )}
        <p className="muted small-text">Touche un bâtiment puis une case en surbrillance pour le poser. Pas de construction sur l'eau ni sur les ponts.</p>
      </section>

      {fragments.length > 0 && (
        <section className="card">
          <h2>🧩 Fragments en cours</h2>
          <ul className="frag-list">
            {fragments.map((b) => {
              const have = city.fragments[b.id] ?? 0
              const need = fragmentsNeeded(b)
              return (
                <li key={b.id}>
                  <BuildingThumb b={b} size={40} dim />
                  <span className="frag-body">
                    <b>{b.name}</b>
                    <span className="quest-bar">
                      <i style={{ width: `${(have / need) * 100}%`, background: RARITIES[b.rarity].color }} />
                    </span>
                  </span>
                  <span className="frag-count" style={{ color: RARITIES[b.rarity].color }}>
                    {have}/{need}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="muted small-text">Les bâtiments épiques, légendaires et les merveilles s'assemblent à partir de fragments trouvés dans les packs, les coffres et les quêtes.</p>
        </section>
      )}

      <section className="card">
        <h2>Collection</h2>
        <div className="cat-progress">
          {(Object.keys(CATS) as (keyof typeof CATS)[]).map((cat) => {
            const all = BUILDINGS.filter((b) => b.cat === cat)
            const got = all.filter((b) => city.discovered.includes(b.id)).length
            return (
              <div key={cat}>
                <span>
                  {CATS[cat].emoji} {CATS[cat].label}
                </span>
                <b>
                  {got}/{all.length}
                </b>
              </div>
            )
          })}
        </div>
        <p className="muted small-text">Certains bâtiments ne s'obtiennent qu'avec les quêtes (accueil). Les séances en salle ou en extérieur rapportent plus souvent des bâtiments d'escalade, les séances maison des parcs.</p>
      </section>

      {opening && <PackOpening packs={opening} city={city} onCity={onCity} onClose={() => setOpening(null)} />}
      {shop && <Shop city={city} onCity={onCity} onClose={() => setShop(false)} />}
    </div>
  )
}
