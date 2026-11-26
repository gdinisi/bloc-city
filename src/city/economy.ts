import type { Session, SessionType } from '../types'
import type { Building, BuildingCat, Rarity } from './buildings'
import { BUILDINGS, BY_FRAGMENTS, DROPPABLE, GROUNDS, MAX_ELEVATION, RARITIES, UNBUILDABLE, buildingById, cityLevel, gridSizeFor, sizeOf } from './buildings'

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
  /** Case du coin arrière (la plus en haut) de l'emprise */
  x: number
  y: number
  flip: boolean
}

export interface CityState {
  placed: Placed[]
  /** Bâtiments possédés mais pas encore posés */
  inventory: Record<string, number>
  /** Fragments en cours d'assemblage */
  fragments: Record<string, number>
  coins: number
  packs: Pack[]
  lastChestAt: string | null
  /** Séances déjà récompensées par un pack */
  rewarded: string[]
  /** Bâtiments déjà obtenus au moins une fois */
  discovered: string[]
  /** Sol peint, clé "x,y" -> texture */
  ground: Record<string, string>
  /** Relief, clé "x,y" -> hauteur (0 à MAX_ELEVATION) */
  elevation: Record<string, number>
  /** Textures débloquées par des quêtes */
  textures: string[]
  /** Quêtes déjà récupérées (clés uniques) */
  claimed: string[]
}

export type Card =
  | { kind: 'building'; id: string; isNew: boolean; coins: number }
  | { kind: 'fragment'; id: string; n: number; have: number; need: number; assembled: boolean; coins: number }

export const CHEST_EVERY_MS = 6 * 60 * 60 * 1000

export const PACK_INFO: Record<PackKind, { label: string; emoji: string; color: string; cards: number; hint: string }> = {
  seance: { label: 'Pack de séance', emoji: '🎁', color: '#ff8a3d', cards: 3, hint: '3 cartes' },
  bonus: { label: 'Pack bonus', emoji: '💎', color: '#9b51e0', cards: 4, hint: '4 cartes dont 1 rare minimum' },
  coffre: { label: 'Coffre du jour', emoji: '🧰', color: '#2f80ed', cards: 1, hint: '1 carte ou des fragments + des pièces' },
  bienvenue: { label: 'Pack de bienvenue', emoji: '🎉', color: '#2ecc71', cards: 3, hint: 'Tes premiers bâtiments' },
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

export const newCity = (): CityState => ({
  placed: [],
  inventory: {},
  fragments: {},
  coins: 0,
  packs: [{ id: uid(), kind: 'bienvenue', createdAt: new Date().toISOString() }],
  lastChestAt: null,
  rewarded: [],
  discovered: [],
  ground: {},
  elevation: {},
  textures: [],
  claimed: [],
})

/** Complète une ville sauvegardée avec une ancienne version */
export const migrateCity = (c: Partial<CityState>): CityState => ({ ...newCity(), packs: [], ...c } as CityState)

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

export const levelOf = (city: CityState) => cityLevel(population(city))
export const gridOf = (city: CityState) => gridSizeFor(levelOf(city))

export const chestReadyAt = (city: CityState) => (city.lastChestAt ? new Date(city.lastChestAt).getTime() + CHEST_EVERY_MS : 0)

export const fragmentsNeeded = (b: Building) => RARITIES[b.rarity].fragments
export const isFragmented = (b: Building) => BY_FRAGMENTS.includes(b.rarity)

/** Textures disponibles : débloquées par le niveau ou par une quête */
export const unlockedGrounds = (city: CityState) => {
  const level = levelOf(city)
  return GROUNDS.filter((g) => (g.level !== undefined && level >= g.level) || city.textures.includes(g.id))
}

/* ---------- Gains ---------- */

type Mutable = CityState

function giveBuilding(c: Mutable, id: string): Card {
  const b = buildingById(id)!
  if (ownedCount(c, id) >= RARITIES[b.rarity].max) {
    const coins = RARITIES[b.rarity].coins
    c.coins += coins
    return { kind: 'building', id, isNew: false, coins }
  }
  const isNew = !c.discovered.includes(id)
  c.inventory[id] = (c.inventory[id] ?? 0) + 1
  if (isNew) c.discovered.push(id)
  return { kind: 'building', id, isNew, coins: 0 }
}

/** Ajoute des fragments ; le bâtiment s'assemble tout seul quand il y en a assez */
function giveFragments(c: Mutable, id: string, n: number): Card {
  const b = buildingById(id)!
  const need = fragmentsNeeded(b)
  if (ownedCount(c, id) >= RARITIES[b.rarity].max) {
    const coins = Math.round((RARITIES[b.rarity].coins * n) / 2)
    c.coins += coins
    return { kind: 'fragment', id, n, have: need, need, assembled: false, coins }
  }
  let have = (c.fragments[id] ?? 0) + n
  let assembled = false
  if (have >= need) {
    have -= need
    assembled = true
    c.inventory[id] = (c.inventory[id] ?? 0) + 1
    if (!c.discovered.includes(id)) c.discovered.push(id)
  }
  c.fragments[id] = have
  return { kind: 'fragment', id, n, have: assembled ? need : have, need, assembled, coins: 0 }
}

const clone = (city: CityState): Mutable => ({
  ...city,
  inventory: { ...city.inventory },
  fragments: { ...city.fragments },
  discovered: [...city.discovered],
  textures: [...city.textures],
  claimed: [...city.claimed],
  packs: [...city.packs],
})

/** Catégorie favorisée selon le type de séance */
const BIAS: Partial<Record<SessionType, BuildingCat>> = { salle: 'escalade', exterieur: 'escalade', maison: 'parcs' }

function rollRarity(rnd: () => number, minRare: boolean): Rarity {
  const table = (['commun', 'rare', 'epique', 'legendaire'] as Rarity[]).map((r) => [r, RARITIES[r].weight] as const)
  const usable = minRare ? table.filter(([r]) => r !== 'commun') : table
  const total = usable.reduce((s, [, w]) => s + w, 0)
  let x = rnd() * total
  for (const [r, w] of usable) {
    x -= w
    if (x < 0) return r
  }
  return usable[0][0]
}

function pickBuilding(c: CityState, rarity: Rarity, rnd: () => number, bias?: BuildingCat, seen?: Set<string>) {
  let pool = DROPPABLE.filter((b) => b.rarity === rarity)
  // pas deux fois le même bâtiment dans un même pack (s'il y a d'autres choix)
  if (seen) {
    const fresh = pool.filter((b) => !seen.has(b.id))
    if (fresh.length) pool = fresh
  }
  if (bias && rnd() < 0.4) {
    const themed = pool.filter((b) => b.cat === bias)
    if (themed.length) pool = themed
  }
  // on évite les doublons inutiles la plupart du temps
  const notMaxed = pool.filter((b) => ownedCount(c, b.id) < RARITIES[b.rarity].max)
  if (notMaxed.length && rnd() < 0.8) pool = notMaxed
  const b = pool[Math.floor(rnd() * pool.length)]
  seen?.add(b.id)
  return b
}

/** Une carte tirée au hasard : bâtiment entier (commun / rare) ou fragments (épique et plus) */
function drawCard(c: Mutable, rnd: () => number, minRare: boolean, bias: BuildingCat | undefined, seen: Set<string>): Card {
  const rarity = rollRarity(rnd, minRare)
  const b = pickBuilding(c, rarity, rnd, bias, seen)
  if (isFragmented(b)) return giveFragments(c, b.id, rarity === 'epique' && rnd() < 0.4 ? 2 : 1)
  return giveBuilding(c, b.id)
}

function wonderFragment(c: Mutable, rnd: () => number): Card {
  const b = pickBuilding(c, 'merveille', rnd)
  return giveFragments(c, b.id, 1)
}

/** Ouvre un pack : renvoie les cartes et la ville mise à jour */
export function openPack(city: CityState, pack: Pack, rnd: () => number = Math.random): { cards: Card[]; city: CityState; bonusCoins: number } {
  const c = clone(city)
  c.packs = c.packs.filter((p) => p.id !== pack.id)
  const cards: Card[] = []
  let bonusCoins = 0

  if (pack.kind === 'bienvenue') {
    ;['maison-bleue', 'arbre', 'bloc'].forEach((id) => cards.push(giveBuilding(c, id)))
    return { cards, city: c, bonusCoins }
  }

  const bias = pack.sessionType ? BIAS[pack.sessionType] : undefined

  if (pack.kind === 'coffre') {
    const x = rnd()
    if (x < 0.55) cards.push(giveBuilding(c, pickBuilding(c, 'commun', rnd, bias).id))
    else if (x < 0.85) cards.push(giveFragments(c, pickBuilding(c, 'epique', rnd, bias).id, 1))
    else if (x < 0.97) cards.push(giveFragments(c, pickBuilding(c, 'legendaire', rnd, bias).id, 1))
    else cards.push(wonderFragment(c, rnd))
    bonusCoins = 5 + Math.floor(rnd() * 11)
    c.coins += bonusCoins
    c.lastChestAt = new Date().toISOString()
    return { cards, city: c, bonusCoins }
  }

  const n = PACK_INFO[pack.kind].cards
  const seen = new Set<string>()
  for (let i = 0; i < n; i++) cards.push(drawCard(c, rnd, pack.kind === 'bonus' && i === 0, bias, seen))
  // les packs bonus ont une petite chance de contenir un fragment de merveille
  if (pack.kind === 'bonus' && rnd() < 0.2) cards.push(wonderFragment(c, rnd))
  return { cards, city: c, bonusCoins }
}

export const chestPack = (): Pack => ({ id: uid(), kind: 'coffre', createdAt: new Date().toISOString() })

/* ---------- Récompenses de quêtes ---------- */

export interface Reward {
  coins?: number
  pack?: PackKind
  /** Fragments d'un bâtiment précis, ou d'un bâtiment au hasard d'une rareté */
  fragments?: { id?: string; rarity?: Rarity; n: number }
  /** Bâtiment exclusif */
  building?: string
  texture?: string
}

export function applyReward(city: CityState, r: Reward, key: string, rnd: () => number = Math.random): CityState {
  if (city.claimed.includes(key)) return city
  const c = clone(city)
  c.claimed.push(key)
  if (r.coins) c.coins += r.coins
  if (r.pack) c.packs.push({ id: uid(), kind: r.pack, createdAt: new Date().toISOString() })
  if (r.building) giveBuilding(c, r.building)
  if (r.texture && !c.textures.includes(r.texture)) c.textures.push(r.texture)
  if (r.fragments) {
    const id = r.fragments.id ?? pickBuilding(c, r.fragments.rarity ?? 'epique', rnd).id
    giveFragments(c, id, r.fragments.n)
  }
  return c
}

/* ---------- Boutique ---------- */

/** Prix : bâtiment entier (commun / rare) ou un fragment (épique / légendaire). Les merveilles ne se vendent pas. */
export const shopPrice = (b: Building) => (b.source === 'quete' || b.rarity === 'merveille' ? null : RARITIES[b.rarity].price)

export function buy(city: CityState, id: string): CityState | null {
  const b = buildingById(id)
  const price = b ? shopPrice(b) : null
  if (!b || price === null || city.coins < price || ownedCount(city, id) >= RARITIES[b.rarity].max) return null
  const c = clone(city)
  c.coins -= price
  if (isFragmented(b)) giveFragments(c, id, 1)
  else giveBuilding(c, id)
  return c
}

/* ---------- Pose sur la carte ---------- */

export const footprint = (x: number, y: number, size: number) => {
  const out: string[] = []
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) out.push(`${x + dx},${y + dy}`)
  return out
}

/** Cases occupées (toutes les cases des emprises), sauf un bâtiment éventuel */
export function occupiedTiles(city: CityState, exceptUid?: string) {
  const set = new Set<string>()
  for (const p of city.placed) {
    if (p.uid === exceptUid) continue
    const b = buildingById(p.id)
    footprint(p.x, p.y, b ? sizeOf(b) : 1).forEach((k) => set.add(k))
  }
  return set
}

export function canPlace(city: CityState, id: string, x: number, y: number, exceptUid?: string) {
  const b = buildingById(id)
  if (!b) return false
  const size = sizeOf(b)
  const grid = gridOf(city)
  if (x < 0 || y < 0 || x + size > grid || y + size > grid) return false
  const occ = occupiedTiles(city, exceptUid)
  // ni sur un bâtiment, ni sur l'eau ou un pont
  return footprint(x, y, size).every((k) => !occ.has(k) && !UNBUILDABLE.includes(city.ground[k] ?? 'herbe'))
}

/** Monte (+1) ou creuse (-1) le terrain d'une case */
export function sculpt(city: CityState, x: number, y: number, delta: 1 | -1): CityState {
  const k = `${x},${y}`
  const v = Math.max(0, Math.min(MAX_ELEVATION, (city.elevation[k] ?? 0) + delta))
  const next = { ...city.elevation }
  if (v === 0) delete next[k]
  else next[k] = v
  return { ...city, elevation: next }
}

/** Pose un bâtiment ; `flip` = tourné vers l'autre côté (choisi avant de poser) */
export function place(city: CityState, id: string, x: number, y: number, flip = false): CityState | null {
  if ((city.inventory[id] ?? 0) <= 0 || !canPlace(city, id, x, y)) return null
  return {
    ...city,
    inventory: { ...city.inventory, [id]: city.inventory[id] - 1 },
    placed: [...city.placed, { uid: uid(), id, x, y, flip }],
  }
}

export function move(city: CityState, puid: string, x: number, y: number): CityState | null {
  const p = city.placed.find((q) => q.uid === puid)
  if (!p || !canPlace(city, p.id, x, y, puid)) return null
  return { ...city, placed: city.placed.map((q) => (q.uid === puid ? { ...q, x, y } : q)) }
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

export function paint(city: CityState, x: number, y: number, ground: string): CityState {
  const k = `${x},${y}`
  // pas d'eau ni de pont sous un bâtiment
  if (UNBUILDABLE.includes(ground) && occupiedTiles(city).has(k)) return city
  const next = { ...city.ground }
  if (ground === 'herbe') delete next[k]
  else next[k] = ground
  return { ...city, ground: next }
}

export const ALL_BUILDINGS = BUILDINGS
