// Atelier ville — planche contact des rendus de bâtiments.
// node atelier-ville/planche.mjs [dossier=out/batiments] [sortie=out/planche.png] [colonnes=4] [filtre]
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve(process.argv[2] ?? 'atelier-ville/out/batiments')
const sortie = path.resolve(process.argv[3] ?? 'atelier-ville/out/planche.png')
const cols = Number(process.argv[4] ?? 4)
const filtre = process.argv[5] ? new RegExp(process.argv[5]) : null
const C = 320
const fichiers = fs.readdirSync(dir).filter((f) => f.endsWith('.png') && (!filtre || filtre.test(f))).sort()
const comps = []
for (const [i, f] of fichiers.entries()) {
  const img = await sharp(path.join(dir, f)).trim({ threshold: 1 }).resize(C - 10, C - 30, { fit: 'contain', background: '#2b2f36' }).png().toBuffer()
  const x = (i % cols) * C, y = Math.floor(i / cols) * C
  comps.push({ input: img, left: x + 5, top: y + 25 })
  comps.push({ input: Buffer.from(`<svg width="${C}" height="22"><text x="6" y="16" font-size="15" font-family="sans-serif" fill="#ddd">${f.replace('.png', '')}</text></svg>`), left: x, top: y })
}
await sharp({ create: { width: cols * C, height: Math.ceil(fichiers.length / cols) * C, channels: 4, background: '#2b2f36' } })
  .composite(comps).png().toFile(sortie)
console.log(sortie, fichiers.length)
