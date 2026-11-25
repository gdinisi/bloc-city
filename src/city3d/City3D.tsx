import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import type { CityState } from '../city/economy'
import { gridOf } from '../city/economy'
import { buildingById, sizeOf } from '../city/buildings'
import { buildMesh, disposeMaterials, mat, setNight, setTextures } from './buildings3d'
import type { TexId } from './textures'
import { disposeTextures, worldUV } from './textures'
import { occupiedTiles } from '../city/economy'
import { createMountains } from './mountains'

/** Texture du dessus de chaque type de sol */
const GROUND_TEX: Record<string, TexId> = {
  herbe: 'grass',
  fleurs: 'grass',
  route: 'asphalt',
  terre: 'dirt',
  paves: 'paving',
  sable: 'sand',
  planches: 'planks',
  neige: 'snow',
  eau: 'seabed',
  pont: 'seabed',
}

/*
 * Prototype de vue 3D de la ville (Three.js / WebGL).
 * Île en blocs posée sur une mer qui reflète le ciel et les bâtiments,
 * soleil avec ombres, ciel, brume, nuages, caméra libre au doigt.
 */

type Quality = 'jolie' | 'fluide'
type Light = 'jour' | 'couchant' | 'nuit'

const WATER_Y = 0.25
const BASE = 0.55 // hauteur d'une case au niveau 0
const STEP = 0.32 // hauteur d'une marche de relief
const BOTTOM = -1.6

const GROUND_TOP: Record<string, string> = {
  herbe: '#7cc35a',
  fleurs: '#86cc62',
  route: '#585b64',
  terre: '#a4744a',
  paves: '#bdb6ac',
  sable: '#e8d39a',
  planches: '#b98447',
  neige: '#f3f7fb',
  pont: '#c9b98a',
  eau: '#c9b98a',
}

/** Réglages d'ambiance : coucher de soleil doré ou plein jour au ciel bleu profond */
const AMBIANCE = {
  couchant: {
    elevation: 6,
    azimuth: 200,
    turbidity: 8,
    rayleigh: 2.5,
    mie: 0.005,
    mieG: 0.85,
    exposure: 0.55,
    env: 0.6,
    sun: '#ffb27a',
    sunI: 2.4,
    sky: '#bfe3ff',
    ground: '#6b8f4e',
    hemi: 0.5,
    fog: '#e8b9a0',
    water: 0x1e5f8a,
    sunColor: 0xffc59a,
  },
  jour: {
    // soleil assez haut mais pas au zénith : ombres franches, ciel bleu saturé
    elevation: 30,
    azimuth: 150,
    turbidity: 2,
    rayleigh: 0.7,
    mie: 0.003,
    mieG: 0.8,
    exposure: 0.42,
    env: 0.42,
    sun: '#fff1d6',
    sunI: 2.5,
    sky: '#8fc3f0',
    ground: '#55783a',
    hemi: 0.5,
    fog: '#a9cbe8',
    water: 0x17689c,
    sunColor: 0xfff4e0,
  },
  nuit: {
    // la « lumière du soleil » devient le clair de lune
    elevation: 32,
    azimuth: 230,
    turbidity: 0,
    rayleigh: 0,
    mie: 0,
    mieG: 0,
    exposure: 1.05,
    env: 0,
    sun: '#a9c0ff',
    sunI: 1.1,
    sky: '#3a4f8f',
    ground: '#0d1426',
    hemi: 0.55,
    fog: '#0b1533',
    water: 0x0a2440,
    sunColor: 0xbfd0ff,
  },
} as const

/** Texture de normales générée en code (pas d'image à télécharger) pour les vaguelettes */
function makeWaterNormals() {
  const n = 256
  const c = document.createElement('canvas')
  c.width = c.height = n
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(n, n)
  const h = (x: number, y: number) => {
    const t = (2 * Math.PI) / n
    return (
      Math.sin(x * t * 3 + Math.sin(y * t * 2) * 1.5) * 0.6 +
      Math.sin(y * t * 5 + x * t * 2) * 0.35 +
      Math.sin((x + y) * t * 7) * 0.2 +
      Math.sin((x - 2 * y) * t * 11) * 0.12
    )
  }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = h(x + 1, y) - h(x - 1, y)
      const dy = h(x, y + 1) - h(x, y - 1)
      const v = new THREE.Vector3(-dx * 2, -dy * 2, 1).normalize()
      const i = (y * n + x) * 4
      img.data[i] = (v.x * 0.5 + 0.5) * 255
      img.data[i + 1] = (v.y * 0.5 + 0.5) * 255
      img.data[i + 2] = (v.z * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

interface Props {
  city: CityState
  onClose: () => void
}

export default function City3D({ city, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [quality, setQuality] = useState<Quality>('jolie')
  const [light, setLight] = useState<Light>('couchant')
  const [label, setLabel] = useState<string | null>(null)
  const [fps, setFps] = useState<number | null>(null)

  useEffect(() => {
    const el = host.current!
    const G = gridOf(city)
    const pretty = quality === 'jolie'

    // ---------- moteur ----------
    const renderer = new THREE.WebGLRenderer({ antialias: pretty, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pretty ? 2 : 1.25))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    const A = AMBIANCE[light]
    renderer.toneMappingExposure = A.exposure
    renderer.shadowMap.enabled = pretty
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 2000)
    // un peu plus de recul en portrait (téléphone) pour voir toute l'île
    const back = (el.clientWidth < el.clientHeight ? 1.9 : 1.1) * (G >= 12 ? 1.25 : 1)
    camera.position.set(G * 0.95 * back, G * 0.75 * back, G * 0.95 * back)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.6, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 3
    controls.maxDistance = G * 4
    controls.maxPolarAngle = Math.PI / 2 - 0.03 // jusqu'au ras de l'eau
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }

    // ---------- ciel et soleil ----------
    const sun = new THREE.Vector3()
    sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - A.elevation), THREE.MathUtils.degToRad(A.azimuth))

    const isNight = light === 'nuit'
    setNight(isNight)
    const pmrem = new THREE.PMREMGenerator(renderer)
    let envRT: THREE.WebGLRenderTarget | null = null
    const nightStuff: THREE.Object3D[] = []

    if (!isNight) {
      const sky = new Sky()
      sky.scale.setScalar(1000)
      const su = sky.material.uniforms
      su['turbidity'].value = A.turbidity
      su['rayleigh'].value = A.rayleigh
      su['mieCoefficient'].value = A.mie
      su['mieDirectionalG'].value = A.mieG
      su['sunPosition'].value.copy(sun)
      scene.add(sky)
      // lumière d'ambiance tirée du ciel
      const skyScene = new THREE.Scene()
      skyScene.add(sky.clone())
      envRT = pmrem.fromScene(skyScene as unknown as THREE.Scene)
      scene.environment = envRT.texture
      // en plein jour le ciel éclaire beaucoup : on modère pour garder des couleurs franches
      scene.environmentIntensity = A.env
    } else {
      // ---------- nuit : dégradé, étoiles, lune ----------
      scene.background = new THREE.Color('#0b1533')
      const starGeo = new THREE.BufferGeometry()
      const sp: number[] = []
      for (let i = 0; i < 1800; i++) {
        const v = new THREE.Vector3().setFromSphericalCoords(900, Math.random() * Math.PI * 0.47, Math.random() * Math.PI * 2)
        sp.push(v.x, v.y, v.z)
      }
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
      const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false }))
      scene.add(stars)
      nightStuff.push(stars)
      const moon = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 16), new THREE.MeshBasicMaterial({ color: '#f6f1dc', fog: false }))
      moon.position.copy(sun).multiplyScalar(700)
      scene.add(moon)
      const halo = new THREE.Mesh(new THREE.SphereGeometry(34, 24, 16), new THREE.MeshBasicMaterial({ color: '#8fa6ff', transparent: true, opacity: 0.12, fog: false }))
      halo.position.copy(moon.position)
      scene.add(halo)
      nightStuff.push(moon, halo)
    }

    const sunLight = new THREE.DirectionalLight(A.sun, A.sunI)
    sunLight.position.copy(sun).multiplyScalar(G * 2)
    sunLight.castShadow = pretty
    sunLight.shadow.mapSize.set(2048, 2048)
    const sc = sunLight.shadow.camera
    sc.left = sc.bottom = -G * 0.85
    sc.right = sc.top = G * 0.85
    sc.near = 0.5
    sc.far = G * 6
    sunLight.shadow.bias = -0.0008
    scene.add(sunLight)
    scene.add(new THREE.HemisphereLight(A.sky, A.ground, A.hemi))
    // brume : l'île reste nette, les montagnes lointaines se fondent dans le ciel
    // la nuit, les montagnes restent visibles en silhouettes sombres sous la lune
    scene.fog = new THREE.Fog(A.fog, G * 2.5, light === 'nuit' ? 900 : 420)

    // ---------- mer ----------
    const waterNormals = makeWaterNormals()
    const water = new Water(new THREE.PlaneGeometry(600, 600), {
      textureWidth: pretty ? 512 : 256,
      textureHeight: pretty ? 512 : 256,
      waterNormals,
      sunDirection: sun.clone().normalize(),
      sunColor: A.sunColor,
      waterColor: A.water,
      distortionScale: 0.85,
      fog: true,
    })
    water.rotation.x = -Math.PI / 2
    water.position.y = WATER_Y
    water.material.uniforms['size'].value = 3
    scene.add(water)

    // fond marin sableux
    const seabedGeo = new THREE.PlaneGeometry(600, 600)
    const suv = seabedGeo.getAttribute('uv') as THREE.BufferAttribute
    for (let i = 0; i < suv.count; i++) suv.setXY(i, suv.getX(i) * 150, suv.getY(i) * 150)
    const seabed = new THREE.Mesh(seabedGeo, mat(pretty ? '#ffffff' : '#b8a878', { tex: 'seabed' }))
    seabed.rotation.x = -Math.PI / 2
    seabed.position.y = BOTTOM
    scene.add(seabed)

    // ---------- île : une colonne par case ----------
    setTextures(pretty)
    const side = mat(pretty ? '#ffffff' : '#8a5a35', { tex: 'dirt', bump: 1.2 })
    const lipSide = mat('#ffffff', { tex: 'grassSide', bump: 1 })
    const geos: THREE.BufferGeometry[] = []
    const tufts: THREE.Matrix4[] = []
    const occupied = occupiedTiles(city)
    const groundAt = (x: number, y: number) => (x < 0 || y < 0 || x >= G || y >= G ? null : (city.ground[`${x},${y}`] ?? 'herbe'))
    const topOf = (x: number, y: number) => {
      const gid = groundAt(x, y)
      if (gid === 'eau' || gid === 'pont') return WATER_Y - 0.45
      return BASE + (city.elevation[`${x},${y}`] ?? 0) * STEP
    }
    const X = (x: number) => x - G / 2 + 0.5
    const Z = (y: number) => y - G / 2 + 0.5

    for (let y = 0; y < G; y++)
      for (let x = 0; x < G; x++) {
        const gid = groundAt(x, y)!
        const top = topOf(x, y)
        const h = top - BOTTOM
        const geo = worldUV(new THREE.BoxGeometry(1, h, 1), 1, h, 1, 1)
        geos.push(geo)
        // damier léger pour distinguer les cases
        const tex = GROUND_TEX[gid] ?? 'grass'
        const baseColor = pretty ? '#ffffff' : (GROUND_TOP[gid] ?? GROUND_TOP.herbe)
        const topColor = (x + y) % 2 && gid !== 'route' ? `#${new THREE.Color(baseColor).offsetHSL(0, 0, -0.04).getHexString()}` : baseColor
        const topMat = mat(topColor, { rough: gid === 'route' ? 0.75 : 0.95, tex, bump: gid === 'paves' || gid === 'planches' ? 1.3 : 1 })
        const m = new THREE.Mesh(geo, [side, side, topMat, side, side, side])
        const grassy = gid === 'herbe' || gid === 'fleurs'
        // rebord d'herbe sur les flancs (aspect « bloc »)
        if (pretty && grassy) {
          const lipGeo = new THREE.BoxGeometry(1.004, 0.16, 1.004)
          geos.push(lipGeo)
          const lip = new THREE.Mesh(lipGeo, [lipSide, lipSide, topMat, side, lipSide, lipSide])
          lip.position.set(X(x), top - 0.08 + 0.002, Z(y))
          lip.receiveShadow = true
          scene.add(lip)
        }
        // touffes d'herbe en relief
        if (pretty && grassy && !occupied.has(`${x},${y}`)) {
          for (let k = 0; k < 5; k++) {
            const mtx = new THREE.Matrix4()
            const s = 0.6 + Math.random() * 0.8
            mtx.compose(
              new THREE.Vector3(X(x) + (Math.random() - 0.5) * 0.86, top + 0.05 * s, Z(y) + (Math.random() - 0.5) * 0.86),
              new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4)),
              new THREE.Vector3(s, s, s),
            )
            tufts.push(mtx)
          }
        }
        m.position.set(X(x), BOTTOM + h / 2, Z(y))
        m.receiveShadow = true
        m.castShadow = pretty
        scene.add(m)

        // marquage des routes et tabliers des ponts, raccordés aux voisins
        if (gid === 'route' || gid === 'pont') {
          const links = (
            [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ] as const
          ).filter(([dx, dy]) => ['route', 'pont'].includes(groundAt(x + dx, y + dy) ?? ''))
          if (gid === 'pont') {
            const along = links.some(([dx]) => dx !== 0) || !links.length
            const deckGeo = worldUV(new THREE.BoxGeometry(along ? 1 : 0.6, 0.08, along ? 0.6 : 1), along ? 1 : 0.6, 0.08, along ? 0.6 : 1, 1)
            const deck = new THREE.Mesh(deckGeo, mat(pretty ? '#e8c9a0' : '#b07a45', { tex: 'planks', bump: 1.2 }))
            deck.position.set(X(x), WATER_Y + 0.22, Z(y))
            deck.castShadow = deck.receiveShadow = true
            scene.add(deck)
            for (const s of [-1, 1]) {
              const rail = new THREE.Mesh(new THREE.BoxGeometry(along ? 1 : 0.04, 0.12, along ? 0.04 : 1), mat('#6b4423'))
              rail.position.set(X(x) + (along ? 0 : s * 0.3), WATER_Y + 0.32, Z(y) + (along ? s * 0.3 : 0))
              rail.castShadow = true
              scene.add(rail)
            }
          } else {
            for (const [dx, dy] of links) {
              const dash = new THREE.Mesh(new THREE.BoxGeometry(dx ? 0.22 : 0.05, 0.01, dy ? 0.22 : 0.05), mat('#f1f3f5'))
              dash.position.set(X(x) + dx * 0.28, top + 0.006, Z(y) + dy * 0.28)
              scene.add(dash)
            }
          }
        }
        if (gid === 'fleurs') {
          for (let i = 0; i < 4; i++) {
            const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), mat(['#ff70a6', '#ffd166', '#9b5de5', '#ffffff'][i]))
            f.position.set(X(x) + ((i % 2) - 0.5) * 0.5, top + 0.04, Z(y) + (Math.floor(i / 2) - 0.5) * 0.5)
            scene.add(f)
          }
        }
      }

    // touffes d'herbe : un seul objet instancié pour des centaines de brins (léger)
    let tuftMesh: THREE.InstancedMesh | null = null
    if (tufts.length) {
      const tuftGeo = new THREE.ConeGeometry(0.035, 0.14, 3)
      geos.push(tuftGeo)
      tuftMesh = new THREE.InstancedMesh(tuftGeo, new THREE.MeshStandardMaterial({ color: '#5fa843', roughness: 1, flatShading: true }), tufts.length)
      const c = new THREE.Color()
      tufts.forEach((m, i) => {
        tuftMesh!.setMatrixAt(i, m)
        tuftMesh!.setColorAt(i, c.setHSL(0.25 + Math.random() * 0.06, 0.48, 0.42 + Math.random() * 0.14))
      })
      tuftMesh.receiveShadow = true
      scene.add(tuftMesh)
    }

    // ---------- bâtiments ----------
    const pickables: THREE.Object3D[] = []
    for (const p of city.placed) {
      const b = buildingById(p.id)
      if (!b) continue
      const s = sizeOf(b)
      let top = 0
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) top = Math.max(top, topOf(p.x + dx, p.y + dy))
      const g = buildMesh(b)
      // l'emprise étire au sol ; la hauteur, elle, est déjà réaliste
      g.scale.set(g.scale.x * s, g.scale.y, g.scale.z * s)
      g.position.set(X(p.x) + (s - 1) / 2, top, Z(p.y) + (s - 1) / 2)
      if (p.flip) g.rotation.y = Math.PI / 2
      g.userData.name = b.name
      g.traverse((o) => (o.userData.name = b.name))
      scene.add(g)
      pickables.push(g)
    }

    // ---------- lampadaires le long des routes ----------
    const lampPositions: THREE.Vector3[] = []
    for (let y = 0; y < G; y++)
      for (let x = 0; x < G; x++) {
        if (groundAt(x, y) !== 'route' || (x * 7 + y * 3) % 4 !== 0) continue
        // sur le bord de la route, côté herbe si possible
        const top = topOf(x, y)
        const p = new THREE.Vector3(X(x) + 0.42, top, Z(y) + 0.42)
        if (occupied.has(`${x},${y}`)) continue
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.7, 6), mat('#3a3f4b', { metal: 0.6, rough: 0.4 }))
        pole.position.set(p.x, top + 0.35, p.z)
        pole.castShadow = true
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 8, 6),
          isNight ? new THREE.MeshBasicMaterial({ color: '#ffd38a' }) : mat('#e9ecef', { rough: 0.3 }),
        )
        bulb.position.set(p.x, top + 0.74, p.z)
        scene.add(pole, bulb)
        lampPositions.push(new THREE.Vector3(p.x, top + 0.74, p.z))
      }
    // de vraies lumières pour quelques lampadaires seulement (sinon trop lourd pour un téléphone)
    if (isNight) {
      lampPositions.slice(0, pretty ? 10 : 4).forEach((p) => {
        const l = new THREE.PointLight('#ffb866', 3.2, 3.2, 1.6)
        l.position.copy(p)
        scene.add(l)
      })
    }

    // ---------- phare : faisceau tournant la nuit ----------
    let lighthouseBeam: THREE.Object3D | null = null
    const phare = city.placed.find((p) => p.id === 'phare')
    if (isNight && phare) {
      const top = topOf(phare.x, phare.y) + 3.9
      const pivot = new THREE.Group()
      pivot.position.set(X(phare.x), top, Z(phare.y))
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, 9, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, fog: false }),
      )
      cone.rotation.z = Math.PI / 2
      cone.position.x = 4.5
      pivot.add(cone)
      const spot = new THREE.SpotLight('#fff1c2', 40, 30, 0.25, 0.6, 1.2)
      spot.position.set(0, 0, 0)
      spot.target.position.set(10, -1.5, 0)
      pivot.add(spot, spot.target)
      scene.add(pivot)
      lighthouseBeam = pivot
      nightStuff.push(cone)
    }

    // ---------- décor : chaînes de montagnes tout autour ----------
    const mountains = createMountains(G / 2, WATER_Y)
    scene.add(mountains)

    const clouds: THREE.Group[] = []
    const cloudMat = new THREE.MeshStandardMaterial({
      color: isNight ? '#5a6488' : '#ffffff',
      flatShading: true,
      roughness: 1,
      transparent: true,
      opacity: isNight ? 0.55 : 0.92,
    })
    for (let i = 0; i < 10; i++) {
      const c = new THREE.Group()
      for (let k = 0; k < 5; k++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + Math.random() * 1.2, 0), cloudMat)
        puff.position.set(k * 1.4 - 2.8, Math.random() * 0.6, Math.random() * 1.2)
        c.add(puff)
      }
      // haut dans le ciel et autour de l'île, jamais devant la caméra
      const a = Math.random() * Math.PI * 2
      const r = G * (1.6 + Math.random() * 1.6)
      c.position.set(Math.cos(a) * r, G * 1.7 + Math.random() * 6, Math.sin(a) * r)
      c.scale.setScalar(0.9 + Math.random() * 0.9)
      scene.add(c)
      clouds.push(c)
    }

    // ---------- toucher un bâtiment : son nom ----------
    const ray = new THREE.Raycaster()
    let downAt: [number, number] | null = null
    const onDown = (e: PointerEvent) => (downAt = [e.clientX, e.clientY])
    const onUp = (e: PointerEvent) => {
      if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return
      const r = renderer.domElement.getBoundingClientRect()
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
      const hit = ray.intersectObjects(pickables, true)[0]
      setLabel(hit ? (hit.object.userData.name as string) : null)
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // ---------- boucle d'animation ----------
    const clock = new THREE.Clock()
    let frames = 0
    let acc = 0
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.1)
      water.material.uniforms['time'].value += dt * 0.6
      if (lighthouseBeam) lighthouseBeam.rotation.y += dt * 0.7
      for (const c of clouds) {
        c.position.x += dt * 0.35
        if (c.position.x > G * 3) c.position.x = -G * 3
      }
      controls.update()
      renderer.render(scene, camera)
      frames++
      acc += dt
      if (acc > 1) {
        setFps(Math.round(frames / acc))
        frames = 0
        acc = 0
      }
    })

    return () => {
      renderer.setAnimationLoop(null)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      controls.dispose()
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose()
      })
      geos.forEach((g) => g.dispose())
      waterNormals.dispose()
      envRT?.dispose()
      ;(mountains.material as THREE.Material).dispose()
      nightStuff.forEach((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) (o.material as THREE.Material).dispose()
      })
      pmrem.dispose()
      cloudMat.dispose()
      disposeMaterials()
      disposeTextures()
      tuftMesh?.dispose()
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
    // reconstruit la scène si la qualité ou la lumière change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, light])

  return (
    <div className="city3d" role="dialog" aria-label="Vue 3D de la ville">
      <div ref={host} className="city3d-canvas" />
      <div className="city3d-top">
        <button type="button" className="round" aria-label="Fermer la vue 3D" onClick={onClose}>
          ✕
        </button>
        <span className="city3d-title">Vue 3D · prototype</span>
        {fps !== null && <span className="city3d-fps">{fps} i/s</span>}
      </div>
      <div className="city3d-bottom">
        <div className="seg">
          <button type="button" className={light === 'couchant' ? 'on' : ''} onClick={() => setLight('couchant')}>
            🌅 Couchant
          </button>
          <button type="button" className={light === 'jour' ? 'on' : ''} onClick={() => setLight('jour')}>
            ☀️ Jour
          </button>
          <button type="button" className={light === 'nuit' ? 'on' : ''} onClick={() => setLight('nuit')}>
            🌙 Nuit
          </button>
        </div>
        <div className="seg">
          <button type="button" className={quality === 'jolie' ? 'on' : ''} onClick={() => setQuality('jolie')}>
            ✨ Jolie
          </button>
          <button type="button" className={quality === 'fluide' ? 'on' : ''} onClick={() => setQuality('fluide')}>
            ⚡ Fluide
          </button>
        </div>
        <p className="city3d-hint">{label ? `🏛️ ${label}` : '1 doigt : tourner · 2 doigts : zoomer et déplacer · touche un bâtiment'}</p>
      </div>
    </div>
  )
}
