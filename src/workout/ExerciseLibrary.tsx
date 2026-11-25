import { useMemo, useState } from 'react'
import type { Category, Equipment, Exercise } from './catalog'
import { EQUIPMENT, EXERCISES } from './catalog'
import { ExerciseFigure, hasAnim } from './Figure'
import { ExerciseSheet } from './ExerciseSheet'
import { GUIDES } from './guides'

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'echauffement', label: 'Échauffement', emoji: '🔥' },
  { id: 'gainage', label: 'Gainage', emoji: '🧱' },
  { id: 'tirage', label: 'Tirage', emoji: '🧗' },
  { id: 'antagonistes', label: 'Antagonistes', emoji: '💪' },
  { id: 'doigts', label: 'Doigts', emoji: '✋' },
  { id: 'jambes', label: 'Jambes', emoji: '🦵' },
  { id: 'mobilite', label: 'Mobilité', emoji: '🧘' },
]

/** Sans accents ni majuscules, pour la recherche */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

interface Props {
  equipment: Equipment[]
  onClose: () => void
}

export function ExerciseLibrary({ equipment, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<Category | 'tous'>('tous')
  const [mine, setMine] = useState(false)
  const [open, setOpen] = useState<Exercise | null>(null)

  const list = useMemo(() => {
    const q = norm(query.trim())
    return EXERCISES.filter((e) => {
      if (cat !== 'tous' && e.category !== cat) return false
      if (mine && !e.needs.every((n) => equipment.includes(n))) return false
      if (!q) return true
      return norm(`${e.name} ${GUIDES[e.id]?.muscles ?? ''}`).includes(q)
    })
  }, [query, cat, mine, equipment])

  return (
    <div className="library">
      <div className="library-head">
        <button type="button" className="round" aria-label="Retour" onClick={onClose}>
          ‹
        </button>
        <h2>Fiches exercices</h2>
        <span className="pill">{list.length}</span>
      </div>

      <input
        className="search"
        type="search"
        placeholder="Chercher un exercice ou un muscle…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="chips scroll-x">
        <button type="button" className={`chip ${cat === 'tous' ? 'on' : ''}`} onClick={() => setCat('tous')}>
          Tous
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={`chip ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <label className="mine">
        <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Seulement avec mon matériel
      </label>

      {list.length === 0 && <p className="muted empty">Aucun exercice ne correspond.</p>}

      <div className="library-list">
        {CATEGORIES.filter((c) => list.some((e) => e.category === c.id)).map((c) => (
          <section key={c.id}>
            <div className="plan-phase">
              {c.emoji} {c.label}
            </div>
            {list
              .filter((e) => e.category === c.id)
              .map((e) => (
                <button key={e.id} type="button" className="lib-item" onClick={() => setOpen(e)}>
                  <span className="lib-thumb">
                    {hasAnim(e.id) ? <ExerciseFigure id={e.id} size="small" frame={e.id === 'jumping' ? 1 : 0} /> : <span>📄</span>}
                  </span>
                  <span className="lib-text">
                    <b>{e.name}</b>
                    <span className="muted">{GUIDES[e.id]?.muscles}</span>
                    {e.needs.length > 0 && (
                      <span className="lib-needs">
                        {e.needs.map((n) => EQUIPMENT.find((x) => x.id === n)?.emoji + ' ' + EQUIPMENT.find((x) => x.id === n)?.label).join(' · ')}
                      </span>
                    )}
                  </span>
                </button>
              ))}
          </section>
        ))}
      </div>

      {open && <ExerciseSheet ex={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
