/**
 * Génère toutes les icônes et le splash de l'app driver à partir des SVG
 * de la marque Air Mess (./assets/logo/*.svg).
 *
 * Usage :
 *   node scripts/generate-icons.mjs
 *
 * Sortie (dans ./assets/images/) :
 *   - icon.png                          → 1024×1024, mark jaune sur fond dark (iOS/Android launcher)
 *   - android-icon-foreground.png       → 1024×1024, mark jaune sur transparent (safe zone Android)
 *   - android-icon-background.png       → 1024×1024, uni dark
 *   - android-icon-monochrome.png       → 1024×1024, mark blanc sur transparent (icônes thémées Android 13+)
 *   - splash-icon.png                   → 1024×1024, mark jaune sur transparent (splash Expo)
 *   - favicon.png                       → 48×48, mark jaune sur dark (web)
 *
 * Bg dark = #1A1614 (airmess-dark), yellow mark = déjà dans le SVG.
 */
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const LOGO_DIR = path.join(ROOT, 'assets/logo')
const OUT_DIR = path.join(ROOT, 'assets/images')

const BRAND_DARK = '#1A1614'
const CANVAS = 1024

/**
 * Rend un SVG en PNG à la taille voulue via sharp.
 * `paddingPct` : marge autour du contenu (en % de la largeur canvas).
 */
async function renderSvg(svgPath, size, paddingPct = 0.15) {
  const raw = readFileSync(svgPath, 'utf-8')
  const inner = Math.round(size * (1 - paddingPct * 2))
  return sharp(Buffer.from(raw))
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

/** Compose un buffer sur un fond coloré carré. */
async function withBackground(pngBuffer, color, size) {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: color,
    },
  })
    .composite([{ input: pngBuffer, gravity: 'center' }])
    .png()
    .toBuffer()
}

async function main() {
  const markSvg = path.join(LOGO_DIR, 'airmess-mark.svg')
  const markWhiteSvg = path.join(LOGO_DIR, 'airmess-mark-white.svg')

  // 1) icon.png — mark jaune centrée sur fond dark
  const markOnDark = await renderSvg(markSvg, CANVAS, 0.22)
  const iconPng = await withBackground(markOnDark, BRAND_DARK, CANVAS)
  await sharp(iconPng).toFile(path.join(OUT_DIR, 'icon.png'))
  console.log('✓ icon.png')

  // 2) android-icon-foreground.png — mark jaune sur transparent
  //    (Android affiche cette couche par-dessus le background. La safe zone
  //    est ~66% du canvas → padding généreux pour éviter la découpe.)
  const markForeground = await renderSvg(markSvg, CANVAS, 0.28)
  await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: markForeground, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, 'android-icon-foreground.png'))
  console.log('✓ android-icon-foreground.png')

  // 3) android-icon-background.png — uni dark
  await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: BRAND_DARK },
  })
    .png()
    .toFile(path.join(OUT_DIR, 'android-icon-background.png'))
  console.log('✓ android-icon-background.png')

  // 4) android-icon-monochrome.png — mark blanc (silhouette) sur transparent
  //    Utilisé par Android 13+ pour les icônes thémées (bg dynamique OS).
  const markMonochrome = await renderSvg(markWhiteSvg, CANVAS, 0.28)
  await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: markMonochrome, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, 'android-icon-monochrome.png'))
  console.log('✓ android-icon-monochrome.png')

  // 5) splash-icon.png — composition MARK JAUNE + WORDMARK BLANC empilés
  //    verticalement pour poser la marque plein écran au démarrage.
  //    Ratio hauteur/largeur : 1.5 (portrait) → convient au centrage Expo.
  //
  //    Layout dans canvas 1024×1536 :
  //      ┌───────────────────────┐
  //      │                       │
  //      │       [ MARK ]        │  bloc 520×520, y=280
  //      │                       │
  //      │                       │
  //      │    [ WORDMARK ]       │  bloc 680×140, y=880
  //      │                       │
  //      └───────────────────────┘
  const SPLASH_W = 1024
  const SPLASH_H = 1536
  const markLayer = await sharp(readFileSync(path.join(LOGO_DIR, 'airmess-mark.svg')))
    .resize(520, 520, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  const wordmarkLayer = await sharp(readFileSync(path.join(LOGO_DIR, 'airmess-wordmark-white.svg')))
    .resize(680, 200, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  await sharp({
    create: {
      width: SPLASH_W,
      height: SPLASH_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: markLayer, left: (SPLASH_W - 520) / 2, top: 380 },
      { input: wordmarkLayer, left: (SPLASH_W - 680) / 2, top: 1000 },
    ])
    .png()
    .toFile(path.join(OUT_DIR, 'splash-icon.png'))
  console.log('✓ splash-icon.png (composition mark + wordmark)')

  // 6) favicon.png — 48×48 pour le web
  const favMark = await renderSvg(markSvg, 48, 0.15)
  const favIcon = await withBackground(favMark, BRAND_DARK, 48)
  await sharp(favIcon).toFile(path.join(OUT_DIR, 'favicon.png'))
  console.log('✓ favicon.png')

  console.log('\n✅ Toutes les icônes générées dans', OUT_DIR)
}

main().catch((err) => {
  console.error('✗ Erreur :', err.message)
  process.exit(1)
})
