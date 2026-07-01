import { View, Text, Pressable } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { updateAvailability, type Availability } from '../api/driver'
import Card from './ui/Card'

/**
 * AvailabilityToggle — bloc "state hero" de la home.
 *
 * Décision produit : c'est LE bloc que le driver regarde en premier —
 * la question "je suis dispo ou pas ?" doit se lire à 3 mètres. D'où :
 *   - Ligne d'état géante (32px, extra-bold, colorée)
 *   - Halo de couleur autour du dot (feedback lumineux)
 *   - Toggle en 3 gros boutons (60px) directement sous
 *
 * Verrouillage quand `busy` : le système gère le statut pendant la course.
 */

interface Props {
  current: Availability | 'busy'
}

interface StateMeta {
  label: string
  tagline: string
  dotColor: string      // tailwind bg
  labelColor: string    // tailwind text
  cardBg: string        // tailwind bg
  icon: keyof typeof Ionicons.glyphMap
}

const STATE_META: Record<Availability | 'busy', StateMeta> = {
  available: {
    label: 'Disponible',
    tagline: 'Prêt à recevoir des courses',
    dotColor: 'bg-success',
    labelColor: 'text-success',
    cardBg: 'bg-success-bg',
    icon: 'radio',
  },
  busy: {
    label: 'En course',
    tagline: 'Bonne route, concentre-toi',
    dotColor: 'bg-airmess-yellow',
    labelColor: 'text-ink',
    cardBg: 'bg-airmess-yellow',
    icon: 'bicycle',
  },
  on_break: {
    label: 'En pause',
    tagline: 'Reprends quand tu veux',
    dotColor: 'bg-warning',
    labelColor: 'text-warning',
    cardBg: 'bg-warning-bg',
    icon: 'cafe',
  },
  offline: {
    label: 'Hors-service',
    tagline: 'Personne ne peut te proposer une course',
    dotColor: 'bg-warm-500',
    labelColor: 'text-warm-600',
    cardBg: 'bg-warm-100',
    icon: 'moon',
  },
}

export default function AvailabilityToggle({ current }: Props) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: updateAvailability,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['offered-courses'] })
    },
  })

  const meta = STATE_META[current]
  const locked = current === 'busy'

  return (
    <Card variant="default" padding="none" className={`overflow-hidden ${meta.cardBg}`}>
      {/* Bandeau principal — état actuel */}
      <View className="px-5 pt-5 pb-4 flex-row items-center">
        {/* Dot + halo */}
        <View className="relative mr-4">
          <View className={`absolute inset-0 rounded-full opacity-40 ${meta.dotColor}`} style={{ transform: [{ scale: 1.8 }] }} />
          <View className={`w-10 h-10 rounded-full items-center justify-center ${meta.dotColor}`}>
            <Ionicons name={meta.icon} size={20} color={current === 'busy' ? '#1A1614' : '#ffffff'} />
          </View>
        </View>

        <View className="flex-1">
          <Text className="text-xs uppercase tracking-widest font-bold text-warm-600">
            Statut
          </Text>
          <Text className={`text-2xl font-extrabold ${meta.labelColor} leading-tight mt-0.5`}>
            {meta.label}
          </Text>
          <Text className="text-xs text-warm-600 mt-0.5" numberOfLines={1}>
            {meta.tagline}
          </Text>
        </View>
      </View>

      {/* Actions (masquées si busy) */}
      {locked ? (
        <View className="px-5 pb-4">
          <View className="bg-ink/10 rounded-lg px-3 py-2 flex-row items-center">
            <Ionicons name="lock-closed" size={14} color="#1A1614" />
            <Text className="text-xs text-ink ml-2 flex-1">
              Statut imposé pendant la course.
            </Text>
          </View>
        </View>
      ) : (
        <View className="px-3 pb-3 flex-row gap-2">
          <ActionBtn
            label="Dispo"
            onPress={() => mutation.mutate('available')}
            active={current === 'available'}
            variant="success"
          />
          <ActionBtn
            label="Pause"
            onPress={() => mutation.mutate('on_break')}
            active={current === 'on_break'}
            variant="warning"
          />
          <ActionBtn
            label="Off"
            onPress={() => mutation.mutate('offline')}
            active={current === 'offline'}
            variant="neutral"
          />
        </View>
      )}

      {/* Micro-hint GPS */}
      {(current === 'available' || current === 'busy') && (
        <View className="flex-row items-center px-5 pb-3">
          <View className="w-1.5 h-1.5 rounded-full bg-success mr-2" />
          <Text className="text-[10px] text-warm-600">GPS actif · position envoyée toutes les 15 s</Text>
        </View>
      )}
    </Card>
  )
}

interface ActionBtnProps {
  label: string
  onPress: () => void
  active: boolean
  variant: 'success' | 'warning' | 'neutral'
}

function ActionBtn({ label, onPress, active, variant }: ActionBtnProps) {
  // Quand actif : fond dark ink pour ancrer l'état choisi.
  // Quand inactif : fond off-white + bordure fine.
  const activeClass = 'bg-ink'
  const activeTextClass = variant === 'success' ? 'text-success' : variant === 'warning' ? 'text-warning' : 'text-cream'
  const inactiveClass = 'bg-off-white border border-warm-200'
  const inactiveTextClass = 'text-ink'

  return (
    <Pressable
      onPress={onPress}
      className={[
        'flex-1 h-11 rounded-xl items-center justify-center',
        active ? activeClass : inactiveClass,
      ].join(' ')}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
    >
      <Text
        className={[
          'text-sm font-bold',
          active ? activeTextClass : inactiveTextClass,
        ].join(' ')}
      >
        {label}
      </Text>
    </Pressable>
  )
}
