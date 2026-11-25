import type { CityState } from '../city/economy'
import { newCity } from '../city/economy'
import City3D from './City3D'

/** Ville d'exemple 16 × 16 pour montrer le rendu 3D (mode développement : ?demo3d), sans toucher aux données */
function demoCity(): CityState {
  const ground: Record<string, string> = {}
  const elevation: Record<string, number> = {}
  // rivière nord-sud et pont
  for (let y = 0; y < 16; y++) {
    ground[`7,${y}`] = 'eau'
    ground[`8,${y}`] = 'eau'
  }
  // routes : une avenue est-ouest et deux nord-sud
  for (let x = 0; x < 16; x++) ground[`${x},6`] = x === 7 || x === 8 ? 'pont' : 'route'
  for (let y = 0; y < 16; y++) {
    if (y !== 6) ground[`3,${y}`] = 'route'
    if (y !== 6) ground[`13,${y}`] = 'route'
  }
  ;['4,3', '5,3', '6,3'].forEach((k) => (ground[k] = 'paves'))
  for (let x = 14; x < 16; x++) for (let y = 9; y < 16; y++) ground[`${x},${y}`] = 'sable'
  ground['6,8'] = ground['6,9'] = 'fleurs'
  // colline à l'ouest, plateau au sud
  for (let x = 0; x < 3; x++) for (let y = 9; y < 16; y++) elevation[`${x},${y}`] = y < 11 ? 2 : 3
  for (let x = 4; x < 7; x++) for (let y = 12; y < 16; y++) elevation[`${x},${y}`] = 1
  // bassins perchés : l'eau tombe en cascade dans la mer et dans la rivière
  ;['0,15', '1,15'].forEach((k) => (ground[k] = 'eau'))
  ;['6,14', '6,15'].forEach((k) => (ground[k] = 'eau'))

  const P = (id: string, x: number, y: number, flip = false) => ({ uid: `${id}${x}${y}`, id, x, y, flip })
  return {
    ...newCity(),
    packs: [],
    placed: [
      P('tour-eiffel', 0, 0),
      P('chateau', 4, 0),
      P('arbre', 0, 4),
      P('immeuble', 1, 4),
      P('sapin', 2, 5),
      P('maison-bleue', 4, 4),
      P('maison-jaune', 5, 4),
      P('maison-rose', 6, 4),
      P('chalet', 4, 5, true),
      P('boulangerie', 5, 5),
      P('cafe', 6, 5),
      P('salle-bloc', 4, 7),
      P('fontaine', 6, 7),
      P('grande-paroi', 0, 9),
      P('sapin', 0, 13),
      P('sapin', 2, 13),
      P('arbre', 1, 14),
      P('falaise', 4, 12),
      P('arbre', 6, 11),
      P('pyramide', 9, 0),
      P('gratte-ciel', 14, 0),
      P('immeuble', 14, 3),
      P('arbre', 15, 4),
      P('colisee', 9, 8),
      P('phare', 14, 7),
      P('tour-verre', 9, 12),
      P('arbre', 12, 13),
      P('sapin', 12, 14),
      P('arbre', 10, 5),
      P('sapin', 11, 5),
    ],
    ground,
    elevation,
  }
}

export default function Demo3D() {
  return <City3D city={demoCity()} onClose={() => (location.search = '')} />
}
