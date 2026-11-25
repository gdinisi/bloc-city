import type { Session, SessionType } from '../types'
import type { BuildingCat, Rarity } from './buildings'
import { BUILDINGS, RARITIES, buildingById } from './buildings'

export type PackKind = 'seance' | 'bonus' | 'coffre' | 'bienvenue'

export interface Pack {
  id: string
  kind: PackKind
  /** Type de séance qui a rapporté le pack (oriente un peu son contenu) */
  sessionType?: SessionType
  createdAt: string
}

export interface Placed {
  uid: string
  id: string
  x: number
  y: number
  flip: boolean
}

export interface CityState {
  placed: Placed[]
  /** Bâtiments possédés mais pas encore posés */
  inventory: Record<string, number>
  coins: number
  packs: Pack[]
  lastChestAt: string | null
  /** Séances déjà récompensées par un pack */
  rewarded: string[]
  /** Bâtiments déjà obtenus au moins une fois */
  discovered: string[]
}

export interface Card {
  id: string
  isNew: boolean
  /** Doublon au-delà du maximum : converti en pièces */
  coins: number
}

export const GRID = 8
export const CHEST_EVERY_MS = 6 * 60 * 60 * 1000

export const PACK_INFO: Record<PackKind, { label: string; emoji: string; color: string; cards: number; hint: string }> = {
  seance: { label: 'Pack de séance', emoji: '🎁', color: '#ff8a3d', cards: 3, hint: '3 cartes' },
  bonus: { label: 'Pack bonus', emoji: '💎', color: '#9b51e0', cards: 4, hint: '4 cartes dont 1 rare minimum' },
  coffre: { label: 'Coffre du jour', emoji: '🧰', color: '#2f80ed', cards: 1, hint: '1 carte + des pièces' },
  bienvenue: { label: 'Pack de bienvenue', emoji: '🎉', color: '#2ecc71', cards: 3, hint: 'Tes premiers bâtiments' },
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

export const newCity = (): CityState => ({
  placed: [],
  inventory: {},
  coins: 0,
  packs: [{ id: uid(), kind: 'bienvenue', createdAt: new Date().toISOString() }],
  lastChestAt: null,
  rewarded: [],
  discovered: [],
})

/** Une séance longue ou intense rapporte un pack bonus */
export const packKindFor = (s: Session): PackKind =>
  s.durationMin >= 90 || s.rpe >= 8 || (s.guided?.level ?? 0) >= 7 ? 'bonus' : 'seance'

/** Ajoute un pack pour chaque séance d'entraînement pas encore récompensée */
export function rewardSessions(city: CityState, sessions: Session[]): CityState {
  const fresh = sessions.filter((s) => s.type !== 'repos' && !city.rewarded.includes(s.id))
  if (!fresh.length) return city
  return {
    ...city,
    rewarded: [...city.rewarded, ...fresh.map((s) => s.id)],
    packs: [...city.packs, ...fresh.map((s) => ({ id: uid(), kind: packKindFor(s), sessionType: s.type, createdAt: new Date().toISOString() }))],
  }
}

export const ownedCount = (city: CityState, id: string) => (city.inventory[id] ?? 0) + city.placed.filter((p) => p.id === id).length

export const population = (city: CityState) => city.placed.reduce((sum, p) => sum + RARITIES[buildingById(p.id)?.rarity ?? 'commun'].pop, 0)

export const chestReadyAt = (city: CityState) => (city.lastChestAt ? new Date(city.lastChestAt).getTime() + CHEST_EVERY_MS : 0)

/** Catégorie favorisée selon le type de séance */
const BIAS: Partial<Record<SessionType, BuildingCat>> = { salle: 'escalade', exterieur: 'escalade', maison: 'parcs' }

function rollRarity(rnd: () => number, minRare: boolean, chest: boolean): Rarity {
  const table: [Rarity, number][] = chest
    ? [
        ['commun', 80],
        ['rare', 18],
        ['epique', 2],
        ['legendaire', 0],
      ]
    : (Object.entries(RARITIES) as [Rarity, (typeof RARITIES)[Rarity]][]).map(([r, v]) => [r, v.weight])
  const usable = minRare ? table.filter(([r]) => r !== 'commun') : table
  const total = usable.reduce((s, [, w]) => s + w, 0)
  let x = rnd() * total
  for (const [r, w] of usable) {
    x -= w
    if (x < 0) return r
  }
  return usable[0][0]
}

/** Ouvre un pack : renvoie les cartes et la ville mise à jour */
export function openPack(city: CityState, pack: Pack, rnd: () => number = Math.random): { cards: Card[]; city: CityState; bonusCoins: number } {
  let next: CityState = { ...city, inventory: { ...city.inventory }, discovered: [...city.discovered], packs: city.packs.filter((p) => p.id !== pack.id) }
  const cards: Card[] = []

  const give = (id: string) => {
    const b = buildingById(id)!
    const isNew = !next.discovered.includes(id)
    if (ownedCount(next, id) >= RARITIES[b.rarity].max) {
      const coins = RARITIES[b.rarity].coins
      next.coins += coins
      cards.push({ id, isNew: false, coins })
      return
    }
    next.inventory[id] = (next.inventory[id] ?? 0) + 1
    if (isNew) next.discovered.push(id)
    cards.push({ id, isNew, coins: 0 })
  }

  if (pack.kind === 'bienvenue') {
    ;['maison-bleue', 'arbre', 'bloc'].forEach(give)
    return { cards, city: next, bonusCoins: 0 }
  }

  const n = PACK_INFO[pack.kind].cards
  const bias = pack.sessionType ? BIAS[pack.sessionType] : undefined
  for (let i = 0; i < n; i++) {
    const rarity = rollRarity(rnd, pack.kind === 'bonus' && i === 0, pack.kind === 'coffre')
    let pool = BUILDINGS.filter((b) => b.rarity === rarity)
    if (bias && rnd() < 0.4) {
      const themed = pool.filter((b) => b.cat === bias)
      if (themed.length) pool = themed
    }
    // on évite les doublons inutiles la plupart du temps
    const notMaxed = pool.filter((b) => ownedCount(next, b.id) < RARITIES[b.rarity].max)
    if (notMaxed.length && rnd() < 0.75) pool = notMaxed
    give(pool[Math.floor(rnd() * pool.length)].id)
  }

  let bonusCoins = 0
  if (pack.kind === 'coffre') {
    bonusCoins = 5 + Math.floor(rnd() * 11)
    next.coins += bonusCoins
    next.lastChestAt = new Date().toISOString()
  }
  return { cards, city: next, bonusCoins }
}

/** Le coffre du jour devient un pack ouvrable quand il est prêt */
export const chestPack = (): Pack => ({ id: uid(), kind: 'coffre', createdAt: new Date().toISOString() })

export function buy(city: CityState, id: string): CityState | null {
  const b = buildingById(id)
  if (!b) return null
  const price = RARITIES[b.rarity].price
  if (city.coins < price || ownedCount(city, id) >= RARITIES[b.rarity].max) return null
  return {
    ...city,
    coins: city.coins - price,
    inventory: { ...city.inventory, [id]: (city.inventory[id] ?? 0) + 1 },
    discovered: city.discovered.includes(id) ? city.discovered : [...city.discovered, id],
  }
}

export function place(city: CityState, id: string, x: number, y: number): CityState | null {
  if ((city.inventory[id] ?? 0) <= 0 || city.placed.some((p) => p.x === x && p.y === y)) return null
  return {
    ...city,
    inventory: { ...city.inventory, [id]: city.inventory[id] - 1 },
    placed: [...city.placed, { uid: uid(), id, x, y, flip: false }],
  }
}

export function move(city: CityState, puid: string, x: number, y: number): CityState | null {
  if (city.placed.some((p) => p.x === x && p.y === y && p.uid !== puid)) return null
  return { ...city, placed: city.placed.map((p) => (p.uid === puid ? { ...p, x, y } : p)) }
}

export const rotate = (city: CityState, puid: string): CityState => ({
  ...city,
  placed: city.placed.map((p) => (p.uid === puid ? { ...p, flip: !p.flip } : p)),
})

export function store(city: CityState, puid: string): CityState {
  const p = city.placed.find((x) => x.uid === puid)
  if (!p) return city
  return {
    ...city,
    placed: city.placed.filter((x) => x.uid !== puid),
    inventory: { ...city.inventory, [p.id]: (city.inventory[p.id] ?? 0) + 1 },
  }
}
