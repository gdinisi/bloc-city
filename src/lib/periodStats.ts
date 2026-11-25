import type { Session, SessionType } from '../types'
import { gradeRank } from '../types'
import { addDays, fromKey, monthGrid, startOfWeek, toKey, weekKey } from './dates'
import { countsByWeek } from './stats'

export type PeriodKind = 'mois' | 'annee' | 'total'

export interface Period {
  kind: PeriodKind
  year: number
  /** 0-11, utilisé pour le mois */
  month: number
}

export interface Bucket {
  label: string
  /** Libellé long pour l'infobulle */
  title: string
  sessions: number
  minutes: number
}

export interface PeriodStats {
  sessions: number
  minutes: number
  activeDays: number
  avgRpe: number | null
  byType: Record<Exclude<SessionType, 'repos'>, { sessions: number; minutes: number }>
  restDays: number
  climbs: number
  blocs: number
  voies: number
  flashs: number
  bestVoie: string | null
  topBlocLevels: { level: string; count: number }[]
  /** Semaines (lundi) de la période où l'objectif est atteint / semaines écoulées */
  weeksAtGoal: number
  weeksElapsed: number
  perWeek: number
  buckets: Bucket[]
  /** Unité des barres, pour le titre du graphique */
  bucketUnit: string
}

const MONTHS_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

const pad = (n: number) => String(n).padStart(2, '0')

/** Bornes [début, fin] incluses, au format YYYY-MM-DD */
export function periodRange(p: Period, sessions: Session[], today = new Date()): [string, string] {
  const todayKey = toKey(today)
  if (p.kind === 'mois') {
    const last = new Date(p.year, p.month + 1, 0).getDate()
    return [`${p.year}-${pad(p.month + 1)}-01`, `${p.year}-${pad(p.month + 1)}-${pad(last)}`]
  }
  if (p.kind === 'annee') return [`${p.year}-01-01`, `${p.year}-12-31`]
  const first = sessions.reduce((min, s) => (s.date < min ? s.date : min), todayKey)
  return [first, todayKey]
}

export function computeStats(all: Session[], p: Period, goal: number, today = new Date()): PeriodStats {
  const [start, end] = periodRange(p, all, today)
  const todayKey = toKey(today)
  const inRange = all.filter((s) => s.date >= start && s.date <= end)
  const training = inRange.filter((s) => s.type !== 'repos')

  const byType = { salle: { sessions: 0, minutes: 0 }, maison: { sessions: 0, minutes: 0 }, exterieur: { sessions: 0, minutes: 0 } }
  let minutes = 0
  let rpeSum = 0
  let rpeN = 0
  for (const s of training) {
    const t = s.type as Exclude<SessionType, 'repos'>
    byType[t].sessions++
    byType[t].minutes += s.durationMin
    minutes += s.durationMin
    if (s.rpe > 0) {
      rpeSum += s.rpe
      rpeN++
    }
  }

  let blocs = 0
  let voies = 0
  let flashs = 0
  let bestVoie: string | null = null
  const levels = new Map<string, number>()
  for (const s of training)
    for (const c of s.climbs) {
      if (c.style === 'bloc') {
        blocs++
        levels.set(c.grade, (levels.get(c.grade) ?? 0) + 1)
      } else voies++
      if (c.flash) flashs++
      if (gradeRank(c.grade) >= 0 && (bestVoie === null || gradeRank(c.grade) > gradeRank(bestVoie))) bestVoie = c.grade
    }

  // Régularité : de la 1re séance de l'historique (pas avant) jusqu'à aujourd'hui
  const counts = countsByWeek(all)
  const firstEver = all.reduce((min, s) => (s.date < min ? s.date : min), todayKey)
  const from = start > firstEver ? start : firstEver
  const lastDay = end < todayKey ? end : todayKey
  let weeksElapsed = 0
  let weeksAtGoal = 0
  if (from <= lastDay) {
    let w = startOfWeek(fromKey(from))
    if (toKey(w) < from && from === start) w = addDays(w, 7)
    while (toKey(w) <= lastDay) {
      weeksElapsed++
      if ((counts.get(toKey(w)) ?? 0) >= goal) weeksAtGoal++
      w = addDays(w, 7)
    }
  }
  const daysElapsed = from <= lastDay ? Math.round((fromKey(lastDay).getTime() - fromKey(from).getTime()) / 86400000) + 1 : 0
  const perWeek = daysElapsed > 0 ? (training.length / daysElapsed) * 7 : 0

  return {
    sessions: training.length,
    minutes,
    activeDays: new Set(training.map((s) => s.date)).size,
    avgRpe: rpeN ? rpeSum / rpeN : null,
    byType,
    restDays: inRange.filter((s) => s.type === 'repos').length,
    climbs: blocs + voies,
    blocs,
    voies,
    flashs,
    bestVoie,
    topBlocLevels: [...levels.entries()]
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    weeksAtGoal,
    weeksElapsed,
    perWeek,
    ...buckets(training, p, start, end),
  }
}

function buckets(training: Session[], p: Period, start: string, end: string): { buckets: Bucket[]; bucketUnit: string } {
  const sum = (from: string, to: string) => {
    const list = training.filter((s) => s.date >= from && s.date <= to)
    return { sessions: list.length, minutes: list.reduce((m, s) => m + s.durationMin, 0) }
  }

  if (p.kind === 'mois') {
    // une barre par semaine (lundi -> dimanche) touchant le mois
    const weeks = monthGrid(p.year, p.month)
    return {
      bucketUnit: 'par semaine',
      buckets: weeks.map((w) => {
        const from = toKey(w[0])
        const to = toKey(w[6])
        const label = `${w[0].getDate()}–${w[6].getDate()}`
        return { label, title: `Semaine du ${w[0].getDate()} ${MONTHS_LONG[w[0].getMonth()]}`, ...sum(from, to) }
      }),
    }
  }

  if (p.kind === 'annee') {
    return {
      bucketUnit: 'par mois',
      buckets: MONTHS_SHORT.map((label, m) => {
        const last = new Date(p.year, m + 1, 0).getDate()
        return { label, title: `${MONTHS_LONG[m]} ${p.year}`, ...sum(`${p.year}-${pad(m + 1)}-01`, `${p.year}-${pad(m + 1)}-${pad(last)}`) }
      }),
    }
  }

  // Total : par mois si moins de 2 ans d'historique, sinon par année
  const first = fromKey(start)
  const last = fromKey(end)
  const months = (last.getFullYear() - first.getFullYear()) * 12 + last.getMonth() - first.getMonth() + 1
  if (months <= 24) {
    const out: Bucket[] = []
    const n = Math.max(months, 6)
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(last.getFullYear(), last.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth()
      const lastDay = new Date(y, m + 1, 0).getDate()
      out.push({ label: MONTHS_SHORT[m], title: `${MONTHS_LONG[m]} ${y}`, ...sum(`${y}-${pad(m + 1)}-01`, `${y}-${pad(m + 1)}-${pad(lastDay)}`) })
    }
    return { bucketUnit: 'par mois', buckets: out }
  }
  const out: Bucket[] = []
  for (let y = first.getFullYear(); y <= last.getFullYear(); y++) {
    out.push({ label: String(y), title: String(y), ...sum(`${y}-01-01`, `${y}-12-31`) })
  }
  return { bucketUnit: 'par année', buckets: out }
}

/** Plus longue série de semaines consécutives à l'objectif, sur tout l'historique */
export function bestStreak(all: Session[], goal: number, today = new Date()) {
  const training = all.filter((s) => s.type !== 'repos')
  if (!training.length) return 0
  const counts = countsByWeek(all)
  const first = training.reduce((min, s) => (s.date < min ? s.date : min), training[0].date)
  let w = startOfWeek(fromKey(first))
  const end = weekKey(today)
  let best = 0
  let cur = 0
  while (toKey(w) <= end) {
    if ((counts.get(toKey(w)) ?? 0) >= goal) {
      cur++
      best = Math.max(best, cur)
    } else if (toKey(w) !== end) cur = 0
    w = addDays(w, 7)
  }
  return best
}

export const formatHours = (min: number) => {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${pad(m)}` : `${h} h`
}

export const periodTitle = (p: Period) =>
  p.kind === 'mois' ? `${MONTHS_LONG[p.month][0].toUpperCase()}${MONTHS_LONG[p.month].slice(1)} ${p.year}` : p.kind === 'annee' ? String(p.year) : 'Depuis le début'
