const {
  withInfoPlist,
  withEntitlementsPlist,
  withAppDelegate,
} = require('@expo/config-plugins')

// Marqueur d'idempotence : évite une double injection si prebuild rejoue le plugin.
const VOIP_MARKER = '// airmess-voip'

// Imports Swift ajoutés en tête de l'AppDelegate.
const VOIP_IMPORTS = `${VOIP_MARKER}
import PushKit
import RNVoipPushNotification
import RNCallKeep`

// Enregistrement du registre VoIP, injecté dans didFinishLaunchingWithOptions.
const VOIP_REGISTER = `    RNVoipPushNotificationManager.voipRegistration() ${VOIP_MARKER}`

// Délégué PushKit : à la réception d'un push VoIP, on signale IMMÉDIATEMENT l'appel à
// CallKit (obligatoire iOS 13+, sinon iOS tue l'app), puis on relaie l'événement au JS.
const VOIP_EXTENSION = `
${VOIP_MARKER}
extension AppDelegate: PKPushRegistryDelegate {
  public func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    RNVoipPushNotificationManager.didUpdate(pushCredentials, forType: type.rawValue)
  }

  public func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    let data = payload.dictionaryPayload
    let uuid = UUID().uuidString
    let handle = (data["origin"] as? String) ?? "Air Mess"
    RNCallKeep.reportNewIncomingCall(
      uuid,
      handle: handle,
      handleType: "generic",
      hasVideo: false,
      localizedCallerName: "Nouvelle course",
      supportsHolding: false,
      supportsDTMF: false,
      supportsGrouping: false,
      supportsUngrouping: false,
      fromPushKit: true,
      payload: data,
      withCompletionHandler: completion
    )
    RNVoipPushNotificationManager.didReceiveIncomingPush(withPayload: payload, forType: type.rawValue)
  }
}
`

/**
 * Injecte le câblage PushKit dans l'AppDelegate Swift (SDK 56).
 *
 * ⚠️ Modification de code natif faite « à l'aveugle » (impossible à compiler hors macOS) :
 * à valider/ajuster au premier build Codemagic. Trois insertions :
 *   1. imports (PushKit + les deux libs) avant la déclaration de la classe ;
 *   2. RNVoipPushNotificationManager.voipRegistration() dans didFinishLaunching ;
 *   3. l'extension PKPushRegistryDelegate en fin de fichier.
 * L'import des libs ObjC depuis Swift repose sur useFrameworks:static (déjà configuré).
 */
function withVoipAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    let src = config.modResults.contents

    if (src.includes(VOIP_MARKER)) {
      return config // déjà injecté
    }
    if (config.modResults.language !== 'swift') {
      // SDK 56 = AppDelegate Swift. Si un jour c'est de l'ObjC, on ne touche à rien
      // plutôt que d'injecter du Swift invalide.
      return config
    }

    // 1. Imports — juste avant la déclaration de la classe AppDelegate.
    src = src.replace(
      /(class AppDelegate\b)/,
      `${VOIP_IMPORTS}\n\n$1`,
    )

    // 2. voipRegistration() — avant le `return super.application(...)` de didFinishLaunching.
    src = src.replace(
      /(\n\s*return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\))/,
      `\n${VOIP_REGISTER}$1`,
    )

    // 3. Extension PKPushRegistryDelegate — en fin de fichier.
    src = `${src.trimEnd()}\n${VOIP_EXTENSION}`

    config.modResults.contents = src
    return config
  })
}

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
  config = withVoipAppDelegate(config)
  return config
}
