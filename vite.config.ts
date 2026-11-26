import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// L'app est servie par GitHub Pages sous https://<pseudo>.github.io/bloc-city/
const base = '/bloc-city/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-48x48.png', 'apple-touch-icon-180x180.png', 'img/*.webp'],
      // Rendus des bâtiments (public/img/ville) : mis en cache au premier affichage, pas au téléchargement de l'app
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/img\/ville\//,
            handler: 'CacheFirst',
            options: { cacheName: 'ville-img', expiration: { maxEntries: 1500 } },
          },
        ],
      },
      manifest: {
        name: 'Bloc City',
        short_name: 'Bloc City',
        description: "Suis tes séances d'escalade et fais grandir ta ville.",
        lang: 'fr',
        theme_color: '#0d0e10',
        background_color: '#0d0e10',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
