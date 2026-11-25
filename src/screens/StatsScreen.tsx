import { useMemo, useState } from 'react'
import type { Session } from '../types'
import { typeInfo } from '../types'
import type { Bucket, Period, PeriodKind } from '../lib/periodStats'
import { bestStreak, computeStats, formatHours, periodTitle } from '../lib/periodStats'
import { weeklyStreak } from '../lib/stats'
import { XpGrades } from '../ui/XpBar'

interface Props {
  sessions: Session[]
  weeklyGoal: number
}

const KINDS: { id: PeriodKind; label: string }[] = [
  { id: 'mois', label: 'Mois' },
  { id: 'annee', label: 'Année' },
  { id: 'total', label: 'Total' },
]

const TRAINING_TYPES = ['salle', 'maison', 'exterieur'] as const

export function StatsScreen({ sessions, weeklyGoal }: Props) {
  const now = new Date()
  const [period, setPeriod] = useState<Period>({ kind: 'mois', year: now.getFullYear(), month: now.getMonth() })
  const stats = useMemo(() => computeStats(sessions, period, weeklyGoal), [sessions, period, weeklyGoal])
  const best = useMemo(() => bestStreak(sessions, weeklyGoal), [sessions, weeklyGoal])
  const current = weeklyStreak(sessions, weeklyGoal)

  const shift = (delta: number) => {
    if (period.kind === 'mois') {
      const d = new Date(period.year, period.month + delta, 1)
      setPeriod({ ...period, year: d.getFullYear(), month: d.getMonth() })
    } else if (period.kind === 'annee') setPeriod({ ...period, year: period.year + delta })
  }
  const isCurrent =
    period.kind === 'total' ||
    (period.kind === 'annee' ? period.year >= now.getFullYear() : period.year > now.getFullYear() || (period.year === now.getFullYear() && period.month >= now.getMonth()))

  const typeTotal = TRAINING_TYPES.reduce((s, t) => s + stats.byType[t].sessions, 0)

  return (
    <div className="screen">
      <XpGrades sessions={sessions} />
      <section className="card stats-head">
        <div className="seg wide">
          {KINDS.map((k) => (
            <button key={k.id} type="button" className={period.kind === k.id ? 'on' : ''} onClick={() => setPeriod({ ...period, kind: k.id })}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="month-nav">
          {period.kind !== 'total' ? (
            <button type="button" className="round" aria-label="Période précédente" onClick={() => shift(-1)}>
              ‹
            </button>
          ) : (
            <span />
          )}
          <h2>{periodTitle(period)}</h2>
          {period.kind !== 'total' ? (
            <button type="button" className="round" aria-label="Période suivante" disabled={isCurrent} onClick={() => shift(1)}>
              ›
            </button>
          ) : (
            <span />
          )}
        </div>
      </section>

      <section className="tiles">
        <Tile value={String(stats.sessions)} label={stats.sessions > 1 ? 'séances' : 'séance'} />
        <Tile value={formatHours(stats.minutes)} label="d'entraînement" />
        <Tile value={String(stats.activeDays)} label={stats.activeDays > 1 ? 'jours actifs' : 'jour actif'} />
        <Tile value={stats.avgRpe === null ? '–' : stats.avgRpe.toFixed(1)} label="ressenti moyen /10" />
      </section>

      {stats.sessions === 0 ? (
        <section className="card">
          <p className="muted empty">Aucune séance sur cette période. Ajoute-en depuis le calendrier ou lance une séance maison.</p>
        </section>
      ) : (
        <>
          <section className="card">
            <h2>Séances {stats.bucketUnit}</h2>
            <BarChart buckets={stats.buckets} goal={period.kind === 'mois' ? weeklyGoal : undefined} />
          </section>

          <section className="card">
            <h2>Où tu t'entraînes</h2>
            <div className="stack-bar" role="img" aria-label="Répartition des séances par lieu">
              {TRAINING_TYPES.filter((t) => stats.byType[t].sessions > 0).map((t) => (
                <div key={t} style={{ flex: stats.byType[t].sessions, background: typeInfo(t).color }} />
              ))}
            </div>
            <ul className="type-legend">
              {TRAINING_TYPES.map((t) => {
                const v = stats.byType[t]
                return (
                  <li key={t}>
                    <i style={{ background: typeInfo(t).color }} />
                    <span>
                      {typeInfo(t).emoji} {typeInfo(t).label}
                    </span>
                    <b>{v.sessions}</b>
                    <span className="muted">
                      {typeTotal ? Math.round((v.sessions / typeTotal) * 100) : 0} % · {formatHours(v.minutes)}
                    </span>
                  </li>
                )
              })}
            </ul>
            {stats.restDays > 0 && <p className="muted small-text">+ {stats.restDays} jour{stats.restDays > 1 ? 's' : ''} de repos noté{stats.restDays > 1 ? 's' : ''}</p>}
          </section>
        </>
      )}

      <section className="card">
        <h2>Régularité</h2>
        <div className="stat-rows">
          <Row label="Séances par semaine (moyenne)" value={stats.perWeek.toFixed(1)} />
          <Row label={`Semaines à l'objectif (${weeklyGoal}/sem.)`} value={stats.weeksElapsed ? `${stats.weeksAtGoal} / ${stats.weeksElapsed}` : '–'} />
          <Row label="Série en cours" value={`🔥 ${current} sem.`} />
          <Row label="Meilleure série (tout l'historique)" value={`${best} sem.`} />
        </div>
      </section>

      {stats.climbs > 0 && (
        <section className="card">
          <h2>Escalade</h2>
          <div className="stat-rows">
            <Row label="Blocs réussis" value={String(stats.blocs)} />
            <Row label="Voies réussies" value={String(stats.voies)} />
            <Row label="Dont en flash" value={`${stats.flashs} ⚡`} />
            {stats.bestVoie && <Row label="Meilleure cotation" value={stats.bestVoie} />}
          </div>
          {stats.topBlocLevels.length > 0 && (
            <>
              <div className="plan-phase stats-sub">Niveaux de bloc les plus grimpés</div>
              <div className="chips">
                {stats.topBlocLevels.map((l) => (
                  <span key={l.level} className="chip climb">
                    🪨 {l.level} <b>× {l.count}</b>
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="tile">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

/** Histogramme d'une seule série : une couleur, barres fines arrondies, valeur au toucher */
function BarChart({ buckets, goal }: { buckets: Bucket[]; goal?: number }) {
  const lastWithData = buckets.reduce((acc, b, i) => (b.sessions > 0 ? i : acc), buckets.length - 1)
  const [sel, setSel] = useState<number | null>(null)
  const active = sel ?? lastWithData
  const W = 320
  const H = 150
  const left = 22
  const bottom = 22
  const top = 14
  const plotW = W - left - 6
  const plotH = H - top - bottom
  const max = Math.max(1, goal ?? 0, ...buckets.map((b) => b.sessions))
  const step = plotW / buckets.length
  const bw = Math.min(28, step * 0.62)
  const y = (v: number) => top + plotH - (v / max) * plotH
  const cur = buckets[active]

  return (
    <div className="bar-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Nombre de séances par période">
        {/* repères recessifs */}
        <line x1={left} x2={W - 6} y1={y(0)} y2={y(0)} stroke="#cfc6b4" strokeWidth={1.5} />
        <line x1={left} x2={W - 6} y1={y(max)} y2={y(max)} stroke="#ebe4d6" strokeWidth={1} />
        <text x={left - 6} y={y(max) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">
          {max}
        </text>
        <text x={left - 6} y={y(0) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">
          0
        </text>
        {goal !== undefined && (
          <g>
            <line x1={left} x2={W - 6} y1={y(goal)} y2={y(goal)} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.55} />
            <text x={left + 3} y={y(goal) - 4} textAnchor="start" fontSize={9.5} fill="var(--muted)" fontWeight={700}>
              objectif {goal}
            </text>
          </g>
        )}
        {buckets.map((b, i) => {
          const cx = left + step * i + step / 2
          const h = y(0) - y(b.sessions)
          const r = Math.min(4, bw / 2, h)
          const x0 = cx - bw / 2
          const yTop = y(b.sessions)
          const on = i === active
          return (
            <g key={i}>
              {b.sessions > 0 && (
                <path
                  d={`M${x0} ${y(0)} V${yTop + r} Q${x0} ${yTop} ${x0 + r} ${yTop} H${x0 + bw - r} Q${x0 + bw} ${yTop} ${x0 + bw} ${yTop + r} V${y(0)} Z`}
                  fill="var(--accent-2)"
                  opacity={on ? 1 : 0.55}
                />
              )}
              {on && b.sessions > 0 && (
                <text x={cx} y={yTop - 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="var(--ink)">
                  {b.sessions}
                </text>
              )}
              <text x={cx} y={H - 6} textAnchor="middle" fontSize={buckets.length > 8 ? 9.5 : 10} fill={on ? 'var(--ink)' : 'var(--muted)'} fontWeight={on ? 800 : 500}>
                {b.label}
              </text>
              {/* zone de toucher plus large que la barre */}
              <rect
                x={left + step * i}
                y={top}
                width={step}
                height={plotH + bottom}
                fill="transparent"
                onClick={() => setSel(i)}
                onMouseEnter={() => setSel(i)}
                style={{ cursor: 'pointer' }}
              />
            </g>
          )
        })}
      </svg>
      {cur && (
        <p className="chart-readout">
          <b>{cur.title}</b> · {cur.sessions} séance{cur.sessions > 1 ? 's' : ''}
          {cur.minutes > 0 && ` · ${formatHours(cur.minutes)}`}
        </p>
      )}
      <details className="chart-table">
        <summary>Voir le tableau</summary>
        <table>
          <tbody>
            {buckets.map((b, i) => (
              <tr key={i}>
                <td>{b.title}</td>
                <td>{b.sessions}</td>
                <td>{formatHours(b.minutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
