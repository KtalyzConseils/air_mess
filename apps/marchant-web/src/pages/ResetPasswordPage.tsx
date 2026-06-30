import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { resetPassword } from '../api/password'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import { EyeIcon, EyeOffIcon, ArrowRightIcon } from '../components/ui/icons'
import wordmark from '../assets/logo/airmess-wordmark.svg'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const tokenMissing = !token || !email
  const mismatch = confirmation.length > 0 && password !== confirmation

  const mutation = useMutation({
    mutationFn: () =>
      resetPassword({
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
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="p-6 md:p-8">
        <Link to="/" className="inline-block">
          <img src={wordmark} alt="Air Mess" className="h-8 w-auto" />
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card variant="signature" padding="lg" className="max-w-md w-full">
          <h1 className="text-h1 text-ink">Nouveau mot de passe</h1>

          {tokenMissing ? (
            <div className="mt-6 bg-danger-bg border border-airmess-red/30 text-airmess-red rounded-md p-4">
              <p className="font-bold text-body">Lien invalide</p>
              <p className="text-body-s mt-2">
                Ce lien de réinitialisation est incomplet ou corrompu.{' '}
                <Link to="/forgot-password" className="underline font-medium">
                  Demandez-en un nouveau
                </Link>.
              </p>
            </div>
          ) : done ? (
            <div className="mt-6 bg-success-bg border border-success/20 text-success rounded-md p-4">
              <p className="font-bold text-body">✅ Mot de passe modifié</p>
              <p className="text-body-s mt-2">Vous allez être redirigé vers la connexion…</p>
            </div>
          ) : (
            <>
              <p className="text-body-s text-warm-500 mt-2 mb-6">
                Pour <strong className="text-ink">{email}</strong>. Choisissez un nouveau mot de passe
                sécurisé (8 caractères minimum).
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  mutation.mutate()
                }}
                className="space-y-4"
              >
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="Nouveau mot de passe"
                  helper="8 caractères minimum"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={mutation.isPending}
                  autoComplete="new-password"
                  autoFocus
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="p-2 text-warm-500 hover:text-ink transition-colors"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  }
                />

                <Input
                  type={showConfirmation ? 'text' : 'password'}
                  label="Confirmation"
                  required
                  minLength={8}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  disabled={mutation.isPending}
                  autoComplete="new-password"
                  error={mismatch ? 'Les mots de passe ne correspondent pas.' : undefined}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowConfirmation((v) => !v)}
                      className="p-2 text-warm-500 hover:text-ink transition-colors"
                      aria-label={showConfirmation ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                    >
                      {showConfirmation ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  }
                />

                {apiError && (
                  <div
                    role="alert"
                    className="bg-danger-bg border border-airmess-red/30 text-airmess-red px-4 py-3 rounded-md text-body-s"
                  >
                    {apiError}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  pill
                  fullWidth
                  loading={mutation.isPending}
                  disabled={!password || mismatch}
                  rightIcon={!mutation.isPending && <ArrowRightIcon size={18} />}
                >
                  Réinitialiser
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
