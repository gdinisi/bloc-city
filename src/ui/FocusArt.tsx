import type { Focus } from '../workout/generator'
import { MountainArt } from './MountainArt'
import type { ArtVariant } from './MountainArt'

/** Illustration associée à chaque type de séance maison */
export const FOCUS_ART: Record<Focus, ArtVariant> = {
  complet: 'peak',
  gainage: 'ridge',
  haut: 'wall',
  doigts: 'boulder',
  mobilite: 'dawn',
}

/** Photos qui remplacent l'illustration pour certaines séances */
const FOCUS_PHOTO: Partial<Record<Focus, string>> = {
  complet: 'img/focus-complet.webp',
}

/** Image d'une séance : photo si on en a une, sinon illustration de montagne */
export function FocusArt({ focus, seed = 3, className }: { focus: Focus; seed?: number; className?: string }) {
  const photo = FOCUS_PHOTO[focus]
  if (photo) return <img className={`mountain-art focus-photo ${className ?? ''}`} src={`${import.meta.env.BASE_URL}${photo}`} alt="" draggable={false} />
  return <MountainArt variant={FOCUS_ART[focus]} seed={seed} className={className} />
}
