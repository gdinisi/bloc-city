import { useState } from 'react'
import type { Settings } from '../types'
import { Onboarding } from './Onboarding'

/** Page de démo du questionnaire de départ (mode développement : ?bienvenue) — rien n'est enregistré */
export default function OnboardingDemo() {
  const [res, setRes] = useState<Partial<Settings> | null>(null)
  const settings: Settings = { weeklyGoal: 3, equipment: [], home: { minutes: 30, fatigue: 'normal', focus: 'complet' } }
  return (
    <div className="app gate">
      <main>{res ? <pre className="card">{JSON.stringify(res, null, 2)}</pre> : <Onboarding settings={settings} sessions={[]} onDone={setRes} />}</main>
    </div>
  )
}
