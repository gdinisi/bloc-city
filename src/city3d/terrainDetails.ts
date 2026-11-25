import * as THREE from 'three'

/*
 * Détails des bords de l'île et des changements d'altitude :
 *  - végétation qui déborde des rebords (buissons, lianes) ;
 *  - rochers au pied des falaises et le long du rivage ;
 *  - roseaux au bord de l'eau ;
 *  - bassins surélevés dont l'eau descend en cascade vers les cases plus basses
 *    (ou vers la mer), avec de l'écume en bas.
 * Tout est instancié (quelques objets seulement), donc léger même sur iPhone.
 */

export interface TerrainInput {
  scene: THREE.Scene
  G: number
  waterY: number
  pretty: boolean
  night: boolean
  groundAt: (x: number, y: number) => string | null
  /** dessus d'une case de sol (ou fond d'un bassin) */
  topOf: (x: number, y: number) => number
  /** niveau de l'eau sur une case d'eau */
  surfOf: (x: number, y: number) => number
  occupied: Set<string>
  X: (x: number) => number
  Z: (y: number) => number
  waterNormals: THREE.Texture
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

const NATURAL = new Set(['herbe', 'fleurs', 'terre', 'sable', 'neige'])
const GRASSY = new Set(['herbe', 'fleurs'])

/** Forme de rocher irrégulière (bruit fixe, pour rester identique d'un rendu à l'autre) */
function rockGeometry(detail: number, rough: number, seed: number) {
  const g = new THREE.IcosahedronGeometry(1, detail)
  const p = g.getAttribute('position') as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const k = Math.sin(v.x * 4.1 + seed) * Math.cos(v.y * 3.7 - seed) * Math.sin(v.z * 5.3 + seed * 2)
    v.multiplyScalar(1 + k * rough)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  // le déplacement ne dépend que de la position : les sommets partagés restent soudés
  g.computeVertexNormals()
  return g
}

function fallTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 256
  const ctx = c.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 64, 0)
  grad.addColorStop(0, 'rgba(46,120,180,0.45)')
  grad.addColorStop(0.5, 'rgba(80,160,215,0.7)')
  grad.addColorStop(1, 'rgba(46,120,180,0.45)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 256)
  let s = 7
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  ctx.lineCap = 'round'
  for (let i = 0; i < 60; i++) {
    const x = r() * 64
    const y = r() * 256
    const len = 20 + r() * 90
    ctx.strokeStyle = `rgba(225,242,255,${0.15 + r() * 0.5})`
    ctx.lineWidth = 0.8 + r() * 2.2
    for (const dy of [0, -256, 256]) {
      ctx.beginPath()
      ctx.moveTo(x, y + dy)
      ctx.lineTo(x + (r() - 0.5) * 2, y + len + dy)
      ctx.stroke()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function addTerrainDetails(o: TerrainInput) {
  const { scene, G, waterY, pretty, night, groundAt, topOf, surfOf, occupied, X, Z } = o
  let seed = 12345
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

  const isWater = (x: number, y: number) => {
    const g = groundAt(x, y)
    return g === 'eau' || g === 'pont'
  }
  /** hauteur visible d'une case (sol, surface de l'eau, ou la mer hors de l'île) */
  const levelOf = (x: number, y: number) => (groundAt(x, y) === null ? waterY : isWater(x, y) ? surfOf(x, y) : topOf(x, y))

  const rocks: { m: THREE.Matrix4; c: THREE.Color }[] = []
  const bushes: { m: THREE.Matrix4; c: THREE.Color }[] = []
  const vines: { m: THREE.Matrix4; c: THREE.Color }[] = []
  const reeds: { m: THREE.Matrix4; c: THREE.Color }[] = []
  const foam: { pos: THREE.Vector3; s: number; phase: number }[] = []
  const mats: THREE.Material[] = []
  const texs: THREE.Texture[] = []

  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  const put = (list: typeof rocks, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: THREE.Color, rx = 0, ry = 0, rz = 0) => {
    e.set(rx, ry, rz)
    q.setFromEuler(e)
    list.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.clone(), new THREE.Vector3(sx, sy, sz)), c: color })
  }
  const rockColor = () => new THREE.Color().setHSL(0.07 + rand() * 0.05, 0.1 + rand() * 0.08, 0.24 + rand() * 0.12)
  const bushColor = () => new THREE.Color().setHSL(0.24 + rand() * 0.07, 0.45 + rand() * 0.15, 0.24 + rand() * 0.12)

  // ---------- bords exposés : végétation, lianes, rochers ----------
  for (let y = 0; y < G; y++)
    for (let x = 0; x < G; x++) {
      if (isWater(x, y)) continue
      const gid = groundAt(x, y)!
      const top = topOf(x, y)
      const cx = X(x)
      const cz = Z(y)
      for (const [dx, dy] of DIRS) {
        const nx = x + dx
        const ny = y + dy
        const nl = levelOf(nx, ny)
        if (nl > top - 0.05) continue
        const outside = groundAt(nx, ny) === null
        const nWater = outside || isWater(nx, ny)
        const foot = nWater ? Math.max(nl, waterY) : nl
        const drop = top - foot
        // point sur le bord : t le long de l'arête, d vers l'extérieur
        const at = (t: number, d: number, h: number) =>
          [cx + dx * (0.5 + d) + (dx ? 0 : t), h, cz + dy * (0.5 + d) + (dy ? 0 : t)] as const

        // buissons qui débordent du rebord
        if (GRASSY.has(gid) || (gid === 'terre' && rand() < 0.5)) {
          const n = 3 + Math.floor(rand() * 3)
          for (let k = 0; k < n; k++) {
            const s = 0.06 + rand() * 0.07
            const [px, py, pz] = at((rand() - 0.5) * 0.92, rand() * 0.04, top - 0.03 - rand() * 0.07)
            put(bushes, px, py, pz, s * 1.2, s * 0.85, s * 1.2, bushColor(), 0, rand() * 6, 0)
          }
          // lianes qui pendent sur les falaises
          if (drop > 0.28 && pretty) {
            const n2 = 1 + Math.floor(rand() * 3)
            for (let k = 0; k < n2; k++) {
              const len = Math.min(drop * 0.85, 0.12 + rand() * 0.5)
              const [px, , pz] = at((rand() - 0.5) * 0.85, 0.012, 0)
              put(vines, px, top - len / 2 - 0.02, pz, 1, len, 1, bushColor().offsetHSL(0, 0, -0.06))
            }
          }
        }

        // rochers au pied (rivage, berges, bas des marches) — jamais sur une route ou sous un bâtiment
        const nGround = groundAt(nx, ny)
        const footFree = outside || nWater || (NATURAL.has(nGround ?? '') && !occupied.has(`${nx},${ny}`))
        if (footFree) {
          const n = outside ? 3 + Math.floor(rand() * 3) : nWater ? 1 + Math.floor(rand() * 2) : rand() < 0.6 ? 1 : 0
          for (let k = 0; k < n; k++) {
            const s = outside ? 0.1 + rand() * 0.2 : 0.05 + rand() * 0.08
            const [px, py, pz] = at((rand() - 0.5) * 0.95, 0.02 + rand() * (outside ? 0.22 : 0.1), foot + s * 0.15)
            put(rocks, px, py, pz, s * (1 + rand() * 0.5), s * (0.55 + rand() * 0.4), s * (1 + rand() * 0.4), rockColor(), rand(), rand() * 6, rand())
          }
        }

        // roseaux au bord de l'eau douce (rivière, bassins)
        if (!outside && nWater && GRASSY.has(gid) && pretty) {
          const n = rand() < 0.5 ? 0 : 3 + Math.floor(rand() * 4)
          const base = at((rand() - 0.5) * 0.7, 0.06, 0)
          for (let k = 0; k < n; k++) {
            const h = 0.14 + rand() * 0.16
            put(reeds, base[0] + (rand() - 0.5) * 0.14, foot + h / 2, base[2] + (rand() - 0.5) * 0.14, 1, h, 1, new THREE.Color().setHSL(0.2 + rand() * 0.05, 0.4, 0.32 + rand() * 0.1), (rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3)
          }
        }
      }
    }

  // ---------- bassins surélevés et cascades ----------
  const pondNormals = o.waterNormals.clone()
  pondNormals.needsUpdate = true
  pondNormals.wrapS = pondNormals.wrapT = THREE.RepeatWrapping
  texs.push(pondNormals)
  const pondMat = new THREE.MeshStandardMaterial({
    color: night ? '#1d4a7a' : '#2f8fd0',
    transparent: true,
    opacity: 0.86,
    roughness: 0.06,
    metalness: 0.15,
    normalMap: pondNormals,
    normalScale: new THREE.Vector2(0.35, 0.35),
  })
  mats.push(pondMat)

  const fallTex = fallTexture()
  texs.push(fallTex)
  const fallMats = [0.9, 0.5].map(
    (op) =>
      new THREE.MeshStandardMaterial({
        map: fallTex,
        color: '#ffffff',
        transparent: true,
        opacity: op,
        roughness: 0.15,
        metalness: 0.1,
        depthWrite: false,
        side: THREE.DoubleSide,
        emissive: night ? '#2a4d70' : '#000000',
      }),
  )
  mats.push(...fallMats)

  for (let y = 0; y < G; y++)
    for (let x = 0; x < G; x++) {
      if (groundAt(x, y) !== 'eau') continue
      const surf = surfOf(x, y)
      if (surf <= waterY + 0.001) continue
      // surface du bassin
      const pg = new THREE.PlaneGeometry(1, 1)
      const uv = pg.getAttribute('uv') as THREE.BufferAttribute
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.35 + x * 0.35, uv.getY(i) * 0.35 + y * 0.35)
      const pond = new THREE.Mesh(pg, pondMat)
      pond.rotation.x = -Math.PI / 2
      pond.position.set(X(x), surf, Z(y))
      pond.receiveShadow = true
      scene.add(pond)

      for (const [dx, dy] of DIRS) {
        const nx = x + dx
        const ny = y + dy
        const nl = levelOf(nx, ny)
        if (nl > surf - 0.05) continue
        const foot = groundAt(nx, ny) === null || isWater(nx, ny) ? Math.max(nl, waterY) : nl
        const drop = surf - foot
        const rotY = dx === 1 ? Math.PI / 2 : dx === -1 ? -Math.PI / 2 : dy === 1 ? 0 : Math.PI
        // deux voiles d'eau d'échelles différentes : effet de volume
        ;[0.505, 0.53].forEach((off, layer) => {
          const w = layer ? 0.8 : 0.92
          const g = new THREE.PlaneGeometry(w, drop + 0.04)
          const fu = g.getAttribute('uv') as THREE.BufferAttribute
          for (let i = 0; i < fu.count; i++) fu.setXY(i, fu.getX(i) * w * 1.3 + layer * 0.37, fu.getY(i) * (drop + 0.04) * (layer ? 2 : 1.4))
          const fall = new THREE.Mesh(g, fallMats[layer])
          fall.userData.fallLayer = layer
          fall.rotation.y = rotY
          fall.position.set(X(x) + dx * off, foot + (drop + 0.04) / 2, Z(y) + dy * off)
          scene.add(fall)
        })
        // l'eau qui passe par-dessus le rebord
        const lipG = new THREE.PlaneGeometry(0.92, 0.06)
        const lip = new THREE.Mesh(lipG, fallMats[0])
        lip.rotation.set(-Math.PI / 2 + 0.6, rotY, 0, 'YXZ')
        lip.position.set(X(x) + dx * 0.49, surf - 0.01, Z(y) + dy * 0.49)
        scene.add(lip)
        // écume en bas
        for (let k = 0; k < 9; k++) {
          const t = (rand() - 0.5) * 0.9
          const d = 0.52 + rand() * 0.18
          foam.push({
            pos: new THREE.Vector3(X(x) + dx * d + (dx ? 0 : t), foot + 0.01, Z(y) + dy * d + (dy ? 0 : t)),
            s: 0.05 + rand() * 0.07,
            phase: rand() * Math.PI * 2,
          })
        }
      }
    }

  // ---------- objets instanciés ----------
  const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, list: typeof rocks, shadow: boolean) => {
    if (!list.length) return null
    mats.push(mat)
    const im = new THREE.InstancedMesh(geo, mat, list.length)
    list.forEach((it, i) => {
      im.setMatrixAt(i, it.m)
      im.setColorAt(i, it.c)
    })
    im.castShadow = shadow && pretty
    im.receiveShadow = true
    scene.add(im)
    return im
  }
  inst(rockGeometry(pretty ? 1 : 0, 0.22, 3), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), rocks, true)
  inst(rockGeometry(1, 0.15, 9), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), bushes, true)
  inst(new THREE.BoxGeometry(0.02, 1, 0.02), new THREE.MeshStandardMaterial({ roughness: 1 }), vines, false)
  inst(new THREE.ConeGeometry(0.012, 1, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), reeds, false)

  let foamMesh: THREE.InstancedMesh | null = null
  if (foam.length) {
    const fm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, transparent: true, opacity: 0.9, emissive: night ? '#334455' : '#000000' })
    mats.push(fm)
    foamMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), fm, foam.length)
    scene.add(foamMesh)
  }
  const mtx = new THREE.Matrix4()
  const one = new THREE.Quaternion()
  const sc = new THREE.Vector3()
  let time = 0

  return {
    update(dt: number) {
      time += dt
      fallTex.offset.y = (fallTex.offset.y + dt * 1.1) % 1
      pondNormals.offset.set((time * 0.02) % 1, (time * 0.015) % 1)
      if (foamMesh) {
        foam.forEach((f, i) => {
          const k = 1 + Math.sin(time * 5 + f.phase) * 0.25
          sc.set(f.s * k, f.s * 0.55 * k, f.s * k)
          mtx.compose(f.pos, one, sc)
          foamMesh!.setMatrixAt(i, mtx)
        })
        foamMesh.instanceMatrix.needsUpdate = true
      }
    },
    dispose() {
      mats.forEach((m) => m.dispose())
      texs.forEach((t) => t.dispose())
    },
  }
}
