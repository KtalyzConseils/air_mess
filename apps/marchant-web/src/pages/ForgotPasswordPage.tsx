import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { forgotPassword } from '../api/password'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const mutation = useMutation({
    mutationFn: () => forgotPassword(email),
    onSuccess: () => setSubmitted(true),
  })

  const apiError =
    mutation.error instanceof AxiosError
      ? mutation.error.response?.data?.message ?? 'Erreur lors de la demande.'
      : null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8">
        <Link to="/login" className="text-sm text-gray-500 hover:text-airmess-dark inline-flex items-center gap-1">
          ← Retour à la connexion
        </Link>

        <h1 className="text-2xl font-bold text-airmess-dark mt-4">Mot de passe oublié ?</h1>

        {submitted ? (
          <div className="mt-6 bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
            <p className="font-semibold">📧 Demande prise en compte</p>
            <p className="text-sm mt-2">
              Si cet email est associé à un compte RMess, un lien de réinitialisation
              y a été envoyé. Vérifiez votre boîte (et vos spams).
            </p>
            <p className="text-sm mt-2 text-gray-600">
              Le lien expire dans 60 minutes.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mt-2 mb-6">
              Entrez votre email — nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-airmess-yellow"
                  disabled={mutation.isPending}
                />
              </div>

              {apiError && (
                <p className="text-sm text-airmess-red bg-red-50 p-2 rounded">{apiError}</p>
              )}

              <button
                type="submit"
                disabled={mutation.isPending || !email}
                className="w-full py-2.5 bg-airmess-yellow text-airmess-dark font-semibold rounded-lg disabled:opacity-50 hover:opacity-90"
              >
                {mutation.isPending ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
