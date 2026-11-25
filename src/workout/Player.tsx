import { useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '../types'
import { toKey } from '../lib/dates'
import { newId } from '../lib/store'
import type { Plan } from './generator'
import { FOCUSES, buildSteps } from './generator'
import { beep, buzz } from './sound'
import { sessionDelta } from './level'
import { ExerciseFigure, hasAnim } from './Figure'
import { ExerciseSheet } from './ExerciseSheet'

interface Props {
  plan: Plan
  onSave: (s: Session) => void
  onClose: () => void
}

const DEFAULT_RPE = { fatigue: 5, normal: 6, frais: 7 } as const

/** Part minimale du temps prévu à passer pour que la séance soit validée */
const MIN_RATIO = 0.4

type WakeLockLike = { release: () => Promise<void> }

export function Player({ plan, onSave, onClose }: Props) {
  const steps = useMemo(() => buildSteps(plan), [plan])
  const [idx, setIdx] = useState(0)
  const [remaining, setRemaining] = useState(steps[0]?.seconds ?? 0)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState<Session | null>(null)
  const [tooShort, setTooShort] = useState(false)
  /** Fiche ouverte ; on retient si le minuteur tournait pour le relancer à la fermeture */
  const [info, setInfo] = useState<{ resume: boolean } | null>(null)

  const elapsed = useRef(0)
  const lastTick = useRef(performance.now())
  const lastBeep = useRef<number | null>(null)

  const step = steps[idx]
  const workSteps = steps.filter((s) => s.kind === 'work').length
  const workDone = steps.slice(0, idx).filter((s) => s.kind === 'work').length

  // Garde l'écran allumé pendant la séance
  useEffect(() => {
    let lock: WakeLockLike | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockLike> } }
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => {
      void lock?.release().catch(() => {})
    }
  }, [])

  const finish = () => {
    // Séance passée en accéléré : pas validée (le classement doit rester honnête)
    if (elapsed.current < plan.estimated * MIN_RATIO) {
      setTooShort(true)
      return
    }
    const minutes = Math.max(1, Math.round(elapsed.current / 60))
    const focusLabel = FOCUSES.find((f) => f.id === plan.focus)?.label ?? ''
    const session: Session = {
      id: newId(),
      date: toKey(new Date()),
      type: 'maison',
      durationMin: minutes,
      rpe: DEFAULT_RPE[plan.fatigue],
      note: `Séance guidée ${focusLabel.toLowerCase()} : ${plan.items.filter((i) => i.phase === 'principal').map((i) => i.ex.name).join(', ')}`,
      climbs: [],
      createdAt: new Date().toISOString(),
      guided: { level: plan.level, completion: Math.min(1, elapsed.current / plan.estimated) },
    }
    onSave(session) // validée automatiquement
    setDone(session)
    beep(880, 160)
    setTimeout(() => beep(1175, 260), 180)
    buzz([100, 60, 200])
  }

  const goTo = (i: number) => {
    if (i >= steps.length) {
      finish()
      return
    }
    const s = steps[Math.max(0, i)]
    setIdx(Math.max(0, i))
    setRemaining(s.seconds ?? 0)
    lastBeep.current = null
    if (s.kind === 'work') {
      beep(990, 180)
      buzz(150)
    }
  }

  // Horloge : compte le temps réel et fait avancer les étapes chronométrées
  useEffect(() => {
    if (done) return
    lastTick.current = performance.now()
    const t = setInterval(() => {
      const now = performance.now()
      const dt = (now - lastTick.current) / 1000
      lastTick.current = now
      if (paused) return
      elapsed.current += dt
      if (step?.seconds === undefined) return
      setRemaining((r) => Math.max(0, r - dt))
    }, 200)
    return () => clearInterval(t)
  }, [paused, done, step])

  // Bips 3-2-1 et passage automatique à l'étape suivante
  useEffect(() => {
    if (done || paused || step?.seconds === undefined) return
    const whole = Math.ceil(remaining)
    if (remaining <= 0) {
      goTo(idx + 1)
      return
    }
    if (whole <= 3 && whole !== lastBeep.current) {
      lastBeep.current = whole
      beep(660, 110)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining])

  if (done) {
    return <Finished session={done} onSave={onSave} onClose={onClose} />
  }

  if (tooShort) {
    return (
      <div className="player finished">
        <div className="player-body">
          <div className="trophy">⏩</div>
          <h2 className="player-title">Séance trop rapide</h2>
          <p className="player-cue">
            Tu as passé moins de {Math.round(MIN_RATIO * 100)} % du temps prévu, elle n'est donc pas validée. Tu peux toujours
            l'ajouter à la main depuis le calendrier.
          </p>
        </div>
        <div className="player-controls">
          <button type="button" className="btn primary huge" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    )
  }

  const total = step.seconds ?? 0
  const ratio = total ? remaining / total : 1
  const R = 88
  const C = 2 * Math.PI * R
  const ex = plan.items[step.item].ex
  // Pendant la préparation et les repos : on montre l'exercice qui arrive
  const showFigure = step.kind !== 'work' && hasAnim(ex.id)

  const openInfo = () => {
    setInfo({ resume: !paused })
    setPaused(true)
  }

  return (
    <div className={`player ${step.kind} ${showFigure ? 'with-figure' : ''}`}>
      <div className="player-top">
        <button
          type="button"
          className="round"
          aria-label="Quitter la séance"
          onClick={() => {
            if (confirm('Quitter la séance ? Elle ne sera pas enregistrée.')) onClose()
          }}
        >
          ✕
        </button>
        <div className="player-progress">
          <div style={{ width: `${(workDone / workSteps) * 100}%` }} />
        </div>
        <span className="player-count">
          {workDone}/{workSteps}
        </span>
      </div>

      <div className="player-body">
        <div className="player-kind">{step.kind === 'work' ? step.label || 'À toi !' : step.label}</div>
        <h2 className="player-title">{step.kind === 'work' ? step.title : step.next ?? step.title}</h2>
        <button type="button" className="how-btn" onClick={openInfo}>
          <span className="info-btn">i</span> Comment faire ?
        </button>
        {showFigure && <ExerciseFigure id={ex.id} size="small" />}

        {step.seconds !== undefined ? (
          <div className="ring">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r={R} className="ring-bg" />
              <circle
                cx="100"
                cy="100"
                r={R}
                className="ring-fg"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - ratio)}
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div className="ring-text">
              <b>{Math.ceil(remaining)}</b>
              <span>{step.kind === 'work' ? 'secondes' : step.kind === 'prep' ? 'prêt ?' : 'repos'}</span>
            </div>
          </div>
        ) : (
          <div className="reps">
            <b>{step.reps}</b>
            <span>répétitions</span>
          </div>
        )}

        <p className="player-cue">{step.cue}</p>
      </div>

      {info && (
        <ExerciseSheet
          ex={ex}
          onClose={() => {
            if (info.resume) setPaused(false)
            setInfo(null)
          }}
        />
      )}

      <div className="player-controls">
        <button type="button" className="round big" aria-label="Étape précédente" onClick={() => goTo(idx - 1)}>
          ⏮
        </button>
        {step.seconds === undefined ? (
          <button type="button" className="btn primary huge" onClick={() => goTo(idx + 1)}>
            ✓ Fait
          </button>
        ) : (
          <button type="button" className="btn primary huge" onClick={() => setPaused((p) => !p)}>
            {paused ? '▶ Reprendre' : '⏸ Pause'}
          </button>
        )}
        <button type="button" className="round big" aria-label="Étape suivante" onClick={() => goTo(idx + 1)}>
          ⏭
        </button>
      </div>
    </div>
  )
}

const RPE_HINTS: Record<number, string> = {
  1: 'Très facile', 2: 'Facile', 3: 'Tranquille', 4: 'Modéré', 5: 'Correct',
  6: 'Soutenu', 7: 'Dur mais bien', 8: 'Très dur', 9: 'Presque à bloc', 10: 'À bloc',
}

function Finished({ session, onSave, onClose }: { session: Session; onSave: (s: Session) => void; onClose: () => void }) {
  const [rpe, setRpe] = useState(session.rpe)
  const delta = sessionDelta(rpe, session.guided?.completion ?? 1)
  const next =
    delta >= 0.7
      ? { icon: '⬆️', text: 'Trop facile : la prochaine séance sera nettement plus physique.' }
      : delta > 0
        ? { icon: '↗️', text: 'Bon dosage : la prochaine montera légèrement en intensité.' }
        : delta > -0.5
          ? { icon: '➡️', text: 'Bien chargé : on garde ce niveau la prochaine fois.' }
          : { icon: '⬇️', text: 'Trop dur : la prochaine sera plus douce, avec plus de repos.' }
  return (
    <div className="player finished">
      <div className="player-body">
        <div className="trophy">🎉</div>
        <h2 className="player-title">Séance validée !</h2>
        <p className="player-cue">
          {session.durationMin} min ajoutées à ton calendrier.
          <br />
          Bientôt, chaque séance t'offrira un pack de bâtiments pour ta ville.
        </p>
        <label className="field finished-rpe">
          <span>
            Comment c'était ? <b>{rpe}/10</b> · {RPE_HINTS[rpe]}
          </span>
          <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} />
        </label>
        <p className="next-level">
          <span>{next.icon}</span> {next.text}
        </p>
      </div>
      <div className="player-controls">
        <button
          type="button"
          className="btn primary huge"
          onClick={() => {
            if (rpe !== session.rpe) onSave({ ...session, rpe })
            onClose()
          }}
        >
          Terminer
        </button>
      </div>
    </div>
  )
}
