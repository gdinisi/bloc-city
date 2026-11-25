// Génère toutes les icônes de l'app à partir de assets/icon-source.webp
// (carré recadré sur la lune et la montagne, sans le premier plan du bas).
// Lancer : node scripts/make-icons.mjs
import sharp from 'sharp'

const SRC = 'assets/icon-source.webp'
const CROP = { left: 0, top: 150, width: 736, height: 736 }

const square = () => sharp(SRC).extract(CROP)

const jobs = [
  ['public/pwa-64x64.png', 64],
  ['public/pwa-192x192.png', 192],
  ['public/pwa-512x512.png', 512],
  ['public/apple-touch-icon-180x180.png', 180],
  ['public/favicon-48x48.png', 48],
]

for (const [out, size] of jobs) {
  await square().resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(out)
  console.log('✓', out)
}

// Android « maskable » : l'icône peut être rognée en cercle, on garde donc une marge.
// La marge est la même image, très floutée, et les bords de l'image nette sont
// adoucis pour qu'aucun cadre ne se voie.
const S = 512
const IN = 440
const off = (S - IN) / 2
const feather = Buffer.from(
  `<svg width="${IN}" height="${IN}"><defs><filter id="f"><feGaussianBlur stdDeviation="14"/></filter></defs><rect x="22" y="22" width="${IN - 44}" height="${IN - 44}" rx="40" fill="#fff" filter="url(#f)"/></svg>`,
)
const inner = await sharp(await square().resize(IN, IN, { kernel: 'lanczos3' }).ensureAlpha().toBuffer())
  .composite([{ input: feather, blend: 'dest-in' }])
  .png()
  .toBuffer()
const back = await square().resize(S, S).blur(24).toBuffer()
await sharp(back)
  .composite([{ input: inner, left: off, top: off }])
  .png({ compressionLevel: 9 })
  .toFile('public/maskable-icon-512x512.png')
console.log('✓ public/maskable-icon-512x512.png')
