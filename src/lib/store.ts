import { useCallback, useEffect, useState } from 'react'
import type { Session, Settings } from '../types'
import type { CityState } from '../city/economy'
import { migrateCity, newCity, rewardSessions } from '../city/economy'

/**
 * Les données sont gardées sur le téléphone (localStorage).
 * À l'étape "comptes et amis", elles seront synchronisées avec Supabase.
 */
const KEY = 'blocCity.v1'

interface Data {
  sessions: Session[]
  settings: Settings
  city: CityState
}

const DEFAULT_SETTINGS: Settings = { weeklyGoal: 3, equipment: [], home: { minutes: 30, fatigue: 'normal', focus: 'complet' } }

const load = (): Data => {
  let sessions: Session[] = []
  let settings = DEFAULT_SETTINGS
  let city = newCity()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Data>
      sessions = Array.isArray(parsed.sessions) ? parsed.sessions : []
      settings = { ...DEFAULT_SETTINGS, ...parsed.settings, home: { ...DEFAULT_SETTINGS.home, ...parsed.settings?.home } }
      if (parsed.city) city = migrateCity(parsed.city)
    }
  } catch {
    /* données illisibles : on repart de zéro */
  }
  // chaque séance déjà enregistrée rapporte son pack (une seule fois)
  return { sessions, settings, city: rewardSessions(city, sessions) }
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
  const [data, setData] = useState<Data>(load)

  useEffect(() => save(data), [data])

  const upsertSession = useCallback((s: Session) => {
    setData((d) => {
      const exists = d.sessions.some((x) => x.id === s.id)
      const sessions = exists ? d.sessions.map((x) => (x.id === s.id ? s : x)) : [...d.sessions, s]
      // une nouvelle séance d'entraînement rapporte un pack
      return { ...d, sessions, city: rewardSessions(d.city, sessions) }
    })
  }, [])

  const deleteSession = useCallback((id: string) => {
    setData((d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== id) }))
  }, [])

  const setWeeklyGoal = useCallback((weeklyGoal: number) => {
    setData((d) => ({ ...d, settings: { ...d.settings, weeklyGoal: Math.min(7, Math.max(1, weeklyGoal)) } }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  }, [])

  const updateCity = useCallback((fn: (c: CityState) => CityState) => {
    setData((d) => ({ ...d, city: fn(d.city) }))
  }, [])

  return { ...data, upsertSession, deleteSession, setWeeklyGoal, updateSettings, updateCity }
}
