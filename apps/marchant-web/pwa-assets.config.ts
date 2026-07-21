import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

/**
 * Génération des icônes PWA depuis le logo Air Mess (npm run generate-pwa-assets).
 * - transparentes : favicons + icônes classiques
 * - maskable : fond dark + marge de sécurité pour le recadrage rond Android
 * - apple : fond dark plein (iOS n'accepte pas la transparence)
 */
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      sizes: [512],
      padding: 0.35,
      resizeOptions: { background: '#1A1614', fit: 'contain' },
    },
    apple: {
      sizes: [180],
      padding: 0.2,
      resizeOptions: { background: '#1A1614', fit: 'contain' },
    },
  },
  images: ['public/airmess-mark.svg'],
})
