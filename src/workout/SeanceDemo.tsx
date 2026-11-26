import { useMemo } from 'react'
import { Player } from './Player'
import { generatePlan } from './generator'

/** Page de démo du lecteur de séance (mode développement : ?seancedemo) — sans compte, rien n'est enregistré */
export default function SeanceDemo() {
  const plan = useMemo(() => generatePlan({ minutes: 30, fatigue: 'normal', focus: 'complet', equipment: ['barre', 'elastique'], seed: 7, level: 5 }), [])
  return (
    <div className="app">
      <Player plan={plan} onSave={() => undefined} onClose={() => location.reload()} />
    </div>
  )
}
