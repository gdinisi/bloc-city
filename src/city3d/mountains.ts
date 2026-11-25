import * as THREE from 'three'

/*
 * Chaînes de montagnes autour de l'île.
 * Un anneau de relief lissé (pas de facettes), généré par un bruit « en crêtes »
 * calculé sur des coordonnées cartésiennes (donc sans couture). Les couleurs
 * suivent l'altitude et la pente, avec des transitions fondues : plage, forêt,
 * alpage, roche, neige. Le premier plan reste bas et loin de l'île ; les grands
 * sommets sont derrière et la brume les bleute.
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
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10)
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function fbm(x: number, y: number, oct = 4) {
  let s = 0
  let a = 0.5
  let f = 1
  for (let o = 0; o < oct; o++) {
    s += noise(x * f, y * f) * a
    f *= 2
    a *= 0.5
  }
  return s
}

/** Bruit en crêtes : arêtes nettes, versants réguliers */
function ridged(x: number, y: number) {
  let sum = 0
  let amp = 0.6
  let freq = 1
  let weight = 1
  for (let o = 0; o < 5; o++) {
    let n = 1 - Math.abs(noise(x * freq, y * freq) * 2 - 1)
    n = n * n * weight
    weight = Math.min(1, n * 2)
    sum += n * amp
    freq *= 2
    amp *= 0.45
  }
  return sum
}

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}

export function createMountains(islandRadius: number, waterY: number) {
  const A = 400 // segments autour
  const R = 70 // anneaux
  const r0 = Math.max(islandRadius * 4.2, 34) // le relief démarre loin de l'île
  const r1 = r0 + 330
  const pos: number[] = []
  const heights: number[] = []

  for (let j = 0; j <= R; j++) {
    const t = Math.pow(j / R, 1.25)
    const r = r0 + (r1 - r0) * t
    for (let i = 0; i <= A; i++) {
      const a = (i / A) * Math.PI * 2
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      // collines douces devant, grandes chaînes derrière
      const near = smooth(0.0, 0.22, t) * (fbm(x / 40, z / 40) * 14)
      const range = smooth(0.22, 0.6, t) * (ridged(x / 95 + 21, z / 95 - 4) * 78)
      const fade = 1 - smooth(0.9, 1, t) * 0.4
      const h = (near + range) * fade - 1.5
      pos.push(x, waterY + h, z)
      heights.push(h)
    }
  }
  const idx: number[] = []
  for (let j = 0; j < R; j++)
    for (let i = 0; i < A; i++) {
      const p = j * (A + 1) + i
      const q = p + A + 1
      // sens des triangles : faces tournées vers le ciel
      idx.push(p, p + 1, q, p + 1, q + 1, q)
    }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()

  // couleurs fondues selon l'altitude et la pente
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute
  const col: number[] = []
  const c = new THREE.Color()
  const tmp = new THREE.Color()
  const SAND = new THREE.Color('#cdbb86')
  const FOREST = new THREE.Color('#2e5a33')
  const FOREST_LIGHT = new THREE.Color('#4a7d40')
  const ALPINE = new THREE.Color('#8a9a5c')
  const ROCK = new THREE.Color('#7a7268')
  const ROCK_DARK = new THREE.Color('#5c5650')
  const SNOW = new THREE.Color('#f3f6fa')
  for (let k = 0; k < heights.length; k++) {
    const h = heights[k]
    const x = pos[k * 3]
    const z = pos[k * 3 + 2]
    const steep = 1 - nrm.getY(k) // 0 = plat, 1 = vertical
    const v = fbm(x / 18, z / 18, 3)
    const treeLine = 20 + v * 10
    const snowLine = 46 + v * 12
    c.copy(SAND)
    c.lerp(tmp.copy(FOREST).lerp(FOREST_LIGHT, v), smooth(0.5, 2.5, h))
    c.lerp(ALPINE, smooth(treeLine - 4, treeLine + 4, h))
    c.lerp(tmp.copy(ROCK).lerp(ROCK_DARK, v), smooth(treeLine + 4, treeLine + 14, h))
    // pentes raides : la roche affleure
    c.lerp(ROCK, smooth(0.45, 0.75, steep) * smooth(6, 14, h))
    // neige, moins présente sur les pentes très raides
    c.lerp(SNOW, smooth(snowLine - 3, snowLine + 5, h) * (1 - smooth(0.55, 0.85, steep) * 0.7))
    col.push(c.r, c.g, c.b)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))

  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }))
  mesh.receiveShadow = false
  mesh.castShadow = false
  return mesh
}
