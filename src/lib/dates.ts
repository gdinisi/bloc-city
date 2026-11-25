const pad = (n: number) => String(n).padStart(2, '0')

/** Date locale -> "YYYY-MM-DD" */
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** "YYYY-MM-DD" -> Date locale à midi (évite les soucis d'heure d'été) */
export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export const addDays = (d: Date, n: number) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** Lundi de la semaine contenant d */
export const startOfWeek = (d: Date) => {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
  const day = (r.getDay() + 6) % 7 // lundi = 0
  return addDays(r, -day)
}

export const weekKey = (d: Date) => toKey(startOfWeek(d))

/** Semaines (lundi -> dimanche) couvrant le mois donné */
export const monthGrid = (year: number, month: number): Date[][] => {
  const first = new Date(year, month, 1, 12)
  let cur = startOfWeek(first)
  const weeks: Date[][] = []
  do {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(cur)
      cur = addDays(cur, 1)
    }
    weeks.push(week)
  } while (cur.getMonth() === month)
  return weeks
}

export const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export const formatLongDate = (k: string) =>
  fromKey(k).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
