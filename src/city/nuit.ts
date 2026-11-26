import { useEffect, useState } from 'react'

/** Ville de jour ou de nuit : automatique selon l'heure, ou forcé par le joueur (mémorisé sur l'appareil) */
export type ModeNuit = 'auto' | 'jour' | 'nuit'

const CLE = 'blocCity.villeNuit'
/** La nuit tombe à 20 h et se lève à 7 h */
export const estNuit = (d = new Date()) => d.getHours() >= 20 || d.getHours() < 7

const lire = (): ModeNuit => {
  try {
    const v = localStorage.getItem(CLE)
    return v === 'jour' || v === 'nuit' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

export function useModeNuit() {
  const [mode, setModeState] = useState<ModeNuit>(lire)
  const [heureNuit, setHeureNuit] = useState(() => estNuit())
  useEffect(() => {
    const t = setInterval(() => setHeureNuit(estNuit()), 60000)
    return () => clearInterval(t)
  }, [])
  const setMode = (m: ModeNuit) => {
    setModeState(m)
    try {
      localStorage.setItem(CLE, m)
    } catch {
      /* stockage indisponible : le choix vaut pour la session */
    }
  }
  /** Auto → Jour → Nuit → Auto */
  const suivant = () => setMode(mode === 'auto' ? 'jour' : mode === 'jour' ? 'nuit' : 'auto')
  const nuit = mode === 'nuit' || (mode === 'auto' && heureNuit)
  return { mode, nuit, suivant }
}
