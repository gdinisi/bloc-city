import { useState } from 'react'
import { CityScreen } from './CityScreen'
import { newCity } from './economy'
import type { CityState } from './economy'

/** Page de démo de la ville (mode développement : ?villedemo) — sans compte, rien n'est enregistré */
export default function CityDemo() {
  const [city, setCity] = useState<CityState>(() => ({
    ...newCity(),
    packs: [],
    lastChestAt: new Date().toISOString(),
    inventory: { 'maison-bleue': 2, boulangerie: 1, chalet: 1, 'salle-bloc': 1, phare: 1, 'tour-eiffel': 1, chateau: 1 },
    placed: [
      { uid: 'd1', id: 'maison-jaune', x: 0, y: 0, flip: false },
      { uid: 'd2', id: 'cafe', x: 1, y: 0, flip: true },
      { uid: 'd3', id: 'arbre', x: 2, y: 0, flip: false },
      { uid: 'd4', id: 'colisee', x: 3, y: 2, flip: false },
      { uid: 'd5', id: 'maison-rose', x: 0, y: 1, flip: true },
      { uid: 'd6', id: 'fontaine', x: 1, y: 1, flip: false },
      { uid: 'd7', id: 'tour-horloge', x: 2, y: 1, flip: false },
      { uid: 'd8', id: 'falaise', x: 0, y: 3, flip: false },
    ],
  }))
  return (
    <div className="app">
      <main>
        <CityScreen city={city} onCity={(fn) => setCity((c) => fn(c))} sessions={[]} weeklyGoal={3} />
      </main>
    </div>
  )
}
