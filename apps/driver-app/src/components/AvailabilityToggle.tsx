import { View, Text, Pressable } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateAvailability, type Availability } from '../api/driver'

interface Props {
  current: Availability | 'busy'
}

const LABELS: Record<Availability | 'busy', string> = {
  offline:    'Hors-service',
  available:  'Disponible',
  on_break:   'En pause',
  busy:       'En course',
}

const COLORS: Record<Availability | 'busy', string> = {
  offline:    'bg-gray-400',
  available:  'bg-green-500',
  on_break:   'bg-amber-500',
  busy:       'bg-blue-500',
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

  // En course = état imposé par le système, pas modifiable par le livreur
  const locked = current === 'busy'

  return (
    <View className="bg-white rounded-2xl p-4">
      <View className="flex-row items-center mb-3">
        <View className={`w-3 h-3 rounded-full ${COLORS[current]}`} />
        <Text className="ml-2 font-semibold text-airmess-dark">
          Vous êtes : {LABELS[current]}
        </Text>
      </View>

      {locked ? (
        <Text className="text-xs text-gray-500">
          Statut imposé pendant une course active.
        </Text>
      ) : (
        <View className="flex-row gap-2">
          <ActionBtn label="Disponible"  onPress={() => mutation.mutate('available')}  active={current === 'available'}  />
          <ActionBtn label="Pause"        onPress={() => mutation.mutate('on_break')}    active={current === 'on_break'}   />
          <ActionBtn label="Hors-service" onPress={() => mutation.mutate('offline')}     active={current === 'offline'}    />
        </View>
      )}
      {(current === 'available' || current === 'busy') && (
        <Text className="text-xs text-green-600 mt-3">
          🛰️ Position GPS envoyée toutes les 15 secondes
        </Text>
      )}

    </View>
  )
}

function ActionBtn({ label, onPress, active }: { label: string; onPress: () => void; active: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-2 rounded-lg border ${active ? 'bg-airmess-yellow border-airmess-yellow' : 'bg-white border-gray-300'}`}
    >
      <Text className={`text-center text-sm ${active ? 'font-bold text-airmess-dark' : 'text-gray-700'}`}>
        {label}
      </Text>
    </Pressable>

  )
}
