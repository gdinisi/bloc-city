import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Session } from '../types'
import { gradeRank, typeInfo } from '../types'
import type { CityState } from '../city/economy'
import { migrateCity } from '../city/economy'
import { CityMap } from '../city/CityMap'
import type { Profile } from '../lib/cloud'
import { getCity, getFriendSessions, removeFriend } from '../lib/cloud'
import { MONTHS, WEEKDAYS_SHORT, formatLongDate, monthGrid, toKey } from '../lib/dates'
import type { Period, PeriodKind } from '../lib/periodStats'
import { bestStreak, computeStats, formatHours, periodTitle } from '../lib/periodStats'
import { bestGrade, weeklyStreak } from '../lib/stats'
import { experience, fmtHours } from '../lib/xp'
import { GradeLogo } from '../ui/GradeLogo'
import { Icon } from '../ui/Icon'

type Tab = 'stats' | 'calendrier' | 'ville'

interface Props {
  friend: Profile
  mySessions: Session[]
  myGoal: number
  onClose: () => void
  onRemoved: () => void
  /** Données fournies directement (page de démonstration en développement) */
  demo?: { sessions: Session[]; weeklyGoal: number; city: CityState }
}

/** Fiche d'un ami : ses stats comparées aux tiennes, son calendrier et sa ville */
export function FriendView({ friend, mySessions, myGoal, onClose, onRemoved, demo }: Props) {
  const [tab, setTab] = useState<Tab>('stats')
  const [data, setData] = useState<{ sessions: Session[]; weeklyGoal: number } | null | 'vide'>(null)
  const [city, setCity] = useState<CityState | null | 'vide'>(null)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (demo) {
      setData({ sessions: demo.sessions, weeklyGoal: demo.weeklyGoal })
      setCity(demo.city)
      return
    }
    getFriendSessions(friend.id)
      .then((d) => setData(d ?? 'vide'))
      .catch(() => setData('vide'))
    getCity(friend.id)
      .then((c) => setCity(c ? migrateCity(c) : 'vide'))
      .catch(() => setCity('vide'))
  }, [friend.id, demo])

  const theirSessions = data && data !== 'vide' ? data.sessions : []
  const xp = experience(theirSessions)

  return (
    <div className="friend-view" role="dialog" aria-label={`Profil de ${friend.pseudo}`}>
      <header className="friend-view-head">
        <button type="button" className="round" aria-label="Retour" onClick={onClose}>
          <Icon name="back" size={20} />
        </button>
        <GradeLogo level={xp.level} size={44} />
        <span className="fold-title">
          <b>{friend.pseudo}</b>
          <small>
            Niveau {xp.level} · {xp.title}
          </small>
        </span>
      </header>

      <div className="seg wide friend-tabs">
        {(
          [
            ['stats', 'Stats'],
            ['calendrier', 'Calendrier'],
            ['ville', 'Ville'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="friend-view-body">
        {data === null && <p className="muted center-text">Chargement…</p>}
        {data === 'vide' && tab !== 'ville' && (
          <section className="card">
            <p className="muted">{friend.pseudo} n'a pas encore partagé ses séances. Elles apparaîtront dès sa prochaine ouverture de l'app.</p>
          </section>
        )}

        {data && data !== 'vide' && tab === 'stats' && (
          <Compare me={mySessions} myGoal={myGoal} them={data.sessions} theirGoal={data.weeklyGoal} name={friend.pseudo} />
        )}
        {data && data !== 'vide' && tab === 'calendrier' && <FriendCalendar sessions={data.sessions} />}

        {tab === 'ville' && (
          <section className="card">
            {city === null && <p className="muted">Chargement…</p>}
            {city === 'vide' && <p className="muted">{friend.pseudo} n'a pas encore construit sa ville.</p>}
            {city && city !== 'vide' && (
              <>
                <CityMap city={city} className="visit-map" />
                <p className="muted small-text">
                  {city.placed.length} bâtiment{city.placed.length > 1 ? 's' : ''} · pince pour zoomer
                </p>
              </>
            )}
          </section>
        )}

        <div className="friend-remove">
          {confirm ? (
            <button
              type="button"
              className="btn danger"
              onClick={() =>
                removeFriend(friend.id)
                  .then(onRemoved)
                  .catch(() => setConfirm(false))
              }
            >
              Confirmer : retirer {friend.pseudo}
            </button>
          ) : (
            <button type="button" className="btn ghost" onClick={() => setConfirm(true)}>
              Retirer de mes amis
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- comparaison des stats ---------- */

const KINDS: { id: PeriodKind; label: string }[] = [
  { id: 'mois', label: 'Ce mois' },
  { id: 'annee', label: 'Cette année' },
  { id: 'total', label: 'Total' },
]

interface Row {
  label: string
  me: number
  them: number
  show: (v: number) => string
  /** plus petit = mieux (aucun pour l'instant, mais prévu) */
  lowerIsBetter?: boolean
}

function Compare({ me, myGoal, them, theirGoal, name }: { me: Session[]; myGoal: number; them: Session[]; theirGoal: number; name: string }) {
  const now = new Date()
  const [kind, setKind] = useState<PeriodKind>('mois')
  const period: Period = { kind, year: now.getFullYear(), month: now.getMonth() }
  const a = useMemo(() => computeStats(me, period, myGoal), [me, kind, myGoal]) // eslint-disable-line react-hooks/exhaustive-deps
  const b = useMemo(() => computeStats(them, period, theirGoal), [them, kind, theirGoal]) // eslint-disable-line react-hooks/exhaustive-deps
  const xa = experience(me)
  const xb = experience(them)
  const gradeA = bestGrade(me)
  const gradeB = bestGrade(them)

  const rows: Row[] = [
    { label: 'Séances', me: a.sessions, them: b.sessions, show: String },
    { label: 'Temps de sport', me: a.minutes, them: b.minutes, show: formatHours },
    { label: 'Jours actifs', me: a.activeDays, them: b.activeDays, show: String },
    { label: 'Séances par semaine', me: a.perWeek, them: b.perWeek, show: (v) => v.toFixed(1).replace('.', ',') },
    {
      label: "Semaines à l'objectif",
      me: a.weeksElapsed ? a.weeksAtGoal / a.weeksElapsed : 0,
      them: b.weeksElapsed ? b.weeksAtGoal / b.weeksElapsed : 0,
      show: (v) => `${Math.round(v * 100)} %`,
    },
    { label: 'Blocs et voies réussis', me: a.climbs, them: b.climbs, show: String },
    { label: 'Série actuelle (sem.)', me: weeklyStreak(me, myGoal), them: weeklyStreak(them, theirGoal), show: String },
    { label: 'Meilleure série (sem.)', me: bestStreak(me, myGoal), them: bestStreak(them, theirGoal), show: String },
  ]
  const wins = rows.reduce((t, r) => t + (r.me > r.them ? 1 : 0), 0)
  const losses = rows.reduce((t, r) => t + (r.them > r.me ? 1 : 0), 0)

  return (
    <>
      <section className="card compare-head">
        <div className="seg wide">
          {KINDS.map((k) => (
            <button key={k.id} type="button" className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <p className="muted small-text center-text">{periodTitle(period)}</p>
        <div className="versus">
          <span className="vs-side">
            <GradeLogo level={xa.level} size={40} />
            <b>Toi</b>
            <small>{fmtHours(xa.hours)} au total</small>
          </span>
          <span className="vs-score">
            <b>{wins}</b>
            <i>–</i>
            <b>{losses}</b>
          </span>
          <span className="vs-side">
            <GradeLogo level={xb.level} size={40} />
            <b>{name}</b>
            <small>{fmtHours(xb.hours)} au total</small>
          </span>
        </div>
      </section>

      <section className="card compare">
        {rows.map((r) => {
          const max = Math.max(r.me, r.them) || 1
          const meWins = r.lowerIsBetter ? r.me < r.them : r.me > r.them
          const themWins = r.lowerIsBetter ? r.them < r.me : r.them > r.me
          return (
            <div key={r.label} className="cmp-row">
              <div className="cmp-values">
                <b className={meWins ? 'win' : ''}>{r.show(r.me)}</b>
                <span>{r.label}</span>
                <b className={themWins ? 'win' : ''}>{r.show(r.them)}</b>
              </div>
              <div className="cmp-bars">
                <span className="cmp-bar me">
                  <i style={{ width: `${(r.me / max) * 100}%` }} className={meWins ? 'win' : ''} />
                </span>
                <span className="cmp-bar them">
                  <i style={{ width: `${(r.them / max) * 100}%` }} className={themWins ? 'win' : ''} />
                </span>
              </div>
            </div>
          )
        })}
        <div className="cmp-row">
          <div className="cmp-values">
            <b className={gradeA && (!gradeB || gradeRank(gradeA) > gradeRank(gradeB)) ? 'win' : ''}>{gradeA ?? '–'}</b>
            <span>Meilleure cotation (voie)</span>
            <b className={gradeB && (!gradeA || gradeRank(gradeB) > gradeRank(gradeA)) ? 'win' : ''}>{gradeB ?? '–'}</b>
          </div>
        </div>
      </section>
    </>
  )
}

/* ---------- calendrier de l'ami (lecture seule) ---------- */

function FriendCalendar({ sessions }: { sessions: Session[] }) {
  const today = new Date()
  const todayKey = toKey(today)
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [selected, setSelected] = useState(todayKey)
  const byDay = useMemo(() => {
    const m = new Map<string, Session[]>()
    for (const s of sessions) m.set(s.date, [...(m.get(s.date) ?? []), s])
    return m
  }, [sessions])
  const weeks = monthGrid(view.y, view.m)
  const shift = (d: number) => {
    const n = new Date(view.y, view.m + d, 1)
    setView({ y: n.getFullYear(), m: n.getMonth() })
  }
  const dayList = byDay.get(selected) ?? []

  return (
    <>
      <section className="card">
        <div className="month-nav">
          <button type="button" className="round" aria-label="Mois précédent" onClick={() => shift(-1)}>
            ‹
          </button>
          <h2>
            {MONTHS[view.m]} {view.y}
          </h2>
          <button type="button" className="round" aria-label="Mois suivant" onClick={() => shift(1)}>
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
            const cls = ['day', d.getMonth() !== view.m && 'out', k === todayKey && 'today', k === selected && 'sel', main && 'has'].filter(Boolean).join(' ')
            return (
              <button
                key={k}
                type="button"
                className={cls}
                style={main ? ({ '--tc': typeInfo(main.type).color } as CSSProperties) : undefined}
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
        <h2 className="cap">{formatLongDate(selected)}</h2>
        {dayList.length === 0 ? (
          <p className="muted small-text">Pas de séance ce jour-là.</p>
        ) : (
          <ul className="friend-day">
            {dayList.map((s) => (
              <li key={s.id} style={{ '--tc': typeInfo(s.type).color } as CSSProperties}>
                <span className="friend-day-type">
                  {typeInfo(s.type).emoji} {typeInfo(s.type).label}
                </span>
                <span className="muted">
                  {s.type !== 'repos' && `${formatHours(s.durationMin)} · ressenti ${s.rpe}/10`}
                  {s.climbs.length > 0 && ` · ${s.climbs.map((c) => c.grade).join(', ')}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
