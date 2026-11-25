import type { Session } from '../types'
import { GRADES_XP, experience, fmtHours } from '../lib/xp'
import { Icon } from './Icon'
import { GradeLogo } from './GradeLogo'

/** Barre d'expérience : niveau de grimpeur selon les heures de sport réalisées */
export function XpBar({ sessions }: { sessions: Session[] }) {
  const xp = experience(sessions)
  return (
    <section className="card xp-card">
      <div className="xp-head">
        <GradeLogo level={xp.level} size={46} />
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

/** Version compacte pour l'en-tête de l'app : niveau, grade et progression */
export function TopXp({ sessions, onOpen }: { sessions: Session[]; onOpen: () => void }) {
  const xp = experience(sessions)
  return (
    <button type="button" className="top-xp" onClick={onOpen} aria-label={`Niveau ${xp.level}, ${xp.title}. Voir les grades`}>
      <GradeLogo level={xp.level} size={38} />
      <span className="top-xp-body">
        <span className="top-xp-line">
          <b>{xp.title}</b>
        </span>
        <span className="xp-bar thin">
          <i style={{ width: `${Math.max(3, xp.progress * 100)}%` }} />
        </span>
      </span>
    </button>
  )
}

/** Liste des grades (onglet Stats) */
export function XpGrades({ sessions }: { sessions: Session[] }) {
  const xp = experience(sessions)
  return (
    <details className="card fold xp-grades">
      <summary>
        <GradeLogo level={xp.level} size={44} />
        <span className="fold-title">
          <small>Grade · niveau {xp.level}</small>
          <b>{xp.title}</b>
        </span>
        <Icon name="chevron" size={18} className="fold-chevron" />
      </summary>
      <p className="muted small-text">Ton grade monte avec les heures de sport (salle, maison, extérieur). Chaque grade demande un peu plus d'heures que le précédent.</p>
      <XpBar sessions={sessions} />
      <ol className="grade-list">
        {GRADES_XP.map((g) => {
          const state = g.level < xp.level ? 'done' : g.level === xp.level ? 'current' : 'locked'
          return (
            <li key={g.level} className={state}>
              <GradeLogo level={g.level} size={36} locked={state === 'locked'} />
              <span className="grade-name">
                <b>{g.title}</b>
                <small>{g.hours === 0 ? 'Dès le départ' : `à partir de ${fmtHours(g.hours)}`}</small>
              </span>
              {state === 'current' && <span className="pill">Toi</span>}
              {state === 'done' && <Icon name="check" size={16} stroke={2.4} className="grade-check" />}
              {state === 'locked' && <span className="grade-left">encore {fmtHours(g.hours - xp.hours)}</span>}
            </li>
          )
        })}
      </ol>
    </details>
  )
}
