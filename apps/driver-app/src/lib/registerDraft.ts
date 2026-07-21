import * as SecureStore from 'expo-secure-store'

/**
 * Persistance locale d'un brouillon d'inscription livreur.
 *
 * Objectif : si l'utilisateur ferme l'app en cours de route (batterie, appel,
 * livraison à faire), il retrouve son formulaire à la ré-ouverture sans
 * devoir tout retaper.
 *
 * Volontairement exclus du brouillon (raisons données en commentaire) :
 *  - `password` / `passwordConfirm`  → jamais persister un mot de passe clair
 *  - `phoneToken`                    → jeton court-terme, à re-vérifier via nouveau SMS
 *  - `LocalFile` des documents       → l'URI peut expirer/être invalide après reboot
 *
 * On stocke UN seul enregistrement JSON (SecureStore n'a pas de préfixe/pattern).
 * Taille max iOS : ~2 Ko — largement suffisant pour ~15 champs texte.
 */
export interface RegisterDraft {
  firstName?: string
  lastName?: string
  gender?: string
  birthDate?: string
  email?: string
  phone?: string
  vehicleType?: string
  vehiclePlate?: string
  vehicleBrand?: string
  cniType?: string
  ec1Name?: string
  ec1Phone?: string
  ec2Name?: string
  ec2Phone?: string
  eqIso?: boolean
  eqTop?: boolean
  eqFridge?: boolean
  /** Dernière étape atteinte — utile pour reprendre au bon endroit. */
  step?: number
}

const KEY = 'airmess.driver.registerDraft.v1'

export async function saveDraft(draft: RegisterDraft): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(draft))
  } catch {
    // SecureStore peut échouer si l'utilisateur n'a pas d'auth device configurée.
    // Le brouillon n'est pas critique — on avale silencieusement l'échec.
  }
}

export async function loadDraft(): Promise<RegisterDraft | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY)
    if (!raw) return null
    return JSON.parse(raw) as RegisterDraft
  } catch {
    return null
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY)
  } catch {
    /* idem : silencieux */
  }
}
