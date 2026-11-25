import { useCallback, useEffect, useState } from 'react'
import type { Session, Settings } from '../types'

/**
 * Étape 1 : les données sont gardées sur le téléphone (localStorage).
 * À l'étape "comptes et amis", elles seront synchronisées avec Supabase.
 */
const KEY = 'blocCity.v1'

interface Data {
  sessions: Session[]
  settings: Settings
}

const DEFAULT: Data = { sessions: [], settings: { weeklyGoal: 3 } }

const load = (): Data => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw) as Partial<Data>
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      settings: { ...DEFAULT.settings, ...parsed.settings },
    }
  } catch {
    return DEFAULT
  }
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
      return { ...d, sessions }
    })
  }, [])

  const deleteSession = useCallback((id: string) => {
    setData((d) => ({ ...d, sessions: d.sessions.filter((x) => x.id !== id) }))
  }, [])

  const setWeeklyGoal = useCallback((weeklyGoal: number) => {
    setData((d) => ({ ...d, settings: { ...d.settings, weeklyGoal: Math.min(7, Math.max(1, weeklyGoal)) } }))
  }, [])

  return { ...data, upsertSession, deleteSession, setWeeklyGoal }
}
