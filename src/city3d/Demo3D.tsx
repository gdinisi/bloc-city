import type { CityState } from '../city/economy'
import { newCity } from '../city/economy'
import City3D from './City3D'

/** Ville d'exemple pour montrer le rendu 3D (mode développement : ?demo3d), sans toucher aux données */
function demoCity(): CityState {
  const ground: Record<string, string> = {}
  const elevation: Record<string, number> = {}
  for (let i = 0; i < 12; i++) ground[`2,${i}`] = 'route'
  for (let i = 3; i < 12; i++) ground[`${i},4`] = 'route'
  for (let i = 0; i < 12; i++) {
    ground[`6,${i}`] = 'eau'
    ground[`7,${i}`] = 'eau'
  }
  ground['6,4'] = 'pont'
  ground['7,4'] = 'pont'
  for (let x = 0; x < 2; x++) for (let y = 7; y < 12; y++) elevation[`${x},${y}`] = Math.min(3, y - 6)
  ;['3,0', '4,0', '5,0'].forEach((k) => (ground[k] = 'paves'))
  ;['9,9', '8,9', '9,8', '10,9'].forEach((k) => (ground[k] = 'sable'))
  ground['5,9'] = 'planches'
  ground['0,5'] = ground['1,5'] = 'fleurs'
  ground['10,10'] = ground['11,10'] = 'neige'
  ground['11,11'] = 'terre'
  const P = (id: string, x: number, y: number) => ({ uid: `${id}${x}${y}`, id, x, y, flip: false })
  return {
    ...newCity(),
    packs: [],
    // niveau suffisant pour une carte 12 × 12
    placed: [
      P('maison-bleue', 3, 2),
      P('maison-jaune', 3, 5),
      P('arbre', 0, 8),
      P('chateau', 3, 7),
      P('immeuble', 4, 2),
      P('sapin', 1, 9),
      P('phare', 8, 6),
      P('pyramide', 8, 1),
      P('tour-eiffel', 0, 0),
      P('salle-bloc', 5, 5),
      P('bloc', 0, 3),
      P('arbre', 1, 4),
      P('sapin', 9, 3),
      P('fontaine', 3, 3),
      P('falaise', 1, 7),
      P('colisee', 8, 8),
      P('chalet', 4, 6),
      P('boulangerie', 5, 3),
      P('maison-rose', 10, 6),
      P('arbre', 11, 7),
    ],
    ground,
    elevation,
  }
}

export default function Demo3D() {
  return <City3D city={demoCity()} onClose={() => (location.search = '')} />
}
