export type Rarity = 'commun' | 'rare' | 'epique' | 'legendaire' | 'merveille'
export type BuildingCat = 'maisons' | 'commerces' | 'parcs' | 'escalade' | 'monuments' | 'merveilles'

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
  | 'pyramid'
  | 'eiffel'
  | 'colosseum'
  | 'glass'
  | 'temple'
  | 'moai'
  | 'rocket'
  | 'arch'

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
  /** Hauteur des murs (px, à l'échelle d'une case) */
  h: number
  roof?: 'pyramid' | 'flat' | 'none'
  floors?: number
  /** Emprise au sol en cases de côté : 1 = une case, 4 = 4 × 4 cases */
  size?: 1 | 2 | 3 | 4
  /** 'quete' : ne s'obtient que par une quête (jamais dans les packs ni la boutique) */
  source?: 'quete'
}

export const RARITIES: Record<
  Rarity,
  { label: string; color: string; glow: string; pop: number; coins: number; price: number; max: number; weight: number; fragments: number }
> = {
  commun: { label: 'Commun', color: '#7a8597', glow: '#dfe5ee', pop: 5, coins: 5, price: 25, max: 4, weight: 70, fragments: 1 },
  rare: { label: 'Rare', color: '#2f80ed', glow: '#cfe3ff', pop: 12, coins: 15, price: 70, max: 2, weight: 22, fragments: 1 },
  epique: { label: 'Épique', color: '#9b51e0', glow: '#ead8ff', pop: 25, coins: 30, price: 45, max: 1, weight: 7, fragments: 4 },
  legendaire: { label: 'Légendaire', color: '#f2994a', glow: '#ffe6c7', pop: 60, coins: 60, price: 90, max: 1, weight: 1, fragments: 6 },
  merveille: { label: 'Merveille', color: '#d4a106', glow: '#fff3b0', pop: 150, coins: 120, price: 0, max: 1, weight: 0, fragments: 10 },
}

/** Les raretés qui arrivent en fragments (à assembler) */
export const BY_FRAGMENTS: Rarity[] = ['epique', 'legendaire', 'merveille']

export const CATS: Record<BuildingCat, { label: string; emoji: string }> = {
  maisons: { label: 'Maisons', emoji: '🏠' },
  commerces: { label: 'Commerces', emoji: '🥐' },
  parcs: { label: 'Parcs & nature', emoji: '🌳' },
  escalade: { label: 'Escalade', emoji: '🧗' },
  monuments: { label: 'Monuments', emoji: '🗼' },
  merveilles: { label: 'Merveilles', emoji: '✨' },
}

export const BUILDINGS: Building[] = [
  // ---------- Maisons ----------
  { id: 'maison-bleue', name: 'Maison bleue', rarity: 'commun', cat: 'maisons', kind: 'house', color: '#7cb7f2', accent: '#e85d4f', h: 18, roof: 'pyramid' },
  { id: 'maison-jaune', name: 'Maison jaune', rarity: 'commun', cat: 'maisons', kind: 'house', color: '#ffd166', accent: '#c0392b', h: 18, roof: 'pyramid' },
  { id: 'maison-rose', name: 'Maison rose', rarity: 'commun', cat: 'maisons', kind: 'house', color: '#ff9fb2', accent: '#6c4f9e', h: 16, roof: 'pyramid' },
  { id: 'chalet', name: 'Chalet', rarity: 'commun', cat: 'maisons', kind: 'house', color: '#c9925b', accent: '#6b3d1f', h: 16, roof: 'pyramid' },
  { id: 'immeuble', name: 'Immeuble', rarity: 'rare', cat: 'maisons', kind: 'tower', color: '#f4a261', accent: '#7a4a2a', h: 46, roof: 'flat', floors: 4 },
  { id: 'villa', name: 'Villa', rarity: 'rare', cat: 'maisons', kind: 'house', color: '#fffaf0', accent: '#2a9d8f', h: 24, roof: 'flat' },
  { id: 'gratte-ciel', name: 'Gratte-ciel', rarity: 'epique', cat: 'maisons', kind: 'tower', color: '#8ecae6', accent: '#2b2d42', h: 78, roof: 'flat', floors: 7, size: 2 },

  // ---------- Commerces ----------
  { id: 'boulangerie', name: 'Boulangerie', rarity: 'commun', cat: 'commerces', kind: 'house', color: '#f6d6ad', accent: '#b5651d', h: 18, roof: 'flat' },
  { id: 'cafe', name: 'Café', rarity: 'commun', cat: 'commerces', kind: 'house', color: '#a8dadc', accent: '#e63946', h: 17, roof: 'flat' },
  { id: 'marche', name: 'Étal du marché', rarity: 'commun', cat: 'commerces', kind: 'stall', color: '#e9c46a', accent: '#e76f51', h: 10 },
  { id: 'magasin-sport', name: 'Magasin de sport', rarity: 'rare', cat: 'commerces', kind: 'house', color: '#ff8a3d', accent: '#2b2d42', h: 22, roof: 'flat', size: 2 },

  // ---------- Parcs & nature ----------
  { id: 'arbre', name: 'Arbre', rarity: 'commun', cat: 'parcs', kind: 'tree', color: '#52b788', accent: '#8d5524', h: 22 },
  { id: 'sapin', name: 'Sapin', rarity: 'commun', cat: 'parcs', kind: 'pine', color: '#2d6a4f', accent: '#8d5524', h: 28 },
  { id: 'jardin', name: 'Jardin fleuri', rarity: 'commun', cat: 'parcs', kind: 'garden', color: '#95d5b2', accent: '#ff70a6', h: 2 },
  { id: 'lac', name: 'Petit lac', rarity: 'rare', cat: 'parcs', kind: 'water', color: '#4cc9f0', accent: '#caf0f8', h: 0, size: 2 },
  { id: 'fontaine', name: 'Fontaine', rarity: 'rare', cat: 'parcs', kind: 'fountain', color: '#cfd8dc', accent: '#4cc9f0', h: 8 },
  { id: 'kiosque', name: 'Kiosque', rarity: 'rare', cat: 'parcs', kind: 'kiosk', color: '#ffffff', accent: '#2a9d8f', h: 16 },

  // ---------- Escalade ----------
  { id: 'bloc', name: 'Bloc de pierre', rarity: 'commun', cat: 'escalade', kind: 'boulder', color: '#9aa5b1', accent: '#ff595e', h: 14 },
  { id: 'mur', name: 'Mur d\'escalade', rarity: 'rare', cat: 'escalade', kind: 'wall', color: '#5c677d', accent: '#ffca3a', h: 36 },
  { id: 'refuge', name: 'Refuge', rarity: 'rare', cat: 'escalade', kind: 'house', color: '#8d99ae', accent: '#9d0208', h: 16, roof: 'pyramid' },
  { id: 'salle-bloc', name: 'Salle de bloc', rarity: 'epique', cat: 'escalade', kind: 'gym', color: '#3a86ff', accent: '#ffbe0b', h: 30, size: 2 },
  { id: 'falaise', name: 'Falaise', rarity: 'epique', cat: 'escalade', kind: 'cliff', color: '#b08968', accent: '#ffca3a', h: 44, size: 2 },
  { id: 'grande-paroi', name: 'Grande paroi', rarity: 'legendaire', cat: 'escalade', kind: 'bigwall', color: '#a8a29e', accent: '#ff006e', h: 70, size: 3 },
  { id: 'arche', name: 'Arche de pierre', rarity: 'rare', cat: 'escalade', kind: 'arch', color: '#c08552', accent: '#ffca3a', h: 30, size: 2, source: 'quete' },

  // ---------- Monuments ----------
  { id: 'statue', name: 'Statue du grimpeur', rarity: 'rare', cat: 'monuments', kind: 'statue', color: '#c9b79c', accent: '#ffd166', h: 26, source: 'quete' },
  { id: 'tour-horloge', name: 'Tour de l\'horloge', rarity: 'epique', cat: 'monuments', kind: 'clock', color: '#e9d8a6', accent: '#9b2226', h: 56 },
  { id: 'phare', name: 'Phare', rarity: 'epique', cat: 'monuments', kind: 'lighthouse', color: '#ffffff', accent: '#e63946', h: 62 },
  { id: 'moai', name: 'Moaï', rarity: 'epique', cat: 'monuments', kind: 'moai', color: '#8d8579', accent: '#5e5549', h: 34, source: 'quete' },
  { id: 'chateau', name: 'Château', rarity: 'legendaire', cat: 'monuments', kind: 'castle', color: '#d6ccc2', accent: '#3d5a80', h: 30, size: 3 },
  { id: 'observatoire', name: 'Observatoire', rarity: 'legendaire', cat: 'monuments', kind: 'observatory', color: '#e0e1dd', accent: '#415a77', h: 28, size: 2 },
  { id: 'temple', name: 'Temple grec', rarity: 'legendaire', cat: 'monuments', kind: 'temple', color: '#f1ece2', accent: '#c9b79c', h: 18, size: 3, source: 'quete' },

  // ---------- Merveilles (fragments très rares) ----------
  { id: 'pyramide', name: 'Pyramide', rarity: 'merveille', cat: 'merveilles', kind: 'pyramid', color: '#e9c46a', accent: '#c9a227', h: 30, size: 4 },
  { id: 'tour-eiffel', name: 'Tour Eiffel', rarity: 'merveille', cat: 'merveilles', kind: 'eiffel', color: '#8d6e63', accent: '#5d4037', h: 64, size: 3 },
  { id: 'colisee', name: 'Colisée', rarity: 'merveille', cat: 'merveilles', kind: 'colosseum', color: '#e3c9a0', accent: '#b5895a', h: 20, size: 4 },
  { id: 'tour-verre', name: 'Tour de verre géante', rarity: 'merveille', cat: 'merveilles', kind: 'glass', color: '#9ad1f5', accent: '#2b2d42', h: 58, size: 3 },
  { id: 'fusee', name: 'Fusée', rarity: 'merveille', cat: 'merveilles', kind: 'rocket', color: '#f8f9fa', accent: '#e63946', h: 50, size: 2, source: 'quete' },
]

export const buildingById = (id: string) => BUILDINGS.find((b) => b.id === id)
export const sizeOf = (b: Building) => b.size ?? 1

/** Bâtiments qu'on peut tirer dans les packs (hors exclusivités de quêtes) */
export const DROPPABLE = BUILDINGS.filter((b) => b.source !== 'quete')

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

/** La carte s'agrandit avec le niveau : 8 × 8 au départ, jusqu'à 16 × 16 */
export const gridSizeFor = (level: number) => Math.min(16, 8 + 2 * Math.floor((level - 1) / 2))
export const nextGrowthLevel = (level: number) => (gridSizeFor(level) >= 16 ? null : level + (level % 2 === 1 ? 2 : 1))

/* ---------- Textures de sol ---------- */

export interface Ground {
  id: string
  name: string
  /** Niveau de ville qui la débloque (sinon : via une quête) */
  level?: number
  quest?: boolean
}

export const GROUNDS: Ground[] = [
  { id: 'herbe', name: 'Herbe', level: 1 },
  { id: 'eau', name: 'Eau', level: 1 },
  { id: 'terre', name: 'Terre', level: 2 },
  { id: 'paves', name: 'Pavés', level: 3 },
  { id: 'sable', name: 'Sable', level: 4 },
  { id: 'planches', name: 'Planches', level: 6 },
  { id: 'neige', name: 'Neige', level: 7 },
  { id: 'fleurs', name: 'Prairie fleurie', quest: true },
]

/** Sols sur lesquels on ne peut pas construire */
export const UNBUILDABLE = ['eau', 'pont']

/** Hauteur maximale du relief (en marches) */
export const MAX_ELEVATION = 3
