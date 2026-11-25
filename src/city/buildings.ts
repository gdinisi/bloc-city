export type Rarity = 'commun' | 'rare' | 'epique' | 'legendaire'
export type BuildingCat = 'maisons' | 'commerces' | 'parcs' | 'escalade' | 'monuments'

export type Kind =
  | 'house'
  | 'tower'
  | 'tree'
  | 'pine'
  | 'garden'
  | 'water'
  | 'fountain'
  | 'kiosk'
  | 'stall'
  | 'boulder'
  | 'wall'
  | 'gym'
  | 'cliff'
  | 'bigwall'
  | 'statue'
  | 'lighthouse'
  | 'clock'
  | 'castle'
  | 'observatory'

export interface Building {
  id: string
  name: string
  rarity: Rarity
  cat: BuildingCat
  kind: Kind
  /** Couleur principale (murs) */
  color: string
  /** Couleur du toit / détail */
  accent: string
  /** Hauteur des murs (px) */
  h: number
  roof?: 'pyramid' | 'flat' | 'none'
  floors?: number
}

export const RARITIES: Record<Rarity, { label: string; color: string; glow: string; pop: number; coins: number; price: number; max: number; weight: number }> = {
  commun: { label: 'Commun', color: '#7a8597', glow: '#dfe5ee', pop: 5, coins: 5, price: 25, max: 4, weight: 70 },
  rare: { label: 'Rare', color: '#2f80ed', glow: '#cfe3ff', pop: 12, coins: 15, price: 70, max: 2, weight: 22 },
  epique: { label: 'Épique', color: '#9b51e0', glow: '#ead8ff', pop: 25, coins: 40, price: 160, max: 1, weight: 7 },
  legendaire: { label: 'Légendaire', color: '#f2994a', glow: '#ffe6c7', pop: 60, coins: 100, price: 400, max: 1, weight: 1 },
}

export const CATS: Record<BuildingCat, { label: string; emoji: string }> = {
  maisons: { label: 'Maisons', emoji: '🏠' },
  commerces: { label: 'Commerces', emoji: '🥐' },
  parcs: { label: 'Parcs & nature', emoji: '🌳' },
  escalade: { label: 'Escalade', emoji: '🧗' },
  monuments: { label: 'Monuments', emoji: '🗼' },
}

export const BUILDINGS: Building[] = [
  // ---------- Maisons ----------
  { id: 'maison-bleue', name: 'Maison bleue', rarity: 'commun', cat: 'maisons', kind: 'house', color: '#7cb7f2', accent: '#e85d4f', h: 18, roof: 'pyramid' },
  { id: 'maison-jaune', name: 'Maison jaune', rarity: 'commun', cat: 'maisons', kind: 'house', color: '#ffd166', accent: '#c0392b', h: 18, roof: 'pyramid' },
  { id: 'maison-rose', name: 'Maison rose', rarity: 'commun', cat: 'maisons', kind: 'house', color: '#ff9fb2', accent: '#6c4f9e', h: 16, roof: 'pyramid' },
  { id: 'chalet', name: 'Chalet', rarity: 'commun', cat: 'maisons', kind: 'house', color: '#c9925b', accent: '#6b3d1f', h: 16, roof: 'pyramid' },
  { id: 'immeuble', name: 'Immeuble', rarity: 'rare', cat: 'maisons', kind: 'tower', color: '#f4a261', accent: '#7a4a2a', h: 46, roof: 'flat', floors: 4 },
  { id: 'villa', name: 'Villa', rarity: 'rare', cat: 'maisons', kind: 'house', color: '#fffaf0', accent: '#2a9d8f', h: 24, roof: 'flat' },
  { id: 'gratte-ciel', name: 'Gratte-ciel', rarity: 'epique', cat: 'maisons', kind: 'tower', color: '#8ecae6', accent: '#2b2d42', h: 78, roof: 'flat', floors: 7 },

  // ---------- Commerces ----------
  { id: 'boulangerie', name: 'Boulangerie', rarity: 'commun', cat: 'commerces', kind: 'house', color: '#f6d6ad', accent: '#b5651d', h: 18, roof: 'flat' },
  { id: 'cafe', name: 'Café', rarity: 'commun', cat: 'commerces', kind: 'house', color: '#a8dadc', accent: '#e63946', h: 17, roof: 'flat' },
  { id: 'marche', name: 'Étal du marché', rarity: 'commun', cat: 'commerces', kind: 'stall', color: '#e9c46a', accent: '#e76f51', h: 10 },
  { id: 'magasin-sport', name: 'Magasin de sport', rarity: 'rare', cat: 'commerces', kind: 'house', color: '#ff8a3d', accent: '#2b2d42', h: 22, roof: 'flat' },

  // ---------- Parcs & nature ----------
  { id: 'arbre', name: 'Arbre', rarity: 'commun', cat: 'parcs', kind: 'tree', color: '#52b788', accent: '#8d5524', h: 22 },
  { id: 'sapin', name: 'Sapin', rarity: 'commun', cat: 'parcs', kind: 'pine', color: '#2d6a4f', accent: '#8d5524', h: 28 },
  { id: 'jardin', name: 'Jardin fleuri', rarity: 'commun', cat: 'parcs', kind: 'garden', color: '#95d5b2', accent: '#ff70a6', h: 2 },
  { id: 'lac', name: 'Petit lac', rarity: 'rare', cat: 'parcs', kind: 'water', color: '#4cc9f0', accent: '#caf0f8', h: 0 },
  { id: 'fontaine', name: 'Fontaine', rarity: 'rare', cat: 'parcs', kind: 'fountain', color: '#cfd8dc', accent: '#4cc9f0', h: 8 },
  { id: 'kiosque', name: 'Kiosque', rarity: 'rare', cat: 'parcs', kind: 'kiosk', color: '#ffffff', accent: '#2a9d8f', h: 16 },

  // ---------- Escalade ----------
  { id: 'bloc', name: 'Bloc de pierre', rarity: 'commun', cat: 'escalade', kind: 'boulder', color: '#9aa5b1', accent: '#ff595e', h: 14 },
  { id: 'mur', name: 'Mur d\'escalade', rarity: 'rare', cat: 'escalade', kind: 'wall', color: '#5c677d', accent: '#ffca3a', h: 36 },
  { id: 'refuge', name: 'Refuge', rarity: 'rare', cat: 'escalade', kind: 'house', color: '#8d99ae', accent: '#9d0208', h: 16, roof: 'pyramid' },
  { id: 'salle-bloc', name: 'Salle de bloc', rarity: 'epique', cat: 'escalade', kind: 'gym', color: '#3a86ff', accent: '#ffbe0b', h: 30 },
  { id: 'falaise', name: 'Falaise', rarity: 'epique', cat: 'escalade', kind: 'cliff', color: '#b08968', accent: '#ffca3a', h: 44 },
  { id: 'grande-paroi', name: 'Grande paroi', rarity: 'legendaire', cat: 'escalade', kind: 'bigwall', color: '#a8a29e', accent: '#ff006e', h: 84 },

  // ---------- Monuments ----------
  { id: 'statue', name: 'Statue du grimpeur', rarity: 'rare', cat: 'monuments', kind: 'statue', color: '#c9b79c', accent: '#ffd166', h: 26 },
  { id: 'tour-horloge', name: 'Tour de l\'horloge', rarity: 'epique', cat: 'monuments', kind: 'clock', color: '#e9d8a6', accent: '#9b2226', h: 56 },
  { id: 'phare', name: 'Phare', rarity: 'epique', cat: 'monuments', kind: 'lighthouse', color: '#ffffff', accent: '#e63946', h: 62 },
  { id: 'chateau', name: 'Château', rarity: 'legendaire', cat: 'monuments', kind: 'castle', color: '#d6ccc2', accent: '#3d5a80', h: 36 },
  { id: 'observatoire', name: 'Observatoire', rarity: 'legendaire', cat: 'monuments', kind: 'observatory', color: '#e0e1dd', accent: '#415a77', h: 28 },
]

export const buildingById = (id: string) => BUILDINGS.find((b) => b.id === id)

/** Niveau de la ville selon la population */
export const CITY_LEVELS = [0, 20, 50, 100, 170, 260, 380, 520, 700, 900]
export const cityLevel = (pop: number) => {
  let l = 1
  CITY_LEVELS.forEach((min, i) => {
    if (pop >= min) l = i + 1
  })
  return l
}
export const nextLevelAt = (pop: number) => CITY_LEVELS.find((min) => min > pop) ?? null
