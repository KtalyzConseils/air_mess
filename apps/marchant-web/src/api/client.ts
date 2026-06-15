import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
})

// Injecte automatiquement le Bearer token sur chaque requête
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('airmess_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
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
