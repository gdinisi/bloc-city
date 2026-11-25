import { useState } from 'react'
import type { CSSProperties } from 'react'
import { typeInfo } from '../types'
import type { Session, Settings } from '../types'
import { addDays, startOfWeek, toKey } from '../lib/dates'
import { countsByWeek, weeklyStreak } from '../lib/stats'
import { weekKey } from '../lib/dates'
import { computeLevel, levelLabel } from '../workout/level'
import { FOCUSES, availableFocuses } from '../workout/generator'
import type { Focus } from '../workout/generator'
import { SessionForm } from '../components/SessionForm'
import { recentBlocLevels } from '../lib/stats'
import { Icon } from '../ui/Icon'
import { MountainArt } from '../ui/MountainArt'
import type { ArtVariant } from '../ui/MountainArt'
import { Ring } from '../ui/Ring'

export type TabId = 'calendrier' | 'seances' | 'accueil' | 'ville' | 'stats' | 'amis'

interface Props {
  sessions: Session[]
  settings: Settings
  pseudo: string | null
  onSave: (s: Session) => void
  onSettings: (patch: Partial<Settings>) => void
  onGo: (tab: TabId) => void
}

/** Illustration associée à chaque type de séance maison */
export const FOCUS_ART: Record<Focus, ArtVariant> = {
  complet: 'peak',
  gainage: 'ridge',
  haut: 'wall',
  doigts: 'boulder',
  mobilite: 'dawn',
}

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const greeting = (h: number) => (h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir')

const fmtTime = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`)

/**
 * Accueil épuré : ta semaine, le bouton pour lancer une séance, et les séances proposées.
 * (Quêtes, packs et coffre sont dans l'onglet Ville.)
 */
export function HomeScreen({ sessions, settings, pseudo, onSave, onSettings, onGo }: Props) {
  const [adding, setAdding] = useState(false)
  const today = new Date()
  const todayKey = toKey(today)
  const goal = settings.weeklyGoal
  const done = countsByWeek(sessions).get(weekKey(today)) ?? 0
  const streak = weeklyStreak(sessions, goal, today)
  const mondayDate = startOfWeek(today)
  const monday = toKey(mondayDate)
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mondayDate, i)
    const k = toKey(d)
    const list = sessions.filter((x) => x.date === k)
    const main = list.find((x) => x.type !== 'repos') ?? list[0]
    return { k, n: d.getDate(), main, future: k > todayKey }
  })
  const weekMinutes = sessions.filter((s) => s.type !== 'repos' && s.date >= monday && s.date <= todayKey).reduce((t, s) => t + s.durationMin, 0)
  const lvl = computeLevel(sessions, settings.home.fatigue)
  const focuses = FOCUSES.filter((f) => availableFocuses(settings.equipment).some((x) => x.id === f.id))
  const pct = Math.round((done / goal) * 100)

  const startFocus = (f: Focus) => {
    onSettings({ home: { ...settings.home, focus: f } })
    onGo('seances')
  }

  return (
    <div className="screen home">
      <section className="card activity" onClick={() => onGo('calendrier')}>
        <div className="activity-photo" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}img/home-banner.webp)` }}>
          <div>
            <p className="home-date">{today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h2>
              {greeting(today.getHours())}
              {pseudo ? `, ${pseudo}` : ''}
            </h2>
          </div>
        </div>
        <div className="activity-body">
          <Ring value={done / goal} size={90} stroke={9}>
            <b>{pct}%</b>
            <span>objectif</span>
          </Ring>
          <ul className="activity-stats">
            <li>
              <Icon name="hold" size={19} />
              <span>
                <small>Séances cette semaine</small>
                <b>
                  {done} / {goal}
                </b>
              </span>
            </li>
            <li>
              <Icon name="clock" size={19} />
              <span>
                <small>Temps actif</small>
                <b>{fmtTime(weekMinutes)}</b>
              </span>
            </li>
            <li>
              <Icon name="flame" size={19} />
              <span>
                <small>Série</small>
                <b>{streak} sem.</b>
              </span>
            </li>
          </ul>
        </div>
        <div className="week-row">
          {week.map((d, i) => (
            <span
              key={d.k}
              className={`${d.k === todayKey ? 'today' : ''} ${d.main ? 'has' : ''} ${d.future ? 'future' : ''}`}
              style={d.main ? ({ '--tc': typeInfo(d.main.type).color } as CSSProperties) : undefined}
              title={d.main ? typeInfo(d.main.type).label : undefined}
            >
              <i>{DAYS[i]}</i>
              <b>{d.n}</b>
            </span>
          ))}
        </div>
      </section>

      <div className="home-actions">
        <button type="button" className="btn grad home-go" onClick={() => onGo('seances')}>
          <Icon name="play" fill size={18} />
          <span>
            Séance maison
            <small>
              Niveau {lvl.today} · {levelLabel(lvl.today)}
            </small>
          </span>
        </button>
        <button type="button" className="btn home-add" aria-label="Noter une séance" onClick={() => setAdding(true)}>
          <Icon name="plus" size={22} />
        </button>
      </div>

      <section className="home-section">
        <div className="section-head">
          <h3>Séances proposées</h3>
          <span className="muted small-text">{settings.home.minutes} min</span>
        </div>
        <div className="reco-scroll">
          {focuses.map((f, i) => (
            <button key={f.id} type="button" className="reco-card" onClick={() => startFocus(f.id)}>
              <MountainArt variant={FOCUS_ART[f.id]} seed={i + 3} />
              <span className="reco-body">
                <b>{f.label}</b>
                <small>{f.hint}</small>
              </span>
              <span className="reco-play">
                <Icon name="play" fill size={14} />
              </span>
            </button>
          ))}
        </div>
      </section>

      {adding && (
        <SessionForm
          date={todayKey}
          blocLevels={recentBlocLevels(sessions)}
          onClose={() => setAdding(false)}
          onSave={(s) => {
            onSave(s)
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}
