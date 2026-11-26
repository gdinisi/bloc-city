import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { Gallery } from './workout/Gallery'
import { BuildingGallery } from './city/BuildingGallery'
import './styles.css'
import { applyTheme, savedTheme } from './lib/theme'

registerSW({ immediate: true })
applyTheme(savedTheme())

// Demande au navigateur de ne jamais effacer les données de l'app (connexion, séances)
void navigator.storage?.persist?.().catch(() => undefined)

const q = new URLSearchParams(location.search)
const showGallery = import.meta.env.DEV && q.has('galerie')
const showBuildings = import.meta.env.DEV && q.has('batiments')
const showFriendDemo = import.meta.env.DEV && q.has('amidemo')
const FriendDemo = lazy(() => import('./screens/FriendDemo'))
const showCityDemo = import.meta.env.DEV && q.has('villedemo')
const CityDemo = lazy(() => import('./city/CityDemo'))
const showSeanceDemo = import.meta.env.DEV && q.has('seancedemo')
const SeanceDemo = lazy(() => import('./workout/SeanceDemo'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showGallery ? (
      <Gallery />
    ) : showBuildings ? (
      <BuildingGallery />
    ) : showCityDemo ? (
      <Suspense fallback={null}>
        <CityDemo />
      </Suspense>
    ) : showSeanceDemo ? (
      <Suspense fallback={null}>
        <SeanceDemo />
      </Suspense>
    ) : showFriendDemo ? (
      <Suspense fallback={null}>
        <FriendDemo />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
