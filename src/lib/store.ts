import { useCallback, useEffect, useState } from 'react'
import type { Session, Settings } from '../types'
import type { CityState } from '../city/economy'
import { migrateCity, newCity, rewardSessions } from '../city/economy'

/**
 * Les données sont gardées sur le téléphone (localStorage) et, une fois connecté,
 * synchronisées avec Supabase (voir sync.ts). La version la plus récente gagne.
 */
const KEY = 'blocCity.v1'

export interface Data {
  sessions: Session[]
  settings: Settings
  city: CityState
  /** date de la dernière modification (ms), pour savoir quelle copie est la plus récente */
  updatedAt: number
}

export type SavedData = Omit<Data, 'updatedAt'>

const DEFAULT_SETTINGS: Settings = { weeklyGoal: 3, equipment: [], home: { minutes: 30, fatigue: 'normal', focus: 'complet' } }

/** Remet des données lues (téléphone ou cloud) dans un état valide */
const normalize = (parsed: Partial<Data>, updatedAt: number): Data => {
  const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : []
  const settings = { ...DEFAULT_SETTINGS, ...parsed.settings, home: { ...DEFAULT_SETTINGS.home, ...parsed.settings?.home } }
  const city = parsed.city ? migrateCity(parsed.city) : newCity()
  // chaque séance déjà enregistrée rapporte son pack (une seule fois)
  return { sessions, settings, city: rewardSessions(city, sessions), updatedAt }
}

const load = (): Data => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Data>
      return normalize(parsed, typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0)
    }
  } catch {
    /* données illisibles : on repart de zéro */
  }
  return normalize({}, 0)
}

const save = (d: Data) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(d))
  } catch {
    /* stockage indisponible (navigation privée) : on garde en mémoire */
  }
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

export function useAppData() {
  const [data, setRaw] = useState<Data>(load)
  // toute modification locale est datée
  const setData = useCallback((fn: (d: Data) => Data) => setRaw((d) => ({ ...fn(d), updatedAt: Date.now() })), [])

  useEffect(() => save(data), [data])

  const upsertSession = useCallback((s: Session) => {
    setData((d) => {
      const exists = d.sessions.some((x) => x.id === s.id)
      const sessions = exists ? d.sessions.map((x) => (x.id === s.id ? s : x)) : [...d.sessions, s]
      // une nouvelle séance d'entraînement rapporte un pack
      return { ...d, sessions, city: rewardSessions(d.city, sessions) }
    })
  }, [setData])

  const deleteSession = useCallback((id: string) => {
    setData((d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== id) }))
  }, [setData])

  const setWeeklyGoal = useCallback((weeklyGoal: number) => {
    setData((d) => ({ ...d, settings: { ...d.settings, weeklyGoal: Math.min(7, Math.max(1, weeklyGoal)) } }))
  }, [setData])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  }, [setData])

  const updateCity = useCallback((fn: (c: CityState) => CityState) => {
    setData((d) => ({ ...d, city: fn(d.city) }))
  }, [setData])

  /** Remplace tout par la copie du cloud (plus récente) */
  const replaceAll = useCallback((saved: Partial<SavedData>, updatedAt: number) => {
    setRaw(normalize(saved, updatedAt))
  }, [])

  return { ...data, replaceAll, upsertSession, deleteSession, setWeeklyGoal, updateSettings, updateCity }
}
