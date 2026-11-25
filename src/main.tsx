import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { Gallery } from './workout/Gallery'
import { BuildingGallery } from './city/BuildingGallery'
import './styles.css'

registerSW({ immediate: true })

const q = new URLSearchParams(location.search)
const showGallery = import.meta.env.DEV && q.has('galerie')
const showBuildings = import.meta.env.DEV && q.has('batiments')
const showDemo3d = import.meta.env.DEV && q.has('demo3d')
const Demo3D = lazy(() => import('./city3d/Demo3D'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showGallery ? (
      <Gallery />
    ) : showBuildings ? (
      <BuildingGallery />
    ) : showDemo3d ? (
      <Suspense fallback={null}>
        <Demo3D />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
