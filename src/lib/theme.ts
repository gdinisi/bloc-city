import { useEffect, useState } from 'react'

/*
 * Mode sombre ou clair, choisi par l'utilisateur et gardé sur l'appareil.
 * Le thème est posé sur <html data-theme="…"> avant le premier affichage
 * (voir applyTheme dans main.tsx) pour éviter un flash de la mauvaise couleur.
 */

export type Theme = 'sombre' | 'clair'

const KEY = 'blocCity.theme'
const BAR: Record<Theme, string> = { sombre: '#0d0e10', clair: '#ffffff' }

export function savedTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'clair' ? 'clair' : 'sombre'
  } catch {
    return 'sombre'
  }
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t === 'clair' ? 'light' : 'dark'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR[t])
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(savedTheme)
  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* stockage indisponible : le choix vaut pour cette visite */
    }
  }, [theme])
  return [theme, setTheme] as const
}
