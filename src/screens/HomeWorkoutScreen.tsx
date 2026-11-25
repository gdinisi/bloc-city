import { useMemo, useState } from 'react'
import type { Session, Settings } from '../types'
import { EQUIPMENT } from '../workout/catalog'
import type { Equipment, Exercise } from '../workout/catalog'
import { ExerciseSheet } from '../workout/ExerciseSheet'
import { ExerciseLibrary } from '../workout/ExerciseLibrary'
import type { Phase, Plan } from '../workout/generator'
import { DURATIONS, FATIGUES, FOCUSES, availableFocuses, formatPrescription, generatePlan } from '../workout/generator'
import { unlockAudio } from '../workout/sound'
import { Player } from '../workout/Player'
import { LEVEL_MAX, computeLevel, levelLabel } from '../workout/level'
import { MountainArt } from '../ui/MountainArt'
import { Icon } from '../ui/Icon'
import { FOCUS_ART } from './HomeScreen'

interface Props {
  sessions: Session[]
  settings: Settings
  onSettings: (patch: Partial<Settings>) => void
  onSave: (s: Session) => void
}

const PHASE_LABEL: Record<Phase, string> = {
  echauffement: 'Échauffement',
  principal: 'Corps de séance',
  retour: 'Retour au calme',
}

export function HomeWorkoutScreen({ sessions, settings, onSettings, onSave }: Props) {
  const { equipment, home } = settings
  const [seed, setSeed] = useState(() => Date.now() % 100000)
  const [playing, setPlaying] = useState<Plan | null>(null)
  const [info, setInfo] = useState<Exercise | null>(null)
  const [library, setLibrary] = useState(false)
  const [why, setWhy] = useState(false)

  const focuses = availableFocuses(equipment)
  const focus = focuses.some((f) => f.id === home.focus) ? home.focus : 'complet'
  const lvl = useMemo(() => computeLevel(sessions, home.fatigue), [sessions, home.fatigue])

  const plan = useMemo(
    () => generatePlan({ minutes: home.minutes, fatigue: home.fatigue, focus, equipment, seed, level: lvl.today }),
    [home.minutes, home.fatigue, focus, equipment, seed, lvl.today],
  )

  const toggleEquipment = (id: Equipment) =>
    onSettings({ equipment: equipment.includes(id) ? equipment.filter((e) => e !== id) : [...equipment, id] })
  const setHome = (patch: Partial<Settings['home']>) => onSettings({ home: { ...home, ...patch } })

  // Regroupe les exercices par phase pour l'aperçu
  const groups = plan.items.reduce<{ phase: Phase; items: Plan['items'] }[]>((acc, it) => {
    const last = acc[acc.length - 1]
    if (last && last.phase === it.phase) last.items.push(it)
    else acc.push({ phase: it.phase, items: [it] })
    return acc
  }, [])

  return (
    <div className="screen">
      <section className="workout-hero">
        <MountainArt variant={FOCUS_ART[focus]} seed={seed % 9} />
        <div className="workout-hero-body">
          <span className="reco-tag static">
            <Icon name="bolt" size={13} stroke={2} />
            {FOCUSES.find((f) => f.id === focus)?.label}
          </span>
          <h2>Séance du jour</h2>
          <div className="workout-meta">
            <span>
              <Icon name="clock" size={15} /> ≈ {Math.round(plan.estimated / 60)} min
            </span>
            <span>
              <Icon name="mountain" size={15} /> Niveau {lvl.today}
            </span>
            <span>
              <Icon name="flame" size={15} /> {levelLabel(lvl.today)}
            </span>
          </div>
          <div className="workout-hero-actions">
            <button
              type="button"
              className="btn grad"
              onClick={() => {
                unlockAudio()
                setPlaying(plan)
              }}
            >
              <Icon name="play" fill size={16} /> Démarrer
            </button>
            <button type="button" className="btn icon-only" aria-label="Autre proposition" onClick={() => setSeed((s) => s + 1)}>
              <Icon name="dice" size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="card setup">
        <div className="field">
          <span>Temps dispo</span>
          <div className="seg wide">
            {DURATIONS.map((m) => (
              <button key={m} type="button" className={home.minutes === m ? 'on' : ''} onClick={() => setHome({ minutes: m })}>
                {m} min
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Comment tu te sens ?</span>
          <div className="seg wide">
            {FATIGUES.map((f) => (
              <button key={f.id} type="button" className={home.fatigue === f.id ? 'on' : ''} onClick={() => setHome({ fatigue: f.id })}>
                {f.emoji} {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Objectif</span>
          <div className="focus-grid">
            {FOCUSES.map((f) => {
              const enabled = focuses.some((x) => x.id === f.id)
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={!enabled}
                  className={`focus-btn ${focus === f.id ? 'on' : ''}`}
                  onClick={() => setHome({ focus: f.id })}
                >
                  <MountainArt variant={FOCUS_ART[f.id]} seed={3} className="focus-art" />
                  <b>{f.label}</b>
                  <span>{enabled ? f.hint : 'Poutre ou élastique requis'}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <details className="card fold">
        <summary>
          <span className="fold-icon">
            <Icon name="hold" size={20} />
          </span>
          <span className="fold-title">
            <b>Ta séance</b>
            <small>
              {plan.items.length} exercices · ≈ {Math.round(plan.estimated / 60)} min
            </small>
          </span>
          <Icon name="chevron" size={18} className="fold-chevron" />
        </summary>
        <button type="button" className="level-card" onClick={() => setWhy((w) => !w)} aria-expanded={why}>
          <span className="level-top">
            <span>
              Niveau <b>{lvl.today}</b>/{LEVEL_MAX} · {levelLabel(lvl.today)}
            </span>
            <span className="muted">{why ? 'Masquer' : 'Pourquoi ?'}</span>
          </span>
          <span className="level-bar" aria-hidden="true">
            {Array.from({ length: LEVEL_MAX }, (_, i) => (
              <i key={i} className={i < lvl.today ? 'on' : ''} />
            ))}
          </span>
          {why && (
            <span className="level-why">
              {lvl.reasons.map((r) => (
                <span key={r}>• {r}</span>
              ))}
              <span>• Le niveau règle le choix des exercices, le nombre de séries, les répétitions et la durée des pauses.</span>
            </span>
          )}
        </button>
        {groups.map((g) => (
          <div key={g.phase} className="plan-group">
            <div className="plan-phase">{PHASE_LABEL[g.phase]}</div>
            <ol className="plan-list">
              {g.items.map((it) => (
                <li key={it.ex.id}>
                  <button type="button" className="plan-item" onClick={() => setInfo(it.ex)}>
                    <span className="plan-text">
                      <span className="plan-name">{it.ex.name}</span>
                      <span className="muted">{formatPrescription(it)}</span>
                    </span>
                    <span className="info-btn" aria-label={`Comment faire : ${it.ex.name}`}>
                      i
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ))}
        <p className="muted small-text">Touche un exercice pour voir comment le faire.</p>
        {home.fatigue === 'fatigue' &&<p className="muted small-text">Fatigué : séance allégée, sans travail intense des doigts.</p>}
        <div className="plan-actions">
          <button type="button" className="btn" onClick={() => setSeed((s) => s + 1)}>
            <Icon name="dice" size={17} /> Autre
          </button>
          <button
            type="button"
            className="btn grad"
            onClick={() => {
              unlockAudio()
              setPlaying(plan)
            }}
          >
            <Icon name="play" fill size={15} /> C'est parti
          </button>
        </div>
      </details>

      <button type="button" className="card library-link" onClick={() => setLibrary(true)}>
        <span className="library-link-emoji">
          <Icon name="book" size={22} />
        </span>
        <span>
          <b>Fiches exercices</b>
          <span className="muted">Tous les exercices expliqués, avec animation</span>
        </span>
        <span className="library-link-arrow">›</span>
      </button>

      <details className="card fold">
        <summary>
          <span className="fold-icon">
            <Icon name="settings" size={20} />
          </span>
          <span className="fold-title">
            <b>Ton matériel</b>
            <small>{equipment.length ? EQUIPMENT.filter((e) => equipment.includes(e.id)).map((e) => e.label).join(', ') : 'Poids du corps'}</small>
          </span>
          <Icon name="chevron" size={18} className="fold-chevron" />
        </summary>
        <p className="muted small-text">Les séances s'adaptent à ce que tu as. Rien de coché = poids du corps.</p>
        <div className="chips">
          {EQUIPMENT.map((e) => (
            <button key={e.id} type="button" className={`chip ${equipment.includes(e.id) ? 'on' : ''}`} onClick={() => toggleEquipment(e.id)}>
              {e.emoji} {e.label}
            </button>
          ))}
        </div>
      </details>

      {info && <ExerciseSheet ex={info} onClose={() => setInfo(null)} />}

      {library && <ExerciseLibrary equipment={equipment} onClose={() => setLibrary(false)} />}

      {playing && (
        <Player
          plan={playing}
          onSave={onSave}
          onClose={() => {
            setPlaying(null)
            setSeed((s) => s + 1)
          }}
        />
      )}
    </div>
  )
}
