import { Platform, Alert } from 'react-native'
import * as IntentLauncher from 'expo-intent-launcher'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

/**
 * Permission "Notifications plein écran" (full-screen intent) — Android 14+.
 *
 * Depuis Android 14 (API 34), USE_FULL_SCREEN_INTENT n'est plus auto-accordé aux apps
 * non-téléphonie. Sans elle, l'alerte "course entrante" ne réveille PAS l'écran de force :
 * elle s'affiche seulement en heads-up (avec son). On invite donc le livreur à l'activer.
 *
 * NB : sur Android < 14, la permission est acquise via le manifest → rien à demander.
 */
const PROMPTED_KEY = 'airmess_fsi_prompted'
const ANDROID_14 = 34

function packageName(): string {
  return Constants.expoConfig?.android?.package ?? 'com.anonymous.driverapp'
}

function isAndroid14Plus(): boolean {
  return Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= ANDROID_14
}

/** Ouvre l'écran système "Notifications plein écran" de cette app. No-op hors Android 14+. */
export async function openFullScreenIntentSettings(): Promise<void> {
  if (!isAndroid14Plus()) return
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.MANAGE_APP_USE_FULL_SCREEN_INTENT,
      { data: 'package:' + packageName() },
    )
  } catch (e) {
    console.warn('[fsi] ouverture réglages échouée:', String(e))
  }
}

/**
 * Invite le livreur (une seule fois, persisté) à activer les notifications plein écran.
 * À appeler après connexion. No-op hors Android 14+ ou si déjà proposé.
 */
export async function promptFullScreenIntentIfNeeded(): Promise<void> {
  if (!isAndroid14Plus()) return

  const already = await SecureStore.getItemAsync(PROMPTED_KEY)
  if (already) return
  await SecureStore.setItemAsync(PROMPTED_KEY, '1')

  Alert.alert(
    'Alertes de course',
    "Pour être réveillé même écran verrouillé quand une course arrive, active « Notifications plein écran » pour Air Mess.",
    [
      { text: 'Plus tard', style: 'cancel' },
      { text: 'Activer', onPress: () => { void openFullScreenIntentSettings() } },
    ],
  )
}
