import { useMemo } from 'react'
import type { Session, SessionType } from '../types'
import { addDays, toKey } from '../lib/dates'
import { newCity } from '../city/economy'
import { FriendView } from './FriendView'

/** Page de démonstration de la fiche ami (mode développement : ?amidemo), sans compte ni réseau */
export default function FriendDemo() {
  const { me, them } = useMemo(() => {
    const make = (n: number, seed: number): Session[] => {
      const types: SessionType[] = ['salle', 'maison', 'exterieur', 'salle']
      return Array.from({ length: n }, (_, i) => ({
        id: `${seed}-${i}`,
        date: toKey(addDays(new Date(), -Math.floor(i * (seed === 1 ? 3.2 : 2.1)))),
        type: types[(i + seed) % types.length],
        durationMin: 45 + ((i * 17 + seed * 11) % 75),
        rpe: 5 + ((i + seed) % 4),
        note: '',
        climbs: i % 3 === 0 ? [{ style: 'voie' as const, grade: seed === 1 ? '6a+' : '6b', flash: false }] : [],
        createdAt: new Date().toISOString(),
      }))
    }
    return { me: make(14, 1), them: make(22, 2) }
  }, [])
  const city = { ...newCity(), placed: [] }
  return (
    <FriendView
      friend={{ id: 'demo', pseudo: 'Léa', friend_code: 'DEMO42', stats: {} }}
      mySessions={me}
      myGoal={2}
      demo={{ sessions: them, weeklyGoal: 3, city }}
      onClose={() => history.back()}
      onRemoved={() => undefined}
    />
  )
}
