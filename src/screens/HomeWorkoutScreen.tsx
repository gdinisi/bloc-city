import { useMemo, useState } from 'react'
import type { Session, Settings } from '../types'
import { EQUIPMENT } from '../workout/catalog'
import type { Equipment } from '../workout/catalog'
import type { Phase, Plan } from '../workout/generator'
import { DURATIONS, FATIGUES, FOCUSES, availableFocuses, formatPrescription, generatePlan } from '../workout/generator'
import { unlockAudio } from '../workout/sound'
import { Player } from '../workout/Player'

interface Props {
  settings: Settings
  onSettings: (patch: Partial<Settings>) => void
  onSave: (s: Session) => void
}

const PHASE_LABEL: Record<Phase, string> = {
  echauffement: 'Échauffement',
  principal: 'Corps de séance',
  retour: 'Retour au calme',
}

export function HomeWorkoutScreen({ settings, onSettings, onSave }: Props) {
  const { equipment, home } = settings
  const [seed, setSeed] = useState(() => Date.now() % 100000)
  const [playing, setPlaying] = useState<Plan | null>(null)

  const focuses = availableFocuses(equipment)
  const focus = focuses.some((f) => f.id === home.focus) ? home.focus : 'complet'

  const plan = useMemo(
    () => generatePlan({ minutes: home.minutes, fatigue: home.fatigue, focus, equipment, seed }),
    [home.minutes, home.fatigue, focus, equipment, seed],
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
      <section className="card">
        <h2>Ton matériel</h2>
        <p className="muted small-text">Les séances s'adaptent à ce que tu as. Rien de coché = poids du corps.</p>
        <div className="chips">
          {EQUIPMENT.map((e) => (
            <button key={e.id} type="button" className={`chip ${equipment.includes(e.id) ? 'on' : ''}`} onClick={() => toggleEquipment(e.id)}>
              {e.emoji} {e.label}
            </button>
          ))}
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
                  <b>{f.label}</b>
                  <span>{enabled ? f.hint : 'Poutre ou élastique requis'}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="day-head">
          <h2>Ta séance</h2>
          <span className="pill">≈ {Math.round(plan.estimated / 60)} min</span>
        </div>
        {groups.map((g) => (
          <div key={g.phase} className="plan-group">
            <div className="plan-phase">{PHASE_LABEL[g.phase]}</div>
            <ol className="plan-list">
              {g.items.map((it) => (
                <li key={it.ex.id}>
                  <span>{it.ex.name}</span>
                  <span className="muted">{formatPrescription(it)}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
        {home.fatigue === 'fatigue' && <p className="muted small-text">Fatigué : séance allégée, sans travail intense des doigts.</p>}
        <div className="plan-actions">
          <button type="button" className="btn" onClick={() => setSeed((s) => s + 1)}>
            🎲 Autre proposition
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              unlockAudio()
              setPlaying(plan)
            }}
          >
            ▶ C'est parti
          </button>
        </div>
      </section>

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
