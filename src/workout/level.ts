import type { Session } from '../types'
import { addDays, fromKey, toKey } from '../lib/dates'
import type { Fatigue } from './generator'

/**
 * Niveau adaptatif des séances maison (1 = très doux, 10 = très exigeant).
 *
 * Il évolue séance après séance selon le ressenti noté à la fin et la part de
 * la séance réellement faite, puis il est corrigé par la régularité récente
 * (toutes séances confondues) et par l'énergie annoncée au début.
 */

export const LEVEL_MIN = 1
export const LEVEL_MAX = 10
export const START_LEVEL = 4

const clamp = (v: number) => Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, v))

/** Effet d'une séance guidée terminée sur le niveau */
export function sessionDelta(rpe: number, completion: number) {
  if (completion < 0.7) return -0.8 // abandonnée en route : trop dur
  if (rpe >= 9) return -0.8 // à bloc : on lève le pied
  if (rpe === 8) return -0.2
  if (rpe >= 6) return 0.35 // zone idéale : on progresse doucement
  if (rpe >= 4) return 0.7 // un peu facile
  return 1 // trop facile
}

export interface LevelInfo {
  /** Niveau de fond, issu de l'historique (avant l'énergie du jour) */
  base: number
  /** Niveau appliqué à la séance du jour */
  today: number
  /** Évolution due à la dernière séance guidée */
  lastDelta: number | null
  guidedCount: number
  /** Explications courtes, affichées à l'utilisateur */
  reasons: string[]
}

const ENERGY: Record<Fatigue, number> = { fatigue: -2, normal: 0, frais: 1 }

export function computeLevel(sessions: Session[], energy: Fatigue, today = new Date()): LevelInfo {
  const guided = sessions
    .filter((s) => s.guided)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))

  let level = START_LEVEL
  let lastDelta: number | null = null
  for (const s of guided) {
    lastDelta = sessionDelta(s.rpe, s.guided!.completion)
    level = clamp(level + lastDelta)
  }

  const reasons: string[] = []
  if (guided.length === 0) reasons.push('Niveau de départ : il s\'ajustera après tes premières séances guidées.')
  else {
    const recent = guided.slice(-5)
    const avg = recent.reduce((s, x) => s + x.rpe, 0) / recent.length
    reasons.push(`Ressenti moyen de tes ${recent.length} dernière${recent.length > 1 ? 's' : ''} séance${recent.length > 1 ? 's' : ''} guidée${recent.length > 1 ? 's' : ''} : ${avg.toFixed(1)}/10.`)
  }

  // Régularité et fatigue récentes, toutes séances confondues
  const todayKey = toKey(today)
  const since = (days: number) => toKey(addDays(today, -days))
  const training = sessions.filter((s) => s.type !== 'repos' && s.date <= todayKey)
  const last28 = training.filter((s) => s.date > since(28)).length
  const last7 = training.filter((s) => s.date > since(7))
  const lastDate = training.reduce<string | null>((m, s) => (m === null || s.date > m ? s.date : m), null)
  const daysOff = lastDate ? Math.round((today.getTime() - fromKey(lastDate).getTime()) / 86400000) : null

  let adjust = 0
  if (guided.length > 0 && daysOff !== null && daysOff > 14) {
    adjust -= 1
    reasons.push(`Pas de séance depuis ${daysOff} jours : on reprend en douceur.`)
  } else if (last28 >= 10) {
    adjust += 0.5
    reasons.push(`${last28} séances ces 4 dernières semaines : belle régularité.`)
  }
  const hardWeek = last7.filter((s) => s.rpe >= 8).length
  if (hardWeek >= 3) {
    adjust -= 1
    reasons.push(`${hardWeek} séances très dures cette semaine : on allège pour récupérer.`)
  }

  const base = clamp(level + adjust)
  const todayLevel = clamp(Math.round(base + ENERGY[energy]))
  if (energy === 'fatigue') reasons.push('Tu te sens fatigué : séance allégée aujourd\'hui.')
  if (energy === 'frais') reasons.push('Tu es en forme : on monte d\'un cran aujourd\'hui.')

  return { base, today: todayLevel, lastDelta, guidedCount: guided.length, reasons }
}

/** Paramètres d'entraînement dérivés du niveau */
export function levelParams(level: number) {
  return {
    /** Multiplicateur des répétitions et des durées d'effort */
    volume: 0.7 + 0.06 * level, // 0,76 -> 1,30
    /** Multiplicateur des temps de repos */
    rest: 1.3 - 0.06 * level, // 1,24 -> 0,70
    /** Séries en plus (+1) ou en moins (-1) */
    setsDelta: level >= 7 ? 1 : level <= 2 ? -1 : 0,
    /** Intensité maximale des exercices proposés (1 à 3) */
    maxIntensity: level <= 4 ? 2 : 3,
    /** Préférence pour les exercices exigeants (+1) ou faciles (-1) */
    prefer: level >= 7 ? 1 : level <= 3 ? -1 : 0,
  }
}

export const levelLabel = (l: number) =>
  l <= 2 ? 'Tout doux' : l <= 4 ? 'Modéré' : l <= 6 ? 'Soutenu' : l <= 8 ? 'Exigeant' : 'Intense'
