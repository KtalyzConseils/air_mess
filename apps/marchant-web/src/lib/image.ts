/**
 * Utilitaires image pour la capture de documents (inscription driver).
 * Les photos issues des caméras mobiles font couramment 3-8 Mo : on les
 * redimensionne/compresse côté client avant l'upload (limite serveur 4 Mo
 * pour la photo, 5 Mo pour CNI/permis).
 */

export interface ImageDimensions {
  width: number
  height: number
}

/** Lit les dimensions d'un fichier image via un <img> hors-DOM. */
export function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image illisible'))
    }
    img.src = url
  })
}

const COMPRESS_THRESHOLD_BYTES = 1.5 * 1024 * 1024

interface CompressOptions {
  maxDimension?: number
  quality?: number
}

/**
 * Redimensionne (max 1600 px) et ré-encode en JPEG q0.8 via canvas.
 * Ne touche pas au fichier s'il est déjà petit ET dans les bonnes dimensions.
 * En cas d'échec canvas (navigateur exotique), renvoie l'original : la
 * validation serveur reste le filet de sécurité.
 */
export async function compressImage(
  file: File,
  { maxDimension = 1600, quality = 0.8 }: CompressOptions = {},
): Promise<File> {
  try {
    const { width, height } = await getImageDimensions(file)
    const needsResize = Math.max(width, height) > maxDimension
    if (!needsResize && file.size <= COMPRESS_THRESHOLD_BYTES) return file

    const scale = needsResize ? maxDimension / Math.max(width, height) : 1
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (!blob || blob.size >= file.size) return file

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
