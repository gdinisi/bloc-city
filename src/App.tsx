import { useState } from 'react'
import { useAppData } from './lib/store'
import { CalendarScreen } from './screens/CalendarScreen'
import { HomeWorkoutScreen } from './screens/HomeWorkoutScreen'
import { StatsScreen } from './screens/StatsScreen'
import { HomeScreen } from './screens/HomeScreen'
import type { TabId } from './screens/HomeScreen'
import { CityScreen } from './city/CityScreen'
import { chestReadyAt } from './city/economy'
import { useClaimable } from './city/QuestsPanel'

/** L'accueil est au centre de la barre et s'ouvre au lancement */
const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'calendrier', label: 'Calendrier', emoji: '📅' },
  { id: 'seances', label: 'Séances', emoji: '💪' },
  { id: 'accueil', label: 'Accueil', emoji: '🏠' },
  { id: 'ville', label: 'Ville', emoji: '🏙️' },
  { id: 'stats', label: 'Stats', emoji: '📊' },
]

export default function App() {
  const [tab, setTab] = useState<TabId>('accueil')
  const data = useAppData()
  // packs à ouvrir + coffre du jour prêt
  const cityBadge = data.city.packs.length + (Date.now() >= chestReadyAt(data.city) ? 1 : 0)
  // quêtes terminées à récupérer
  const questBadge = useClaimable(data.sessions, data.settings.weeklyGoal, data.city)

  const go = (t: TabId) => {
    setTab(t)
    window.scrollTo(0, 0)
  }

  return (
    <div className="app">
      <header className="topbar">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={32} height={32} />
        <h1>Bloc City</h1>
      </header>

      <main>
        {tab === 'accueil' && (
          <HomeScreen sessions={data.sessions} settings={data.settings} city={data.city} onCity={data.updateCity} onSave={data.upsertSession} onGo={go} />
        )}
        {tab === 'calendrier' && (
          <CalendarScreen
            sessions={data.sessions}
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
      </main>

      <nav className="tabbar">
        {TABS.map((t) => {
          const badge = t.id === 'ville' ? cityBadge : t.id === 'accueil' ? questBadge : 0
          return (
            <button key={t.id} type="button" className={`${tab === t.id ? 'on' : ''} ${t.id === 'accueil' ? 'center' : ''}`} onClick={() => go(t.id)}>
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
