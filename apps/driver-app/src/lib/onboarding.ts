import * as SecureStore from 'expo-secure-store'

const ONBOARDING_SEEN_KEY = 'airmess_onboarding_seen_v1'

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(ONBOARDING_SEEN_KEY)
    return value === '1'
  } catch {
    return false
  }
}

export async function markOnboardingComplete(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_SEEN_KEY, '1')
}
