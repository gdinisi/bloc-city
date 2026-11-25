import { BUILDINGS, RARITIES } from './buildings'
import { BuildingThumb } from './iso'

/** Page de contrôle des bâtiments (mode développement : ?batiments) */
export function BuildingGallery() {
  return (
    <div className="gallery" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
      {BUILDINGS.map((b) => (
        <div key={b.id} className="gallery-item" style={{ background: '#a7d98b', borderRadius: 12, padding: 6 }}>
          <BuildingThumb b={b} size={96} />
          <div>{b.name}</div>
          <div style={{ color: RARITIES[b.rarity].color }}>{RARITIES[b.rarity].label}</div>
        </div>
      ))}
    </div>
  )
}
