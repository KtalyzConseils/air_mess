// Config Expo dynamique.
//
// Rôles :
//   1. Résoudre le chemin de google-services.json.
//      - En build EAS : secret projet GOOGLE_SERVICES_JSON (type file) matérialisé sur disque.
//      - En local : retombe sur ./google-services.json déposé à la main.
//   2. Injecter la clé Google Maps SDK for Android (jamais commit).
//      - En build EAS : secret projet GOOGLE_MAPS_ANDROID_KEY (type string).
//      - En local : lue depuis un .env non versionné (via expo start / EAS local build).
//      La clé DOIT être restreinte côté Google Cloud Console :
//         · Application restrictions : Android app + package `com.anonymous.driverapp` + SHA-1
//         · API restrictions : "Maps SDK for Android" uniquement
//      → même extraite de l'APK par un tiers, elle n'est utilisable dans aucune autre app.
//
// Tout le reste de la config reste dans app.json (source de vérité), reçu ici via `config`.
export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY,
      },
    },
  },
})
