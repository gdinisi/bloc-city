import { useCallback, useEffect, useRef, useState } from 'react'
import type { Data, SavedData } from './store'
import type { Profile } from './cloud'
import { computeStats, getMyProfile, pullData, pushAll } from './cloud'

export type SyncStatus = 'hors-ligne' | 'synchro' | 'ok' | 'erreur'

interface App extends Data {
  replaceAll: (saved: Partial<SavedData>, updatedAt: number) => void
}

/** Profil du joueur connecté (null tant qu'il n'a pas choisi de pseudo) */
export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loaded, setLoaded] = useState(false)
  const reload = useCallback(async () => {
    if (!userId) return
    try {
      setProfile(await getMyProfile(userId))
    } finally {
      setLoaded(true)
    }
  }, [userId])
  useEffect(() => {
    setProfile(null)
    setLoaded(false)
    if (userId) void reload().catch(() => undefined)
  }, [userId, reload])
  return { profile, setProfile, loaded, reload }
}

/**
 * Synchronisation avec le cloud :
 *  - à la connexion, la copie la plus récente gagne (téléphone neuf → on récupère tout) ;
 *  - ensuite, chaque modification est envoyée quelques secondes plus tard ;
 *  - hors connexion, l'app marche normalement et renvoie tout dès que possible.
 */
export function useCloudSync(app: App, userId: string | null, hasProfile: boolean) {
  const [status, setStatus] = useState<SyncStatus>('hors-ligne')
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const [pullTry, setPullTry] = useState(0)
  const syncedFor = useRef<string | null>(null)
  const latest = useRef(app)
  latest.current = app

  // 1. à la connexion : récupérer la copie du cloud si elle est plus récente
  useEffect(() => {
    syncedFor.current = null
    if (!userId) {
      setStatus('hors-ligne')
      return
    }
    let cancelled = false
    setStatus('synchro')
    pullData<Partial<SavedData>>(userId)
      .then((remote) => {
        if (cancelled) return
        const local = latest.current
        const localEmpty = local.sessions.length === 0 && local.city.placed.length === 0
        if (remote && (remote.updatedAt > local.updatedAt || localEmpty)) local.replaceAll(remote.data, remote.updatedAt)
        syncedFor.current = userId
        setTick((t) => t + 1)
      })
      .catch(() => !cancelled && setStatus('erreur'))
    return () => {
      cancelled = true
    }
  }, [userId, pullTry])

  // 2. envoyer les modifications (regroupées)
  useEffect(() => {
    if (!userId || syncedFor.current !== userId) return
    setStatus('synchro')
    const t = setTimeout(() => {
      const d = latest.current
      const payload: SavedData = { sessions: d.sessions, settings: d.settings, city: d.city }
      pushAll(userId, payload, d.updatedAt || Date.now(), d.city, computeStats(d.sessions, d.settings.weeklyGoal), hasProfile)
        .then(() => {
          setStatus('ok')
          setLastSync(Date.now())
        })
        .catch(() => setStatus('erreur'))
    }, 1500)
    return () => clearTimeout(t)
  }, [app.updatedAt, userId, hasProfile, tick])

  // 3. réessayer au retour du réseau
  useEffect(() => {
    const again = () => (syncedFor.current ? setTick((t) => t + 1) : setPullTry((t) => t + 1))
    window.addEventListener('online', again)
    return () => window.removeEventListener('online', again)
  }, [])

  return { status, lastSync }
}
