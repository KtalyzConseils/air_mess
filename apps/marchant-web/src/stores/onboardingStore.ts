import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Onboarding — guide "comment lancer une course" pour marchands & particuliers.
 *
 * Deux morceaux indépendants :
 *  - `welcomeSeen`  : la modale d'introduction (3 slides) a été vue au moins une fois
 *  - `formTipsSeen` : les coach-marks sur NewCoursePage ont défilé au moins une fois
 *
 * Persisté dans localStorage — reset possible via le bouton "Aide" contextuel.
 * Pas de backend : réversible en supprimant la clé, aucune migration à prévoir.
 */
interface OnboardingState {
  welcomeSeen: boolean
  formTipsSeen: boolean
  markWelcomeSeen: () => void
  markFormTipsSeen: () => void
  replayWelcome: () => void
  replayFormTips: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      welcomeSeen: false,
      formTipsSeen: false,
      markWelcomeSeen: () => set({ welcomeSeen: true }),
      markFormTipsSeen: () => set({ formTipsSeen: true }),
      replayWelcome: () => set({ welcomeSeen: false }),
      replayFormTips: () => set({ formTipsSeen: false }),
    }),
    {
      name: 'airmess.onboarding.v1',
      version: 1,
    },
  ),
)
