import * as SecureStore from 'expo-secure-store'

const FIRST_LAUNCH_DONE_KEY = 'airmess_merchant_first_launch_done_v1'

export async function hasCompletedFirstLaunch(): Promise<boolean> {
  return (await SecureStore.getItemAsync(FIRST_LAUNCH_DONE_KEY)) === '1'
}

export async function markFirstLaunchCompleted() {
  await SecureStore.setItemAsync(FIRST_LAUNCH_DONE_KEY, '1')
}
