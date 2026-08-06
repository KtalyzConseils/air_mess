const {
  withInfoPlist,
  withEntitlementsPlist,
} = require('@expo/config-plugins')

/**
 * Config plugin — appel entrant iOS via VoIP push (PushKit) + CallKit.
 *
 * Nécessaire car le dossier ios/ est régénéré par `expo prebuild` (workflow managé) :
 * ces réglages natifs ne survivraient pas sans plugin.
 *
 * Ce fichier ne couvre QUE les réglages déterministes (Info.plist + entitlements).
 * Le câblage PushKit dans l'AppDelegate (Swift) est traité à part car il demande une
 * validation par build (cf. la suite du chantier).
 *
 * - UIBackgroundModes: `voip` est OBLIGATOIRE pour recevoir les pushs VoIP ; `audio` et
 *   `remote-notification` accompagnent CallKit.
 * - NSMicrophoneUsageDescription : CallKit initialise une session audio ; iOS exige la
 *   description même si l'app ne capte pas réellement le micro.
 * - aps-environment : entitlement requis pour APNs. 'production' fonctionne pour les
 *   builds App Store/TestFlight ; passer à 'development' pour un build de dev en sandbox.
 */
const REQUIRED_BACKGROUND_MODES = ['voip', 'audio', 'remote-notification', 'fetch']

function withVoipInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    const plist = config.modResults

    const modes = new Set(plist.UIBackgroundModes ?? [])
    for (const mode of REQUIRED_BACKGROUND_MODES) modes.add(mode)
    plist.UIBackgroundModes = Array.from(modes)

    if (!plist.NSMicrophoneUsageDescription) {
      plist.NSMicrophoneUsageDescription =
        "Air Mess utilise l'audio pour présenter les appels de nouvelles courses."
    }

    return config
  })
}

function withVoipEntitlements(config) {
  return withEntitlementsPlist(config, (config) => {
    // 'production' = APNs prod (App Store/TestFlight). Le token .p8 fonctionne aussi en
    // sandbox ; c'est cet entitlement + l'hôte APNs côté serveur qui décident du monde.
    if (!config.modResults['aps-environment']) {
      config.modResults['aps-environment'] = 'production'
    }
    return config
  })
}

module.exports = function withIosVoip(config) {
  config = withVoipInfoPlist(config)
  config = withVoipEntitlements(config)
  return config
}
