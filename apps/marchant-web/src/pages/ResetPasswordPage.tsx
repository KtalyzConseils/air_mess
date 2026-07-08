import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { resetPassword } from '../api/password'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import { EyeIcon, EyeOffIcon, ArrowRightIcon } from '../components/ui/icons'
import LanguageToggle from '../components/ui/LanguageToggle'
import wordmark from '../assets/logo/airmess-wordmark.svg'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
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

  // Message toujours en FR : cohérent avec les messages Laravel côté API.
  const apiError =
    mutation.error instanceof AxiosError
      ? mutation.error.response?.data?.message ?? 'Erreur lors de la réinitialisation.'
      : null

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="p-6 md:p-8 flex items-center justify-between gap-4">
        <Link to="/" className="inline-block">
          <img src={wordmark} alt="Air Mess" className="h-8 w-auto" />
        </Link>
        <LanguageToggle variant="light" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card variant="signature" padding="lg" className="max-w-md w-full">
          <h1 className="text-h1 text-ink">{t('auth.reset.title')}</h1>

          {tokenMissing ? (
            <div className="mt-6 bg-danger-bg border border-airmess-red/30 text-airmess-red rounded-md p-4">
              <p className="font-bold text-body">{t('auth.reset.invalidTitle')}</p>
              <p className="text-body-s mt-2">
                {t('auth.reset.invalidBody')}{' '}
                <Link to="/forgot-password" className="underline font-medium">
                  {t('auth.reset.askNewLink')}
                </Link>.
              </p>
            </div>
          ) : done ? (
            <div className="mt-6 bg-success-bg border border-success/20 text-success rounded-md p-4">
              <p className="font-bold text-body">{t('auth.reset.successTitle')}</p>
              <p className="text-body-s mt-2">{t('auth.reset.successBody')}</p>
            </div>
          ) : (
            <>
              <p className="text-body-s text-warm-500 mt-2 mb-6">
                {t('auth.reset.subtitlePrefix')} <strong className="text-ink">{email}</strong>{t('auth.reset.subtitleSuffix')}
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
                  label={t('auth.reset.newPassword')}
                  helper={t('auth.reset.passwordHelper')}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (mutation.error) mutation.reset()
                  }}
                  disabled={mutation.isPending}
                  autoComplete="new-password"
                  autoFocus
                  error={apiError ? '' : undefined}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="p-2 text-warm-500 hover:text-ink transition-colors"
                      aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
                    >
                      {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  }
                />

                <Input
                  type={showConfirmation ? 'text' : 'password'}
                  label={t('auth.reset.confirmation')}
                  required
                  minLength={8}
                  value={confirmation}
                  onChange={(e) => {
                    setConfirmation(e.target.value)
                    if (mutation.error) mutation.reset()
                  }}
                  disabled={mutation.isPending}
                  autoComplete="new-password"
                  error={mismatch ? t('common.passwordMismatch') : apiError ? '' : undefined}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowConfirmation((v) => !v)}
                      className="p-2 text-warm-500 hover:text-ink transition-colors"
                      aria-label={showConfirmation ? t('common.hideConfirmation') : t('common.showConfirmation')}
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
                  {t('auth.reset.submit')}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
