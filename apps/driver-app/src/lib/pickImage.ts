import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'
import type { LocalFile } from '../api/register'

/**
 * Ouvre l'appareil photo ou la galerie et retourne le fichier choisi (prêt pour
 * un FormData multipart), ou null si annulé / permission refusée.
 *
 * Compression légère via `quality` — les documents restent lisibles tout en
 * limitant le poids de l'upload (le back plafonne à 5 Mo par fichier).
 */
export async function pickImage(source: 'camera' | 'library'): Promise<LocalFile | null> {
  // Permission adaptée à la source.
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!perm.granted) {
    Alert.alert(
      'Autorisation requise',
      source === 'camera'
        ? "Autorisez l'accès à l'appareil photo pour prendre vos documents en photo."
        : "Autorisez l'accès aux photos pour choisir vos documents.",
    )
    return null
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: false,
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options)

  if (result.canceled || !result.assets?.length) return null

  const asset = result.assets[0]
  const type = asset.mimeType ?? 'image/jpeg'
  // Nom de fichier : celui fourni, sinon dérivé de l'extension du type mime.
  const ext = type.split('/')[1] ?? 'jpg'
  const name = asset.fileName ?? `document.${ext}`

  return { uri: asset.uri, name, type }
}
