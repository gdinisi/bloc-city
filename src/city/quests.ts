import type { Session } from '../types'
import { toKey, weekKey, fromKey } from '../lib/dates'
import { bestStreak } from '../lib/periodStats'
import type { CityState, Reward } from './economy'
import { levelOf } from './economy'
import { buildingById } from './buildings'

export type QuestGroup = 'jour' | 'semaine' | 'succes'

export interface Quest {
  /** Clé unique de récupération (inclut le jour ou la semaine pour les quêtes récurrentes) */
  key: string
  group: QuestGroup
  emoji: string
  title: string
  progress: number
  target: number
  reward: Reward
  rewardLabel: string
  /** Récompense exclusive (bâtiment introuvable ailleurs) */
  exclusive?: boolean
}

const label = (r: Reward) => {
  if (r.building) return `🏛️ ${buildingById(r.building)?.name} (exclusif)`
  const parts: string[] = []
  if (r.coins) parts.push(`${r.coins} 🪙`)
  if (r.pack) parts.push(r.pack === 'bonus' ? '💎 Pack bonus' : '🎁 Pack')
  if (r.fragments)
    parts.push(
      `🧩 ${r.fragments.n} fragment${r.fragments.n > 1 ? 's' : ''} ${
        r.fragments.id ? buildingById(r.fragments.id)?.name : r.fragments.rarity === 'merveille' ? 'de merveille' : 'épique'
      }`,
    )
  if (r.texture) parts.push('🌸 Sol « Prairie fleurie »')
  return parts.join(' + ')
}

export function computeQuests(sessions: Session[], weeklyGoal: number, city: CityState, today = new Date()): Quest[] {
  const dayK = toKey(today)
  const weekK = weekKey(today)
  const training = sessions.filter((s) => s.type !== 'repos')
  const todayS = training.filter((s) => s.date === dayK)
  const weekS = training.filter((s) => weekKey(fromKey(s.date)) === weekK)
  const climbs = (list: Session[]) => list.reduce((n, s) => n + s.climbs.length, 0)
  const minutes = training.reduce((m, s) => m + s.durationMin, 0)

  const q = (
    group: QuestGroup,
    id: string,
    emoji: string,
    title: string,
    progress: number,
    target: number,
    reward: Reward,
  ): Quest => ({
    key: group === 'jour' ? `jour:${dayK}:${id}` : group === 'semaine' ? `semaine:${weekK}:${id}` : `succes:${id}`,
    group,
    emoji,
    title,
    progress: Math.min(progress, target),
    target,
    reward,
    rewardLabel: label(reward),
    exclusive: !!reward.building,
  })

  return [
    // ---------- Du jour ----------
    q('jour', 'seance', '🔥', 'Entraîne-toi aujourd\'hui', todayS.length, 1, { coins: 15 }),
    q('jour', '30min', '⏱️', '30 min d\'entraînement aujourd\'hui', todayS.reduce((m, s) => m + s.durationMin, 0), 30, {
      fragments: { rarity: 'epique', n: 1 },
    }),

    // ---------- De la semaine ----------
    q('semaine', 'objectif', '🎯', `Atteins ton objectif : ${weeklyGoal} séances`, weekS.length, weeklyGoal, { pack: 'bonus' }),
    q('semaine', 'guidee', '🏠', 'Une séance maison guidée', weekS.filter((s) => s.guided).length, 1, { coins: 30 }),
    q('semaine', 'grimpe', '🧗', '5 blocs ou voies réussis', climbs(weekS), 5, { fragments: { rarity: 'merveille', n: 1 } }),

    // ---------- Succès ----------
    q('succes', 'premiere', '🌱', 'Ta première séance', training.length, 1, { coins: 20 }),
    q('succes', '10', '🗿', '10 séances', training.length, 10, { building: 'moai' }),
    q('succes', '25', '🏛️', '25 séances', training.length, 25, { building: 'temple' }),
    q('succes', '50', '🚀', '50 séances', training.length, 50, { building: 'fusee' }),
    q('succes', 'serie4', '🌈', '4 semaines d\'affilée à l\'objectif', bestStreak(sessions, weeklyGoal, today), 4, { building: 'arche' }),
    q('succes', 'grimpe50', '🏅', '50 blocs ou voies réussis', climbs(training), 50, { building: 'statue' }),
    q('succes', 'maison10', '🌸', '10 séances à la maison', training.filter((s) => s.type === 'maison').length, 10, {
      texture: 'fleurs',
      coins: 50,
    }),
    q('succes', 'heures20', '⌛', '20 heures d\'entraînement', Math.floor(minutes / 60), 20, { fragments: { id: 'colisee', n: 3 } }),
    q('succes', 'niveau5', '🏙️', 'Ville au niveau 5', levelOf(city), 5, { fragments: { id: 'pyramide', n: 3 } }),
    q('succes', 'collection15', '📖', 'Découvre 15 bâtiments', city.discovered.length, 15, { fragments: { id: 'tour-eiffel', n: 3 } }),
  ]
}

export const isDone = (q: Quest) => q.progress >= q.target
export const isClaimed = (q: Quest, city: CityState) => city.claimed.includes(q.key)
export const claimableCount = (quests: Quest[], city: CityState) => quests.filter((q) => isDone(q) && !isClaimed(q, city)).length
