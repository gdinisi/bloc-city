import { useState } from 'react'
import type { CityState } from './economy'
import { buy, fragmentsNeeded, isFragmented, ownedCount, salePrice, sellStored, shopPrice } from './economy'
import type { BuildingCat } from './buildings'
import { BUILDINGS, CATS, RARITIES } from './buildings'
import { BuildingThumb } from './iso'

interface Props {
  city: CityState
  onCity: (fn: (c: CityState) => CityState) => void
  onClose: () => void
}

export function Shop({ city, onCity, onClose }: Props) {
  /** Bâtiment rangé dont on demande la confirmation de vente */
  const [vente, setVente] = useState<string | null>(null)
  return (
    <div className="library" role="dialog" aria-label="Boutique">
      <div className="library-head">
        <button type="button" className="round" aria-label="Retour" onClick={onClose}>
          ‹
        </button>
        <h2>Boutique</h2>
        <span className="pill">🪙 {city.coins}</span>
      </div>
      <p className="muted small-text">
        Les doublons te donnent des pièces. Les bâtiments communs et rares s'achètent entiers ; les épiques et légendaires s'achètent fragment par fragment.
        Les merveilles et les exclusivités de quêtes ne se vendent pas.
      </p>
      <p className="muted small-text">
        Tu peux revendre tes bâtiments pour 70 % de leur prix d'achat : ceux rangés depuis cette page, ceux posés en les touchant sur la carte.
      </p>

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
              const price = shopPrice(b)
              const frag = isFragmented(b)
              const canBuy = price !== null && !maxed && city.coins >= price
              const revente = salePrice(b)
              const rangés = city.inventory[b.id] ?? 0
              return (
                <div key={b.id} className="shop-item" style={{ borderColor: r.color }}>
                  <BuildingThumb b={b} size={64} dim={!city.discovered.includes(b.id)} />
                  <b>{b.name}</b>
                  <span className="rarity" style={{ color: r.color }}>
                    {r.label}
                    {(b.size ?? 1) > 1 ? ` · ${b.size}×${b.size}` : ''}
                  </span>
                  <span className="muted shop-owned">
                    {frag && !maxed ? `🧩 ${city.fragments[b.id] ?? 0}/${fragmentsNeeded(b)}` : `${owned}/${r.max} possédé${owned > 1 ? 's' : ''}`}
                  </span>
                  {price === null ? (
                    <span className="shop-lock">{b.source === 'quete' ? '🗺️ Quête' : '✨ Fragments'}</span>
                  ) : (
                    <button type="button" className="btn small" disabled={!canBuy} onClick={() => onCity((c) => buy(c, b.id) ?? c)}>
                      {maxed ? 'Maximum' : frag ? `🧩 ${price} 🪙` : `🪙 ${price}`}
                    </button>
                  )}
                  {revente !== null && rangés > 0 && (
                    vente === b.id ? (
                      <span className="shop-vente">
                        <button
                          type="button"
                          className="btn small primary"
                          onClick={() => {
                            onCity((c) => sellStored(c, b.id))
                            setVente(null)
                          }}
                        >
                          Oui, +{revente} 🪙
                        </button>
                        <button type="button" className="btn small ghost" onClick={() => setVente(null)}>
                          Annuler
                        </button>
                      </span>
                    ) : (
                      <button type="button" className="btn small ghost shop-vendre" onClick={() => setVente(b.id)}>
                        Vendre ({rangés})
                      </button>
                    )
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
