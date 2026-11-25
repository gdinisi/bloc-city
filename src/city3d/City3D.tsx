import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import type { CityState } from '../city/economy'
import { gridOf } from '../city/economy'
import { buildingById, sizeOf } from '../city/buildings'
import { buildMesh, disposeMaterials, mat } from './buildings3d'

/*
 * Prototype de vue 3D de la ville (Three.js / WebGL).
 * Île en blocs posée sur une mer qui reflète le ciel et les bâtiments,
 * soleil avec ombres, ciel, brume, nuages, caméra libre au doigt.
 */

type Quality = 'jolie' | 'fluide'
type Light = 'jour' | 'couchant'

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
    renderer.toneMappingExposure = light === 'couchant' ? 0.55 : 0.3
    renderer.shadowMap.enabled = pretty
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 2000)
    // un peu plus de recul en portrait (téléphone) pour voir toute l'île
    const back = el.clientWidth < el.clientHeight ? 1.45 : 1
    camera.position.set(G * 0.95 * back, G * 0.8 * back, G * 0.95 * back)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.6, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 3
    controls.maxDistance = G * 3
    controls.maxPolarAngle = Math.PI / 2 - 0.03 // jusqu'au ras de l'eau
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }

    // ---------- ciel et soleil ----------
    const sun = new THREE.Vector3()
    const elevation = light === 'couchant' ? 6 : 38
    const azimuth = 200
    sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elevation), THREE.MathUtils.degToRad(azimuth))

    const sky = new Sky()
    sky.scale.setScalar(1000)
    const su = sky.material.uniforms
    su['turbidity'].value = light === 'couchant' ? 8 : 4
    su['rayleigh'].value = light === 'couchant' ? 2.5 : 1.2
    su['mieCoefficient'].value = 0.005
    su['mieDirectionalG'].value = 0.85
    su['sunPosition'].value.copy(sun)
    scene.add(sky)

    // lumière d'ambiance tirée du ciel
    const pmrem = new THREE.PMREMGenerator(renderer)
    const skyScene = new THREE.Scene()
    skyScene.add(sky.clone())
    const envRT = pmrem.fromScene(skyScene as unknown as THREE.Scene)
    scene.environment = envRT.texture
    // en plein jour le ciel éclaire beaucoup : on modère pour garder des couleurs franches
    scene.environmentIntensity = light === 'couchant' ? 0.6 : 0.22

    const sunLight = new THREE.DirectionalLight(light === 'couchant' ? '#ffb27a' : '#fff4e0', light === 'couchant' ? 2.4 : 2.6)
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
    scene.add(new THREE.HemisphereLight('#bfe3ff', '#6b8f4e', 0.5))
    scene.fog = new THREE.Fog(light === 'couchant' ? '#e8b9a0' : '#cfe3f3', G * 2.2, G * 8)

    // ---------- mer ----------
    const waterNormals = makeWaterNormals()
    const water = new Water(new THREE.PlaneGeometry(600, 600), {
      textureWidth: pretty ? 512 : 256,
      textureHeight: pretty ? 512 : 256,
      waterNormals,
      sunDirection: sun.clone().normalize(),
      sunColor: light === 'couchant' ? 0xffc59a : 0xffffff,
      waterColor: 0x1e5f8a,
      distortionScale: 1.3,
      fog: true,
    })
    water.rotation.x = -Math.PI / 2
    water.position.y = WATER_Y
    water.material.uniforms['size'].value = 3
    scene.add(water)

    // fond marin sableux
    const seabed = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat('#b8a878'))
    seabed.rotation.x = -Math.PI / 2
    seabed.position.y = BOTTOM
    scene.add(seabed)

    // ---------- île : une colonne par case ----------
    const side = mat('#8a5a35')
    const geos: THREE.BufferGeometry[] = []
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
        const geo = new THREE.BoxGeometry(1, h, 1)
        geos.push(geo)
        // damier léger pour distinguer les cases
        const baseColor = GROUND_TOP[gid] ?? GROUND_TOP.herbe
        const topColor = (x + y) % 2 && gid !== 'route' ? `#${new THREE.Color(baseColor).offsetHSL(0, 0, -0.035).getHexString()}` : baseColor
        const topMat = mat(topColor, { rough: gid === 'route' ? 0.7 : 0.95 })
        const m = new THREE.Mesh(geo, [side, side, topMat, side, side, side])
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
            const deck = new THREE.Mesh(new THREE.BoxGeometry(along ? 1 : 0.6, 0.08, along ? 0.6 : 1), mat('#b07a45'))
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

    // ---------- bâtiments ----------
    const pickables: THREE.Object3D[] = []
    for (const p of city.placed) {
      const b = buildingById(p.id)
      if (!b) continue
      const s = sizeOf(b)
      let top = 0
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) top = Math.max(top, topOf(p.x + dx, p.y + dy))
      const g = buildMesh(b)
      g.scale.setScalar(s)
      g.position.set(X(p.x) + (s - 1) / 2, top, Z(p.y) + (s - 1) / 2)
      if (p.flip) g.rotation.y = Math.PI / 2
      g.userData.name = b.name
      g.traverse((o) => (o.userData.name = b.name))
      scene.add(g)
      pickables.push(g)
    }

    // ---------- décor : collines au loin et nuages ----------
    const hills = new THREE.Group()
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3
      const r = G * (2.6 + (i % 3) * 0.7)
      const hgt = 4 + (i % 4) * 2.5
      const hill = new THREE.Mesh(new THREE.ConeGeometry(G * 0.5 + (i % 2) * 3, hgt, 6), mat(i % 3 ? '#4f7c3a' : '#6a7d5c'))
      hill.position.set(Math.cos(a) * r, WATER_Y + hgt / 2 - 0.5, Math.sin(a) * r)
      hills.add(hill)
    }
    scene.add(hills)

    const clouds: THREE.Group[] = []
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, transparent: true, opacity: 0.92 })
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
      envRT.dispose()
      pmrem.dispose()
      cloudMat.dispose()
      disposeMaterials()
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
