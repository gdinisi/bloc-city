// Atelier ville — rogne les marges transparentes des rendus Blender.
// node atelier-ville/finalise.mjs [source=out/rendus] [destination=apercu]
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(process.argv[2] ?? path.join(HERE, 'out', 'rendus'))
const OUT = path.resolve(process.argv[3] ?? path.join(HERE, 'apercu'))
fs.mkdirSync(OUT, { recursive: true })
for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith('.png'))) {
  const info = await sharp(path.join(SRC, f)).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toFile(path.join(OUT, f))
  console.log(`${f}: ${info.width}x${info.height}`)
}
