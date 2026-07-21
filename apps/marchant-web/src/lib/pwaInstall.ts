/**
 * Capture de l'événement `beforeinstallprompt` (Chrome/Edge/Android).
 * Il peut se déclencher AVANT le montage de React : on l'attrape au niveau
 * module et on notifie les abonnés (hook useSyncExternalStore côté React).
 * Sur iOS/Safari cet événement n'existe pas — le bouton ne s'affiche pas.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault() // on affiche notre propre bouton au lieu de la mini-barre Chrome
  deferredPrompt = event as BeforeInstallPromptEvent
  notify()
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  notify()
})

export function canInstallPwa(): boolean {
  return deferredPrompt !== null
}

export function subscribePwaInstall(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export async function promptPwaInstall(): Promise<void> {
  if (!deferredPrompt) return
  const prompt = deferredPrompt
  await prompt.prompt()
  await prompt.userChoice
  // Quel que soit le choix, Chrome ne permet plus de re-prompter avec cet event.
  deferredPrompt = null
  notify()
}
