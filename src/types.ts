import type { Equipment } from './workout/catalog'
import type { Fatigue, Focus } from './workout/generator'

export type SessionType ='salle' | 'maison' | 'exterieur' | 'repos'

export type ClimbStyle = 'bloc' | 'voie'

export interface Climb {
  style: ClimbStyle
  grade: string
  flash: boolean
}

export interface Session {
  id: string
  /** Jour local au format YYYY-MM-DD */
  date: string
  type: SessionType
  durationMin: number
  /** Ressenti de l'effort, 1 (facile) à 10 (maximal) */
  rpe: number
  note: string
  climbs: Climb[]
  createdAt: string
  /** Séance maison guidée : niveau appliqué et part de la séance réellement faite (0-1) */
  guided?: { level: number; completion: number }
}

export interface HomePrefs {
  minutes: number
  fatigue: Fatigue
  focus: Focus
}

export interface Settings {
  weeklyGoal: number
  /** Matériel disponible à la maison (vide = poids du corps) */
  equipment: Equipment[]
  home: HomePrefs
  /** Questionnaire de départ (matériel, condition) déjà rempli */
  onboarded?: boolean
  /** Niveau de la première séance guidée, d'après la condition annoncée (ensuite il s'adapte) */
  startLevel?: number
}

export const SESSION_TYPES: { id: SessionType; label: string; emoji: string; color: string }[] = [
  { id: 'salle', label: 'Salle', emoji: '🧗', color: 'var(--c-salle)' },
  { id: 'maison', label: 'Maison', emoji: '🏠', color: 'var(--c-maison)' },
  { id: 'exterieur', label: 'Extérieur', emoji: '⛰️', color: 'var(--c-exterieur)' },
  { id: 'repos', label: 'Repos', emoji: '😴', color: 'var(--c-repos)' },
]

export const typeInfo = (t: SessionType) => SESSION_TYPES.find((s) => s.id === t)!

export const GRADES = [
  '4', '5a', '5a+', '5b', '5b+', '5c', '5c+',
  '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c',
]

export const gradeRank = (g: string) => GRADES.indexOf(g)
