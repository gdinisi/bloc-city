import type { CityState } from './economy'
import { buy, ownedCount } from './economy'
import type { BuildingCat } from './buildings'
import { BUILDINGS, CATS, RARITIES } from './buildings'
import { BuildingThumb } from './iso'

interface Props {
  city: CityState
  onCity: (fn: (c: CityState) => CityState) => void
  onClose: () => void
}

export function Shop({ city, onCity, onClose }: Props) {
  return (
    <div className="library" role="dialog" aria-label="Boutique">
      <div className="library-head">
        <button type="button" className="round" aria-label="Retour" onClick={onClose}>
          ‹
        </button>
        <h2>Boutique</h2>
        <span className="pill">🪙 {city.coins}</span>
      </div>
      <p className="muted small-text">Les doublons te donnent des pièces. Dépense-les ici pour choisir le bâtiment qui te manque.</p>

      {(Object.keys(CATS) as BuildingCat[]).map((cat) => (
        <section key={cat} className="shop-section">
          <div className="plan-phase">
            {CATS[cat].emoji} {CATS[cat].label}
          </div>
          <div className="shop-grid">
            {BUILDINGS.filter((b) => b.cat === cat).map((b) => {
              const r = RARITIES[b.rarity]
              const owned = ownedCount(city, b.id)
              const maxed = owned >= r.max
              const canBuy = !maxed && city.coins >= r.price
              return (
                <div key={b.id} className="shop-item" style={{ borderColor: r.color }}>
                  <BuildingThumb b={b} size={64} />
                  <b>{b.name}</b>
                  <span className="rarity" style={{ color: r.color }}>
                    {r.label}
                  </span>
                  <span className="muted shop-owned">
                    {owned}/{r.max} possédé{owned > 1 ? 's' : ''}
                  </span>
                  <button type="button" className="btn small" disabled={!canBuy} onClick={() => onCity((c) => buy(c, b.id) ?? c)}>
                    {maxed ? 'Maximum' : `🪙 ${r.price}`}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
