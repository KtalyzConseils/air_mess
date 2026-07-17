const {
  withAndroidManifest,
  withProjectBuildGradle,
  withAndroidStyles,
  AndroidConfig,
} = require('@expo/config-plugins')

/**
 * Config plugin — alertes "course entrante" façon appel entrant (Notifee full-screen intent).
 *
 * 1. Manifest :
 *    - permission USE_FULL_SCREEN_INTENT (requise Android 14+, sans effet en-dessous),
 *    - android:showWhenLocked + android:turnScreenOn sur MainActivity
 *      pour que l'écran s'allume par-dessus le verrouillage quand la notif full-screen s'ouvre.
 * 2. build.gradle racine : déclare le dépôt Maven LOCAL de Notifee (app.notifee:core),
 *    sinon Gradle ne trouve pas la lib (`Could not find app.notifee:core`).
 *
 * Nécessaire car le dossier android/ est régénéré par `expo prebuild` (workflow managé).
 */
const FULL_SCREEN_PERMISSION = 'android.permission.USE_FULL_SCREEN_INTENT'
const NOTIFEE_REPO_MARKER = '@notifee/react-native/android/libs'
const NOTIFEE_REPO_LINE =
  'maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }'

function withFullScreenManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults

    if (!Array.isArray(manifest.manifest['uses-permission'])) {
      manifest.manifest['uses-permission'] = []
    }
    const perms = manifest.manifest['uses-permission']
    if (!perms.some((p) => p.$?.['android:name'] === FULL_SCREEN_PERMISSION)) {
      perms.push({ $: { 'android:name': FULL_SCREEN_PERMISSION } })
    }

    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(manifest)
    mainActivity.$['android:showWhenLocked'] = 'true'
    mainActivity.$['android:turnScreenOn'] = 'true'

    return config
  })
}

function withNotifeeMavenRepo(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config
    let contents = config.modResults.contents
    if (contents.includes(NOTIFEE_REPO_MARKER)) return config

    // Injecte le dépôt dans le bloc allprojects { repositories { ... } }
    contents = contents.replace(
      /(allprojects\s*\{[\s\S]*?repositories\s*\{)/,
      `$1\n        ${NOTIFEE_REPO_LINE}`,
    )
    config.modResults.contents = contents
    return config
  })
}

/**
 * Force les icônes de la barre de statut en SOMBRE par défaut (heure/batterie/réseau
 * lisibles sur nos fonds clairs crème). Chemin NATIF (thème) — plus fort que l'API JS
 * setAppearanceLightStatusBars, que certains OEM (Transsion/TECNO/itel) ignorent.
 * Les écrans sombres (login, appel entrant, splash) repassent en icônes claires via
 * expo-status-bar style="light" au runtime.
 */
function withLightStatusBar(config) {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults
    if (!styles.resources.style) return config
    const appTheme = styles.resources.style.find((s) => s.$.name === 'AppTheme')
    if (!appTheme) return config
    if (!Array.isArray(appTheme.item)) appTheme.item = []
    appTheme.item = appTheme.item.filter(
      (i) => i.$.name !== 'android:windowLightStatusBar',
    )
    appTheme.item.push({ _: 'true', $: { name: 'android:windowLightStatusBar' } })
    return config
  })
}

module.exports = function withFullScreenNotifications(config) {
  config = withFullScreenManifest(config)
  config = withNotifeeMavenRepo(config)
  config = withLightStatusBar(config)
  return config
}
