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

function QuestRow({ q, city, onClaim, compact }: { q: Quest; city: CityState; onClaim: (q: Quest) => void; compact?: boolean }) {
  const done = isDone(q)
  const claimed = isClaimed(q, city)
  return (
    <li className={`quest ${claimed ? 'claimed' : done ? 'done' : ''} ${compact ? 'compact' : ''}`}>
      <span className="quest-emoji">{q.emoji}</span>
      <span className="quest-body">
        <b>{q.title}</b>
        <span className="quest-bar">
          <i style={{ width: `${(q.progress / q.target) * 100}%` }} />
        </span>
        {!compact && <span className={`quest-reward ${q.exclusive ? 'excl' : ''}`}>{q.rewardLabel}</span>}
      </span>
      {claimed ? (
        <span className="quest-state">✓</span>
      ) : done ? (
        <button type="button" className="btn primary small" onClick={() => onClaim(q)}>
          {compact ? 'Prendre' : 'Récupérer'}
        </button>
      ) : (
        <span className="quest-state muted">
          {q.progress}/{q.target}
        </span>
      )}
    </li>
  )
}

/** Récupération d'une quête, avec petit message et son */
function useClaim(onCity: Props['onCity']) {
  const [toast, setToast] = useState<string | null>(null)
  const claim = (q: Quest) => {
    unlockAudio()
    onCity((c) => applyReward(c, q.reward, q.key))
    setToast(`🎉 ${q.rewardLabel}`)
    beep(880, 120)
    setTimeout(() => beep(1175, 200), 130)
    buzz(80)
    setTimeout(() => setToast(null), 2600)
  }
  return { toast, claim }
}

function QuestsOverlay({ quests, city, onClaim, onClose, toast }: { quests: Quest[]; city: CityState; onClaim: (q: Quest) => void; onClose: () => void; toast: string | null }) {
  const ready = claimableCount(quests, city)
  return (
    <div className="library" role="dialog" aria-label="Toutes les quêtes">
      <div className="library-head">
        <button type="button" className="round" aria-label="Retour" onClick={onClose}>
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
                <QuestRow key={q.key} q={q} city={city} onClaim={onClaim} />
              ))}
          </ul>
        </section>
      ))}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

/**
 * Version compacte pour l'accueil : les 3 quêtes les plus utiles maintenant
 * (d'abord celles à récupérer, puis les plus avancées).
 */
export function QuestsMini({ sessions, weeklyGoal, city, onCity }: Props) {
  const [all, setAll] = useState(false)
  const { toast, claim } = useClaim(onCity)
  const quests = computeQuests(sessions, weeklyGoal, city)
  const ready = claimableCount(quests, city)
  const shown = quests
    .filter((q) => !isClaimed(q, city))
    .sort((a, b) => Number(isDone(b)) - Number(isDone(a)) || b.progress / b.target - a.progress / a.target)
    .slice(0, 3)

  return (
    <section className="card home-quests">
      <div className="day-head">
        <h2>🗺️ Quêtes</h2>
        <button type="button" className="link-btn" onClick={() => setAll(true)}>
          {ready > 0 ? `${ready} à récupérer · ` : ''}Tout voir ›
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="muted small-text">Toutes les quêtes du moment sont faites. Bravo !</p>
      ) : (
        <ul className="quest-list">
          {shown.map((q) => (
            <QuestRow key={q.key} q={q} city={city} onClaim={claim} compact />
          ))}
        </ul>
      )}
      {toast && <div className="toast">{toast}</div>}
      {all && <QuestsOverlay quests={quests} city={city} onClaim={claim} onClose={() => setAll(false)} toast={toast} />}
    </section>
  )
}

export function useClaimable(sessions: Session[], weeklyGoal: number, city: CityState) {
  return claimableCount(computeQuests(sessions, weeklyGoal, city), city)
}
