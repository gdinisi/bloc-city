// Atelier ville — mode nuit : prépare les rendus de nuit pour l'aperçu dans l'appli (local, pas encore publié).
// node atelier-ville/nuit-appli.mjs
//   out-nuit/batiments/<id>-<g|d>.png      → public/img/ville-nuit/<id>-<g|d>.webp (+ hd/)
//   out-nuit/batiments/<id>-<g|d>-vol.png  → silhouette des volumes (masque de la lumière des voisins)
//   out-nuit/batiments/<id>-<g|d>-lum.png  → couche de lumière (posée en mode écran)
//   out-nuit/sols/<sol>.png                → public/img/ville-nuit/sol/<sol>.webp (+ hd/)
//   + src/city/sprites-nuit.ts : images de nuit disponibles et cadrage des couches de lumière
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(HERE, 'out-nuit', 'batiments')
const SRC_SOLS = path.join(HERE, 'out-nuit', 'sols')
const PUB = path.join(HERE, '..', 'public', 'img', 'ville-nuit')
for (const d of ['', 'hd', 'sol', 'sol/hd']) fs.mkdirSync(path.join(PUB, d), { recursive: true })
const TW = 40, ROUTE = 0.6, PX_CASE = 300, PX_CASE_HD = 900

const bats = []
const lum = {}
for (const f of fs.readdirSync(SRC).filter((f) => /-[gd]\.png$/.test(f))) {
  const nom = f.replace(/\.png$/, '')
  const meta = JSON.parse(fs.readFileSync(path.join(SRC, `${nom}.json`), 'utf8'))
  const n = meta.taille
  const losange = (3 * n + ROUTE * (n - 1)) * Math.SQRT2 * meta.ppu
  const k = (n * TW) / losange
  for (const [suffixe, fichier] of [['', f], ['-vol', `${nom}-vol.png`], ['-lum', `${nom}-lum.png`]]) {
    const src = path.join(SRC, fichier)
    if (!fs.existsSync(src)) continue
    const { width, height } = await sharp(src).metadata()
    for (const [dir, px] of [['', PX_CASE], ['hd', PX_CASE_HD]]) {
      const r = Math.min(1, (px * n) / losange)
      await sharp(src).resize(Math.round(width * r)).webp({ quality: 82, alphaQuality: 90 }).toFile(path.join(PUB, dir, `${nom}${suffixe}.webp`))
    }
    if (suffixe === '-lum') {
      const m = JSON.parse(fs.readFileSync(path.join(SRC, `${nom}-lum.json`), 'utf8'))
      lum[nom] = { w: +(width * k).toFixed(2), h: +(height * k).toFixed(2), ox: +(m.ox * k).toFixed(2), oy: +(m.oy * k).toFixed(2) }
    }
  }
  bats.push(nom)
}
const sols = []
for (const f of fs.readdirSync(SRC_SOLS).filter((f) => f.endsWith('.png'))) {
  const nom = f.replace(/\.png$/, '')
  const meta = JSON.parse(fs.readFileSync(path.join(SRC_SOLS, `${nom}.json`), 'utf8'))
  const L = 3 * Math.SQRT2 * meta.ppu
  const { width } = await sharp(path.join(SRC_SOLS, f)).metadata()
  if (nom === 'mer-motif') {
    const buf = await sharp(path.join(SRC_SOLS, f)).extract({ left: Math.round(meta.ox - L / 2), top: Math.round(meta.oy - L / 4), width: Math.round(L), height: Math.round(L / 2) }).png().toBuffer()
    for (const [dir, px] of [['sol', PX_CASE], ['sol/hd', PX_CASE_HD]])
      await sharp(buf).resize(Math.round(Math.min(L, px)), Math.round(Math.min(L, px) / 2)).webp({ quality: 85 }).toFile(path.join(PUB, dir, 'mer-motif.webp'))
  } else {
    for (const [dir, px] of [['sol', PX_CASE], ['sol/hd', PX_CASE_HD]]) {
      const r = Math.min(1, px / L)
      await sharp(path.join(SRC_SOLS, f)).resize(Math.round(width * r)).webp({ quality: 82, alphaQuality: 90 }).toFile(path.join(PUB, dir, `${nom}.webp`))
    }
  }
  sols.push(nom)
}
const ts = `// Généré par atelier-ville/nuit-appli.mjs — ne pas modifier à la main (aperçu du mode nuit, local).
import type { Sprite } from './sprites'

/** Bâtiments (id-sens) et sols disponibles de nuit ; les autres gardent leur image de jour */
export const NUIT_BATS = new Set<string>(${JSON.stringify(bats.sort())})
export const NUIT_SOLS = new Set<string>(${JSON.stringify(sols.sort())})
/** Cadrage des couches de lumière (unités de la carte SVG, origine = centre de l'emprise) */
export const NUIT_LUM: Record<string, Omit<Sprite, 'v'>> = ${JSON.stringify(lum, null, 2)}
`
fs.writeFileSync(path.join(HERE, '..', 'src', 'city', 'sprites-nuit.ts'), ts)
console.log(`${bats.length} bâtiments de nuit, ${Object.keys(lum).length} couches de lumière, ${sols.length} sols`)
