import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AxiosError } from 'axios'
import Card from './ui/Card'
import Button from './ui/Button'
import { HelpCircleIcon, ArrowRightIcon } from './ui/icons'
import { acceptTerms } from '../api/terms'

interface Props {
  /** Contrôle la visibilité (piloté par le parent qui lit terms.needs_acceptance). */
  open: boolean
  /** Callback après acceptation réussie — le parent doit invalider /auth/me. */
  onAccepted: () => void
}

/**
 * Modale BLOQUANTE d'acceptation des CGU + politique de confidentialité.
 *
 * Se déclenche pour :
 *   - un utilisateur existant qui n'a jamais accepté (accepted_terms_at = NULL)
 *   - un utilisateur qui a accepté une version antérieure à `TERMS_VERSION`
 *
 * Volontairement sans bouton "fermer" ni "plus tard" — la seule sortie est le
 * bouton "J'accepte et continue" (activé par la checkbox). Le parent la garde
 * montée par-dessus le contenu tant que le back ne renvoie pas needs_acceptance=false.
 */
export default function AcceptTermsModal({ open, onAccepted }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [accepted, setAccepted] = useState(false)

  const mutation = useMutation({
    mutationFn: acceptTerms,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      onAccepted()
    },
  })

  const errorMessage =
    mutation.error instanceof AxiosError
      ? mutation.error.response?.data?.message ?? t('legal.acceptModal.errorGeneric')
      : null

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-ink/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4 ams-anim-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accept-terms-title"
    >
      <Card variant="signature" padding="none" className="max-w-lg w-full overflow-hidden ams-anim-scale-in">
        <div className="px-6 pt-6 pb-2 flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-airmess-yellow/20 text-ink flex items-center justify-center shrink-0">
            <HelpCircleIcon size={20} />
          </span>
          <div className="flex-1">
            <h2 id="accept-terms-title" className="text-h2 text-ink font-bold leading-tight">
              {t('legal.acceptModal.title')}
            </h2>
            <p className="text-body-s text-warm-600 mt-1 leading-relaxed">
              {t('legal.acceptModal.body')}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-col gap-2">
          <Link
            to="/legal/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-between px-4 py-3 rounded-xl border border-warm-200 hover:border-airmess-yellow hover:bg-airmess-yellow/5 transition-all"
          >
            <span className="text-body-s font-semibold text-ink">
              {t('legal.acceptModal.readTerms')}
            </span>
            <ArrowRightIcon size={14} />
          </Link>
          <Link
            to="/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-between px-4 py-3 rounded-xl border border-warm-200 hover:border-airmess-yellow hover:bg-airmess-yellow/5 transition-all"
          >
            <span className="text-body-s font-semibold text-ink">
              {t('legal.acceptModal.readPrivacy')}
            </span>
            <ArrowRightIcon size={14} />
          </Link>
        </div>

        <label className="mx-6 mb-4 flex items-start gap-3 cursor-pointer bg-cream/50 border border-warm-200 rounded-xl px-4 py-3 hover:bg-cream transition-colors">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-airmess-yellow shrink-0"
          />
          <span className="text-body-s text-ink leading-relaxed">
            {t('legal.acceptModal.checkbox')}
          </span>
        </label>

        {errorMessage && (
          <div className="mx-6 mb-3 px-4 py-2.5 bg-danger-bg border border-airmess-red/30 text-airmess-red text-body-s rounded-md">
            {errorMessage}
          </div>
        )}

        <div className="px-6 py-4 border-t border-warm-200 bg-off-white">
          <Button
            variant="primary"
            size="lg"
            pill
            fullWidth
            disabled={!accepted}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
            rightIcon={!mutation.isPending && <ArrowRightIcon size={16} />}
          >
            {t('legal.acceptModal.submit')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
