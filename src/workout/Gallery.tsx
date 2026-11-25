import { EXERCISES } from './catalog'
import { ExerciseFigure, hasAnim } from './Figure'
import { ANIMS } from './anims'

/** Page de contrôle des animations (mode développement : ?galerie) — images clés figées côte à côte */
export function Gallery() {
  const only = new URLSearchParams(location.search).get('galerie')
  const ids = only ? only.split(',') : null
  return (
    <div className="gallery">
      {EXERCISES.filter((e) => hasAnim(e.id) && (!ids || ids.includes(e.id))).map((e) => {
        const n = Math.max(2, Math.min(4, ANIMS[e.id]?.frames.length ?? 3))
        return (
          <div key={e.id} className="gallery-item">
            <div className="gallery-frames" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
              {Array.from({ length: n }, (_, i) => (
                <ExerciseFigure key={i} id={e.id} size="small" frame={i} />
              ))}
            </div>
            <div>{e.name}</div>
          </div>
        )
      })}
    </div>
  )
}
