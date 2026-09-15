import { useEffect, useState } from 'react'
import { getNotificationPermission, requestNotificationPermission } from '../hooks/useDesktopNotifications'
import { enableWebPush, isWebPushEnabled, showWebNotification } from '../lib/fcm'

export default function EnableNotificationsButton() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermission()
  )
  const [enabled, setEnabled] = useState(isWebPushEnabled)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState(false)

  // Re-lire la permission au focus de la fenêtre (l'user peut la changer dans les settings du navigateur)
  useEffect(() => {
    const onFocus = () => setPermission(getNotificationPermission())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Si déjà accordée, ne rien afficher
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
      if (activated) await showWebNotification('Alertes activées', {
        body: 'Vous recevrez les nouvelles courses ici même.',
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
        ? 'Notifications bloquées — débloque-les dans les paramètres du navigateur'
        : 'Activer les notifications desktop'}
    >
      {activating
        ? 'Activation…'
        : permission === 'denied'
          ? 'Notifs bloquées'
          : error
            ? 'Réessayer les alertes'
            : 'Activer les alertes'}
    </button>
  )
}
