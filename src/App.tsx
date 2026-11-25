import { useState } from 'react'
import { useAppData } from './lib/store'
import { CalendarScreen } from './screens/CalendarScreen'
import { ComingSoon } from './screens/ComingSoon'
import { HomeWorkoutScreen } from './screens/HomeWorkoutScreen'
import { StatsScreen } from './screens/StatsScreen'
import { CityScreen } from './city/CityScreen'
import { chestReadyAt } from './city/economy'
import { useClaimable } from './city/QuestsPanel'

type Tab = 'calendrier' | 'seances' | 'stats' | 'ville' | 'classement'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'calendrier', label: 'Calendrier', emoji: '📅' },
  { id: 'seances', label: 'Séances', emoji: '💪' },
  { id: 'stats', label: 'Stats', emoji: '📊' },
  { id: 'ville', label: 'Ville', emoji: '🏙️' },
  { id: 'classement', label: 'Classement', emoji: '🏆' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('calendrier')
  const data = useAppData()
  // packs à ouvrir + coffre du jour prêt
  const cityBadge = data.city.packs.length + (Date.now() >= chestReadyAt(data.city) ? 1 : 0)
  // quêtes terminées à récupérer
  const questBadge = useClaimable(data.sessions, data.settings.weeklyGoal, data.city)

  return (
    <div className="app">
      <header className="topbar">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={32} height={32} />
        <h1>Bloc City</h1>
      </header>

      <main>
        {tab === 'calendrier' && (
          <CalendarScreen
            sessions={data.sessions}
            city={data.city}
            onCity={data.updateCity}
            weeklyGoal={data.settings.weeklyGoal}
            onGoalChange={data.setWeeklyGoal}
            onSave={data.upsertSession}
            onDelete={data.deleteSession}
          />
        )}
        {tab === 'seances' && (
          <HomeWorkoutScreen sessions={data.sessions} settings={data.settings} onSettings={data.updateSettings} onSave={data.upsertSession} />
        )}
        {tab === 'stats' && <StatsScreen sessions={data.sessions} weeklyGoal={data.settings.weeklyGoal} />}
        {tab === 'ville' && <CityScreen city={data.city} onCity={data.updateCity} />}
        {tab === 'classement' && (
          <ComingSoon
            emoji="🏆"
            title="Classement entre amis"
            lines={["Invite tes amis avec un lien", "Classement de la semaine en % d'objectif", 'Défis et séances à deux']}
          />
        )}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => {
          const badge = t.id === 'ville' ? cityBadge : t.id === 'calendrier' ? questBadge : 0
          return (
            <button key={t.id} type="button" className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <span className="tab-emoji">
                {t.emoji}
                {badge > 0 && <i className="tab-badge">{badge}</i>}
              </span>
              <span>{t.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
