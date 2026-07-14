import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { CheckIcon, MailIcon, PhoneIcon, WhatsappIcon, SmartphoneIcon } from '../components/ui/icons'
import { DRIVER_APK_URL } from '../lib/constants'
import { cn } from '../lib/cn'
import wordmark from '../assets/logo/airmess-wordmark.svg'
import mark from '../assets/logo/airmess-mark.svg'

type Channel = 'email' | 'sms' | 'whatsapp'

export default function DriverRegisterSuccessPage() {
  const { t } = useTranslation()
  // Token Sanctum passé par le formulaire (navigation state, jamais localStorage).
  // Absent après un refresh/accès direct : le bloc canal est masqué (fallback email).
  const registrationToken = (useLocation().state as { registrationToken?: string } | null)
    ?.registrationToken

  const [channel, setChannel] = useState<Channel | null>(null)
  const [channelStatus, setChannelStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function chooseChannel(value: Channel) {
    if (!registrationToken || channelStatus === 'saving') return
    setChannel(value)
    setChannelStatus('saving')
    try {
      // Appel axios brut (PAS l'instance `api`) : son intercepteur écraserait
      // Authorization avec le token localStorage et redirigerait vers /login sur 401.
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/driver/response-channel`,
        { channel: value },
        { headers: { Authorization: `Bearer ${registrationToken}`, Accept: 'application/json' } },
      )
      setChannelStatus('saved')
    } catch {
      setChannelStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header minimal */}
      <div className="p-6 md:p-8">
        <Link to="/" className="inline-block">
          <img src={wordmark} alt="Air Mess" className="h-8 w-auto" />
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card variant="signature" padding="lg" className="max-w-lg w-full ams-anim-scale-in">
          {/* Mark décoratif + coche */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <img src={mark} alt="" aria-hidden className="h-16 w-auto opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success text-white">
                  <CheckIcon size={28} />
                </span>
              </div>
            </div>
          </div>

          <h1 className="text-h1 text-ink text-center">{t('driverRegister.success.cardTitle')}</h1>
          <p className="text-body text-warm-600 text-center mt-3">
            {t('driverRegister.success.cardBody')}
          </p>

          {/* Canal de réponse préféré */}
          {registrationToken && (
            <div className="mt-6 bg-off-white border border-warm-200 rounded-md p-4">
              <p className="text-body-s font-medium text-ink mb-3">
                {t('driverRegister.success.channelTitle')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <ChannelCard
                  icon={<MailIcon size={20} />}
                  label={t('driverRegister.success.channelEmail')}
                  selected={channel === 'email'}
                  onClick={() => void chooseChannel('email')}
                />
                {/* SMS : code d'envoi prêt côté API mais option pas encore ouverte. */}
                <ChannelCard
                  icon={<PhoneIcon size={20} />}
                  label={t('driverRegister.success.channelSms')}
                  disabled
                  soonLabel={t('driverRegister.success.soon')}
                />
                <ChannelCard
                  icon={<WhatsappIcon size={20} />}
                  label={t('driverRegister.success.channelWhatsapp')}
                  selected={channel === 'whatsapp'}
                  onClick={() => void chooseChannel('whatsapp')}
                />
              </div>
              {channelStatus === 'saved' && channel && (
                <p className="mt-3 text-caption text-success inline-flex items-center gap-1.5">
                  <CheckIcon size={14} />
                  {t('driverRegister.success.channelSaved', {
                    channel: t(`driverRegister.success.channel${channel === 'email' ? 'Email' : channel === 'sms' ? 'Sms' : 'Whatsapp'}`),
                  })}
                </p>
              )}
              {channelStatus === 'error' && (
                <p className="mt-3 text-caption text-airmess-red">
                  {t('driverRegister.success.channelError')}
                </p>
              )}
            </div>
          )}

          {/* Prochaine étape — encart warning chaud */}
          <div className="mt-6 bg-warning-bg border-l-4 border-warning rounded-md p-4">
            <div className="flex items-start gap-2">
              <Badge variant="warning" size="sm">{t('driverRegister.success.nextStepBadge')}</Badge>
            </div>
            <p className="text-body-s text-warm-700 mt-3">
              {t('driverRegister.success.nextStepBodyBefore')}{' '}
              <strong className="text-ink">{t('driverRegister.success.nextStepBodyBold')}</strong>{' '}
              {t('driverRegister.success.nextStepBodyMid')}{' '}
              <strong className="text-ink">{t('driverRegister.success.nextStepBodyBrand')}</strong>
              {' '}{t('driverRegister.success.nextStepBodyEnd')}
            </p>
          </div>

          {/* Téléchargement app */}
          <div className="mt-6 bg-warm-100 rounded-md p-4">
            <p className="text-eyebrow uppercase text-warm-600 mb-3">{t('driverRegister.success.meanwhileEyebrow')}</p>
            <p className="text-body-s text-warm-600 mb-3">
              {t('driverRegister.success.meanwhileBody')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={DRIVER_APK_URL}
                download
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-airmess-dark text-cream rounded-md text-body-s font-medium transition-colors hover:bg-ink"
              >
                <SmartphoneIcon size={16} /> {t('driverRegister.success.downloadApk')}
              </a>
              <span className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-off-white border border-warm-200 text-warm-500 rounded-md text-body-s font-medium cursor-not-allowed">
                {t('driverRegister.success.appStore')}
                <Badge variant="neutral" size="sm" className="ml-auto">{t('driverRegister.success.soon')}</Badge>
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/login" className="flex-1">
              <Button variant="secondary" size="md" fullWidth>
                {t('driverRegister.success.backToLogin')}
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button variant="dark" size="md" pill fullWidth>
                {t('driverRegister.success.home')}
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      {/* Footer minimal */}
      <p className="text-center text-caption text-warm-400 pb-6">
        {t('driverRegister.success.copyright')}
      </p>
    </div>
  )
}

/* ============================================================
   Sous-composant : ChannelCard — carte-bouton de canal de réponse
   ============================================================ */
interface ChannelCardProps {
  icon: React.ReactNode
  label: string
  selected?: boolean
  disabled?: boolean
  soonLabel?: string
  onClick?: () => void
}

function ChannelCard({ icon, label, selected, disabled, soonLabel, onClick }: ChannelCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-center transition-all duration-200',
        disabled
          ? 'border-warm-200 bg-off-white text-warm-400 cursor-not-allowed'
          : selected
            ? 'border-airmess-yellow bg-airmess-yellow/10 text-ink shadow-glow-yellow'
            : 'border-warm-300 bg-off-white text-warm-600 hover:border-warm-400 cursor-pointer',
      )}
    >
      <span aria-hidden>{icon}</span>
      <span className="text-caption font-medium">{label}</span>
      {disabled && soonLabel && (
        <span className="text-[10px] uppercase tracking-wide text-warm-400">{soonLabel}</span>
      )}
    </button>
  )
}
