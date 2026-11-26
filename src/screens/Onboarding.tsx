import { useState } from 'react'
import type { Session, Settings } from '../types'
import { EQUIPMENT } from '../workout/catalog'
import type { Equipment } from '../workout/catalog'

/** Condition sportive annoncée → niveau de la première séance guidée (1 à 10) */
const CONDITIONS: { niveau: number; titre: string; detail: string }[] = [
  { niveau: 2, titre: 'Je débute', detail: 'Peu ou pas de sport, ou reprise après une longue pause' },
  { niveau: 3, titre: 'De temps en temps', detail: 'Un peu de sport quand j\'ai le temps' },
  { niveau: 5, titre: 'Régulier', detail: '1 à 2 séances par semaine' },
  { niveau: 7, titre: 'Bien entraîné', detail: '3 séances ou plus par semaine' },
  { niveau: 8, titre: 'Très entraîné', detail: 'Je cherche du défi' },
]

/**
 * Questionnaire de départ, juste après la première connexion : le matériel que l'on possède
 * et une estimation de sa condition, pour régler la première séance maison.
 */
export function Onboarding({ settings, sessions, onDone }: { settings: Settings; sessions: Session[]; onDone: (patch: Partial<Settings>) => void }) {
  // le niveau est déjà calculé d'après les séances guidées faites : pas besoin de le demander
  const dejaGuide = sessions.some((s) => s.guided)
  const [etape, setEtape] = useState<'materiel' | 'condition'>('materiel')
  const [materiel, setMateriel] = useState<Equipment[]>(settings.equipment)
  const [niveau, setNiveau] = useState<number | null>(null)
  const basculer = (id: Equipment) => setMateriel((m) => (m.includes(id) ? m.filter((e) => e !== id) : [...m, id]))
  const finir = (startLevel?: number) => onDone({ equipment: materiel, onboarded: true, ...(startLevel ? { startLevel } : {}) })

  return (
    <div className="screen onboarding">
      <header className="onb-tete">
        <h1>Bienvenue !</h1>
        <p className="muted">{dejaGuide ? 'Une question rapide pour préparer tes séances maison.' : 'Deux questions rapides pour préparer tes séances maison.'}</p>
      </header>
      <div className="onb-etapes" aria-hidden="true">
        <i className="on" />
        {!dejaGuide && <i className={etape === 'condition' ? 'on' : ''} />}
      </div>
      {etape === 'materiel' ? (
        <section className="card">
          <h2>Ton matériel</h2>
          <p className="muted">Coche ce que tu as à la maison : les séances guidées s'adapteront. Sans rien cocher, tout se fait au poids du corps.</p>
          <div className="onb-choix">
            {EQUIPMENT.map((e) => (
              <button key={e.id} type="button" className={`onb-option ${materiel.includes(e.id) ? 'on' : ''}`} aria-pressed={materiel.includes(e.id)} onClick={() => basculer(e.id)}>
                <span className="onb-emoji">{e.emoji}</span>
                <b>{e.label}</b>
                <span className="onb-coche">{materiel.includes(e.id) ? '✓' : ''}</span>
              </button>
            ))}
          </div>
          <p className="muted small-text">Tu pourras le changer à tout moment dans l'onglet Séances, rubrique « Ton matériel ».</p>
          <button type="button" className="btn primary" onClick={() => (dejaGuide ? finir() : setEtape('condition'))}>
            {dejaGuide ? 'C\'est parti' : 'Continuer'}
          </button>
        </section>
      ) : (
        <section className="card">
          <h2>Ta condition sportive</h2>
          <p className="muted">Une estimation suffit : elle règle la difficulté de ta première séance maison.</p>
          <div className="onb-choix">
            {CONDITIONS.map((c) => (
              <button key={c.niveau} type="button" className={`onb-option ${niveau === c.niveau ? 'on' : ''}`} aria-pressed={niveau === c.niveau} onClick={() => setNiveau(c.niveau)}>
                <span className="onb-texte">
                  <b>{c.titre}</b>
                  <span>{c.detail}</span>
                </span>
                <span className="onb-coche">{niveau === c.niveau ? '✓' : ''}</span>
              </button>
            ))}
          </div>
          <p className="muted small-text">Ensuite, le niveau s'ajuste tout seul après chaque séance, selon ton ressenti.</p>
          <div className="onb-actions">
            <button type="button" className="btn ghost" onClick={() => setEtape('materiel')}>
              Retour
            </button>
            <button type="button" className="btn primary" disabled={niveau === null} onClick={() => finir(niveau ?? undefined)}>
              C'est parti
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
