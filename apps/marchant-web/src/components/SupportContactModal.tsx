import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { fetchSupportContact } from '../api/supportContact'
import Card from './ui/Card'
import Button from './ui/Button'
import { CloseIcon, PhoneIcon, MailIcon, HelpCircleIcon } from './ui/icons'

interface Props {
  open: boolean
  onClose: () => void
  /**
   * Contexte optionnel pré-rempli dans le message WhatsApp/email
   * (ex. "Course #AM-2026-1234", "Wallet insuffisant", "Compte non validé").
   * Aide l'agent support à identifier le problème sans re-question.
   */
  context?: string
}

// WhatsApp officiel : "wa.me/<E164_sans_plus>?text=<encoded>"
function buildWhatsAppLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

function buildMailtoLink(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body })
  return `mailto:${email}?${params.toString()}`
}

/**
 * Modal de contact support — affiche jusqu'à 3 options (téléphone / WhatsApp / email)
 * selon ce qui est renseigné dans les AppSettings côté back. Une valeur vide masque
 * l'option correspondante.
 *
 * Pré-remplit le message WhatsApp / le sujet email avec l'identifiant du compte
 * connecté et le contexte donné par le parent (course #, page en erreur, etc.)
 * pour que l'agent support voie immédiatement de quoi il s'agit.
 */
export default function SupportContactModal({ open, onClose, context }: Props) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)

  const { data: contact, isLoading } = useQuery({
    queryKey: ['support-contact'],
    queryFn: fetchSupportContact,
    enabled: open,
    staleTime: 5 * 60_000,
  })

  if (!open) return null

  const accountTag = user?.email ? `[${user.email}]` : ''
  const prefill = [t('support.messagePrefix'), accountTag, context].filter(Boolean).join(' — ')

  const hasPhone = !!contact?.phone?.trim()
  const hasWhatsApp = !!contact?.whatsapp?.trim()
  const hasEmail = !!contact?.email?.trim()
  const hasAny = hasPhone || hasWhatsApp || hasEmail

  return (
    <div
      className="fixed inset-0 bg-ink/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4 ams-anim-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-title"
    >
      <Card variant="signature" padding="none" className="max-w-md w-full overflow-hidden ams-anim-scale-in">
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-airmess-yellow/20 text-ink flex items-center justify-center">
              <HelpCircleIcon size={18} />
            </span>
            <h2 id="support-title" className="text-h3 text-ink font-bold">
              {t('support.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-warm-500 hover:text-ink hover:bg-warm-100 transition-colors"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <p className="px-5 pt-3 pb-1 text-body-s text-warm-600">
          {t('support.subtitle')}
        </p>

        <div className="p-5 space-y-2">
          {isLoading && (
            <p className="text-caption text-warm-500 text-center py-4">{t('common.loading')}</p>
          )}

          {!isLoading && !hasAny && (
            <p className="text-caption text-warm-500 text-center py-4 italic">
              {t('support.noContactYet')}
            </p>
          )}

          {hasPhone && (
            <a
              href={`tel:${contact!.phone}`}
              className="flex items-center gap-3 rounded-xl border border-warm-200 hover:border-airmess-yellow hover:bg-airmess-yellow/5 transition-all px-4 py-3"
            >
              <span className="w-10 h-10 rounded-full bg-success-bg text-success flex items-center justify-center">
                <PhoneIcon size={18} />
              </span>
              <div className="flex-1">
                <p className="text-body font-semibold text-ink">{t('support.callAction')}</p>
                <p className="text-caption text-warm-500 tabular-nums">{contact!.phone}</p>
              </div>
            </a>
          )}

          {hasWhatsApp && (
            <a
              href={buildWhatsAppLink(contact!.whatsapp, prefill)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-warm-200 hover:border-airmess-yellow hover:bg-airmess-yellow/5 transition-all px-4 py-3"
            >
              <span className="w-10 h-10 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center">
                {/* Glyphe WhatsApp — simple bulle stylisée, cohérente avec nos icônes ligne fine */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20l1.6-4.7A8 8 0 1 1 8.7 18.4L4 20Z" />
                  <path d="M9 10c.5 1.5 1.5 2.5 3 3 .8-.3 1.4-.8 1.8-1.6" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="text-body font-semibold text-ink">{t('support.whatsappAction')}</p>
                <p className="text-caption text-warm-500">{t('support.whatsappHint')}</p>
              </div>
            </a>
          )}

          {hasEmail && (
            <a
              href={buildMailtoLink(contact!.email, t('support.emailSubject'), prefill)}
              className="flex items-center gap-3 rounded-xl border border-warm-200 hover:border-airmess-yellow hover:bg-airmess-yellow/5 transition-all px-4 py-3"
            >
              <span className="w-10 h-10 rounded-full bg-info-bg text-info flex items-center justify-center">
                <MailIcon size={18} />
              </span>
              <div className="flex-1">
                <p className="text-body font-semibold text-ink">{t('support.emailAction')}</p>
                <p className="text-caption text-warm-500 truncate">{contact!.email}</p>
              </div>
            </a>
          )}
        </div>

        <div className="flex items-center justify-end px-5 py-3 border-t border-warm-200 bg-cream/40">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
