import type { Exercise } from './catalog'
import { EQUIPMENT } from './catalog'
import { ExerciseFigure, hasAnim } from './Figure'
import { GUIDES, videoUrl } from './guides'

interface Props {
  ex: Exercise
  onClose: () => void
}

export function ExerciseSheet({ ex, onClose }: Props) {
  const g = GUIDES[ex.id]
  const needs = ex.needs.map((n) => EQUIPMENT.find((e) => e.id === n)?.label).filter(Boolean)

  return (
    <div className="sheet-backdrop top" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={ex.name} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="day-head">
          <h2>{ex.name}</h2>
          <button type="button" className="round" aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </div>

        {hasAnim(ex.id) && <ExerciseFigure id={ex.id} />}

        {g ? (
          <>
            <p className="guide-muscles">
              <b>Travaille :</b> {g.muscles}
              {needs.length > 0 && (
                <>
                  <br />
                  <b>Matériel :</b> {needs.join(', ')}
                </>
              )}
            </p>

            <div className="guide-block">
              <h3>Comment faire</h3>
              <ol>
                {g.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>

            <div className="guide-block warn">
              <h3>À éviter</h3>
              <ul>
                {g.mistakes.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>

            {(g.easier || g.harder) && (
              <div className="guide-variants">
                {g.easier && (
                  <div>
                    <b>Plus facile</b>
                    <span>{g.easier}</span>
                  </div>
                )}
                {g.harder && (
                  <div>
                    <b>Plus dur</b>
                    <span>{g.harder}</span>
                  </div>
                )}
              </div>
            )}

            <a className="btn guide-video" href={videoUrl(g.video)} target="_blank" rel="noopener noreferrer">
              ▶ Voir des vidéos (YouTube)
            </a>
          </>
        ) : (
          <p className="player-cue">{ex.cue}</p>
        )}
      </div>
    </div>
  )
}
