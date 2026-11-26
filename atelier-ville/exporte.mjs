// Atelier ville — exporte les rendus des bâtiments en WebP (avec transparence) + leurs métadonnées.
// node atelier-ville/exporte.mjs [source=out/batiments] [destination=apercu/batiments] [largeur max=900]
//   <id>-g.webp / <id>-d.webp : façade à gauche / à droite ; <id>-x.json : origine (centre de l'emprise) en px
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(process.argv[2] ?? path.join(HERE, 'out', 'batiments'))
const DST = path.resolve(process.argv[3] ?? path.join(HERE, 'apercu', 'batiments'))
const MAXW = Number(process.argv[4] ?? 900)
fs.mkdirSync(DST, { recursive: true })
let total = 0
for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith('.png'))) {
  const nom = f.replace(/\.png$/, '')
  const meta = JSON.parse(fs.readFileSync(path.join(SRC, `${nom}.json`), 'utf8'))
  const { width } = await sharp(path.join(SRC, f)).metadata()
  const k = Math.min(1, MAXW * meta.taille / 1 / width)
  const img = sharp(path.join(SRC, f)).resize(Math.round(width * k))
  const info = await img.webp({ quality: 82, alphaQuality: 90, effort: 5 }).toFile(path.join(DST, `${nom}.webp`))
  fs.writeFileSync(path.join(DST, `${nom}.json`), JSON.stringify({ ...meta, ox: meta.ox * k, oy: meta.oy * k, ppu: meta.ppu * k }))
  total += info.size
}
console.log(`${fs.readdirSync(DST).filter((f) => f.endsWith('.webp')).length} images, ${(total / 1e6).toFixed(1)} Mo`)
