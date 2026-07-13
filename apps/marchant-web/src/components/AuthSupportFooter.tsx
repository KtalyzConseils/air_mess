import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SupportContactModal from './SupportContactModal'
import { HelpCircleIcon } from './ui/icons'

/**
 * Petit footer commun aux pages auth (login, register, forgot-password, reset-password) :
 * lien "Besoin d'aide ?" + liens vers CGU et politique de confidentialité.
 * Utile pour un utilisateur bloqué avant même d'être connecté.
 */
export default function AuthSupportFooter({ context }: { context?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-caption text-warm-500 hover:text-ink transition-colors"
        >
          <HelpCircleIcon size={14} />
          {t('support.needHelpLink')}
        </button>
        <div className="flex items-center gap-3 text-caption text-warm-400">
          <Link to="/legal/terms" className="hover:text-ink transition-colors">
            {t('legal.footerLinkTerms')}
          </Link>
          <span aria-hidden>·</span>
          <Link to="/legal/privacy" className="hover:text-ink transition-colors">
            {t('legal.footerLinkPrivacy')}
          </Link>
        </div>
      </div>
      <SupportContactModal open={open} onClose={() => setOpen(false)} context={context} />
    </>
  )
}
