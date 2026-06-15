import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { resetPassword } from '../api/password'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [done, setDone] = useState(false)

  const tokenMissing = !token || !email

  const mutation = useMutation({
    mutationFn: () => resetPassword({
      email,
      token,
      password,
      password_confirmation: confirmation,
    }),
    onSuccess: () => {
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    },
  })

  const apiError =
    mutation.error instanceof AxiosError
      ? mutation.error.response?.data?.message ?? 'Erreur lors de la réinitialisation.'
      : null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-airmess-dark">Nouveau mot de passe</h1>

        {tokenMissing ? (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            <p className="font-semibold">Lien invalide</p>
            <p className="text-sm mt-2">
              Ce lien de réinitialisation est incomplet ou corrompu.
              <Link to="/forgot-password" className="underline ml-1">Demandez-en un nouveau</Link>.
            </p>
          </div>
        ) : done ? (
          <div className="mt-6 bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
            <p className="font-semibold">✅ Mot de passe modifié</p>
            <p className="text-sm mt-2">Vous allez être redirigé vers la connexion…</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mt-2 mb-6">
              Pour <strong>{email}</strong>. Choisissez un nouveau mot de passe sécurisé (8 caractères minimum).
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-airmess-yellow"
                  disabled={mutation.isPending}
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Confirmation</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-airmess-yellow"
                  disabled={mutation.isPending}
                />
                {confirmation && password !== confirmation && (
                  <p className="text-xs text-airmess-red mt-1">Les mots de passe ne correspondent pas.</p>
                )}
              </div>

              {apiError && (
                <p className="text-sm text-airmess-red bg-red-50 p-2 rounded">{apiError}</p>
              )}

              <button
                type="submit"
                disabled={mutation.isPending || !password || password !== confirmation}
                className="w-full py-2.5 bg-airmess-yellow text-airmess-dark font-semibold rounded-lg disabled:opacity-50 hover:opacity-90"
              >
                {mutation.isPending ? 'Validation…' : 'Réinitialiser'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
