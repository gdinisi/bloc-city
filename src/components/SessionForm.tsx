import { useState } from 'react'
import type { Climb, ClimbStyle, Session, SessionType } from '../types'
import { GRADES, SESSION_TYPES } from '../types'
import { newId } from '../lib/store'

interface Props {
  date: string
  existing?: Session
  onSave: (s: Session) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

const DURATIONS = [15, 30, 45, 60, 90, 120]

const RPE_LABELS: Record<number, string> = {
  1: 'Très facile', 2: 'Facile', 3: 'Tranquille', 4: 'Modéré', 5: 'Correct',
  6: 'Soutenu', 7: 'Dur', 8: 'Très dur', 9: 'Presque max', 10: 'Maximal',
}

export function SessionForm({ date, existing, onSave, onDelete, onClose }: Props) {
  const [type, setType] = useState<SessionType>(existing?.type ?? 'salle')
  const [day, setDay] = useState(existing?.date ?? date)
  const [duration, setDuration] = useState(existing?.durationMin ?? 60)
  const [rpe, setRpe] = useState(existing?.rpe ?? 6)
  const [note, setNote] = useState(existing?.note ?? '')
  const [climbs, setClimbs] = useState<Climb[]>(existing?.climbs ?? [])
  const [style, setStyle] = useState<ClimbStyle>('bloc')
  const [grade, setGrade] = useState('6a')
  const [flash, setFlash] = useState(false)

  const isRest = type === 'repos'
  const canClimb = type === 'salle' || type === 'exterieur'

  const submit = () => {
    onSave({
      id: existing?.id ?? newId(),
      date: day,
      type,
      durationMin: isRest ? 0 : duration,
      rpe: isRest ? 0 : rpe,
      note: note.trim(),
      climbs: canClimb ? climbs : [],
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Séance" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2>{existing ? 'Modifier la séance' : 'Nouvelle séance'}</h2>

        <div className="type-grid">
          {SESSION_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`type-btn ${type === t.id ? 'on' : ''}`}
              style={{ '--tc': t.color } as React.CSSProperties}
              onClick={() => setType(t.id)}
            >
              <span className="type-emoji">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>

        <label className="field">
          <span>Date</span>
          <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
        </label>

        {!isRest && (
          <>
            <div className="field">
              <span>Durée</span>
              <div className="chips">
                {DURATIONS.map((d) => (
                  <button key={d} type="button" className={`chip ${duration === d ? 'on' : ''}`} onClick={() => setDuration(d)}>
                    {d < 60 ? `${d} min` : `${Math.floor(d / 60)}h${d % 60 ? String(d % 60) : ''}`}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span>
                Ressenti : <b>{rpe}/10</b> · {RPE_LABELS[rpe]}
              </span>
              <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} />
            </label>
          </>
        )}

        {canClimb && (
          <div className="field">
            <span>Blocs / voies réussis (optionnel)</span>
            <div className="climb-add">
              <div className="seg">
                {(['bloc', 'voie'] as ClimbStyle[]).map((s) => (
                  <button key={s} type="button" className={style === s ? 'on' : ''} onClick={() => setStyle(s)}>
                    {s === 'bloc' ? 'Bloc' : 'Voie'}
                  </button>
                ))}
              </div>
              <select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Cotation">
                {GRADES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <label className="flash">
                <input type="checkbox" checked={flash} onChange={(e) => setFlash(e.target.checked)} /> Flash
              </label>
              <button type="button" className="btn small" onClick={() => setClimbs([...climbs, { style, grade, flash }])}>
                + Ajouter
              </button>
            </div>
            {climbs.length > 0 && (
              <div className="chips">
                {climbs.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className="chip climb"
                    title="Retirer"
                    onClick={() => setClimbs(climbs.filter((_, j) => j !== i))}
                  >
                    {c.style === 'bloc' ? '🪨' : '🧵'} {c.grade}
                    {c.flash ? ' ⚡' : ''} ✕
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <label className="field">
          <span>Note</span>
          <textarea rows={2} value={note} placeholder="Ce qui a marché, douleurs, envies…" onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className="sheet-actions">
          {existing && onDelete && (
            <button
              type="button"
              className="btn ghost danger"
              onClick={() => {
                if (confirm('Supprimer cette séance ?')) onDelete(existing.id)
              }}
            >
              Supprimer
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn primary" onClick={submit}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
