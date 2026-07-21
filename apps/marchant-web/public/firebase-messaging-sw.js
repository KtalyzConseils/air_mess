/* global importScripts, firebase */
/**
 * Service worker Firebase Cloud Messaging — reçoit les web push quand la PWA
 * est FERMÉE (le SW Workbox de vite-plugin-pwa gère le cache, celui-ci gère
 * uniquement le push ; ils cohabitent sur des scopes distincts).
 *
 * NB : fichier servi tel quel depuis public/ — pas de bundling, d'où la
 * version compat via importScripts. La config Firebase web est publique.
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCdjmZvpmbB3KQc6S9nf1mGMBjSjMwiG7o',
  authDomain: 'airmess-a3ff7.firebaseapp.com',
  projectId: 'airmess-a3ff7',
  storageBucket: 'airmess-a3ff7.firebasestorage.app',
  messagingSenderId: '52708255287',
  appId: '1:52708255287:web:e6fb9705bdf3d38a9141b2',
})

const messaging = firebase.messaging()

// Les messages avec bloc `notification` sont affichés automatiquement par le
// navigateur. Ce handler ne sert que de filet pour les messages data-only.
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return // déjà affiché par le navigateur

  const title = (payload.data && payload.data.title) || 'Air Mess'
  const body = (payload.data && payload.data.body) || ''
  self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data || {},
  })
})
