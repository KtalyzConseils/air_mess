import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { forgotPassword } from '../api/password'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import { ArrowRightIcon } from '../components/ui/icons'
import wordmark from '../assets/logo/airmess-wordmark.svg'

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
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Logo top */}
      <div className="p-6 md:p-8">
        <Link to="/" className="inline-block">
          <img src={wordmark} alt="Air Mess" className="h-8 w-auto" />
        </Link>
      </div>

      {/* Card centrée */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card variant="signature" padding="lg" className="max-w-md w-full">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-caption text-warm-500 hover:text-ink mb-4"
          >
            ← Retour à la connexion
          </Link>

          <h1 className="text-h1 text-ink">Mot de passe oublié ?</h1>

          {submitted ? (
            <div className="mt-6 bg-success-bg border border-success/20 text-success rounded-md p-4">
              <p className="font-bold text-body">📧 Demande prise en compte</p>
              <p className="text-body-s mt-2">
                Si cet email est associé à un compte Air Mess, un lien de réinitialisation
                y a été envoyé. Vérifiez votre boîte (et vos spams).
              </p>
              <p className="text-body-s mt-2 text-warm-600">
                Le lien expire dans 60 minutes.
              </p>
            </div>
          ) : (
            <>
              <p className="text-body-s text-warm-500 mt-2 mb-6">
                Entrez votre email — nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  mutation.mutate()
                }}
                className="space-y-4"
              >
                <Input
                  type="email"
                  label="Email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  disabled={mutation.isPending}
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
                  disabled={!email}
                  rightIcon={!mutation.isPending && <ArrowRightIcon size={18} />}
                >
                  Envoyer le lien
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
