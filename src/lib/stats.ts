import type { Session } from '../types'
import { gradeRank } from '../types'
import { addDays, fromKey, startOfWeek, weekKey } from './dates'

/** Nombre de séances d'entraînement (hors repos) par semaine */
export const countsByWeek = (sessions: Session[]) => {
  const m = new Map<string, number>()
  for (const s of sessions) {
    if (s.type === 'repos') continue
    const k = weekKey(fromKey(s.date))
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

/**
 * Série hebdo : nombre de semaines consécutives où l'objectif est atteint.
 * La semaine en cours compte si l'objectif est déjà atteint, sinon elle ne casse
 * pas la série tant qu'elle n'est pas terminée. Les jours de repos ne cassent rien.
 */
export const weeklyStreak = (sessions: Session[], goal: number, today = new Date()) => {
  const counts = countsByWeek(sessions)
  let w = startOfWeek(today)
  let streak = 0
  if ((counts.get(weekKey(w)) ?? 0) >= goal) streak++
  w = addDays(w, -7)
  while ((counts.get(weekKey(w)) ?? 0) >= goal) {
    streak++
    w = addDays(w, -7)
  }
  return streak
}

export const bestGrade = (sessions: Session[]) => {
  let best: string | null = null
  for (const s of sessions)
    for (const c of s.climbs) if (best === null || gradeRank(c.grade) > gradeRank(best)) best = c.grade
  return best
}
