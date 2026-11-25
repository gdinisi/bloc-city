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
import { FriendsScreen, NewPassword } from './screens/FriendsScreen'
import { Icon } from './ui/Icon'
import { useTheme } from './lib/theme'
import { TopXp } from './ui/XpBar'
import type { IconName } from './ui/Icon'
import { cloudEnabled, takeInviteFromUrl, useAuth } from './lib/cloud'
import { useCloudSync, useProfile } from './lib/sync'

// lien d'invitation (?ami=CODE) : on le met de côté et on ouvre l'écran Amis
const invited = takeInviteFromUrl()

/** L'accueil est au centre de la barre et s'ouvre au lancement */
const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'calendrier', label: 'Calendrier', icon: 'calendar' },
  { id: 'seances', label: 'Séances', icon: 'hold' },
  { id: 'accueil', label: 'Accueil', icon: 'home' },
  { id: 'ville', label: 'Ville', icon: 'city' },
  { id: 'stats', label: 'Stats', icon: 'chart' },
]

export default function App() {
  const [tab, setTab] = useState<TabId>(invited ? 'amis' : 'accueil')
  const data = useAppData()
  const auth = useAuth()
  const me = useProfile(auth.userId)
  const sync = useCloudSync(data, auth.userId, Boolean(me.profile))
  const [theme, setTheme] = useTheme()
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
        <TopXp sessions={data.sessions} onOpen={() => go('stats')} />
        <button
          type="button"
          className="theme-btn"
          aria-label={theme === 'sombre' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          onClick={() => setTheme(theme === 'sombre' ? 'clair' : 'sombre')}
        >
          <Icon name={theme === 'sombre' ? 'sun' : 'moon'} size={19} />
        </button>
        {cloudEnabled && (
          <button type="button" className={`friends-btn ${tab === 'amis' ? 'on' : ''}`} onClick={() => go('amis')}>
            <Icon name={auth.userId ? 'trophy' : 'users'} size={17} />
            {me.profile ? me.profile.pseudo : 'Amis'}
            {sync.status === 'erreur' && <i className="sync-dot" title="Sauvegarde en attente" />}
          </button>
        )}
      </header>

      <main>
        {tab === 'accueil' && (
          <HomeScreen sessions={data.sessions} settings={data.settings} onSave={data.upsertSession} onSettings={data.updateSettings} pseudo={me.profile?.pseudo ?? null} onGo={go} />
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
        {tab === 'ville' && <CityScreen city={data.city} onCity={data.updateCity} sessions={data.sessions} weeklyGoal={data.settings.weeklyGoal} />}
        {tab === 'amis' && (
          <FriendsScreen
            userId={auth.userId}
            email={auth.email}
            authReady={auth.ready}
            profile={me.profile}
            profileLoaded={me.loaded}
            onProfile={me.setProfile}
            sync={sync}
            sessions={data.sessions}
            weeklyGoal={data.settings.weeklyGoal}
          />
        )}
      </main>

      {auth.recovery && <NewPassword onDone={auth.endRecovery} />}

      <nav className="tabbar">
        {TABS.map((t) => {
          const badge = t.id === 'ville' ? cityBadge + questBadge : 0
          return (
            <button key={t.id} type="button" className={`${tab === t.id ? 'on' : ''} ${t.id === 'accueil' ? 'center' : ''}`} onClick={() => go(t.id)}>
              <span className="tab-emoji">
                <Icon name={t.icon} size={23} stroke={tab === t.id ? 2.1 : 1.7} />
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
