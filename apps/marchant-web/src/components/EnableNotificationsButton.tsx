import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getNotificationPermission, requestNotificationPermission } from '../hooks/useDesktopNotifications'
import { enableWebPush, isWebPushEnabled, showWebNotification } from '../lib/fcm'

export default function EnableNotificationsButton() {
  const { t } = useTranslation()
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermission()
  )
  const [enabled, setEnabled] = useState(isWebPushEnabled)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const onFocus = () => setPermission(getNotificationPermission())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  if ((permission === 'granted' && enabled) || permission === 'unsupported') return null

  async function handleClick() {
    setActivating(true)
    setError(false)
    const result = await requestNotificationPermission()
    setPermission(result)

    if (result === 'granted') {
      const activated = await enableWebPush()
      setEnabled(activated)
      setError(!activated)

      if (activated) await showWebNotification(t('notifications.enableButton.grantedTitle'), {
        body: t('notifications.enableButton.grantedBody'),
        tag: 'airmess-onboarding',
        icon: '/pwa-192x192.png',
        data: { url: '/notifications' },
      })
    } else if (result !== 'default') {
      setError(true)
    }

    setActivating(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={activating}
      className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 ${
        error ? 'bg-red-100 text-red-700' : 'bg-airmess-yellow text-airmess-dark hover:opacity-90'
      } disabled:opacity-60`}
      title={permission === 'denied'
        ? t('notifications.enableButton.deniedHint')
        : t('notifications.enableButton.enableHint')}
    >
      {activating
        ? t('notifications.enableButton.activating', { defaultValue: 'Activation...' })
        : permission === 'denied'
          ? t('notifications.enableButton.deniedShort')
          : error
            ? t('notifications.enableButton.retryShort', { defaultValue: 'Reessayer les alertes' })
            : t('notifications.enableButton.enableShort')}
    </button>
  )
}
