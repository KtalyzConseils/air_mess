import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'
import type { LocalFile } from '../api/register'

/**
 * Ouvre l'appareil photo et retourne la photo prise (prête pour un FormData
 * multipart), ou null si l'utilisateur a annulé / refusé la permission.
 *
 * CAMERA ONLY (pas d'accès à la galerie) : garantit que le document a été
 * capturé sur place — évite qu'un candidat livreur uploade une CNI trouvée
 * ailleurs ou une photo profil qui ne correspond pas à lui.
 *
 * Compression légère via `quality` — les documents restent lisibles tout en
 * limitant le poids de l'upload (le back plafonne à 5 Mo par fichier).
 */
export async function pickImage(): Promise<LocalFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) {
    Alert.alert(
      'Autorisation requise',
      "Autorisez l'accès à l'appareil photo pour prendre vos documents en photo.",
    )
    return null
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: false,
  })

  if (result.canceled || !result.assets?.length) return null

  const asset = result.assets[0]
  const type = asset.mimeType ?? 'image/jpeg'
  const ext = type.split('/')[1] ?? 'jpg'
  const name = asset.fileName ?? `document.${ext}`

  return { uri: asset.uri, name, type }
}
