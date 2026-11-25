import type { Session } from '../types'

/*
 * Expérience de grimpeur : elle grandit avec les heures de sport réalisées
 * (toutes les séances sauf les jours de repos). Chaque niveau demande un peu
 * plus d'heures que le précédent : 5 h pour le niveau 2, puis +10 h, +15 h…
 */

const TITLES = [
  'Grimpeur en herbe',
  'Premiers blocs',
  'Grimpeur du dimanche',
  'Habitué de la salle',
  'Grimpeur aguerri',
  'Ouvreur de voies',
  'Main de fer',
  'Alpiniste',
  'Maître de la paroi',
  'Légende des sommets',
]

/** Heures cumulées nécessaires pour atteindre le niveau L (niveau 1 = 0 h) */
export const hoursFor = (level: number) => 2.5 * (level - 1) * level

export function experience(sessions: Session[]) {
  const hours = sessions.filter((s) => s.type !== 'repos').reduce((t, s) => t + s.durationMin, 0) / 60
  let level = 1
  while (hours >= hoursFor(level + 1)) level++
  const from = hoursFor(level)
  const to = hoursFor(level + 1)
  return {
    hours,
    level,
    title: TITLES[Math.min(level, TITLES.length) - 1],
    from,
    to,
    progress: (hours - from) / (to - from),
    left: to - hours,
  }
}

export const fmtHours = (h: number) => {
  const total = Math.round(h * 60)
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return hh === 0 ? `${mm} min` : mm === 0 ? `${hh} h` : `${hh} h ${String(mm).padStart(2, '0')}`
}
