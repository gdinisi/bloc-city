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
    inventory: { 'maison-bleue': 2, boulangerie: 1, chalet: 1, 'salle-bloc': 1, phare: 1 },
  }))
  return (
    <div className="app">
      <main>
        <CityScreen city={city} onCity={(fn) => setCity((c) => fn(c))} sessions={[]} weeklyGoal={3} />
      </main>
    </div>
  )
}
