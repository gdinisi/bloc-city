import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Session, Settings } from '../types'
import { typeInfo } from '../types'
import { addDays, startOfWeek, toKey } from '../lib/dates'
import { countsByWeek, weeklyStreak } from '../lib/stats'
import { weekKey } from '../lib/dates'
import type { CityState } from '../city/economy'
import { chestReadyAt, population } from '../city/economy'
import { cityLevel } from '../city/buildings'
import { CityMap } from '../city/CityMap'
import { QuestsMini } from '../city/QuestsPanel'
import { formatWait, useNow } from '../city/CityScreen'
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
  city: CityState
  pseudo: string | null
  onCity: (fn: (c: CityState) => CityState) => void
  onSave: (s: Session) => void
  onSettings: (patch: Partial<Settings>) => void
  onGo: (tab: TabId) => void
}

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Illustration associée à chaque type de séance maison */
export const FOCUS_ART: Record<Focus, ArtVariant> = {
  complet: 'peak',
  gainage: 'ridge',
  haut: 'wall',
  doigts: 'boulder',
  mobilite: 'dawn',
}

const greeting = (h: number) => (h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir')

const fmtTime = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`)

/** Accueil : l'essentiel en un coup d'œil */
export function HomeScreen({ sessions, settings, city, pseudo, onCity, onSave, onSettings, onGo }: Props) {
  const now = useNow()
  const [adding, setAdding] = useState(false)
  const today = new Date()
  const todayKey = toKey(today)
  const goal = settings.weeklyGoal
  const done = countsByWeek(sessions).get(weekKey(today)) ?? 0
  const streak = weeklyStreak(sessions, goal, today)
  const monday = startOfWeek(today)
  const week = Array.from({ length: 7 }, (_, i) => {
    const k = toKey(addDays(monday, i))
    const list = sessions.filter((s) => s.date === k)
    const main = list.find((s) => s.type !== 'repos') ?? list[0]
    return { k, main, future: k > todayKey }
  })
  const weekMinutes = sessions.filter((s) => s.type !== 'repos' && s.date >= toKey(monday) && s.date <= todayKey).reduce((t, s) => t + s.durationMin, 0)
  const lvl = computeLevel(sessions, settings.home.fatigue)
  const chestAt = chestReadyAt(city)
  const chestReady = now >= chestAt
  const pop = population(city)
  const focuses = availableFocuses(settings.equipment)
  const pct = Math.round((done / goal) * 100)

  const startFocus = (f: Focus) => {
    onSettings({ home: { ...settings.home, focus: f } })
    onGo('seances')
  }

  return (
    <div className="screen home">
      <header className="home-hero">
        <img className="home-hero-img" src={`${import.meta.env.BASE_URL}img/peak-wide.webp`} alt="" />
        <div className="home-hero-text">
          <p className="home-date">{today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h2>
            {greeting(today.getHours())}
            {pseudo ? `, ${pseudo}` : ''}
          </h2>
          <p className="muted">{done >= goal ? 'Objectif de la semaine atteint. Bravo !' : 'Prêt à grimper aujourd’hui ?'}</p>
        </div>
      </header>

      <section className="card activity" onClick={() => onGo('calendrier')}>
        <div className="activity-head">
          <h3>Activité de la semaine</h3>
          <span className="pill">Cette semaine</span>
        </div>
        <div className="activity-body">
          <Ring value={done / goal} size={124}>
            <b>{pct}%</b>
            <span>de l’objectif</span>
          </Ring>
          <ul className="activity-stats">
            <li>
              <Icon name="hold" />
              <span>
                <small>Séances</small>
                <b>
                  {done} / {goal}
                </b>
              </span>
            </li>
            <li>
              <Icon name="clock" />
              <span>
                <small>Temps actif</small>
                <b>{fmtTime(weekMinutes)}</b>
              </span>
            </li>
            <li>
              <Icon name="flame" />
              <span>
                <small>Série</small>
                <b>
                  {streak} sem.
                </b>
              </span>
            </li>
          </ul>
        </div>
        <div className="week-strip">
          {week.map((d, i) => (
            <span
              key={d.k}
              className={`wday ${d.k === todayKey ? 'today' : ''} ${d.main ? 'has' : ''} ${d.future ? 'future' : ''}`}
              style={d.main ? ({ '--tc': typeInfo(d.main.type).color } as CSSProperties) : undefined}
            >
              <i>{DAYS[i]}</i>
              <b />
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
        <button type="button" className="btn home-add" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} />
          <span>
            Noter
            <small>une séance</small>
          </span>
        </button>
      </div>

      <section className="home-section">
        <div className="section-head">
          <h3>Recommandé pour toi</h3>
          <button type="button" className="link-btn" onClick={() => onGo('seances')}>
            Tout voir
          </button>
        </div>
        <div className="reco-scroll">
          {FOCUSES.filter((f) => focuses.some((x) => x.id === f.id)).map((f, i) => (
            <button key={f.id} type="button" className="reco-card" onClick={() => startFocus(f.id)}>
              <MountainArt variant={FOCUS_ART[f.id]} seed={i + 3} />
              <span className="reco-tag">
                <Icon name={f.id === 'mobilite' ? 'mountain' : f.id === 'doigts' ? 'hold' : 'bolt'} size={13} stroke={2} />
                {f.label}
              </span>
              <span className="reco-body">
                <b>{f.hint}</b>
                <small>
                  {settings.home.minutes} min · Niveau {lvl.today}
                </small>
              </span>
              <span className="reco-play">
                <Icon name="play" fill size={14} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="home-rewards">
        <button type="button" className={`mini-tile ${city.packs.length ? 'hot' : ''}`} onClick={() => onGo('ville')}>
          <Icon name="gift" />
          <b>{city.packs.length}</b>
          <span>{city.packs.length > 1 ? 'packs' : 'pack'} à ouvrir</span>
        </button>
        <button type="button" className={`mini-tile ${chestReady ? 'hot' : ''}`} onClick={() => onGo('ville')}>
          <Icon name="chest" />
          <b>{chestReady ? 'Prêt' : formatWait(chestAt - now)}</b>
          <span>coffre du jour</span>
        </button>
        <button type="button" className="mini-tile" onClick={() => onGo('ville')}>
          <Icon name="coin" />
          <b>{city.coins}</b>
          <span>pièces</span>
        </button>
      </div>

      <QuestsMini sessions={sessions} weeklyGoal={goal} city={city} onCity={onCity} />

      <section className="card home-city" onClick={() => onGo('ville')}>
        <CityMap city={city} readOnly className="mini" />
        <div className="home-city-info">
          <small className="muted">Ta ville</small>
          <b>Niveau {cityLevel(pop)}</b>
          <span className="muted">
            <Icon name="users" size={15} /> {pop} habitants
          </span>
          <span className="link-btn">
            Ouvrir <Icon name="chevron" size={14} />
          </span>
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
