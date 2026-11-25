import { useState } from 'react'
import type { Session } from '../types'
import type { CityState } from './economy'
import { applyReward } from './economy'
import type { Quest, QuestGroup } from './quests'
import { claimableCount, computeQuests, isClaimed, isDone } from './quests'
import { beep, buzz, unlockAudio } from '../workout/sound'

interface Props {
  sessions: Session[]
  weeklyGoal: number
  city: CityState
  onCity: (fn: (c: CityState) => CityState) => void
}

const GROUPS: { id: QuestGroup; label: string; hint: string }[] = [
  { id: 'jour', label: 'Du jour', hint: 'Se renouvellent chaque jour' },
  { id: 'semaine', label: 'De la semaine', hint: 'Se renouvellent chaque lundi' },
  { id: 'succes', label: 'Succès', hint: 'Une seule fois, avec des bâtiments exclusifs' },
]

function QuestRow({ q, city, onClaim }: { q: Quest; city: CityState; onClaim: (q: Quest) => void }) {
  const done = isDone(q)
  const claimed = isClaimed(q, city)
  return (
    <li className={`quest ${claimed ? 'claimed' : done ? 'done' : ''}`}>
      <span className="quest-emoji">{q.emoji}</span>
      <span className="quest-body">
        <b>{q.title}</b>
        <span className="quest-bar">
          <i style={{ width: `${(q.progress / q.target) * 100}%` }} />
        </span>
        <span className={`quest-reward ${q.exclusive ? 'excl' : ''}`}>{q.rewardLabel}</span>
      </span>
      {claimed ? (
        <span className="quest-state">✓</span>
      ) : done ? (
        <button type="button" className="btn primary small" onClick={() => onClaim(q)}>
          Récupérer
        </button>
      ) : (
        <span className="quest-state muted">
          {q.progress}/{q.target}
        </span>
      )}
    </li>
  )
}

/** Carte des quêtes sur l'accueil : quêtes du jour et de la semaine, et accès aux succès */
export function QuestsCard({ sessions, weeklyGoal, city, onCity }: Props) {
  const [all, setAll] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const quests = computeQuests(sessions, weeklyGoal, city)
  const ready = claimableCount(quests, city)
  const succes = quests.filter((q) => q.group === 'succes')
  const succesDone = succes.filter((q) => isClaimed(q, city)).length

  const claim = (q: Quest) => {
    unlockAudio()
    onCity((c) => applyReward(c, q.reward, q.key))
    setToast(`🎉 ${q.rewardLabel}`)
    beep(880, 120)
    setTimeout(() => beep(1175, 200), 130)
    buzz(80)
    setTimeout(() => setToast(null), 2600)
  }

  return (
    <section className="card quests-card">
      <div className="day-head">
        <h2>🗺️ Quêtes</h2>
        {ready > 0 && <span className="pill quest-ready">{ready} à récupérer</span>}
      </div>
      {(['jour', 'semaine'] as QuestGroup[]).map((g) => (
        <div key={g}>
          <div className="plan-phase quest-group">{GROUPS.find((x) => x.id === g)!.label}</div>
          <ul className="quest-list">
            {quests
              .filter((q) => q.group === g)
              .map((q) => (
                <QuestRow key={q.key} q={q} city={city} onClaim={claim} />
              ))}
          </ul>
        </div>
      ))}
      <button type="button" className="btn succes-btn" onClick={() => setAll(true)}>
        🏆 Succès et bâtiments exclusifs · {succesDone}/{succes.length}
        {succes.some((q) => isDone(q) && !isClaimed(q, city)) && <i className="dot" />}
      </button>
      {toast && <div className="toast">{toast}</div>}

      {all && (
        <div className="library" role="dialog" aria-label="Toutes les quêtes">
          <div className="library-head">
            <button type="button" className="round" aria-label="Retour" onClick={() => setAll(false)}>
              ‹
            </button>
            <h2>Quêtes</h2>
            {ready > 0 && <span className="pill quest-ready">{ready}</span>}
          </div>
          {GROUPS.map((g) => (
            <section key={g.id}>
              <div className="plan-phase quest-group">
                {g.label} <span className="muted">· {g.hint}</span>
              </div>
              <ul className="quest-list">
                {quests
                  .filter((q) => q.group === g.id)
                  .map((q) => (
                    <QuestRow key={q.key} q={q} city={city} onClaim={claim} />
                  ))}
              </ul>
            </section>
          ))}
          {toast && <div className="toast">{toast}</div>}
        </div>
      )}
    </section>
  )
}

export function useClaimable(sessions: Session[], weeklyGoal: number, city: CityState) {
  return claimableCount(computeQuests(sessions, weeklyGoal, city), city)
}
