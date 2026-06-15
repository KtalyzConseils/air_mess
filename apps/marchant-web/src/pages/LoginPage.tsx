import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { AxiosError } from 'axios'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      // Redirection selon le type
      const user = useAuthStore.getState().user
      if (user?.type === 'admin') {
        navigate('/admin/dashboard')
      } else if (user?.type === 'driver') {
        navigate('/unauthorized') // pas d'interface web pour livreurs
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'Erreur de connexion.'
          : 'Erreur inattendue.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-airmess-dark p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-airmess-dark">Air Mess</h1>
          <p className="text-gray-500 mt-2">Espace marchand</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-airmess-yellow focus:border-transparent outline-none"
              placeholder="contact@example.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <Link to="/forgot-password" className="text-xs text-airmess-dark hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-airmess-yellow focus:border-transparent outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-airmess-yellow text-airmess-dark font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        
        <p className="text-center text-sm text-gray-500 mt-6">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-airmess-dark font-semibold hover:underline">
            Créer un compte
          </Link>
        </p>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 KTALYZ — Air Mess
        </p>
      </div>
    </div>
  )
}
