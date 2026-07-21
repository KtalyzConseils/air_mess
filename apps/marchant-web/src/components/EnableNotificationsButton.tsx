import { useEffect, useState } from 'react'
import { getNotificationPermission, requestNotificationPermission } from '../hooks/useDesktopNotifications'
import { enableWebPush } from '../lib/fcm'

export default function EnableNotificationsButton() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermission()
  )

  // Re-lire la permission au focus de la fenêtre (l'user peut la changer dans les settings du navigateur)
  useEffect(() => {
    const onFocus = () => setPermission(getNotificationPermission())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Si déjà accordée, ne rien afficher
  if (permission === 'granted' || permission === 'unsupported') return null

  async function handleClick() {
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'granted') {
      // Web push FCM : enregistre ce navigateur pour recevoir les notifs
      // même app fermée (no-op si VAPID non configurée ou non supporté).
      void enableWebPush()
      new Notification('🔔 Alertes activées', {
        body: 'Vous recevrez les nouvelles courses ici même.',
        tag: 'airmess-onboarding',
      })
    }
  }

  return (
    <button
      onClick={handleClick}
      className="text-xs px-3 py-1.5 rounded-lg bg-airmess-yellow text-airmess-dark font-semibold hover:opacity-90 flex items-center gap-1"
      title={permission === 'denied'
        ? 'Notifications bloquées — débloque-les dans les paramètres du navigateur'
        : 'Activer les notifications desktop'}
    >
      🔔 {permission === 'denied' ? 'Notifs bloquées' : 'Activer alertes'}
    </button>
  )
}
