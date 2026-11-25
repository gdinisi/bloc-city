import { useMemo, useState } from 'react'
import type { Session } from '../types'
import { typeInfo } from '../types'
import { MONTHS, WEEKDAYS_SHORT, formatLongDate, monthGrid, toKey, weekKey } from '../lib/dates'
import { bestGrade, countsByWeek, recentBlocLevels, weeklyStreak } from '../lib/stats'
import { formatHours } from '../lib/periodStats'
import { SessionForm } from '../components/SessionForm'

interface Props {
  sessions: Session[]
  weeklyGoal: number
  onGoalChange: (g: number) => void
  onSave: (s: Session) => void
  onDelete: (id: string) => void
}

export function CalendarScreen({ sessions, weeklyGoal, onGoalChange, onSave, onDelete }: Props) {
  const today = new Date()
  const todayKey = toKey(today)
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [selected, setSelected] = useState(todayKey)
  const [editing, setEditing] = useState<Session | 'new' | null>(null)

  const byDay = useMemo(() => {
    const m = new Map<string, Session[]>()
    for (const s of sessions) m.set(s.date, [...(m.get(s.date) ?? []), s])
    return m
  }, [sessions])

  const thisWeek = countsByWeek(sessions).get(weekKey(today)) ?? 0
  const streak = weeklyStreak(sessions, weeklyGoal, today)
  const best = bestGrade(sessions)
  const progress = Math.min(1, thisWeek / weeklyGoal)

  const weeks = monthGrid(view.y, view.m)
  const shiftMonth = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }

  const daySessions = byDay.get(selected) ?? []

  return (
    <div className="screen">
      <section className="card">
        <div className="month-nav">
          <button type="button" className="round" aria-label="Mois précédent" onClick={() => shiftMonth(-1)}>
            ‹
          </button>
          <h2>
            {MONTHS[view.m]} {view.y}
          </h2>
          <button type="button" className="round" aria-label="Mois suivant" onClick={() => shiftMonth(1)}>
            ›
          </button>
        </div>
        <div className="grid">
          {WEEKDAYS_SHORT.map((d, i) => (
            <div key={i} className="wd">
              {d}
            </div>
          ))}
          {weeks.flat().map((d) => {
            const k = toKey(d)
            const list = byDay.get(k) ?? []
            const main = list.find((s) => s.type !== 'repos') ?? list[0]
            const cls = [
              'day',
              d.getMonth() !== view.m && 'out',
              k === todayKey && 'today',
              k === selected && 'sel',
              main && 'has',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={k}
                type="button"
                className={cls}
                style={main ? ({ '--tc': typeInfo(main.type).color } as React.CSSProperties) : undefined}
                onClick={() => setSelected(k)}
              >
                <span>{d.getDate()}</span>
                {list.length > 1 && <i className="dots">{list.length}</i>}
              </button>
            )
          })}
        </div>
        <div className="legend">
          {(['salle', 'maison', 'exterieur', 'repos'] as const).map((t) => (
            <span key={t}>
              <i style={{ background: typeInfo(t).color }} /> {typeInfo(t).label}
            </span>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="day-head">
          <h2 className="cap">{formatLongDate(selected)}</h2>
          <button type="button" className="btn primary small" onClick={() => setEditing('new')}>
            + Séance
          </button>
        </div>
        {daySessions.length === 0 ? (
          <p className="muted empty">Rien ce jour-là. Un petit gainage ?</p>
        ) : (
          <ul className="sessions">
            {daySessions.map((s) => {
              const t = typeInfo(s.type)
              return (
                <li key={s.id}>
                  <button type="button" className="session" style={{ '--tc': t.color } as React.CSSProperties} onClick={() => setEditing(s)}>
                    <span className="s-emoji">{t.emoji}</span>
                    <span className="s-body">
                      <span>
                        <b>{t.label}</b>
                        {s.type !== 'repos' && (
                          <span className="muted">
                            {' '}
                            · {formatHours(s.durationMin)} · RPE {s.rpe}
                          </span>
                        )}
                      </span>
                      {s.climbs.length > 0 && (
                        <span className="s-climbs">
                          {s.climbs.map((c) => c.grade + (c.flash ? '⚡' : '')).join(' · ')}
                        </span>
                      )}
                      {s.note && <span className="s-note">{s.note}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="card hero goal-card">
        <div className="hero-top">
          <div>
            <div className="muted">Cette semaine</div>
            <div className="big">
              {thisWeek}
              <span className="of">/{weeklyGoal} séances</span>
            </div>
          </div>
          <div className="streak" title="Semaines d'affilée à l'objectif">
            <span className="streak-fire">🔥</span>
            <b>{streak}</b>
            <span className="muted">sem.</span>
          </div>
        </div>
        <div className="bar">
          <div className="bar-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="hero-bottom">
          <div className="goal">
            Objectif
            <button type="button" className="round" aria-label="Diminuer l'objectif" onClick={() => onGoalChange(weeklyGoal - 1)}>
              −
            </button>
            <b>{weeklyGoal}</b>
            <button type="button" className="round" aria-label="Augmenter l'objectif" onClick={() => onGoalChange(weeklyGoal + 1)}>
              +
            </button>
            / sem.
          </div>
          {best && <div className="muted">Meilleure cotation : <b>{best}</b></div>}
        </div>
        {thisWeek >= weeklyGoal && <div className="cheer">Objectif atteint, la série continue ! Les jours de repos ne la cassent pas.</div>}
      </section>

      {editing && (
        <SessionForm
          date={selected}
          existing={editing === 'new' ? undefined : editing}
          blocLevels={recentBlocLevels(sessions)}
          onClose={() => setEditing(null)}
          onSave={(s) => {
            onSave(s)
            setSelected(s.date)
            setEditing(null)
          }}
          onDelete={(id) => {
            onDelete(id)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
