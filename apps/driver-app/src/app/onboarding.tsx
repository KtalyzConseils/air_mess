import { useCallback } from 'react'
import { useRouter } from 'expo-router'
import OnboardingFlow from '../components/onboarding/OnboardingFlow'
import { markOnboardingComplete } from '../lib/onboarding'
import { useAuthStore } from '../stores/authStore'

export default function OnboardingScreen() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const setOnboardingSeen = useAuthStore((s) => s.setOnboardingSeen)
  const pendingValidation =
    !!user?.driver && user.driver.activation_status !== 'active' && user.driver.activation_status !== 'banned'

  const complete = useCallback(async () => {
    await markOnboardingComplete()
    setOnboardingSeen(true)
    router.replace('/')
  }, [router, setOnboardingSeen])

  return <OnboardingFlow pendingValidation={pendingValidation} onComplete={complete} />
}
