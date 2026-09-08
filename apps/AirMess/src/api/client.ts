import { create } from 'axios'
import { getCurrentLanguage } from '../stores/languageStore'
import { getAuthToken } from '../utils/authStorage'

const PROD_API_BASE_URL = 'https://api.airmess-logistics.com/api'

function resolveApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL
  if (__DEV__) return configured

  if (
    !configured ||
    /:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(?::|\/)/i.test(configured)
  ) {
    return PROD_API_BASE_URL
  }

  return configured
}

const api = create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

api.interceptors.request.use(async (config) => {
  config.headers['Accept-Language'] = getCurrentLanguage()

  if (!config.headers.Authorization) {
    const token = await getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

export default api
