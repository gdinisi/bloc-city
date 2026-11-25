import { useState } from 'react'
import { useAppData } from './lib/store'
import { CalendarScreen } from './screens/CalendarScreen'
import { ComingSoon } from './screens/ComingSoon'
import { HomeWorkoutScreen } from './screens/HomeWorkoutScreen'

type Tab = 'calendrier' | 'seances' | 'ville' | 'classement'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'calendrier', label: 'Calendrier', emoji: '📅' },
  { id: 'seances', label: 'Séances', emoji: '💪' },
  { id: 'ville', label: 'Ville', emoji: '🏙️' },
  { id: 'classement', label: 'Classement', emoji: '🏆' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('calendrier')
  const data = useAppData()

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
            weeklyGoal={data.settings.weeklyGoal}
            onGoalChange={data.setWeeklyGoal}
            onSave={data.upsertSession}
            onDelete={data.deleteSession}
          />
        )}
        {tab === 'seances' && (
          <HomeWorkoutScreen settings={data.settings} onSettings={data.updateSettings} onSave={data.upsertSession} />
        )}
        {tab === 'ville' && (
          <ComingSoon
            emoji="🏙️"
            title="Ta ville"
            lines={['Un pack de bâtiments à chaque séance', 'Un coffre gratuit plusieurs fois par jour', 'Place tes bâtiments au doigt']}
          />
        )}
        {tab === 'classement' && (
          <ComingSoon
            emoji="🏆"
            title="Classement entre amis"
            lines={["Invite tes amis avec un lien", "Classement de la semaine en % d'objectif", 'Défis et séances à deux']}
          />
        )}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span className="tab-emoji">{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
