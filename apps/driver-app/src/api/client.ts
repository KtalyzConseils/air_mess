import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { DeviceEventEmitter } from 'react-native'

const PROD_API_BASE_URL = 'https://api.airmess-logistics.com/api'

function resolveApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '')
  if (__DEV__) return configured

  if (
    !configured ||
    /:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(?::|\/)/i.test(configured)
  ) {
    return PROD_API_BASE_URL
  }

  return configured
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

api.interceptors.request.use(async (config) => {
  // Un Authorization explicite (ex : nettoyage de déconnexion avec le token sortant)
  // a priorité : on ne l'écrase pas avec le token courant de SecureStore.
  if (!config.headers.Authorization) {
    const token = await SecureStore.getItemAsync('airmess_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use((response) => response, (error) => {
  const authorization = error.config?.headers?.Authorization
  if (error.response?.status === 401 && typeof authorization === 'string'
    && !error.config?.url?.startsWith('/auth/login')) {
    DeviceEventEmitter.emit('airmess-session-invalid', { token: authorization.replace(/^Bearer /, '') })
  }
  return Promise.reject(error)
})

export default api
