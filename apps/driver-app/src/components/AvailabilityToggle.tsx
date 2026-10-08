import { View, Text, Pressable } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { updateAvailability, type Availability } from '../api/driver'
import { BrandColors, StatusToneOnDark } from '../constants/theme'

/**
 * Carte STATUT (hero sombre) — le bloc que le livreur regarde en premier.
 *
 *   STATUT                         ● En direct
 *   Disponible
 *   On t'envoie les courses qui matchent ta zone.
 *   [ Dispo ]  [ Pause ]  [ Off ]
 *
 * Verrouillé quand `busy` : le système impose le statut pendant la course.
 */

interface Props {
  current: Availability | 'busy'
  /**
   * Compte pas encore activé par l'admin : le livreur peut se connecter mais ne peut
   * PAS se rendre disponible (l'API refuse avec un 403). On désactive alors les boutons
   * et on explique pourquoi, plutôt que de laisser le toggle échouer en silence.
   */
  pendingValidation?: boolean
}

/**
 * Couleurs issues de `constants/theme.ts` (source programmatique unique) : sur le
 * hero sombre, les teintes canoniques sont éclaircies pour tenir le contraste
 * (cf. design-system/airmess-livreurs/MASTER.md §2).
 */
const STATE: Record<
  Availability | 'busy',
  { label: string; tagline: string; color: string }
> = {
  available: {
    label: 'Disponible',
    tagline: "On t'envoie les courses qui matchent ta zone.",
    color: StatusToneOnDark.success,
  },
  busy: {
    label: 'En course',
    tagline: 'Bonne route — concentre-toi sur ta livraison.',
    color: StatusToneOnDark.highlight,
  },
  on_break: {
    label: 'En pause',
    tagline: 'Reprends quand tu veux, tu restes connecté.',
    color: StatusToneOnDark.warning,
  },
  offline: {
    label: 'Hors-service',
    tagline: 'Personne ne peut te proposer une course.',
    color: StatusToneOnDark.neutral,
  },
}

export default function AvailabilityToggle({ current, pendingValidation = false }: Props) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: updateAvailability,
    // Optimiste : le statut bascule tout de suite → le tracking (GPS/"en ligne")
    // démarre pendant que l'app est active, sans attendre le round-trip réseau.
    onMutate: async (next: Availability) => {
      await queryClient.cancelQueries({ queryKey: ['me'] })
      const prev = queryClient.getQueryData(['me'])
      queryClient.setQueryData(['me'], (old: any) =>
        old ? { ...old, driver: { ...old.driver, availability_status: next } } : old,
      )
      return { prev }
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev !== undefined) queryClient.setQueryData(['me'], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['offered-courses'] })
    },
  })

  const meta = STATE[current]
  const locked = current === 'busy'
  const online = current === 'available'

  return (
    <View className="bg-airmess-dark rounded-3xl p-5">
      {/* En-tête : STATUT + badge "En direct" */}
      <View className="flex-row items-center justify-between">
        <Text className="text-warm-400 text-[11px] font-jk-bold uppercase tracking-[2px]">
          Statut
        </Text>
        {online && (
          <View
            className="flex-row items-center px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}
          >
            <View
              className="w-1.5 h-1.5 rounded-full mr-1.5"
              style={{ backgroundColor: StatusToneOnDark.success }}
            />
            <Text className="text-[11px] font-jk-bold" style={{ color: StatusToneOnDark.success }}>
              En ligne
            </Text>
          </View>
        )}
      </View>

      {/* Libellé d'état géant */}
      <Text className="text-[30px] leading-9 font-jk-extrabold mt-1" style={{ color: meta.color }}>
        {meta.label}
      </Text>
      <Text className="text-warm-400 text-sm font-jk mt-1">{meta.tagline}</Text>

      {/* Actions */}
      {pendingValidation ? (
        <View className="mt-4 bg-warning/10 rounded-2xl px-4 py-3 flex-row items-start">
          <Ionicons name="time-outline" size={16} color={StatusToneOnDark.warning} />
          <Text className="text-warm-300 text-xs font-jk-medium ml-2 flex-1">
            Compte en attente de validation. Tu pourras te rendre disponible dès que notre
            équipe aura activé ton compte — tu recevras un email.
          </Text>
        </View>
      ) : locked ? (
        <View className="mt-4 bg-white/5 rounded-2xl px-4 py-3 flex-row items-center">
          <Ionicons name="lock-closed" size={15} color={StatusToneOnDark.neutral} />
          <Text className="text-warm-300 text-xs font-jk-medium ml-2 flex-1">
            Statut imposé pendant la course.
          </Text>
        </View>
      ) : (
        <View className="flex-row gap-2 mt-4">
          <StatusBtn
            label="Dispo"
            icon="radio"
            color={StatusToneOnDark.success}
            active={current === 'available'}
            onPress={() => mutation.mutate('available')}
          />
          <StatusBtn
            label="Pause"
            icon="pause"
            color={StatusToneOnDark.warning}
            active={current === 'on_break'}
            onPress={() => mutation.mutate('on_break')}
          />
          <StatusBtn
            label="Off"
            icon="power"
            color={BrandColors.warm200}
            active={current === 'offline'}
            onPress={() => mutation.mutate('offline')}
          />
        </View>
      )}
    </View>
  )
}

function StatusBtn({
  label,
  icon,
  color,
  active,
  onPress,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 h-14 rounded-2xl items-center justify-center"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        active
          ? { backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1.5, borderColor: color }
          : { backgroundColor: 'rgba(255,255,255,0.05)' },
        pressed ? { opacity: 0.8 } : undefined,
      ]}
    >
      <Ionicons name={icon} size={18} color={active ? color : StatusToneOnDark.neutral} />
      <Text
        className="text-[13px] mt-1"
        style={{
          color: active ? color : StatusToneOnDark.neutral,
          fontFamily: active ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
