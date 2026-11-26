// Atelier ville — aperçu jour / nuit d'une petite île, composée comme dans l'appli (hors appli).
//   node atelier-ville/nuit-apercu.mjs liste            → rendus nécessaires (sols, bâtiments)
//   node atelier-ville/nuit-apercu.mjs <out> <sortie>   → compose l'île à partir des rendus de <out>
//                                                         (out = jour, out-nuit = nuit)
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TW = 40, TH = 20
const PX = 9 // pixels de l'aperçu par unité de la carte SVG
const NUIT_ARG = process.argv[2]

// île de 5 × 4 cases avec une encoche, et ses bâtiments (tous « d » = sens par défaut)
const ile = []
for (let x = 0; x < 5; x++) for (let y = 0; y < 4; y++) if (!(x === 4 && y === 0)) ile.push([x, y])
const bats = [
  ['maison-jaune', 0, 0], ['cafe', 1, 0], ['maison-rose', 2, 0], ['arbre', 3, 0],
  ['boulangerie', 0, 1], ['fontaine', 1, 1], ['tour-horloge', 2, 1], ['sapin', 3, 1], ['phare', 4, 1],
  ['chalet', 0, 2], ['kiosque', 1, 2], ['maison-bleue', 2, 2], ['jardin', 3, 2],
  ['arbre', 0, 3], ['marche', 1, 3], ['villa', 2, 3], ['sapin', 3, 3], ['refuge', 4, 3],
]
const terre = new Set(ile.map(([x, y]) => `${x},${y}`))
const V = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]]
const rivages = []
const vus = new Set()
for (const [lx, ly] of ile)
  for (const [dx, dy] of V) {
    const x = lx + dx, y = ly + dy, k = `${x},${y}`
    if (vus.has(k) || terre.has(k)) continue
    vus.add(k)
    const b = V.map(([ax, ay]) => (terre.has(`${x + ax},${y + ay}`) ? '1' : '0'))
    for (const [c, i, j] of [[4, 0, 1], [5, 2, 1], [6, 2, 3], [7, 0, 3]]) if (b[i] === '1' || b[j] === '1') b[c] = '0'
    rivages.push([x, y, `rivage-${b.join('')}`])
  }

if (NUIT_ARG === 'liste') {
  console.log('SOLS ' + [...new Set(['herbe', 'herbe2', 'mer-motif', ...rivages.map((r) => r[2])])].join(' '))
  console.log('BATS ' + [...new Set(bats.map((b) => b[0]))].join(' '))
  process.exit(0)
}

const OUT = path.join(HERE, process.argv[2] ?? 'out')
const SORTIE = process.argv[3]
const nuit = OUT.includes('nuit')
const proj = (x, y) => [((x - y) * TW) / 2, ((x + y) * TH) / 2]

// cadre de l'image
const xs = [...ile, ...rivages].map(([x, y]) => proj(x, y))
const minX = Math.min(...xs.map((p) => p[0])) - TW, maxX = Math.max(...xs.map((p) => p[0])) + TW
const minY = Math.min(...xs.map((p) => p[1])) - 45, maxY = Math.max(...xs.map((p) => p[1])) + TH
const W = Math.round((maxX - minX) * PX), H = Math.round((maxY - minY) * PX)
const ecran = (sx, sy) => [Math.round((sx - minX) * PX), Math.round((sy - minY) * PX)]

const meta = (dir, nom) => JSON.parse(fs.readFileSync(path.join(OUT, dir, `${nom}.json`), 'utf8'))
async function sprite(dir, nom, k) {
  const f = path.join(OUT, dir, `${nom}.png`)
  const m = meta(dir, nom)
  const { width } = await sharp(f).metadata()
  const r = k * PX
  return { buf: await sharp(f).resize(Math.max(1, Math.round(width * r))).png().toBuffer(), ox: m.ox * r, oy: m.oy * r }
}
const kSol = (m) => TW / (3 * Math.SQRT2 * m.ppu)
const couches = []
const poser = async (dir, nom, cx, cy, k) => {
  const s = await sprite(dir, nom, k)
  const [px, py] = ecran(cx, cy)
  couches.push({ input: s.buf, left: Math.round(px - s.ox), top: Math.round(py - s.oy) })
}

// mer : cellule périodique de mer-motif répétée
const mm = meta('sols', 'mer-motif')
const L = 3 * Math.SQRT2 * mm.ppu
const cellule = await sharp(path.join(OUT, 'sols', 'mer-motif.png'))
  .extract({ left: Math.round(mm.ox - L / 2), top: Math.round(mm.oy - L / 4), width: Math.round(L), height: Math.round(L / 2) })
  .resize(TW * PX, (TW / 2) * PX)
  .png()
  .toBuffer()
const fondMer = []
for (let y = -TW * PX; y < H + TW * PX; y += (TW / 2) * PX) for (let x = -TW * PX; x < W + TW * PX; x += TW * PX) fondMer.push({ input: cellule, left: Math.round(x - (minX * PX) % (TW * PX)), top: Math.round(y - (minY * PX) % ((TW / 2) * PX)) })

// ordre de l'appli : rivage et sol (x + y), puis bâtiments
const elts = []
for (const [x, y, nom] of rivages) elts.push({ k: x + y, f: () => poser('sols', nom, ...proj(x, y), kSol(meta('sols', nom))) })
for (const [x, y] of ile) {
  const nom = (x * 7 + y * 13) % 3 === 0 ? 'herbe2' : 'herbe'
  elts.push({ k: x + y, f: () => poser('sols', nom, ...proj(x, y), kSol(meta('sols', nom))) })
}
for (const [id, x, y] of bats) {
  const m = meta('batiments', `${id}-d`)
  const n = m.taille
  const k = (n * TW) / ((3 * n + 0.6 * (n - 1)) * Math.SQRT2 * m.ppu)
  elts.push({ k: x + y + 0.0005, f: () => poser('batiments', `${id}-d`, ...proj(x + (n - 1) / 2, y + (n - 1) / 2), k) })
}
elts.sort((a, b) => a.k - b.k)
for (const e of elts) await e.f()

let img = sharp({ create: { width: W, height: H, channels: 4, background: nuit ? '#0b2033' : '#1d5f8c' } }).composite([...fondMer, ...couches])
let buf = await img.png().toBuffer()
if (nuit) {
  // couche de lumière de chaque bâtiment (halos qui débordent sur les cases voisines, faisceau du phare),
  // additionnée sur fond noir puis posée en mode « écran » par-dessus la ville
  const MARGE = 2000
  const lumieres = []
  for (const [id, x, y] of bats) {
    const f = path.join(OUT, 'batiments', `${id}-d-lum.png`)
    if (!fs.existsSync(f)) continue
    const m = meta('batiments', `${id}-d-lum`)
    const n = m.taille
    const k = (n * TW) / ((3 * n + 0.6 * (n - 1)) * Math.SQRT2 * m.ppu)
    const { width } = await sharp(f).metadata()
    const r = k * PX
    const [px, py] = ecran(...proj(x + (n - 1) / 2, y + (n - 1) / 2))
    lumieres.push({ input: await sharp(f).resize(Math.round(width * r)).png().toBuffer(), left: Math.round(px - m.ox * r) + MARGE, top: Math.round(py - m.oy * r) + MARGE, blend: 'add' })
  }
  const couche = await sharp({ create: { width: W + 2 * MARGE, height: H + 2 * MARGE, channels: 4, background: '#000000ff' } })
    .composite(lumieres)
    .png()
    .toBuffer()
  const coucheVue = await sharp(couche).extract({ left: MARGE, top: MARGE, width: W, height: H }).png().toBuffer()
  buf = await sharp(buf).composite([{ input: coucheVue, blend: 'screen' }]).png().toBuffer()
  // halo des lumières : on isole les pixels chauds et très clairs, on les floute et on les ajoute (écran)
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true })
  const lum = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const chaud = r > 225 && g > 150 && b < 170 && r - b > 80
    if (chaud) { lum[i] = 255; lum[i + 1] = 165; lum[i + 2] = 70; lum[i + 3] = 255 } else lum[i + 3] = 255
  }
  const halo = await sharp(lum, { raw: info }).blur(14).png().toBuffer()
  const halo2 = await sharp(lum, { raw: info }).blur(4).png().toBuffer()
  buf = await sharp(buf).composite([{ input: halo, blend: 'screen' }, { input: halo2, blend: 'screen' }]).png().toBuffer()
}
await sharp(buf).toFile(SORTIE)
console.log('ok', SORTIE, W, H)
