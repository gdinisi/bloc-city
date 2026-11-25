import type { Session } from '../types'
import { experience, fmtHours } from '../lib/xp'
import { Icon } from './Icon'

/** Barre d'expérience : niveau de grimpeur selon les heures de sport réalisées */
export function XpBar({ sessions }: { sessions: Session[] }) {
  const xp = experience(sessions)
  return (
    <section className="card xp-card">
      <div className="xp-head">
        <span className="xp-badge">
          <Icon name="mountain" size={16} stroke={2} />
          <b>{xp.level}</b>
        </span>
        <span className="xp-title">
          <small>Niveau {xp.level}</small>
          <b>{xp.title}</b>
        </span>
        <span className="xp-total">
          <b>{fmtHours(xp.hours)}</b>
          <small>de sport</small>
        </span>
      </div>
      <div className="xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(xp.progress * 100)}>
        <i style={{ width: `${Math.max(2, xp.progress * 100)}%` }} />
      </div>
      <p className="xp-next">
        Encore <b>{fmtHours(xp.left)}</b> pour le niveau {xp.level + 1}
      </p>
    </section>
  )
}
