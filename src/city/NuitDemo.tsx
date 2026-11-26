import { useState } from 'react'
import { CityMap } from './CityMap'
import { newCity } from './economy'
import type { CityState } from './economy'

/** Aperçu du mode nuit (mode développement : ?nuitdemo) — petite île de démo, bascule jour / nuit */
const ILE: string[] = []
for (let x = 0; x < 5; x++) for (let y = 0; y < 4; y++) if (!(x === 4 && y === 0)) ILE.push(`${x},${y}`)
const BATS: [string, number, number][] = [
  ['maison-jaune', 0, 0], ['cafe', 1, 0], ['maison-rose', 2, 0], ['arbre', 3, 0],
  ['boulangerie', 0, 1], ['fontaine', 1, 1], ['tour-horloge', 2, 1], ['sapin', 3, 1], ['phare', 4, 1],
  ['chalet', 0, 2], ['kiosque', 1, 2], ['maison-bleue', 2, 2], ['jardin', 3, 2],
  ['arbre', 0, 3], ['marche', 1, 3], ['villa', 2, 3], ['sapin', 3, 3], ['refuge', 4, 3],
]

export default function NuitDemo() {
  const [nuit, setNuit] = useState(true)
  const [city] = useState<CityState>(() => ({
    ...newCity(),
    land: ILE,
    elevation: {},
    placed: BATS.map(([id, x, y], i) => ({ uid: `n${i}`, id, x, y, flip: false })),
  }))
  return (
    <div className="app">
      <main>
        <div className="screen">
          <section className="card city-card">
            <div className="city-tools">
              <button type="button" className={`chip ${!nuit ? 'on' : ''}`} onClick={() => setNuit(false)}>
                ☀️ Jour
              </button>
              <button type="button" className={`chip ${nuit ? 'on' : ''}`} onClick={() => setNuit(true)}>
                🌙 Nuit
              </button>
            </div>
            <CityMap city={city} onTile={() => undefined} nuit={nuit} />
          </section>
        </div>
      </main>
    </div>
  )
}
