import { useCallback, useRef, useState } from 'react'
import PermissionSheet from '../components/PermissionSheet'
import {
  hasBeenExplained,
  markExplained,
  openSystemSettings,
  readPermission,
  requestPermission,
  type PermissionKind,
} from '../lib/permissionPrompts'

/**
 * Pilote la demande d'une permission : etat, ecran d'explication, prompt
 * systeme, et memoire "deja explique" (comme l'app livreur).
 *
 * Usage dans un ecran :
 *   const { ensure, sheet } = usePermissionPrompt('location')
 *   if (await ensure()) { ... }   // true seulement si accordee
 *   ... rendre `sheet` dans le JSX de l'ecran
 *
 * Regle : le prompt systeme n'est jamais declenche directement, il passe
 * toujours par l'ecran d'explication (sauf si l'utilisateur l'a deja vu et
 * n'a pas refuse definitivement).
 */
export function usePermissionPrompt(kind: PermissionKind) {
  const [visible, setVisible] = useState(false)
  const [settingsOnly, setSettingsOnly] = useState(false)
  const resolverRef = useRef<((granted: boolean) => void) | null>(null)

  const close = useCallback((granted: boolean) => {
    setVisible(false)
    const resolve = resolverRef.current
    resolverRef.current = null
    resolve?.(granted)
  }, [])

  const askWithSheet = useCallback((settings: boolean) => {
    setSettingsOnly(settings)
    setVisible(true)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  /**
   * `explicit` = l'utilisateur vient de declencher l'action lui-meme (bouton).
   * Sans ce drapeau, on ne declenche jamais le prompt systeme : si il a deja
   * repondu "Plus tard", on ne le relance pas a la prochaine connexion.
   */
  const ensure = useCallback(
    async (options?: { explicit?: boolean }): Promise<boolean> => {
      const state = await readPermission(kind)
      if (state.granted) return true

      // Refus definitif : le prompt systeme ne s'afficherait plus, on propose les
      // reglages du telephone.
      if (!state.canAskAgain) return askWithSheet(true)

      const explained = await hasBeenExplained(kind)

      // Premiere fois : on explique avant de demander.
      if (!explained) return askWithSheet(false)

      // Deja explique : on redemande uniquement sur action explicite.
      if (options?.explicit) return requestPermission(kind)

      return false
    },
    [askWithSheet, kind],
  )

  const sheet = (
    <PermissionSheet
      kind={kind}
      visible={visible}
      settingsOnly={settingsOnly}
      onAllow={() => {
        void (async () => {
          await markExplained(kind)
          if (settingsOnly) {
            await openSystemSettings()
            close(false)
            return
          }
          close(await requestPermission(kind))
        })()
      }}
      onLater={() => {
        void markExplained(kind)
        close(false)
      }}
    />
  )

  return { ensure, sheet }
}
