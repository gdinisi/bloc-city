import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { Gallery } from './workout/Gallery'
import './styles.css'

registerSW({ immediate: true })

const showGallery = import.meta.env.DEV && new URLSearchParams(location.search).has('galerie')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{showGallery ? <Gallery /> : <App />}</StrictMode>,
)
