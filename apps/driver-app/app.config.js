// Config Expo dynamique.
//
// Unique rôle : résoudre le chemin de google-services.json.
// - En build EAS, le fichier est fourni par le secret projet GOOGLE_SERVICES_JSON
//   (type file) qu'EAS matérialise sur disque et expose via cette variable d'env.
//   Le fichier étant gitignoré, il n'est PLUS dans l'archive du build — d'où le secret.
// - En local (variable absente), on retombe sur ./google-services.json déposé à la main.
//
// Tout le reste de la config reste dans app.json (source de vérité), reçu ici via `config`.
export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
  },
})
