import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { forgotPassword } from '../api/password'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import { ArrowRightIcon } from '../components/ui/icons'
import LanguageToggle from '../components/ui/LanguageToggle'
import wordmark from '../assets/logo/airmess-wordmark.svg'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const mutation = useMutation({
    mutationFn: () => forgotPassword(email),
    onSuccess: () => setSubmitted(true),
  })

  const apiError =
    mutation.error instanceof AxiosError
      ? mutation.error.response?.data?.message ?? t('auth.forgot.requestError')
      : null

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Logo top */}
      <div className="p-6 md:p-8 flex items-center justify-between gap-4">
        <Link to="/" className="inline-block">
          <img src={wordmark} alt="Air Mess" className="h-8 w-auto" />
        </Link>
        <LanguageToggle variant="light" />
      </div>

      {/* Card centrée */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card variant="signature" padding="lg" className="max-w-md w-full">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-caption text-warm-500 hover:text-ink mb-4"
          >
            {t('auth.forgot.backToLogin')}
          </Link>

          <h1 className="text-h1 text-ink">{t('auth.forgot.title')}</h1>

          {submitted ? (
            <div className="mt-6 bg-success-bg border border-success/20 text-success rounded-md p-4">
              <p className="font-bold text-body">{t('auth.forgot.submittedTitle')}</p>
              <p className="text-body-s mt-2">
                {t('auth.forgot.submittedBody')}
              </p>
              <p className="text-body-s mt-2 text-warm-600">
                {t('auth.forgot.submittedExpiry')}
              </p>
            </div>
          ) : (
            <>
              <p className="text-body-s text-warm-500 mt-2 mb-6">
                {t('auth.forgot.subtitle')}
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
                  label={t('common.email')}
                  placeholder={t('auth.forgot.emailPlaceholder')}
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
                  {t('auth.forgot.submit')}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
