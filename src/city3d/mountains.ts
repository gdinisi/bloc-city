import * as THREE from 'three'

/*
 * Chaînes de montagnes autour de l'île : un grand anneau de relief généré par du
 * bruit « en crêtes » (ridged noise). Les couleurs suivent l'altitude : plage,
 * forêt, prairie d'altitude, roche, neige. La brume de la scène fait le reste
 * (les montagnes lointaines se fondent en bleu, comme dans la réalité).
 */

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function noise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Bruit en crêtes : arêtes vives typiques des chaînes de montagnes */
function ridged(x: number, y: number) {
  let sum = 0
  let amp = 0.55
  let freq = 1
  for (let o = 0; o < 5; o++) {
    const n = 1 - Math.abs(noise(x * freq, y * freq) * 2 - 1)
    sum += n * n * amp
    freq *= 2.1
    amp *= 0.5
  }
  return sum
}

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}

export function createMountains(islandRadius: number, waterY: number) {
  const A = 320 // segments autour
  const R = 46 // anneaux du proche au lointain
  const r0 = islandRadius * 2.3
  const r1 = r0 + 300
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const c = new THREE.Color()

  const SAND = new THREE.Color('#d8c48e')
  const FOREST = new THREE.Color('#2f5d34')
  const FOREST2 = new THREE.Color('#3f7a3c')
  const MEADOW = new THREE.Color('#7d9a55')
  const ROCK = new THREE.Color('#7b7368')
  const ROCK2 = new THREE.Color('#5f5a54')
  const SNOW = new THREE.Color('#f4f7fb')

  for (let j = 0; j <= R; j++) {
    // anneaux plus serrés près de l'île (plus de détail là où on regarde)
    const t = Math.pow(j / R, 1.35)
    const r = r0 + (r1 - r0) * t
    for (let i = 0; i <= A; i++) {
      const a = (i / A) * Math.PI * 2
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      // relief : contreforts bas devant, grands sommets derrière
      const env = smooth(0.02, 0.3, t) * (0.25 + 0.75 * smooth(0.15, 0.7, t))
      const big = ridged(x / 70 + 13, z / 70 + 7)
      const detail = noise(x / 12, z / 12)
      // une vallée s'ouvre dans une direction pour laisser voir l'horizon
      const valley = 0.35 + 0.65 * smooth(0.15, 0.55, Math.abs(Math.sin(a * 0.5 + 0.4)))
      let h = env * valley * (big * 95 + detail * 8) - 2
      h = Math.max(h, -3)
      pos.push(x, waterY + h, z)

      // couleur selon l'altitude, avec un peu de variation
      const snowLine = 52 + noise(x / 30, z / 30) * 18
      const treeLine = 22 + noise(x / 25 + 5, z / 25) * 10
      if (h < 1.2) c.copy(SAND)
      else if (h < treeLine) c.copy(noise(x / 6, z / 6) > 0.5 ? FOREST : FOREST2)
      else if (h < treeLine + 8) c.copy(MEADOW).lerp(ROCK, (h - treeLine) / 8)
      else if (h < snowLine) c.copy(noise(x / 8, z / 8) > 0.5 ? ROCK : ROCK2)
      else c.copy(ROCK).lerp(SNOW, Math.min(1, (h - snowLine) / 6))
      col.push(c.r, c.g, c.b)
    }
  }
  for (let j = 0; j < R; j++)
    for (let i = 0; i < A; i++) {
      const p = j * (A + 1) + i
      const q = p + A + 1
      idx.push(p, q, p + 1, p + 1, q, q + 1)
    }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }))
  mesh.receiveShadow = false
  return mesh
}
