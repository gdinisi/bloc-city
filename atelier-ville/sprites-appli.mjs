// Atelier ville — prépare les rendus Blender pour l'appli.
// node atelier-ville/sprites-appli.mjs
//   out/batiments/<id>-<g|d>.png  →  public/img/ville/<id>-<g|d>.webp      (carte, résolution normale)
//                                    public/img/ville/hd/<id>-<g|d>.webp   (carte zoomée de près)
//                                    public/img/ville/mini/<id>-<g|d>.webp (vignettes, rognées)
//   + src/city/sprites.ts : taille et origine de chaque image, en unités de la carte SVG (case = 40 × 20)
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(HERE, 'out', 'batiments')
const PUB = path.join(HERE, '..', 'public', 'img', 'ville')
for (const d of ['', 'hd', 'mini']) fs.mkdirSync(path.join(PUB, d), { recursive: true })

const TW = 40 // largeur d'une case dans la carte SVG
const ROUTE = 0.6
const PX_CASE = 300 // largeur (px) du losange d'une case : image normale
const PX_CASE_HD = 900 // … image haute définition
const MINI = 192

const ids = [...new Set(fs.readdirSync(SRC).filter((f) => f.endsWith('.png')).map((f) => f.replace(/-[gd]\.png$/, '')))].sort()
const table = {}
let poids = 0
for (const id of ids) {
  for (const sens of ['g', 'd']) {
    const fichier = path.join(SRC, `${id}-${sens}.png`)
    const meta = JSON.parse(fs.readFileSync(path.join(SRC, `${id}-${sens}.json`), 'utf8'))
    const { width, height } = await sharp(fichier).metadata()
    const n = meta.taille
    const cote = 3 * n + ROUTE * (n - 1)
    const losange = cote * Math.SQRT2 * meta.ppu // largeur du losange de l'emprise, en px source
    const k = (n * TW) / losange // unités SVG par px source
    if (sens === 'd') table[id] = { w: +(width * k).toFixed(2), h: +(height * k).toFixed(2), ox: +(meta.ox * k).toFixed(2), oy: +(meta.oy * k).toFixed(2) }
    for (const [dir, px] of [['', PX_CASE], ['hd', PX_CASE_HD]]) {
      const r = Math.min(1, (px * n) / losange)
      const info = await sharp(fichier).resize(Math.round(width * r)).webp({ quality: 80, alphaQuality: 90, effort: 5 }).toFile(path.join(PUB, dir, `${id}-${sens}.webp`))
      poids += dir === '' ? info.size : 0
    }
    await sharp(await sharp(fichier).trim({ threshold: 1 }).png().toBuffer())
      .resize(MINI, MINI, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 82, alphaQuality: 90 })
      .toFile(path.join(PUB, 'mini', `${id}-${sens}.webp`))
  }
}
const ts = `// Généré par atelier-ville/sprites-appli.mjs — ne pas modifier à la main.
// Rendus Blender des bâtiments : taille (w, h) et origine (ox, oy = centre de l'emprise au sol)
// en unités de la carte SVG (une case = ${TW} de large). Images : public/img/ville/<id>-<g|d>.webp
// (« d » = façade à droite = sens par défaut ; « g » = bâtiment tourné).
export interface Sprite {
  w: number
  h: number
  ox: number
  oy: number
}

export const SPRITES: Record<string, Sprite> = ${JSON.stringify(table, null, 2)}
`
fs.writeFileSync(path.join(HERE, '..', 'src', 'city', 'sprites.ts'), ts)
console.log(`${ids.length} bâtiments, images normales : ${(poids / 1e6).toFixed(2)} Mo`)
