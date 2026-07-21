import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import i18n from '../i18n'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
})

// Injecte automatiquement le Bearer token + la langue active sur chaque requête.
// L'entête Accept-Language est lue par le middleware Laravel `SetLocale` pour
// renvoyer les messages de validation (et autres traductions) dans la bonne langue.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('airmess_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Prend les 2 premiers caractères ("fr", "en") — évite d'envoyer "fr-FR" si Laravel
  // n'a pas de fichier de traduction spécifique à la région.
  const lang = (i18n.language || 'fr').slice(0, 2)
  config.headers['Accept-Language'] = lang
  return config
})

// Gère les 401 globalement (token expiré → déconnexion)
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('airmess_token')
      // Redirection brutale (sera affinée plus tard)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
