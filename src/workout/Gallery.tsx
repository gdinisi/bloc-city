import { EXERCISES } from './catalog'
import { ExerciseFigure, animCycle, hasAnim } from './Figure'
import { ANIMS } from './anims'

/**
 * Page de contrôle des animations (mode développement).
 * ?galerie            -> images clés de toutes les animations
 * ?galerie=a,b        -> seulement ces exercices
 * ?galerie=a,b&film=8 -> 8 instants répartis sur un cycle (pour voir les transitions)
 */
export function Gallery() {
  const q = new URLSearchParams(location.search)
  const only = q.get('galerie')
  const film = Number(q.get('film')) || 0
  const ids = only ? only.split(',') : null
  return (
    <div className="gallery" style={film ? { gridTemplateColumns: '1fr' } : undefined}>
      {EXERCISES.filter((e) => hasAnim(e.id) && (!ids || ids.includes(e.id))).map((e) => {
        const n = film || Math.max(2, Math.min(4, ANIMS[e.id]?.frames.length ?? 3))
        const cycle = animCycle(e.id)
        return (
          <div key={e.id} className="gallery-item">
            <div className="gallery-frames" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
              {Array.from({ length: n }, (_, i) =>
                film ? (
                  <ExerciseFigure key={i} id={e.id} size="small" at={(cycle * i) / n} />
                ) : (
                  <ExerciseFigure key={i} id={e.id} size="small" frame={i} />
                ),
              )}
            </div>
            <div>{e.name}</div>
          </div>
        )
      })}
    </div>
  )
}
