import axios from 'axios'
import { getSecureItem } from '../lib/tokenStorage'

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

api.interceptors.request.use(async (config) => {
  // Un Authorization explicite (ex : nettoyage de déconnexion avec le token sortant)
  // a priorité : on ne l'écrase pas avec le token courant.
  if (!config.headers.Authorization) {
    const token = await getSecureItem('airmess_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

export default api
