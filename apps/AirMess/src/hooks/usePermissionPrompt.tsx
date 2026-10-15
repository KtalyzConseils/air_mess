import { useCallback, useRef, useState } from 'react'
import PermissionSheet from '../components/PermissionSheet'
import {
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
 * Comportement aligne sur l'app livreur : la premiere demande declenche
 * directement le prompt systeme (des la premiere connexion pour les
 * notifications). L'ecran explicatif ne sert plus qu'au cas ou la permission a
 * deja ete refusee : le prompt systeme ne s'afficherait plus, on propose donc
 * les reglages du telephone.
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

  const ensure = useCallback(async (): Promise<boolean> => {
    const state = await readPermission(kind)
    if (state.granted) return true

    // Premiere demande : prompt systeme direct (comme l'app livreur).
    if (state.undetermined) return requestPermission(kind)

    // Deja refusee : le systeme ne reaffichera pas le prompt, on envoie vers les
    // reglages (et on n'insiste pas a chaque ouverture).
    return askWithSheet(true)
  }, [askWithSheet, kind])

  const sheet = (
    <PermissionSheet
      kind={kind}
      visible={visible}
      settingsOnly={settingsOnly}
      onAllow={() => {
        void (async () => {
          if (settingsOnly) {
            await openSystemSettings()
            close(false)
            return
          }
          close(await requestPermission(kind))
        })()
      }}
      onLater={() => close(false)}
    />
  )

  return { ensure, sheet }
}
