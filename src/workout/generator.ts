import type { Category, Equipment, Exercise } from './catalog'
import { EXERCISES } from './catalog'

export type Fatigue = 'fatigue' | 'normal' | 'frais'
export type Focus = 'complet' | 'gainage' | 'haut' | 'doigts' | 'mobilite'
export type Phase = 'echauffement' | 'principal' | 'retour'

export const FATIGUES: { id: Fatigue; label: string; emoji: string }[] = [
  { id: 'fatigue', label: 'Fatigué', emoji: '🥱' },
  { id: 'normal', label: 'Normal', emoji: '🙂' },
  { id: 'frais', label: 'En forme', emoji: '⚡' },
]

export const FOCUSES: { id: Focus; label: string; hint: string }[] = [
  { id: 'complet', label: 'Complet', hint: 'Un peu de tout' },
  { id: 'gainage', label: 'Gainage', hint: 'Abdos, dos, tenue du corps' },
  { id: 'haut', label: 'Haut du corps', hint: 'Tirage et antagonistes' },
  { id: 'doigts', label: 'Doigts', hint: 'Avant-bras et doigts' },
  { id: 'mobilite', label: 'Mobilité', hint: 'Hanches, épaules, récup' },
]

export const DURATIONS = [15, 30, 45] as const

export interface PlanItem {
  ex: Exercise
  sets: number
  phase: Phase
  /** Récupération avant l'exercice suivant (secondes) */
  restAfter: number
}

export interface Plan {
  items: PlanItem[]
  /** Durée estimée en secondes */
  estimated: number
  focus: Focus
  fatigue: Fatigue
}

export interface GenOptions {
  minutes: number
  fatigue: Fatigue
  focus: Focus
  equipment: Equipment[]
  seed: number
}

/** Générateur pseudo-aléatoire reproductible */
const mulberry32 = (a: number) => () => {
  a |= 0
  a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const REP_SECONDS = 3.5

export const setSeconds = (ex: Exercise) => ex.work ?? (ex.reps ?? 10) * REP_SECONDS

export const itemSeconds = (it: PlanItem) => {
  const sides = it.ex.perSide ? 2 : 1
  const rounds = it.ex.rounds ?? 1
  const efforts = it.sets * sides
  const perRound = efforts * setSeconds(it.ex) + (efforts - 1) * it.ex.rest
  return rounds * perRound + (rounds - 1) * (it.ex.roundRest ?? 0) + it.restAfter
}

/** Ordre des catégories pour la partie principale, selon le focus */
const PATTERNS: Record<Focus, Category[]> = {
  complet: ['tirage', 'gainage', 'antagonistes', 'jambes', 'gainage', 'doigts'],
  gainage: ['gainage', 'gainage', 'antagonistes', 'gainage', 'jambes'],
  haut: ['tirage', 'antagonistes', 'tirage', 'antagonistes', 'gainage'],
  doigts: ['doigts', 'antagonistes', 'doigts', 'tirage', 'gainage'],
  mobilite: ['mobilite', 'jambes', 'mobilite', 'gainage', 'mobilite'],
}

export const availableFocuses = (equipment: Equipment[]) =>
  FOCUSES.filter((f) => f.id !== 'doigts' || equipment.includes('poutre') || equipment.includes('elastique'))

export function generatePlan({ minutes, fatigue, focus, equipment, seed }: GenOptions): Plan {
  const rand = mulberry32(seed)
  const shuffle = <T,>(arr: T[]) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const maxIntensity = fatigue === 'fatigue' || focus === 'mobilite' ? (focus === 'mobilite' ? 1 : 2) : 3
  const has = (ex: Exercise) => ex.needs.every((n) => equipment.includes(n))
  const ok = (ex: Exercise) => has(ex) && ex.intensity <= maxIntensity
  const used = new Set<string>()
  const pick = (cat: Category): Exercise | undefined => {
    const pool = shuffle(EXERCISES.filter((e) => e.category === cat && ok(e) && !used.has(e.id)))
    // En forme : on privilégie les exercices les plus exigeants disponibles
    if (fatigue === 'frais') pool.sort((a, b) => b.intensity - a.intensity)
    return pool[0]
  }
  const adjustSets = (ex: Exercise) => {
    if (fatigue === 'fatigue') return Math.max(1, ex.sets - 1)
    if (fatigue === 'frais' && ex.category !== 'doigts' && ex.sets > 1) return ex.sets + 1
    return ex.sets
  }

  const nWarm = minutes <= 15 ? 2 : minutes <= 30 ? 3 : 4
  const nCool = nWarm

  const warm: PlanItem[] = []
  for (let i = 0; i < nWarm; i++) {
    const ex = pick('echauffement')
    if (!ex) break
    used.add(ex.id)
    warm.push({ ex, sets: ex.sets, phase: 'echauffement', restAfter: 10 })
  }

  const cool: PlanItem[] = []
  for (let i = 0; i < nCool; i++) {
    const ex = pick('mobilite')
    if (!ex) break
    used.add(ex.id)
    cool.push({ ex, sets: ex.sets, phase: 'retour', restAfter: 10 })
  }

  const total = minutes * 60
  let budget = total - [...warm, ...cool].reduce((s, it) => s + itemSeconds(it), 0)
  const main: PlanItem[] = []
  const pattern = PATTERNS[focus]
  let misses = 0
  for (let i = 0; misses < pattern.length * 2 && budget > 60; i++) {
    const cat = pattern[i % pattern.length]
    const ex = pick(cat)
    if (!ex) {
      misses++
      continue
    }
    const hard = ex.intensity === 3
    const it: PlanItem = {
      ex,
      sets: adjustSets(ex),
      phase: focus === 'mobilite' ? 'retour' : 'principal',
      restAfter: focus === 'mobilite' ? 10 : hard ? 90 : 45,
    }
    const cost = itemSeconds(it)
    // On accepte un léger dépassement plutôt que de laisser un gros trou
    if (cost > budget + 90) {
      misses++
      used.add(ex.id)
      continue
    }
    used.add(ex.id)
    main.push(it)
    budget -= cost
    misses = 0
  }

  const items = [...warm, ...main, ...cool]
  if (items.length) items[items.length - 1] = { ...items[items.length - 1], restAfter: 0 }
  return {
    items,
    estimated: items.reduce((s, it) => s + itemSeconds(it), 0) + 10,
    focus,
    fatigue,
  }
}

// ---------- Étapes du lecteur guidé ----------

export interface Step {
  kind: 'prep' | 'work' | 'rest'
  /** Index de l'exercice dans le plan */
  item: number
  title: string
  cue: string
  /** Durée (secondes) pour les étapes chronométrées */
  seconds?: number
  /** Répétitions pour les étapes à valider au doigt */
  reps?: number
  label: string
  /** Pour les repos : ce qui vient après */
  next?: string
}

export function buildSteps(plan: Plan): Step[] {
  const steps: Step[] = []
  plan.items.forEach((it, idx) => {
    const { ex } = it
    const sides: (string | null)[] = ex.perSide ? ['Gauche', 'Droite'] : [null]
    const rounds = ex.rounds ?? 1
    if (idx === 0) {
      steps.push({ kind: 'prep', item: 0, title: 'Prépare-toi', cue: ex.cue, seconds: 10, label: 'C\'est parti dans…', next: ex.name })
    }
    for (let r = 1; r <= rounds; r++) {
      for (let s = 1; s <= it.sets; s++) {
        sides.forEach((side, si) => {
          const parts = [it.sets > 1 ? `Série ${s}/${it.sets}` : null, rounds > 1 ? `Tour ${r}/${rounds}` : null, side]
          steps.push({
            kind: 'work',
            item: idx,
            title: ex.name,
            cue: ex.cue,
            seconds: ex.work,
            reps: ex.work ? undefined : ex.reps,
            label: parts.filter(Boolean).join(' · '),
          })
          const lastEffort = s === it.sets && si === sides.length - 1
          if (!lastEffort && ex.rest > 0) {
            steps.push({ kind: 'rest', item: idx, title: 'Repos', cue: ex.name, seconds: ex.rest, label: 'Récupère', next: ex.name })
          }
        })
      }
      if (r < rounds && ex.roundRest) {
        steps.push({ kind: 'rest', item: idx, title: 'Repos', cue: ex.name, seconds: ex.roundRest, label: `Avant le tour ${r + 1}`, next: ex.name })
      }
    }
    const nextItem = plan.items[idx + 1]
    if (nextItem && it.restAfter > 0) {
      steps.push({ kind: 'rest', item: idx + 1, title: 'Transition', cue: nextItem.ex.cue, seconds: it.restAfter, label: 'Prochain exercice', next: nextItem.ex.name })
    }
  })
  return steps
}

export const formatPrescription = (it: PlanItem) => {
  const { ex } = it
  const effort = ex.work ? `${ex.work} s` : `${ex.reps} reps`
  const side = ex.perSide ? ' par côté' : ''
  const rounds = ex.rounds && ex.rounds > 1 ? ` · ${ex.rounds} tours` : ''
  return it.sets > 1 ? `${it.sets} × ${effort}${side}${rounds}` : `${effort}${side}${rounds}`
}
