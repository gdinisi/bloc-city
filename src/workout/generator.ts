import type { Category, Equipment, Exercise } from './catalog'
import { EXERCISES } from './catalog'
import { levelParams } from './level'

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
  /** Effort par série, ajusté au niveau : durée (s)… */
  work?: number
  /** …ou répétitions */
  reps?: number
  /** Repos entre les séries (s), ajusté au niveau */
  rest: number
  /** Récupération avant l'exercice suivant (secondes) */
  restAfter: number
}

export interface Plan {
  items: PlanItem[]
  /** Durée estimée en secondes */
  estimated: number
  focus: Focus
  fatigue: Fatigue
  /** Niveau appliqué (1 à 10) */
  level: number
}

export interface GenOptions {
  minutes: number
  fatigue: Fatigue
  focus: Focus
  equipment: Equipment[]
  seed: number
  /** Niveau du jour (1 à 10), voir level.ts */
  level: number
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
/**
 * Pause de la séance (entre les exercices et entre les séries) : la même du début à la fin,
 * réglée sur la difficulté du jour — 40 s pour la séance la plus douce, 10 s pour la plus intense.
 */
export const PAUSE_MAX = 40
export const PAUSE_MIN = 10
export const pauseDuNiveau = (level: number) =>
  Math.min(PAUSE_MAX, Math.max(PAUSE_MIN, Math.round((PAUSE_MAX - ((level - 1) * (PAUSE_MAX - PAUSE_MIN)) / 9) / 5) * 5))
/** Écran de mise en place au début de la séance (sans exercice) */
export const MISE_EN_PLACE = 30

export const setSeconds = (it: PlanItem) => it.work ?? (it.reps ?? 10) * REP_SECONDS

export const itemSeconds = (it: PlanItem) => {
  const sides = it.ex.perSide ? 2 : 1
  const rounds = it.ex.rounds ?? 1
  const efforts = it.sets * sides
  const perRound = efforts * setSeconds(it) + (efforts - 1) * it.rest
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

const round5 = (v: number) => Math.max(5, Math.round(v / 5) * 5)

export function generatePlan({ minutes, fatigue, focus, equipment, seed, level }: GenOptions): Plan {
  const lp = levelParams(level)
  const rand = mulberry32(seed)
  const shuffle = <T,>(arr: T[]) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  // Fatigué : jamais d'exercice intense, quel que soit le niveau
  const maxIntensity = focus === 'mobilite' ? 1 : fatigue === 'fatigue' ? 2 : lp.maxIntensity
  const has = (ex: Exercise) => ex.needs.every((n) => equipment.includes(n))
  const ok = (ex: Exercise) => has(ex) && ex.intensity <= maxIntensity
  const used = new Set<string>()
  const pick = (cat: Category): Exercise | undefined => {
    const pool = shuffle(EXERCISES.filter((e) => e.category === cat && ok(e) && !used.has(e.id)))
    // Niveau élevé : exercices plus physiques d'abord ; niveau bas : plus accessibles
    if (lp.prefer > 0) pool.sort((a, b) => b.intensity - a.intensity)
    if (lp.prefer < 0) pool.sort((a, b) => a.intensity - b.intensity)
    return pool[0]
  }

  /** Pause unique de la séance */
  const pause = pauseDuNiveau(level)
  /** Repos entre les séries : la pause de la séance, sauf les petits changements de côté (étirements)
   * et les protocoles de poutre, gardés tels quels pour la sécurité des tendons */
  const reposSeries = (ex: Exercise) => (ex.needs.includes('poutre') || ex.rest < 15 ? ex.rest : pause)

  /** Prescription d'un exercice adaptée au niveau */
  const prescribe = (ex: Exercise, phase: Phase): PlanItem => {
    const restAfter = pause
    const fingers = ex.needs.includes('poutre')
    // Étirements du retour au calme : durées fixes
    if (ex.category === 'mobilite') {
      return { ex, phase, sets: ex.sets, work: ex.work, reps: ex.reps, rest: ex.rest, restAfter }
    }
    // Échauffement : un peu plus long et plus de répétitions quand la séance est exigeante
    if (phase === 'echauffement') {
      return {
        ex,
        phase,
        sets: ex.sets,
        work: ex.work ? round5(ex.work * lp.volumeEchauffement) : undefined,
        reps: ex.reps ? Math.max(5, Math.round(ex.reps * lp.volumeEchauffement)) : undefined,
        rest: reposSeries(ex),
        restAfter,
      }
    }
    if (fingers) {
      // Poutre : durées et repos fixes (sécurité des tendons), seul le nombre de séries bouge
      return {
        ex,
        phase,
        sets: Math.max(1, ex.sets + (lp.setsDelta < 0 || fatigue === 'fatigue' ? -1 : 0)),
        work: ex.work,
        reps: ex.reps,
        rest: ex.rest,
        restAfter,
      }
    }
    return {
      ex,
      phase,
      sets: Math.max(1, ex.sets + (ex.sets > 1 ? lp.setsDelta : 0)),
      work: ex.work ? round5(ex.work * lp.volume) : undefined,
      reps: ex.reps ? Math.max(3, Math.round(ex.reps * lp.volume)) : undefined,
      rest: reposSeries(ex),
      restAfter,
    }
  }

  const nWarm = minutes <= 15 ? 2 : minutes <= 30 ? 3 : 4
  const nCool = nWarm

  const warm: PlanItem[] = []
  for (let i = 0; i < nWarm; i++) {
    const ex = pick('echauffement')
    if (!ex) break
    used.add(ex.id)
    warm.push(prescribe(ex, 'echauffement'))
  }

  const cool: PlanItem[] = []
  for (let i = 0; i < nCool; i++) {
    const ex = pick('mobilite')
    if (!ex) break
    used.add(ex.id)
    cool.push(prescribe(ex, 'retour'))
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
    const it = focus === 'mobilite' ? prescribe(ex, 'retour') : prescribe(ex, 'principal')
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
    estimated: items.reduce((s, it) => s + itemSeconds(it), 0) + MISE_EN_PLACE,
    focus,
    fatigue,
    level,
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
      // écran de mise en place, sans exercice : le temps de s'installer
      steps.push({
        kind: 'prep',
        item: 0,
        title: 'Mets-toi en place',
        cue: `Installe ton tapis et ton matériel, prends de l'eau. Premier exercice : ${ex.name}.`,
        seconds: MISE_EN_PLACE,
        label: 'La séance commence dans…',
        next: 'Mets-toi en place',
      })
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
            seconds: it.work,
            reps: it.work ? undefined : it.reps,
            label: parts.filter(Boolean).join(' · '),
          })
          const lastEffort = s === it.sets && si === sides.length - 1
          if (!lastEffort && it.rest > 0) {
            steps.push({ kind: 'rest', item: idx, title: 'Repos', cue: ex.name, seconds: it.rest, label: 'Récupère', next: ex.name })
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
  const effort = it.work ? `${it.work} s` : `${it.reps} reps`
  const side = ex.perSide ? ' par côté' : ''
  const rounds = ex.rounds && ex.rounds > 1 ? ` · ${ex.rounds} tours` : ''
  return it.sets > 1 ? `${it.sets} × ${effort}${side}${rounds}` : `${effort}${side}${rounds}`
}
