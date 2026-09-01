import { create } from 'axios'
import * as SecureStore from 'expo-secure-store'
import { getCurrentLanguage } from '../stores/languageStore'

const api = create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

api.interceptors.request.use(async (config) => {
  config.headers['Accept-Language'] = getCurrentLanguage()

  if (!config.headers.Authorization) {
    const token = await SecureStore.getItemAsync('airmess_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

export default api
