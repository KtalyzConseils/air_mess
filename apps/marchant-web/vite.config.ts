import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA — expérience centrée sur l'espace marchand/particulier :
    // l'app installée s'ouvre sur /dashboard ; l'admin reste un simple site.
    VitePWA({
      registerType: 'prompt', // mise à jour via toast "Recharger" (jamais de reload sauvage)
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Air Mess',
        short_name: 'Air Mess',
        description: 'Livraison express à Cotonou — créez, payez et suivez vos livraisons.',
        lang: 'fr',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1A1614',
        background_color: '#FAF7F0',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache du shell applicatif uniquement. AUCUN runtimeCaching pour
        // l'API : courses/wallet/auth sont du temps réel, les requêtes passent
        // toujours en direct (le SW ne matche pas → passthrough réseau).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    port: 5173,
  },
})
