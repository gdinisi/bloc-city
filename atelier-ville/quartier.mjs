// Atelier ville — assemble parcelles et routes en quartier isométrique.
// node atelier-ville/quartier.mjs [village|escalade|merveille]  → atelier-ville/apercu/village/quartier[-nom].png
//
// Chaque rendu est accompagné d'un .json donnant la position (px) de son origine
// dans l'image : on place cette origine à la projection iso de la position réelle de la tuile.
// Les parcelles (3 × 3) sont séparées par des routes (ROUTE de large), avec carrefours.
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.join(HERE, 'apercu', 'village')
const ROUTE = 0.6
const P = 3 + ROUTE // pas de la grille : parcelle + route

// [parcelle, colonne (vers la droite-bas = +x), ligne (vers la gauche-bas = -y), taille en parcelles]
const PLANS = {
  village: [
    ['auberge', 0, 0], ['hameau-2', 1, 0], ['verger', 2, 0],
    ['maison-jaune', 0, 1], ['place-fontaine', 1, 1], ['hameau-3', 2, 1],
    ['maison-creme', 0, 2], ['hameau-2b', 1, 2], ['maison-rose', 2, 2],
  ],
  merveille: [
    ['tour-eiffel', 0, 0, 3], ['verger', 3, 0], ['hameau-2', 3, 1], ['maison-jaune', 3, 2],
    ['maison-creme', 0, 3], ['hameau-3', 1, 3], ['hameau-2b', 2, 3], ['maison-rose', 3, 3],
  ],
  escalade: [
    ['salle-escalade', 0, 0, 2], ['verger', 2, 0], ['hameau-3', 2, 1],
    ['maison-creme', 0, 2], ['hameau-2b', 1, 2], ['maison-rose', 2, 2],
  ],
}
const NOM = process.argv[2] ?? 'village'
const PLAN = PLANS[NOM]

// Occupation de la grille : quelle parcelle recouvre chaque case
const occ = new Map()
let nc = 0, nr = 0
PLAN.forEach(([, c, r, t = 1], id) => {
  for (let i = 0; i < t; i++) for (let j = 0; j < t; j++) occ.set(`${c + i},${r + j}`, id)
  nc = Math.max(nc, c + t); nr = Math.max(nr, r + t)
})
const at = (c, r) => occ.get(`${c},${r}`) ?? -1

const tiles = [] // { n, x, y } en coordonnées monde (centre de la tuile)
for (const [n, c, r, t = 1] of PLAN) tiles.push({ n, x: (c + (t - 1) / 2) * P, y: -(r + (t - 1) / 2) * P })
// Routes entre colonnes (bande le long de y) et entre lignes (bande le long de x), contour compris
for (let r = 0; r < nr; r++)
  for (let c = -1; c < nc; c++) {
    const a = at(c, r), b = at(c + 1, r)
    if (a === b) continue
    tiles.push({ n: 'route-y', x: c * P + P / 2, y: -r * P })
  }
for (let c = 0; c < nc; c++)
  for (let r = -1; r < nr; r++) {
    const a = at(c, r), b = at(c, r + 1)
    if (a === b) continue
    tiles.push({ n: 'route-x', x: c * P, y: -r * P - P / 2 })
  }
for (let c = -1; c < nc; c++)
  for (let r = -1; r < nr; r++) {
    const v = [at(c, r), at(c + 1, r), at(c, r + 1), at(c + 1, r + 1)]
    if (v.every((x) => x === v[0] && x !== -1)) continue // intérieur d'un grand bâtiment
    tiles.push({ n: 'carrefour', x: c * P + P / 2, y: -r * P - P / 2 })
  }

// Projection iso (même caméra que Blender) : +x → droite-bas, +y → droite-haut
const meta = {}
const lire = (n) => (meta[n] ??= JSON.parse(fs.readFileSync(path.join(DIR, `${n}.json`), 'utf8')))
const items = []
for (const t of tiles) {
  const m = lire(t.n)
  const { width, height } = await sharp(path.join(DIR, `${t.n}.png`)).metadata()
  const sx = (t.x + t.y) * 0.70711 * m.ppu
  const sy = (t.x - t.y) * 0.35355 * m.ppu
  const route = t.n.startsWith('route') || t.n === 'carrefour'
  // ordre d'affichage : routes d'abord (au sol), puis parcelles du fond vers l'avant
  items.push({ n: t.n, left: sx - m.ox, top: sy - m.oy, width, height, prof: (route ? -1e6 : 0) + (t.x - t.y) })
}
const minL = Math.min(...items.map((i) => i.left)), minT = Math.min(...items.map((i) => i.top))
const cw = Math.ceil(Math.max(...items.map((i) => i.left + i.width)) - minL)
const ch = Math.ceil(Math.max(...items.map((i) => i.top + i.height)) - minT)
const comps = items
  .sort((a, b) => a.prof - b.prof)
  .map((i) => ({ input: path.join(DIR, `${i.n}.png`), left: Math.round(i.left - minL), top: Math.round(i.top - minT) }))
const big = await sharp({ create: { width: cw, height: ch, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(comps).png().toBuffer()
const sortie = path.join(DIR, NOM === 'village' ? 'quartier.png' : `quartier-${NOM}.png`)
await sharp(big).trim({ threshold: 1 }).png().toFile(sortie)
console.log(path.basename(sortie), cw, ch, `${tiles.length} tuiles`)
