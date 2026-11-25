import { EXERCISES } from './catalog'
import { ExerciseFigure, hasAnim } from './Figure'

/** Page de contrôle des animations (mode développement : ?galerie) — images clés figées côte à côte */
export function Gallery() {
  return (
    <div className="gallery">
      {EXERCISES.filter((e) => hasAnim(e.id)).map((e) => (
        <div key={e.id} className="gallery-item">
          <div className="gallery-frames">
            <ExerciseFigure id={e.id} size="small" frame={0} />
            <ExerciseFigure id={e.id} size="small" frame={1} />
            <ExerciseFigure id={e.id} size="small" frame={2} />
          </div>
          <div>{e.name}</div>
        </div>
      ))}
    </div>
  )
}
