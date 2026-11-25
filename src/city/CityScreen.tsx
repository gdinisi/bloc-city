import { useEffect, useMemo, useState } from 'react'
import type { CityState, Pack } from './economy'
import { GRID, chestPack, chestReadyAt, move, place, population, rotate, store } from './economy'
import { BUILDINGS, CATS, RARITIES, buildingById, cityLevel, nextLevelAt, CITY_LEVELS } from './buildings'
import { BuildingSprite, BuildingThumb, TH, TW } from './iso'
import { PackOpening } from './PackOpening'
import { Shop } from './Shop'

interface Props {
  city: CityState
  onCity: (fn: (c: CityState) => CityState) => void
}

type Mode = { type: 'idle' } | { type: 'place'; id: string } | { type: 'move'; uid: string }

const tileCenter = (x: number, y: number): [number, number] => [((x - y) * TW) / 2, ((x + y) * TH) / 2]

function useNow(every = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(t)
  }, [every])
  return now
}

const formatWait = (ms: number) => {
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
  const nextAt = nextLevelAt(pop)
  const levelStart = CITY_LEVELS[level - 1] ?? 0
  const chestAt = chestReadyAt(city)
  const chestReady = now >= chestAt
  const inventory = Object.entries(city.inventory).filter(([, n]) => n > 0)
  const selectedP = city.placed.find((p) => p.uid === selected)
  const selectedB = selectedP ? buildingById(selectedP.id) : undefined

  const occupied = useMemo(() => new Set(city.placed.map((p) => `${p.x},${p.y}`)), [city.placed])
  const sortedPlaced = useMemo(() => [...city.placed].sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x), [city.placed])
  const placing = mode.type !== 'idle'

  const onTile = (x: number, y: number) => {
    if (mode.type === 'place') {
      onCity((c) => place(c, mode.id, x, y) ?? c)
      setMode({ type: 'idle' })
      return
    }
    if (mode.type === 'move') {
      onCity((c) => move(c, mode.uid, x, y) ?? c)
      setMode({ type: 'idle' })
      return
    }
    const p = city.placed.find((q) => q.x === x && q.y === y)
    setSelected(p ? p.uid : null)
  }

  const tiles = []
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const [cx, cy] = tileCenter(x, y)
      const free = !occupied.has(`${x},${y}`)
      const hint = placing && free
      tiles.push(
        <polygon
          key={`${x},${y}`}
          points={`${cx - TW / 2},${cy} ${cx},${cy + TH / 2} ${cx + TW / 2},${cy} ${cx},${cy - TH / 2}`}
          fill={hint ? '#d9f7be' : (x + y) % 2 ? '#9fd67c' : '#93cd6f'}
          stroke={hint ? '#5b6cff' : '#86c262'}
          strokeWidth={hint ? 1.6 : 0.8}
          strokeDasharray={hint ? '3 2' : undefined}
          onClick={() => onTile(x, y)}
          style={{ cursor: 'pointer' }}
        />,
      )
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
        {nextAt !== null && <p className="muted small-text">Niveau {level + 1} à {nextAt} habitants : pose des bâtiments pour l'atteindre.</p>}
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
        {mode.type !== 'idle' && (
          <div className="place-banner">
            <span>
              {mode.type === 'place' ? `Touche une case libre pour poser : ${buildingById(mode.id)?.name}` : 'Touche une case libre pour le déplacer'}
            </span>
            <button type="button" className="btn small" onClick={() => setMode({ type: 'idle' })}>
              Annuler
            </button>
          </div>
        )}
        <svg className="city-svg" viewBox="-166 -72 332 246" role="img" aria-label="Ta ville">
          <defs>
            <radialGradient id="sky" cx="50%" cy="40%" r="70%">
              <stop offset="0" stopColor="#fff9ec" />
              <stop offset="1" stopColor="#fff1d6" />
            </radialGradient>
          </defs>
          <rect x={-166} y={-72} width={332} height={246} fill="url(#sky)" />
          {/* bord de terre sous la grille */}
          <polygon points={`${-GRID * TW / 2},${(GRID * TH) / 2 - TH / 2} 0,${GRID * TH - TH / 2} 0,${GRID * TH - TH / 2 + 10} ${-GRID * TW / 2},${(GRID * TH) / 2 - TH / 2 + 10}`} fill="#b07a4a" />
          <polygon points={`0,${GRID * TH - TH / 2} ${GRID * TW / 2},${(GRID * TH) / 2 - TH / 2} ${GRID * TW / 2},${(GRID * TH) / 2 - TH / 2 + 10} 0,${GRID * TH - TH / 2 + 10}`} fill="#8c5f37" />
          <g>{tiles}</g>
          {sortedPlaced.map((p) => {
            const b = buildingById(p.id)
            if (!b) return null
            const [cx, cy] = tileCenter(p.x, p.y)
            const isSel = p.uid === selected
            const isMoving = mode.type === 'move' && mode.uid === p.uid
            return (
              <g
                key={p.uid}
                transform={`translate(${cx} ${cy})`}
                onClick={() => !placing && setSelected(isSel ? null : p.uid)}
                style={{ cursor: 'pointer', opacity: isMoving ? 0.45 : 1, pointerEvents: placing ? 'none' : 'auto' }}
              >
                {isSel && <polygon points={`${-TW / 2},0 0,${TH / 2} ${TW / 2},0 0,${-TH / 2}`} fill="#ffe066" stroke="#f2994a" strokeWidth={2} />}
                <BuildingSprite b={b} flip={p.flip} />
              </g>
            )
          })}
        </svg>
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
                  {n > 1 && <span className="inv-count">×{n}</span>}
                </button>
              )
            })}
          </div>
        )}
        <p className="muted small-text">Touche un bâtiment puis une case libre de la ville pour le poser.</p>
      </section>

      <section className="card">
        <h2>Familles de bâtiments</h2>
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
        <p className="muted small-text">Les séances en salle ou en extérieur rapportent plus souvent des bâtiments d'escalade, les séances maison des parcs.</p>
      </section>

      {opening && (
        <PackOpening
          packs={opening}
          city={city}
          onCity={onCity}
          onClose={() => setOpening(null)}
        />
      )}
      {shop && <Shop city={city} onCity={onCity} onClose={() => setShop(false)} />}
    </div>
  )
}
