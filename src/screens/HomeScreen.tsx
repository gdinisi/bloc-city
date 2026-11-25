import { useState } from 'react'
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
import { SessionForm } from '../components/SessionForm'
import { recentBlocLevels } from '../lib/stats'

export type TabId = 'calendrier' | 'seances' | 'accueil' | 'ville' | 'stats'

interface Props {
  sessions: Session[]
  settings: Settings
  city: CityState
  onCity: (fn: (c: CityState) => CityState) => void
  onSave: (s: Session) => void
  onGo: (tab: TabId) => void
}

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** Accueil : l'essentiel en un coup d'œil, sur un seul écran */
export function HomeScreen({ sessions, settings, city, onCity, onSave, onGo }: Props) {
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
  const lvl = computeLevel(sessions, settings.home.fatigue)
  const chestAt = chestReadyAt(city)
  const chestReady = now >= chestAt
  const pop = population(city)

  return (
    <div className="screen home">
      <p className="home-date">{today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      <section className="card hero home-week" onClick={() => onGo('calendrier')}>
        <div className="hero-top">
          <div>
            <div className="muted">Cette semaine</div>
            <div className="big">
              {done}
              <span className="of">/{goal} séances</span>
            </div>
          </div>
          <div className="streak" title="Semaines d'affilée à l'objectif">
            <span className="streak-fire">🔥</span>
            <b>{streak}</b>
            <span className="muted">sem.</span>
          </div>
        </div>
        <div className="week-strip">
          {week.map((d, i) => (
            <span
              key={d.k}
              className={`wday ${d.k === todayKey ? 'today' : ''} ${d.main ? 'has' : ''} ${d.future ? 'future' : ''}`}
              style={d.main ? ({ '--tc': typeInfo(d.main.type).color } as React.CSSProperties) : undefined}
            >
              <i>{DAYS[i]}</i>
              <b>{d.main ? typeInfo(d.main.type).emoji : ''}</b>
            </span>
          ))}
        </div>
      </section>

      <div className="home-actions">
        <button type="button" className="btn primary home-go" onClick={() => onGo('seances')}>
          <span>▶ Séance maison</span>
          <small>
            Niveau {lvl.today} · {levelLabel(lvl.today)}
          </small>
        </button>
        <button type="button" className="btn home-add" onClick={() => setAdding(true)}>
          <span>＋ Noter</span>
          <small>une séance</small>
        </button>
      </div>

      <div className="home-rewards">
        <button type="button" className={`mini-tile ${city.packs.length ? 'hot' : ''}`} onClick={() => onGo('ville')}>
          <b>🎁 {city.packs.length}</b>
          <span>{city.packs.length > 1 ? 'packs' : 'pack'} à ouvrir</span>
        </button>
        <button type="button" className={`mini-tile ${chestReady ? 'hot' : ''}`} onClick={() => onGo('ville')}>
          <b>🧰 {chestReady ? 'Prêt' : formatWait(chestAt - now)}</b>
          <span>coffre du jour</span>
        </button>
        <button type="button" className="mini-tile" onClick={() => onGo('ville')}>
          <b>🪙 {city.coins}</b>
          <span>pièces</span>
        </button>
      </div>

      <QuestsMini sessions={sessions} weeklyGoal={goal} city={city} onCity={onCity} />

      <section className="card home-city" onClick={() => onGo('ville')}>
        <CityMap city={city} readOnly className="mini" />
        <div className="home-city-info">
          <b>🏙️ Niveau {cityLevel(pop)}</b>
          <span>👥 {pop} habitants</span>
          <span className="link-btn">Ma ville ›</span>
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
