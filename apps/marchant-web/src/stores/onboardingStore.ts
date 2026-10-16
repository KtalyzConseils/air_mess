import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from './authStore'

/**
 * Onboarding marchand & particulier : un parcours linéaire vers la première
 * livraison réussie, une seule chose à faire à chaque écran.
 *
 *  1. Tableau de bord vide → tuto vidéo + « Créer ma première course »
 *  2. Course créée        → confirmation + « Voir la course »
 *  3. Détail de la course → « Partagez le lien de suivi à votre client »
 *  4. Livraison réussie   → célébration + « Créer une nouvelle course »
 *
 * Les étapes 1, 2 et 4 se déduisent des courses réelles ; seuls deux faits sont
 * mémorisés localement (localStorage, sans backend), PAR UTILISATEUR — un même
 * navigateur peut servir plusieurs comptes :
 *  - `sharedUserIds`     : a déjà envoyé ou copié un lien de suivi
 *  - `celebratedUserIds` : a déjà vu la célébration de la première livraison
 * La présentation (3 slides) et les astuces du formulaire restent disponibles
 * depuis le menu « Aide » ; `welcomeOpen` / `formTipsOpen` sont transitoires.
 */
interface OnboardingState {
  welcomeOpen: boolean
  formTipsOpen: boolean
  sharedUserIds: number[]
  celebratedUserIds: number[]
  openWelcome: () => void
  closeWelcome: () => void
  openFormTips: () => void
  closeFormTips: () => void
  markTrackingShared: (userId: number) => void
  markFirstDeliveryCelebrated: (userId: number) => void
}

const addId = (ids: number[], id: number) => (ids.includes(id) ? ids : [...ids, id])

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      welcomeOpen: false,
      formTipsOpen: false,
      sharedUserIds: [],
      celebratedUserIds: [],
      openWelcome: () => set({ welcomeOpen: true }),
      closeWelcome: () => set({ welcomeOpen: false }),
      openFormTips: () => set({ formTipsOpen: true }),
      closeFormTips: () => set({ formTipsOpen: false }),
      markTrackingShared: (userId) => set((s) => ({ sharedUserIds: addId(s.sharedUserIds, userId) })),
      markFirstDeliveryCelebrated: (userId) =>
        set((s) => ({ celebratedUserIds: addId(s.celebratedUserIds, userId) })),
    }),
    {
      name: 'airmess.onboarding.v1',
      version: 3,
      partialize: (s) => ({ sharedUserIds: s.sharedUserIds, celebratedUserIds: s.celebratedUserIds }),
      // Versions antérieures : ouvertures automatiques (v1) ou drapeaux par navigateur (v2), sans objet.
      migrate: () => ({ sharedUserIds: [], celebratedUserIds: [] }),
    },
  ),
)

/** Note le partage d'un lien de suivi pour l'utilisateur connecté (hors composant React). */
export function markTrackingSharedForCurrentUser() {
  const userId = useAuthStore.getState().user?.id
  if (userId != null) useOnboardingStore.getState().markTrackingShared(userId)
}

/** Avancement du parcours pour l'utilisateur connecté. */
export function useOnboardingProgress() {
  const userId = useAuthStore((s) => s.user?.id)
  const trackingShared = useOnboardingStore((s) => userId != null && s.sharedUserIds.includes(userId))
  const firstDeliveryCelebrated = useOnboardingStore(
    (s) => userId != null && s.celebratedUserIds.includes(userId),
  )
  const markCelebrated = useOnboardingStore((s) => s.markFirstDeliveryCelebrated)
  return {
    trackingShared,
    firstDeliveryCelebrated,
    markTrackingShared: markTrackingSharedForCurrentUser,
    markFirstDeliveryCelebrated: () => {
      if (userId != null) markCelebrated(userId)
    },
  }
}
